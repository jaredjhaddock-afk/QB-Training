import * as THREE from 'three';
import { poseLineman } from './lineman-pose.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// The animation rig uses centimetres inside a metre-scale glTF scene.
// Remove horizontal root motion without removing the catch's vertical jump.
export function inPlaceClips(animations, hipsPosition) {
  return animations.map(source => {
    const clip = source.clone();
    clip.tracks = clip.tracks.filter(track => !track.name.startsWith('Ball.'));
    for (const track of clip.tracks) {
      if (track.name !== 'Hips.position') continue;
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = hipsPosition.x;
        track.values[i + 2] = hipsPosition.z;
      }
    }
    return clip;
  });
}

function teamMaterial(source, offense) {
  const material = source.clone();
  material.metalness = .05;
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      // Recolor uniform hues while retaining skin, white trim, and texture detail.
      vec3 texel = diffuseColor.rgb;
      float red = smoothstep(.65,.88,(texel.r-max(texel.g,texel.b))/max(texel.r,.001));
      float navy = smoothstep(.15,.4,(texel.b-max(texel.r,texel.g))/max(texel.b,.001));
      float shade = dot(texel,vec3(.2126,.7152,.0722));
      ${offense ? `
        diffuseColor.rgb = mix(texel,vec3(.55,.012,.025)*(.65+shade*3.0),navy);
        diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.18+shade*.8),red);
      ` : `
        diffuseColor.rgb = mix(texel,vec3(.12+shade*2.0),navy);
        diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.018,.065,.14)*(.7+shade*2.0),red);
      `}
    `);
  };
  material.customProgramCacheKey = () => offense ? 'player-red-gray' : 'player-navy-gray';
  return material;
}

export async function loadPlayerAsset() {
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/players/football_player_realistic.glb`);
  const hips = gltf.scene.getObjectByName('Hips');
  const clips = inPlaceClips(gltf.animations, hips.position);
  const source = gltf.scene.getObjectByName('Player').material;
  return { scene:gltf.scene, clips, materials:[teamMaterial(source,true),teamMaterial(source,false)] };
}

export function attachPlayerAsset(player, asset, offense) {
  // Retain the procedural rig as a load-failure fallback, hidden after success.
  for (const child of player.children) child.visible = !!child.userData.contactShadow;
  const model = clone(asset.scene);
  model.scale.multiplyScalar(1 / .9144);
  model.getObjectByName('Football').visible = false;
  model.traverse(object => {
    if (!object.isMesh) return;
    if (object.name === 'Player') object.material = asset.materials[offense ? 0 : 1];
    object.castShadow = true;object.receiveShadow = true;object.frustumCulled = false;
  });
  player.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = Object.fromEntries(asset.clips.map(clip => [clip.name,mixer.clipAction(clip)]));
  actions.Catch.setLoop(THREE.LoopOnce,1);actions.Catch.clampWhenFinished = true;
  const poseBones=[];
  model.traverse(bone=>{if(bone.isBone)poseBones.push({bone,animatedRotation:bone.quaternion.clone(),animatedPosition:bone.position.clone()});});
  player.userData.asset = { model, mixer, actions, poseBones, current:null, lastTime:0 };
  animateAsset(player,0,false);
}

export function animateAsset(player,time,moving,{throwProgress=null,catching=false,catchProgress=0,catchTime=null}={}) {
  const data = player.userData.asset;
  const {model,mixer,actions,poseBones} = data;
  // AnimationMixer can skip writing unchanged tracks. Remove last frame's
  // procedural offsets before sampling, otherwise constant Idle tracks allow
  // rotateX() offsets to accumulate into full torso/arm revolutions.
  for (const pose of poseBones) {pose.bone.quaternion.copy(pose.animatedRotation);pose.bone.position.copy(pose.animatedPosition);}
  const speed = player.userData.locomotion?.speed ?? (moving ? 7/.9144 : 0);
  const lineman = ['blocker','rusher'].includes(player.userData.role);
  const name = catching ? 'Catch' : moving && speed > (lineman ? 2.2 : .6) ? 'Run' : 'Idle';
  const dt = Math.max(0,time-data.lastTime);
  if (time === 0 || time < data.lastTime) {
    mixer.stopAllAction();data.current=null;
  }
  if (name !== data.current) {
    const previous = actions[data.current];
    const next = actions[name];next.reset().setEffectiveWeight(1).play();
    if (previous && time > 0) { previous.fadeOut(.16);next.fadeIn(.16); }
    data.current=name;
  }
  actions.Run.timeScale = Math.max(.1,speed*.9144/7)*(player.userData.locomotion?.backpedal?-1:1);
  // The source catches at about one second. Time the leap to ball arrival.
  if (catching) { actions.Catch.paused=true;actions.Catch.time=catchTime??(.1+.9*catchProgress); }
  mixer.update(dt);data.lastTime=time;
  for (const pose of poseBones) {pose.animatedRotation.copy(pose.bone.quaternion);pose.animatedPosition.copy(pose.bone.position);}
  // No blocking or throwing clips were supplied: add small upper-body poses.
  if (lineman && name === 'Idle') poseLineman(model,time,speed,(player.userData.number??0)*.47);
  if (throwProgress !== null) {
    model.getObjectByName('RightArm').rotateX(THREE.MathUtils.lerp(.7,-1.1,throwProgress));
    model.getObjectByName('RightForeArm').rotateX(-.45);
  }
  player.userData.visual = {moving,time,throwProgress,catching,animation:name};
}

export function playerCatchPoint(player,target) {
  const model=player.userData.asset?.model;
  if (!model) return null;
  player.updateWorldMatrix(true,true);
  const left=model.getObjectByName('LeftHand').getWorldPosition(target);
  const right=model.getObjectByName('RightHand').getWorldPosition(new THREE.Vector3());
  return left.add(right).multiplyScalar(.5);
}

// Continue the landing after the result appears, without advancing play logic.
export function settleCatch(player,dt) {
  const data=player.userData.asset;
  if (!data) return false;
  const action=data.actions.Catch, duration=action.getClip().duration;
  if (action.time>=duration) return false;
  animateAsset(player,data.lastTime+dt,false,{catching:true,catchTime:Math.min(duration,action.time+dt)});
  return true;
}

export function aimPlayerHead(player,angle) {
  const turn=THREE.MathUtils.clamp(angle,-.65,.65);
  if(player.userData.asset)player.userData.asset.model.getObjectByName('Head').rotateY(turn);
  else player.userData.rig.head.rotation.y=turn;
}
