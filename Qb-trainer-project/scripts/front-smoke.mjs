import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:430},hasTouch:true,isMobile:true});page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.pocketLab?.getState().visuals.environment==='ready');
 for(const [front,counts] of [['4–4',[4,4,3]],['Nickel 4–2–5',[4,2,5]],['Dime 4–1–6',[4,1,6]],['3–4 Odd',[3,4,4]]]){
  await page.locator('#playbook-open').tap();await page.selectOption('#front',front);await page.selectOption('#camera-view','Third Person');await page.locator('#playbook-close').tap();
  const initial=await page.evaluate(()=>window.pocketLab.getState());assert.equal(initial.front,front);
  assert.deepEqual(['DL','LB','DB'].map(type=>initial.defenders.filter(d=>d.personnel===type).length),counts);
  assert.ok(initial.defenders.filter(d=>d.personnel==='LB').every(d=>d.position[1]===4.5||(front==='3–4 Odd'&&d.name==='LB4'&&d.position[1]===1.25)));
  if(front==='4–4')await page.screenshot({path:'/workspace/pocket-lab-44-alignment.png'});
  await page.locator('#snap').tap();await page.waitForFunction(()=>window.pocketLab.getState().elapsed>.5);
  const live=await page.evaluate(()=>window.pocketLab.getState());assert.ok(live.defenders.every(d=>d.position.every(Number.isFinite)));assert.ok(live.defenders.some(d=>Math.hypot(d.position[0]-d.alignment[0],d.position[1]-d.alignment[1])>.1));
  await page.locator('[data-receiver="R"]').tap();await page.waitForFunction(()=>window.pocketLab.getState().phase==='done');await page.locator('#reset').tap();
  assert.equal((await page.evaluate(()=>window.pocketLab.getState())).front,front);
  console.log(`PASS ${front}: personnel, pre-snap depth, coverage movement, pass, and reset.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
