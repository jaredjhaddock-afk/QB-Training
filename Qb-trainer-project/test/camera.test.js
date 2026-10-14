import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraPose } from '../src/camera.js';

test('QB follow frames the quarterback in the lower center and keeps both starting wideouts visible', () => {
  for (const aspect of [844 / 390, 960 / 388, 568 / 320, 1.4]) {
    const pose = cameraPose('QB Follow', [0, -5], aspect);
    const camera = new PerspectiveCamera(pose.fov, aspect, .1, 350);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const feet = new Vector3(0, 0, -5).project(camera);
    const helmet = new Vector3(0, 2.02, -5).project(camera);
    assert.ok(Math.abs(feet.x) < .001);
    assert.ok(feet.y < -.2 && feet.y > -.85);
    assert.ok(helmet.y > feet.y);
    for (const x of [-22, 22]) assert.ok(Math.abs(new Vector3(x, 1, 0).project(camera).x) < 1);
  }
});
test('QB follow moves with the quarterback and helmet mode hides the model', () => {
  const a = cameraPose('QB Follow', [0, -5], 2.2);
  const b = cameraPose('QB Follow', [4, -8], 2.2);
  assert.equal(b.position[0] - a.position[0], 4);
  assert.equal(b.position[2] - a.position[2], -3);
  assert.equal(b.target[0], 4);
  assert.equal(cameraPose('Helmet POV', [0, -5], 2.2).showQuarterback, false);
  assert.ok(cameraPose('Wide QB', [0, -5], 2.2).position[1] > a.position[1]);
});
