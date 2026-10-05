import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: '4193' }, windowsHide: true });
const report = { checks: [], layouts: [], errors: [] };
let browser;
await fs.mkdir('qa/home', { recursive: true });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto('http://localhost:4193', { waitUntil: 'networkidle' });
  for (const [width, height] of [[1440, 900], [1280, 900], [1366, 768], [1024, 768], [768, 1024], [375, 667], [390, 844], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.__qaGame.showHome(); document.querySelector('#home-screen').scrollTop = 0; });
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return { copy: rect('.home-copy'), lede: rect('.home-lede'), character: rect('.home-character-crop'), panel: rect('.stage-selector-panel'),
        primary: rect('#start-button'), challenges: rect('.home-challenges'), collection: rect('.collection-home-button'),
        specials: [rect('.special-stage-card'), rect('.gravity-stage-card')],
        buttons: ['#start-button', '#special-start', '#gravity-start', '.collection-home-button'].map(rect),
        bodyWidth: document.body.scrollWidth, homeHeight: document.querySelector('#home-screen').scrollHeight };
    });
    report.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `qa/home/home-${width}x${height}.png` });
    assert.ok(layout.bodyWidth <= width);
    for (const r of [...layout.buttons, layout.copy, layout.panel, ...layout.specials]) assert.ok(r.x >= 0 && r.right <= width + 1, `${width}: horizontal overflow ${JSON.stringify(r)}`);
    if (width >= 1024 && height >= 768) {
      assert.ok(layout.copy.y < 90, `${width}: title starts too low`);
      assert.ok(layout.primary.bottom < height);
      assert.ok(layout.specials[0].right < layout.specials[1].x);
      assert.ok(layout.character.y >= layout.lede.bottom + 3 || layout.character.x >= layout.lede.right + 8, `${width}: hero overlaps the intro ${JSON.stringify(layout)}`);
      assert.ok(layout.buttons.every(r => r.bottom <= height), `${width}: challenge entry below the first screen ${JSON.stringify(layout)}`);
    }
    if (width <= 680 && height > width) assert.ok(layout.character.height >= 60, 'Portrait mascot must not collapse in the scroll layout');
    for (const id of ['tutorial', 'park', 'mountain', 'city', 'sports']) {
      await page.locator(`[data-stage-select="${id}"]`).click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
      assert.equal(await page.locator('#home-featured-stage').getAttribute('data-stage'), id);
      assert.equal(await page.locator('#start-button span').first().innerText(), id === 'tutorial' ? '開始教學' : '開始巡邏');
      assert.equal(await page.locator('#home-stage-preview').evaluate(img => img.complete && img.naturalWidth > 0), true);
      assert.equal(await page.locator('#home-featured-stage').evaluate(el => [...el.querySelectorAll('h2, p')].every(node => node.scrollWidth <= node.clientWidth + 1)), true);
      if (width === 1366) await page.screenshot({ path: `qa/home/stage-${id}-1366.png` });
    }
    await page.locator('.collection-home-button').click();
    assert.equal(await page.locator('#core-collection-dialog').evaluate(el => el.open), true);
    await page.locator('#core-collection-close').click();
    assert.equal(await page.evaluate(() => document.activeElement.matches('.collection-home-button')), true);
    await page.locator('#gravity-start').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `qa/home/challenges-${width}x${height}.png` });
    report.checks.push(`${width}x${height}: all mission tabs update preview/CTA, cards reachable, collection opens and restores focus`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => window.__qaGame.showHome());
  await page.locator('[data-stage-select="tutorial"]').click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'park');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'sports');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'tutorial');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'sports');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'tutorial');
  assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'start-button');
  assert.equal(await page.evaluate(() => window.__qaGame.input.keys.size), 0);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__qaGame.state === 'playing');
  assert.equal(await page.evaluate(() => window.__qaGame.selectedStage), 'tutorial');
  report.checks.push('Arrow/Home/End navigation, wrapping, one tab stop, clear focus, Enter starts selected mission');
  for (const [button, id] of [['#special-start', 'alienMosquito'], ['#gravity-start', 'gravityOverload']]) {
    await page.evaluate(() => window.__qaGame.showHome());
    await page.locator(button).click();
    await page.waitForFunction(id => window.__qaGame.state === 'playing' && window.__qaGame.selectedStage === id, id);
  }
  report.checks.push('Both distinct Boss entries start their respective encounters');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ checks: report.checks, errors: report.errors }, null, 2));
} finally {
  await fs.writeFile('qa/home/browser-report.json', JSON.stringify(report, null, 2));
  await browser?.close(); server.kill();
}
