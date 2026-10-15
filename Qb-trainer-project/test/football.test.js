import test from 'node:test';
import assert from 'node:assert/strict';
import {formations,routes,routePoints,pointOnRoute,coverageAssignments,coverages,moveToward} from '../src/football.js';
test('Formations have two eligible ends on the line and three eligible players in the backfield',()=>{for(const starts of Object.values(formations)){assert.equal(starts.filter(p=>p[1]===0).length,2);assert.equal(starts.filter(p=>p[1]<0).length,3);}});
test('Every formation and hot route stays inside the field',()=>{for(const starts of Object.values(formations))for(const start of starts)for(const route of routes){const points=routePoints(start,route);assert.deepEqual(points[0],start);for(let d=0;d<100;d++){const p=pointOnRoute(points,d);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(p[0])<=25);}assert.deepEqual(pointOnRoute(points,1000),points.at(-1));}});
test('Each coverage fields seven secondary/extra rush defenders and five man assignments where required',()=>{for(const [name,c] of Object.entries(coverages)){const assignments=coverageAssignments(name,formations['Deuce']);assert.equal(assignments.length,7);assert.equal(assignments.filter(a=>a.role==='deep').length,c.deep);assert.equal(assignments.filter(a=>a.role==='spy').length,c.spy?1:0);if(c.type==='man')assert.deepEqual(assignments.filter(a=>a.role==='man').map(a=>a.target),[0,1,2,3,4]);}});
test('Route interpolation tracks distance through breaks',()=>{assert.deepEqual(pointOnRoute([[0,0],[0,10],[10,10]],15),[5,10]);assert.deepEqual(moveToward([0,0],[3,4],2.5),[1.5,2]);assert.deepEqual(moveToward([0,0],[0,0],1),[0,0]);});

test('Deuce tight-end variants attach Y on the named side without covering him up',()=>{
 assert.ok(formations.Deuce);
 assert.equal(formations['Gun Doubles'],undefined);
 for(const [name,side,wideout] of [['Deuce RT',-1,3],['Deuce LT',1,0]]){
  const players=formations[name],y=players[2];
  assert.deepEqual(y,[side*5.2,0]);
  assert.equal(players[wideout][1],-1,'same-side wideout must be off the line');
  assert.equal(players.filter(p=>p[0]*side>0&&p[1]===0).length,1,'Y must be the eligible end on his side');
  assert.equal(players.slice(0,4).filter(p=>p[0]>0).length,2,'keep two receivers on each side');
 }
});
