import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4194' }, windowsHide: true });
const report = { checks: [], layouts: [], errors: [] };
let browser;
await fs.mkdir('qa/desktop-view', { recursive: true });
const overlaps = (a, b) => a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4194', { waitUntil: 'networkidle' });
  for (const [width, height] of [[961, 521], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const id of ['tutorial', 'park', 'mountain', 'city', 'sports', 'alienMosquito', 'gravityOverload']) {
      await page.evaluate(async id => {
        const g = window.__qaGame; await g.startStage(id); g.closeTutorialModal(); g.update = () => {};
        const stage = g.stageManager.getStage();
        g.player.x = stage.world.width * .64; g.player.y = stage.world.height * .634;
        if (g.bossCombat) {
          g.bossCombat.startArrival(); g.bossCombat.debug('phase3');
          Object.assign(g.bossCombat.boss, { x: 384, y: 730 });
          g.bossCombat.director.clear(); g.bossCombat.boss.enter('CORE_OPEN', 3);
        } else if (id !== 'tutorial') {
          g.npcs.forEach(n => n.clearEvent());
          g.handleDebug(['city', 'sports'].includes(id) ? 'scenario:FALL' : 'soreness');
          const npc = g.npcs.find(n => n.condition) || g.npcs[0];
          if (!npc.condition) npc.startEvent('SORENESS', 15, 2, 0);
          npc.enterHelp(0); npc.reactionTimer = 0;
          npc.x = g.player.x - 70; npc.y = g.player.y;
          g.interactionSystem.findTarget(g.player, g.npcs);
        }
        g.hud.update(g); g.bossUI.update(); g.cameraState = null;
        document.querySelector('#toast-region').replaceChildren();
        for (let i = 0; i < 30; i++) g.render(1000);
      }, id);
      const layout = await page.evaluate(() => {
        const g = window.__qaGame, stage = g.stageManager.getStage(), c = g.getCamera(stage);
        const canvas = g.canvas.getBoundingClientRect();
        const rect = selector => {
          const el = document.querySelector(selector);
          if (!el || getComputedStyle(el).display === 'none') return null;
          const b = el.getBoundingClientRect();
          return { x: b.x - canvas.x, y: b.y - canvas.y, right: b.right - canvas.x, bottom: b.bottom - canvas.y,
            width: b.width, height: b.height, textOverflow: el.scrollWidth > el.clientWidth + 1 };
        };
        const mapLeft = -c.x * c.scale, mapRight = (stage.world.width - c.x) * c.scale;
        return { enabled: g.desktopWideView, viewport: g.viewport, camera: c, mapLeft, mapRight,
          visibleHeight: g.viewport.height / c.scale / stage.world.height,
          left: ['.hud-brand', '.hud-metrics', '.boss-hud', '.objective-chip'].map(rect).filter(Boolean),
          right: ['.hud-right', '#exit-stage-button', '#debug-toggle', '.item-dock', '#action-button'].map(rect).filter(Boolean),
          fontSizes: g.npcs.filter(n => n.hasStatusBubble()).map(n => n.getStatusLayout(g.ctx, 1000, { cameraScale: c.scale }).screenFontSize) };
      });
      const label = `${id}/${width}x${height}`;
      assert.equal(layout.enabled, true, label);
      assert.ok(layout.visibleHeight > .55 && layout.visibleHeight < .58, label);
      assert.ok(Math.abs(layout.mapLeft - (layout.viewport.width - layout.mapRight)) < .01, label);
      assert.ok(layout.fontSizes.every(size => size >= 17), label);
      for (const [side, rects] of [['left', layout.left], ['right', layout.right]]) {
        for (const box of rects) {
          assert.ok(box.y >= 0 && box.bottom <= layout.viewport.height + 1, `${label}: ${side} vertical bounds ${JSON.stringify(box)}`);
          assert.ok(side === 'left' ? box.right <= layout.mapLeft + 1 : box.x >= layout.mapRight - 1, `${label}: ${side} rail ${JSON.stringify(box)}`);
          assert.equal(box.textOverflow, false, `${label}: ${side} overflow`);
        }
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          assert.equal(overlaps(rects[i], rects[j]), false, `${label}: ${side} controls overlap ${i}/${j}`);
        }
      }
      report.layouts.push({ label, visibleHeight: layout.visibleHeight, mapLeft: layout.mapLeft, mapRight: layout.mapRight });
      if (id === 'city') {
        await page.locator('#debug-toggle').click();
        await page.locator('#debug-close').click();
        assert.equal(await page.locator('#debug-panel').isVisible(), false);
      }
      if ((width === 1366 && ['city', 'sports', 'mountain', 'gravityOverload', 'alienMosquito'].includes(id)) || (width === 961 && id === 'city')) {
        await page.screenshot({ path: `qa/desktop-view/${id}-${width}x${height}.png` });
      }
    }
    report.checks.push(`${width}x${height}: seven stages show 55–58% height, centered map, readable bubbles and nonoverlapping side rails`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(async () => {
    const g = window.__qaGame; await g.startStage('city'); g.update = () => {};
    g.npcs.forEach(n => n.clearEvent()); g.handleDebug('scenario:FALL');
    const npc = g.npcs.find(n => n.condition); npc.enterHelp(0); npc.reactionTimer = 0;
    g.player.x = npc.x; g.player.y = npc.y; g.interactionSystem.findTarget(g.player, g.npcs); g.hud.update(g);
  });
  await page.locator('[data-item="NAP"]').click();
  await page.locator('#action-button').click();
  assert.equal(await page.evaluate(() => window.__qaGame.npcs.some(n => n.state === 'RESCUED')), true);
  await page.locator('#exit-stage-button').click();
  await page.locator('#exit-confirm-secondary').click();
  assert.equal(await page.evaluate(() => window.__qaGame.isExitConfirmOpen), false);
  report.checks.push('Side-rail NAP click rescues once; exit confirmation resumes correctly');
  await page.evaluate(() => {
    const g = window.__qaGame; g.npcs.forEach(n => n.clearEvent()); g.handleDebug('soreness');
    const npc = g.npcs.find(n => n.condition); npc.enterHelp(0); npc.x = 384; npc.y = 20;
    g.player.x = 384; g.player.y = 800; g.cameraState = null; g.render(1000);
  });
  const indicator = await page.locator('.rescue-indicator:not(.is-hidden)').first().boundingBox();
  assert.ok(indicator);
  const mapRect = await page.evaluate(() => {
    const g = window.__qaGame, c = g.getCamera(g.stageManager.getStage()), canvas = g.canvas.getBoundingClientRect();
    return { left: canvas.x - c.x * c.scale, right: canvas.x + (g.stageManager.getStage().world.width - c.x) * c.scale };
  });
  assert.ok(indicator.x >= mapRect.left && indicator.x + indicator.width <= mapRect.right);
  assert.match(await page.locator('.rescue-indicator:not(.is-hidden)').first().innerText(), /求救/);
  for (const id of ['alienMosquito', 'gravityOverload']) {
    await page.evaluate(async id => {
      const g = window.__qaGame; await g.startStage(id); g.update = () => {};
      g.bossCombat.startArrival(); g.bossCombat.debug('phase3'); g.bossCombat.dropCore(); g.bossUI.update();
    }, id);
    assert.equal(await page.locator('.item-dock').isVisible(), false);
    assert.equal(await page.locator('#action-button').isVisible(), false);
    assert.match(await page.locator('#boss-core-hint').innerText(), /靠近發光核心/);
    await page.evaluate(() => {
      const g = window.__qaGame, core = g.bossCombat.coreDrop;
      g.player.x = core.x; g.player.y = core.y; g.bossCombat.update(.016);
    });
    assert.equal(await page.evaluate(() => window.__qaGame.bossCombat.state), 'CLEAR');
  }
  report.checks.push('Offscreen help retains its direction label; both Boss cores remain physical pickups');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.__qaGame.desktopWideView === false);
  assert.equal(await page.locator('#game-shell').evaluate(el => el.classList.contains('is-desktop-wide')), false);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForFunction(() => window.__qaGame.desktopWideView === true);
  report.checks.push('Resizing to phone landscape removes desktop rails and resizing back restores them');
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
  await fs.writeFile('qa/desktop-view/browser-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, checks: report.checks }));
} finally { await browser?.close(); server.kill(); }
