import * as THREE from 'three';

// World-space ribbons keep their width in both stereo eyes and on mobile,
// where WebGL line widths are often limited to a single pixel.
export function createRouteRibbon(points, width = .22) {
  const vertices = [], radius = width / 2, height = .085;
  const vertex = ([x, z]) => vertices.push(x, height, z);
  const triangle = (a, b, c) => [a, b, c].forEach(vertex);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < .001) continue;
    const x = -dz / length * radius, z = dx / length * radius;
    const p = [a[0]+x,a[1]+z], q = [a[0]-x,a[1]-z];
    const r = [b[0]+x,b[1]+z], s = [b[0]-x,b[1]-z];
    triangle(p,q,r);triangle(q,s,r);
  }
  for (const p of points) {
    for (let i = 0; i < 12; i++) {
      const edge = angle => [p[0]+Math.cos(angle)*radius,p[1]+Math.sin(angle)*radius];
      triangle(p,edge(i*Math.PI/6),edge((i+1)*Math.PI/6));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xd6f56c,side:THREE.DoubleSide}));
}
