import test from 'node:test';
import assert from 'node:assert/strict';
import { deadzone, readVRControls, aimedReceiver } from '../src/vr-input.js';
import { formations } from '../src/football.js';
const controller=handedness=>({handedness,targetRayMode:'tracked-pointer',gamepad:{mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false}))}});
test('VR thumbsticks have a dead zone and left movement stays separate from right turning',()=>{
 assert.equal(deadzone(.1),0);assert.equal(deadzone(undefined),0);
 const left=controller('left'),right=controller('right');left.gamepad.axes[2]=1;left.gamepad.axes[3]=-1;right.gamepad.axes[2]=1;
 const {controls}=readVRControls([right,left]);assert.equal(controls.strafe,1);assert.equal(controls.forward,1);assert.equal(controls.turn,1);
 assert.equal(readVRControls([]).controls.forward,0);
});
test('VR buttons and snap turns fire once per press, rearm after release, and clear on disconnect',()=>{
 const source=controller('right');source.gamepad.buttons[4].pressed=true;source.gamepad.buttons[5].pressed=true;source.gamepad.axes[2]=1;
 const first=readVRControls([source]);assert.equal(first.controls.snap,true);assert.equal(first.controls.reset,true);assert.equal(first.controls.turn,1);
 const held=readVRControls([source],first.previous);assert.equal(held.controls.snap,false);assert.equal(held.controls.turn,0);
 source.gamepad.axes[2]=0;source.gamepad.buttons[4].pressed=false;const released=readVRControls([source],held.previous);
 source.gamepad.axes[2]=-1;source.gamepad.buttons[4].pressed=true;const again=readVRControls([source],released.previous);assert.equal(again.controls.turn,-1);assert.equal(again.controls.snap,true);
 assert.equal(readVRControls([],again.previous).previous.size,0);
});
test('Trips LT and RT have mirrored three-receiver sides from the QB perspective',()=>{
 const lt=formations['Trips LT'],rt=formations['Trips RT'];
 // With the QB looking toward +Z, +X is the offense's left.
 assert.equal(lt.slice(0,4).filter(p=>p[0]>0).length,3);assert.equal(lt.slice(0,4).filter(p=>p[0]<0).length,1);
 assert.equal(rt.slice(0,4).filter(p=>p[0]<0).length,3);assert.equal(rt.slice(0,4).filter(p=>p[0]>0).length,1);
 assert.equal(lt[4][1],-5);assert.equal(rt[4][1],-5);
 assert.deepEqual(lt.map(p=>[-p[0],p[1]]).sort((a,b)=>a[0]-b[0]),[...rt].sort((a,b)=>a[0]-b[0]));
});

test('Point-and-trigger targeting tolerates near misses, picks the closest direction and rejects empty/behind aim',()=>{
 const origin=[0,1.7,0],receivers=[[0,20],[5,20],[-5,20]];
 assert.equal(aimedReceiver(origin,[.05,0,1],receivers),0);
 assert.equal(aimedReceiver(origin,[.25,0,1],receivers),1);
 assert.equal(aimedReceiver(origin,[-.25,0,1],receivers),2);
 assert.equal(aimedReceiver(origin,[1,0,0],receivers),null);
 assert.equal(aimedReceiver(origin,[0,0,-1],receivers),null);
 assert.equal(aimedReceiver(origin,[0,0,0],receivers),null);
});
