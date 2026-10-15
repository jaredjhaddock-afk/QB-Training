const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

// Stable per-rep tendencies: randomness affects close reads, never movement each frame.
export function coverageProfile(seed,index=0) {
  let state=(seed+Math.imul(index+1,2654435761))>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  return {interval:.16+random()*.08,commit:.6+random()*.25,reaction:.24+random()*.10,
    preferences:Array.from({length:5},()=> (random()-.5)*2.4)};
}

// Persistent, reproducible reads of observed movement, never route names or
// future waypoints. The caller owns one memory object per defender per rep.
export function readZone(a,position,observed,time,index,memory) {
  if(memory.lastTime>time){const profile=memory.profile;for(const key of Object.keys(memory))delete memory[key];memory.profile=profile;}
  memory.lastTime=time;
  if(memory.nextRead>time&&memory.read)return {...memory.read,target:[...memory.read.target]};
  const profile=memory.profile;
  memory.nextRead=time+(profile?.interval??(.16+(index%3)*.04));
  const deep=a.role==='deep',flat=!deep&&a.z<=6;
  const floor=flat?3.5:7,ceiling=flat?11:14;
  // Adjacent lanes share an edge, not overlapping ownership. Anticipate a
  // crossing from observed velocity, so the next zone picks it up on entry.
  const owns=r=>{const x=r.p[0]+r.v[0]*.18;return x>=a.minX&&(x<a.maxX||a.maxX>=26&&x<=26);};
  const candidates=observed.map((r,i)=>({...r,i})).filter(r=>
    owns(r)&&
    (deep?r.p[1]>7:r.p[1]>-3&&r.p[1]<(flat?13:17))
  ).map(r=>{
    const vertical=Math.max(0,r.v[1]);
    const settled=Math.hypot(...r.v)<1;
    // Safeties protect vertical threats. Flat defenders favor the quick outlet;
    // hook defenders gain depth with a seam/dig before driving a settled route.
    const score=deep?r.p[1]+vertical*.45-Math.abs(r.p[0]-position[0])*.12:
      7-gap([a.x,a.z],r.p)*.24+vertical*.18+(settled?.8:0)+
      (flat?Math.max(0,7-r.p[1])*.24:Math.min(12,r.p[1])*.10);
    // A bounded preference can decide a real conflict, but cannot outweigh a
    // clearly deeper vertical. Score against the landmark to avoid chasing bias.
    return {...r,score:score+(profile?.preferences[r.i]??0)};
  }).sort((a,b)=>b.score-a.score||a.i-b.i);
  let result={target:[a.x,a.z],speed:5.5,acceleration:11,state:'landmark',threat:null,conflict:null};
  if(!candidates.length){memory.choice=null;memory.conflictKey=null;}
  else {
    const first=candidates[0],second=candidates[1];
    const split=second&&gap(first.p,second.p)>4.5&&first.score-second.score<(deep?5:2.6);
    const key=split?[first.i,second.i].sort().join(':'):null;
    if(key!==memory.conflictKey){memory.conflictKey=key;memory.conflictSince=time;}
    const conflict=split?[first.i,second.i]:null;
    let chosen=candidates.find(r=>r.i===memory.choice);
    // An uncommitted underneath defender briefly splits two threats, then must
    // choose. He cannot indefinitely stand at their mathematical average.
    if(!deep&&!chosen&&split&&time-memory.conflictSince<.28){
      result={...result,target:[clamp((first.p[0]+second.p[0])/2,a.minX+.5,a.maxX-.5),clamp((first.p[1]+second.p[1])/2+.6,floor,ceiling)],state:'midpoint',conflict};
    }else{
      const change=!chosen||(time>=memory.commitUntil&&first.i!==chosen.i&&first.score>chosen.score+.75);
      if(change){
        const previous=memory.choice;
        chosen=first;memory.choice=chosen.i;memory.commitUntil=time+(profile?.commit??(.6+(index%3)*.06));
        // Changing assignments costs a plant/turn step, even after recognizing it.
        if(previous!==null&&previous!==undefined&&previous!==chosen.i)memory.recoverUntil=time+.28;
      }
      const recovering=time<memory.recoverUntil;
      const target=deep?
        [clamp(chosen.p[0]+chosen.v[0]*.2,a.minX+.5,a.maxX-.5),Math.max(a.z,chosen.p[1]+3.2)]:
        [clamp(chosen.p[0]+chosen.v[0]*.2,a.minX+.5,a.maxX-.5),clamp(chosen.p[1]+chosen.v[1]*.2+.5,floor,ceiling)];
      // Shallow routes are watched from zone depth until the ball is released;
      // chasing them pre-throw would vacate the dig/seam window.
      result={target,speed:recovering?3.8:deep?5.8:5.5,acceleration:recovering?6.5:11,
        state:recovering?'recover-zone':deep?'cap-deep':chosen.v[1]>1?'carry-zone':'drive-under',
        threat:chosen.i,conflict};
    }
  }
  memory.read=result;
  return {...result,target:[...result.target]};
}
