import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const state = () => page.evaluate(() => window.pocketLab.getState());
try {
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.pocketLab?.getState().visuals.playerModel === 'realistic-glb');
  assert.ok(await page.locator('.rotate-prompt').isVisible());
  assert.equal((await state()).paused, true);
  console.log('Portrait rotate prompt verified');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => !window.pocketLab.getState().paused);
  assert.equal(await page.locator('.rotate-prompt').isVisible(), false);
  const field = await page.locator('#viewport').boundingBox();
  assert.deepEqual(field, { x: 0, y: 0, width: 844, height: 390 });
  for (const button of await page.locator('.touch-receiver').all()) {
    const box = await button.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44);
    assert.ok(box.x >= 0 && box.x + box.width <= 844 && box.y + box.height <= 390);
    assert.ok(await button.isDisabled());
  }
  await page.locator('#playbook-open').tap();
  assert.ok(await page.locator('.playbook-dialog').isVisible());
  await page.selectOption('#formation', 'Gun Trips Right');
  await page.selectOption('#coverage', 'Cover 2 Zone');
  await page.selectOption('#route-1', 'Drag');
  await page.locator('#slow').check();
  const routesBeforeRename = (await state()).receivers.map(receiver => receiver.path);
  await page.locator('#receiver-name-1').fill('X');
  await page.locator('#receiver-name-1').press('Tab');
  assert.match(await page.locator('#receiver-name-feedback').textContent(), /unique/);
  assert.equal(await page.locator('#receiver-name-1').inputValue(), 'H');
  await page.locator('#receiver-name-1').fill('f');
  await page.locator('#receiver-name-1').press('Tab');
  await page.locator('#receiver-name-4').fill('rb');
  await page.locator('#receiver-name-4').press('Tab');
  const teamNames = ['X', 'F', 'Y', 'Z', 'RB'];
  assert.deepEqual((await state()).receiverNames, teamNames);
  assert.deepEqual((await state()).receivers.map(receiver => receiver.path), routesBeforeRename);
  assert.equal(await page.locator('#route-4').getAttribute('aria-label'), 'RB receiver route');
  assert.equal(await page.locator('#labels .player-label').nth(4).textContent(), 'RB');
  await page.screenshot({ path: '/workspace/pocket-lab-playbook.png' });
  await page.locator('#playbook-close').tap();
  assert.equal((await state()).formation, 'Gun Trips Right');
  assert.equal((await state()).coverage, 'Cover 2 Zone');
  console.log('Full-width field and editable playbook verified');

  for (const [index, receiver] of teamNames.entries()) {
    await page.locator('#snap').tap();
    await page.locator(`[data-receiver="${receiver}"]`).tap();
    const afterPass = await state();
    assert.equal(afterPass.passTarget, receiver);
    assert.equal(afterPass.passes, index + 1);
    assert.ok(await page.locator(`[data-receiver="${receiver}"]`).isDisabled());
    await page.waitForFunction(() => window.pocketLab.getState().phase === 'done', {}, { timeout: 60000 });
    if (await page.locator('#result-title').textContent() === 'Complete') {
      assert.ok((await page.locator('#result-detail').textContent()).startsWith(`${receiver} caught`));
    }
    await page.locator('#reset').tap();
    assert.equal((await state()).phase, 'ready');
    console.log(`Touch pass to ${receiver} verified`);
  }

  await page.locator('#snap').tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.pocketLab.getState().paused);
  const pausedAt = (await state()).elapsed;
  await page.waitForTimeout(600);
  assert.equal((await state()).elapsed, pausedAt);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(time => window.pocketLab.getState().elapsed > time, pausedAt);
  await page.locator('#reset').tap();
  await page.screenshot({ path: '/workspace/pocket-lab-landscape.png' });

  // Verify the supported fallback without relying on headless fullscreen behavior.
  await page.evaluate(() => { document.documentElement.requestFullscreen = undefined; });
  await page.locator('#fullscreen-toggle').tap();
  assert.match(await page.locator('.mobile-notice').textContent(), /unavailable/);

  await page.setViewportSize({ width: 568, height: 320 });
  const movement = await page.locator('.controls').boundingBox();
  const receivers = await page.locator('.touch-targets').boundingBox();
  assert.ok(movement.x + movement.width <= receivers.x, 'Thumb controls must not overlap');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  await page.locator('#playbook-open').tap();
  await page.locator('#playbook-close').tap();
  await page.reload();
  await page.waitForFunction(() => window.pocketLab?.getState().visuals.playerModel === 'realistic-glb');
  assert.deepEqual((await state()).receiverNames, teamNames);
  assert.equal(await page.locator('[data-receiver="RB"]').textContent(), 'RB');
  await page.locator('#playbook-open').tap();
  await page.locator('#reset-names').tap();
  assert.deepEqual((await state()).receiverNames, ['X', 'F', 'Y', 'Z', 'H']);
  await page.locator('#playbook-close').tap();
  assert.deepEqual(errors, []);
  console.log('PASS: landscape viewport, five named receiver touch passes, editable/persistent/resettable designations, playbook, portrait pause/resume, fullscreen fallback, and small-phone layout.');
} catch (error) {
  console.error('Mobile state:', await state().catch(() => null));
  throw error;
} finally {
  await browser.close();
}
