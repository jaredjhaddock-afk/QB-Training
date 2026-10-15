import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 430 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
try {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.pocketLab?.getState().visuals.environment === 'ready' && window.pocketLab.getState().visuals.playerModel === 'realistic-glb', {}, { timeout: 90000 });
  const initial = await page.evaluate(() => window.pocketLab.getState());
  assert.equal(initial.visuals.playerModel, 'realistic-glb');
  assert.ok(initial.visuals.crowd > 1500);
  await page.screenshot({ path: '/workspace/pocket-lab-visual-upgrade.png' });
  await page.locator('#snap').tap();
  await page.locator('[data-receiver="H"]').tap();
  await page.waitForFunction(() => window.pocketLab.getState().quarterbackPose.throwProgress !== null);
  await page.waitForFunction(() => window.pocketLab.getState().phase === 'done', {}, { timeout: 60000 });
  await page.locator('#reset').tap();
  assert.equal((await page.evaluate(() => window.pocketLab.getState())).quarterbackPose.throwProgress, null);
  assert.deepEqual(errors, []);
  // Local asset failure must leave a playable field and pose system.
  await page.route('**/kiara_1_dawn_1k.hdr', route => route.abort());
  await page.route('**/football_player_realistic.glb', route => route.abort());
  await page.reload();
  await page.waitForFunction(() => window.pocketLab?.getState().visuals.environment === 'fallback' && window.pocketLab.getState().visuals.playerModel === 'procedural-fallback');
  await page.locator('#snap').tap();
  assert.equal((await page.evaluate(() => window.pocketLab.getState())).phase, 'live');
  assert.deepEqual(errors, []);
  console.log('PASS: bundled HDR loads, supplied GLB players render, crowd renders, throwing and reset poses work, missing GLB/HDR fallback remains playable, no browser exceptions.');
} catch (error) {
  console.error('Graphics state:', await page.evaluate(() => window.pocketLab?.getState()).catch(() => null));
  console.error('Page errors:', errors);
  throw error;
} finally { await browser.close(); }
