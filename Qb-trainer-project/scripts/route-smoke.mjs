import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:430},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.pocketLab?.getState().visuals.environment==='ready');
 await page.locator('#playbook-open').tap();await page.selectOption('#route-0','Post');
 assert.equal(await page.evaluate(()=>window.pocketLab.getState().receivers[0].path[1][1]),7);
 const selected=['Spot','Slant (3 yd)','Slant (1 yd)','Out (5 yd)','Out (10 yd)'];
 for(let i=0;i<5;i++)await page.selectOption(`#route-${i}`,selected[i]);
 await page.selectOption('#camera-view','Third Person');await page.locator('#playbook-close').tap();
 const initial=await page.evaluate(()=>window.pocketLab.getState());assert.deepEqual(initial.receivers.map(r=>r.route),selected);
 await page.screenshot({path:'/workspace/pocket-lab-updated-routes.png'});
 await page.locator('#snap').tap();await page.waitForFunction(()=>{
  const state=window.pocketLab.getState(),r=state.receivers[0];
  const facing=Math.atan2(state.quarterback[0]-r.position[0],state.quarterback[1]-r.position[1]);
  const angle=Math.atan2(Math.sin(r.facing-facing),Math.cos(r.facing-facing));
  return state.elapsed>2&&Math.hypot(...r.velocity)<.1&&Math.abs(angle)<.1;
 });
 assert.equal((await page.evaluate(()=>window.pocketLab.getState())).phase,'live');
 await page.locator('[data-receiver="X"]').tap();await page.waitForFunction(()=>window.pocketLab.getState().phase==='done');
 await page.locator('#reset').tap();const reset=await page.evaluate(()=>window.pocketLab.getState());assert.deepEqual(reset.receivers.map(r=>r.route),selected);assert.deepEqual(reset.receivers.map(r=>r.path),initial.receivers.map(r=>r.path));assert.deepEqual(errors,[]);
 console.log('PASS: route menu selections and paths, Spot stops and turns toward QB in a live rep, passing, reset, and no browser exceptions.');
}finally{await browser.close();}
