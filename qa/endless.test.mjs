import test from 'node:test';
import assert from 'node:assert/strict';
import { createEndlessStage, createEndlessRun, healEndlessRun, seededRandom, EndlessStore, ENDLESS_SAVE_KEY, validEndlessRun } from '../src/game/EndlessRun.js';
import { ENDLESS_STAGE, ENDLESS_ITEMS, endlessSchedule, safeEndlessPosition } from '../src/game/EndlessStage.js';
import { STAGE_DEFS, StageManager } from '../src/game/StageManager.js';
import { EndlessDirector } from '../src/game/EndlessDirector.js';
import { EndlessMode } from '../src/game/EndlessMode.js';
import { TravelPlanner } from '../src/game/TravelPlanner.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { NPC } from '../src/game/NPC.js';
import { STATES, CONDITIONS } from '../src/game/constants.js';
import { scenarioDialogue } from '../src/game/ScenarioDefinitions.js';
const active = (npc) => npc.active && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state);
const plain = (o) => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k,v]) => !['spriteImage','spriteSheet','stateMachine','random','onFailure','onStateChange'].includes(k) && typeof v !== 'function'))));

test('one dedicated map stays reachable and does not expire or modify patrol stages', () => {
  const before = JSON.stringify(STAGE_DEFS);
  const stage = createEndlessStage(123);
  assert.deepEqual(stage, createEndlessStage(123));
  assert.notDeepEqual(stage.spawnPoints, createEndlessStage(124).spawnPoints);
  assert.equal(stage.id, 'endlessPlaza');
  assert.equal(stage.renderer, 'endless');
  const planner = new TravelPlanner(stage, 25);
  for (const point of [...stage.spawnPoints, ...stage.routes.promenade]) assert.ok(Number.isFinite(planner.pathDistance(stage.start, point)));
  const manager = new StageManager(); manager.start(stage.id, stage); manager.update(1000000);
  assert.equal(manager.status, 'playing'); assert.equal(manager.elapsed, 1000000); assert.equal(manager.getRemaining(), null);
  manager.start('park'); assert.equal(manager.getStage(), STAGE_DEFS.park);
  assert.equal(JSON.stringify(STAGE_DEFS), before);
});

test('request cadence accelerates, holds through unlock, then cycles rush and easing forever', () => {
  assert.equal(endlessSchedule(0).interval,4);
  assert.equal(endlessSchedule(20).interval,3);
  assert.deepEqual(endlessSchedule(59.99),endlessSchedule(60));
  assert.equal(endlessSchedule(79.99).maxSimultaneous,2);
  assert.equal(endlessSchedule(80).interval,2.4); assert.equal(endlessSchedule(80).maxSimultaneous,3);
  assert.equal(endlessSchedule(150).interval,1.8); assert.equal(endlessSchedule(160).interval,2.6);
  assert.deepEqual(endlessSchedule(150), endlessSchedule(150 + 15 * 100000));
  assert.deepEqual(endlessSchedule(160), endlessSchedule(160 + 15 * 100000));
  assert.equal(endlessSchedule(1000000).maxSimultaneous,4);
  assert.equal(endlessSchedule(1000000).tolerance,9);
});

test('before sixty seconds only PPA/NAP dispatch; afterwards all four have clear dialogue', () => {
  const stage=createEndlessStage(88), npcs=[];
  const director=new EndlessDirector(stage,{random:seededRandom(88),getPlayer:()=>({...stage.start,radius:25,speed:205})});
  director.seed(npcs);
  const seen=new Set();
  for(let i=0;i<100;i++){
    assert.equal(director.triggerEvent(59.99,npcs),true);
    const npc=npcs.find(active); assert.ok([CONDITIONS.ITCH, CONDITIONS.SORENESS].includes(npc.condition)); npc.clearEvent(0);
  }
  for(let i=0;i<100;i++){
    assert.equal(director.triggerEvent(60,npcs),true);
    const npc=npcs.find(active); seen.add(npc.condition); npc.clearEvent(0);
  }
  assert.deepEqual([...seen].sort(),Object.values(CONDITIONS).sort());
  for(const type of ENDLESS_STAGE.scenarioPool) assert.ok(scenarioDialogue('youngWoman',type,STATES.HELP,stage.id));
});

