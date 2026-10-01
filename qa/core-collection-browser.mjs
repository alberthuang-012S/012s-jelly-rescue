import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4186'},windowsHide:true});
let browser;const report={checks:[],errors:[]};
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:375,height:667}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});});
  await page.goto('http://localhost:4186',{waitUntil:'networkidle'});
  await page.locator('.collection-home-button').click();
  assert.equal(await page.locator('#core-entry-name').textContent(),'未發現的核心');
  assert.equal(await page.locator('#core-entry-image').isVisible(),false);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#core-collection-dialog').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement.matches('.collection-home-button')),true);
  report.checks.push('Locked entry, keyboard close and focus restoration');
  await page.evaluate(async()=>{
    const g=window.__qaGame;await g.startStage('alienMosquito');g.bossCombat.startArrival();
    const c=g.bossCombat;c.state='BOSS';c.director.clear();c.boss.x=g.player.x;c.boss.y=g.player.y;c.boss.enter('CORE_OPEN',10);
  });
  await page.waitForFunction(()=>window.__qaGame.lives===2);
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat.score.bossDamageTaken),1);
  report.checks.push('Live King contact drains HUD heart during core opening');
  await page.evaluate(()=>{
    const g=window.__qaGame,c=g.bossCombat;c.invulnerability=10;c.boss.hp=2;c.cooldown=0;c.hitPause=0;
    c.boss.enter('CORE_OPEN',10);g.player.x=c.boss.x;g.player.y=c.boss.y+85;g.tryAction();
  });
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat.state),'VICTORY');
  assert.equal(await page.evaluate(()=>window.__qaGame.coreCollectionStore.has('itchCore')),false,'Victory cinematic has not awarded early');
  await page.waitForFunction(()=>window.__qaGame.bossCombat.state==='COLLECT');
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(()=>window.__qaGame.state),'playing');
  assert.equal(await page.evaluate(()=>localStorage.getItem('jellyRescue.coreCollection.v1')),null);
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat.coreDrop.collected),false);
  assert.equal(await page.locator('#boss-health').isVisible(),false);
  assert.equal(await page.locator('#action-button').isVisible(),false);
  assert.equal(await page.locator('.mobile-dpad').isVisible(),true);
  for(const [name,viewport]of [['small',{width:375,height:667}],['portrait',{width:390,height:844}],['desktop',{width:1280,height:900}]]){
    await page.setViewportSize(viewport);
    assert.match(await page.locator('#boss-core-hint').textContent(),/即可收集/);
    await page.screenshot({path:`qa/boss/core-drop-${name}.png`});
  }
  await page.setViewportSize({width:375,height:667});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  const paused=await page.evaluate(()=>JSON.stringify(window.__qaGame.bossCombat));
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>JSON.stringify(window.__qaGame.bossCombat)),paused);
  await page.locator('#background-resume').click();
  await page.evaluate(()=>window.__qaGame.finishBossStage());
  assert.equal(await page.evaluate(()=>window.__qaGame.state),'playing','Uncollected core cannot finish the stage');
  await page.evaluate(()=>window.__qaGame.showHome());
  assert.equal(await page.locator('#core-collection-count').textContent(),'0 / 1');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#core-collection-count').textContent(),'0 / 1');
  report.checks.push('Pickup visible at three viewports; idle, pause, premature result and abandoning the drop never unlock collection');
  await page.evaluate(async()=>{
    const g=window.__qaGame;await g.startStage('alienMosquito');const c=g.bossCombat;c.startArrival();c.state='BOSS';
    c.boss.x=g.player.x;c.boss.y=g.player.y;c.boss.hp=2;c.boss.enter('CORE_OPEN',10);
    g.player.y+=85;c.tryAction();
  });
  await page.waitForFunction(()=>window.__qaGame.bossCombat.state==='COLLECT');
  await page.locator('[data-dir="up"]').dispatchEvent('pointerdown',{pointerId:18,pointerType:'touch'});
  await page.waitForFunction(()=>window.__qaGame.state==='result');
  await page.locator('[data-dir="up"]').dispatchEvent('pointerup',{pointerId:18,pointerType:'touch'});
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat.coreDrop.collected),true);
  assert.equal(await page.locator('#boss-core-reward-status').textContent(),'新核心已收錄圖鑑');
  assert.equal(await page.locator('#core-collection-count').textContent(),'1 / 1');
  for(const [name,viewport]of [['small',{width:375,height:667}],['portrait',{width:390,height:844}],['desktop',{width:1280,height:900}]]){
    await page.setViewportSize(viewport);
    await page.locator('#boss-core-reward button').click();
    assert.equal(await page.locator('#core-entry-name').textContent(),'癢癢核心');
    await page.waitForFunction(()=>document.querySelector('#core-entry-image img').naturalWidth===256);
    const geometry=await page.locator('#core-collection-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth};});
    assert.ok(geometry.x>=0&&geometry.y>=0&&geometry.right<=viewport.width&&geometry.bottom<=viewport.height&&!geometry.overflow);
    await page.screenshot({path:`qa/boss/core-collection-${name}.png`});
    await page.locator('#core-collection-close').click();
    assert.equal(await page.evaluate(()=>document.activeElement.closest('#boss-core-reward')!==null),true);
    report.checks.push(`${name}: unlocked icon, readable bounded modal and return focus`);
  }
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#core-collection-count').textContent(),'1 / 1');
  await page.locator('.collection-home-button').click();assert.equal(await page.locator('#core-entry-name').textContent(),'癢癢核心');
  await page.locator('#core-collection-close').click();
  await page.evaluate(async()=>{
    const g=window.__qaGame;await g.startStage('alienMosquito');const c=g.bossCombat;c.startArrival();c.state='BOSS';
    c.boss.x=g.player.x;c.boss.y=g.player.y;c.boss.hp=2;c.boss.enter('CORE_OPEN',10);g.player.y+=85;c.tryAction();
  });
  await page.waitForFunction(()=>window.__qaGame.bossCombat.state==='COLLECT');
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__qaGame.state==='result');await page.keyboard.up('ArrowUp');
  assert.equal(await page.locator('#boss-core-reward-status').textContent(),'圖鑑中已收藏');
  await page.evaluate(async()=>{const g=window.__qaGame;await g.startStage('alienMosquito');g.bossCombat.state='GAMEOVER';g.finishBossStage();});
  assert.equal(await page.locator('#boss-core-reward').isVisible(),false);
  report.checks.push('Real touch/keyboard pickup unlocks once; reload persists; repeated pickup is idempotent; failed run hides reward');
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: contact HUD damage, actual touch/keyboard pickup, no automatic award, locked/unlocked encyclopedia, three viewports, pause, abandon, reload, repeat and failure.');
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await fs.writeFile('qa/boss/core-collection-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
