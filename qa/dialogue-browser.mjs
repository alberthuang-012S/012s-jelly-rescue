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
      const {NPC}=await import('/src/game/NPC.js');
      const statusBounds=layout=>({x:layout.bubbleX,y:layout.bubbleY,width:layout.bubbleWidth,height:layout.bubbleHeight});
      const original=NPC.prototype.drawStatus;
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
            const npc=new NPC({id,role,x:x+id*3,y:y+id*3,stageId:stage});npc.spriteImage=game.npcSpriteImage;npc.spriteSheet=game.npcSpriteSheet;
            if(['city','sports'].includes(stage))npc.startScenario(id?'SPORT_SORE':stage==='sports'?'GRASS_SKIN':'SKINCARE',999,3);
            else npc.startEvent(id?'SORENESS':'ITCH',999,3);
            npc.state=id?'CRITICAL':'HELP';npc.reactionTimer=0;npc.tolerance=id?2:600;return npc;
          });
          game.player.x=x;game.player.y=Math.min(def.world.height-20,y+100);game.cameraState=null;
          const getCamera=game.getCamera;
          const camera=getCamera.call(game,def);game.getCamera=()=>camera;
          game.render(1300);
          const before=window.__dialogueRects.map(rect=>({x:rect.x,y:rect.y}));
          game.player.x+=15;game.render(1350);
          const after=window.__dialogueRects.map(rect=>({x:rect.x,y:rect.y}));
          game.getCamera=getCamera;
          const canvas=game.canvas.getBoundingClientRect();
          const controls=[...document.querySelectorAll('.game-hud,.mobile-dpad,.item-dock,#action-button,#exit-stage-button')]
            .map(element=>element.getBoundingClientRect()).filter(rect=>rect.width&&rect.height)
            .map(rect=>({x:rect.left-canvas.left,y:rect.top-canvas.top,width:rect.width,height:rect.height}));
          return {rects:window.__dialogueRects,before,after,controls,width:game.viewport.width,height:game.viewport.height};
        },{stage,point});
        const overlaps=(a,b)=>a.x<b.x+b.width-.5&&a.x+a.width>b.x+.5&&a.y<b.y+b.height-.5&&a.y+a.height>b.y+.5;
        assert.equal(result.rects.length,2,`${name} ${stage} ${point}: drawn pair`);
        assert.deepEqual(result.after,result.before,`${name} ${stage} ${point}: player movement must not relocate bubbles`);
        const expectedLabels={
          park:['好癢！','快受不了了！'],
          mountain:['好癢！','快受不了了！'],
          city:['想好好照顧一下皮膚。','痠得快背不動了！'],
          sports:['皮膚開始有點癢癢的……','雙腿痠得受不了！']
        }[stage];
        for(const [index,rect] of result.rects.entries()){
          assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=result.width+.1&&rect.y+rect.height<=result.height+.1,`${name} ${stage} ${point}: clipping`);
          assert.equal(rect.texts[0].color,rect.condition==='ITCH'?'#173a76':'#a83d67');
          assert.equal(rect.label,expectedLabels[index],`${name} ${stage} ${point}: stage-specific dialogue`);
        }
        report.checks.push(`${name}/${stage}/${point}: stable owner position, routed dialogue, state-only palette and viewport`);
        if(point==='center'||(name==='small'&&point==='bottom'))await page.screenshot({path:`qa/scenarios/dialogue-v1-${name}-${stage}-${point}.png`});
      }
      if(name==='desktop'){
        const indicators=await page.evaluate(()=>{
          const game=window.__qaGame,stage=game.stageManager.getStage();
          game.npcs.forEach((npc,i)=>{npc.x=30+i*30;npc.y=30;});
          game.player.x=stage.world.width/2;game.player.y=stage.world.height-50;game.cameraState=null;game.render(1300);
          return [...document.querySelectorAll('.rescue-indicator:not(.is-hidden)')].map(node=>({critical:node.classList.contains('rescue-indicator-critical'),label:node.textContent,background:getComputedStyle(node).backgroundColor,overflow:node.scrollWidth>node.clientWidth}));
        });
        assert.equal(indicators.length,2);
        for(const indicator of indicators){
          assert.match(indicator.label,indicator.critical?/緊急/:/求救/);
          assert.doesNotMatch(indicator.label,/癢|痠/);
          assert.equal(indicator.overflow,false);
          assert.equal(indicator.background,indicator.critical?'rgb(255, 227, 232)':'rgb(255, 242, 206)');
        }
        report.checks.push(`${name}/${stage}/offscreen: original help labels and state-only palette`);
      }
    }
    await page.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('PASS: 60 paired-dialogue cases at three viewports across four stages, plus four offscreen-indicator checks.');
}catch(error){report.status='FAIL';report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{await fs.writeFile('qa/scenarios/dialogue-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();}
