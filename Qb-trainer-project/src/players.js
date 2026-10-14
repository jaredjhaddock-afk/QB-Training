import * as THREE from 'three';
import { animateAsset } from './player-asset.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original shared football-player geometry. Every player uses these same cached
// shapes and the same pose system; team uniforms and jersey numbers differ.
const geometry = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  capsule: new THREE.CapsuleGeometry(1, 1, 4, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  number: new THREE.PlaneGeometry(.32, .32),
  torso: new THREE.LatheGeometry([
    new THREE.Vector2(.19, 0), new THREE.Vector2(.21, .08),
    new THREE.Vector2(.235, .23), new THREE.Vector2(.305, .40),
    new THREE.Vector2(.32, .47), new THREE.Vector2(.26, .51),
    new THREE.Vector2(.12, .54),
  ], 18),
};
const material = (color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const common = {
  skin: material('#875e48', .85), pants: material('#e7e5d7', .94),
  shoes: material('#152024', .7), socks: material('#d3d5ce', .9),
  gloves: material('#eeeedd', .65), belt: material('#182325'),
  cage: material('#aeb7b2', .35, .65), visor: material('#152322', .18, .25),
};
const teams = [
  { jersey: material('#bc172b', .91), helmet: material('#b9bec2', .26, .25), trim: material('#ffffff', .7) },
  { jersey: material('#172d50', .91), helmet: material('#d5d9dc', .29, .25), trim: material('#ffffff', .7) },
];
let uniformDetail, contactMaterial;
function applyUniformDetail() {
  if (uniformDetail) return;
  const canvas = document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#888';ctx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=4)for(let x=0;x<128;x+=4){
    ctx.fillStyle=(x+y)%8?'#999':'#737373';ctx.fillRect(x,y,2,3);
  }
  uniformDetail=new THREE.CanvasTexture(canvas);
  uniformDetail.wrapS=uniformDetail.wrapT=THREE.RepeatWrapping;uniformDetail.repeat.set(8,8);
  for(const surface of [common.pants,...teams.map(t=>t.jersey)]){
    surface.bumpMap=uniformDetail;surface.bumpScale=.007;surface.roughness=.88;
  }
}
const numbers = new Map();
const sharedSkinGeometry = [];
function numberMaterial(number) {
  if (numbers.has(number)) return numbers.get(number);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.font = '900 88px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 5;
  context.strokeStyle = '#10201b';
  context.fillStyle = '#f6f0d7';
  context.strokeText(String(number), 64, 68);
  context.fillText(String(number), 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const result = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: .95, depthWrite: false });
  numbers.set(number, result);
  return result;
}
function part(parent, shape, surface, position, scale) {
  const mesh = new THREE.Mesh(shape, surface);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function pivot(parent, position) {
  const group = new THREE.Bone();
  group.position.set(...position);
  parent.add(group);
  return group;
}

function bindSharedGeometry(root) {
  root.updateMatrixWorld(true);
  const bones = [], parts = [], byMaterial = new Map();
  root.traverse(object => { if (object.isBone) bones.push(object); if (object.isMesh) parts.push(object); });
  for (const mesh of parts) {
    if (!byMaterial.has(mesh.material)) byMaterial.set(mesh.material, []);
    byMaterial.get(mesh.material).push(mesh);
  }
  const skeleton = new THREE.Skeleton(bones);
  let groupIndex = 0;
  for (const [surface, meshes] of byMaterial) {
    let combined = sharedSkinGeometry[groupIndex];
    if (!combined) {
      const pieces = meshes.map(mesh => {
        const shape = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        shape.applyMatrix4(mesh.matrixWorld);
        const count = shape.attributes.position.count;
        const indices = new Uint16Array(count * 4);
        const weights = new Float32Array(count * 4);
        const joint = bones.indexOf(mesh.parent);
        for (let i = 0; i < count; i++) { indices[i * 4] = joint; weights[i * 4] = 1; }
        shape.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
        shape.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
        return shape;
      });
      combined = mergeGeometries(pieces);
      pieces.forEach(piece => piece.dispose());
      sharedSkinGeometry[groupIndex] = combined;
    }
    const skin = new THREE.SkinnedMesh(combined, surface);
    skin.castShadow = !surface.transparent;skin.receiveShadow = true;
    // Small, always relevant football players: avoid stale animated bounds.
    skin.frustumCulled = false;
    root.add(skin);
    skin.bind(skeleton);
    groupIndex++;
  }
  parts.forEach(mesh => mesh.removeFromParent());
  root.userData.meshCount = groupIndex;
  root.userData.skeleton = skeleton;
}

export function createPlayer(isOffense, number, role = 'receiver') {
  applyUniformDetail();
  const root = new THREE.Group();
  const team = teams[isOffense ? 0 : 1];
  const body = pivot(root, [0, 1, 0]);
  part(body, geometry.torso, team.jersey, [0, 0, 0], [1, 1, .73]);
  part(body, geometry.sphere, common.pants, [0, -.02, 0], [.225, .16, .17]);
  part(body, geometry.box, common.belt, [0, .015, .005], [.41, .045, .31]);
  const front = part(body, geometry.number, numberMaterial(number), [0, .29, .24], [1, 1, 1]);
  front.rotation.x = -.06;
  const back = part(body, geometry.number, numberMaterial(number), [0, .29, -.24], [1, 1, 1]);
  back.rotation.y = Math.PI;
  part(body, geometry.capsule, common.skin, [0, .59, 0], [.085, .05, .085]);
  const head = pivot(body, [0, .79, .005]);
  part(head, geometry.sphere, team.helmet, [0, 0, 0], [.185, .215, .215]);
  part(head, geometry.box, team.trim, [0, .22, .015], [.045, .02, .17]);
  part(head, geometry.sphere, common.visor, [0, -.025, .19], [.166, .105, .066]);
  part(head, geometry.sphere, common.skin, [0, -.12, .163], [.12, .065, .07]);
  // Cage bars and a chin strap make the same silhouette readable at game scale.
  for (const y of [-.06, -.145]) {
    const bar = part(head, geometry.box, common.cage, [0, y, .27], [.34, .018, .018]);
    bar.castShadow = false;
  }
  for (const side of [-1, 1]) {
    const bar = part(head, geometry.box, common.cage, [side * .155, -.09, .235], [.018, .15, .10]);
    bar.rotation.z = side * -.15;
    part(head, geometry.sphere, team.helmet, [side * .18, -.045, 0], [.035, .09, .09]);
  }
  part(head, geometry.box, common.gloves, [0, -.19, .16], [.17, .025, .04]);

  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const shoulder = pivot(body, [side * .31, .42, 0]);
    part(shoulder, geometry.sphere, team.jersey, [side * .015, -.045, 0], [.135, .15, .145]);
    part(shoulder, geometry.capsule, common.skin, [0, -.19, 0], [.085, .085, .085]);
    part(shoulder, geometry.box, team.trim, [side * .125, -.085, .005], [.018, .045, .19]);
    const elbow = pivot(shoulder, [0, -.30, 0]);
    part(elbow, geometry.sphere, common.skin, [0, 0, 0], [.08, .08, .08]);
    part(elbow, geometry.capsule, common.skin, [0, -.12, 0], [.068, .07, .068]);
    part(elbow, geometry.box, common.gloves, [0, -.265, .015], [.105, .13, .07]);
    arms.push({ shoulder, elbow });

    const hip = pivot(root, [side * .135, .96, 0]);
    part(hip, geometry.capsule, common.pants, [0, -.20, 0], [.105, .15, .115]);
    part(hip, geometry.box, team.trim, [side * .108, -.19, -.005], [.018, .34, .055]);
    const knee = pivot(hip, [0, -.43, 0]);
    part(knee, geometry.sphere, common.pants, [0, 0, .01], [.09, .09, .095]);
    part(knee, geometry.capsule, common.socks, [0, -.18, -.01], [.070, .12, .075]);
    const foot = pivot(knee, [0, -.40, 0]);
    part(foot, geometry.sphere, common.shoes, [0, -.035, .075], [.095, .065, .18]);
    part(foot, geometry.box, common.gloves, [0, .005, .07], [.08, .015, .11]);
    legs.push({ hip, knee, foot });
  }
  root.userData.rig = { body, head, arms, legs };
  root.userData.role = role;
  root.userData.visual = { moving: false, time: 0, throwProgress: null, catching: false };
  bindSharedGeometry(root);
  if(!contactMaterial){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,3,32,32,31);
    gradient.addColorStop(0,'rgba(10,18,10,.32)');gradient.addColorStop(1,'rgba(10,18,10,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  }
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.1),contactMaterial);
  contact.userData.contactShadow=true;contact.rotation.x=-Math.PI/2;contact.position.y=.025;root.add(contact);
  animatePlayer(root, 0, false);
  return root;
}

