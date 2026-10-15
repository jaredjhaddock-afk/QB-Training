import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.pocketLab?.getState().visuals.playerModel==='realistic-glb');
 await page.locator('#playbook-open').tap();await page.selectOption('#coverage','Cover 0 Blitz');await page.locator('#playbook-close').tap();
 await page.screenshot({path:'/workspace/pocket-lab-presnap-pocket.png'});
 await page.evaluate(()=>{window.pocketSamples=[];function sample(){const s=pocketLab.getState();pocketSamples.push({time:s.elapsed,sacked:s.sacked,phase:s.phase});if(s.phase!=='done')requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 await page.locator('#snap').tap();await page.waitForFunction(()=>pocketLab.getState().elapsed>=1);
 const live=await page.evaluate(()=>pocketLab.getState());
 assert.ok(live.blockers[0].position[1]<live.blockers[2].position[1]-.1);
 assert.ok(live.blockers[4].position[1]<live.blockers[2].position[1]-.1);
 await page.waitForFunction(()=>pocketLab.getState().phase==='done');
 const result=await page.evaluate(()=>({state:pocketLab.getState(),samples:pocketSamples}));
 assert.equal(result.state.sacked,true);assert.ok(result.state.elapsed>=4);
 assert.ok(result.samples.some(s=>s.time>1&&s.time<4&&!s.sacked));
 assert.ok(result.samples.every(s=>!s.sacked||s.time>=4));
 await page.locator('#reset').tap();const reset=await page.evaluate(()=>pocketLab.getState());
 assert.equal(reset.elapsed,0);assert.deepEqual(reset.coverageReads,[]);
 assert.ok(reset.blockers.every(b=>b.position[1]===-.6));
 assert.deepEqual(errors,[]);console.log(`PASS: pocket sets, no early sack, blitz sack at ${result.state.elapsed.toFixed(2)}s, reset and no browser exceptions.`);
}finally{await browser.close();}
