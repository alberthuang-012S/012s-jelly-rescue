import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const port = '4190';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, JELLY_PORT: port }, windowsHide: true });
let browser; const report = { checks: [], errors: [] };
await fs.mkdir('qa/gravity', { recursive: true });
try {
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('new Game();', 'window.__qaGame = new Game();') });
  });
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => window.__qaGame.gravityRenderer.art.boss.naturalWidth), 1152);
  await page.locator('#gravity-start').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'qa/gravity/art-v1-home.png' });
  for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['portrait', { width: 390, height: 844 }], ['small', { width: 375, height: 667 }]]) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      const g = window.__qaGame; await g.startStage('gravityOverload'); g.debug.infiniteLife = true;
      if (!g.__originalUpdate) g.__originalUpdate = g.update;
      g.update = () => {};
      const r = g.gravityRenderer;
      if (!r.__originalSprite) {
        r.__originalSprite = r.sprite;
        r.sprite = function(ctx, image, frame, ...args) {
          (window.__gravityDraws ||= []).push({ src: image.src, frame });
          return this.__originalSprite(ctx, image, frame, ...args);
        };
      }
    });
    const loaded = await page.evaluate(() => {
      const g = window.__qaGame, r = g.gravityRenderer;
      return { map: g.worldRenderer.gravityImage.src, themed: r.hasGravityMap,
        paths: ['stiff', 'stomper', 'heavy'].map(id => r.art[id].src), core: r.art.core.naturalWidth, device: r.art.device.naturalWidth,
        widths: ['stiff', 'stomper', 'heavy', 'boss'].map(id => r.art[id].naturalWidth) };
    });
    assert.match(loaded.map, /gravity-map-v1/); assert.equal(loaded.themed, true);
    assert.deepEqual(loaded.widths, [768, 768, 768, 1152]);
    assert.match(loaded.paths[0], /-v2\.webp/); assert.match(loaded.paths[1], /-v3\.webp/); assert.match(loaded.paths[2], /-v2\.webp/);
    assert.equal(loaded.core, 256); assert.equal(loaded.device, 256);
    const devices = await page.evaluate(() => {
      const g = window.__qaGame, calls = [];
      const ctx = new Proxy(g.ctx, {
        get(target, key) { if (key === 'translate') return (...args) => { calls.push(args); target.translate(...args); };
          const value = target[key]; return typeof value === 'function' ? value.bind(target) : value; },
        set(target, key, value) { target[key] = value; return true; }
      });
      g.gravityRenderer.atmosphere(ctx, g.bossCombat); return calls;
    });
    assert.deepEqual(devices.filter(([x]) => x !== 0), [[384, 576]]);
    report.checks.push(`${name}: armored v3 stomper, distinct mobs and illustrated central device`);
    const expected = { wave: null, warning: [2, 2, 2], attack: [3, 3, 3], hit: [4, 4, 4], both: 1, right: 2, left: 3, impact: 4, core: 5, fatigue: 6, recoil: 7, float: 8 };
    for (const mode of Object.keys(expected)) {
      const draws = await page.evaluate(mode => {
        const g = window.__qaGame, c = g.bossCombat; c.visualTime = .2; c.ground.clear();
        g.gravityRenderer.defeated = []; g.gravityRenderer.previous = new Map();
        if (['wave', 'warning', 'attack', 'hit'].includes(mode)) {
          c.debug('wave3'); g.player.x = 384; g.player.y = 1020;
          c.director.enemies.forEach((e, i) => {
            e.x = [270, 510, 340][i]; e.y = i < 2 ? 760 : 900;
            e.state = mode === 'warning' ? 'TELEGRAPH' : mode === 'attack' ? e.type === 'gravityStomper' ? 'RECOVER' : 'DASH' : 'CHASE';
            e.hitFlash = mode === 'hit' ? .2 : 0;
            e.attackTimer = mode === 'warning' ? .1 : 1.5;
            if (mode === 'attack' && e.type === 'gravityHeavy') c.ground.add({ x: 550, y: 950, kind: 'crystal', owner: e.id });
          });
        } else {
          if (!c.boss) c.startArrival(); c.debug('phase3'); c.director.clear();
          Object.assign(c.boss, { x: 384, y: 820, phase: mode === 'both' ? 1 : 2, attackIndex: mode === 'left' ? 1 : 0, hitFlash: mode === 'recoil' ? .2 : 0 });
          g.player.x = 490; g.player.y = 820;
          c.boss.enter(['core', 'recoil'].includes(mode) ? 'CORE_OPEN' : mode === 'fatigue' ? 'FATIGUE' : mode === 'impact' ? 'IMPACT' : 'TELEGRAPH', 2);
          if (['both', 'left', 'right', 'impact'].includes(mode)) c.ground.add({ x: 490, y: 820, radius: 115 });
          if (mode === 'float') { c.state = 'VICTORY'; c.timer = 2.7; }
        }
        g.bossUI.update(); g.cameraState = null; window.__gravityDraws = []; g.render(1000);
        return window.__gravityDraws;
      }, mode);
      if (Array.isArray(expected[mode])) assert.deepEqual(draws.map(d => d.frame), expected[mode]);
      else if (expected[mode] !== null) assert.ok(draws.some(d => /gravity-boss/.test(d.src) && d.frame === expected[mode]), `${name}/${mode}: ${JSON.stringify(draws)}`);
      if (['wave', 'warning', 'left', 'core', 'fatigue', 'float'].includes(mode)) await page.screenshot({ path: `qa/gravity/art-v3-${name}-${mode}.png` });
      if (name === 'portrait' && mode === 'wave') await page.locator('#game-canvas').screenshot({ path: 'qa/gravity/art-v3-preview.png' });
      report.checks.push(`${name}/${mode}: correct live atlas frames`);
    }
    // Rendering a paused frame twice must produce identical canvas pixels.
    const frozen = await page.evaluate(() => {
      const g = window.__qaGame; g.render(1000); const first = g.canvas.toDataURL(); g.render(1000);
      return first === g.canvas.toDataURL();
    });
    assert.equal(frozen, true); report.checks.push(`${name}: paused artwork stays pixel-identical`);
    for (const mode of ['release', 'collect', 'clear']) {
      const props = await page.evaluate(mode => {
        const g = window.__qaGame, c = g.bossCombat, r = g.gravityRenderer;
        c.state = mode === 'release' ? 'VICTORY' : mode === 'collect' ? 'COLLECT' : 'CLEAR'; c.timer = .45;
        if (mode === 'collect') c.dropCore();
        const calls = [], device = r.device, pickup = r.corePickup;
        r.device = function(ctx, p, time, options) { calls.push({ kind: 'device', ...p, alpha: options.alpha }); return device.call(this, ctx, p, time, options); };
        r.corePickup = function(ctx, p, time) { calls.push({ kind: 'core', x: p.x, y: p.y }); return pickup.call(this, ctx, p, time); };
        g.bossUI.update(); g.render(1000); r.device = device; r.corePickup = pickup; return calls;
      }, mode);
      if (mode === 'release') { assert.equal(props[0].alpha, .5); assert.deepEqual(props.map(p => p.kind), ['device', 'core']); }
      if (mode === 'collect') assert.deepEqual(props, [{ kind: 'core', x: 384, y: 576 }]);
      if (mode === 'clear') assert.deepEqual(props, []);
      await page.screenshot({ path: `qa/gravity/art-v3-${name}-${mode}.png` });
      if (mode === 'release') {
        const same = await page.evaluate(() => { const g = window.__qaGame; const before = g.canvas.toDataURL(); g.render(1000); return before === g.canvas.toDataURL(); });
        assert.equal(same, true);
      }
    }
    report.checks.push(`${name}: paused device release; central pickup has no device; clear has neither object`);
  }
  await page.evaluate(async () => { const g = window.__qaGame; g.update = g.__originalUpdate; await g.startStage('sports'); });
  assert.match(await page.evaluate(() => window.__qaGame.worldRenderer.lifestyleImages.get('sports').src), /sports-map-v1/);
  assert.equal(await page.evaluate(() => window.__qaGame.bossCombat), null);
  await page.evaluate(() => {
    const g = window.__qaGame, r = g.gravityRenderer, art = r.art; r.art = null;
    r.creature(g.ctx, { x: 100, y: 100, type: 'gravityHeavy', hp: 3, def: { hp: 3 }, state: 'CHASE' }, 0);
    r.portrait(document.createElement('canvas')); r.art = art;
  });
  report.checks.push('Sports map remains original; missing creature atlas falls back safely');
  const glow = await page.evaluate(async () => {
    const { GRAVITY_CORE_ANCHORS } = await import('/src/game/GravityArt.js');
    const r = window.__qaGame.gravityRenderer, result = [];
    for (const [frame, state, hitFlash] of [[5, 'CORE_OPEN', 0], [6, 'FATIGUE', 0], [7, 'CORE_OPEN', .2]]) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 400;
      const ctx = canvas.getContext('2d'), anchor = GRAVITY_CORE_ANCHORS[frame];
      r.creature(ctx, { x: 200, y: 300, state, hitFlash, coreOpen: true }, 0, true);
      const x = 200 + (anchor.x - 192) * 240 / 384, y = 300 + (anchor.y - 345.6) * 240 / 384;
      result.push([...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data]);
    }
    return result;
  });
  assert.ok(glow.every(([r, g, b, a]) => r > 220 && g > 220 && b > 140 && a === 255), JSON.stringify(glow));
  report.checks.push('Open/fatigue/recoil glow lands inside the registered belly socket');
  assert.deepEqual(report.errors, []); report.status = 'PASS';
  console.log('PASS: Gravity map, all species/poses, alternating Boss attacks, vulnerable core, float-away, pause, fallback and Sports isolation at three viewports.');
} catch (e) { report.status = 'FAIL'; report.failure = e.stack; process.exitCode = 1; console.error(e); }
finally { await fs.writeFile('qa/gravity/art-browser-report.json', JSON.stringify(report, null, 2) + '\n'); await browser?.close(); server.kill(); }
