import test from 'node:test';
import assert from 'node:assert/strict';
import { routePoints } from '../src/football.js';
import { athlete, runRoute, predictReceiver, receiverFacing } from '../src/simulation.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Post breaks seven yards from alignment and outs break at five or ten',()=>{
 for(const start of [[22,0],[-22,0],[10,-1],[-10,-1]]){
  const post=routePoints(start,'Post');close(post[1][1]-start[1],7);
  for(const depth of [5,10]){
   const path=routePoints(start,`Out (${depth} yd)`);close(path[1][1]-start[1],depth);close(path[2][1],path[1][1]);assert.ok(Math.abs(path[2][0])>Math.abs(path[1][0]));
  }
 }
});
test('Both slants turn inward sixty degrees and wideout slants cross midfield at shallow depth',()=>{
 for(const start of [[22,0],[-22,0],[10,-1],[-10,-1],[0,-8]])for(const depth of [1,3]){
  const path=routePoints(start,`Slant (${depth} yd)`);const [breakpoint,end]=path.slice(1);
  close(breakpoint[1]-start[1],depth);
  close(Math.atan2(Math.abs(end[0]-breakpoint[0]),end[1]-breakpoint[1])*180/Math.PI,60);
  if(Math.abs(start[0])===22){assert.ok(end[0]*start[0]<0);assert.ok(breakpoint[1]+22/Math.tan(Math.PI/3)<16);}
 }
});
test('Spot travels five yards diagonally, settles and faces the QB; pass prediction remains at the spot',()=>{
 for(const start of [[22,0],[-22,0],[10,-1]]){
  const path=routePoints(start,'Spot'),end=path.at(-1);const dx=end[0]-start[0],dz=end[1]-start[1];
  close(Math.hypot(dx,dz),5);close(Math.atan2(Math.abs(dx),dz)*180/Math.PI,55);assert.ok(dx*start[0]<0);
  const body=athlete(start);assert.equal(receiverFacing('Spot',body,path,[0,-5]),null);
  for(let i=0;i<200;i++)runRoute(body,path,.02);
  assert.ok(Math.hypot(body.p[0]-end[0],body.p[1]-end[1])<.05);assert.ok(Math.hypot(...body.v)<.05);
  close(receiverFacing('Spot',body,path,[0,-5]),Math.atan2(-body.p[0],-5-body.p[1]));
  const prediction=predictReceiver(body,path,1);assert.ok(Math.hypot(prediction[0]-end[0],prediction[1]-end[1])<.05);
  assert.equal(receiverFacing('Go',body,path,[0,-5]),null);
 }
});
