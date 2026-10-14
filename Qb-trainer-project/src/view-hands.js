import * as THREE from 'three';

export function createViewHands(camera) {
  const group = new THREE.Group();
  camera.add(group);
  const skin = new THREE.MeshStandardMaterial({ color: '#9b7257', roughness: .85 });
  const glove = new THREE.MeshStandardMaterial({ color: '#e7e5d4', roughness: .8 });
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * .29, -.36, -.64);
    group.add(arm);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.047, .26, 3, 8), skin);
    forearm.position.set(side * .02, -.16, .12);forearm.rotation.x = -.55;arm.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), glove);hand.scale.set(.052,.07,.028);
    hand.rotation.x = -.35;arm.add(hand);
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(.009, .045, 2, 5), glove);
      finger.position.set((i - 1.5) * .021, .078, -.015);finger.rotation.x = -.4;arm.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.014,.04,2,6),glove);thumb.position.set(-side*.055,-.015,.01);thumb.rotation.z=side*.6;arm.add(thumb);
    arm.rotation.z = side * -.30;
    return arm;
  });
  const football = new THREE.Mesh(new THREE.SphereGeometry(.095, 16, 10), new THREE.MeshStandardMaterial({ color: '#6e3922', roughness: .8 }));
  football.scale.set(1, 1, 1.65);football.position.set(.12, -.29, -.68);football.rotation.z = -.25;
  group.add(football);
  return {
    update({ visible, phase, time, moving, throwProgress }) {
      group.visible = visible;
      football.visible = phase === 'live';
      const bob = moving ? Math.sin(time * 10) * .012 : 0;
      arms.forEach((arm, i) => {
        arm.position.y = -.36 + bob;
        arm.position.z = -.64;
        arm.rotation.x = 0;
        if (phase === 'live') { arm.position.y += .035;arm.rotation.x = -.16; }
        if (phase === 'flight' && i === 1) {
          const t = Math.min(1, throwProgress ?? 0);
          arm.position.y += Math.sin(t * Math.PI) * .24;
          arm.position.z -= Math.sin(t * Math.PI) * .14;
          arm.rotation.x = -Math.sin(t * Math.PI) * .6;
        }
      });
      football.position.y = -.29 + bob;
    },
  };
}