test('complete four-person schedules reject mutually impossible visits even when each pair works', () => {
  const director=new EndlessDirector(createEndlessStage(1),{getPlayer:()=>({x:0,y:0})});
  director.routeTime=(from,to)=>from===to?0:1;
  const events=[1,2,3].map(id=>({id,state:STATES.HELP,tolerance:4,warningTimer:0}));
  const candidate={id:4};
  for(const existing of events) assert.equal(director.isScheduleFeasible(candidate,[existing],4,0),true);
  assert.equal(director.isScheduleFeasible(candidate,events,4,0),false);
  assert.equal(director.isScheduleFeasible(candidate,events.map(e=>({...e,tolerance:10})),10,0),true);
});

test('twenty rescues heals once, capped at three, and full-heart milestones cannot be banked', () => {
  const run=createEndlessRun(5); run.lives=2;
  assert.equal(healEndlessRun(run,19),0);
  assert.equal(healEndlessRun(run,20),1); assert.equal(healEndlessRun(run,20),0);
  assert.equal(healEndlessRun(run,40),0); run.lives=2;
  assert.equal(healEndlessRun(run,41),0); assert.equal(healEndlessRun(run,60),1);
});

test('a long continuous run has reproducible requests, changing residents and bounded population', () => {
  function simulate(){
    const stage=createEndlessStage(123), npcs=[], history=[], player={...stage.start,radius:25,speed:205};
    let failed=0, rescued=0, target=null, travel=0, maxPopulation=0;
    const director=new EndlessDirector(stage,{random:seededRandom(123),getPlayer:()=>player,onFailure:()=>failed++,onEvent:npc=>history.push([npc.id,npc.condition,npc.eventStartedAt])});
    director.seed(npcs);
    for(let step=0;step<12000;step++){
      const time=step*.1;
      director.update(.1,time,npcs);
      for(const npc of npcs)npc.update(.1,stage,time);
      assert.ok(npcs.filter(active).length<=endlessSchedule(time).maxSimultaneous);
      assert.ok(npcs.length<=stage.maxNpcs);
      for(const resident of npcs.filter(active)) assert.ok(Number.isFinite(director.routeTime(player,resident)), 'Reacting residents retain player clearance');
      maxPopulation=Math.max(maxPopulation,npcs.length);
      if(!target){
        target=npcs.filter(active).sort((a,b)=>(a.warningTimer+a.tolerance)-(b.warningTimer+b.tolerance))[0];
        if(target)travel=director.routeTime(player,target)+.5;
      }
      if(target){
        travel-=.1;
        if(travel<=0){
          if(active(target)){player.x=target.x;player.y=target.y;target.rescue(time);rescued++;}
          target=null;
        }
      }
    }
    assert.equal(failed,0);
    assert.ok(rescued>400); assert.ok(director.nextNpcId>100); assert.equal(maxPopulation,12);
    assert.ok(npcs.every(n=>Number.isFinite(n.departAt)));
    return history;
  }
  assert.deepEqual(simulate(),simulate());
});

test('departing residents cannot receive requests and leave through the plaza exit', () => {
  const stage=createEndlessStage(1);
  const npc=new NPC({id:'exit',role:'cafeVisitor',x:384,y:990,path:[{x:384,y:1010}],stageId:stage.id});
  npc.departing=true;
  assert.equal(npc.canReceiveEvent(100),false);
  npc.update(.2,stage,100); assert.equal(npc.active,false);
});

