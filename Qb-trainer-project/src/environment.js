import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export function createTurfMaterials(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  let seed = 7331;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  context.fillStyle = '#607850';
  context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 50000; i++) {
    const tone = 45 + random() * 75;
    context.strokeStyle = `rgb(${tone * .76},${tone + 20},${tone * .52})`;
    context.lineWidth = .5 + random();
    const x = random() * 512, y = random() * 512;
    context.beginPath();context.moveTo(x, y);context.lineTo(x + random() * 3 - 1.5, y - 2 - random() * 6);context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 1.5);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bump = texture.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;
  return ['#c3d6b5', '#afc4a2'].map(color => new THREE.MeshStandardMaterial({
    color, map: texture, bumpMap: bump, bumpScale: .035, roughness: .96,
  }));
}

export async function loadEnvironment(scene, renderer) {
  // Locally hosted CC0 HDRI: no provider/network dependency during play.
  const hdr = await new RGBELoader().loadAsync('/assets/environment/kiara_1_dawn_1k.hdr');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  const filtered = generator.fromEquirectangular(hdr);
  scene.background = hdr;
  scene.backgroundIntensity = .75;
  scene.backgroundRotation.y = .9;
  scene.environment = filtered.texture;
  scene.environmentIntensity = .4;
  generator.dispose();
  return { hdr, filtered };
}

export function addCrowd(scene) {
  // Two instanced draw calls for the whole crowd; no per-person animations or shadows.
  const locations = [];
  for (const side of [-1, 1]) for (let row = 0; row < 13; row++) for (let z = -43; z < 84; z += 1.6) {
    locations.push([side * (35 + row * 1.4), 2.95 + row * .7, z, side]);
  }
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(.30, .62, .26), new THREE.MeshStandardMaterial({ roughness: 1 }), locations.length);
  const heads = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.13), new THREE.MeshStandardMaterial({ roughness: 1 }), locations.length);
  const matrix = new THREE.Matrix4();
  const palette = ['#d2c7ac', '#25473e', '#823d31', '#2c4055', '#a4b0b0', '#777268'];
  const skin = ['#a27656', '#654636', '#b78c6b', '#8a6249'];
  locations.forEach(([x, y, z], index) => {
    matrix.makeTranslation(x, y, z);bodies.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, y + .43, z);heads.setMatrixAt(index, matrix);
    bodies.setColorAt(index, new THREE.Color(palette[(index * 13 + Math.floor(index / 17)) % palette.length]));
    heads.setColorAt(index, new THREE.Color(skin[index % skin.length]));
  });
  scene.add(bodies, heads);
  return locations.length;
}
