import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4179' }, windowsHide: true });
let browser; const checks = [];
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/src/main.js*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4179', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.__qaGame.startStage('city'));
  await page.evaluate(() => {
    const game = window.__qaGame; window.__actions = 0; window.__selections = 0;
    game.input.onAction = () => window.__actions++;
    game.input.onItemSelect = (id) => { window.__selections++; game.selectItem(id); };
    game.eventDirector.nextEventAt = Infinity; game.eventDirector.nextSpawnAt = Infinity;
    const npc = game.npcs[0]; npc.x = 384; npc.y = 990;
    npc.startScenario('SKINCARE', 120, 60); game.player.x = 384; game.player.y = 1020;
    game.interactionSystem.findTarget(game.player, game.npcs); game.hud.update(game);
  });
  await page.locator('#action-button').focus();
  for (const key of ['Space', 'Enter']) {
    await page.locator('#action-button').focus();
    const count = await page.evaluate(() => window.__actions);
    await page.keyboard.down(key); await page.keyboard.down(key); await page.keyboard.up(key);
    assert.equal(await page.evaluate(() => window.__actions), count + 1);
  }
  const count = await page.evaluate(() => window.__actions);
  for (const key of ['Space', 'Enter']) {
    await page.locator('[data-item="NAP"]').focus();
    const selections = await page.evaluate(() => window.__selections);
    await page.keyboard.press(key);
    assert.equal(await page.evaluate(() => window.__selections), selections + 1);
    assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'NAP');
  }
  assert.equal(await page.evaluate(() => window.__actions), count);
  await page.locator('#exit-stage-button').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => window.__actions), count);
  await page.locator('#exit-confirm-secondary').click();
  checks.push('Use Space/Enter exactly once including repeat; item keyboard activation never rescues; other buttons retain native activation');
  await page.keyboard.down('ArrowUp');
  await page.locator('[data-dir="right"]').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const paused = await page.evaluate(() => ({ elapsed: window.__qaGame.stageManager.elapsed,
    x: window.__qaGame.player.x, y: window.__qaGame.player.y,
    keys: window.__qaGame.input.keys.size, pointers: window.__qaGame.input.activeDirectionPointers.size }));
  assert.equal(paused.keys, 0); assert.equal(paused.pointers, 0);
  await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(() => ({ elapsed: window.__qaGame.stageManager.elapsed,
    x: window.__qaGame.player.x, y: window.__qaGame.player.y })), { elapsed: paused.elapsed, x: paused.x, y: paused.y });
  await page.locator('#background-resume').click();
  assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), false);
  assert.deepEqual(await page.evaluate(() => window.__qaGame.input.getMovementVector()), { x: 0, y: 0 });
  await page.keyboard.up('ArrowUp');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), true);
  await page.locator('#background-resume').click();
  checks.push('Blur/hidden clears keyboard and touch state; clock/position freeze; visible remains paused until explicit resume');
  for (const [width, height] of [[390, 844], [375, 667]]) {
    await page.setViewportSize({ width, height });
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.metric-box small, .timer-box small, .item-compact-label')].map((el) => parseFloat(getComputedStyle(el).fontSize)));
    assert.ok(sizes.every((n) => n >= 11));
    await page.screenshot({ path: `qa/scenarios/input-v1-${width}-game.png` });
    await page.evaluate(() => window.__qaGame.finishStage());
    const layout = await page.evaluate(() => ({ width: document.querySelector('.result-screen').scrollWidth, viewport: innerWidth,
      fonts: [...document.querySelectorAll('.result-stat-grid span, .result-performance-detail > small, .rescue-statistics span')].map((el) => parseFloat(getComputedStyle(el).fontSize)) }));
    await page.screenshot({ path: `qa/scenarios/input-v1-${width}-result.png` });
    assert.ok(layout.width <= layout.viewport, JSON.stringify(layout)); assert.ok(layout.fonts.every((n) => n >= 12));
    const bottom = await page.evaluate(() => {
      const screen = document.querySelector('.result-screen');
      const panel = screen.querySelector('.result-inner'); panel.scrollTop = panel.scrollHeight; screen.scrollTop = screen.scrollHeight;
      const buttons = [...screen.querySelectorAll('.result-actions button')];
      const rect = buttons.at(-1).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: innerHeight };
    });
    assert.ok(bottom.top >= 0 && bottom.bottom <= bottom.height, JSON.stringify(bottom));
    await page.screenshot({ path: `qa/scenarios/input-v1-${width}-result-bottom.png` });
    await page.evaluate(() => window.__qaGame.startStage('city'));
  }
  checks.push('390×844 and 375×667 essential text sizes and result overflow');
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/scenarios/input-browser-report.json', JSON.stringify({ status: 'PASS', checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks }));
} finally { await browser?.close(); server.kill(); }
