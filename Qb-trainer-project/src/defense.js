import { coverageAssignments, coverages } from './football.js';

// Representative coaching alignments, in yards from the line of scrimmage.
// Personnel stays fixed when coverage changes; assignments and rotations do not.
export const defensiveFronts = {
  '4–3 Even': { line: [-4.6, -1.7, 1.7, 4.6], linebackers: [-6, 0, 6], backs: 4 },
  '3–4 Odd': { line: [-3.4, 0, 3.4], linebackers: [-6, -2.5, 2.5, 6], backs: 4 },
  '4–4': { line: [-4.6, -1.7, 1.7, 4.6], linebackers: [-7, -2.5, 2.5, 7], backs: 3 },
  'Nickel 4–2–5': { line: [-4.6, -1.7, 1.7, 4.6], linebackers: [-3, 3], backs: 5 },
  'Dime 4–1–6': { line: [-4.6, -1.7, 1.7, 4.6], linebackers: [0], backs: 6 },
  'Nickel Wide': { line: [-6, -1.7, 1.7, 6], linebackers: [-3, 3], backs: 5 },
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function defensiveAlignment(frontName, coverageName, starts) {
  const front = defensiveFronts[frontName];
  const coverage = coverages[coverageName];
  const line = front.line.map((x, i) => ({ position: 'DL', name: `DL${i+1}`, alignX:x, alignZ:.75, role:'rush', x, z:.75 }));
  const players = front.linebackers.map((x,i)=>({position:'LB',name:`LB${i+1}`,alignX:x,alignZ:4.5}));
  // Three-down personnel rushes one outside linebacker as its fourth base rusher.
  if(front.line.length===3){
    const edge=players.pop();edge.alignZ=1.25;line.push({...edge,role:'rush',x:edge.alignX,z:edge.alignZ});
  }
  const wide=[Math.min(...starts.map(p=>p[0])),Math.max(...starts.map(p=>p[0]))];
  players.push(...wide.map((x,i)=>({position:'DB',name:`CB${i+1}`,alignX:x-Math.sign(x)*.75,alignZ:coverageName==='Cover 2 Zone'?3.5:5.5})));
  const safeties=front.backs===3?1:2;
  for(let i=0;i<safeties;i++)players.push({position:'DB',name:`S${i+1}`,alignX:safeties===1?0:i===0?-10:10,alignZ:11.5});
  const slots=starts.slice(1,3).map(p=>p[0]);
  for(let i=0;i<front.backs-2-safeties;i++)players.push({position:'DB',name:`DB${i+1}`,alignX:slots[i],alignZ:4.5});
  const jobs=coverageAssignments(coverageName,starts);
  // Assign all seven jobs jointly: preserve safety/corner deep responsibilities,
  // put corners over wideouts, and use linebackers for inside coverage/blitzes.
  function cost(player,job){
    let value=Math.abs(player.alignX-job.x);
    if(job.role==='deep'){
      const outside=(coverage.deep===3||coverage.deep===4)&&Math.abs(job.x)>13;
      value+=outside?(player.name.startsWith('CB')?0:player.name.startsWith('S')?35:70):(player.name.startsWith('S')?0:player.name.startsWith('CB')?40:60);
    }
    if(job.role==='man'){
      const outside=job.target===0||job.target===3;
      value+=(outside!==player.name.startsWith('CB'))?25:0;
      if(job.target===4&&player.position==='DB')value+=12;
    }
    if(job.role==='zone')value+=player.name.startsWith('S')?10:0;
    if(job.role==='spy'||job.role==='rush')value+=player.position==='LB'?0:30;
    return value;
  }
  let best=Infinity,bestOrder=[];
  function match(order,remaining,total){
    if(total>=best)return;
    if(!remaining.length){best=total;bestOrder=order;return;}
    const job=jobs[order.length];
    for(const index of remaining)match([...order,index],remaining.filter(i=>i!==index),total+cost(players[index],job));
  }
  match([],players.map((_,i)=>i),0);
  return [...line,...jobs.map((job,i)=>{
    const player={...players[bestOrder[i]]};
    if(job.role==='man'){
      const receiver=starts[job.target];
      player.alignX=job.target===4?clamp(receiver[0],-5,5):receiver[0]-Math.sign(receiver[0])*.75;
      // Back depth must never pull his man defender behind the line of scrimmage.
      player.alignZ=player.position==='LB'?4.5:player.name.startsWith('CB')?5.5:6;
    }
    if(job.role==='deep'&&player.name.startsWith('S'))player.alignX=job.x;
    // A 4–4 with a two/four-deep call rotates a linebacker from normal depth;
    // it does not silently substitute a fourth defensive back.
    return {...job,...player};
  })];
}
