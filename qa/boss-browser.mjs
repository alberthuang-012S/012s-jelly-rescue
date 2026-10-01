import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.JELLY_QA_PORT || '4182';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: port }, windowsHide: true });
let browser; const checks = []; const errors = [];
async function assertSharedCamera(page) {
  const result = await page.evaluate(async () => {
    const { STAGE_DEFS } = await import('/src/game/StageManager.js');
    const g = window.__qaGame;
    const boss = g.getCamera.call({ ...g, cameraState: null }, g.stageManager.getStage());
    const park = g.getCamera.call({ ...g, bossCombat: null, cameraState: null }, STAGE_DEFS.park);
    return { boss, park, mode: g.cameraMode };
  });
  assert.deepEqual(result.boss, result.park);
  assert.equal(result.boss.mode, result.mode);
  assert.equal(result.boss.clip, undefined);
}
await fs.mkdir('qa/boss', { recursive: true });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: process.env.JELLY_BROWSER_CHANNEL || 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
  await page.locator('#special-start').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'qa/boss/home-desktop.png' });
  await page.locator('#special-start').click();
  await page.waitForFunction(() => window.__qaGame.state === 'playing');
  await page.evaluate(() => { window.__qaGame.debug.infiniteLife = true; });
  await assertSharedCamera(page);
  assert.equal(await page.locator('[data-item="NAP"]').isVisible(), false);
  await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'PPA');
  const before = await page.evaluate(() => window.__qaGame.player.x);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250); await page.keyboard.up('ArrowLeft');
  assert.ok(await page.evaluate(() => window.__qaGame.player.x) < before);
  await page.keyboard.press('e'); assert.ok(await page.evaluate(() => window.__qaGame.bossCombat.cooldown) > 0);
  await page.screenshot({ path: 'qa/boss/wave-desktop.png' });
  checks.push('Home special entry; desktop keyboard movement, PPA pulse, Q lock, NAP hidden');

  for (const [width, height] of [[390, 844], [375, 667]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__qaGame.startStage('alienMosquito'));
    await page.evaluate(() => { window.__qaGame.debug.infiniteLife = true; window.__qaGame.bossCombat.debug('wave3'); });
    assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.director.enemies.length), 4);
    const y = await page.evaluate(() => window.__qaGame.player.y);
    await page.locator('[data-dir="down"]').dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
    await page.waitForTimeout(220);
    await page.locator('[data-dir="down"]').dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch' });
    assert.ok(await page.evaluate(() => window.__qaGame.player.y) > y);
    await page.locator('#action-button').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
    assert.ok(await page.evaluate(() => window.__qaGame.bossCombat.cooldown) > 0);
    const geometry = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
      return { ppa: rect('[data-item="PPA"]'), use: rect('#action-button'), dpad: rect('.mobile-dpad') };
    });
    assert.ok(geometry.ppa.x >= geometry.dpad.right && geometry.ppa.right <= geometry.use.x, JSON.stringify(geometry));
    assert.ok(geometry.ppa.bottom <= height && geometry.use.bottom <= height);
    await page.screenshot({ path: `qa/boss/wave3-${width}.png` });
    await page.evaluate(() => { const g = window.__qaGame; g.bossCombat.startArrival(); });
    await page.waitForTimeout(700); await page.screenshot({ path: `qa/boss/warning-${width}.png` });
    await page.waitForFunction(() => window.__qaGame.bossCombat.state === 'BOSS');
    await page.evaluate(() => { const c = window.__qaGame.bossCombat; c.boss.enter('CORE_OPEN', 2.3); });
    await page.screenshot({ path: `qa/boss/core-${width}.png` });
    await assertSharedCamera(page);
    assert.equal(await page.locator('#boss-health').isVisible(), true);
    checks.push(`${width}×${height}: four enemies, D-pad, Use, PPA dock separation, visible Boss HP; full-map camera matches Park`);
  }

  await page.setViewportSize({ width: 667, height: 375 });
  await assertSharedCamera(page);
  assert.equal(await page.evaluate(() => window.__qaGame.cameraMode), 'follow');
  await page.screenshot({ path: 'qa/boss/camera-landscape.png' });
  checks.push('Landscape uses the same player-follow camera and scale as Park');
  await page.setViewportSize({ width: 375, height: 667 });

  await page.evaluate(() => {
    const c = window.__qaGame.bossCombat; c.boss.enter('BUBBLE', .2); c.fire(c.boss, c.player, 2);
    window.dispatchEvent(new Event('blur'));
  });
  const paused = await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat));
  await page.waitForTimeout(350); assert.equal(await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat)), paused);
  await page.locator('#background-resume').click();
  assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), false);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), true);
  await page.locator('#background-resume').click();
  checks.push('Blur and hidden freeze combat snapshots, explicit Continue required');

  for (const phase of ['phase2', 'phase3']) {
    await page.evaluate(phase => window.__qaGame.bossCombat.debug(phase), phase);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.boss.phase), Number(phase.at(-1)));
    await page.screenshot({ path: `qa/boss/${phase}.png` });
  }
  await page.evaluate(() => {
    const c = window.__qaGame.bossCombat; c.director.clear(); c.boss.hp = 2;
    c.boss.enter('CORE_OPEN', 2.3); c.cooldown = 0; c.hitPause = 0;
    c.player.x = c.boss.x; c.player.y = c.boss.y + 85; c.tryAction();
  });
  assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.state), 'VICTORY');
  await page.waitForTimeout(2600); await page.screenshot({ path: 'qa/boss/mini-ufo.png' });
  await page.waitForFunction(() => window.__qaGame.bossCombat.state === 'COLLECT');
  await page.evaluate(() => {
    const g = window.__qaGame; g.player.x = g.bossCombat.coreDrop.x; g.player.y = g.bossCombat.coreDrop.y;
  });
  await page.waitForFunction(() => window.__qaGame.state === 'result');
  assert.equal(await page.locator('#boss-result').isVisible(), true);
  assert.equal(await page.locator('#result-screen').isVisible(), false);
  for (const [width, height] of [[390, 844], [375, 667]]) {
    await page.setViewportSize({ width, height });
    await page.locator('#boss-home').scrollIntoViewIfNeeded();
    const r = await page.locator('#boss-home').boundingBox();
    assert.ok(r.y >= 0 && r.y + r.height <= height);
    assert.ok(await page.locator('#boss-result').evaluate(el => el.scrollWidth <= innerWidth));
    await page.screenshot({ path: `qa/boss/result-${width}.png` });
  }
  checks.push('Phase 2/3, vulnerable-hit victory, mini UFO sequence, required core pickup, dedicated result, mobile result scroll');
  await page.locator('#boss-replay').click(); await page.waitForFunction(() => window.__qaGame.state === 'playing');
  assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.wave), 1);
  await page.evaluate(() => {
    const g = window.__qaGame; g.debug.infiniteLife = false;
    for (let i = 0; i < 3; i++) { g.bossCombat.invulnerability = 0; g.bossCombat.damage(); }
  });
  await page.waitForFunction(() => window.__qaGame.state === 'gameover');
  assert.match(await page.locator('#boss-result-kicker').innerText(), /GAME OVER/);
  await page.locator('#boss-home').click(); assert.equal(await page.locator('#home-screen').isVisible(), true);
  for (const stage of ['park', 'mountain', 'city', 'sports']) {
    await page.evaluate(stage => window.__qaGame.startStage(stage), stage);
    assert.equal(await page.locator('[data-item="NAP"]').isVisible(), true);
    assert.equal(await page.locator('#boss-hud').isVisible(), false);
    await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'NAP');
    assert.ok(await page.evaluate(() => window.__qaGame.npcs.length) > 0);
  }
  checks.push('Replay resets wave; real life drain triggers Game Over; Home; rescue NAP/Q/NPC/HUD restoration in four stages');
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/boss/browser-report.json', JSON.stringify({ status: 'PASS', checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
} finally { await browser?.close(); server.kill(); }
