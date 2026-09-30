import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4175' }, windowsHide: true });
let browser;
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  await page.goto('http://localhost:4175');
  await fs.mkdir('reference/art-layouts', { recursive: true });
  for (const id of ['city', 'sports']) {
    const data = await page.evaluate(async (id) => {
      const { LIFESTYLE_STAGES } = await import('/src/game/LifestyleStages.js');
      const { drawLifestyleMap } = await import('/src/game/LifestyleRenderer.js');
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1536;
      const ctx = canvas.getContext('2d'); ctx.scale(4 / 3, 4 / 3);
      drawLifestyleMap(ctx, LIFESTYLE_STAGES[id]);
      return canvas.toDataURL().split(',')[1];
    }, id);
    await fs.writeFile(`reference/art-layouts/${id}-layout.png`, Buffer.from(data, 'base64'));
  }
} finally { await browser?.close(); server.kill(); }
