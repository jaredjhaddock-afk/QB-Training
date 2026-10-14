import * as THREE from 'three';

const longAxis = new THREE.Vector3(0, 0, 1);
const spin = new THREE.Quaternion();
const tangent = new THREE.Vector3();
export const SPIRAL_TURNS_PER_SECOND = 8;

// Follow the tangent of the existing pass arc, then roll about the ball's
// local longitudinal axis. Absolute flight time makes spin frame-rate independent.
export function orientSpiral(ball, flight) {
  const t = Math.min(1, flight.t / flight.duration);
  const height = Math.min(7, flight.duration * 4);
  tangent.set(
    (flight.end[0] - flight.start[0]) / flight.duration,
    height * Math.PI / flight.duration * Math.cos(t * Math.PI),
    (flight.end[1] - flight.start[1]) / flight.duration,
  ).normalize();
  if (tangent.lengthSq() < 1e-12) tangent.copy(longAxis);
  ball.quaternion.setFromUnitVectors(longAxis, tangent);
  spin.setFromAxisAngle(longAxis, flight.t * Math.PI * 2 * SPIRAL_TURNS_PER_SECOND);
  ball.quaternion.multiply(spin);
}

export function createFootball() {
  const ball = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: '#793e22', roughness: .8 });
  const lace = new THREE.MeshStandardMaterial({ color: '#eee3cb', roughness: .7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), leather);
  body.scale.set(.112, .112, .21);body.castShadow = true;body.receiveShadow = true;ball.add(body);
  // Raised laces and narrow end stripes make the axial rotation visible.
  const spine = new THREE.Mesh(new THREE.BoxGeometry(.012, .008, .115), lace);
  spine.position.y = .112;ball.add(spine);
  for(let i=0;i<7;i++){
    const stitch=new THREE.Mesh(new THREE.BoxGeometry(.046,.009,.007),lace);
    stitch.position.set(0,.112,(i-3)*.016);ball.add(stitch);
  }
  for(const z of [-.145,.145]){
    const radius=.112*Math.sqrt(1-(z/.21)**2);
    const stripe=new THREE.Mesh(new THREE.TorusGeometry(radius,.0035,4,32),lace);
    stripe.position.z=z;ball.add(stripe);
  }
  return ball;
}
