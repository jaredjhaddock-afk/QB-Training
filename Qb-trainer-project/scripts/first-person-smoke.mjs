import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.pocketLab?.getState().visuals.environment === 'ready' && window.pocketLab.getState().visuals.playerModel === 'realistic-glb', {}, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.pocketLab.getState().cameraMode), 'QB POV');
}
try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await ready(desktop);
  const initial = await desktop.evaluate(() => window.pocketLab.getState());
  const field = await desktop.locator('canvas').boundingBox();
  const center = { x: field.x + field.width / 2, y: field.y + field.height / 2 };
  // Exercise drag fallback as well as the keyboard movement/look separation.
  await desktop.evaluate(() => { document.querySelector('canvas').requestPointerLock = undefined; });
  await desktop.mouse.move(center.x, center.y);
  await desktop.mouse.down();
  await desktop.mouse.move(center.x + 140, center.y - 35, { steps: 4 });
  await desktop.mouse.up();
  const turned = await desktop.evaluate(() => window.pocketLab.getState());
  assert.ok(turned.look.yaw > initial.look.yaw + .2);
  assert.ok(turned.look.pitch > initial.look.pitch);
  assert.deepEqual(turned.quarterback, initial.quarterback);
  await desktop.locator('#slow').check();
  await desktop.locator('#snap').click();
  await desktop.keyboard.down('w');
  await desktop.waitForFunction(() => window.pocketLab.getState().quarterback[0] < -.02);
  await desktop.keyboard.up('w');
  const moved = await desktop.evaluate(() => window.pocketLab.getState());
  assert.ok(moved.quarterback[1] > initial.quarterback[1]);
  assert.equal(moved.look.yaw, turned.look.yaw);
  await desktop.keyboard.press('5');
  await desktop.waitForFunction(() => window.pocketLab.getState().phase === 'done', {}, { timeout: 60000 });
  await desktop.keyboard.press('r');
  assert.equal((await desktop.evaluate(() => window.pocketLab.getState())).look.yaw, 0);
  console.log('Desktop: look changes independently; WASD follows facing direction; passing and reset work');
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ready(mobile);
  await mobile.locator('#playbook-open').tap();
  await mobile.locator('#slow').check();
  await mobile.locator('#playbook-close').tap();
  await mobile.locator('#snap').tap();
  const pad = await mobile.locator('#move-stick').boundingBox();
  const centerX = pad.x + pad.width / 2, centerY = pad.y + pad.height / 2;
  const cdp = await mobile.context().newCDPSession(mobile);
  const touch = (x, y, id) => ({ x, y, id, radiusX: 3, radiusY: 3, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(centerX, centerY, 1)] });
  const moveFinger = touch(centerX + 24, centerY - 12, 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moveFinger] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moveFinger, touch(620, 180, 2)] });
  const lookFinger = touch(680, 165, 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moveFinger, lookFinger] });
  await mobile.waitForFunction(() => {
    const state = window.pocketLab.getState();
    return state.quarterback[0] < -.02 && state.look.yaw > .1 && state.stick.strafe > .4;
  });
  // A third finger can pass while movement and looking remain held.
  const target = await mobile.locator('[data-receiver="R"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moveFinger, lookFinger, touch(target.x + target.width / 2, target.y + target.height / 2, 3)] });
  assert.equal((await mobile.evaluate(() => window.pocketLab.getState())).passes, 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const released = await mobile.evaluate(() => window.pocketLab.getState());
  assert.equal(released.stick.strafe, 0);assert.equal(released.stick.forward, 0);
  await mobile.waitForFunction(() => window.pocketLab.getState().phase === 'done', {}, { timeout: 60000 });
  await mobile.locator('#reset').tap();
  await mobile.screenshot({ path: '/workspace/pocket-lab-first-person.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: independent desktop look/movement, view-relative WASD, simultaneous mobile joystick + look + passing, touch release, reset, and no browser exceptions.');
} finally { await browser.close(); }
