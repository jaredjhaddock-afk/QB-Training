import test from 'node:test';
import assert from 'node:assert/strict';
import { defensiveFronts, defensiveAlignment } from '../src/defense.js';
import { formations, coverages } from '../src/football.js';

test('Every front/formation/coverage preserves eleven defenders and correct personnel',()=>{
 for(const [name,front] of Object.entries(defensiveFronts))for(const [coverage,c] of Object.entries(coverages))for(const starts of Object.values(formations)){
  const players=defensiveAlignment(name,coverage,starts);
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++)assert.ok(Math.hypot(players[i].alignX-players[j].alignX,players[i].alignZ-players[j].alignZ)>.65,`${name} ${coverage}: overlapping defenders`);
  assert.equal(players.length,11);assert.equal(new Set(players.map(p=>p.name)).size,11);
  assert.equal(players.filter(p=>p.position==='DL').length,front.line.length);
  assert.equal(players.filter(p=>p.position==='LB').length,front.linebackers.length);
  assert.equal(players.filter(p=>p.position==='DB').length,front.backs);
  assert.equal(players.filter(p=>p.role==='deep').length,c.deep);
  if(c.type==='man')assert.deepEqual(players.filter(p=>p.role==='man').map(p=>p.target).sort(),[0,1,2,3,4]);
  for(const p of players){assert.ok([p.alignX,p.alignZ,p.x,p.z].every(Number.isFinite));assert.ok(p.alignZ>0);assert.ok(Math.abs(p.alignX)<=26);}
 }
});
test('Linebackers start at 4.5 yards, not at coverage drop landmarks; odd-front edge is on the line',()=>{
 for(const name of Object.keys(defensiveFronts))for(const coverage of Object.keys(coverages)){
  const players=defensiveAlignment(name,coverage,formations['Gun Doubles']);
  for(const p of players.filter(p=>p.position==='LB'))assert.equal(p.alignZ,name==='3–4 Odd'&&p.name==='LB4'?1.25:4.5);
  for(const p of players.filter(p=>p.position==='DL'))assert.equal(p.alignZ,.75);
  for(const p of players.filter(p=>p.name.startsWith('S')&&p.role==='deep'))assert.equal(p.alignZ,11.5);
 }
});
test('4–4 rotates a linebacker for Cover 4 without inventing extra defensive backs',()=>{
 const players=defensiveAlignment('4–4','Cover 4',formations['Gun Doubles']);
 assert.equal(players.filter(p=>p.role==='deep'&&p.position==='LB').length,1);
 assert.ok(players.filter(p=>p.role==='deep').every(p=>p.alignZ<p.z));
});
test('Man defenders over a running back never align behind the defensive line',()=>{
 for(const name of Object.keys(defensiveFronts))for(const coverage of ['Cover 1','Cover 2 Man','Cover 0 Blitz'])for(const starts of Object.values(formations)){
  const p=defensiveAlignment(name,coverage,starts).find(p=>p.target===4);
  assert.ok(p.alignZ>=4.5);assert.ok(Math.abs(p.alignX)<=5);
 }
});

test('Cover 3 uses both corners in outside thirds and a single safety in the middle third',()=>{
 for(const front of Object.keys(defensiveFronts)){
  const deep=defensiveAlignment(front,'Cover 3',formations['Gun Doubles']).filter(p=>p.role==='deep');
  assert.equal(deep.filter(p=>p.name.startsWith('CB')).length,2);
  assert.equal(deep.find(p=>p.name.startsWith('S')).alignX,0);
 }
});
