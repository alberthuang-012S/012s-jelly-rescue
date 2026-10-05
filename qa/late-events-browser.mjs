import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4195' }, windowsHide: true });
const report = { checks: [], errors: [] };
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4195', { waitUntil: 'networkidle' });
  // Step the actual Game update manually so assertions are independent of RAF timing.
  await page.evaluate(() => { const g = window.__qaGame; g.tailUpdate = g.update.bind(g); g.update = () => {}; });
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const stageId of ['park', 'mountain', 'city', 'sports', 'garden']) {
      for (const rescue of [false, true]) {
        const result = await page.evaluate(async ({ stageId, rescue }) => {
          const g = window.__qaGame;
          await g.startStage(stageId); g.gardenIntro?.close();
          const stage = g.stageManager.getStage(), npc = g.npcs[0];
          g.npcs = [npc]; npc.clearEvent(0); npc.path = []; npc.wanderWait = 999;
          npc.x = stage.start.x + 32; npc.y = stage.start.y;
          g.stageManager.elapsed = 59; g.eventDirector.nextEventAt = 59; g.eventDirector.nextSpawnAt = Infinity;
          g.tailUpdate(.05);
          const spawned = { state: npc.state, condition: npc.condition, at: npc.eventStartedAt, tolerance: npc.maxTolerance };
          if (rescue) {
            g.selectItem({ ITCH: 'PPA', SORENESS: 'NAP', PIGMENTATION: 'DDM', SALLOWNESS: 'SSW' }[npc.condition]);
            g.tryAction();
          }
          const afterAction = npc.state;
          g.stageManager.elapsed = 59.98; g.tailUpdate(.05);
          const settled = { state: g.state, remaining: g.stageManager.getRemaining(), lives: g.lives, ...g.scoreManager.getResult() };
          g.tailUpdate(20);
          return { spawned, afterAction, settled, frozen: g.lives === settled.lives && g.scoreManager.failedCount === settled.failedCount, resultVisible: !g.resultScreen.screen.classList.contains('is-hidden') };
        }, { stageId, rescue });
        assert.equal(result.spawned.state, 'WARNING', `${stageId}: automatic event at 59s`);
        assert.ok(result.spawned.at >= 59 && result.spawned.tolerance > 1);
        assert.equal(result.afterAction, rescue ? 'RESCUED' : 'WARNING');
        assert.equal(result.settled.state, 'result'); assert.equal(result.settled.remaining, 0);
        assert.equal(result.settled.rescuedCount, rescue ? 1 : 0);
        assert.equal(result.settled.failedCount, 0); assert.equal(result.settled.lives, 3);
        assert.equal(result.resultVisible, true); assert.equal(result.frozen, true);
        report.checks.push({ width, height, stageId, rescue, ...result });
      }
    }
  }
  assert.deepEqual(report.errors, []);
  await fs.writeFile('qa/late-events-browser-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Late-event browser QA: ${report.checks.length} checks passed`);
} finally {
  await browser?.close(); server.kill();
}
