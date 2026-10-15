import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:700}});
page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.route('**/model-check',route=>route.fulfill({contentType:'text/html',body:'<body style="margin:0"><script type="module"></script></body>'}));
  await page.goto('http://127.0.0.1:5173/model-check');
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {loadPlayerAsset,attachPlayerAsset,animateAsset,playerCatchPoint}=await import('/src/player-asset.js');
    const asset=await loadPlayerAsset();
    const scene=new THREE.Scene();scene.background=new THREE.Color('#9eafb8');
    scene.add(new THREE.HemisphereLight(0xffffff,0x4c5841,2));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1000,700);renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
    const camera=new THREE.PerspectiveCamera(40,1000/700,.01,30);camera.position.set(3,2.5,5);camera.lookAt(0,1,0);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#466b36'}));floor.rotation.x=-Math.PI/2;scene.add(floor);
    const players=[true,false].map((offense,i)=>{
      const player=new THREE.Group();player.userData.role='receiver';player.position.x=i?1:-1;
      attachPlayerAsset(player,asset,offense);scene.add(player);return player;
    });
    renderer.render(scene,camera);
    const data={scene,renderer,camera,players,animateAsset,playerCatchPoint};window.modelCheck=data;
    const size=new THREE.Box3().setFromObject(players[0].userData.asset.model.getObjectByName('Player')).getSize(new THREE.Vector3());
    const first=players[0].userData.asset.model.getObjectByName('Hips'),second=players[1].userData.asset.model.getObjectByName('Hips');
    const neutral=second.position.clone();
    players[0].userData.locomotion={speed:7/.9144};animateAsset(players[0],.2,true);
    const independent=second.position.equals(neutral)&&first!==second;
    let horizontalStable=true;
    for(let i=0;i<=10;i++){
      animateAsset(players[0],.3+i*.05,true,{catching:true,catchProgress:i/10});
      horizontalStable&&=Math.abs(first.position.x-asset.scene.getObjectByName('Hips').position.x)<.001&&Math.abs(first.position.z-asset.scene.getObjectByName('Hips').position.z)<.001;
    }
    animateAsset(players[0],0,false);renderer.render(scene,camera);
    return {height:size.y,independent,horizontalStable,hidden:players.every(p=>!p.userData.asset.model.getObjectByName('Football').visible),clips:asset.clips.map(c=>c.name)};
  });
  assert.ok(result.height>1.9&&result.height<2.2,JSON.stringify(result));
  assert.ok(result.independent);assert.ok(result.horizontalStable);assert.ok(result.hidden);
  assert.deepEqual(result.clips.sort(),['Catch','Idle','Run']);
  await page.screenshot({path:'/workspace/pocket-lab-player-uniforms.png'});
  await page.evaluate(()=>{const d=modelCheck;d.players.forEach(p=>{p.userData.locomotion={speed:7/.9144};d.animateAsset(p,.2,true);});d.renderer.render(d.scene,d.camera);});
  await page.screenshot({path:'/workspace/pocket-lab-player-run.png'});
  await page.evaluate(()=>{const d=modelCheck;for(let i=0;i<=10;i++)d.players.forEach(p=>d.animateAsset(p,.3+i*.05,true,{catching:true,catchProgress:i/10}));d.renderer.render(d.scene,d.camera);});
  await page.screenshot({path:'/workspace/pocket-lab-player-catch.png'});
  const landing=await page.evaluate(async()=>{
    const {settleCatch}=await import('/src/player-asset.js');
    const d=modelCheck,player=d.players[0],start=player.position.clone();
    for(let i=0;i<120;i++)settleCatch(player,1/60);
    const point=d.playerCatchPoint(player,player.position.clone());
    return {stopped:!settleCatch(player,1/60),stationary:player.position.equals(start),finite:point.toArray().every(Number.isFinite)};
  });
  assert.ok(landing.stopped&&landing.stationary&&landing.finite);
  await page.evaluate(()=>{const d=modelCheck;d.players.forEach(p=>{p.userData.role='blocker';p.userData.locomotion={speed:0};d.animateAsset(p,0,false);});d.renderer.render(d.scene,d.camera);});
  await page.screenshot({path:'/workspace/pocket-lab-three-point.png'});
  await page.evaluate(()=>{const d=modelCheck;d.players.forEach(p=>d.animateAsset(p,1,false));d.renderer.render(d.scene,d.camera);});
  await page.screenshot({path:'/workspace/pocket-lab-blocking.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: actual GLB loads, correct yard scale, independent cloned skeletons, in-place catch, hidden embedded football, and Idle/Run/Catch rendering.');
} finally { await browser.close(); }