test('v2 persists long sessions, validates snapshots, isolates v1 and ranks survival before score', () => {
  const data=new Map([['jellyRescue.endless.v1','old-round-save']]);
  const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const store=new EndlessStore({storage}),run=createEndlessRun(456),stage=createEndlessStage(456),npcs=[];
  const director=new EndlessDirector(stage,{random:seededRandom(456)}); director.seed(npcs);
  run.status='playing'; run.unlocked=true;
  run.snapshot={elapsed:100000,player:{x:384,y:650,radius:25,speed:205,distanceTravelled:22},score:plain(new ScoreManager()),combo:{combo:1,maxCombo:5},selectedItem:'SSW',randomState:123,director:{nextNpcId:12,nextSpawnAt:100001,nextEventAt:100002},npcs:npcs.map(plain)};
  assert.equal(validEndlessRun(run),true);
  store.save(run); assert.deepEqual(new EndlessStore({storage}).load().run,run);
  assert.equal(data.get('jellyRescue.endless.v1'),'old-round-save');
  assert.equal(store.updateBest(300,100,12).isNewBest,true);
  assert.equal(store.updateBest(299,9999,200).isNewBest,false);
  assert.equal(store.updateBest(300,101,13).isNewBest,true);
  assert.equal(store.updateBest(999,9999,100,true).isNewBest,false);
  store.save({...run,status:'over'}); assert.equal(store.load().run,null);
  data.set(ENDLESS_SAVE_KEY,JSON.stringify({run:{...run,snapshot:{...run.snapshot,elapsed:Infinity}},best:{survivedMs:300000,score:101,rescuedCount:13}}));
  assert.equal(store.load().run,null); assert.equal(store.load().best.score,101);
  data.set(ENDLESS_SAVE_KEY,'broken-json');
  assert.equal(new EndlessStore({storage}).load().run,null);
  const blocked=new EndlessStore({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
  blocked.save(run); assert.deepEqual(blocked.load().run,run);
  const stale=JSON.stringify({run:createEndlessRun(1),best:{survivedMs:1000,score:5,rescuedCount:1}});
  const quota=new EndlessStore({storage:{getItem:()=>stale,setItem(){throw Error('quota');}}});
  quota.load(); quota.save(run); assert.equal(quota.load().run.seed,456);
  assert.equal(quota.updateBest(400,200,20).best.survivedMs,400000);
  assert.deepEqual(ENDLESS_ITEMS,['PPA','NAP','DDM','SSW']);
});

test('plaza dispatch includes animated falls from the start without changing product-family balance', () => {
  const stage=createEndlessStage(92), npcs=[],director=new EndlessDirector(stage,{random:seededRandom(92)});
  director.seed(npcs);
  for(const time of [1,180]){
    const counts=Object.fromEntries(Object.values(CONDITIONS).map(c=>[c,0]));
    let falls=0;
    for(let i=0;i<800;i++){
      npcs.forEach(n=>n.clearEvent(time-2));
      assert.equal(director.triggerEvent(time,npcs),true);
      const npc=npcs.find(active); counts[npc.condition]++;
      if(npc.scenarioType==='FALL'){
        falls++; assert.ok(['basketballPlayer','runner','skateboarder'].includes(npc.role));
        assert.equal(npc.condition,CONDITIONS.SORENESS);
        assert.equal(npc.reactionType,'fall');
        assert.match(scenarioDialogue(npc.role,'FALL',STATES.WARNING,stage.id),/跌倒/);
        assert.match(scenarioDialogue(npc.role,'FALL',STATES.HELP,stage.id),/膝蓋/);
        npc.spriteSheet={injuryImage:{complete:true,naturalWidth:768}};
        assert.equal(npc.getInjuryPose().frame,0);
        npc.reactionTimer=0; assert.equal(npc.getInjuryPose().frame,2);
        npc.rescue(time+.5); assert.equal(npc.getInjuryPose(),null);
      }
    }
    assert.ok(falls>40 && falls<220,'Falls are a subset of NAP requests');
    const expected=time<60?400:200;
    for(const condition of time<60?[CONDITIONS.ITCH,CONDITIONS.SORENESS]:Object.values(CONDITIONS))assert.ok(Math.abs(counts[condition]-expected)<70);
    if(time<60)assert.equal(counts[CONDITIONS.PIGMENTATION]+counts[CONDITIONS.SALLOWNESS],0);
  }
});

test('mixed plaza roles use the matching atlas and missing sports art never substitutes a city resident', async () => {
  const {Game}=await import('../src/game/Game.js');
  const cityImage={},citySheet={},sportsImage={},sportsSheet={};
  const game={npcSpriteImage:cityImage,npcSpriteSheet:citySheet,endlessSportsSprites:{image:sportsImage,sheet:sportsSheet}};
  for(const role of ['basketballPlayer','runner','skateboarder','shopper']){
    const npc={role,stageId:'endlessPlaza'};Game.prototype.applyNpcAssets.call(game,npc);
    const sports=role!=='shopper';
    assert.equal(npc.spriteImage,sports?sportsImage:cityImage);assert.equal(npc.spriteSheet,sports?sportsSheet:citySheet);
  }
  game.endlessSportsSprites=null;
  const fallback={role:'runner',stageId:'endlessPlaza'};Game.prototype.applyNpcAssets.call(game,fallback);
  assert.equal(fallback.spriteImage,null);assert.equal(fallback.spriteSheet,null);
  const normal={role:'runner',stageId:'sports'};Game.prototype.applyNpcAssets.call(game,normal);
  assert.equal(normal.spriteImage,cityImage);assert.equal(normal.spriteSheet,citySheet);
});

test('artwork registration keeps legal positions and safely restores old saves inside new props', () => {
  const stage = createEndlessStage(77), planner = new TravelPlanner(stage, 25);
  for (const point of [stage.start, ...stage.spawnPoints]) {
    assert.deepEqual(safeEndlessPosition(stage, point, 25), {x:point.x,y:point.y});
  }
  for (const prop of stage.obstacles) {
    const old = {x:prop.x+prop.width/2,y:prop.y+prop.height/2};
    const restored = safeEndlessPosition(stage, old, 25);
    assert.notDeepEqual(restored, old);
    assert.ok(planner.canOccupy(restored));
    assert.ok(Number.isFinite(planner.pathDistance(stage.start, restored)));
  }
  const npc = new NPC({id:'old-fall',role:'runner',x:610,y:720,stageId:stage.id,
    path:[{x:570,y:755},{x:570,y:660}],random:seededRandom(77)});
  npc.startScenario('FALL',9,3,180); npc.reactionTimer=0; npc.enterHelp(); npc.departAt=240;
  const game = {player:{x:384,y:520,radius:25,distanceTravelled:0},
    scoreManager:{score:0,rescuedCount:0},combo:{combo:0,maxCombo:0},
    stageManager:{elapsed:0,getStage:()=>stage},eventDirector:{},
    applyNpcAssets(){},itemSystem:{select(){}},handleFailure(){},handleNPCStateChange(){}};
  const random = seededRandom(77);
  EndlessMode.prototype.restoreState.call({game,random,syncItems(){}},{
    player:{x:610,y:610,radius:25,distanceTravelled:123},score:{score:1234,rescuedCount:34},
    combo:{combo:5,maxCombo:12},elapsed:180,director:{},npcs:[plain(npc)],
    randomState:333,selectedItem:'SSW'
  });
  assert.ok(planner.canOccupy(game.player));
  assert.ok(new TravelPlanner(stage,game.npcs[0].radius).canOccupy(game.npcs[0]));
  assert.equal(game.stageManager.elapsed,180);
  assert.equal(game.scoreManager.score,1234); assert.equal(game.player.distanceTravelled,123);
  assert.equal(game.npcs[0].scenarioType,'FALL'); assert.equal(game.npcs[0].state,STATES.HELP);
  assert.equal(game.npcs[0].tolerance,9); assert.equal(game.npcs[0].departAt,240);
  assert.deepEqual(game.npcs[0].path,stage.routes.promenade);
  assert.equal(random.getState(),333);
});
