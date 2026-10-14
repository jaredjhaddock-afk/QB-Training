import test from 'node:test';
import assert from 'node:assert/strict';
import { Object3D, Vector3 } from 'three';
import { orientSpiral, SPIRAL_TURNS_PER_SECOND } from '../src/football-ball.js';
test('Spiral keeps the long axis aligned with ascending, level and descending pass tangents',()=>{
 for(const end of [[10,20],[-15,8],[0,25]])for(const t of [.1,.5,.9]){
  const ball=new Object3D(),flight={start:[0,-5],end,duration:1,t};orientSpiral(ball,flight);
  const nose=new Vector3(0,0,1).applyQuaternion(ball.quaternion);
  const expected=new Vector3(end[0],4*Math.PI*Math.cos(t*Math.PI),end[1]+5).normalize();
  assert.ok(nose.distanceTo(expected)<1e-10);assert.ok(Math.abs(ball.quaternion.length()-1)<1e-10);
 }
});
test('Laces rotate around the long axis instead of end over end, independent of previous frames',()=>{
 const period=1/SPIRAL_TURNS_PER_SECOND;
 // A very long, nearly flat pass isolates axial roll over a quarter rotation.
 const flight={start:[0,0],end:[0,10000],duration:1,t:.5};
 const a=new Object3D(),b=new Object3D();orientSpiral(a,flight);orientSpiral(b,{...flight,t:.5+period/4});
 const laceA=new Vector3(0,1,0).applyQuaternion(a.quaternion),laceB=new Vector3(0,1,0).applyQuaternion(b.quaternion);
 assert.ok(Math.abs(laceA.dot(laceB))<.001);
 a.rotation.set(2,1,3);orientSpiral(a,{...flight,t:.5+period/4});assert.ok(a.quaternion.angleTo(b.quaternion)<1e-7);
});
