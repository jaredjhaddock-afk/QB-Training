import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:568,height:320}:{width:1100,height:800},hasTouch:mobile,isMobile:mobile});page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.pocketLab?.getState().visuals.environment==='ready');
  const state=()=>page.evaluate(()=>window.pocketLab.getState());
  const press=async id=>{if(mobile)await page.locator(id).tap();else await page.locator(id).click();};
  await press('#camera-toggle');assert.equal((await state()).cameraMode,'Third Person');
  await press('#routes-toggle');assert.equal((await state()).routesVisible,false);assert.equal(await page.locator('#show-routes').isChecked(),false);
  if(mobile){
   const boxes=await Promise.all(['#camera-toggle','#routes-toggle','#playbook-open','#fullscreen-toggle'].map(id=>page.locator(id).boundingBox()));
   for(const a of boxes){assert.ok(a.height>=44);for(const b of boxes)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
   await page.screenshot({path:'/workspace/pocket-lab-third-person.png'});
  }
  await press('#snap');await page.waitForFunction(()=>window.pocketLab.getState().elapsed>.1);
  const before=await state();await press('#camera-toggle');await press('#routes-toggle');
  const after=await state();assert.equal(after.cameraMode,'QB POV');assert.equal(after.routesVisible,true);assert.equal(after.reps,before.reps);assert.ok(after.elapsed>=before.elapsed);assert.notEqual(after.phase,'ready');
  assert.equal(await page.locator('#camera-view').isEnabled(),true);
  await page.keyboard.press('c');assert.equal((await state()).cameraMode,'Third Person');await page.keyboard.press('v');assert.equal((await state()).routesVisible,false);
  await page.keyboard.press('r');assert.equal((await state()).routesVisible,false);assert.equal((await state()).cameraMode,'Third Person');
  assert.deepEqual(errors,[]);console.log(`PASS ${mobile?'mobile':'desktop'}: camera/routes switch during reps without reset; synchronized controls, shortcuts, and retained settings.`);await page.close();
 }
}finally{await browser.close();}
