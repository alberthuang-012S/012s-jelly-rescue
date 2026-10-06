import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4200' }, windowsHide: true });
const report = { checks: [], errors: [] }; let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  for (const blocked of [false, true]) for (const [width, height] of [[1366, 768], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } }), page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
    });
    if (blocked) await page.route(/\/reference\/runtime\/jelly-anthropomorphic-[^/]+\.webp(?:\?.*)?$/, route => route.abort());
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.__qaGame.startStage('park'));
    assert.match(await page.evaluate(() => window.__qaGame.player.spriteImage.src), /jelly-player\.webp$/);
    await page.evaluate(async () => {
      const g = window.__qaGame;
      await g.startStage('mountain'); g.evolutionStore.state = { capsule: true, evolved: false }; g.finishStage();
    });
    await page.locator('.evolution-dialog button').click();
    await page.waitForFunction(() => document.querySelector('.evolution-dialog button').textContent === '太棒了，查看結算');
    await page.waitForFunction(() => [...document.querySelectorAll('.evolution-character')].every(img => img.complete && img.naturalWidth > 0));
    const evolution = await page.evaluate(() => {
      const g = window.__qaGame;
      return { speed: g.player.speed, sprite: g.player.spriteImage.src, sheet: g.player.spriteSheet,
        portraits: [...document.querySelectorAll('.evolution-character')].map(img => img.currentSrc) };
    });
    assert.equal(evolution.speed, 256.25);
    assert.match(evolution.sprite, blocked ? /walk-v12\.png$/ : /walk-v12\.webp\?webp-q90-v1$/);
    assert.equal(evolution.sheet.frameWidth, 420); assert.equal(evolution.sheet.frameHeight, 400);
    assert.equal(evolution.sheet.frameCount, 4); assert.deepEqual(evolution.sheet.directionRows, { down: 0, left: 1, right: 2, up: 3 });
    assert.ok(evolution.portraits.every(src => blocked ? src.endsWith('jelly-anthropomorphic-home.png') : src.endsWith('jelly-anthropomorphic-home-v1.webp?webp-q90-v1')));
    await page.locator('.evolution-dialog button').click(); await page.locator('#result-replay').click();
    await page.waitForFunction(() => window.__qaGame.state === 'playing');
    await page.evaluate(() => { const g = window.__qaGame; g.npcs = []; g.player.reset({ x: 512, y: 1100 }); g.eventDirector.nextEventAt = Infinity; g.eventDirector.nextSpawnAt = Infinity; });
    const directions = [];
    for (const [key, direction] of [['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down']]) {
      await page.keyboard.down(key); await page.waitForTimeout(140);
      const movement = await page.evaluate(() => ({ direction: window.__qaGame.player.direction, moving: window.__qaGame.player.isMoving, distance: window.__qaGame.player.distanceTravelled }));
      assert.equal(movement.direction, direction); assert.equal(movement.moving, true);
      directions.push(movement); await page.keyboard.up(key); await page.waitForTimeout(70);
      assert.equal(await page.evaluate(() => window.__qaGame.player.isMoving), false);
    }
    await fs.mkdir('qa/player-webp', { recursive: true });
    await page.screenshot({ path: `qa/player-webp/walk-${width}-${blocked ? 'png-fallback' : 'webp'}.png` });
    await page.evaluate(() => window.__qaGame.showHome());
    await page.waitForFunction(() => { const image = document.querySelector('.home-character-crop img'); return image.complete && image.naturalWidth > 0; });
    const home = await page.locator('.home-character-crop img').evaluate(img => img.currentSrc);
    assert.match(home, blocked ? /jelly-anthropomorphic-home\.png$/ : /jelly-anthropomorphic-home-v1\.webp\?webp-q90-v1$/);
    report.checks.push({ blocked, width, height, evolution, directions, home });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  await fs.writeFile('qa/player-webp/browser-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log('PASS: normal player, real evolution, 4-direction walking/stopping, Home/results and forced PNG fallback on desktop/phone.');
} finally { await browser?.close(); server.kill(); }
