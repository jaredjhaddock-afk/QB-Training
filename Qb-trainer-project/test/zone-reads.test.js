import test from 'node:test';
import assert from 'node:assert/strict';
import {athlete,steer,coverageDecision} from '../src/simulation.js';
const zone={role:'zone',x:0,z:10,minX:-8,maxX:8};
const receivers=points=>points.map(p=>({p,v:[0,0]}));
const decide=(a,p,r,t,m)=>coverageDecision(a,p,r,[0,-5],'Cover 3',t,null,0,m);

test('split routes force a commitment and open space opposite the defender movement',()=>{
 const memory={},body=athlete([0,9]),r=receivers([[-5,8],[5,8]]);
 assert.equal(decide(zone,body.p,r,0,memory).state,'midpoint');
 let committed, conflictRead;
 for(let frame=1;frame<=90;frame++){
  const d=decide(zone,body.p,r,frame/60,memory);
  steer(body,d.target,1/60,d.speed,d.acceleration);
  if(d.threat!==null){committed=d;if(d.conflict)conflictRead=d.conflict;}
 }
 assert.equal(committed.threat,0);
 assert.deepEqual(conflictRead,[0,1]);
 assert.ok(body.p[0]<-2,'defender must leave the midpoint');
 assert.ok(Math.hypot(body.p[0]-5,body.p[1]-8)>7,'opposite receiver gains a window');
});

test('small changes in competing routes do not make the defender flicker assignments',()=>{
 const memory={},r=receivers([[-5,8],[5,8]]);
 for(let t=0;t<.6;t+=.02)decide(zone,[0,9],r,t,memory);
 const chosen=memory.choice;
 for(let frame=0;frame<90;frame++){
  const position=[frame%2?.15:-.15,9];
  assert.equal(decide(zone,position,r,.6+frame/60,memory).threat,chosen);
 }
});

test('a hook defender carries the high route then plants and drives the low route on handoff',()=>{
 const memory={},r=receivers([[0,4],[0,12]]);
 decide(zone,[0,10],r,0,memory);
 assert.equal(decide(zone,[0,10],r,.4,memory).threat,1);
 const body=athlete([0,10]);body.v=[0,3];
 const d=decide(zone,body.p,receivers([[0,4],[0,19]]),.7,memory);
 assert.equal(d.threat,0);assert.equal(d.state,'recover-zone');
 const before=[...body.v];steer(body,d.target,.02,d.speed,d.acceleration);
 assert.ok(body.v[1]>0,'must brake before reversing');
 assert.ok(Math.hypot(...body.v.map((v,i)=>v-before[i]))<=.130001);
});

test('zone reads have a perception interval and release receivers crossing the boundary',()=>{
 const memory={};const first=decide(zone,[0,10],receivers([[0,8]]),0,memory);
 assert.deepEqual(decide(zone,[0,10],receivers([[15,8]]),.1,memory).target,first.target);
 const released=decide(zone,[0,10],receivers([[15,8]]),.2,memory);
 assert.equal(released.state,'landmark');assert.equal(released.threat,null);
 assert.deepEqual(released.target,[0,10]);
});

test('deep help chooses a vertical threat without abandoning depth for a shallow outlet',()=>{
 const memory={},deep={role:'deep',x:0,z:18,minX:-26,maxX:26};
 const r=receivers([[-8,22],[8,22],[0,4]]);r[0].v=[0,5];r[1].v=[0,5];
 const d=decide(deep,[0,18],r,0,memory);
 assert.equal(d.threat,0);assert.deepEqual(d.conflict,[0,1]);assert.ok(d.target[1]>22);
 const later=decide(deep,[-4,22],receivers([[-8,24],[8,24],[0,5]]),1,memory);
 assert.notEqual(later.threat,2);assert.ok(later.target[1]>24);
});

test('a new rep discards prior commitments even when reusing a memory object',()=>{
 const memory={};decide(zone,[0,10],receivers([[0,5],[0,12]]),5,memory);
 const fresh=decide(zone,[0,10],receivers([[0,12]]),0,memory);
 assert.equal(fresh.threat,0);
});

test('rep tendencies vary genuine conflicts, stay reproducible, and preserve clear deep danger',async()=>{
 const {coverageProfile}=await import('../src/zone-reads.js');
 const choices=new Set();
 for(let seed=1;seed<=60;seed++){
  const profile=coverageProfile(seed,2);
  assert.deepEqual(profile,coverageProfile(seed,2));
  const memory={profile},r=receivers([[-5,8],[5,8]]);
  for(let t=0;t<=1;t+=.02)decide(zone,[0,10],r,t,memory);
  choices.add(memory.choice);
  const deep={role:'deep',x:0,z:18,minX:-26,maxX:26};
  assert.equal(decide(deep,[0,18],receivers([[0,10],[4,26]]),1,{profile}).threat,1);
 }
 assert.deepEqual([...choices].sort(),[0,1],'repeat reps must allow either comparable route to win');
});

test('hook and flat defenders protect their depth against shallow checkdowns',()=>{
 for(const a of [zone,{role:'zone',x:16,z:6,minX:8,maxX:26}]){
  const body=athlete([a.x,a.z]),memory={},r=receivers([[a.x,1]]);
  for(let frame=0;frame<180;frame++){
   const d=decide(a,body.p,r,frame/60,memory);
   steer(body,d.target,1/60,d.speed,d.acceleration);
   assert.ok(body.p[1]>=(a.z===10?6.8:3.3),'do not vacate the intermediate area to chase a checkdown');
  }
 }
});

test('adjacent zones hand a crossing receiver across their shared edge without double ownership',()=>{
 const left={role:'zone',x:-6,z:10,minX:-12,maxX:0};
 const right={role:'zone',x:6,z:10,minX:0,maxX:12};
 const memories=[{},{}];
 for(let step=0;step<=20;step++){
  const r=[{p:[-5+step*.5,8],v:[2.5,0]}];
  const decisions=[left,right].map((a,i)=>decide(a,[a.x,10],r,step*.3,memories[i]));
  assert.equal(decisions.filter(d=>d.threat===0).length,1);
  assert.equal(decisions[r[0].p[0]+.45<0?0:1].threat,0);
 }
});

test('a pass in a neighboring lane does not pull a zone defender out of his area',()=>{
 const a={role:'zone',x:-5,z:10,minX:-12,maxX:0};
 const d=coverageDecision(a,[-1,10],receivers([[-5,8],[5,10]]),[0,-5],'Cover 3',2,{t:.5,end:[5,10]},0,{});
 assert.notEqual(d.state,'break-on-ball');assert.ok(d.target[0]<0);
 const own=coverageDecision(a,[-1,10],receivers([[-5,8]]),[0,-5],'Cover 3',2,{t:.5,end:[-5,8]},0,{});
 assert.equal(own.state,'break-on-ball');
});
