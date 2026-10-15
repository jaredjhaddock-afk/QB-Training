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
