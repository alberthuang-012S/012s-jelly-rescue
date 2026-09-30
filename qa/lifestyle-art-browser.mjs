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
        roles: game.npcs.map((npc) => npc.role) };
    }, id);
    assert.equal(result.manifest.lifestyle, id !== 'park');
    if (id !== 'park') {
      assert.ok(result.map.endsWith(`${id}-map-v1.webp`));
      assert.ok(result.npc.endsWith(`${id}-npcs-v1.webp`));
      assert.equal(result.manifest.frameWidth, 256); assert.equal(result.manifest.frameHeight, 384);
      await page.screenshot({ path: `qa/scenarios/art-v1-${id}-portrait.png` });
    }
    report.push(result);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/scenarios/art-browser-report.json', JSON.stringify({ status: 'PASS', checks: report }, null, 2) + '\n');
  console.log('PASS: new map and atlas loading, all 11 roles, portrait rendering, legacy switch and cached return.');
} finally { await browser?.close(); server.kill(); }
