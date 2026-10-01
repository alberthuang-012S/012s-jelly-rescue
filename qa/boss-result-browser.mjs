import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4188'},windowsHide:true});
let browser;const report={checks:[],errors:[]};
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});});
  await page.goto('http://localhost:4188',{waitUntil:'networkidle'});
  for(const mode of ['wave1','wave3','phase3','success','repeat','collected-failure']){
    await page.evaluate(async mode=>{
      const g=window.__qaGame;await g.startStage('alienMosquito');const c=g.bossCombat;
      if(['success','repeat'].includes(mode)){
        c.startArrival();c.state='BOSS';c.boss.hp=2;c.boss.enter('CORE_OPEN',10);
        c.boss.x=g.player.x;c.boss.y=g.player.y;g.player.y+=85;c.tryAction();
        c.timer=.001;c.update(.02);g.player.x=c.coreDrop.x;g.player.y=c.coreDrop.y;c.update(.02);
      }else{
        if(mode==='phase3'){c.startArrival();c.boss.phase=3;c.boss.hp=4;}
        else c.wave=mode==='wave3'?3:1;
        c.state='GAMEOVER';
      }
      g.finishBossStage();
    },mode);
    const success=['success','repeat'].includes(mode);
    assert.equal(await page.locator('#boss-result').getAttribute('data-outcome'),success?'success':'failure');
    assert.equal(await page.locator('#boss-core-reward').isVisible(),success);
    assert.equal(await page.locator('#boss-failure-guide').isVisible(),!success);
    assert.equal(await page.locator('#boss-result-details').getAttribute('open'),null);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'boss-replay');
    if(mode==='wave3')assert.match(await page.locator('#boss-result-tip').textContent(),/泡泡/);
    if(mode==='phase3'){
      assert.match(await page.locator('#boss-result-progress').textContent(),/第 3 階段.*4 \/ 18/);
      assert.match(await page.locator('#boss-result-tip').textContent(),/兩次/);
    }
    if(mode==='success')assert.equal(await page.locator('#boss-core-reward-status').textContent(),'新核心已收錄圖鑑');
    if(mode==='repeat')assert.equal(await page.locator('#boss-core-reward-status').textContent(),'圖鑑中已收藏');
    if(mode==='collected-failure')assert.match(await page.locator('#boss-result-core-note').textContent(),/保留先前/);
    for(const [name,viewport] of [['small',{width:375,height:667}],['portrait',{width:390,height:844}],['desktop',{width:1280,height:900}],['landscape',{width:667,height:375}],['narrow',{width:320,height:568}]]){
      await page.setViewportSize(viewport);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.locator('#boss-result-details').evaluate(el=>el.open=false);
      await page.locator('.boss-result-body').evaluate(el=>el.scrollTop=0);
      const geometry=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};};
        return {card:rect('.boss-result-card'),body:rect('.boss-result-body'),replay:rect('#boss-replay'),home:rect('#boss-home'),overflow:document.querySelector('#boss-result').scrollWidth>innerWidth};
      });
      assert.ok(!geometry.overflow,JSON.stringify(geometry));
      for(const rect of [geometry.card,geometry.replay,geometry.home])assert.ok(rect.x>=0&&rect.y>=0&&rect.right<=viewport.width&&rect.bottom<=viewport.height,JSON.stringify({mode,name,geometry}));
      assert.ok(geometry.replay.height>=44&&geometry.home.height>=44);
      await page.locator('#boss-result-details summary').click();
      assert.notEqual(await page.locator('#boss-result-details').getAttribute('open'),null);
      const footerY=(await page.locator('#boss-replay').boundingBox()).y;
      assert.ok(footerY+geometry.replay.height<=viewport.height,'Expanded details keep the action visible');
      await page.locator('.boss-result-body').evaluate(el=>el.scrollTop=el.scrollHeight);
      assert.ok(Math.abs((await page.locator('#boss-replay').boundingBox()).y-footerY)<1,'Footer stays visible while details scroll');
      assert.equal(await page.locator('#boss-result-score').textContent(),await page.evaluate(()=>window.__qaGame.bossCombat.score.score.toLocaleString()));
      await page.locator('#boss-result-details').evaluate(el=>el.open=false);
      await page.locator('.boss-result-body').evaluate(el=>el.scrollTop=0);
      if(['success','wave1','phase3'].includes(mode))await page.screenshot({path:`qa/boss/result-v2-${mode}-${name}.png`});
    }
    await page.locator('#boss-home').focus();await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.closest('#boss-result')!==null),true);
    await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'boss-home');
    report.checks.push(`${mode}: correct result, progress, tip and core state; readable bounded card and persistent actions at five viewports; keyboard focus stays inside`);
  }
  await page.locator('#boss-replay').click();await page.waitForFunction(()=>window.__qaGame.state==='playing');
  assert.equal(await page.locator('#boss-result').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat.wave),1);
  await page.evaluate(()=>{const g=window.__qaGame;g.bossCombat.state='GAMEOVER';g.finishBossStage();});
  await page.locator('#boss-home').click();assert.equal(await page.locator('#home-screen').isVisible(),true);
  report.checks.push('Replay starts a fresh first wave; Home closes result');
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log(JSON.stringify(report,null,2));
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await fs.writeFile('qa/boss/result-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
