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
  for (const [width, height] of [[1440, 900], [1280, 900], [1366, 768], [1024, 768], [1920, 1080], [768, 1024], [320, 640], [375, 667], [390, 844], [667, 375]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { window.__qaGame.showHome(); document.querySelector('#home-screen').scrollTop = 0; });
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      return { copy: rect('.home-copy'), lede: rect('.home-lede'), character: rect('.home-character-crop'), characterAnchor: rect('.home-character-wrap'), panel: rect('.stage-selector-panel'), endless: rect('.home-endless-panel'),
        primary: rect('#start-button'), challenges: rect('.home-challenges'), collection: rect('.collection-home-button'),
        specials: [rect('.special-stage-card'), rect('.gravity-stage-card'), rect('.pigment-stage-card')],
        buttons: ['#start-button', '#endless-start', '#special-start', '#gravity-start', '#pigment-start', '.collection-home-button'].map(rect),
        bodyWidth: document.body.scrollWidth, homeHeight: document.querySelector('#home-screen').scrollHeight };
    });
    const gravityPortrait = await page.evaluate(() => {
      const canvas = document.querySelector('#gravity-portrait'), art = canvas.parentElement;
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] < 160) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      const c = canvas.getBoundingClientRect(), a = art.getBoundingClientRect();
      return { pixels: right >= left, dx: c.x + (left + right + 1) / 2 * c.width / canvas.width - (a.x + a.width / 2),
        dy: c.y + (top + bottom + 1) / 2 * c.height / canvas.height - (a.y + a.height / 2),
        bodyLeft: c.x + left * c.width / canvas.width, bodyRight: c.x + (right + 1) * c.width / canvas.width,
        bodyTop: c.y + top * c.height / canvas.height, bodyBottom: c.y + (bottom + 1) * c.height / canvas.height,
        art: { left: a.x, right: a.right, top: a.y, bottom: a.bottom } };
    });
    assert.equal(gravityPortrait.pixels, true, `${width}: Boss thumbnail has no pixels`);
    assert.ok(Math.abs(gravityPortrait.dx) < 3 && Math.abs(gravityPortrait.dy) < 3, `${width}: Boss thumbnail is not centered ${JSON.stringify(gravityPortrait)}`);
    assert.ok(gravityPortrait.bodyLeft >= gravityPortrait.art.left && gravityPortrait.bodyRight <= gravityPortrait.art.right
      && gravityPortrait.bodyTop >= gravityPortrait.art.top && gravityPortrait.bodyBottom <= gravityPortrait.art.bottom, `${width}: Boss thumbnail body is clipped`);
    layout.gravityPortrait = gravityPortrait;
    report.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `qa/home/home-${width}x${height}.png` });
    assert.ok(layout.bodyWidth <= width);
    for (const r of [...layout.buttons, layout.copy, layout.panel, layout.endless, ...layout.specials]) assert.ok(r.x >= 0 && r.right <= width + 1, `${width}: horizontal overflow ${JSON.stringify(r)}`);
    if (width >= 1024 && height >= 768) {
      assert.ok(layout.copy.y < 90, `${width}: title starts too low`);
      assert.ok(layout.primary.bottom < height);
      assert.ok(layout.specials[0].right < layout.specials[1].x);
      assert.ok(layout.character.y >= layout.lede.bottom + 3 || layout.character.x >= layout.lede.right + 8, `${width}: hero overlaps the intro ${JSON.stringify(layout)}`);
      assert.ok(Math.abs((layout.characterAnchor.x + layout.characterAnchor.right) / 2 - width / 2) < 1, `${width}: mascot must be at the viewport horizontal center`);
      assert.ok(Math.abs((layout.characterAnchor.y + layout.characterAnchor.bottom) / 2 - height / 2) < 1, `${width}: mascot must be at the viewport vertical center`);
      assert.ok(layout.panel.right + 8 <= layout.character.x, `${width}: patrol stays left of the mascot`);
      assert.ok(layout.character.right + 8 <= layout.endless.x, `${width}: endless stays right of the mascot`);
      assert.ok(layout.specials.every(r => Math.abs(r.y-layout.specials[0].y)<1), `${width}: all three Boss cards share one row`);
      assert.ok(layout.characterAnchor.bottom <= layout.specials[0].y, `${width}: mascot must not overlap Boss cards`);
      assert.match(await page.locator('.control-hint').innerText(), /WASD.*↑ ↓ ← →.*移動/);
      assert.ok([layout.primary, layout.collection].every(r => r.bottom <= height), `${width}: main entry below the first screen`);
    }
    if (width <= 680 && height > width) {
      assert.ok(layout.character.height >= 60, 'Portrait mascot must not collapse in the scroll layout');
      assert.ok(Math.abs((layout.characterAnchor.x+layout.characterAnchor.right)/2-width/2)<1, 'Phone mascot stays centered');
      assert.ok(layout.characterAnchor.bottom<=Math.min(layout.panel.y,layout.endless.y), 'Phone mascot stays above both entries');
      assert.ok(layout.specials.every(r=>r.height>=200), 'Phone Boss cards reserve room for complete stories');
    }
    const bossCopy = [
      ['special-title', 'ALIEN MOSQUITO INVASION', '居民飽受蚊災困擾', 'PPA+1'],
      ['gravity-title', 'GRAVITY OVERLOAD', '讓居民行動沉重、痠痛不適', 'NAP+1'],
      ['pigment-title', 'PIGMENT TAKEOVER', '讓居民的皮膚陷入暗沉危機', 'DDM+1']
    ];
    assert.match(await page.locator('.home-challenges-heading p').innerText(), /阻止 Boss 影響居民/);
    for (const [title, english, story, item] of bossCopy) {
      const card = page.locator('article').filter({ has: page.locator('#'+title) });
      await card.scrollIntoViewIfNeeded();
      assert.equal(await card.locator('strong').innerText(), english);
      assert.equal(await card.locator('strong').isVisible(), true);
      assert.equal(await card.locator('p').isVisible(), true);
      const description = await card.locator('p').innerText();
      assert.ok(description.includes(story) && description.includes(item), width+': missing Boss story/objective');
      assert.doesNotMatch(description, /救援.*王|救援.*花后/);
      assert.equal(await card.evaluate(el => {
        const bounds = el.getBoundingClientRect();
        return [...el.querySelectorAll('h2, strong, p, button')].every(node => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (!node.matches('p') || r.width >= bounds.width - 30) && node.scrollWidth <= node.clientWidth + 1
            && node.scrollHeight <= node.clientHeight + 1
            && r.x >= bounds.x && r.right <= bounds.right && r.y >= bounds.y && r.bottom <= bounds.bottom;
        });
      }), true, width+': Boss text must remain complete inside the card');
    }
    for (const id of ['tutorial', 'park', 'mountain', 'city', 'sports', 'garden']) {
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
    report.checks.push(`${width}x${height}: Boss English titles and complete resident-protection stories visible without clipping; all mission tabs update preview/CTA, cards reachable, collection opens and restores focus`);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => window.__qaGame.showHome());
  await page.locator('[data-stage-select="tutorial"]').click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'park');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'garden');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'tutorial');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.stageSelect), 'garden');
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
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__qaGame.startStage('tutorial'));
    await page.locator('#tutorial-modal-primary').click();
    await page.evaluate(() => { window.__qaGame.player.distanceTravelled = 160; });
    for (const [mode, line, next] of [['itch', '好癢！', 'soreness'], ['soreness', '痠痛不太舒服……', 'final-check']]) {
      await page.waitForFunction(mode => window.__qaGame.tutorialModalMode === mode, mode);
      assert.equal(await page.locator('#tutorial-modal-visual-label').innerText(), line);
      await page.screenshot({ path: `qa/home/tutorial-${mode}-${width}.png` });
      await page.locator('#tutorial-modal-primary').click();
      assert.equal(await page.evaluate(() => {
        const g = window.__qaGame, npc = g.npcs.find(n => n.state === 'HELP');
        return npc.getStatusLayout(g.ctx, 0).label;
      }), line);
      const rescued = await page.evaluate(() => {
        const g = window.__qaGame, npc = g.npcs.find(n => n.state === 'HELP');
        g.player.x = npc.x; g.player.y = npc.y;
        g.selectItem(npc.condition === 'ITCH' ? 'PPA' : 'NAP'); g.tryAction();
        return { state: npc.state, line: npc.getStatusLayout(g.ctx, 0).label };
      });
      assert.deepEqual(rescued, { state: 'RESCUED', line: '好多了！' });
      await page.waitForFunction(mode => window.__qaGame.tutorialModalMode === mode, next);
    }
    report.checks.push(`${width}x${height}: tutorial modal, resident help and rescue replies match Park/Mountain; both treatments advance the tutorial`);
  }
  for (const [button, id] of [['#special-start', 'alienMosquito'], ['#gravity-start', 'gravityOverload'], ['#pigment-start', 'pigmentBloom']]) {
    await page.evaluate(() => window.__qaGame.showHome());
    await page.locator(button).click();
    await page.waitForFunction(id => window.__qaGame.state === 'playing' && window.__qaGame.selectedStage === id, id);
  }
  report.checks.push('All three distinct Boss entries start their respective encounters');
  await page.evaluate(()=>window.__qaGame.showHome());
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#home-screen').getAttribute('data-has-played'),'true');
  assert.ok(await page.evaluate(()=>document.querySelector('.home-endless-panel').getBoundingClientRect().y<document.querySelector('.stage-selector-panel').getBoundingClientRect().y));
  await page.evaluate(()=>{
    const g=window.__qaGame;
    g.coreCollectionStore.collect('alienMosquito',{id:'itchCore',collected:true});
    g.coreCollectionUI.refresh();
  });
  assert.equal(await page.locator('#core-collection-count').textContent(),'1 / 3');
  assert.match(await page.locator('[data-home-core="itchCore"]').textContent(),/核心已收集/);
  await page.locator('#endless-start').click();
  await page.waitForFunction(()=>window.__qaGame.state==='playing');
  await page.evaluate(()=>{
    const g=window.__qaGame;g.stageManager.elapsed=62;
    g.endlessMode.syncItems(false);g.endlessMode.save();g.showHome();
  });
  assert.equal(await page.locator('#endless-resume').isVisible(),true);
  assert.equal(await page.locator('#endless-resume').evaluate(e=>e.classList.contains('primary-button')),true);
  assert.equal(await page.locator('#endless-start').textContent(),'開始新局');
  assert.equal(await page.locator('#endless-start').evaluate(e=>e.classList.contains('secondary-button')),true);
  await page.screenshot({path:'qa/home/home-resume-390x844.png'});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#core-collection-count').textContent(),'1 / 3');
  assert.equal(await page.locator('#endless-resume').isVisible(),true);
  await page.locator('#endless-resume').click();
  await page.waitForFunction(()=>window.__qaGame.state==='playing');
  assert.ok(await page.evaluate(()=>window.__qaGame.stageManager.elapsed)>=62);
  await page.evaluate(()=>window.__qaGame.showHome());
  await page.locator('#endless-start').click();
  assert.equal(await page.locator('#endless-dialog').evaluate(e=>e.open),true);
  await page.locator('#endless-dialog button').last().click();
  assert.equal(await page.locator('#endless-resume').isVisible(),true);
  report.checks.push('Returning phone order, collected-core status persists, resume is primary, reload resumes past unlock, new run preserves existing confirmation');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ checks: report.checks, errors: report.errors }, null, 2));
} finally {
  await fs.writeFile('qa/home/browser-report.json', JSON.stringify(report, null, 2));
  await browser?.close(); server.kill();
}
