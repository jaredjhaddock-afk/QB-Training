import test from 'node:test';
import assert from 'node:assert/strict';
import { athlete, steer, runRoute, predictReceiver, coverageDecision } from '../src/simulation.js';
import { formations, routes, routePoints, coverageAssignments, coverages } from '../src/football.js';
const observed = points => points.map(p => ({ p, v: [0, 5] }));
test('Athletes accelerate, brake and reverse without instantaneous velocity changes', () => {
 const body=athlete([0,0]);steer(body,[0,20],.02);
 assert.ok(body.v[1]>0&&body.v[1]<=.26);
 for(let i=0;i<100;i++)steer(body,[0,20],.02);
 const previous=[...body.v];steer(body,[0,-20],.02);
 assert.ok(body.v[1]>0);assert.ok(Math.hypot(...body.v.map((v,i)=>v-previous[i]))<=.260001);
 for(let i=0;i<100;i++)steer(body,[0,-20],.02);
 assert.ok(body.v[1]<0);
});
test('All routes remain finite and inside sidelines; prediction matches actual movement',()=>{
 for(const starts of Object.values(formations))for(const start of starts)for(const route of routes){
  const path=routePoints(start,route),body=athlete(start);
  for(let i=0;i<600;i++){runRoute(body,path,.02);assert.ok(body.p.every(Number.isFinite));assert.ok(Math.abs(body.p[0])<=25);}
  const predicted=predictReceiver(body,path,1);
  for(let i=0;i<50;i++)runRoute(body,path,.02);
  assert.ok(Math.hypot(...predicted.map((p,i)=>p-body.p[i]))<1e-8);
 }
});
test('Deep coverage protects deepest vertical threat instead of chasing the nearest short receiver',()=>{
 const a=coverageAssignments('Cover 3',formations['Deuce'])[1];
 const result=coverageDecision(a,[0,18],observed([[0,10],[3,25]]),[0,-5],'Cover 3',3,null);
 assert.equal(result.state,'cap-deep');assert.equal(result.threat,1);assert.ok(result.target[1]>25);
});
test('Underneath zone midpoints two threats and hands off a crosser outside its lane',()=>{
 const a={role:'zone',x:0,z:10,minX:-8,maxX:8};
 let result=coverageDecision(a,[0,10],observed([[-5,7],[5,9]]),[0,-5],'Cover 3',2,null);
 assert.equal(result.state,'midpoint');assert.equal(result.target[0],0);
 result=coverageDecision(a,[0,10],observed([[15,7]]),[0,-5],'Cover 3',3,null);
 assert.equal(result.state,'landmark');assert.deepEqual(result.target,[0,10]);
});
test('Defenders react after release delay and man coverage maintains its assignment',()=>{
 const a={role:'man',target:0,x:0,z:3},receivers=observed([[0,8],[10,10]]);
 const early=coverageDecision(a,[0,8],receivers,[0,-5],'Cover 2 Man',2,{t:.1,end:[5,10]});
 assert.equal(early.state,'trail');assert.equal(early.threat,0);assert.ok(early.target[1]<receivers[0].p[1]);
 const late=coverageDecision(a,[0,8],receivers,[0,-5],'Cover 2 Man',2,{t:.4,end:[5,10]});
 assert.equal(late.state,'break-on-ball');assert.deepEqual(late.target,[5,10]);
});
test('Every coverage returns bounded, finite decisions and the spy mirrors QB movement',()=>{
 for(const name of Object.keys(coverages))for(const a of coverageAssignments(name,formations['Gun Trips Right'])){
  const d=coverageDecision(a,[a.x,a.z],observed(formations['Gun Trips Right']),[12,-4],name,2,null);
  assert.ok(d.target.every(Number.isFinite));assert.ok(Math.abs(d.target[0])<=26);
  if(a.role==='spy'){assert.equal(d.state,'spy');assert.ok(d.target[0]>0);assert.ok(d.target[1]>-4);}
 }
});
