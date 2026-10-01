import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4184'},windowsHide:true});
let browser;const report={checks:[],errors:[]};
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});});
  await page.goto('http://localhost:4184',{waitUntil:'networkidle'});
  for(const [name,viewport]of [['desktop',{width:1280,height:900}],['portrait',{width:390,height:844}],['small',{width:375,height:667}]]){
    await page.setViewportSize(viewport);
    await page.evaluate(async()=>{
      const g=window.__qaGame;await g.startStage('alienMosquito');g.debug.infiniteLife=true;
      if(!g.__originalUpdate)g.__originalUpdate=g.update;g.update=()=>{};
      const renderer=g.bossRenderer;
      if(!renderer.__originalSprite){
        renderer.__originalSprite=renderer.sprite;
        renderer.sprite=function(ctx,image,frame,...args){(window.__alienDraws||=[]).push({src:image.src,frame});return this.__originalSprite(ctx,image,frame,...args);};
      }
    });
    const loaded=await page.evaluate(()=>{
      const g=window.__qaGame,r=g.bossRenderer;
      return {map:g.worldRenderer.alienImage.src,night:r.hasNightMap,enemies:r.art.enemies.naturalWidth,boss:r.art.boss.naturalWidth};
    });
    assert.match(loaded.map,/alien-map-v1/);assert.equal(loaded.night,true);assert.equal(loaded.enemies,768);assert.equal(loaded.boss,1152);
    for(const mode of ['wave','charge','core','dizzy']){
      const draws=await page.evaluate(mode=>{
        const g=window.__qaGame,c=g.bossCombat;c.visualTime=0;
        if(mode==='wave'){
          c.debug('wave3');
          c.director.enemies.forEach((e,i)=>{e.x=[270,510,270,510][i];e.y=i<2?760:930;e.state='CHASE';});
          g.player.x=384;g.player.y=1000;
        }else{
          if(!c.boss)c.startArrival();c.debug('phase3');c.director.clear();c.boss.x=384;c.boss.y=820;g.player.x=384;g.player.y=1020;
          c.boss.enter(mode==='core'?'CORE_OPEN':'TELEGRAPH',2);
          if(mode==='dizzy'){c.state='VICTORY';c.timer=2.7;}
        }
        g.bossUI.update();g.cameraState=null;window.__alienDraws=[];g.render(1000);return window.__alienDraws;
      },mode);
      if(mode==='wave')assert.deepEqual(draws.filter(d=>/alien-enemies/.test(d.src)).map(d=>d.frame).sort(),[0,0,1,2]);
      else assert.ok(draws.some(d=>/alien-boss/.test(d.src)&&d.frame==={charge:2,core:3,dizzy:4}[mode]));
      if(mode==='dizzy')assert.ok(draws.some(d=>d.frame===5),'Victory uses the UFO sprite');
      await page.screenshot({path:`qa/boss/art-v1-${name}-${mode}.png`});
      report.checks.push(`${name}/${mode}: correct rendered atlas frames`);
    }
  }
  await page.evaluate(async()=>{const g=window.__qaGame;g.update=g.__originalUpdate;await g.startStage('park');});
  assert.equal(await page.evaluate(()=>window.__qaGame.bossCombat),null);
  // Missing image art still uses the complete procedural rendering path.
  await page.evaluate(()=>{
    const g=window.__qaGame,r=g.bossRenderer,art=r.art;r.art=null;
    r.monster(g.ctx,{x:100,y:100,type:'mosquitoScout',state:'CHASE',hp:2,def:{hp:2},hitFlash:0},0);
    r.ufo(g.ctx,100,100);r.art=art;
  });
  report.checks.push('Regular Park remains isolated; unavailable creature art renders fallback');
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: night map, three enemy species, charge/core/dizzy/UFO art at three viewports, Park isolation and fallback.');
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await fs.writeFile('qa/boss/alien-art-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
