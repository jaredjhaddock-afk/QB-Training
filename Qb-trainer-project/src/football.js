export const formations = {
  'Gun Doubles': [[22,0],[10,-1],[-10,-1],[-22,0],[4,-5]],
  'Gun Trips Right': [[22,0],[-7,-1],[-14,-1],[-22,0],[4,-5]],
  'Trips LT': [[22,0],[14,-1],[7,-1],[-22,0],[-4,-5]],
  'Trips RT': [[22,0],[-7,-1],[-14,-1],[-22,0],[4,-5]],
  'Singleback': [[22,0],[10,-1],[-7,0],[-22,-1],[0,-8]],
};
export const labels = ['X','F','Y','Z','H'];
export const routes = ['Go','Slant (3 yd)','Slant (1 yd)','Out (5 yd)','Out (10 yd)','Spot','In','Curl','Corner','Post','Flat','Drag','Wheel'];
export const coverages = {
  'Cover 1': {type:'man', deep:1, spy:false, tip:'One deep safety. Watch the leverage of the man defenders; crossers and out-breaking routes can create separation.'},
  'Cover 2 Man': {type:'man', deep:2, spy:false, tip:'Two high safeties over man coverage. Work underneath with crossers and breaking routes.'},
  'Cover 2 Zone': {type:'zone', deep:2, spy:false, tip:'Two deep halves with five underneath zones. Read the flat defender and look for space between the flat and deep half.'},
  'Cover 3': {type:'zone', deep:3, spy:false, tip:'Three deep thirds and four underneath zones. Stretch an underneath defender with a short and intermediate route.'},
  'Cover 3 Spy': {type:'zone', deep:3, spy:true, tip:'Three deep defenders with a quarterback spy. Find the thinner underneath coverage; the spy limits scrambles.'},
  'Cover 4': {type:'zone', deep:4, spy:false, tip:'Four deep quarters. Take underneath space and use route combinations to stress the outside coverage.'},
  'Cover 0 Blitz': {type:'man', deep:0, spy:false, tip:'No deep safety and six rushers. Identify your quick answer before the snap.'},
};
export function routePoints(start, route) {
  const [x,z]=start, inside=x>0?-1:1, outside=-inside;
  // Angles are measured inward from straight upfield; preserve the angle
  // when shortening a diagonal to keep its endpoint within the sidelines.
  const slantAcross=Math.min(32,25+Math.abs(x));
  const slantRise=slantAcross/Math.tan(Math.PI/3);
  const spotAngle=55*Math.PI/180;
  const paths={
    Go:[[0,40]],
    'Slant (3 yd)':[[0,3],[inside*slantAcross,3+slantRise]],
    'Slant (1 yd)':[[0,1],[inside*slantAcross,1+slantRise]],
    'Out (5 yd)':[[0,5],[outside*14,5]],
    'Out (10 yd)':[[0,10],[outside*14,10]],
    Spot:[[inside*5*Math.sin(spotAngle),5*Math.cos(spotAngle)]],
    In:[[0,12],[inside*24,12]],Curl:[[0,13],[inside*1,10]],
    Corner:[[0,12],[outside*13,28]],Post:[[0,7],[inside*16,27]],
    Flat:[[outside*12,3]],Drag:[[0,3],[inside*30,4]],Wheel:[[outside*9,3],[outside*11,28]],
  };
  return [[x,z],...paths[route].map(([dx,dz])=>[Math.max(-25,Math.min(25,x+dx)),z+dz])];
}
export function pointOnRoute(points,distance) {
  for(let i=1;i<points.length;i++) {const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]); if(distance<=len) return [a[0]+(b[0]-a[0])*distance/len,a[1]+(b[1]-a[1])*distance/len]; distance-=len;}
  return [...points.at(-1)];
}
export function coverageAssignments(name, starts) {
  const c=coverages[name];
  if(c.type==='man') return [...starts.map((p,i)=>({role:'man',target:i,x:p[0]+(p[0]>0?-1:1),z:p[1]+3})),...Array.from({length:c.deep},(_,i)=>({role:'deep',x:c.deep===1?0:(i?13:-13),z:20,minX:c.deep===1?-26:(i?0:-26),maxX:c.deep===1?26:(i?26:0)})),...Array.from({length:2-c.deep},(_,i)=>({role:'rush',x:i?4:-4,z:1}))];
  const deep=Array.from({length:c.deep},(_,i)=>({role:'deep',x:-26+(i+.5)*52/c.deep,z:18,minX:-26+i*52/c.deep,maxX:-26+(i+1)*52/c.deep}));
  const n=7-c.deep-(c.spy?1:0);
  return [...deep,...Array.from({length:n},(_,i)=>({role:'zone',x:-25+(i+.5)*50/n,z:i===0||i===n-1?6:10,minX:-26+i*52/n,maxX:-26+(i+1)*52/n})),...(c.spy?[{role:'spy',x:0,z:5}]:[])];
}
export function moveToward(position,target,step) {const dx=target[0]-position[0],dz=target[1]-position[1],d=Math.hypot(dx,dz);return d<=step?[...target]:[position[0]+dx/d*step,position[1]+dz/d*step];}
