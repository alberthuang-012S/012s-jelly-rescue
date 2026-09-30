import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4178' }, windowsHide: true });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/src/main.js*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4178', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.__qaGame.startStage('sports'));
  assert.equal(await page.evaluate(() => window.__qaGame.npcSpriteSheet.injuryImage.naturalHeight), 1536);
  assert.ok(await page.evaluate(() => window.__qaGame.npcSpriteSheet.injuryImage.src.endsWith('sports-injury-v1.webp')));
  await page.evaluate(() => window.__qaGame.startStage('city'));
  assert.equal(await page.evaluate(() => window.__qaGame.npcSpriteSheet.injuryImage), null);
  await page.goto('http://localhost:4178/qa/injury-preview.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__injuryPreview));
  await page.locator('#replay').click();
  const before = await page.evaluate(() => window.__injuryPreview.npcs.map((npc) => window.__injuryPreview.injuryPose(npc).frame));
  assert.deepEqual(before, [0, 0, 0, 0]);
  await page.waitForFunction(() => window.__injuryPreview.npcs.every((npc) => npc.reactionTimer === 0));
  assert.deepEqual(await page.evaluate(() => window.__injuryPreview.npcs.slice(0, 2).map((npc) => window.__injuryPreview.injuryPose(npc).frame)), [2, 2]);
  await page.locator('canvas').screenshot({ path: 'qa/scenarios/injury-v1-hold-preview.png' });
  await page.locator('#rescue').click();
  assert.equal(await page.evaluate(() => window.__injuryPreview.npcs.every((npc) => window.__injuryPreview.injuryPose(npc) === null)), true);
  await page.waitForFunction(() => window.__injuryPreview.npcs.every((npc) => npc.state === 'NORMAL'));
  await page.locator('canvas').screenshot({ path: 'qa/scenarios/injury-v1-recovered-preview.png' });
  await page.locator('#replay').click();
  assert.deepEqual(await page.evaluate(() => window.__injuryPreview.npcs.map((npc) => window.__injuryPreview.injuryPose(npc).frame)), [0, 0, 0, 0]);
  assert.deepEqual(errors, []);
  await fs.writeFile('qa/scenarios/injury-browser-report.json', JSON.stringify({ status: 'PASS',
    checks: ['Sports decoded injury atlas', 'City uses normal atlas', 'Four onset poses',
      'Fall holds final pose', 'Rescue returns to normal', 'Replay restarts from onset'], errors }, null, 2) + '\n');
  console.log('PASS: injury loading, four character sequences, hold, rescue, recovery and replay.');
} finally { await browser?.close(); server.kill(); }
