import test from 'node:test';
import assert from 'node:assert/strict';
import { pigmentQueenFrame, pigmentEnemyFrame } from '../src/game/PigmentArt.js';
import { PigmentRenderer } from '../src/game/PigmentRenderer.js';

test('Queen shell, casting, exposed core, hit and freed poses follow actual combat states', () => {
  const boss = { state: 'CHASE', hitFlash: 0, coreOpen: false };
  assert.equal(pigmentQueenFrame(boss), 0);
  for (const state of ['TELEGRAPH', 'SHIELD_WARN', 'VOLLEY_WAIT', 'SHIELD_BUILD', 'SUMMON']) assert.equal(pigmentQueenFrame({ ...boss, state }), 1);
  for (const state of ['SHIELD', 'CORE_CLOSE']) assert.equal(pigmentQueenFrame({ ...boss, state }), 2);
  for (const state of ['CORE_OPEN', 'FATIGUE']) {
    assert.equal(pigmentQueenFrame({ ...boss, state, coreOpen: true }), 3);
    assert.equal(pigmentQueenFrame({ ...boss, state, coreOpen: true, hitFlash: .2 }), 4);
  }
  assert.equal(pigmentQueenFrame({ ...boss, hitFlash: .2 }), 0, 'closed shells cannot show an exposed hit pose');
  assert.equal(pigmentQueenFrame({ ...boss, state: 'DEFEATED', hitFlash: .2 }), 5);
  assert.equal(pigmentQueenFrame(boss, true), 5);
});

test('species retain their own atlas columns during attacks, planting and defeat', () => {
  for (const [column, type] of ['inkDrop', 'inkRoller', 'inkPlanter'].entries()) {
    const enemy = { type, hp: 2, state: 'CHASE', plantTimer: 1.2, def: { interval: 3.6 } };
    assert.equal(pigmentEnemyFrame(enemy), column);
    for (const state of ['TELEGRAPH', 'DASH']) assert.equal(pigmentEnemyFrame({ ...enemy, state }), column + 3);
    assert.equal(pigmentEnemyFrame({ ...enemy, state: 'DASH', hp: 0 }), column);
    if (type === 'inkPlanter') {
      assert.equal(pigmentEnemyFrame({ ...enemy, plantTimer: .2 }), 5);
      assert.equal(pigmentEnemyFrame({ ...enemy, plantTimer: 3.5 }), 5);
    }
  }
  assert.equal(pigmentEnemyFrame({ type: 'unknown' }), null);
});

test('sprite drawing uses registered feet and gracefully falls back for unloaded artwork', () => {
  const renderer = new PigmentRenderer(), calls = [];
  renderer.sprite({ drawImage: (...args) => calls.push(args) }, 'atlas', 4, 384, 240);
  assert.deepEqual(calls[0], ['atlas', 384, 384, 384, 384, -120, -216.25, 240, 240]);
  assert.equal(renderer.artQueen({}, {}, 0, 1, false), false);
  assert.equal(renderer.artEnemy({}, { type: 'inkDrop' }, 0), false);
  renderer.setArt({ queen: { complete: false, naturalWidth: 1152 } });
  assert.equal(renderer.artQueen({}, {}, 0, 1, false), false);
});

test('night map fades back into the original Garden throughout victory and pickup', () => {
  const renderer = new PigmentRenderer(), draws = [], saved = [];
  renderer.setArt({ map: { complete: true, naturalWidth: 1024 } });
  const ctx = new Proxy({ globalAlpha: 1 }, { get(target, name) {
    if (name in target) return target[name];
    if (name === 'save') return () => saved.push(target.globalAlpha);
    if (name === 'restore') return () => { target.globalAlpha = saved.pop(); };
    if (name === 'drawImage') return (...args) => draws.push({ args, alpha: target.globalAlpha });
    return () => {};
  } });
  const combat = { stage: { world: { width: 1024, height: 1536 } }, state: 'BOSS', visualTime: 0 };
  renderer.atmosphere(ctx, combat); assert.equal(draws.at(-1).alpha, 1);
  renderer.atmosphere(ctx, { ...combat, state: 'VICTORY', timer: 2.75 }); assert.equal(draws.at(-1).alpha, .5);
  for (const state of ['COLLECT', 'CLEAR']) { renderer.atmosphere(ctx, { ...combat, state }); assert.equal(draws.at(-1).alpha, 0); }
  assert.deepEqual(draws[0].args.slice(1), [0, 0, 1024, 1536]); assert.equal(ctx.globalAlpha, 1);
});
