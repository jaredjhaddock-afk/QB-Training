import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:800,height:600}});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
await page.addInitScript({content:await readFile('node_modules/iwer/build/iwer.js','utf8')+`\nwindow.xrDevice=new IWER.XRDevice(IWER.metaQuest3,{stereoEnabled:true});xrDevice.installRuntime({forceInstall:true});xrDevice.position.set(0,1.65,0);`});
async function toolbar(x,y){
 await page.evaluate(()=>xrDevice.controllers.right.updateButtonValue('trigger',0));
 await page.evaluate(()=>new Promise(resolve=>xrDevice.activeSession?xrDevice.activeSession.requestAnimationFrame(()=>resolve()):resolve()));
 await page.evaluate(async({x,y})=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),c=xrDevice.controllers.right;
  c.position.set(.2,1.3,-.3);
  const target=new THREE.Vector3(x*.9144,1.65+y*.9144,-2.8*.9144);
  c.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),target.sub(new THREE.Vector3(.2,1.3,-.3)).normalize()));
  c.updateButtonValue('trigger',1);
 },{x,y});
 await page.evaluate(()=>new Promise(resolve=>xrDevice.activeSession?xrDevice.activeSession.requestAnimationFrame(()=>resolve()):resolve()));
}
try{
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.pocketLab?.getState().visuals.environment==='ready'&&window.pocketLab.getState().visuals.playerModel==='realistic-glb');
 for(const name of ['Trips LT','Trips RT']){await page.selectOption('#formation',name);assert.equal((await page.evaluate(()=>pocketLab.getState())).formation,name);}
 await page.locator('#enter-vr').click();await page.waitForFunction(()=>pocketLab.getState().vrActive);console.log('Emulated Quest session entered');
 await page.waitForTimeout(500);
 await toolbar(.52,-.99);await toolbar(0,1.05);
 await page.waitForFunction(()=>pocketLab.getState().formation==='Singleback');await toolbar(.52,-.99);
 await toolbar(0,-.99);await page.waitForFunction(()=>!pocketLab.getState().routesVisible);
 console.log('Floating toolbar playbook and route toggle verified');
 await page.evaluate(()=>xrDevice.controllers.right.updateButtonValue('trigger',0));
 await page.evaluate(()=>xrDevice.controllers.right.updateButtonValue('a-button',1));await page.waitForFunction(()=>pocketLab.getState().phase==='live');
 await page.evaluate(()=>{xrDevice.controllers.right.updateButtonValue('a-button',0);xrDevice.controllers.left.updateAxes('thumbstick',.5,0);});
 await page.waitForFunction(()=>Math.abs(pocketLab.getState().quarterback[0])>.05);
 await page.evaluate(()=>{xrDevice.controllers.left.updateAxes('thumbstick',0,0);xrDevice.updateVisibilityState('visible-blurred');});
 await page.waitForFunction(()=>pocketLab.getState().paused);
 const pausedTime=await page.evaluate(()=>pocketLab.getState().elapsed);await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>pocketLab.getState().elapsed),pausedTime);
 await page.evaluate(()=>xrDevice.updateVisibilityState('visible'));await page.waitForFunction(()=>!pocketLab.getState().paused);
 console.log('Headset visibility pause/resume verified');
 // Reset and snap a fresh rep, then aim the emulated right controller at the back.
 await page.evaluate(()=>xrDevice.controllers.right.updateButtonValue('b-button',1));await page.waitForFunction(()=>pocketLab.getState().phase==='ready');
 await page.evaluate(()=>{xrDevice.controllers.right.updateButtonValue('b-button',0);xrDevice.controllers.right.updateButtonValue('a-button',1);});await page.waitForFunction(()=>pocketLab.getState().phase==='live');
 await page.evaluate(async()=>{
  xrDevice.controllers.right.updateButtonValue('a-button',0);
  const THREE=await import('/node_modules/three/build/three.module.js');
  const s=pocketLab.getState(),r=s.receivers[4].position,c=xrDevice.controllers.right;
  c.position.set(.2,1.3,-.3);
  const target=new THREE.Vector3(-(r[0]-s.quarterback[0])*.9144,1.7*.9144,-(r[1]-s.quarterback[1])*.9144);
  const direction=target.sub(new THREE.Vector3(c.position.x,c.position.y,c.position.z)).normalize();
  c.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),direction));c.updateButtonValue('trigger',1);
 });
 await page.waitForFunction(()=>pocketLab.getState().passes>0);console.log('Controller snap, locomotion, reset and ray-trigger passing verified');
 await page.evaluate(()=>xrDevice.controllers.right.updateButtonValue('trigger',0));
 await page.waitForFunction(()=>pocketLab.getState().phase==='done');
 await page.screenshot({path:'/workspace/pocket-lab-vr-emulated.png'});
 await toolbar(1.04,-.99);await page.waitForFunction(()=>!pocketLab.getState().vrActive);
 await page.locator('#reset').click();await page.locator('#snap').click();await page.waitForFunction(()=>pocketLab.getState().phase==='live');
 assert.deepEqual(errors,[]);console.log('PASS: emulated stereo WebXR session, controller input, targeted pass, result, exit and desktop recovery. Hardware comfort/performance is not tested.');
}catch(error){console.error(await page.evaluate(()=>pocketLab?.getState()).catch(()=>null));throw error;}finally{await browser.close();}
