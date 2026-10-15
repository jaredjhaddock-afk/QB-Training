import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachPlayerAsset, animateAsset, inPlaceClips, aimPlayerHead } from '../src/player-asset.js';

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

test('lineman stance and blocking poses stay stable through repeated samples and resets',()=>{
 for(const role of ['blocker','rusher']){
  const subject=player(role);
  for(const time of [0,1,4,0]){
   animateAsset(subject,time,false);
   const bones=subject.userData.asset.poseBones.map(({bone})=>({bone,q:bone.quaternion.clone().normalize(),p:bone.position.clone()}));
   for(let frame=0;frame<120;frame++){
    animateAsset(subject,time,false);
    for(const {bone,q,p} of bones){assert.ok(bone.quaternion.clone().normalize().angleTo(q)<1e-6);assert.ok(bone.position.distanceTo(p)<1e-6);}
   }
  }
 }
});

test('three-point stance lowers the helmet and places a hand on the turf',()=>{
 const subject=player('blocker'),model=subject.userData.asset.model;
 subject.updateMatrixWorld(true);
 const point=name=>model.getObjectByName(name).getWorldPosition(new THREE.Vector3());
 assert.ok(point('Head').y<1.6,`helmet ${point('Head').y}`);
 assert.ok(point('RightHand').y<.18,`hand ${point('RightHand').y}`);
 for(const side of ['Left','Right'])assert.ok(point(`${side}Foot`).y>.04);
 animateAsset(subject,1,false);subject.updateMatrixWorld(true);
 assert.ok(point('RightHand').y>.8,'hands rise to block after the snap');
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


test('defender head tracking does not accumulate rotations between animation samples',()=>{
 const subject=player('defender'),reference=player('receiver');
 for(let frame=0;frame<600;frame++){
  animateAsset(subject,frame/60,false);animateAsset(reference,frame/60,false);
  const angle=frame%120<60?.5:-.5;aimPlayerHead(subject,angle);
  const actual=subject.userData.asset.model.getObjectByName('Head').quaternion.clone().normalize();
  const expected=reference.userData.asset.model.getObjectByName('Head').quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle)).normalize();
  assert.ok(actual.angleTo(expected)<1e-6);
 }
});
