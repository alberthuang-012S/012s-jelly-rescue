import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4192' }, windowsHide: true });
const report = { checks: [], layouts: [], errors: [] };
let browser;
await fs.mkdir('qa/mobile-layout', { recursive: true });
const overlaps = (a, b) => a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4192', { waitUntil: 'networkidle' });
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [667, 375], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const stageId of ['city', 'sports', 'gravityOverload']) {
      await page.evaluate(async id => {
        const g = window.__qaGame; await g.startStage(id);
        g.__liveUpdate ||= g.update; g.update = () => {};
        g.combo.combo = 12;
        if (g.bossCombat) {
          g.bossCombat.startArrival(); g.bossCombat.debug('phase3');
          Object.assign(g.bossCombat.boss, { x: 384, y: 820 });
          g.bossCombat.boss.enter('CORE_OPEN', 3); g.player.x = 490; g.player.y = 820;
        } else {
          g.handleDebug('scenario:FALL');
          const npc = g.npcs.find(n => n.condition);
          npc.x = 320; npc.y = 640; npc.enterHelp(0); npc.reactionTimer = 0;
          g.player.x = 420; g.player.y = 640;
        }
        g.hud.update(g); g.bossUI.update(); g.cameraState = null;
        // Settle smooth follow on the same player coordinates.
        for (let i = 0; i < 30; i++) g.render(1000);
      }, stageId);
      const layout = await page.evaluate(() => {
        const g = window.__qaGame, stage = g.stageManager.getStage(), camera = g.getCamera(stage);
        const rect = selector => {
          const el = document.querySelector(selector); if (!el.getClientRects().length) return null;
          const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };
        const canvas = rect('#game-canvas');
        const map = camera.mode === 'fit' ? { x: camera.x, y: camera.y, right: camera.x + stage.world.width * camera.scale,
          bottom: camera.y + stage.world.height * camera.scale, width: stage.world.width * camera.scale } : null;
        return { camera, map, canvas, dpad: rect('.mobile-dpad'), items: rect('.item-dock'), action: rect('#action-button'),
          buttons: [...document.querySelectorAll('.mobile-dpad button, .item-card, #exit-stage-button')].filter(el => el.getClientRects().length).map(el => {
            const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; }),
          hud: ['.hud-metrics', '.hud-right', '#exit-stage-button', '#boss-hud'].map(rect),
          textFits: [...document.querySelectorAll('.hud-metrics strong, .timer-box small, .item-compact-label, #boss-core-hint')]
            .filter(el => el.getClientRects().length).every(el => el.scrollWidth <= el.clientWidth + 1),
          bubbleFonts: g.npcs.filter(n => n.hasStatusBubble()).map(n => n.getStatusLayout(g.ctx, 1000, { cameraScale: camera.scale, compactStatusBubble: true }).screenFontSize) };
      });
      await page.screenshot({ path: `qa/mobile-layout/${stageId}-${width}x${height}.png` });
      for (const control of [layout.dpad, layout.items, layout.action, ...layout.hud].filter(Boolean)) {
        assert.ok(control.x >= 0 && control.y >= 0 && control.right <= width + 1 && control.bottom <= height + 1, `${stageId}/${width}: outside viewport ${JSON.stringify(control)}`);
      }
      assert.equal(overlaps(layout.dpad, layout.items), false);
      assert.equal(overlaps(layout.dpad, layout.action), false);
      assert.equal(overlaps(layout.items, layout.action), false);
      assert.equal(overlaps(layout.hud[0], layout.hud[1]), false);
      assert.equal(overlaps(layout.hud[1], layout.hud[2]), false);
      assert.ok(layout.buttons.every(b => b.width >= 44 && b.height >= 44));
      assert.ok(layout.textFits, `${stageId}/${width}: clipped text`);
      assert.ok(layout.bubbleFonts.every(n => n >= 14));
      if (layout.map) {
        const hudBottom = Math.max(...layout.hud.filter(Boolean).map(r => r.bottom));
        assert.ok(layout.map.y >= hudBottom + 5, `${stageId}/${width}: map under HUD ${JSON.stringify(layout)}`);
        assert.ok(layout.map.bottom <= Math.min(layout.dpad.y, layout.items.y) - 5, `${stageId}/${width}: map under controls`);
        const oldPadding = stageId === 'gravityOverload' ? 310 : 255;
        const oldWidth = Math.min(width / 768, (height - oldPadding) / 1152) * 768;
        assert.ok(layout.map.width >= oldWidth, `${stageId}/${width}: map regressed`);
        report.layouts.push({ stageId, width, height, mapWidth: layout.map.width, oldMapWidth: oldWidth });
      }
      report.checks.push(`${stageId}/${width}x${height}: readable HUD, 44px targets, no control overlap${layout.map ? ', larger unobstructed full map' : ', landscape follow'}`);
      if (stageId === 'gravityOverload') {
        await page.evaluate(() => { const g = window.__qaGame; g.bossCombat.dropCore(); g.bossUI.update(); g.render(1000); });
        assert.equal(await page.locator('.item-dock').isVisible(), false);
        assert.equal(await page.locator('#action-button').isVisible(), false);
        assert.equal(await page.locator('.mobile-dpad').isVisible(), true);
        assert.match(await page.locator('#boss-core-hint').innerText(), /靠近發光核心/);
        await page.screenshot({ path: `qa/mobile-layout/gravity-core-${width}x${height}.png` });
      }
    }
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(async () => {
    const g = window.__qaGame; await g.startStage('city'); g.update = () => {};
    g.handleDebug('scenario:SKINCARE');
    const npc = g.npcs.find(n => n.condition); npc.enterHelp(0); npc.reactionTimer = 0;
    g.player.x = npc.x; g.player.y = npc.y;
    g.interactionSystem.findTarget(g.player, g.npcs); g.hud.update(g);
  });
  const nap = await page.locator('[data-item="NAP"]').boundingBox();
  const ppa = await page.locator('[data-item="PPA"]').boundingBox();
  const use = await page.locator('#action-button').boundingBox();
  await page.touchscreen.tap(nap.x + nap.width / 2, nap.y + nap.height / 2);
  await page.touchscreen.tap(use.x + use.width / 2, use.y + use.height / 2);
  assert.equal(await page.evaluate(() => window.__qaGame.scoreManager.wrongItemCount), 1);
  await page.touchscreen.tap(ppa.x + ppa.width / 2, ppa.y + ppa.height / 2);
  await page.touchscreen.tap(use.x + use.width / 2, use.y + use.height / 2);
  assert.equal(await page.evaluate(() => window.__qaGame.npcs.filter(n => n.state === 'RESCUED').length), 1);
  report.checks.push('Native touch selects NAP/PPA; wrong item counts once; correct item rescues once');
  const cdp = await context.newCDPSession(page);
  const up = await page.locator('[data-dir="up"]').boundingBox();
  await page.evaluate(() => {
    const g = window.__qaGame; g.__actionForTouch = g.tryAction;
    window.__touchActions = 0; g.tryAction = function() { window.__touchActions++; };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: up.x + up.width / 2, y: up.y + up.height / 2, id: 1 },
    { x: use.x + use.width / 2, y: use.y + use.height / 2, id: 2 }
  ] });
  assert.equal(await page.evaluate(() => window.__qaGame.input.activeDirectionPointers.size), 1);
  assert.equal(await page.evaluate(() => window.__qaGame.input.getMovementVector().y), -1);
  assert.equal(await page.evaluate(() => window.__touchActions), 1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await page.evaluate(() => window.__qaGame.input.activeDirectionPointers.size), 0);
  await page.evaluate(() => { const g = window.__qaGame; g.tryAction = g.__actionForTouch; });
  report.checks.push('Native two-finger touch holds movement and uses once; release clears direction');
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 24, bottom: 20, left: 0, right: 0 } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const g = window.__qaGame; await g.startStage('gravityOverload'); g.hud.update(g); g.bossUI.update(); g.render(1000);
  });
  const safe = await page.evaluate(() => {
    const g = window.__qaGame, stage = g.stageManager.getStage(), camera = g.getCamera(stage);
    return { padding: g.mobileCameraPadding, mapTop: camera.y, mapBottom: camera.y + stage.world.height * camera.scale,
      dpadBottom: document.querySelector('.mobile-dpad').getBoundingClientRect().bottom };
  });
  assert.equal(safe.padding.top, 146); assert.equal(safe.padding.bottom, 168);
  assert.ok(safe.mapTop >= 146 && safe.mapBottom <= 676);
  assert.ok(safe.dpadBottom <= 816);
  await page.screenshot({ path: 'qa/mobile-layout/gravity-safe-area.png' });
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
  report.checks.push('Emulated 24px notch / 20px home area: HUD, full map and touch controls remain inside safe areas');
  // Orientation changes keep the same encounter and clear held inputs.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => { const g = window.__qaGame; g.update = g.__liveUpdate; });
  await page.locator('[data-dir="up"]').dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch' });
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  assert.equal(await page.evaluate(() => window.__qaGame.input.activeDirectionPointers.size), 0);
  await page.setViewportSize({ width: 667, height: 375 });
  assert.equal(await page.evaluate(() => window.__qaGame.selectedStage), 'gravityOverload');
  await page.locator('#exit-stage-button').click();
  assert.equal(await page.locator('#exit-confirm-modal').isVisible(), true);
  await page.locator('#exit-confirm-secondary').click();
  report.checks.push('Rotation clears held touch, preserves encounter; exit dialog resumes normally');
  // The compact layout must not leak into the earlier stages or Mosquito King.
  await page.setViewportSize({ width: 375, height: 667 });
  for (const id of ['park', 'mountain', 'alienMosquito']) {
    await page.evaluate(id => window.__qaGame.startStage(id), id);
    assert.equal(await page.evaluate(() => document.querySelector('#game-shell').classList.contains('has-compact-mobile-layout')), false);
    assert.equal(await page.evaluate(() => window.__qaGame.mobileCameraPadding), null);
  }
  report.checks.push('Earlier stages and Mosquito King retain their existing framing');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.writeFile('qa/mobile-layout/browser-report.json', JSON.stringify(report, null, 2));
  await browser?.close(); server.kill();
}
