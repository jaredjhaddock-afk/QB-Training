import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true,isMobile:true});
page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.pocketLab?.getState().visuals.environment==='ready');
 for(const coverage of ['Cover 2 Zone','Cover 3 Spy','Cover 2 Man']){
  await page.locator('#playbook-open').tap();
  await page.selectOption('#coverage',coverage);
  await page.selectOption('#camera-view','Wide QB');
  await page.locator('#playbook-close').tap();await page.locator('#snap').tap();
  await page.waitForFunction(()=>window.pocketLab.getState().elapsed>.8);
  const state=await page.evaluate(()=>window.pocketLab.getState());
  assert.equal(state.coverage,coverage);assert.equal(state.defenders.length,11);
  assert.ok(state.defenders.every(d=>d.position.every(Number.isFinite)&&Math.hypot(...d.velocity)<=5.91));
  if(coverage==='Cover 3 Spy')assert.ok(state.defenders.some(d=>d.decision==='spy'));
  if(coverage==='Cover 2 Man')assert.equal(state.defenders.filter(d=>d.decision==='trail').length,5);
  if(coverage==='Cover 2 Zone')assert.ok(state.defenders.some(d=>['match-zone','midpoint'].includes(d.decision)));
  await page.locator('[data-receiver="R"]').tap();
  await page.waitForFunction(()=>window.pocketLab.getState().phase==='done');
  await page.locator('#reset').tap();
  console.log(`${coverage}: live decisions, bounded movement, pass and reset verified`);
 }
 await page.locator('#playbook-open').tap();await page.selectOption('#camera-view','QB POV');await page.locator('#playbook-close').tap();
 await page.screenshot({path:'/workspace/pocket-lab-movement-upgrade.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: coverage behaviors integrate into complete reps without browser exceptions.');
}finally{await browser.close();}
