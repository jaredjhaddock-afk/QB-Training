import * as THREE from 'three';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import './style.css';
import { createPlayer, animatePlayer } from './players.js';
import { loadPlayerAsset, attachPlayerAsset, playerCatchPoint, settleCatch, aimPlayerHead } from './player-asset.js';
import { createTurfMaterials, loadEnvironment, addCrowd } from './environment.js';
import { setupFirstPerson, movementDirection } from './first-person.js';
import { createViewHands } from './view-hands.js';
import { athlete, steer, runRoute, predictReceiver, receiverFacing, coverageDecision } from './simulation.js';
import { defensiveFronts, defensiveAlignment } from './defense.js';
import { createFootball, orientSpiral } from './football-ball.js';
import { pocketTarget, canSack } from './pocket.js';
import { setupVR } from './vr.js';
import { createRouteRibbon } from './route-display.js';
import { cameraPose } from './camera.js';
import { setupMobile } from './mobile.js';
import { loadReceiverNames, setupReceiverNames } from './receiver-names.js';
import { formations, labels as defaultLabels, routes, coverages, routePoints } from './football.js';

const labels=loadReceiverNames(defaultLabels);
const app=document.querySelector('#app');
app.innerHTML=`
<header><div class="brand"><span class="brand-icon">⌁</span><div>POCKET LAB<small>QUARTERBACK DEVELOPMENT</small></div></div><div class="top-tag"><span>●</span> PRACTICE FACILITY</div></header>
<main><div class="intro"><div><p class="eyebrow">READ. REACT. REPEAT.</p><h1>Your next rep starts here.</h1><p>Build the play. Read the coverage. Own the pocket.</p></div><div class="session"><div><strong id="reps">00</strong><small>REPS TAKEN</small></div><div><strong id="completion">—</strong><small>COMPLETION</small></div></div></div>
<div class="layout"><aside class="panel sidebar"><section class="panel-section"><div class="section-title"><h2>OFFENSE</h2><span class="step">01 / BUILD</span></div><label class="caption" for="formation">FORMATION</label><select id="formation">${Object.keys(formations).map(x=>`<option>${x}</option>`).join('')}</select><label class="caption">RECEIVER HOT ROUTES</label><div id="route-controls">${labels.map((l,i)=>`<div class="route-row"><input class="receiver-name" id="receiver-name-${i}" aria-label="Receiver ${i+1} designation" aria-describedby="receiver-name-feedback" value="${l}" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false"><select aria-label="${l} receiver route" id="route-${i}">${routes.map(r=>`<option>${r}</option>`).join('')}</select></div>`).join('')}</div><button id="reset-names" class="reset-names">Reset names</button><p id="receiver-name-feedback" class="section-note" role="status" aria-live="polite"></p><p class="section-note">Edit the names to match your team. Keys 1–5 follow the receivers from top to bottom.</p></section>
<section class="panel-section"><div class="section-title"><h2>DEFENSE</h2><span class="step">02 / READ</span></div><label class="caption" for="coverage">COVERAGE</label><select id="coverage">${Object.keys(coverages).map(x=>`<option ${x==='Cover 3'?'selected':''}>${x}</option>`).join('')}</select><label class="caption" for="front">DEFENSIVE FRONT</label><select id="front">${Object.keys(defensiveFronts).map(name=>`<option>${name}</option>`).join('')}</select><p class="section-note">Front selects defensive personnel. Coverage sets their assignments; some combinations rotate a linebacker into deep coverage.</p></section>
<section class="panel-section"><div class="section-title"><h2>TRAINING AIDS</h2><span class="step">03 / REP</span></div><label class="caption" for="camera-view">CAMERA</label><select id="camera-view"><option value="QB POV">First person</option><option value="Third Person">Third person</option><option>QB Follow</option><option>Wide QB</option></select><label class="toggle">Show receiver routes<input id="show-routes" type="checkbox" checked></label><label class="toggle">Show coverage zones<input id="show-zones" type="checkbox"></label><label class="toggle">Slow motion · 65% speed<input id="slow" type="checkbox"></label></section></aside>
<section class="right"><div class="panel"><div class="field-top"><span class="status" id="status"><i class="dot"></i>PRE-SNAP</span><span class="view-name">QB CAM / QB POV</span><div class="view-tools"><button id="camera-toggle" type="button" aria-label="Third-person view" aria-pressed="false" title="Switch camera (C)">View: 1st</button><button id="routes-toggle" type="button" aria-pressed="true" title="Toggle route lines (V)">Routes: on</button></div></div><div id="viewport"><div class="field-badge"><b>1ST & 10</b> OWN 30</div><div id="clock">0.0s</div><div id="labels"></div><div class="field-bottom"><span id="field-hint">Scan the coverage. Snap the ball when you’re ready.</span></div><div id="result" role="status" aria-live="polite"><div class="result-card"><h2 id="result-title"></h2><p id="result-detail"></p><small>Tap Reset play for another rep · keyboard R</small></div></div></div><div class="controls"><button class="primary" id="snap">▶ &nbsp; SNAP BALL</button><button class="secondary" id="reset">↻ &nbsp; RESET PLAY</button><div class="mobile-keys"><button aria-label="Move left" data-move="a">←</button><button aria-label="Move forward" data-move="w">↑</button><button aria-label="Move back" data-move="s">↓</button><button aria-label="Move right" data-move="d">→</button></div><div class="controls-help"><kbd>SPACE</kbd> snap &nbsp; <kbd>1–5</kbd> throw &nbsp; <kbd>W A S D</kbd> move &nbsp; MOUSE look<br><kbd>R</kbd> reset &nbsp; or click a receiver to throw</div></div></div>
<div class="panel insight"><div class="insight-icon">◎</div><div><h3 id="read-title">THE PRE-SNAP READ</h3><p id="read-tip"></p></div></div><div class="bottom-line"><div class="legend"><span><i style="background:#d6f56c"></i>Offense</span><span><i style="background:#ed775b"></i>Defense</span><span><i style="background:#e3ce70"></i>First down</span></div><span>SIMPLIFIED COVERAGE MODEL · DEVELOPMENT BUILD</span></div></section></div><footer>POCKET LAB &nbsp; / &nbsp; An independent quarterback training prototype. Not affiliated with the NFL or EA Sports. <a href="/assets/CREDITS.md" target="_blank" rel="noopener">Asset credits</a></footer></main>`;

const $=id=>document.getElementById(id);
['Go','Slant (3 yd)','Out (10 yd)','Post','Flat'].forEach((r,i)=>$(`route-${i}`).value=r);
const viewport=$('viewport');
const scene=new THREE.Scene();scene.background=new THREE.Color('#91afb9');scene.fog=new THREE.Fog('#aebbb2',100,260);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;viewport.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(82,1,.08,350);scene.add(camera);
const viewHands=createViewHands(camera);
scene.add(new THREE.HemisphereLight('#cfdfec','#42533d',1.35));
const visuals={environment:'loading',playerModel:'loading',crowd:0};
loadEnvironment(scene,renderer).then(()=>{visuals.environment='ready';}).catch(error=>{visuals.environment='fallback';console.warn('Using fallback daylight:',error.message);});
const sun=new THREE.DirectionalLight('#ffe3b6',3.3);sun.position.set(-36,40,-26);sun.castShadow=true;sun.shadow.mapSize.set(matchMedia('(pointer: coarse)').matches?1024:2048,matchMedia('(pointer: coarse)').matches?1024:2048);Object.assign(sun.shadow.camera,{left:-36,right:36,top:58,bottom:-30,near:1,far:180});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;scene.add(sun);
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const turf=createTurfMaterials(renderer),white=mat('#e6ead9'),dark=mat('#1c2b2d');
function mesh(geometry,material,x,y,z,parent=scene){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,m,x,y,z,parent=scene){const part=mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);part.castShadow=h>.2;return part;}
for(let i=0;i<24;i++)box(53.3,.1,5,turf[i%2],0,-.07,-40+i*5);
box(70,.12,130,mat('#345a3e'),0,-.16,17.5);
for(let z=-30;z<=70;z+=5){box(53.3,.015,.12,white,0,.01,z);for(const x of [-8.9,8.9]){for(let j=1;j<5;j++)box(.55,.02,.09,white,x,.02,z+j);}}
for(const x of [-26.65,26.65])box(.2,.025,120,white,x,.02,20);
box(53.3,.018,.16,mat('#d9c76b'),0,.035,10);box(53.3,.018,.12,mat('#64b3dc'),0,.035,0);
function textTexture(text,color='#edf0df',size=110){const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.font=`800 ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
for(let z=-20;z<=60;z+=10){const num=50-Math.abs(20-z);for(const x of [-20,20]){const m=mesh(new THREE.PlaneGeometry(4.8,2.4),new THREE.MeshBasicMaterial({map:textTexture(String(num)),transparent:true,depthWrite:false}),x,.04,z);m.rotation.x=-Math.PI/2;m.rotation.z=x<0?Math.PI/2:-Math.PI/2;}}
for(const z of [-35,75]){box(53.3,.02,9,mat('#203d35'),0,.01,z);const m=mesh(new THREE.PlaneGeometry(30,6),new THREE.MeshBasicMaterial({map:textTexture('POCKET LAB','#d6f56c',65),transparent:true}),0,.04,z);m.rotation.x=-Math.PI/2;}
// Original stadium geometry: tiered seating, concourse, perimeter boards and light banks.
const seatMaterials=['#314750','#405b61','#536b6c','#3c535b'].map(c=>mat(c));
for(const side of [-1,1]){box(2,2.3,133,dark,side*32,1,20);for(let row=0;row<13;row++){box(1.8,.5,135,seatMaterials[row%4],side*(35+row*1.4),2+row*.7,20);}box(23,1,140,mat('#6b7778'),side*44,13,20);}
const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.65,.65),seatMaterials[1],1066);let seatIndex=0;const seatMatrix=new THREE.Matrix4();for(const side of [-1,1])for(let row=0;row<13;row++)for(let z=-44;z<85;z+=3.2){seatMatrix.makeTranslation(side*(35+row*1.4),2.5+row*.7,z);seats.setMatrixAt(seatIndex++,seatMatrix);}seats.count=seatIndex;scene.add(seats);visuals.crowd=addCrowd(scene);
for(const z of [-45,85]){box(112,5,3,dark,0,2,z);for(let row=0;row<9;row++)box(110,.65,1.7,seatMaterials[row%4],0,5+row*.7,z+(z<0?-1:1)*row*1.5);}
for(const x of [-33,33])for(const z of [-32,68]){box(.35,28,.35,dark,x,14,z);box(7,2,.6,mat('#e2e3d9'),x,28,z);}
const board=mesh(new THREE.PlaneGeometry(18,5),new THREE.MeshBasicMaterial({map:textTexture('POCKET LAB','#d6f56c',63)}),0,14,83);board.rotation.y=Math.PI;
const goal=mat('#e0bd54');for(const z of [-39,79]){box(.18,3,.18,goal,0,1.5,z);box(6,.15,.15,goal,0,3,z);for(const x of [-3,3])box(.12,5,.12,goal,x,5.5,z);}

