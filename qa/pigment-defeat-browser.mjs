import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4199' }, windowsHide: true });
const report = { checks: [], errors: [] }; let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4199', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const g = window.__qaGame; g.update = () => {};
    const r = g.pigmentRenderer, sprite = r.sprite.bind(r);
    r.sprite = (...args) => { if (args[1] === r.art?.queen) window.__queenFrame = args[2]; sprite(...args); };
  });
  for (const [width, height] of [[1366, 768], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => {
      const g = window.__qaGame; await g.startStage('pigmentBloom');
      const c = g.bossCombat; c.debug('spawn'); c.state = 'BOSS'; c.director.clear(); c.crystals = [];
      Object.assign(c.boss, { x: 384, y: 700, hp: 2 }); Object.assign(c.player, { x: 384, y: 840 });
      c.boss.enter('FATIGUE', 3.5); c.cooldown = 0; c.hitPause = 0;
      g.tryAction(); for (let i = 0; i < 10; i++) c.update(.05);
      g.hud.update(g);
    });
    await page.waitForTimeout(100);
    const pose = await page.evaluate(() => {
      const g = window.__qaGame, c = g.bossCombat;
      const time = c.visualTime; c.update(.05, { paused: true });
      return { state: c.state, frame: window.__queenFrame, art: g.pigmentRenderer.art.queen.src,
        pauseFrozen: time === c.visualTime, collected: g.coreCollectionStore.has('pigmentCore') };
    });
    assert.equal(pose.state, 'VICTORY'); assert.equal(pose.frame, 5);
    assert.match(pose.art, /pigment-queen-v2\.webp/); assert.equal(pose.pauseFrozen, true); assert.equal(pose.collected, false);
    await page.screenshot({ path: `qa/pigment/tearful-defeat-${width}.png` });
    const pickup = await page.evaluate(() => {
      const c = window.__qaGame.bossCombat;
      for (let i = 0; i < 120; i++) c.update(.05);
      return { state: c.state, drop: Boolean(c.coreDrop && !c.coreDrop.collected), collected: window.__qaGame.coreCollectionStore.has('pigmentCore') };
    });
    assert.deepEqual(pickup, { state: 'COLLECT', drop: true, collected: false });
    report.checks.push({ width, height, pose, pickup });
  }
  assert.deepEqual(report.errors, []);
  await fs.writeFile('qa/pigment/tearful-defeat-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log('PASS: v2 tearful defeat after real final hit, frozen pause and physical-pickup requirement at three viewports.');
} finally { await browser?.close(); server.kill(); }
