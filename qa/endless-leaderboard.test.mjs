import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENDLESS_RIVALS, endlessStandings, endlessRank, endlessNextTarget, endlessTargetText } from '../src/game/EndlessLeaderboard.js';
import { EndlessStore } from '../src/game/EndlessRun.js';

test('every rival time, score and rescue count comes from the same calibration sample',()=>{
  const report=JSON.parse(fs.readFileSync(new URL('./endless/leaderboard-estimate.json',import.meta.url),'utf8'));
  assert.equal(ENDLESS_RIVALS.length,7);assert.equal(new Set(ENDLESS_RIVALS.map(r=>r.id)).size,7);
  for(const rival of ENDLESS_RIVALS){
    const source=report.runs.find(run=>run.profile===rival.source.profile&&run.speed===rival.source.speed&&run.seed===rival.source.seed);
    assert.ok(source);
    const sample=rival.source.checkpoint ? source.checkpoints.find(c=>c.seconds===rival.source.checkpoint) : source.final;
    const seconds=rival.source.checkpoint ?? source.endedAt;
    assert.equal(rival.survivedMs,Math.round(seconds*1000));
    assert.equal(rival.score,sample.score);assert.equal(rival.rescuedCount,sample.rescued);
    assert.ok(rival.score>=rival.rescuedCount*100&&rival.score<=rival.rescuedCount*300);
  }
});

test('rank follows full survival milliseconds, then score; exact ties retain the rival position',()=>{
  const sorted=endlessStandings();
  assert.equal(sorted.length,7);assert.ok(sorted.every(e=>!e.isPlayer));
  for(const [index,rival] of sorted.entries()){
    assert.equal(endlessRank({...rival,score:rival.score+1}),index+1);
    assert.equal(endlessRank({...rival,score:rival.score-1}),index+2);
    assert.equal(endlessRank({...rival}),index+2);
    assert.equal(endlessRank({...rival,survivedMs:rival.survivedMs+1,score:0}),index+1);
  }
  assert.equal(endlessRank({survivedMs:0,score:0,rescuedCount:0}),8);
  assert.equal(endlessRank({survivedMs:900001,score:0,rescuedCount:0}),1);
});

test('best row stays unique, targets use the adjacent higher rival, and a champion has no next target',()=>{
  const record={survivedMs:300000,score:30000,rescuedCount:120};
  const rows=endlessStandings(record);
  assert.equal(rows.length,8);assert.equal(rows.filter(r=>r.isPlayer).length,1);
  assert.equal(rows.find(r=>r.isPlayer).rank,4);
  assert.equal(endlessNextTarget(record).id,'skate');
  assert.match(endlessTargetText(record),/124 秒/);
  assert.equal(endlessNextTarget().id,'rookie');
  const champion={...record,survivedMs:900001};
  assert.equal(endlessNextTarget(champion),null);assert.match(endlessTargetText(champion),/榜首/);
  const tied={...ENDLESS_RIVALS.find(r=>r.id==='garden'),score:21400};
  assert.match(endlessTargetText(tied),/同時間再多 64 分/);
  assert.deepEqual(endlessStandings(),endlessStandings());
});

test('rank survives reload, score-only improvement keeps the best time, and practice never changes it',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const store=new EndlessStore({storage});
  store.updateBest(120,14000,60);assert.equal(endlessRank(store.load().best),7);
  store.updateBest(300,30000,120);assert.equal(endlessRank(new EndlessStore({storage}).load().best),4);
  assert.equal(store.updateBest(250,99999,300).isNewBest,false);
  assert.equal(store.updateBest(300,30001,121).isNewBest,true);
  assert.equal(store.updateBest(950,200000,700,true).isNewBest,false);
  assert.equal(store.load().best.survivedMs,300000);assert.equal(store.load().best.score,30001);
});
