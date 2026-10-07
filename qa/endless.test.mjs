import test from 'node:test';
import assert from 'node:assert/strict';
import { createEndlessStage, createEndlessRun, healEndlessRun, seededRandom, EndlessStore, ENDLESS_SAVE_KEY, validEndlessRun } from '../src/game/EndlessRun.js';
import { ENDLESS_STAGE, ENDLESS_ITEMS, endlessSchedule, safeEndlessPosition, ENDLESS_MOVEMENT_VERSION } from '../src/game/EndlessStage.js';
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
  for (const point of [...stage.spawnPoints, ...Object.values(stage.routes).flat()]) assert.ok(Number.isFinite(planner.pathDistance(stage.start, point)));
  for (const route of Object.values(stage.routes)) route.forEach((point, index) => assert.ok(planner.isClear(point, route[(index+1)%route.length]), 'Every patrol segment clears props'));
  const manager = new StageManager(); manager.start(stage.id, stage); manager.update(1000000);
  assert.equal(manager.status, 'playing'); assert.equal(manager.elapsed, 1000000); assert.equal(manager.getRemaining(), null);
  manager.start('park'); assert.equal(manager.getStage(), STAGE_DEFS.park);
  assert.equal(JSON.stringify(STAGE_DEFS), before);
});

test('pressure rises at every boundary, then alternates continuous busy/easing periods with five requests', () => {
  for (const [time, interval, cap] of [[0,2.5,2],[14.99,2.5,2],[15,2,3],[59.99,2,3],
    [60,1.6,3],[119.99,1.6,3],[120,1.4,4],[179.99,1.4,4],[180,1.2,5],[195.99,1.2,5],[196,1.8,5],[199.99,1.8,5],[200,1.2,5]]) {
    assert.equal(endlessSchedule(time).interval,interval);
    assert.equal(endlessSchedule(time).maxSimultaneous,cap);
  }
  assert.deepEqual(endlessSchedule(180), endlessSchedule(180 + 20 * 100000));
  assert.deepEqual(endlessSchedule(196), endlessSchedule(196 + 20 * 100000));
  assert.equal(endlessSchedule(1000000).maxSimultaneous,5);
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

test('fifty rescues heals once, capped at three, and full-heart milestones cannot be banked', () => {
  const run=createEndlessRun(5); run.lives=2;
  assert.equal(healEndlessRun(run,20),0); assert.equal(healEndlessRun(run,49),0);
  assert.equal(healEndlessRun(run,50),1); assert.equal(healEndlessRun(run,50),0);
  assert.equal(healEndlessRun(run,100),0); run.lives=2;
  assert.equal(healEndlessRun(run,101),0); assert.equal(healEndlessRun(run,149),0);
  assert.equal(healEndlessRun(run,150),1);
});

test('five-person dispatch caps live requests and rejects joint deadlines even when each pair works', () => {
  const stage=createEndlessStage(123),npcs=[];
  const director=new EndlessDirector(stage,{random:seededRandom(123),getPlayer:()=>({...stage.start,radius:25,speed:205})});
  director.seed(npcs);
  for(let i=0;i<5;i++) assert.equal(director.triggerEvent(180,npcs),true);
  assert.equal(npcs.filter(active).length,5);
  assert.equal(director.triggerEvent(180,npcs),false);
  director.routeTime=(from,to)=>from===to?0:1;
  const events=[1,2,3,4].map(id=>({id,state:STATES.HELP,tolerance:8,warningTimer:0}));
  const candidate={id:5};
  for(const existing of events) assert.equal(director.isScheduleFeasible(candidate,[existing],8,0),true);
  assert.equal(director.isScheduleFeasible(candidate,events,8,0),false);
  assert.equal(director.isScheduleFeasible(candidate,events.map(e=>({...e,tolerance:9})),9,0),true);
});

test('successful rescues expedite sparse demand without delaying an imminent request or exceeding the cap', () => {
  const stage=createEndlessStage(42),npcs=[];
  const director=new EndlessDirector(stage,{random:seededRandom(42)});
  director.seed(npcs);director.nextEventAt=14;
  const npc=npcs[0];npc.startScenario('LONG_WALK',11,3.4,9);
  npc.rescue(10);director.onRescue(10,npcs);
  assert.ok(director.nextEventAt>=10.8&&director.nextEventAt<=11.2);
  director.nextEventAt=10.5;director.onRescue(10,npcs);assert.equal(director.nextEventAt,10.5);
  npcs[1].startScenario('LONG_WALK',11,3.4,10);
  npcs[2].startScenario('OUTDOOR_SKIN',11,3.4,10);
  director.nextEventAt=14;director.onRescue(10,npcs);assert.equal(director.nextEventAt,14);
});

test('unlock introduces DDM and SSW promptly, respects caps, and restored introductions keep their order', () => {
  const stage=createEndlessStage(77),npcs=[],seen=[];
  const random=seededRandom(77);
  const director=new EndlessDirector(stage,{random,onEvent:n=>seen.push([n.eventStartedAt,n.condition])});
  director.seed(npcs);director.nextEventAt=100;
  director.update(0,59.99,npcs);assert.equal(seen.length,0);
  director.update(0,60,npcs);
  for(let time=60.1;time<70;time+=.1)director.update(.1,time,npcs);
  assert.equal(seen[0][1],CONDITIONS.PIGMENTATION);assert.equal(seen[1][1],CONDITIONS.SALLOWNESS);
  assert.ok(seen[1][0]<70);assert.equal(npcs.filter(active).length,3);
  const game={player:{...stage.start,radius:25},scoreManager:{},combo:{},stageManager:{elapsed:0,getStage:()=>stage},
    eventDirector:new EndlessDirector(stage,{random}),itemSystem:{select(){}},applyNpcAssets(){}};
  const pending=[CONDITIONS.SALLOWNESS];
  EndlessMode.prototype.restoreState.call({game,random,syncItems(){}},{
    elapsed:62,player:{...stage.start},score:{},combo:{},npcs:[],randomState:77,selectedItem:'DDM',
    director:{fourItemsDispatched:true,pendingIntroductions:pending}
  });
  assert.deepEqual(game.eventDirector.pendingIntroductions,pending);
  assert.notEqual(game.eventDirector.pendingIntroductions,pending);
});

test('a long continuous run has reproducible requests, changing residents and bounded population', () => {
  function simulate(){
    const stage=createEndlessStage(123), npcs=[], history=[], player={...stage.start,radius:25,speed:205};
    let failed=0, rescued=0, target=null, travel=0, maxPopulation=0, maxRequests=0;
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
      maxRequests=Math.max(maxRequests,npcs.filter(active).length);
      if(!target){
        const requests=npcs.filter(active).sort((a,b)=>(a.warningTimer+a.tolerance)-(b.warningTimer+b.tolerance));
        // With five simultaneous residents, urgency alone can choose a route
        // that misses another deadline. Follow a complete feasible visit order.
        const plan=(from,remaining,elapsed)=>{
          if(!remaining.length)return [];
          for(const [index,npc] of remaining.entries()){
            const arrival=elapsed+director.routeTime(from,npc)+.5;
            if(arrival>(npc.state===STATES.WARNING?npc.warningTimer:0)+npc.tolerance)continue;
            const rest=plan(npc,remaining.filter((_,i)=>i!==index),arrival);
            if(rest)return [npc,...rest];
          }
          return null;
        };
        target=(plan(player,requests,0)||requests)[0];
        if(target)travel=director.routeTime(player,target)+.5;
      }
      if(target){
        travel-=.1;
        if(travel<=0){
          if(active(target)){player.x=target.x;player.y=target.y;target.rescue(time);rescued++;director.onRescue(time,npcs);}
          target=null;
        }
      }
    }
    assert.equal(failed,0);
    assert.equal(maxRequests,5,'Five simultaneous requests occur naturally at late pressure');
    assert.ok(history.filter(event=>event[2]<60).length>=25,'The opening minute has sustained demand');
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
  const old=JSON.parse(JSON.stringify(run));delete old.healEvery;
  old.lives=2;old.healedMilestones=6;old.snapshot.score.rescuedCount=123;
  store.save(old);
  const migrated=new EndlessStore({storage}).load().run;
  assert.equal(migrated.healEvery,50);assert.equal(migrated.healedMilestones,2);
  assert.equal(migrated.lives,2);assert.deepEqual(migrated.snapshot,old.snapshot);
  assert.equal(healEndlessRun(migrated,123),0);
  assert.equal(healEndlessRun(migrated,149),0);assert.equal(healEndlessRun(migrated,150),1);
  store.save(migrated);assert.equal(new EndlessStore({storage}).load().run.healedMilestones,3);
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
  assert.ok(stage.routes[game.npcs[0].zone]);
  assert.deepEqual([...game.npcs[0].path].sort((a,b)=>a.x-b.x||a.y-b.y),[...stage.routes[game.npcs[0].zone]].sort((a,b)=>a.x-b.x||a.y-b.y));
  assert.equal(random.getState(),333);
});

test('regional arrivals and nearby loop starts keep ordinary movement spread across the plaza', () => {
  for (const seed of [1,77,123,456,789]) {
    const stage=createEndlessStage(seed),npcs=[],director=new EndlessDirector(stage,{random:seededRandom(seed)});
    const planner=new TravelPlanner(stage,25);director.seed(npcs);director.nextEventAt=Infinity;
    assert.deepEqual(Object.keys(stage.routes).map(zone=>npcs.filter(n=>n.zone===zone).length),[2,2,2,2]);
    for(const npc of npcs) assert.ok(planner.isClear(npc,npc.path[npc.pathIndex]));
    let total=0,middle=0,hub=0;
    for(let i=0;i<450;i++){
      director.update(.1,i*.1,npcs);npcs.forEach(n=>n.update(.1,stage,i*.1));
      if(i>=100&&i%5===0) for(const npc of npcs){
        assert.ok(planner.canOccupy(npc),'Ordinary walking stays outside props');
        total++;if(Math.abs(npc.x-384)<70)middle++;
        if(npc.x>=300&&npc.x<=468&&npc.y>=410&&npc.y<=680)hub++;
      }
    }
    assert.deepEqual(Object.keys(stage.routes).map(zone=>npcs.filter(n=>n.zone===zone).length),[3,3,3,3]);
    assert.ok(middle/total<.5,'Central longitudinal lane must not hold most residents');
    assert.ok(hub/total<.1,'Residents must not accumulate around the central rescue mosaic');
  }
});

test('legacy route migration preserves legal positions and requests; current snapshots preserve exact route phase', () => {
  const stage=createEndlessStage(5);
  function restore(npc,version){
    const game={player:{...stage.start,radius:25,distanceTravelled:0},scoreManager:{score:0},combo:{combo:0},
      stageManager:{elapsed:0,getStage:()=>stage},eventDirector:{},applyNpcAssets(){},itemSystem:{select(){}}};
    const random=seededRandom(5);
    EndlessMode.prototype.restoreState.call({game,random,syncItems(){}},{
      movementVersion:version,player:{...stage.start},score:{score:999},combo:{combo:2},elapsed:180,
      director:{},npcs:[plain(npc)],randomState:333,selectedItem:'NAP'
    });
    assert.equal(random.getState(),333);assert.equal(game.stageManager.elapsed,180);assert.equal(game.scoreManager.score,999);
    assert.equal(game.npcs[0].x,npc.x);assert.equal(game.npcs[0].y,npc.y);
    assert.equal(game.npcs[0].state,npc.state);assert.equal(game.npcs[0].tolerance,npc.tolerance);
    return game.npcs[0];
  }
  const old=new NPC({id:'npc-6',role:'runner',x:384,y:520,zone:'central',stageId:stage.id,
    path:[{x:384,y:830},{x:384,y:520},{x:520,y:520}],random:seededRandom(5)});
  old.startScenario('FALL',9,3,180);old.enterHelp();old.departAt=240;
  const migrated=restore(old,undefined);
  assert.notEqual(migrated.zone,'central');assert.ok(stage.routes[migrated.zone]);
  const current=new NPC({id:'npc-7',role:'runner',x:620,y:480,zone:'east',stageId:stage.id,
    path:stage.routes.east.slice().reverse(),random:seededRandom(5)});
  current.pathIndex=3;current.wanderTarget={x:550,y:500};current.departAt=240;
  const resumed=restore(current,ENDLESS_MOVEMENT_VERSION);
  assert.deepEqual(resumed.path,current.path);assert.equal(resumed.pathIndex,current.pathIndex);
  assert.deepEqual(resumed.wanderTarget,current.wanderTarget);
});