function makePlayer(isOff,number,role){const model=createPlayer(isOff,number,role);scene.add(model);return model;}
function place(g,p,time=0,moving=false,facing=null,animation={}){
 const dx=p[0]-g.position.x,dz=p[1]-g.position.z,travel=Math.hypot(dx,dz);
 const dt=Math.max(.001,time-(g.userData.lastTime??time));g.userData.lastTime=time;
 if(time===0){g.userData.stride=0;g.position.y=0;}
 else g.userData.stride=(g.userData.stride||0)+travel;
 g.position.set(p[0],0,p[1]);
 const speed=time===0?0:Math.min(6,travel/dt);
 if(g.userData.role!=='quarterback'&&(travel>.00001||facing!==null)){
  const goal=facing??Math.atan2(dx,dz),delta=Math.atan2(Math.sin(goal-g.rotation.y),Math.cos(goal-g.rotation.y));
  g.rotation.y+=THREE.MathUtils.clamp(delta,-dt*6,dt*6);
 }
 if(g.userData.role==='quarterback')g.rotation.y=0;
 const backpedal=facing!==null&&(dx*Math.sin(g.rotation.y)+dz*Math.cos(g.rotation.y))<0;
 g.userData.locomotion={speed,stride:g.userData.stride||0,backpedal};
 animatePlayer(g,time,speed>.12,animation);
}
const receivers=labels.map((_,i)=>({model:makePlayer(true,11+i),p:[0,0],path:[]}));
const defenders=Array.from({length:11},(_,i)=>({model:makePlayer(false,21+i,i<4?'rusher':'defender'),p:[0,0],assignment:null}));
const blockers=Array.from({length:5},(_,i)=>makePlayer(true,60+i,'blocker'));
const qb=makePlayer(true,7,'quarterback');
loadPlayerAsset().then(asset=>{
 [...receivers.map(r=>r.model),...blockers,qb].forEach(player=>attachPlayerAsset(player,asset,true));
 defenders.forEach(d=>attachPlayerAsset(d.model,asset,false));
 visuals.playerModel='realistic-glb';sceneRevision++;
}).catch(error=>{visuals.playerModel='procedural-fallback';console.warn('Using fallback players:',error.message);});
const qbRing=mesh(new THREE.RingGeometry(.64,.76,48),new THREE.MeshBasicMaterial({color:0x7bffcb,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}),0,.045,-5);qbRing.rotation.x=-Math.PI/2;
const ball=createFootball();scene.add(ball);
const routeGroup=new THREE.Group();scene.add(routeGroup);const zoneGroup=new THREE.Group();scene.add(zoneGroup);
const targetButtons=labels.map((l,i)=>{const b=document.createElement('button');b.className='player-label';b.textContent=l;b.setAttribute('aria-label',`Throw to ${l}`);b.addEventListener('click',()=>throwBall(i));$('labels').append(b);return b;});
let sceneRevision=0,lastRenderState='';
let caughtPlayer=null,coverageReads=[];
let phase='ready',elapsed=0,qpos=[0,-5],passes=0,completions=0,reps=0,flight=null,coverage='',keys=new Set(),sacked=false,qbody=athlete([0,-5]),observations=[];
function clearGroup(group){for(const child of [...group.children]){child.geometry.dispose();child.material.dispose();group.remove(child);}}
function reset(){sceneRevision++;caughtPlayer=null;coverageReads=[];keys.clear();input.reset();phase='ready';elapsed=0;flight=null;sacked=false;qpos=[0,-5];qbody=athlete(qpos);observations=[];coverage=$('coverage').value;const starts=formations[$('formation').value];clearGroup(routeGroup);clearGroup(zoneGroup);
 receivers.forEach((r,i)=>{r.motion=athlete(starts[i]);r.p=r.motion.p;r.route=$(`route-${i}`).value;r.path=routePoints(starts[i],r.route);place(r.model,r.p);r.model.rotation.y=0;routeGroup.add(createRouteRibbon(r.path));});
 const assignments=defensiveAlignment($('front').value,coverage,starts);
 defenders.forEach((d,i)=>{d.assignment=assignments[i];d.model.userData.role=d.assignment.position==='DL'?'rusher':'defender';d.motion=athlete([d.assignment.alignX,d.assignment.alignZ]);d.p=d.motion.p;d.decision=null;d.readMemory={};d.lastReadChoice=null;d.lastReadConflict=null;place(d.model,d.p);d.model.rotation.y=Math.PI;if(['deep','zone'].includes(d.assignment.role)){const m=mesh(new THREE.CircleGeometry(d.assignment.role==='deep'?8:5,40),new THREE.MeshBasicMaterial({color:d.assignment.role==='deep'?0x7ccde0:0xf39b75,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}),d.assignment.x,.06,d.assignment.z,zoneGroup);m.rotation.x=-Math.PI/2;}});
 blockers.forEach((b,i)=>{b.userData.motion=athlete([(i-2)*1.7,-.6]);place(b,b.userData.motion.p);b.rotation.y=0;});place(qb,qpos);ball.visible=true;ball.quaternion.identity();ball.position.set(.15,1.35,-4.75);$('result').classList.remove('visible');$('snap').disabled=false;$('status').innerHTML='<i class="dot"></i>PRE-SNAP';$('field-hint').textContent='Scan the coverage. Snap the ball when you’re ready.';$('read-tip').textContent=coverages[coverage].tip;$('read-title').textContent='THE PRE-SNAP READ';document.querySelectorAll('select').forEach(s=>s.disabled=false);targetButtons.forEach(b=>b.disabled=true);syncAids();mobile.sync(phase);nameEditor.setLocked(false);}
