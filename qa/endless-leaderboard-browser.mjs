import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4198'},windowsHide:true});
const report={checks:[],layouts:[],errors:[]};let browser;
const dialog='#endless-leaderboard-dialog';
async function setup(context){
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('localhost'))report.errors.push(r.status()+' '+r.url());});
 await page.route('**/src/main.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new Game();','window.__qaGame = new Game();')});
 });
 await page.route('**/src/game/Game.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll('requestAnimationFrame(this.loop);','/* QA drives frames. */')});
 });
 await page.goto('http://localhost:4198',{waitUntil:'networkidle'});return page;
}
async function finish(page,seconds,score,rescued,practice=false){
 await page.evaluate(async ({seconds,score,rescued,practice})=>{
   const game=window.__qaGame;await game.endlessMode.newRun();
   game.stageManager.elapsed=seconds;game.scoreManager.score=score;game.scoreManager.rescuedCount=rescued;
   game.combo.maxCombo=12;game.endlessMode.run.practice=practice;game.endlessMode.run.lives=0;game.lives=0;
   game.endlessMode.finish();
 },{seconds,score,rescued,practice});
}
async function boardLayout(page,width,height){
 const result=await page.evaluate(()=>{
   const d=document.querySelector('#endless-leaderboard-dialog'),r=d.getBoundingClientRect();
   const boxes=[...d.querySelectorAll('thead th,tbody td,tbody th,button')].map(n=>{const b=n.getBoundingClientRect();return {x:b.x,right:b.right,width:b.width,overflow:n.scrollWidth>n.clientWidth+1};});
   const scroll=d.querySelector('.leaderboard-table-scroll');
   return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,boxes,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,dialogScroll:d.scrollHeight,dialogClient:d.clientHeight};
 });
 assert.ok(result.x>=0&&result.y>=0&&result.right<=width+1&&result.bottom<=height+1);
 assert.ok(result.boxes.every(r=>!r.overflow&&r.x>=result.x&&r.right<=result.right));
 assert.ok(result.dialogScroll<=result.dialogClient+1,'Only the table scrolls; dialog controls stay visible');
 report.layouts.push({width,height,...result});
}
try{
 await fs.mkdir('qa/endless',{recursive:true});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const [width,height]of [[1280,900],[1024,768],[390,844],[375,667],[320,640],[844,390]]){
   const context=await browser.newContext({viewport:{width,height}}),page=await setup(context);
   const trigger=page.locator('#endless-leaderboard-open');
   await trigger.scrollIntoViewIfNeeded();
   const button=await trigger.boundingBox();assert.ok(button.height>=44&&button.x>=0&&button.x+button.width<=width);
   const before=await page.evaluate(()=>localStorage.getItem('jellyRescue.endless.v2'));
   await trigger.click();
   assert.equal(await page.locator(dialog).evaluate(d=>d.open),true);
   assert.equal(await page.locator('#endless-leaderboard-rows tr').count(),7);
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player').count(),0);
   assert.match(await page.locator('#endless-leaderboard-summary').innerText(),/完成首次挑戰/);
   assert.match(await page.locator('.leaderboard-simulation-label').innerText(),/本機模擬榜單/);
   await boardLayout(page,width,height);
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.evaluate(()=>document.querySelector('#endless-leaderboard-dialog').contains(document.activeElement)),true);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator(dialog).evaluate(d=>d.open),false);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'endless-leaderboard-open');
   assert.equal(await page.evaluate(()=>localStorage.getItem('jellyRescue.endless.v2')),before);

   await page.evaluate(()=>{window.__qaGame.endlessMode.store.updateBest(300,30000,120);window.__qaGame.endlessMode.updateHome();});
   assert.match(await page.locator('#endless-best').innerText(),/第 4 名/);
   await trigger.click();
   assert.equal(await page.locator('#endless-leaderboard-rows tr').count(),8);
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player').count(),1);
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player').getAttribute('data-rank'),'4');
   assert.match(await page.locator('#endless-leaderboard-target').innerText(),/124 秒/);
   await boardLayout(page,width,height);
   await page.screenshot({path:`qa/endless/leaderboard-${width}x${height}.png`});
   await page.locator('.leaderboard-return').click();
   await page.reload({waitUntil:'networkidle'});
   await trigger.click();
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player').getAttribute('data-rank'),'4');
   await page.locator('#endless-leaderboard-close').click();

   await finish(page,250,40000,150);
   assert.match(await page.locator('.endless-ranking-headline').innerText(),/本次挑戰第 5 名/);
   assert.match(await page.locator('.endless-ranking-result p').first().innerText(),/最佳：第 4 名/);
   assert.equal(await page.locator('.endless-ranking-result').evaluate(n=>n.classList.contains('is-celebrating')),false);
   await page.locator('#endless-result-leaderboard').click();
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player .leaderboard-time').innerText(),'05:00');
   await page.locator('#endless-leaderboard-close').click();
   assert.equal(await page.evaluate(()=>document.activeElement.id),'endless-result-leaderboard');

   await finish(page,650,80000,340);
   assert.match(await page.locator('.endless-ranking-headline').innerText(),/第 4 名 → 第 2 名/);
   assert.equal(await page.locator('.endless-ranking-result').evaluate(n=>n.classList.contains('is-celebrating')),true);
   await page.locator('#endless-result-leaderboard').scrollIntoViewIfNeeded();
   await page.screenshot({path:`qa/endless/leaderboard-result-${width}x${height}.png`});
   await page.locator('#endless-result-leaderboard').click();
   assert.equal(await page.locator('#endless-leaderboard-rows .is-player').getAttribute('data-rank'),'2');
   await page.locator('.leaderboard-return').click();

   await finish(page,901,80000,360);
   assert.match(await page.locator('.endless-ranking-headline').innerText(),/第 1 名/);
   assert.match(await page.locator('.endless-ranking-target').innerText(),/登上榜首/);
   await finish(page,950,120000,500,true);
   assert.match(await page.locator('.endless-ranking-headline').innerText(),/練習局/);
   assert.equal(await page.evaluate(()=>window.__qaGame.endlessMode.store.load().best.survivedMs),901000);
   await page.locator('#gameover-home').click();
   assert.match(await page.locator('#endless-best').innerText(),/第 1 名/);
   await page.locator('#endless-start').click();await page.waitForFunction(()=>window.__qaGame.state==='playing');
   await page.evaluate(()=>{const g=window.__qaGame;g.stageManager.elapsed=65;g.endlessMode.syncItems(false);g.endlessMode.save();g.showHome();});
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jellyRescue.endless.v2')).run);
   await trigger.click();await page.locator('#endless-leaderboard-close').click();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('jellyRescue.endless.v2')).run),saved);
   await page.locator('#endless-resume').click();await page.waitForFunction(()=>window.__qaGame.state==='playing');
   assert.equal(await page.evaluate(()=>window.__qaGame.stageManager.elapsed),65);
   await page.evaluate(async()=>{const g=window.__qaGame;g.showHome();await g.startStage('park');g.lives=0;g.finishGameOver();});
   assert.equal(await page.locator('.endless-ranking-result').isVisible(),false);
   assert.equal(await page.locator(dialog).evaluate(d=>d.open),false);
   report.checks.push(`${width}x${height}: empty/8-row board, scores and rank, table scroll, focus/Escape, reload, current vs best, rank rise, champion, practice exclusion, exact resume and patrol isolation`);
   await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};});
 const page=await setup(context);
 await finish(page,300,30000,120);
 await page.locator('#endless-result-leaderboard').click();
 assert.equal(await page.locator('#endless-leaderboard-rows .is-player').getAttribute('data-rank'),'4');
 assert.match(await page.locator('#endless-leaderboard-summary').innerText(),/本次遊玩/);
 await context.close();report.checks.push('Unavailable storage keeps the real player rank for the current session');
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify({checks:report.checks,errors:report.errors},null,2));
}finally{
 await fs.writeFile('qa/endless/leaderboard-browser-report.json',JSON.stringify(report,null,2));
 await browser?.close();server.kill();
}
