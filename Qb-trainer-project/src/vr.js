import * as THREE from 'three';
import { readVRControls, aimedReceiver } from './vr-input.js';

// The field uses yards. WebXR poses use metres, so scale the tracked rig only.
const METRES_TO_YARDS = 1 / .9144;
export function setupVR({ renderer, scene, camera, receivers, labels, state, actions, clearInput, onSessionChange }) {
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFramebufferScaleFactor(.8);
  const rig = new THREE.Group();rig.scale.setScalar(METRES_TO_YARDS);rig.rotation.y = Math.PI;scene.add(rig);
  const ui = new THREE.Group();ui.visible = false;scene.add(ui);
  const hud=new THREE.Group();ui.add(hud);const headPosition=new THREE.Vector3(),headOrientation=new THREE.Quaternion();let playbookOpen=false;
  const raycaster = new THREE.Raycaster(), rotation = new THREE.Matrix4();
  const eye = new THREE.Vector3(), direction = new THREE.Vector3();
  let session = null, starting = false, paused = false, trackingLost = false, previous = new Map(), stick = { strafe: 0, forward: 0 };
  let yaw = 0, selected = null, roomOffset = new THREE.Vector3(), lastRoomOffset = null;
  let shadows = true, savedMode, lastStatus = '', sources = new Map();
  const button = document.createElement('button');button.id = 'enter-vr';button.textContent = 'Checking VR…';button.disabled = true;
  const help = document.createElement('p');help.id = 'vr-help';help.setAttribute('role', 'status');
  help.textContent = 'Choose your play first. Quest: left stick moves; right stick snap-turns; A snaps; B resets. Point toward a receiver and press the trigger to pass. X toggles routes. Use a stationary boundary.';
  const section = document.createElement('section');section.className = 'vr-launch';section.append(button, help);document.querySelector('.sidebar').append(section);
  function textPanel(width, height, worldWidth, worldHeight) {
    const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height;
    const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth,worldHeight),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
    ui.add(mesh);return { mesh, canvas, texture };
  }
  function paint(panel, lines, highlighted=false, subtle=false) {
    const ctx=panel.canvas.getContext('2d'), {width,height}=panel.canvas;
    ctx.clearRect(0,0,width,height);ctx.fillStyle=highlighted?'#45612dcc':subtle?'#13291e88':'#13291eee';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#d6f56c';ctx.lineWidth=4;ctx.strokeRect(2,2,width-4,height-4);
    ctx.fillStyle='#edf5df';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.floor(height/(lines.length*2))}px Arial`;
    lines.forEach((line,i)=>ctx.fillText(line,width/2,height*(i+.5)/lines.length,width-20));panel.texture.needsUpdate=true;
  }
  const markers=receivers.map((_,i)=>{const panel=textPanel(128,80,.6,.38);panel.mesh.userData.receiver=i;return panel;});
  const status=textPanel(1024,256,2.7,.5);hud.add(status.mesh);
  const menu=['Snap','Reset','Routes','Playbook','Exit VR'].map((label,i)=>{
    const panel=textPanel(256,96,.48,.24);panel.mesh.userData.action=i;paint(panel,[label]);hud.add(panel.mesh);return panel;
  });
  const passButtons=labels.map((label,i)=>{const panel=textPanel(128,96,.46,.24);panel.mesh.userData.receiver=i;hud.add(panel.mesh);return panel;});
  const settings=['formation','coverage','front',...labels.map((_,i)=>`route-${i}`)].map(field=>{const panel=textPanel(768,96,2.5,.23);panel.mesh.userData.setting=field;hud.add(panel.mesh);return panel;});
  for(const panel of [status,...menu,...passButtons,...settings]){panel.mesh.material.depthTest=false;panel.mesh.material.depthWrite=false;panel.mesh.renderOrder=1000;}
  const controllers=[];
  for(let i=0;i<2;i++){
    const controller=renderer.xr.getController(i);rig.add(controller);controllers.push(controller);
    const laser=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:'#d6f56c'}));laser.scale.z=15;controller.add(laser);
    controller.addEventListener('connected',event=>sources.set(controller,event.data));
    controller.addEventListener('disconnected',()=>{sources.delete(controller);previous.clear();stick={strafe:0,forward:0};});
    controller.addEventListener('selectstart',()=>{
      if(!session||paused||trackingLost||!canPoint(controller))return;
      const hit=pick(controller);
      if(hit?.object.userData.receiver!==undefined&&state().phase==='live')actions.pass(hit.object.userData.receiver);
      else if(hit?.object.userData.action!==undefined){
        const action=hit.object.userData.action;
        if(action===0){playbookOpen=false;actions.snap();}if(action===1)actions.reset();if(action===2)actions.routes();if(action===3&&['ready','done'].includes(state().phase))playbookOpen=!playbookOpen;if(action===4)session.end().catch(()=>{});
      }else if(hit?.object.userData.setting&&['ready','done'].includes(state().phase)){actions.setting(hit.object.userData.setting);}
    });
  }
  function canPoint(controller){
    const source=sources.get(controller);return source?.targetRayMode==='tracked-pointer'&&(source.handedness==='right'||!Array.from(sources.values()).some(s=>s.handedness==='right'));
  }
  function pick(controller){
    controller.updateWorldMatrix(true,false);rotation.extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation).normalize();
    const hudHit=raycaster.intersectObjects([...menu,...passButtons,...settings].filter(p=>p.mesh.visible).map(p=>p.mesh),false)[0];
    if(hudHit)return hudHit;
    const direct=raycaster.intersectObjects(markers.filter(p=>p.mesh.visible).map(p=>p.mesh),false)[0];
    if(direct)return direct;
    if(state().phase==='live'){
      const index=aimedReceiver(raycaster.ray.origin.toArray(),raycaster.ray.direction.toArray(),receivers.map(r=>r.p));
      if(index!==null)return {object:markers[index].mesh,distance:raycaster.ray.origin.distanceTo(markers[index].mesh.position)};
    }
    return undefined;
  }
  function clear(){previous.clear();stick={strafe:0,forward:0};selected=null;clearInput();}
  function end(){
    session=null;paused=false;trackingLost=false;clear();ui.visible=false;scene.add(camera);camera.scale.set(1,1,1);renderer.shadowMap.enabled=shadows;
    document.body.classList.remove('in-vr');button.disabled=false;button.textContent='Enter VR';queueMicrotask(()=>onSessionChange(false,savedMode));
  }
  button.addEventListener('click',async()=>{
    if(starting)return;if(session){await session.end();return;}
    starting=true;button.disabled=true;
    try{
      const next=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
      session=next;shadows=renderer.shadowMap.enabled;savedMode=state().cameraMode;
      next.addEventListener('end',end,{once:true});
      next.addEventListener('visibilitychange',()=>{paused=next.visibilityState!=='visible';lastRoomOffset=null;clear();});
      next.addEventListener('inputsourceschange',clear);
      clear();actions.reset();rig.rotation.y=Math.PI;roomOffset.set(0,0,0);lastRoomOffset=null;
      rig.position.set(state().quarterback[0],0,state().quarterback[1]);rig.add(camera);camera.position.set(0,0,0);camera.quaternion.identity();
      renderer.shadowMap.enabled=false;
      await renderer.xr.setSession(next);renderer.xr.setFoveation(1);
      ui.visible=true;document.body.classList.add('in-vr');button.textContent='Exit VR';button.disabled=false;onSessionChange(true);
    }catch(error){
      if(session){const failed=session;await failed.end().catch(()=>{});if(session)end();}
      help.textContent=`VR could not start: ${error.message}. Use the HTTPS link in Quest Browser and allow immersive access.`;button.disabled=false;
    }finally{starting=false;}
  });
  if(!window.isSecureContext){button.textContent='VR needs HTTPS';help.textContent='Open the forwarded HTTPS game URL in Quest Browser to use VR.';}
  else if(!navigator.xr){button.textContent='VR unavailable';}
  else navigator.xr.isSessionSupported('immersive-vr').then(supported=>{button.disabled=!supported;button.textContent=supported?'Enter VR':'VR unavailable';}).catch(()=>{button.textContent='VR unavailable';});

  return {
    get active(){return !!session&&renderer.xr.isPresenting;},
    get paused(){return paused||trackingLost;},get stick(){return stick;},get yaw(){return yaw;},
    poll(frame){
      if(!this.active||paused||!frame){stick={strafe:0,forward:0};return [0,0];}
      const pose=frame.getViewerPose(renderer.xr.getReferenceSpace());
      if(!pose){trackingLost=true;stick={strafe:0,forward:0};return [0,0];}trackingLost=false;
      const input=readVRControls(session.inputSources,previous);previous=input.previous;stick=input.controls;
      if(input.controls.turn){
        rig.rotation.y-=input.controls.turn*Math.PI/6;
        // Turn about the user's head rather than orbiting around the room origin.
        const rotated=new THREE.Vector3(pose.transform.position.x,0,pose.transform.position.z).multiplyScalar(METRES_TO_YARDS).applyQuaternion(rig.quaternion);
        rig.position.add(roomOffset).sub(rotated);roomOffset.copy(rotated);lastRoomOffset=rotated.clone();
      }
      const local=new THREE.Vector3(pose.transform.position.x,0,pose.transform.position.z).multiplyScalar(METRES_TO_YARDS).applyQuaternion(rig.quaternion);
      const delta=lastRoomOffset?local.clone().sub(lastRoomOffset):new THREE.Vector3();lastRoomOffset=local.clone();roomOffset.copy(local);
      const orientation=new THREE.Quaternion().copy(pose.transform.orientation).premultiply(rig.quaternion);headOrientation.copy(orientation);headPosition.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z).multiplyScalar(METRES_TO_YARDS).applyQuaternion(rig.quaternion);
      direction.set(0,0,-1).applyQuaternion(orientation);yaw=Math.atan2(-direction.x,direction.z);
      if(input.controls.snap){playbookOpen=false;actions.snap();}if(input.controls.reset)actions.reset();if(input.controls.routes)actions.routes();
      return [delta.x,delta.z];
    },
    renderUI(){
      if(!this.active)return;
      const current=state();rig.position.set(current.quarterback[0]-roomOffset.x,0,current.quarterback[1]-roomOffset.z);rig.updateMatrixWorld(true);
      eye.copy(headPosition).add(rig.position);hud.position.copy(eye);hud.quaternion.copy(headOrientation);
      if(current.phase==='live'||current.phase==='flight')playbookOpen=false;
      markers.forEach((panel,i)=>{panel.mesh.visible=current.phase==='live';panel.mesh.position.set(receivers[i].p[0],2.8,receivers[i].p[1]);panel.mesh.lookAt(eye);});
      // Head-relative toolbar below the main sight line, at a fixed comfortable
      // viewing distance. These are actual ray-selectable 3D controls, not DOM.
      status.mesh.position.set(0,-.58,-2.8);
      const message=current.phase==='done'?current.result:current.phase==='ready'?'A or Snap: start your rep':current.phase==='flight'?'Ball in flight':'Point toward a receiver; pull trigger to pass';
      const statusKey=`${current.phase}:${message}:${current.routesVisible}`;
      if(statusKey!==lastStatus){paint(status,[message,'Left stick: move | Right stick: snap turn',`A: snap | B: reset | X: routes ${current.routesVisible?'on':'off'}`]);lastStatus=statusKey;}
      menu.forEach((panel,i)=>{panel.mesh.position.set((i-2)*.52,-.99,-2.8);});
      passButtons.forEach((panel,i)=>{panel.mesh.position.set((i-2)*.5,-1.28,-2.8);panel.mesh.visible=current.phase==='live';});
      settings.forEach((panel,i)=>{
        panel.mesh.visible=playbookOpen;panel.mesh.position.set(0,1.05-i*.25,-2.8);
        const field=panel.mesh.userData.setting,element=document.getElementById(field);
        const caption=field.startsWith('route-')?labels[Number(field.split('-')[1])]:field;
        const text=`${caption}: ${element.options[element.selectedIndex].text}  >`;
        if(panel.key!==text){paint(panel,[text]);panel.key=text;}
      });
      status.mesh.visible=!playbookOpen;
      ui.updateMatrixWorld(true);
      selected=null;
      for(const controller of controllers){controller.children[0].visible=canPoint(controller)&&!paused;if(canPoint(controller)&&!paused){const hit=pick(controller);if(hit?.object.userData.receiver!==undefined)selected=hit.object.userData.receiver;controller.children[0].scale.z=hit?hit.distance/METRES_TO_YARDS:15;}}
      [...markers,...passButtons].forEach(panel=>{const i=panel.mesh.userData.receiver;const key=`${labels[i]}:${selected===i}`;if(panel.key!==key){paint(panel,[labels[i]],selected===i,markers.includes(panel));panel.key=key;}});

    },
  };
}
