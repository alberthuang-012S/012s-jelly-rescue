import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const port = process.env.JELLY_QA_PORT || '4198';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: port }, windowsHide: true });
const report = { status: 'RUNNING', checks: [], errors: [] }; let browser;
await fs.mkdir('qa/pigment', { recursive: true });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: process.env.JELLY_BROWSER_CHANNEL || 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes(`localhost:${port}`)) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
  const art = await page.evaluate(async () => {
    const g = window.__qaGame; await g.ensurePigmentArt();
    return Object.fromEntries(Object.entries(g.pigmentRenderer.art).map(([key, image]) => [key, { ready: Boolean(image.complete && image.naturalWidth), width: image.naturalWidth, height: image.naturalHeight }]));
  });
  assert.deepEqual(Object.keys(art), ['queen', 'enemies', 'crystal', 'shield', 'core', 'map']);
  assert.ok(Object.values(art).every(image => image.ready));
  assert.equal(art.queen.width, 1152); assert.equal(art.enemies.width, 768);
  assert.deepEqual([art.map.width, art.map.height], [1024, 1536]);
  report.art = art; report.portraits = [];
  for (const [width, height] of [[1280, 900], [390, 844], [375, 667], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.locator('#pigment-start').scrollIntoViewIfNeeded();
    const entry = await page.locator('#pigment-start').boundingBox();
    assert.ok(entry.x >= 0 && entry.x + entry.width <= width && entry.y >= 0 && entry.y + entry.height <= height);
    assert.ok(await page.locator('.pigment-stage-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(await page.locator('#pigment-portrait').evaluate(canvas => {
      const c = canvas.getBoundingClientRect(), a = canvas.parentElement.getBoundingClientRect();
      return c.top >= a.top && c.bottom <= a.bottom;
    }));
    const portrait = await page.locator('#pigment-portrait').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] >= 160) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      const c = canvas.getBoundingClientRect(), a = canvas.parentElement.getBoundingClientRect();
      const bounds = { left: c.x + left / canvas.width * c.width, right: c.x + (right + 1) / canvas.width * c.width,
        top: c.y + top / canvas.height * c.height, bottom: c.y + (bottom + 1) / canvas.height * c.height };
      return { dx: (bounds.left + bounds.right) / 2 - (a.left + a.right) / 2, dy: (bounds.top + bounds.bottom) / 2 - (a.top + a.bottom) / 2,
        clipped: bounds.left < a.left || bounds.right > a.right || bounds.top < a.top || bounds.bottom > a.bottom };
    });
    assert.ok(Math.abs(portrait.dx) < 3 && Math.abs(portrait.dy) < 3, `${width}: center Queen body`);
    assert.equal(portrait.clipped, false, `${width}: whole Queen fits the home card`);
    report.portraits.push({ width, height, ...portrait });
    await page.screenshot({ path: `qa/pigment/home-${width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#pigment-start').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.home-challenge-grid article').count(), 3);
  await page.screenshot({ path: 'qa/pigment/home-desktop.png' });
  await page.locator('#pigment-start').click(); await page.waitForFunction(() => window.__qaGame.state === 'playing');
  assert.equal(await page.evaluate(() => window.__qaGame.worldRenderer.lifestyleImages.get('garden').naturalWidth > 0), true);
  assert.equal(await page.locator('#garden-intro').isVisible(), false);
  await page.evaluate(() => { window.__qaGame.debug.infiniteLife = true; });
  for (const id of ['PPA', 'NAP', 'SSW']) assert.equal(await page.locator(`[data-item="${id}"]`).isVisible(), false);
  assert.equal(await page.locator('[data-item="DDM"]').isVisible(), true);
  await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'DDM');
  const x = await page.evaluate(() => window.__qaGame.player.x);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(180); await page.keyboard.up('ArrowLeft');
  assert.ok(await page.evaluate(() => window.__qaGame.player.x) < x);
  await page.keyboard.press('e'); assert.ok(await page.evaluate(() => window.__qaGame.bossCombat.cooldown) > 0);
  await page.screenshot({ path: 'qa/pigment/wave-desktop.png' });
  report.checks.push('Third home entry, Garden map, concise intro without modal, keyboard move/Use, DDM-only/Q lock');

  for (const [width, height] of [[390, 844], [375, 667], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => { const g = window.__qaGame; await g.startStage('pigmentBloom'); g.debug.infiniteLife = true; g.bossCombat.debug('wave3'); });
    const y = await page.evaluate(() => window.__qaGame.player.y);
    await page.locator('[data-dir="down"]').dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
    await page.waitForTimeout(160); await page.locator('[data-dir="down"]').dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch' });
    assert.ok(await page.evaluate(() => window.__qaGame.player.y) > y);
    await page.locator('#action-button').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
    await page.locator('#action-button').dispatchEvent('pointerup', { pointerId: 9, pointerType: 'touch' });
    assert.ok(await page.evaluate(() => window.__qaGame.bossCombat.cooldown) > 0);
    const geometry = await page.evaluate(() => {
      const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, right: r.right, bottom: r.bottom }; };
      return { item: rect('[data-item="DDM"]'), use: rect('#action-button'), dpad: rect('.mobile-dpad') };
    });
    assert.ok(geometry.item.x >= geometry.dpad.right && geometry.item.right <= geometry.use.x, JSON.stringify(geometry));
    assert.ok(geometry.item.bottom <= height && geometry.use.bottom <= height);
    await page.screenshot({ path: `qa/pigment/wave3-${width}.png` });
    await page.evaluate(() => window.__qaGame.bossCombat.startArrival());
    await page.waitForTimeout(2950);
    assert.match(await page.locator('#boss-banner').innerText(), /不准天亮/);
    await page.screenshot({ path: `qa/pigment/arrival-${width}.png` });
    await page.waitForFunction(() => window.__qaGame.bossCombat.state === 'BOSS');
    await page.evaluate(() => {
      const c = window.__qaGame.bossCombat; Object.assign(c.player, { x: 384, y: 850 });
      Object.assign(c.boss, { x: 384, y: 700, phase: 2, shieldCreated: 0 }); c.boss.enter('SHIELD_BUILD', 0); c.crystals = [];
    });
    await page.waitForFunction(() => window.__qaGame.bossCombat.crystals.length === 2);
    await page.screenshot({ path: `qa/pigment/shield-${width}.png` });
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const snapshot = await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat));
    await page.waitForTimeout(180); assert.equal(await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat)), snapshot);
    await page.locator('#background-resume').click();
    // Move into range, then break both shields through the real Use dispatch.
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => {
        const c = window.__qaGame.bossCombat, crystal = c.crystals[0];
        Object.assign(c.player, { x: crystal.x, y: crystal.y + 100 }); c.cooldown = 0;
      });
      await page.locator('#action-button').dispatchEvent('pointerdown', { pointerId: 10, pointerType: 'touch' });
      await page.locator('#action-button').dispatchEvent('pointerup', { pointerId: 10, pointerType: 'touch' });
      assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.crystals.length), 1 - i);
    }
    assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.boss.coreOpen), true);
    await page.screenshot({ path: `qa/pigment/core-open-${width}.png` });
    await page.evaluate(() => window.__qaGame.openExitConfirmation());
    const exited = await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat));
    await page.waitForTimeout(160); assert.equal(await page.evaluate(() => JSON.stringify(window.__qaGame.bossCombat)), exited);
    await page.locator('#exit-confirm-secondary').click();
    await page.evaluate(() => { const c = window.__qaGame.bossCombat; c.boss.phase = 3; c.boss.volley = 0; c.boss.warn(c.player); });
    await page.screenshot({ path: `qa/pigment/fan-${width}.png` });
    report.checks.push(`${width}×${height}: touch movement/Use, dock bounds, arrival quote, two real shield breaks/core opening, fan, blur/exit freeze`);
  }
  await page.evaluate(() => {
    const c = window.__qaGame.bossCombat; c.director.clear(); c.crystals = [];
    Object.assign(c.boss, { x: 384, y: 700, hp: 2 }); Object.assign(c.player, { x: 384, y: 840 });
    c.boss.enter('FATIGUE', 3.5); c.cooldown = 0; c.hitPause = 0;
  });
  await page.keyboard.press('e'); assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.state), 'VICTORY');
  await page.waitForTimeout(2200); await page.screenshot({ path: 'qa/pigment/victory-320.png' });
  await page.waitForFunction(() => window.__qaGame.bossCombat.state === 'COLLECT');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__qaGame.coreCollectionStore.has('pigmentCore')), false);
  assert.equal(await page.locator('#boss-result').isVisible(), false);
  await page.screenshot({ path: 'qa/pigment/pickup-320.png' });
  const direction = await page.evaluate(() => {
    const c = window.__qaGame.bossCombat;
    for (const [dx, dy, dir] of [[0, 70, 'up'], [0, -70, 'down'], [70, 0, 'left'], [-70, 0, 'right']]) {
      const point = { x: c.coreDrop.x + dx, y: c.coreDrop.y + dy };
      if (c.navigation.planner(25).isClear(point, c.coreDrop)) { Object.assign(c.player, point); return dir; }
    }
    throw new Error('No walkable core approach');
  });
  await page.locator(`[data-dir="${direction}"]`).dispatchEvent('pointerdown', { pointerId: 12, pointerType: 'touch' });
  await page.waitForTimeout(300);
  await page.locator(`[data-dir="${direction}"]`).dispatchEvent('pointerup', { pointerId: 12, pointerType: 'touch' });
  await page.waitForFunction(() => window.__qaGame.state === 'result');
  assert.match(await page.locator('#boss-core-reward').innerText(), /墨晶核心/);
  assert.equal(await page.locator('#boss-core-reward img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await page.locator('#boss-result-details summary').click();
  assert.match(await page.locator('#boss-item-hit-label').innerText(), /DDM/);
  for (const [width, height] of [[1280, 900], [390, 844], [375, 667], [320, 568], [667, 375]]) {
    await page.setViewportSize({ width, height });
    const r = await page.locator('#boss-home').boundingBox(); assert.ok(r.y >= 0 && r.y + r.height <= height);
    assert.ok(await page.locator('#boss-result').evaluate(el => el.scrollWidth <= innerWidth));
    await page.screenshot({ path: `qa/pigment/result-${width}.png` });
  }
  await page.locator('#boss-core-reward [data-open-collection]').click();
  await page.locator('#pigment-core-entry').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#pigment-core-entry-image').isVisible(), true);
  assert.match(await page.locator('#core-collection-progress').innerText(), /1 \/ 3/);
  await page.screenshot({ path: 'qa/pigment/collection.png' });
  await page.locator('#core-collection-close').click();
  report.checks.push('Victory/petal escape, no auto award, real touch pickup, illustrated core reward, DDM stats, result buttons at five sizes, third encyclopedia entry');
  await page.locator('#boss-replay').click(); await page.waitForFunction(() => window.__qaGame.state === 'playing');
  assert.equal(await page.evaluate(() => window.__qaGame.selectedStage), 'pigmentBloom');
  await page.evaluate(() => {
    const c = window.__qaGame.bossCombat;
    for (let i = 0; i < 3; i++) { c.invulnerability = 0; c.damage(); }
  });
  await page.waitForFunction(() => window.__qaGame.state === 'gameover');
  assert.match(await page.locator('#boss-result-tip').innerText(), /DDM/);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: 'qa/pigment/failure-375.png' });
  await page.locator('#boss-home').click();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => window.__qaGame.coreCollectionStore.has('pigmentCore')), true);
  for (const [stage, item] of [['alienMosquito', 'PPA'], ['gravityOverload', 'NAP'], ['garden', 'DDM'], ['sports', 'PPA']]) {
    await page.evaluate(async stage => { const g = window.__qaGame; g.gardenIntroduced = true; await g.startStage(stage); }, stage);
    assert.equal(await page.locator(`[data-item="${item}"]`).isVisible(), true);
    assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), item);
    if (stage === 'garden') { await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'SSW'); }
    if (stage === 'sports') { await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'NAP'); }
  }
  report.checks.push('Correct replay, real life-loss failure, Home, persistent third core after reload, PPA/NAP/Garden DDM+SSW/rescue restoration');
  assert.deepEqual(report.errors, []); report.status = 'PASS';
  report.note = 'Visual scenarios use controlled state setup; natural waves/phases/score/pickup are checked separately in pigment-simulation.mjs.';
  console.log(JSON.stringify(report, null, 2));
} catch (error) { report.status = 'FAIL'; report.failure = error.stack; console.error(error); process.exitCode = 1; }
finally { await fs.writeFile('qa/pigment/browser-report.json', JSON.stringify(report, null, 2) + '\n'); await browser?.close(); server.kill(); }
