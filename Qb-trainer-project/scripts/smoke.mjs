import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser exception:',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('Browser console:',m.text());});
try {
 console.log('Opening game');await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });await page.waitForFunction(()=>window.pocketLab);
 const state=()=>page.evaluate(()=>window.pocketLab.getState());
 assert.equal((await state()).defenderCount,11);console.log('Game loaded');
 for(const coverage of ['Cover 1','Cover 2 Man','Cover 2 Zone','Cover 3','Cover 3 Spy','Cover 4','Cover 0 Blitz']){await page.selectOption('#coverage',coverage);assert.equal((await state()).coverage,coverage);}
 console.log('Coverage options verified');await page.selectOption('#formation','Gun Trips Right');await page.selectOption('#route-2','Corner');assert.equal((await state()).formation,'Gun Trips Right');
 await page.selectOption('#coverage','Cover 3');await page.locator('#show-zones').check();
 const field=await page.locator('canvas').boundingBox();await page.mouse.click(field.x+field.width/2,field.y+field.height/2);await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('canvas'));await page.mouse.move(field.x+field.width/2+40,field.y+field.height/2);await page.waitForFunction(()=>Math.abs(window.pocketLab.getState().look.yaw)>.001);await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);await page.keyboard.press('r');console.log('Mouse capture and look verified');
 console.log('Testing movement and pass');await page.locator('#snap').click();await page.waitForTimeout(250);assert.equal((await state()).phase,'live');
 await page.keyboard.down('d');await page.waitForFunction(()=>window.pocketLab.getState().quarterback[0]!==0,{},{timeout:15000});await page.keyboard.up('d');assert.notEqual((await state()).quarterback[0],0);
 await page.keyboard.press('3');assert.equal((await state()).phase,'flight');
 await page.waitForFunction(()=>window.pocketLab.getState().phase==='done',{},{timeout:10000});assert.equal((await state()).passes,1);assert.ok(await page.locator('#result-title').textContent());
 console.log('Pass resolved');await page.keyboard.press('r');assert.equal((await state()).phase,'ready');assert.equal((await state()).elapsed,0);
 await page.locator('#snap').click();await page.waitForFunction(()=>window.pocketLab.getState().phase==='done',{},{timeout:60000});assert.equal((await state()).sacked,true);
 await page.locator('#reset').click();await page.selectOption('#formation','Gun Doubles');await page.locator('#show-zones').uncheck();
 console.log('Sack and reset verified');await page.screenshot({path:'/workspace/pocket-lab-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/workspace/pocket-lab-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 7 coverages, formation/hot-route changes, snap, keyboard movement and throw, pass outcome, reset, sack, responsive layout, and no browser exceptions.');
}catch(error){console.error('State at failure:',await page.evaluate(()=>window.pocketLab?.getState()).catch(()=>null));throw error;}finally{await browser.close();}
