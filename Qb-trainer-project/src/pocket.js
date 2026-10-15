export const SACK_GRACE_SECONDS=4;
export const canSack=(elapsed,defender,qb)=>elapsed>=SACK_GRACE_SECONDS&&Math.hypot(defender[0]-qb[0],defender[1]-qb[1])<.8;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

export function pocketTarget(index,time,rushers){
  const start=(index-2)*1.7;
  const threat=rushers.reduce((best,p)=>!best||Math.abs(p[0]-start)<Math.abs(best[0]-start)?p:best,null);
  const set=Math.min(1,time/1.6);
  const depth=.9+Math.abs(index-2)*.48;
  const mirror=threat?clamp((threat[0]-start)*.35,-.6,.6):0;
  return [start+set*(mirror+Math.sin(time*2.3+index)*.13),-.6-set*depth];
}

export function rushTarget(assignment,position,qb,time,index,blockers=[]){
  const release=SACK_GRACE_SECONDS+(index%3)*.12;
  const edge=Math.abs(assignment.x)>=4;
  if(time<release){
    const blocker=blockers.reduce((best,p)=>!best||Math.abs(p[0]-assignment.x)<Math.abs(best[0]-assignment.x)?p:best,null);
    return {target:blocker?[blocker[0]+Math.sin(time*2.7+index)*.22,blocker[1]+.85]:[assignment.x*.85,-.7],speed:2.4,state:'engaged'};
  }
  return {target:edge&&position[1]>qb[1]+1.5?[qb[0]+Math.sign(assignment.x)*2.5,qb[1]]:[...qb],speed:4.6,state:edge?'contain-rush':'rush'};
}
