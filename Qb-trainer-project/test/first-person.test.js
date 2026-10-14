import test from 'node:test';
import assert from 'node:assert/strict';
import { changeLook, movementDirection, DEFAULT_LOOK } from '../src/first-person.js';
import { cameraPose } from '../src/camera.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('First-person view turns at eye level without moving the quarterback or camera origin', () => {
  const original = cameraPose('QB POV', [3, -5], 2.2, DEFAULT_LOOK);
  const rotated = cameraPose('QB POV', [3, -5], 2.2, { yaw: Math.PI / 2, pitch: .3 });
  assert.deepEqual(original.position, rotated.position);
  assert.equal(rotated.showQuarterback, false);
  assert.ok(rotated.target[0] < rotated.position[0]);
  assert.ok(rotated.target[1] > rotated.position[1]);
});
test('Movement follows viewing direction and diagonal input has no speed advantage', () => {
  assert.deepEqual(movementDirection(0, 0, 1), [-0, 1]);
  const facingRight = movementDirection(Math.PI / 2, 0, 1);
  close(facingRight[0], -1);close(facingRight[1], 0);
  const strafe = movementDirection(Math.PI / 2, 1, 0);
  close(strafe[0], 0);close(strafe[1], -1);
  close(Math.hypot(...movementDirection(.7, 1, 1)), 1);
  close(Math.hypot(...movementDirection(0, .2, 0)), .2);
});
test('Looking clamps pitch without flipping over and wraps yaw for long sessions', () => {
  const up = changeLook(DEFAULT_LOOK, 1000000, -100000);
  assert.equal(up.pitch, 1.12);
  assert.ok(Math.abs(up.yaw) <= Math.PI);
  assert.equal(changeLook(DEFAULT_LOOK, 0, 100000).pitch, -1.12);
  assert.deepEqual(DEFAULT_LOOK, { yaw: 0, pitch: -.06 });
});
