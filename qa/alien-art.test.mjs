import test from 'node:test';
import assert from 'node:assert/strict';
import {alienEnemyFrame,alienBossFrame} from '../src/game/AlienArt.js';
test('enemy wing animation retains species columns and speeds up for attack',()=>{
  for(const [type,col]of [['mosquitoScout',0],['mosquitoCharger',1],['mosquitoBubble',2]]){
    const enemy={type,state:'CHASE'};
    assert.equal(alienEnemyFrame(enemy,0),col);assert.equal(alienEnemyFrame(enemy,.11),col+3);
    enemy.state='TELEGRAPH';assert.equal(alienEnemyFrame(enemy,.07),col+3);
  }
});
test('King poses reflect attack, vulnerability and defeat without conflating UFO frame',()=>{
  const boss={state:'CHASE',coreOpen:false};
  assert.equal(alienBossFrame(boss,0),0);assert.equal(alienBossFrame(boss,.13),1);
  for(const state of ['TELEGRAPH','DASH','BUBBLE','SUMMON']){
    boss.state=state;assert.equal(alienBossFrame(boss,0),2);
  }
  boss.state='CORE_OPEN';boss.coreOpen=true;assert.equal(alienBossFrame(boss,0),3);
  assert.equal(alienBossFrame(boss,0,true),4);
  boss.coreOpen=false;boss.state='CORE_CLOSE';assert.equal(alienBossFrame(boss,0),0);
});
