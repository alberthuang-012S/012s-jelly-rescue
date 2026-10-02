import test from 'node:test';
import assert from 'node:assert/strict';
import { gravityEnemyFrame, gravityBossFrame } from '../src/game/GravityArt.js';
import { GravityRenderer } from '../src/game/GravityRenderer.js';

test('gravity mobs separate walk, warning, attack, hit and harmless defeat poses', () => {
  for (const type of ['gravityStiff', 'gravityStomper', 'gravityHeavy']) {
    const e = { type, hp: 2, state: 'CHASE', hitFlash: 0 };
    assert.equal(gravityEnemyFrame(e, .2, true), 1);
    assert.equal(gravityEnemyFrame(e, .2, false), 0);
    assert.equal(gravityEnemyFrame({ ...e, state: 'TELEGRAPH' }, 0), 2);
    assert.equal(gravityEnemyFrame({ ...e, artState: 'DROP' }, 0), 3);
    assert.equal(gravityEnemyFrame({ ...e, state: 'DASH' }, 0), 3);
    assert.equal(gravityEnemyFrame({ ...e, hitFlash: .2 }, 0), 4);
    assert.equal(gravityEnemyFrame({ ...e, hp: 0, hitFlash: .2 }, 0), 5);
  }
});

test('King art advertises both-hand and alternating attacks, real openings, impact and float-away', () => {
  const boss = { state: 'CHASE', phase: 1, attackIndex: 0, coreOpen: false, hitFlash: 0 };
  assert.equal(gravityBossFrame(boss), 0);
  assert.equal(gravityBossFrame({ ...boss, state: 'TELEGRAPH' }), 1);
  assert.equal(gravityBossFrame({ ...boss, state: 'TELEGRAPH', phase: 2 }), 2);
  assert.equal(gravityBossFrame({ ...boss, state: 'TELEGRAPH', phase: 2, attackIndex: 1 }), 3);
  assert.equal(gravityBossFrame({ ...boss, state: 'TELEGRAPH', phase: 3 }), 1);
  assert.equal(gravityBossFrame({ ...boss, state: 'IMPACT' }), 4);
  assert.equal(gravityBossFrame({ ...boss, state: 'CORE_OPEN', coreOpen: true }), 5);
  assert.equal(gravityBossFrame({ ...boss, state: 'FATIGUE', coreOpen: true }), 6);
  assert.equal(gravityBossFrame({ ...boss, state: 'FATIGUE', coreOpen: true, hitFlash: .2 }), 7);
  assert.equal(gravityBossFrame({ ...boss, state: 'DEFEATED' }), 8);
  assert.equal(gravityBossFrame(boss, true), 8);
  assert.equal(gravityBossFrame({ ...boss, state: 'CORE_CLOSE' }), 0);
});

test('pause keeps walk frames and short defeat art stable; new combat clears the visual cache', () => {
  const r = new GravityRenderer(), draws = [];
  r.creature = (_ctx, entity, time) => draws.push({ hp: entity.hp, time });
  const ctx = { save() {}, restore() {}, set globalAlpha(_) {} };
  const p = { x: 0, y: 0, draw() {} };
  const mob = { x: 20, y: 20, type: 'gravityStiff', hp: 2, def: { hp: 2 }, get alive() { return this.hp > 0; } };
  const c = { state: 'WAVE', visualTime: 1, ground: { zones: [] }, director: { enemies: [mob] }, pulses: [] };
  r.draw(ctx, c, p); mob.hp = 0; c.director.enemies = []; c.visualTime += .1;
  r.draw(ctx, c, p); assert.equal(r.defeated.length, 1);
  r.draw(ctx, c, p); assert.equal(r.defeated.length, 1); assert.equal(draws.at(-1).hp, 0);
  c.visualTime += .51; r.draw(ctx, c, p); assert.equal(r.defeated.length, 0);
  r.draw(ctx, { ...c, visualTime: 0 }, p); assert.equal(r.previous.size, 0);
});
