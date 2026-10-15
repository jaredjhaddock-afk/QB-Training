import * as THREE from 'three';

function aimBone(bone,child,point){
  const origin=bone.getWorldPosition(new THREE.Vector3());
  const from=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const to=point.clone().sub(origin).normalize();
  const delta=new THREE.Quaternion().setFromUnitVectors(from,to);
  const world=bone.getWorldQuaternion(new THREE.Quaternion());
  const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(delta).multiply(world)).normalize();
  bone.updateWorldMatrix(false,true);
}

// Two-bone IK with an explicit bend direction keeps knees and elbows from
// folding backward. Targets are local metres in the supplied glTF scene.
function limb(model,upperName,lowerName,endName,target,pole){
  const upper=model.getObjectByName(upperName),lower=model.getObjectByName(lowerName),end=model.getObjectByName(endName);
  model.updateWorldMatrix(true,true);
  const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3());
  const goal=model.localToWorld(new THREE.Vector3(...target)),bend=model.localToWorld(new THREE.Vector3(...pole)).sub(a);
  const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=goal.clone().sub(a);
  const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+.001,(l1+l2)*.995);direction.normalize();
  bend.addScaledVector(direction,-bend.dot(direction)).normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  const joint=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  aimBone(upper,lower,joint);
  aimBone(lower,end,a.clone().addScaledVector(direction,distance));
}

export function poseLineman(model,time,speed,offset=0){
  const stance=1-THREE.MathUtils.smoothstep(time,0,.45);
  const lean=THREE.MathUtils.lerp(.35,.95,stance);
  const hips=model.getObjectByName('Hips');hips.position.y-=THREE.MathUtils.lerp(16,38,stance);
  hips.rotateX(1.2*stance);
  model.getObjectByName('Spine02').rotateX(lean);
  model.getObjectByName('Head').rotateX(-lean*.7-stance*.8);
  for(const [side,sign] of [['Left',1],['Right',-1]]){
    const step=time*(3+Math.min(speed,2)*2)+sign*Math.PI/2+offset;
    const shuffle=(1-stance)*Math.min(1,speed/.7);
    limb(model,`${side}UpLeg`,`${side}Leg`,`${side}Foot`,
      [sign*.23,.09+Math.max(0,Math.sin(step))*.045*shuffle,-.1+sign*.1*stance+Math.cos(step)*.09*shuffle],
      [sign*.3,.4,1]);
    const push=Math.sin(time*7+sign*.7+offset)*.075*(1-stance);
    const ready=side==='Right'?[-.24,.08,.25]:[.32,.35,.25];
    const block=[sign*.29,1.12,.48+push];
    const hand=block.map((value,i)=>THREE.MathUtils.lerp(value,ready[i],stance));
    limb(model,`${side}Arm`,`${side}ForeArm`,`${side}Hand`,hand,[sign*1.2,.7,-.3]);
  }
}
