import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4182'},windowsHide:true});
let browser;const report={checks:[],errors:[]};
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const [name,viewport] of [['small',{width:375,height:667}],['portrait',{width:390,height:844}],['desktop',{width:1280,height:900}]]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.route('**/src/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});});
    await page.goto('http://localhost:4182',{waitUntil:'networkidle'});
    await page.evaluate(async()=>{
      const {NPC}=await import('/src/game/NPC.js');const {statusBounds}=await import('/src/game/StatusBubbleLayout.js');
      const original=NPC.prototype.drawStatus;
      const connector=NPC.prototype.drawStatusConnector;
      NPC.prototype.drawStatusConnector=function(...args){window.__dialoguePaint.push('connector');return connector.apply(this,args);};
      NPC.prototype.drawStatus=function(ctx,now,options){
        window.__dialoguePaint.push('panel');
        const layout=options.statusLayout||this.getStatusLayout(ctx,now,options);const rect=statusBounds(layout),matrix=ctx.getTransform(),ratio=window.__qaGame.pixelRatio;
        const texts=[];const fillText=ctx.fillText;
        ctx.fillText=function(text,...args){texts.push({text,color:this.fillStyle});return fillText.call(this,text,...args);};
        original.call(this,ctx,now,options);ctx.fillText=fillText;
        window.__dialogueRects.push({role:this.role,condition:this.condition,label:layout.label,texts,
          x:(rect.x*matrix.a+matrix.e)/ratio,y:(rect.y*matrix.d+matrix.f)/ratio,width:rect.width*matrix.a/ratio,height:rect.height*matrix.d/ratio});
      };
      const game=window.__qaGame,render=game.render.bind(game);game.update=()=>{};
      game.render=now=>{window.__dialogueRects=[];window.__dialoguePaint=[];render(now);};
    });
    for(const stage of ['park','mountain','city','sports']){
      await page.evaluate(stage=>window.__qaGame.startStage(stage),stage);
      for(const point of ['center','top','bottom','left','right']){
        const result=await page.evaluate(async({stage,point})=>{
          const game=window.__qaGame;const {NPC}=await import('/src/game/NPC.js');const def=game.stageManager.getStage();
          const x=point==='left'?20:point==='right'?def.world.width-20:def.world.width/2;
          const y=point==='top'?20:point==='bottom'?def.world.height-20:def.world.height*.62;
          const roles=stage==='city'?['youngWoman','deliveryWorker']:stage==='sports'?['grassVisitor','runner']:['elder','visitor'];
          game.npcs=roles.map((role,id)=>{
            const npc=new NPC({id,role,x:x+id*3,y:y+id*3});npc.spriteImage=game.npcSpriteImage;npc.spriteSheet=game.npcSpriteSheet;
            if(['city','sports'].includes(stage))npc.startScenario(id?'SPORT_SORE':stage==='sports'?'GRASS_SKIN':'SKINCARE',999,3);
            else npc.startEvent(id?'SORENESS':'ITCH',999,3);
            npc.state=id?'CRITICAL':'HELP';npc.reactionTimer=0;npc.tolerance=id?2:600;return npc;
          });
          game.player.x=x;game.player.y=Math.min(def.world.height-20,y+100);game.cameraState=null;
          game.render(1300);
          const canvas=game.canvas.getBoundingClientRect();
          const controls=[...document.querySelectorAll('.game-hud,.mobile-dpad,.item-dock,#action-button,#exit-stage-button')]
            .map(element=>element.getBoundingClientRect()).filter(rect=>rect.width&&rect.height)
            .map(rect=>({x:rect.left-canvas.left,y:rect.top-canvas.top,width:rect.width,height:rect.height}));
          return {rects:window.__dialogueRects,paint:window.__dialoguePaint,controls,width:game.viewport.width,height:game.viewport.height};
        },{stage,point});
        const overlaps=(a,b)=>a.x<b.x+b.width-.5&&a.x+a.width>b.x+.5&&a.y<b.y+b.height-.5&&a.y+a.height>b.y+.5;
        assert.equal(result.rects.length,2,`${name} ${stage} ${point}: drawn pair`);
        assert.ok(result.paint.lastIndexOf('connector')<result.paint.indexOf('panel'),'Connectors must remain behind all dialogue panels');
        assert.equal(overlaps(...result.rects),false,`${name} ${stage} ${point}: overlapping bubbles`);
        for(const rect of result.rects){
          assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=result.width+.1&&rect.y+rect.height<=result.height+.1,`${name} ${stage} ${point}: clipping`);
          assert.equal(result.controls.some(control=>overlaps(rect,control)),false,`${name} ${stage} ${point}: covered control`);
          assert.equal(rect.texts[0].color,rect.condition==='ITCH'?'#60428a':'#204f7a');
          assert.match(rect.label,rect.condition==='ITCH'?/癢/:/痠/);
        }
        report.checks.push(`${name}/${stage}/${point}: pair, bars, symptoms, palette, viewport and controls`);
        if(point==='center'||(name==='small'&&point==='bottom'))await page.screenshot({path:`qa/scenarios/dialogue-v1-${name}-${stage}-${point}.png`});
      }
      if(name==='desktop'){
        const indicators=await page.evaluate(()=>{
          const game=window.__qaGame,stage=game.stageManager.getStage();
          game.npcs.forEach((npc,i)=>{npc.x=30+i*30;npc.y=30;});
          game.player.x=stage.world.width/2;game.player.y=stage.world.height-50;game.cameraState=null;game.render(1300);
          return [...document.querySelectorAll('.rescue-indicator:not(.is-hidden)')].map(node=>({condition:node.dataset.condition,label:node.textContent,background:getComputedStyle(node).backgroundColor,overflow:node.scrollWidth>node.clientWidth}));
        });
        assert.equal(indicators.length,2);
        for(const indicator of indicators){
          assert.match(indicator.label,indicator.condition==='ITCH'?/癢/:/痠/);
          assert.equal(indicator.overflow,false);
          assert.equal(indicator.background,indicator.condition==='ITCH'?'rgb(243, 237, 252)':'rgb(214, 233, 251)');
        }
        report.checks.push(`${name}/${stage}/offscreen: symptom and palette`);
      }
    }
    await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: 60 paired-dialogue cases at three viewports across four stages, plus four offscreen-indicator checks.');
}catch(error){report.status='FAIL';report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{await fs.writeFile('qa/scenarios/dialogue-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
