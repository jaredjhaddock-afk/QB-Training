import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachPlayerAsset, animateAsset, inPlaceClips } from '../src/player-asset.js';

// Exercise the actual uploaded rig and clips without browser-only texture loading.
if (!globalThis.ProgressEvent) globalThis.ProgressEvent = class ProgressEvent {};
const bytes = await readFile(new URL('../public/assets/players/football_player_realistic.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20,20+jsonLength));
json.buffers[0].uri = 'data:application/octet-stream;base64,' + bytes.subarray(28+jsonLength).toString('base64');
json.materials = json.materials.map(() => ({}));delete json.images;delete json.textures;
const gltf = await new GLTFLoader().parseAsync(JSON.stringify(json),'');
const asset = {scene:gltf.scene,clips:inPlaceClips(gltf.animations,gltf.scene.getObjectByName('Hips').position),materials:[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()]};
function player(role) {
  const root = new THREE.Group();root.userData.role=role;
  attachPlayerAsset(root,asset,true);return root;
}
const offset = angle => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle);
function matchesPose(subject,reference,name,angle) {
  const actual=subject.userData.asset.model.getObjectByName(name).quaternion;
  const expected=reference.userData.asset.model.getObjectByName(name).quaternion.clone().multiply(offset(angle));
  assert.ok(actual.clone().normalize().angleTo(expected.normalize())<1e-6,`${name} drifted from its animated pose`);
}

test('actual lineman rig holds one blocking offset through full reps, resets and run transitions',()=>{
  for (const role of ['blocker','rusher']) {
    const subject=player(role),reference=player('receiver');
    for(let rep=0;rep<3;rep++) {
      for(let frame=0;frame<=720;frame++) {
        const running=frame>240&&frame<360;
        for(const p of [subject,reference]) {
          p.userData.locomotion={speed:running?5:0};
          animateAsset(p,frame/60,running);
        }
        matchesPose(subject,reference,'Spine02',running?0:.25);
        matchesPose(subject,reference,'LeftArm',running?0:-.55);
        matchesPose(subject,reference,'RightArm',running?0:-.55);
      }
    }
  }
});

test('throw offsets do not accumulate and disappear when the throw ends',()=>{
  const subject=player('quarterback'),reference=player('receiver');
  for(let frame=0;frame<=240;frame++) {
    const throwing=frame>0&&frame<180;
    animateAsset(subject,frame/60,false,{throwProgress:throwing?.5:null});
    animateAsset(reference,frame/60,false);
    matchesPose(subject,reference,'RightArm',throwing?-.2:0);
    matchesPose(subject,reference,'RightForeArm',throwing?-.45:0);
  }
});
