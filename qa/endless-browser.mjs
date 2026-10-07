import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.JELLY_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'qa', 'endless');
await fs.mkdir(output, { recursive: true });
const port = process.env.JELLY_QA_PORT || '4176';
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, JELLY_PORT: port }, windowsHide: true });
const ready = new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error('server exited '+code))); });
const report = { checks: [], errors: [] };
let browser;
const mapping = { ITCH: 'PPA', SORENESS: 'NAP', PIGMENTATION: 'DDM', SALLOWNESS: 'SSW' };
async function advance(page, seconds) {
  return page.evaluate(seconds => {
    const game=window.__qaGame;
    for(let i=0;i<Math.round(seconds*10);i++){
      game.update(.1);
      for(const npc of game.npcs.filter(n=>n.active&&['WARNING','HELP','CRITICAL'].includes(n.state))){
        game.player.x=npc.x;game.player.y=npc.y;
        if(npc.scenarioType==='FALL')game.__qaFallCount=(game.__qaFallCount||0)+1;
        game.selectItem(({ITCH:'PPA',SORENESS:'NAP',PIGMENTATION:'DDM',SALLOWNESS:'SSW'})[npc.condition]);
        game.tryAction();
      }
    }
    game.hud.update(game);game.render();
    return {state:game.state,elapsed:game.stageManager.elapsed,rescued:game.scoreManager.rescuedCount,lives:game.lives,id:game.selectedStage,npcs:game.npcs.length,falls:game.__qaFallCount||0};
  },seconds);
}
async function layout(page, viewport, mobile) {
  const boxes=await page.locator('[data-item]').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  for(let i=0;i<4;i++){
    const a=boxes[i];assert.ok(a.w>=40&&a.h>=44&&a.x>=0&&a.y>=0&&a.x+a.w<=viewport.width+1&&a.y+a.h<=viewport.height+1,JSON.stringify(a));
    for(let j=i+1;j<4;j++)assert.equal(overlaps(a,boxes[j]),false);
  }
  for(const selector of mobile?['.mobile-dpad','#action-button']:['#action-button']){
    if(!await page.locator(selector).isVisible())continue;
    const r=await page.locator(selector).boundingBox(),b={x:r.x,y:r.y,w:r.width,h:r.height};
    for(const a of boxes)assert.equal(overlaps(a,b),false,selector+' overlaps item');
  }
}
try {
  await ready;
  browser=await chromium.launch({headless:true,channel:process.env.JELLY_BROWSER_CHANNEL||'msedge'});
  for(const [name,viewport,mobile] of [
    ['desktop',{width:1280,height:900},false],
    ['portrait',{width:390,height:844},true],
    ['small-portrait',{width:375,height:667},true],
    ['narrow-portrait',{width:320,height:640},true],
    ['landscape',{width:844,height:390},true]
  ]) {
    const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(name+': '+error.message));
    page.on('response',response=>{if(response.status()>=400)report.errors.push(name+': HTTP '+response.status()+' '+response.url());});
    await page.route('**/src/main.js*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});
    });
    // Drive the real update/render code manually so saved clocks are exact.
    await page.route('**/src/game/Game.js*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replaceAll('requestAnimationFrame(this.loop);','/* QA drives the frame explicitly. */')});
    });
    await page.goto('http://localhost:'+port,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>Boolean(window.__qaGame));
    assert.equal(await page.locator('#endless-resume').isVisible(),false);
    await page.locator('#endless-start').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,name+'-home.png')});
    await page.locator('#endless-start').click();
    await page.waitForFunction(()=>window.__qaGame.state==='playing');
    assert.equal(await page.locator('#endless-dialog').evaluate(e=>e.open),false);
    assert.equal(await page.evaluate(()=>window.__qaGame.selectedStage),'endlessPlaza');
    assert.equal(await page.evaluate(()=>window.__qaGame.worldRenderer.endlessImage.naturalWidth),1024);
    assert.match(await page.evaluate(()=>window.__qaGame.worldRenderer.endlessImage.src),/endless-map-v3.webp$/);
    await page.evaluate(()=>{window.__qaGame.hud.update(window.__qaGame);window.__qaGame.render();});
    assert.equal(await page.locator('[data-item]').count(),4);
    assert.equal(await page.locator('[data-item="DDM"]').isDisabled(),true);
    assert.equal(await page.locator('[data-item="SSW"]').isVisible(),true);
    assert.match(await page.locator('[data-item="DDM"]').textContent(),/60s 解鎖/);
    assert.equal(await page.locator('#hud-timer-label').textContent(),'生存時間');
    await layout(page,viewport,mobile);
    await page.screenshot({path:path.join(output,name+'-locked.png')});

    if(name==='desktop'){
      const map=await page.evaluate(()=>window.__qaGame.worldRenderer.getEndlessMap(window.__qaGame.stageManager.getStage()).toDataURL('image/png').split(',')[1]);
      await fs.writeFile(path.join(output,'plaza-art-v3.png'),Buffer.from(map,'base64'));
      const poses=await page.evaluate(async()=>{
        const game=window.__qaGame,{NPC}=await import('/src/game/NPC.js?mountain-pavilion-dialogue-v2');
        const canvas=document.createElement('canvas');canvas.width=840;canvas.height=280;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#f3ecd8';ctx.fillRect(0,0,840,280);
        for(const [i,progress]of [0,.5,1].entries()){
          const npc=new NPC({id:'pose-'+i,role:'runner',x:140+i*280,y:191,stageId:'endlessPlaza'});
          game.applyNpcAssets(npc);npc.startScenario('FALL',9,3,0);npc.reactionTimer=npc.reactionDuration*(1-progress);
          npc.draw(ctx,0,{drawStatusBubble:false});
          ctx.fillStyle='#355363';ctx.font='bold 20px sans-serif';ctx.textAlign='center';
          ctx.fillText(['踉蹌','跌倒','受傷求救'][i],140+i*280,40);
        }
        return canvas.toDataURL('image/png').split(',')[1];
      });
      await fs.writeFile(path.join(output,'fall-poses-v2.png'),Buffer.from(poses,'base64'));
    }

    await page.keyboard.press('Digit3');
    assert.equal(await page.evaluate(()=>window.__qaGame.itemSystem.selectedId),'PPA');
    await advance(page,59.9);
    assert.equal(await page.locator('[data-item="DDM"]').isDisabled(),true);
    const boundary=await page.evaluate(()=>{
      const game=window.__qaGame,p={x:game.player.x,y:game.player.y},id=game.selectedStage;
      game.stageManager.elapsed=59.99;game.update(.02);game.hud.update(game);game.render();
      return {state:game.state,id,sameMap:game.selectedStage===id,samePlayer:game.player.x===p.x&&game.player.y===p.y,items:game.itemSystem.availableIds};
    });
    assert.deepEqual(boundary,{state:'playing',id:'endlessPlaza',sameMap:true,samePlayer:true,items:['PPA','NAP','DDM','SSW']});
    assert.equal(await page.locator('#endless-dialog').evaluate(e=>e.open),false);
    assert.equal(await page.locator('[data-item="DDM"]').isDisabled(),false);
    assert.match(await page.locator('#toast-region').textContent(),/已解鎖/);
    for(const [i,id]of ['PPA','NAP','DDM','SSW'].entries()){
      await page.keyboard.press('Digit'+(i+1));
      assert.equal(await page.evaluate(()=>window.__qaGame.itemSystem.selectedId),id);
    }
    await page.keyboard.press('KeyQ');
    assert.equal(await page.evaluate(()=>window.__qaGame.itemSystem.selectedId),'PPA');
    const late=await advance(page,111.3);
    assert.equal(late.state,'playing');assert.ok(late.elapsed>171);assert.equal(late.lives,3);assert.ok(late.rescued>40);assert.ok(late.npcs<=12);assert.ok(late.falls>0,'Natural fall requests occurred');
    const saved=await page.evaluate(()=>{
      const game=window.__qaGame;
      game.npcs.forEach(n=>n.clearEvent(0));
      const fallen=game.npcs.find(n=>['basketballPlayer','runner','skateboarder'].includes(n.role));
      fallen.active=true;fallen.departing=false;fallen.departAt=100000;fallen.x=384;fallen.y=650;
      fallen.startScenario('FALL',9,3,game.stageManager.elapsed);fallen.reactionTimer=0;fallen.enterHelp();
      game.selectItem('SSW');game.endlessMode.save();
      return JSON.parse(localStorage.getItem('jellyRescue.endless.v2')).run;
    });
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#endless-resume').isVisible(),true);
    await page.locator('#endless-resume').click();
    await page.waitForFunction(()=>window.__qaGame.state==='playing');
    const restored=await page.evaluate(()=>{
      const game=window.__qaGame;
      return {elapsed:game.stageManager.elapsed,lives:game.lives,x:game.player.x,y:game.player.y,
        random:game.endlessMode.random.getState(),score:game.scoreManager.score,selected:game.itemSystem.selectedId,
        unlocked:game.itemSystem.availableIds,npcs:game.npcs.map(n=>[n.id,n.x,n.y,n.state,n.tolerance,n.warningTimer,n.departAt,n.departing])};
    });
    assert.deepEqual(restored,{elapsed:saved.snapshot.elapsed,lives:saved.lives,x:saved.snapshot.player.x,y:saved.snapshot.player.y,
      random:saved.snapshot.randomState,score:saved.snapshot.score.score,selected:'SSW',unlocked:['PPA','NAP','DDM','SSW'],
      npcs:saved.snapshot.npcs.map(n=>[n.id,n.x,n.y,n.state,n.tolerance,n.warningTimer,n.departAt,!!n.departing])});

    const fallRestored=await page.evaluate(()=>{
      const game=window.__qaGame,npc=game.npcs.find(n=>n.scenarioType==='FALL');
      game.player.x=npc.x+75;game.player.y=npc.y;
      game.interactionSystem.findTarget(game.player,game.npcs);game.hud.update(game);game.render();
      return {role:npc.role,frame:npc.getInjuryPose()?.frame,art:npc.spriteImage.src,injury:npc.spriteSheet.injuryImage.src,
        condition:npc.condition,before:game.scoreManager.rescuedCount,lives:game.lives};
    });
    assert.equal(fallRestored.frame,2);assert.equal(fallRestored.condition,'SORENESS');
    assert.match(fallRestored.art,/sports-npcs/);assert.match(fallRestored.injury,/sports-injury/);
    await page.screenshot({path:path.join(output,name+'-fall.png')});
    const select=page.locator('[data-item="PPA"]');
    if(mobile)await select.tap();else await select.click();
    if(mobile)await page.locator('#action-button').tap();else await page.keyboard.press('KeyE');
    assert.equal(await page.evaluate(()=>window.__qaGame.scoreManager.rescuedCount),fallRestored.before);
    assert.equal(await page.evaluate(()=>window.__qaGame.lives),fallRestored.lives);
    if(mobile)await page.locator('[data-item="NAP"]').tap();else await page.keyboard.press('Digit2');
    if(mobile)await page.locator('#action-button').tap();else await page.keyboard.press('KeyE');
    const fallRescued=await page.evaluate(()=>{
      const game=window.__qaGame,npc=game.npcs.find(n=>n.scenarioType==='FALL');
      return {count:game.scoreManager.rescuedCount,state:npc.state,pose:npc.getInjuryPose()};
    });
    assert.deepEqual(fallRescued,{count:fallRestored.before+1,state:'RESCUED',pose:null});

    const use=await page.evaluate(()=>{
      const game=window.__qaGame;
      game.eventDirector.nextEventAt=100000;
      game.npcs.forEach(n=>n.clearEvent(0));
      const npc=game.npcs[0];npc.departing=false;npc.departAt=100000;
      npc.x=game.player.x;npc.y=game.player.y;
      npc.startScenario('PIGMENT_CARE',9,3,game.stageManager.elapsed);
      const before={lives:game.lives,score:game.scoreManager.score,rescued:game.scoreManager.rescuedCount,wrong:game.scoreManager.wrongItemCount};
      game.selectItem('PPA');game.tryAction();
      const wrong={lives:game.lives,score:game.scoreManager.score,rescued:game.scoreManager.rescuedCount,wrong:game.scoreManager.wrongItemCount,state:npc.state};
      game.selectItem('DDM');game.tryAction();
      npc.clearEvent(0);npc.startScenario('SALLOW_CARE',9,3,game.stageManager.elapsed);
      game.selectItem('SSW');game.tryAction();
      return {before,wrong,after:game.scoreManager.rescuedCount,ddm:game.scoreManager.itemSuccess.DDM,ssw:game.scoreManager.itemSuccess.SSW};
    });
    assert.equal(use.wrong.lives,use.before.lives);assert.equal(use.wrong.score,use.before.score);assert.equal(use.wrong.rescued,use.before.rescued);assert.equal(use.wrong.wrong,use.before.wrong+1);
    assert.equal(use.after,use.before.rescued+2);assert.ok(use.ddm>0&&use.ssw>0);
    const loss=await page.evaluate(()=>{
      const game=window.__qaGame,npc=game.npcs[0];npc.clearEvent(0);npc.startEvent('ITCH',.1,0,game.stageManager.elapsed);npc.state='HELP';
      const before={elapsed:game.stageManager.elapsed,score:game.scoreManager.score};
      game.update(.2);
      return {before,elapsed:game.stageManager.elapsed,score:game.scoreManager.score,lives:game.lives,state:game.state,dialog:document.querySelector('#endless-dialog').open};
    });
    assert.equal(loss.state,'playing');assert.equal(loss.lives,2);assert.equal(loss.score,loss.before.score);assert.ok(loss.elapsed>loss.before.elapsed);assert.equal(loss.dialog,false);
    const heal=await page.evaluate(()=>{
      const game=window.__qaGame,npc=game.npcs[0],needed=20-game.scoreManager.rescuedCount%20;
      npc.active=true;npc.departing=false;npc.departAt=100000;npc.x=game.player.x;npc.y=game.player.y;
      for(let i=0;i<needed;i++){npc.clearEvent(0);npc.startScenario('LONG_WALK',9,3,game.stageManager.elapsed);game.selectItem('NAP');game.tryAction();}
      const healed=game.lives;
      game.endlessMode.fail();
      npc.clearEvent(0);npc.startScenario('OUTDOOR_SKIN',9,3,game.stageManager.elapsed);game.selectItem('PPA');game.tryAction();
      return {healed,lives:game.lives,state:game.state};
    });
    assert.deepEqual(heal,{healed:3,lives:2,state:'playing'});
    await page.evaluate(()=>{
      const game=window.__qaGame;game.npcs.forEach(n=>n.clearEvent(0));game.player.x=384;game.player.y=650;game.cameraState=null;
      for(const [i,type]of ['OUTDOOR_SKIN','LONG_WALK','PIGMENT_CARE','SALLOW_CARE'].entries()){
        const npc=game.npcs[i];npc.active=true;npc.departing=false;
        [npc.x,npc.y]=[[260,500],[520,540],[220,700],[520,820]][i];npc.startScenario(type,9,0,game.stageManager.elapsed);npc.enterHelp();npc.reactionTimer=0;
      }
      game.hud.update(game);game.render();
    });
    await layout(page,viewport,mobile);
    await page.screenshot({path:path.join(output,name+'-four-items.png')});
    await page.evaluate(()=>{const game=window.__qaGame;game.endlessMode.fail();game.endlessMode.fail();});
    assert.equal(await page.evaluate(()=>window.__qaGame.state),'gameover');
    assert.match(await page.locator('#gameover-title').textContent(),/無限救援挑戰結束/);
    assert.match(await page.locator('#gameover-screen .result-summary').textContent(),/生存 02:51/);
    assert.equal(await page.locator('#gameover-screen .rescue-statistics > div').count(),6);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jellyRescue.endless.v2')).run),null);
    await page.screenshot({path:path.join(output,name+'-gameover.png')});
    await page.locator('#gameover-replay').click();await page.waitForFunction(()=>window.__qaGame.state==='playing');
    assert.equal(await page.evaluate(()=>window.__qaGame.stageManager.elapsed),0);
    assert.equal(await page.locator('[data-item="DDM"]').isDisabled(),true);
    await page.evaluate(()=>window.__qaGame.showHome());
    await page.locator('#endless-start').click();assert.equal(await page.locator('#endless-dialog').evaluate(e=>e.open),true);
    await page.locator('#endless-dialog button').last().click();
    await page.locator('[data-stage-select="park"]').click();await page.locator('#start-button').click();
    await page.waitForFunction(()=>window.__qaGame.state==='playing');
    assert.equal(await page.evaluate(()=>window.__qaGame.isEndless()),false);
    assert.equal(await page.locator('[data-item="DDM"]').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__qaGame.stageManager.getStage().duration),60);
    await page.evaluate(()=>{const game=window.__qaGame;game.lives=0;game.finishGameOver();});
    assert.equal(await page.locator('#gameover-title').textContent(),'先休息一下吧');
    assert.equal(await page.locator('#gameover-screen .rescue-statistics > div').count(),4);
    assert.equal(await page.locator('.endless-result-record').isVisible(),false);
    report.checks.push(name+': stable four-slot layout, 171s continuous play, unlock, keys 1–4/Q, exact resume, actual DDM/SSW use, wrong item, timeout continuation, healing, four requests, game-over, replay, natural falls, restored injury atlas, actual touch/keyboard NAP fall rescue and normal patrol');
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report,null,2));
} finally {
  await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));
  await browser?.close();server.kill();
}