export function animatePlayer(player, time, moving, { throwProgress = null, catching = false, catchProgress = 0 } = {}) {
  if (player.userData.asset) return animateAsset(player,time,moving,{throwProgress,catching,catchProgress});
  const { body, head, arms, legs } = player.userData.rig;
  const quarterback = player.userData.role === 'quarterback';
  const lineman = player.userData.role === 'blocker' || player.userData.role === 'rusher';
  const locomotion=player.userData.locomotion;
  const speed=locomotion?.speed??(moving?5.8:0);
  const intensity=Math.min(1,speed/5.8);
  const cadence = locomotion ? locomotion.stride * 3.8 : time * 11.5;
  const backward=locomotion?.backpedal?-1:1;
  body.position.y = 1 + (moving ? Math.abs(Math.sin(cadence)) * .025 : 0);
  body.rotation.x = lineman ? .42 : moving ? .08+intensity*.12 : .06;
  body.rotation.y = moving ? Math.sin(cadence) * .045 : 0;
  head.rotation.x = -body.rotation.x * .7;
  for (let index = 0; index < 2; index++) {
    const wave = Math.sin(cadence + index * Math.PI);
    const { hip, knee, foot } = legs[index];
    hip.rotation.x = moving ? wave * (lineman?.18:(.22+intensity*.43))*backward - (lineman?.45:.10) : lineman ? -.5 : -.10;
    knee.rotation.x = moving ? (lineman?.75:.12) + Math.max(0, -wave*backward) * (lineman?.25:(.5+intensity*.75)) : lineman ? .9 : .18;
    foot.rotation.x = moving ? -Math.max(0, wave) * .30 : -.08;
    const { shoulder, elbow } = arms[index];
    shoulder.rotation.x = lineman ? -.8 : moving ? -wave * (.2+intensity*.45)*backward - .2 : quarterback ? -.45 : -.18;
    shoulder.rotation.z = (index ? -1 : 1) * (quarterback ? .12 : .08);
    elbow.rotation.x = quarterback ? -1.15 : lineman ? -.7 : moving ? -1.0 : -.38;
    if (catching) {
      shoulder.rotation.x = -1.2;
      shoulder.rotation.z = (index ? -1 : 1) * .15;
      elbow.rotation.x = -.55;
    }
  }
  // Pelvis follows the planted leg, keeping cleats on turf instead of floating.
  const pelvis=Math.max(...legs.map(({hip,knee})=>.43*Math.cos(hip.rotation.x)+.40*Math.cos(hip.rotation.x+knee.rotation.x)))+.10;
  for(const {hip} of legs)hip.position.y=pelvis;
  body.position.y=pelvis+.04;
  if (quarterback && throwProgress !== null) {
    const amount = THREE.MathUtils.smoothstep(throwProgress, 0, 1);
    arms[1].shoulder.rotation.x = THREE.MathUtils.lerp(1.2, -1.75, amount);
    arms[1].shoulder.rotation.z = -.38;
    arms[1].elbow.rotation.x = THREE.MathUtils.lerp(-1.7, -.15, amount);
    arms[0].shoulder.rotation.x = -.6;
    body.rotation.y = -.20 + amount * .4;
  }
  player.userData.visual = { moving, time, throwProgress, catching };
}
