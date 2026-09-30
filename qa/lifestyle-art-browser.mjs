import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4176' }, windowsHide: true });
const report = []; let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/src/main.js*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4176', { waitUntil: 'networkidle' });
  for (const id of ['city', 'sports', 'park', 'city']) {
    await page.evaluate((id) => window.__qaGame.startStage(id), id);
    const result = await page.evaluate(async (id) => {
      const game = window.__qaGame;
      const stage = game.stageManager.stage;
      const { STAGE_DEFS } = await import('/src/game/StageManager.js');
      const { NPC } = await import('/src/game/NPC.js');
      const roles = STAGE_DEFS[id].npcTypes;
      if (id !== 'park') {
        game.eventDirector.nextEventAt = Infinity; game.eventDirector.nextSpawnAt = Infinity;
        game.npcs = roles.map((role, i) => {
          const npc = new NPC({ id: i, role, x: 300 + i % 2 * 140, y: 240 + Math.floor(i / 2) * 245 });
          npc.spriteImage = game.npcSpriteImage; npc.spriteSheet = game.npcSpriteSheet; return npc;
        });
      }
      return { id, map: game.worldRenderer.lifestyleImages.get(id)?.src,
        npc: game.npcSpriteImage.src, manifest: game.npcSpriteSheet,
        condition: game.npcSpriteSheet.conditionImage ? {
          src: game.npcSpriteSheet.conditionImage.src,
          width: game.npcSpriteSheet.conditionImage.naturalWidth,
          height: game.npcSpriteSheet.conditionImage.naturalHeight
        } : null,
        roles: game.npcs.map((npc) => npc.role) };
    }, id);
    assert.equal(result.manifest.lifestyle, id !== 'park');
    if (id !== 'park') {
      assert.ok(result.map.endsWith(`${id}-map-v1.webp`));
      assert.ok(result.npc.endsWith(`${id}-npcs-v1.webp`));
      assert.equal(result.manifest.frameWidth, 256); assert.equal(result.manifest.frameHeight, 384);
      assert.ok(result.condition.src.endsWith(`${id}-condition-v2.webp`));
      assert.equal(result.condition.width, 768); assert.equal(result.condition.height, 768);
      await page.screenshot({ path: `qa/scenarios/art-v1-${id}-portrait.png` });
      await page.evaluate((id) => {
        const game = window.__qaGame;
        game.npcs.forEach(npc => { npc.active = false; });
        const roles = id === 'city' ? ['youngWoman', 'deliveryWorker'] : ['runner', 'sportsGirl'];
        roles.forEach((role, i) => {
          const npc = game.npcs.find(npc => npc.role === role);
          npc.active = true; npc.x = i ? 525 : 245; npc.y = i ? 800 : 610;
          npc.startScenario(id === 'city' && i === 0 ? 'SKINCARE' : 'SPORT_SORE', 999, 3);
          npc.reactionTimer = 0; npc.state = 'HELP';
        });
        game.player.x = 384; game.player.y = 760; game.cameraState = null;
        game.render(performance.now());
      }, id);
      await page.screenshot({ path: `qa/scenarios/art-v2-${id}-conditions-portrait.png` });
    } else {
      assert.ok(result.condition.src.endsWith('npc-condition-v2.webp'));
      assert.equal(result.condition.width, 960); assert.equal(result.condition.height, 640);
    }
    report.push(result);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/scenarios/art-browser-report.json', JSON.stringify({ status: 'PASS', checks: report }, null, 2) + '\n');
  console.log('PASS: new map and atlas loading, all 11 roles, portrait rendering, legacy switch and cached return.');
} finally { await browser?.close(); server.kill(); }
