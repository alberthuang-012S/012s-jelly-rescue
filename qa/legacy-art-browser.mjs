import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4181'},windowsHide:true});
let browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true});
  const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});});
  await page.goto('http://localhost:4181',{waitUntil:'networkidle'});
  for(const id of ['park','mountain','park']){
    await page.evaluate(id=>window.__qaGame.startStage(id),id);
    const loaded=await page.evaluate(()=>{const sheet=window.__qaGame.npcSpriteSheet;return {src:sheet.conditionImage.src,width:sheet.conditionImage.naturalWidth,height:sheet.conditionImage.naturalHeight,top:sheet.topOffsets,feet:sheet.footOffsets};});
    assert.ok(loaded.src.endsWith('npc-condition-v2.webp'));
    assert.equal(loaded.width,960);assert.equal(loaded.height,640);assert.equal(loaded.top.length,3);
    for(const condition of ['ITCH','SORENESS']){
      const recorded=await page.evaluate(({id,condition})=>{
        const game=window.__qaGame;
        game.eventDirector.nextEventAt=Infinity;game.eventDirector.nextSpawnAt=Infinity;
        game.npcs.forEach(npc=>{npc.clearEvent();npc.active=false;});
        const npc=game.npcs.find(npc=>id==='mountain'?npc.role==='elder':npc.role==='visitor');
        assertDefined(npc);
        npc.active=true;
        // Mountain elder keeps the seeded position in front of the pavilion;
        // Park uses an open lane.
        if(id==='park'){npc.x=384;npc.y=820;}
        npc.startEvent(condition,999,3);npc.state='HELP';
        game.player.x=npc.x;game.player.y=npc.y+120;game.cameraState=null;
        game.render(performance.now());
        let drawn;const ctx={save(){},restore(){},drawImage(image){drawn=image;}};
        npc.drawWorldSprite(ctx,0,0);
        const concerned=drawn===game.npcSpriteSheet.conditionImage;
        npc.rescue(1);npc.drawWorldSprite(ctx,0,0);
        const restored=drawn===game.npcSpriteImage;
        npc.clearEvent();npc.startEvent(condition,999,3);npc.state='HELP';
        return {id,condition,concerned,restored,x:npc.x,y:npc.y};
        function assertDefined(npc){if(!npc)throw new Error('Missing seeded role');}
      },{id,condition});
      assert.equal(recorded.concerned,true);assert.equal(recorded.restored,true);checks.push(recorded);
      await page.screenshot({path:`qa/scenarios/art-v2-${id}-${condition.toLowerCase()}-portrait.png`});
    }
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile('qa/scenarios/legacy-art-browser-report.json',JSON.stringify({status:'PASS',checks,errors},null,2)+'\n');
  console.log('PASS: Park/Mountain expression loading, both conditions, rescue restoration, pavilion rendering and cached return.');
}finally{await browser?.close();server.kill();}
