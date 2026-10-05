import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4195' }, windowsHide: true });
const report = { checks: [], errors: [], layouts: [] }; let browser;
await fs.mkdir('qa/garden', { recursive: true });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: process.env.JELLY_BROWSER_CHANNEL || 'msedge' });
  for (const [width, height] of [[1280, 900], [390, 844], [375, 667], [320, 568], [667, 375]]) {
    const mobile = width < 700;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(`${width}: ${e.message}`));
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) report.errors.push(`${r.status()} ${r.url()}`); });
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
    });
    await page.goto('http://localhost:4195', { waitUntil: 'networkidle' });
    await page.locator('[data-stage-select="garden"]').click();
    await page.waitForFunction(() => document.querySelector('#home-stage-preview').complete && document.querySelector('#home-stage-preview').naturalWidth > 0);
    await page.screenshot({ path: `qa/garden/home-${width}.png` });
    await page.locator('#start-button').click();
    await page.waitForFunction(() => window.__qaGame.state === 'playing');
    assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), true);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.__qaGame.stageManager.elapsed), 0);
    assert.equal(await page.evaluate(() => window.__qaGame.input.enabled), false);
    await page.screenshot({ path: `qa/garden/intro-${width}.png` });
    await page.evaluate(() => window.__qaGame.pauseForBackground());
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), true);
    await page.locator('#garden-intro-start').click();
    assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), false);
    assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), true);
    assert.equal(await page.evaluate(() => window.__qaGame.stageManager.elapsed), 0);
    if (mobile) await page.locator('#garden-intro-start').tap(); else await page.locator('#garden-intro-start').click();
    await page.waitForFunction(() => !window.__qaGame.isGardenIntroOpen && window.__qaGame.input.enabled);
    await page.evaluate(() => { const g = window.__qaGame; g.eventDirector.nextEventAt = 999; });
    assert.deepEqual(await page.locator('[data-item]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.item)), ['DDM', 'SSW']);
    assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'DDM');
    const icons = await page.locator('.product-icon img').evaluateAll(images => images.map(img => ({ loaded: img.complete, width: img.naturalWidth, height: img.naturalHeight, source: img.currentSrc })));
    assert.ok(icons.every(img => img.loaded && img.width === 256 && img.height === 384 && /(?:ddm|ssw)-chibi-v1\.(?:webp|png)$/.test(img.source)));
    const iconBounds = await page.locator('.product-icon').evaluateAll(wrappers => wrappers.map(wrap => {
      const parent = wrap.getBoundingClientRect(), img = wrap.querySelector('img').getBoundingClientRect();
      return img.top >= parent.top - 1 && img.bottom <= parent.bottom + 1 && img.left >= parent.left - 1 && img.right <= parent.right + 1;
    }));
    assert.ok(iconBounds.every(Boolean), 'Q-version bottle images must fit completely inside their icon containers');
    const layouts = await page.evaluate(() => {
      const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      return { items: [...document.querySelectorAll('[data-item]')].filter(n => n.getClientRects().length).map(rect), use: rect(document.querySelector('#action-button')), dpad: rect(document.querySelector('.mobile-dpad')) };
    });
    report.layouts.push({ width, height, ...layouts });
    for (const item of layouts.items) {
      assert.ok(item.x >= 0 && item.right <= width + 1 && item.bottom <= height + 1);
      assert.ok(item.width >= 44 && item.height >= 44);
      if (mobile) { assert.ok(item.x >= layouts.dpad.right - 1); assert.ok(item.right <= layouts.use.x + 1); }
    }
    // Real Q and selection dispatch, and real Use input against registered scenarios.
    await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'SSW');
    await page.keyboard.press('q'); assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'DDM');
    await page.evaluate(() => {
      const g = window.__qaGame; const npc = g.npcs[0]; npc.placeAt(g.player, g.stageManager.getStage());
      npc.startScenario('SALLOW_CARE', 20, 3, g.stageManager.elapsed);
    });
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(() => window.__qaGame.scoreManager.wrongItemCount), 1);
    assert.equal(await page.evaluate(() => window.__qaGame.npcs[0].state), 'WARNING');
    if (mobile) await page.locator('[data-item="SSW"]').tap(); else await page.locator('[data-item="SSW"]').click();
    if (mobile) await page.locator('#action-button').tap(); else await page.keyboard.press('e');
    assert.equal(await page.evaluate(() => window.__qaGame.scoreManager.itemSuccess.SSW), 1);
    await page.evaluate(() => {
      const g = window.__qaGame; const npc = g.npcs[1]; npc.placeAt(g.player, g.stageManager.getStage());
      npc.startScenario('PIGMENT_CARE', 20, 3, g.stageManager.elapsed);
    });
    if (mobile) await page.locator('[data-item="DDM"]').tap(); else await page.locator('[data-item="DDM"]').click();
    await page.screenshot({ path: `qa/garden/play-${width}.png` });
    if (mobile) await page.locator('#action-button').tap(); else await page.keyboard.press('e');
    assert.equal(await page.evaluate(() => window.__qaGame.scoreManager.itemSuccess.DDM), 1);
    const paused = await page.evaluate(() => {
      const g = window.__qaGame; g.pauseForBackground(); const before = g.stageManager.elapsed; g.update(2); return { before, after: g.stageManager.elapsed };
    });
    assert.equal(paused.before, paused.after);
    await page.locator('#background-resume').click();
    await page.evaluate(() => {
      const g = window.__qaGame; g.stageManager.elapsed = 59.9; g.update(.2);
    });
    assert.equal(await page.evaluate(() => window.__qaGame.state), 'result');
    const stats = await page.locator('#result-screen .rescue-statistics').innerText();
    assert.match(stats, /DDM\+1 正確使用\s+1/); assert.match(stats, /SSW\+1 正確使用\s+1/);
    assert.equal(await page.locator('#result-next').isVisible(), false);
    await page.screenshot({ path: `qa/garden/result-${width}.png` });
    await page.locator('#result-replay').click(); await page.waitForFunction(() => window.__qaGame.state === 'playing');
    assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'DDM');
    assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), false);
    await page.evaluate(() => {
      const g = window.__qaGame; g.eventDirector.nextEventAt = 999;
      g.lives = 1; const npc = g.npcs[0]; npc.startScenario('SALLOW_CARE', .01, 0, g.stageManager.elapsed);
      npc.state = 'HELP'; g.update(.1);
    });
    assert.equal(await page.evaluate(() => window.__qaGame.state), 'gameover');
    assert.match(await page.locator('#gameover-screen .rescue-statistics').innerText(), /DDM\+1 正確使用\s+0/);
    assert.match(await page.locator('#gameover-screen .rescue-statistics').innerText(), /SSW\+1 正確使用\s+0/);
    await page.screenshot({ path: `qa/garden/failure-${width}.png` });
    for (const id of ['park', 'city', 'sports', 'alienMosquito', 'gravityOverload']) {
      await page.evaluate(id => window.__qaGame.startStage(id), id);
      const expected = id === 'alienMosquito' ? ['PPA'] : id === 'gravityOverload' ? ['NAP'] : ['PPA', 'NAP'];
      assert.deepEqual(await page.locator('[data-item]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.item)), expected);
      if (id === 'sports') {
        await page.evaluate(() => window.__qaGame.finishStage());
        const legacyStats = await page.locator('#result-screen .rescue-statistics').innerText();
        assert.match(legacyStats, /PPA\+1 正確使用/); assert.match(legacyStats, /NAP\+1 正確使用/);
        await page.locator('#result-next').click();
        await page.waitForFunction(() => window.__qaGame.state === 'playing' && window.__qaGame.selectedStage === 'garden');
        assert.deepEqual(await page.locator('[data-item]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.item)), ['DDM', 'SSW']);
      }
    }
    report.checks.push(`${width}×${height}: preview, intro/background suspension, keyboard/touch selection, wrong/correct use, layout, completion/failure stats, replay, Sports next-stage and legacy/Boss item isolation`);
    await context.close();
  }
  assert.deepEqual(report.errors, []); console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.writeFile('qa/garden/browser-report.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill();
}
