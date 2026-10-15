import test from 'node:test';
import assert from 'node:assert/strict';
import {canSack,pocketTarget,rushTarget} from '../src/pocket.js';
import {athlete,steer} from '../src/simulation.js';

test('no defender can sack before four seconds, even when already touching the QB',()=>{
 for(const t of [0,.5,1.7,3.2,3.999999])assert.equal(canSack(t,[0,-5],[0,-5]),false);
 assert.equal(canSack(4,[0,-5],[0,-5]),true);
 assert.equal(canSack(4,[2,-5],[0,-5]),false);
});

test('five blockers form a moving pocket with deeper tackles and bounded lateral movement',()=>{
 const blockers=Array.from({length:5},(_,i)=>athlete([(i-2)*1.7,-.6]));
 const rushers=[[-4,0],[-1.5,0],[1.5,0],[4,0]];
 for(let frame=0;frame<240;frame++){
  const time=frame/60;
  blockers.forEach((b,i)=>{
   const before=[...b.p];steer(b,pocketTarget(i,time,rushers),1/60,1.5,6);
   assert.ok(Math.hypot(b.p[0]-before[0],b.p[1]-before[1])<=1.5/60+.00001);
   assert.ok(Math.abs(b.p[0]-(i-2)*1.7)<.8);
  });
 }
 assert.ok(blockers[0].p[1]<blockers[2].p[1]-.6);
 assert.ok(blockers[4].p[1]<blockers[2].p[1]-.6);
 assert.ok(blockers[2].p[1]<-1.2);
 assert.notDeepEqual(pocketTarget(0,2,rushers),pocketTarget(0,2.5,rushers));
});

test('rushers engage moving blockers until protection expires, then pursue the quarterback',()=>{
 const a={x:-4.6},qb=[0,-5],blockers=[[-3.8,-2.3],[0,-1.5],[3.8,-2.3]];
 for(let i=0;i<7;i++){
  const d=rushTarget(a,[-4,0],qb,3.99,i,blockers);
  assert.equal(d.state,'engaged');assert.ok(Math.abs(d.target[0]+3.8)<=.23);
  assert.equal(d.target[1],-2.3+.85);
  assert.notEqual(rushTarget(a,[-4,0],qb,4.3,i,blockers).state,'engaged');
 }
});