function syncAids(){routeGroup.visible=$('show-routes').checked;zoneGroup.visible=$('show-zones').checked;$('routes-toggle').setAttribute('aria-pressed',String(routeGroup.visible));$('routes-toggle').textContent=`Routes: ${routeGroup.visible?'on':'off'}`;}
function changeCamera(){
 if(vr?.active)return;
 input.clear();keys.clear();if(document.pointerLockElement)document.exitPointerLock();
 const third=!isFirstPerson();$('camera-toggle').setAttribute('aria-pressed',String(third));$('camera-toggle').textContent=`View: ${third?'3rd':'1st'}`;
 document.body.classList.toggle('first-person',!third);
}
function toggleCamera(){$('camera-view').value=isFirstPerson()?'Third Person':'QB POV';changeCamera();}
function toggleRoutes(){$('show-routes').checked=!$('show-routes').checked;syncAids();}
function snap(){if(phase!=='ready'||gamePaused())return;phase='live';reps++;$('reps').textContent=String(reps).padStart(2,'0');$('snap').disabled=true;document.querySelectorAll('select:not(#camera-view)').forEach(s=>s.disabled=true);targetButtons.forEach(b=>b.disabled=false);$('status').innerHTML='<i class="dot"></i>PLAY LIVE';$('field-hint').textContent='Read your receivers · tap a receiver button to pass';mobile.sync(phase);nameEditor.setLocked(true);}
function finish(title,detail,complete=false){phase='done';if(complete){completions++;caughtPlayer=receivers[flight.i].model;}$('completion').textContent=passes?`${Math.round(completions/passes*100)}%`:'—';$('result-title').textContent=title;$('result-detail').textContent=detail;$('result').classList.add('visible');$('status').textContent='REP COMPLETE';$('field-hint').textContent='Reset to run it again or change the play.';targetButtons.forEach(b=>b.disabled=true);$('read-title').textContent='REP REVIEW';const read=flight?[...coverageReads].reverse().find(read=>read.receivers.includes(flight.i)&&elapsed-flight.t-read.time<1.5):null;const readNote=read?` At ${read.time.toFixed(1)}s, ${read.defender} chose ${labels[read.chosen]} while reading ${read.receivers.map(i=>labels[i]).join(' / ')}. Watch that commitment when you repeat the play.`:'';$('read-tip').textContent=detail+readNote;$('result-detail').textContent=detail+readNote;mobile.sync(phase);}
function throwBall(i){if(phase!=='live'||gamePaused())return;passes++;const r=receivers[i];const duration=Math.max(.45,Math.min(1.7,Math.hypot(r.p[0]-qpos[0],r.p[1]-qpos[1])/24));const end=predictReceiver(r.motion,r.path,duration);flight={i,start:[...qpos],end,duration,t:0};phase='flight';targetButtons.forEach(b=>b.disabled=true);$('status').textContent='BALL IN FLIGHT';mobile.sync(phase);}
function update(dt){if(gamePaused()||(phase!=='live'&&phase!=='flight'))return;elapsed+=dt;
 const stick=vr.active?vr.stick:input.stick;const strafe=(keys.has('d')?1:0)-(keys.has('a')?1:0)+stick.strafe;const forward=(keys.has('w')?1:0)-(keys.has('s')?1:0)+stick.forward;
 const direction=movementDirection(vr.active?vr.yaw:isFirstPerson()?input.look.yaw:0,strafe,forward);const moving=phase==='live'&&Math.hypot(...direction)>.02;
 if(phase==='live'){qpos=steer(qbody,[qpos[0]+direction[0]*4,qpos[1]+direction[1]*4],dt,Math.hypot(...direction)*4,18);qpos[0]=THREE.MathUtils.clamp(qpos[0],-24,24);qpos[1]=THREE.MathUtils.clamp(qpos[1],-15,-1);}
 place(qb,qpos,elapsed,moving,null,{throwProgress:phase==='flight'?Math.min(1,flight.t/.55):null});
 receivers.forEach((r,index)=>{const next=runRoute(r.motion,r.path,dt);const m=Math.hypot(next[0]-r.p[0],next[1]-r.p[1])>.001;r.p=next;place(r.model,r.p,elapsed,m,receiverFacing(r.route,r.motion,r.path,qpos),{catching:phase==='flight'&&flight.i===index&&flight.t/flight.duration>.55,catchProgress:flight?THREE.MathUtils.clamp((flight.t/flight.duration-.55)/.45,0,1):0});});
 observations.push({time:elapsed,receivers:receivers.map(r=>({p:[...r.p],v:[...r.motion.v]}))});
 while(observations.length>1&&observations[1].time<=elapsed-.18)observations.shift();
 const observed=observations[0].receivers;
 defenders.forEach((d,i)=>{
  const decision=coverageDecision(d.assignment,d.p,observed,qpos,coverage,elapsed,flight,i,d.readMemory,blockers.map(b=>[b.position.x,b.position.z]));d.decision=decision;
  if(phase==='live'&&decision.threat!==null){
   if(decision.conflict&&(d.lastReadChoice!==decision.threat||d.lastReadConflict!==[...decision.conflict].sort().join(':'))){coverageReads.push({time:elapsed,defender:d.assignment.name,chosen:decision.threat,receivers:[...decision.conflict]});if(coverageReads.length>24)coverageReads.shift();}
   d.lastReadChoice=decision.threat;
  }
  d.lastReadConflict=decision.conflict?[...decision.conflict].sort().join(':'):null;
  d.p=steer(d.motion,decision.target,dt,decision.speed,decision.acceleration);
  const faceQB=decision.state==='engaged'||['landmark','cap-deep','match-zone','midpoint','drive-under','spy'].includes(decision.state)&&Math.hypot(...d.motion.v)<4.2;
  place(d.model,d.p,elapsed,true,faceQB?Math.atan2(qpos[0]-d.p[0],qpos[1]-d.p[1]):null);
  const gaze=flight&&flight.t>.24?flight.end:decision.threat!==null?observed[decision.threat].p:qpos;const headTurn=Math.atan2(gaze[0]-d.p[0],gaze[1]-d.p[1])-d.model.rotation.y;
  aimPlayerHead(d.model,Math.atan2(Math.sin(headTurn),Math.cos(headTurn)));
  if(phase==='live'&&canSack(elapsed,d.p,qpos)){sacked=true;finish('Sacked',`The rush reached you after ${elapsed.toFixed(1)} seconds. Find your quick answer or move away from pressure.`);}
 });
 blockers.forEach((b,i)=>{const target=pocketTarget(i,elapsed,defenders.filter(d=>d.assignment.role==='rush').map(d=>d.p));const p=steer(b.userData.motion,target,dt,1.5,6);place(b,p,elapsed,true,0);});
 if(phase==='live')ball.position.set(qpos[0]+.15,1.35,qpos[1]+.25);
 if(phase==='flight'){flight.t+=dt;const t=Math.min(1,flight.t/flight.duration);ball.position.set(THREE.MathUtils.lerp(flight.start[0],flight.end[0],t),1.5+Math.sin(t*Math.PI)*Math.min(7,flight.duration*4),THREE.MathUtils.lerp(flight.start[1],flight.end[1],t));orientSpiral(ball,flight);if(t>.85){const hands=playerCatchPoint(receivers[flight.i].model,new THREE.Vector3());if(hands)ball.position.lerp(hands,THREE.MathUtils.smoothstep(t,.85,1));}
  if(t>.55&&ball.position.y<2.5&&defenders.some(d=>Math.hypot(d.p[0]-ball.position.x,d.p[1]-ball.position.z)<.75)){finish('Intercepted','A defender broke on the ball. Look for clear throwing lanes and release before the coverage closes.');}
  else if(t===1){const nearest=Math.min(...defenders.map(d=>Math.hypot(d.p[0]-flight.end[0],d.p[1]-flight.end[1])));const yards=Math.max(0,Math.round(flight.end[1]));if(nearest<1.35)finish('Pass broken up',`${labels[flight.i]} was covered at the catch point. Try a different route combination or throw earlier.`);else finish('Complete',`${labels[flight.i]} caught the pass for ${yards} yards${yards>=10?' — first down':''}. Released in ${(elapsed-flight.duration).toFixed(1)}s with ${nearest.toFixed(1)} yards of separation.`,true);}
 }
 if(phase==='live'&&elapsed>12)finish('Rep ended','The play reached the 12-second practice limit. Reset and work on making an earlier decision.');
}
let vr=null;
const gamePaused=()=>vr?.active?vr.paused:mobile.isPaused();
const isFirstPerson=()=>$('camera-view').value==='QB POV';
const input=setupFirstPerson({viewport,canvas:renderer.domElement,enabled:()=>isFirstPerson()&&!vr?.active,paused:()=>gamePaused()});
const mobile=setupMobile({viewport,labels,onThrow:throwBall,clearMovement:()=>{keys.clear();input.clear();}});
const nameEditor=setupReceiverNames({names:labels,defaults:defaultLabels,onChange:()=>{targetButtons.forEach((button,i)=>{button.textContent=labels[i];button.setAttribute('aria-label',`Throw to ${labels[i]}`);});mobile.refreshLabels();}});
vr=setupVR({renderer,scene,camera,receivers,labels,
 state:()=>({phase,quarterback:[...qpos],cameraMode:$('camera-view').value,routesVisible:routeGroup.visible,result:$('result-title').textContent}),
 actions:{snap,reset,pass:throwBall,routes:toggleRoutes,setting:field=>{if(phase!=='ready'&&phase!=='done')return;const select=$(field);select.selectedIndex=(select.selectedIndex+1)%select.options.length;reset();}},clearInput:()=>{keys.clear();input.clear();},
 onSessionChange:(active,mode)=>{if(document.pointerLockElement)document.exitPointerLock();if(active){document.querySelector('dialog')?.close();$('camera-view').value='QB POV';}else{if(mode)$('camera-view').value=mode;changeCamera();resize();sceneRevision++;}previous=performance.now();}
});
$('snap').onclick=snap;$('reset').onclick=reset;for(const [id,action] of [['snap',snap],['reset',reset]])$(id).addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!$(id).disabled){event.preventDefault();action();}});document.querySelectorAll('select:not(#camera-view)').forEach(s=>s.addEventListener('change',reset));$('camera-view').addEventListener('change',changeCamera);$('camera-toggle').onclick=toggleCamera;$('routes-toggle').onclick=toggleRoutes;$('show-routes').onchange=syncAids;$('show-zones').onchange=syncAids;
window.addEventListener('keydown',e=>{if(['SELECT','INPUT'].includes(document.activeElement?.tagName)&&e.code!=='Escape')return;const k=e.key.toLowerCase();if([' ','w','a','s','d','r','1','2','3','4','5','arrowleft','arrowright','arrowup','arrowdown','c','v'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;if(e.code==='Space')snap();if(k==='r')reset();if(k==='c')toggleCamera();if(k==='v')toggleRoutes();if(/^[1-5]$/.test(k))throwBall(Number(k)-1);});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));});
function resize(){if(renderer.xr.isPresenting)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(viewport);reset();resize();let previous=performance.now();
function frame(now,xrFrame){const dt=Math.min(.5,(now-previous)/1000)*($('slow').checked?.65:1);previous=now;const roomDelta=vr.poll(xrFrame);if(vr.active&&!vr.paused){qpos[0]+=roomDelta[0];qpos[1]+=roomDelta[1];qbody.p=qpos;}input.update(dt,keys);if(gamePaused()){if(vr.active)renderer.render(scene,camera);return;}for(let remaining=dt;remaining>0;remaining-=.02)update(Math.min(.02,remaining));if(phase==='done'&&caughtPlayer&&settleCatch(caughtPlayer,dt)){playerCatchPoint(caughtPlayer,ball.position);sceneRevision++;}if(vr.active){qb.visible=false;qbRing.visible=false;viewHands.update({visible:false,phase,time:elapsed,moving:false});ball.visible=phase==='flight'||phase==='done';vr.renderUI();renderer.render(scene,camera);return;}const mode=$('camera-view').value;const pose=cameraPose(mode,qpos,camera.aspect,input.look);qb.visible=pose.showQuarterback;qbRing.visible=pose.showQuarterback;qbRing.position.set(qpos[0],.045,qpos[1]);camera.fov=pose.fov;camera.updateProjectionMatrix();document.querySelector('.view-name').textContent=`QB CAM / ${mode.toUpperCase()}`;camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();viewHands.update({visible:!pose.showQuarterback,phase,time:elapsed,moving:qb.userData.visual.moving,throwProgress:phase==='flight'?flight.t/.55:null});ball.visible=pose.showQuarterback||phase==='flight'||phase==='done';$('clock').textContent=`${elapsed.toFixed(1)}s`;receivers.forEach((r,i)=>{const v=new THREE.Vector3(r.p[0],2.7,r.p[1]).project(camera);targetButtons[i].style.left=`${(v.x*.5+.5)*viewport.clientWidth}px`;targetButtons[i].style.top=`${(-v.y*.5+.5)*viewport.clientHeight}px`;targetButtons[i].style.display=v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1?'block':'none';});const renderState=[sceneRevision,phase,elapsed,qpos[0],qpos[1],input.look.yaw,input.look.pitch,mode,renderer.domElement.width,renderer.domElement.height,routeGroup.visible,zoneGroup.visible,visuals.environment].join('|');if(renderState!==lastRenderState){renderer.render(scene,camera);lastRenderState=renderState;}}renderer.setAnimationLoop(frame);
// Read-only state for smoke tests and future training telemetry.
window.pocketLab={getState:()=>({phase,elapsed,reps,passes,completions,vrActive:vr.active,coverageReads:coverageReads.map(read=>({...read,receivers:[...read.receivers]})),coverage,front:$('front').value,formation:$('formation').value,receivers:receivers.map(r=>({route:r.route,facing:r.model.rotation.y,velocity:[...r.motion.v],position:[...r.p],path:r.path.map(p=>[...p])})),quarterback:[...qpos],defenders:defenders.map(d=>({position:[...d.p],velocity:[...d.motion.v],role:d.assignment.role,personnel:d.assignment.position,name:d.assignment.name,alignment:[d.assignment.alignX,d.assignment.alignZ],decision:d.decision?.state,threat:d.decision?.threat,conflict:d.decision?.conflict})),defenderCount:defenders.length,sacked,blockers:blockers.map(b=>({position:[b.position.x,b.position.z],pose:{...b.userData.visual}})),visuals:{...visuals},renderStats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},quarterbackPose:{...qb.userData.visual},look:input.look,stick:input.stick,cameraMode:$('camera-view').value,routesVisible:routeGroup.visible,receiverNames:[...labels],paused:gamePaused(),passTarget:flight?labels[flight.i]:null})};
