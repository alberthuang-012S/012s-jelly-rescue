import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4194' }, windowsHide: true });
const checks = [];
const errors = [];
let browser;
const overlap = (a, b) => Boolean(a && b && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y);
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  const start = () => page.evaluate(async () => {
    const game = window.__qaGame;
    await game.startStage('park');
    game.eventDirector.nextEventAt = Infinity;
    game.eventDirector.nextSpawnAt = Infinity;
  });
  const vector = () => page.evaluate(() => window.__qaGame.input.getMovementVector());
  const zero = async () => assert.deepEqual(await vector(), { x: 0, y: 0 });
  await page.goto('http://localhost:4194', { waitUntil: 'networkidle' });
  await start();
  const toggle = page.locator('#mobile-control-toggle');
  assert.equal(await page.locator('[data-dir="up"]').isVisible(), true);
  await toggle.tap();
  assert.equal(await page.locator('#mobile-joystick').isVisible(), true);
  assert.equal(await page.locator('[data-dir="up"]').isVisible(), false);
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  const cdp = await context.newCDPSession(page);
  const touch = async (type, touchPoints) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const rect = await page.locator('#mobile-joystick').boundingBox();
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: 1 };
  await touch('touchStart', [center]);
  await zero();
  for (const [x, y] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [.5, -1]]) {
    await touch('touchMove', [{ ...center, x: center.x + x * 45, y: center.y + y * 45 }]);
    const actual = await vector();
    const length = Math.hypot(x, y);
    assert.ok(Math.abs(actual.x - x / length) < .02 && Math.abs(actual.y - y / length) < .02, JSON.stringify(actual));
  }
  await touch('touchMove', [center]);
  await zero();
  await touch('touchMove', [{ ...center, x: center.x + 240 }]);
  assert.deepEqual(await vector(), { x: 1, y: 0 });
  await touch('touchEnd', []);
  await zero();
  checks.push('Real touch: center dead zone, four directions, arbitrary diagonals, fixed speed, dragging outside ring, release stops');

  await page.evaluate(() => { window.__actions = 0; window.__qaGame.input.onAction = () => window.__actions++; });
  const actionRect = await page.locator('#action-button').boundingBox();
  const moving = { ...center, x: center.x + 40 };
  const actionTouch = { x: actionRect.x + actionRect.width / 2, y: actionRect.y + actionRect.height / 2, id: 2 };
  await touch('touchStart', [moving]);
  await touch('touchStart', [moving, actionTouch]);
  assert.equal(await page.evaluate(() => window.__actions), 1);
  assert.deepEqual(await vector(), { x: 1, y: 0 });
  await touch('touchEnd', [actionTouch]);
  assert.deepEqual(await vector(), { x: 1, y: 0 });
  await touch('touchCancel', []);
  await zero();
  checks.push('Two fingers: moving and using item together; releasing action preserves movement; cancellation stops');

  const press = () => page.locator('#mobile-joystick').dispatchEvent('pointerdown', { pointerId: 91, clientX: center.x + 40, clientY: center.y });
  for (const event of ['lostpointercapture', 'pointercancel']) {
    await press();
    await page.locator('#mobile-joystick').dispatchEvent(event, { pointerId: 91 });
    await zero();
  }
  await press();
  await page.evaluate(() => window.__qaGame.input.setEnabled(false));
  await zero();
  await press();
  await page.evaluate(() => window.__qaGame.input.setEnabled(true));
  await zero();
  await press();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await zero();
  await page.locator('#background-resume').click();
  await press();
  await toggle.tap();
  await zero();
  await page.locator('[data-dir="left"]').dispatchEvent('pointerdown', { pointerId: 12 });
  assert.deepEqual(await vector(), { x: -1, y: 0 });
  await page.locator('[data-dir="left"]').dispatchEvent('pointerup', { pointerId: 12 });
  await zero();
  await toggle.tap();
  await page.reload({ waitUntil: 'networkidle' });
  await start();
  assert.equal(await page.locator('#mobile-joystick').isVisible(), true);
  checks.push('Lost capture, disabled input, blur, and mode change clear movement; original direction buttons work; reload remembers ring');

  await fs.mkdir('qa/mobile-controls', { recursive: true });
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [667, 375], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const mode of ['buttons', 'ring']) {
      await page.evaluate(mode => window.__qaGame.input.setMobileControlMode(mode), mode);
      const controls = await Promise.all(['.mobile-dpad', '#mobile-control-toggle', '.item-dock', '#action-button', '.hud-metrics', '.hud-right'].map(selector => page.locator(selector).boundingBox()));
      assert.ok(controls[0] && controls[1], `${width}/${mode}: movement controls must be visible`);
      for (const control of controls.filter(Boolean)) assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.width <= width + 1 && control.y + control.height <= height + 1, `${width}/${mode}: ${JSON.stringify(control)}`);
      assert.equal(overlap(controls[0], controls[2]), false);
      assert.equal(overlap(controls[0], controls[3]), false);
      assert.equal(overlap(controls[1], controls[4]), false);
      assert.equal(overlap(controls[1], controls[5]), false);
      assert.ok(controls[1].height >= 44);
      if (mode === 'ring' && [320, 390, 667].includes(width)) await page.screenshot({ path: `qa/mobile-controls/ring-${width}x${height}.png` });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await toggle.isVisible(), false);
  await page.keyboard.down('ArrowRight');
  assert.deepEqual(await vector(), { x: 1, y: 0 });
  await page.keyboard.up('ArrowRight');
  await zero();
  checks.push('Both modes fit six portrait/landscape phone sizes with no control overlaps; desktop keyboard still works');

  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await start();
  await toggle.tap();
  assert.equal(await page.locator('#mobile-joystick').isVisible(), true);
  checks.push('Blocked storage still allows switching and gameplay');
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/mobile-controls/browser-report.json', JSON.stringify({ status: 'PASS', checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks }));
} finally {
  await browser?.close();
  server.kill();
}
