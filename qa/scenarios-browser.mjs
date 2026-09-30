import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Optional browser QA; npm test stays dependency-free. Set the module path to
// a locally installed/bundled Playwright package when it is not on NODE_PATH.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa', 'scenarios');
await fs.mkdir(output, { recursive: true });
const port = process.env.JELLY_QA_PORT || '4174';
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, JELLY_PORT: port }, windowsHide: true });
const ready = new Promise((resolve, reject) => {
  server.stdout.once('data', resolve); server.once('error', reject);
  server.once('exit', (code) => reject(new Error(`QA server exited ${code}`)));
});
const report = { viewports: [], errors: [], checks: [] };
let browser;
try {
  await ready;
  browser = await chromium.launch({ headless: true, channel: process.env.JELLY_BROWSER_CHANNEL || 'msedge' });
  for (const [name, viewport, mobile] of [
    ['desktop', { width: 1280, height: 900 }, false],
    ['portrait', { width: 390, height: 844 }, true],
    ['small-portrait', { width: 375, height: 667 }, true]
  ]) {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push(`${name}: ${error.message}`));
    page.on('response', (response) => { if (response.status() >= 400) report.errors.push(`${name}: HTTP ${response.status()} ${response.url()}`); });
    // Expose the existing Game only in the intercepted QA response. Production
    // code never receives a debug global or a second game loop.
    await page.route('**/src/main.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
    });
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__qaGame));
    assert.equal(await page.locator('[data-stage-select]').count(), 5);
    await page.screenshot({ path: path.join(output, `${name}-home.png`) });
    report.viewports.push({ name, ...viewport });

    for (const stageId of ['tutorial', 'park', 'mountain', 'city', 'sports']) {
      await page.evaluate(() => window.__qaGame.showHome());
      await page.locator(`[data-stage-select='${stageId}']`).click();
      await page.locator('#start-button').click();
      await page.waitForFunction((id) => window.__qaGame.state === 'playing' && window.__qaGame.selectedStage === id, stageId);
      assert.equal(await page.locator('#loading-overlay').isVisible(), false);
      if (stageId === 'tutorial') {
        await page.locator('#tutorial-modal-primary').click();
        await page.evaluate(() => { window.__qaGame.player.distanceTravelled = 160; });
        await page.waitForFunction(() => window.__qaGame.tutorialModalMode === 'itch');
        for (const next of ['soreness', 'final-check', 'complete']) {
          await page.locator('#tutorial-modal-primary').click();
          await page.evaluate(() => {
            const game = window.__qaGame; const npc = game.npcs.find((npc) => npc.state === 'HELP');
            game.player.x = npc.x; game.player.y = npc.y;
            game.selectItem(npc.condition === 'ITCH' ? 'PPA' : 'NAP'); game.tryAction();
          });
          await page.waitForFunction((mode) => window.__qaGame.tutorialModalMode === mode, next);
        }
        assert.equal(await page.evaluate(() => window.__qaGame.lives), 3);
        report.checks.push(`${name}: tutorial movement, three rescues, untimed completion`);
        continue;
      }
      // Keep Mountain's reward available in a separate regression test; normal
      // rescue QA must not be stopped by its modal on the second rescue.
      await page.evaluate(() => { window.__qaGame.evolutionStore.state = { capsule: false, evolved: true }; window.__qaGame.syncEvolution(); });
      const before = await page.evaluate(() => ({ x: window.__qaGame.player.x, y: window.__qaGame.player.y }));
      if (mobile) {
        await page.locator('[data-dir="up"]').dispatchEvent('pointerdown', { pointerId: 41, pointerType: 'touch' });
        await page.waitForTimeout(200);
        await page.locator('[data-dir="up"]').dispatchEvent('pointerup', { pointerId: 41, pointerType: 'touch' });
      } else {
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(200); await page.keyboard.up('ArrowUp');
      }
      assert.ok(await page.evaluate((before) => window.__qaGame.player.y < before.y - 10, before));
      if (!mobile) {
        await page.keyboard.press('KeyQ');
        assert.equal(await page.evaluate(() => window.__qaGame.itemSystem.selectedId), 'NAP');
        await page.keyboard.press('KeyQ');
      }
      await page.evaluate(() => { window.__qaGame.eventDirector.nextEventAt = Infinity; window.__qaGame.eventDirector.nextSpawnAt = Infinity; });

      const types = ['city', 'sports'].includes(stageId) ? ['SKINCARE', 'OUTDOOR_SKIN', 'GRASS_SKIN', 'FALL', 'SPORT_SORE', 'LONG_WALK'] : ['itch', 'soreness'];
      for (const type of types) {
        await page.evaluate(() => { const game = window.__qaGame; game.npcs.forEach((npc) => npc.clearEvent()); game.stageManager.elapsed = 10; });
        await page.locator('#debug-toggle').click();
        await page.locator(`[data-debug='${type === 'itch' || type === 'soreness' ? type : `scenario:${type}`}']`).click();
        const state = await page.evaluate(() => {
          const game = window.__qaGame; const npc = game.npcs.find((npc) => npc.condition);
          game.player.x = npc.x; game.player.y = npc.y;
          const correct = npc.condition === 'ITCH' ? 'PPA' : 'NAP';
          game.selectItem(correct === 'PPA' ? 'NAP' : 'PPA'); game.tryAction();
          return { role: npc.role, type: npc.scenarioType, state: npc.state, dialogue: npc.dialogueOverride, wrongCount: game.scoreManager.wrongItemCount, correct };
        });
        assert.ok(state.wrongCount > 0); assert.notEqual(state.state, 'RESCUED'); assert.ok(state.dialogue && !state.dialogue.includes('WRONG'));
        if (types.length > 2) assert.equal(state.type, type);
        await page.locator('#debug-close').click();
        await page.evaluate(() => { window.__qaGame.npcs.forEach((npc) => { npc.dialogueOverride = ''; }); });
        if (type === 'FALL' || type === 'SKINCARE') {
          await page.waitForTimeout(350);
          await page.screenshot({ path: path.join(output, `${name}-${stageId}-${type.toLowerCase()}.png`) });
        }
        await page.locator(`[data-item='${state.correct}']`).dispatchEvent('pointerdown', { pointerId: 42, pointerType: mobile ? 'touch' : 'mouse' });
        if (mobile) await page.locator('#action-button').dispatchEvent('pointerdown', { pointerId: 43, pointerType: 'touch' });
        else await page.keyboard.press('KeyE');
        assert.equal(await page.evaluate(() => window.__qaGame.npcs.some((npc) => npc.state === 'RESCUED')), true);
      }
      if (types.length > 2) {
        // Validate screen-space text at all four map edges using real canvas
        // transforms and text metrics, not only the model coordinates.
        const clipped = await page.evaluate(async () => {
          const { SCENARIO_DEFS, scenarioDialogue } = await import('/src/game/ScenarioDefinitions.js');
          const dialogueStates = ['WARNING', 'HELP', 'CRITICAL'];
          const game = window.__qaGame; game.npcs.forEach((npc) => npc.clearEvent());
          const stage = game.stageManager.getStage(); const npc = game.npcs[0];
          const labels = new Set(Object.keys(SCENARIO_DEFS).flatMap(type => dialogueStates.map(state => scenarioDialogue(npc.role, type, state, stage.id))));
          const errors = []; let checked = 0; const ctx = game.ctx; const original = ctx.fillText;
          ctx.fillText = function(text, x, y, ...rest) {
            if (labels.has(text)) {
              checked += 1;
              const matrix = this.getTransform(); const point = matrix.transformPoint({ x, y });
              const width = this.measureText(text).width * matrix.a;
              const left = (point.x - width / 2) / game.pixelRatio;
              const right = (point.x + width / 2) / game.pixelRatio;
              if (left < 0 || right > game.viewport.width || point.y / game.pixelRatio < 0 || point.y / game.pixelRatio > game.viewport.height) errors.push({ left, right, y: point.y / game.pixelRatio });
            }
            return original.call(this, text, x, y, ...rest);
          };
          for (const type of Object.keys(SCENARIO_DEFS)) for (const state of dialogueStates)
            for (const point of [{ x: 30, y: 30 }, { x: stage.world.width - 30, y: 30 }, { x: 30, y: stage.world.height - 30 }, { x: stage.world.width - 30, y: stage.world.height - 30 }]) {
              npc.clearEvent(); npc.x = point.x; npc.y = point.y; npc.startScenario(type, 10, 3); npc.state = state;
              game.player.x = point.x; game.player.y = point.y; game.cameraState = null; game.render(performance.now());
            }
          ctx.fillText = original; npc.clearEvent(); game.player.reset(stage.start);
          if (checked !== 72) errors.push({ expectedDialogueDraws: 72, actual: checked });
          return errors;
        });
        assert.deepEqual(clipped, []);
        await page.evaluate(() => {
          const game = window.__qaGame; game.stageManager.elapsed = 45;
          const [a, b] = game.npcs; a.clearEvent(); b.clearEvent();
          a.x = 340; a.y = 780; b.x = 445; b.y = 620;
          a.startScenario('SKINCARE', 10, 3, 45); b.startScenario('SPORT_SORE', 10, 3, 45);
          game.player.x = 384; game.player.y = 790;
        });
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(output, `${name}-${stageId}-simultaneous.png`) });
        assert.equal(await page.evaluate(() => window.__qaGame.npcs.filter((npc) => ['WARNING', 'HELP', 'CRITICAL'].includes(npc.state)).length), 2);
      }
      await page.evaluate(() => { const game = window.__qaGame; game.npcs.forEach((npc) => npc.clearEvent()); game.stageManager.elapsed = 59.98; game.update(.05); });
      await page.waitForFunction(() => window.__qaGame.state === 'result');
      assert.equal(await page.locator('.rescue-statistics:visible b').count(), 4);
      assert.equal(await page.locator('#result-next').isVisible(), stageId !== 'sports');
      await page.screenshot({ path: path.join(output, `${name}-${stageId}-result.png`) });
      if (stageId !== 'sports') {
        await page.locator('#result-next').click();
        await page.waitForFunction(() => window.__qaGame.state === 'playing');
        const expected = { park: 'mountain', mountain: 'city', city: 'sports' }[stageId];
        assert.equal(await page.evaluate(() => window.__qaGame.selectedStage), expected);
        await page.evaluate(async (id) => { const game = window.__qaGame; await game.startStage(id); game.finishStage(); }, stageId);
      }
      await page.locator('#result-replay').click();
      await page.waitForFunction(() => window.__qaGame.state === 'playing');
      assert.equal(await page.evaluate(() => window.__qaGame.scoreManager.rescuedCount), 0);
      await page.locator('#exit-stage-button').click();
      const pausedAt = await page.evaluate(() => window.__qaGame.stageManager.elapsed);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.__qaGame.stageManager.elapsed), pausedAt);
      await page.locator('#exit-confirm-secondary').click();
      assert.equal(await page.evaluate(() => window.__qaGame.input.enabled), true);
      await page.evaluate(() => { const game = window.__qaGame; game.lives = 1; game.debug.infiniteLife = false; game.handleFailure(game.npcs[0]); });
      assert.equal(await page.locator('#gameover-screen').isVisible(), true);
      assert.equal(await page.locator('#gameover-screen .rescue-statistics b').count(), 4);
      await page.locator('#gameover-replay').click();
      await page.waitForFunction(() => window.__qaGame.state === 'playing');
      await page.locator('#exit-stage-button').click(); await page.locator('#exit-confirm-primary').click();
      assert.equal(await page.locator('#home-screen').isVisible(), true);
      report.checks.push(`${name}: ${stageId} start/end, items, wrong feedback, controls, result, restart, next-stage, exit/pause, game-over${types.length > 2 ? ', all scenario force, bubbles, simultaneous' : ''}`);
    }
    if (name === 'desktop') {
      await page.evaluate(async () => {
        const game = window.__qaGame; game.evolutionStore.state = { capsule: false, evolved: false };
        game.syncEvolution(); game.playerAssetPromise = null; await game.startStage('mountain');
        game.eventDirector.nextEventAt = Infinity;
        game.eventDirector.nextSpawnAt = Infinity;
      });
      for (let rescue = 0; rescue < 2; rescue += 1) {
        await page.evaluate(() => {
          const game = window.__qaGame; const npc = game.npcs.find((npc) => npc.state === 'NORMAL');
          npc.startEvent('ITCH', 10, 3, game.stageManager.elapsed); game.player.x = npc.x; game.player.y = npc.y;
          game.selectItem('PPA'); game.tryAction();
        });
      }
      assert.equal(await page.locator('dialog').isVisible(), true);
      await page.locator('dialog button').click();
      await page.evaluate(() => window.__qaGame.finishStage());
      await page.locator('dialog button').click();
      await page.waitForFunction(() => window.__qaGame.evolutionStore.state.evolved && document.querySelector('dialog button').textContent === '太棒了，查看結算');
      await page.locator('dialog button').click();
      assert.deepEqual(await page.evaluate(() => ({ ...window.__qaGame.evolutionStore.state, speed: window.__qaGame.player.speed })), { capsule: false, evolved: true, speed: 256.25 });
      await page.locator('#result-next').click(); await page.waitForFunction(() => window.__qaGame.state === 'playing');
      assert.equal(await page.evaluate(() => window.__qaGame.selectedStage), 'city');
      assert.equal(await page.evaluate(() => window.__qaGame.player.speed), 256.25);
      report.checks.push('desktop: Mountain reward/evolution modal, consumption, permanent speed and City continuation');
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; console.error(error); process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); server.kill();
}
