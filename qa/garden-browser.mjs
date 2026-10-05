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
    assert.equal(await page.locator('#garden-intro-title').innerText(), '歡迎來到光采花園！');
    assert.equal(await page.locator('#garden-intro-start').innerText(), '準備好了，出發！');
    assert.equal(await page.locator('.garden-controls-touch').isVisible(), mobile);
    assert.equal(await page.locator('.garden-controls-keyboard').isVisible(), !mobile);
    await page.waitForFunction(() => [...document.querySelectorAll('.garden-product-guide img, .garden-intro-host img')].every(img => img.complete && img.naturalWidth > 0));
    assert.equal(await page.locator('#garden-intro').evaluate(dialog => {
      const bounds=dialog.getBoundingClientRect(), host=dialog.querySelector('.garden-intro-host').getBoundingClientRect(), button=dialog.querySelector('button').getBoundingClientRect();
      return host.top>=bounds.top && button.bottom<=bounds.bottom && dialog.scrollWidth<=dialog.clientWidth;
    }),true,'intro host and start action must remain visible together');
    await page.screenshot({ path: `qa/garden/intro-${width}.png` });
    await page.evaluate(() => window.__qaGame.pauseForBackground());
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), true);
    await page.locator('#garden-intro-start').click();
    assert.equal(await page.evaluate(() => window.__qaGame.backgroundPaused), false);
    assert.equal(await page.locator('#garden-intro').evaluate(el => el.open), true);
    assert.equal(await page.evaluate(() => window.__qaGame.stageManager.elapsed), 0);
    assert.equal(await page.locator('#garden-intro-start').innerText(), '準備好了，出發！');
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
    // Read the accepted copy through the real canvas layout, including two concurrent requests.
    const dialogueLayouts = await page.evaluate(() => {
      const g=window.__qaGame, stage=g.stageManager.getStage();
      g.npcs.forEach(n=>n.clearEvent(g.stageManager.elapsed));g.player.x=384;g.player.y=720;g.cameraState=null;
      const camera=g.getCamera(stage), bounds=g.getVisibleWorldBounds(stage,camera);
      const result=[];
      for(const [index,type] of ['PIGMENT_CARE','SALLOW_CARE'].entries()) {
        const npc=g.npcs[index];npc.x=384;npc.y=index?900:620;npc.startScenario(type,20,3,g.stageManager.elapsed);
        for(const state of ['WARNING','HELP','CRITICAL','RESCUED','FAILED']) {
          npc.state=state;
          const layout=npc.getStatusLayout(g.ctx,0,{cameraScale:camera.scale,compactStatusBubble:g.layoutMode!=='desktop',visibleBounds:bounds});
          result.push({type,state,label:layout.label,lines:layout.lines,inside:layout.bubbleX>=bounds.left&&layout.bubbleX+layout.bubbleWidth<=bounds.right+.01&&layout.bubbleY>=bounds.top&&layout.bubbleY+layout.bubbleHeight<=bounds.bottom+.01});
        }
        npc.state=index?'HELP':'CRITICAL';
      }
      g.pauseForBackground();g.backgroundPause.style.visibility='hidden';g.render();return result;
    });
    for(const layout of dialogueLayouts) {
      assert.equal(layout.lines.join(''),layout.label);assert.ok(layout.lines.length<=2);assert.ok(layout.inside);
    }
    assert.equal(dialogueLayouts.find(l=>l.type==='PIGMENT_CARE'&&l.state==='HELP').label,'想處理黑色素沉澱，能幫我嗎？');
    assert.equal(dialogueLayouts.find(l=>l.type==='PIGMENT_CARE'&&l.state==='CRITICAL').label,'我快出發了，能先幫我處理黑色素嗎？');
    assert.equal(dialogueLayouts.find(l=>l.type==='SALLOW_CARE'&&l.state==='HELP').label,'想改善皮膚蠟黃，有辦法能幫我嗎？');
    await page.screenshot({ path: `qa/garden/dialogue-${width}.png` });
    await page.evaluate(() => { window.__qaGame.backgroundPause.style.visibility=''; });
    await page.locator('#background-resume').click();
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
    report.checks.push(`${width}×${height}: preview, welcoming intro/Q-version guide/adaptive controls/background suspension, complete two-line dialogue/accepted copy, keyboard/touch selection, wrong/correct use, layout, completion/failure stats, replay, Sports next-stage and legacy/Boss item isolation`);
    await context.close();
  }
  assert.deepEqual(report.errors, []); console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.writeFile('qa/garden/browser-report.json', JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill();
}
