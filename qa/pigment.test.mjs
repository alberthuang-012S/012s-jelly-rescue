import test from 'node:test';
import assert from 'node:assert/strict';
import { PigmentCombatSystem } from '../src/game/PigmentCombatSystem.js';
import { PigmentEnemy } from '../src/game/PigmentEnemy.js';
import { BossPigment } from '../src/game/BossPigment.js';
import { SPECIAL_STAGE_DEFS, STAGE_DEFS, STAGE_ORDER } from '../src/game/StageManager.js';
import { PIGMENT_CONFIG as C } from '../src/game/PigmentConfig.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { CoreCollectionStore, CORE_COLLECTION_KEY } from '../src/game/CoreCollectionStore.js';
import { distance } from '../src/game/utils.js';

const arena = { world: { width: 1000, height: 1000 }, obstacles: [] };
const make = (stage = arena) => new PigmentCombatSystem(stage, { x: 500, y: 700, radius: 25 });
const tick = (c, seconds, options = { infiniteLife: true }) => { for (let t = 0; t < seconds; t += .02) c.update(.02, options); };
function bossCombat() { const c = make(); c.startArrival(); tick(c, 4.5); Object.assign(c.boss, { x: 500, y: 450 }); return c; }

test('Pigment is untimed, uses Garden terrain and does not alter the six-stage rescue order', () => {
  assert.deepEqual(STAGE_ORDER, ['tutorial', 'park', 'mountain', 'city', 'sports', 'garden']);
  const stage = SPECIAL_STAGE_DEFS.pigmentBloom;
  assert.equal(stage.obstacles, STAGE_DEFS.garden.obstacles); assert.equal(stage.mapId, 'garden');
  assert.equal(stage.timed, false); assert.equal(stage.mode, 'boss'); assert.deepEqual(stage.availableItems, ['DDM']);
});
test('DDM lock blocks selection and Q-style toggle; Garden and original item sets restore', () => {
  const items = new ItemSystem(); items.reset({ lockedId: 'DDM' });
  for (const id of ['PPA', 'NAP', 'SSW']) { items.select(id); items.toggle(); assert.equal(items.selectedId, 'DDM'); }
  items.reset({ availableItems: ['DDM', 'SSW'] }); items.toggle(); assert.equal(items.selectedId, 'SSW');
  items.reset({ lockedId: 'NAP' }); assert.equal(items.selectedId, 'NAP');
  items.reset(); items.toggle(); assert.equal(items.selectedId, 'NAP');
});
test('crystals have locked warnings, delayed contact damage, shared invulnerability and a hard cap', () => {
  const c = make(); c.director.enemies.forEach(e => { e.state = 'SPAWN'; e.timer = 100; });
  for (let i = 0; i < 3; i++) assert.ok(c.plantCrystal(c.player));
  assert.equal(c.plantCrystal(c.player), null);
  const crystal = c.crystals[0], point = { x: crystal.x, y: crystal.y };
  Object.assign(c.player, point); tick(c, 1, {}); assert.equal(c.lives, 3);
  tick(c, .14, {}); assert.equal(c.lives, 2); tick(c, .2, {}); assert.equal(c.lives, 2);
  assert.deepEqual({ x: crystal.x, y: crystal.y }, point);
});
test('crystal centers are reachable in Garden, separated, outside the player and preserve collision', () => {
  const stage = SPECIAL_STAGE_DEFS.pigmentBloom;
  for (const point of [{ x: 384, y: 820 }, { x: 180, y: 810 }, { x: 384, y: 210 }, { x: 500, y: 380 }]) {
    const c = new PigmentCombatSystem(stage, { ...point, radius: 25 });
    const obstacleCount = stage.obstacles.length;
    for (let i = 0; i < 3; i++) {
      const crystal = c.plantCrystal(point); assert.ok(crystal);
      assert.ok(distance(c.player, crystal) >= 95);
      assert.ok(Number.isFinite(c.navigation.planner(25).pathDistance(c.player, crystal)));
      for (const other of c.crystals) if (other !== crystal) assert.ok(distance(other, crystal) >= 100);
    }
    assert.equal(stage.obstacles.length, obstacleCount);
  }
});
test('DDM selects one nearest actionable target; a closed queen cannot steal a crystal hit', () => {
  const c = bossCombat(); Object.assign(c.player, { x: 500, y: 530 });
  const crystal = c.plantCrystal(c.boss, true, 'boss'); assert.ok(crystal);
  Object.assign(crystal, { x: 600, y: 530 });
  c.boss.enter('SHIELD', 3); c.boss.shieldCreated = 1;
  assert.equal(c.findTarget(), crystal); assert.equal(c.tryAction(), true);
  assert.equal(c.boss.hp, 18); assert.equal(c.score.crystalsCleared, 1);
  assert.ok(c.boss.coreOpen); assert.equal(c.tryAction(), false); assert.equal(c.score.ddmHits, 1);
});
test('DDM range and cover protect creatures and crystal centers; empty use still emits a pulse', () => {
  const c = make({ ...arena, obstacles: [{ x: 540, y: 610, width: 20, height: 190 }] }); c.director.clear();
  const crystal = c.plantCrystal(c.player); Object.assign(crystal, { x: 600, y: 700 });
  c.tryAction(); assert.equal(crystal.hp, 1); assert.equal(c.pulses.length, 1);
  c.cooldown = 0; Object.assign(crystal, { x: 500, y: 700 - C.bossRange - 1 }); c.tryAction(); assert.equal(crystal.hp, 1);
  c.cooldown = 0; crystal.y++; c.tryAction(); assert.equal(crystal.hp, 0); assert.equal(c.score.crystalsCleared, 1);
});
test('two shield crystals must both break and never regrow within their cycle', () => {
  const c = bossCombat(); c.boss.phase = 2; c.boss.enter('SHIELD_BUILD', 0); tick(c, .08);
  assert.equal(c.crystals.length, 2); const survivor = c.crystals[1];
  for (const crystal of c.crystals) assert.ok(Math.abs(crystal.x - c.boss.x) >= 105 || crystal.y >= c.boss.y + 95);
  c.crystals[0].hit(); c.crystals = c.crystals.filter(x => x.alive); tick(c, 5);
  assert.equal(c.crystals.length, 1); assert.equal(c.crystals[0], survivor); assert.equal(c.boss.coreOpen, false);
  survivor.hit(); c.crystals = []; c.boss.checkShield(c.attackContext);
  assert.equal(c.boss.coreOpen, true); assert.equal(c.boss.timer, 3);
});
test('shield crystals persist until broken while regular crystals expire', () => {
  const c = make(); const regular = c.plantCrystal(c.player), shield = c.plantCrystal(c.player, true, 'boss');
  c.director.enemies.forEach(e => { e.state = 'SPAWN'; e.timer = 100; });
  tick(c, 8.2); assert.ok(!c.crystals.includes(regular)); assert.ok(c.crystals.includes(shield));
});
test('all three boss phases fire their intended volleys before creating shields', () => {
  for (const phase of [1, 2, 3]) {
    const c = bossCombat(); c.boss.phase = phase; const volleys = [];
    const original = c.attackContext.fire; c.attackContext.fire = (s, a, offsets) => { volleys.push(offsets); original(s, a, offsets); };
    for (let t = 0; t < 10 && c.boss.state !== 'SHIELD'; t += .02) c.update(.02, { infiniteLife: true });
    assert.equal(c.boss.state, 'SHIELD'); assert.equal(c.crystals.length, phase === 1 ? 1 : 2);
    assert.equal(volleys.length, phase === 3 ? 2 : 1);
    if (phase === 3) assert.ok(volleys.every(offsets => offsets.every(a => Math.abs(a) >= .45)));
    c.crystals = []; c.boss.checkShield(c.attackContext); assert.equal(c.boss.timer, C.coreTimes[phase - 1]);
  }
});
test('Boss thresholds clear lingering hazards and closed cores reject damage', () => {
  const c = bossCombat(); assert.equal(c.boss.hit(), false);
  for (const [phase, hp] of [[2, 12], [3, 6]]) {
    for (let i = 0; i < 3; i++) {
      Object.assign(c.player, { x: c.boss.x, y: c.boss.y + 140 });
      c.boss.enter('CORE_OPEN', 3); c.cooldown = 0; c.hitPause = 0; c.tryAction();
    }
    assert.equal(c.boss.phase, phase); assert.equal(c.boss.hp, hp); assert.equal(c.crystals.length, 0); assert.equal(c.projectiles.length, 0);
  }
});
test('roll attack locks direction, respects obstacles, and recovers on collision', () => {
  const c = make({ ...arena, obstacles: [{ x: 530, y: 500, width: 20, height: 300 }] });
  const e = new PigmentEnemy('inkRoller', { x: 480, y: 700 }, 1); e.state = 'CHASE';
  e.update(.02, { x: 505, y: 700 }, c.navigation, c.attackContext); assert.equal(e.state, 'TELEGRAPH');
  e.update(1.01, { x: 480, y: 900 }, c.navigation, c.attackContext); assert.equal(e.state, 'DASH');
  for (let i = 0; i < 30 && e.state === 'DASH'; i++) e.update(.02, c.player, c.navigation, c.attackContext);
  assert.equal(e.state, 'RECOVER'); assert.ok(e.x <= 506); assert.equal(e.y, 700);
});
test('pause freezes crystals, projectiles and boss clocks; Game Over removes threats', () => {
  const c = bossCombat(); c.plantCrystal(c.boss, true, 'boss'); c.fireInk(c.boss, 0, [0]);
  const snapshot = JSON.stringify(c); tick(c, 1, { paused: true }); assert.equal(JSON.stringify(c), snapshot);
  for (let i = 0; i < 3; i++) { c.invulnerability = 0; c.damage(); }
  assert.equal(c.state, 'GAMEOVER'); assert.equal(c.crystals.length, 0); assert.equal(c.projectiles.length, 0);
});
test('victory is idempotent, clears threats and requires movement to collect the reachable pigment core', () => {
  const c = bossCombat(); c.boss.hp = 2; c.boss.enter('CORE_OPEN', 3); Object.assign(c.player, { x: 500, y: 590 });
  c.tryAction(); assert.equal(c.state, 'VICTORY'); const score = c.score.score; c.victory(); assert.equal(c.score.score, score);
  tick(c, 5.6); assert.equal(c.state, 'COLLECT'); assert.equal(c.coreDrop.id, 'pigmentCore');
  tick(c, 5); assert.equal(c.coreDrop.collected, false);
  assert.ok(Number.isFinite(c.navigation.planner(25).pathDistance(c.player, c.coreDrop)));
  Object.assign(c.player, { x: c.coreDrop.x, y: c.coreDrop.y }); tick(c, .04);
  assert.equal(c.state, 'CLEAR'); assert.equal(c.coreDrop.collected, true);
});
test('third core preserves prior collections, rejects mismatch, and persists exactly once', () => {
  let saved = JSON.stringify({ version: 1, unlocked: ['itchCore', 'gravityCore'] });
  const storage = { getItem: () => saved, setItem: (key, value) => { assert.equal(key, CORE_COLLECTION_KEY); saved = value; } };
  const store = new CoreCollectionStore(storage), drop = { id: 'pigmentCore', collected: true };
  assert.equal(store.collect('pigmentBloom', { ...drop, collected: false }), null);
  assert.equal(store.collect('gravityOverload', drop), null);
  assert.equal(store.collect('pigmentBloom', drop).newlyUnlocked, true);
  assert.equal(store.collect('pigmentBloom', drop).newlyUnlocked, false);
  assert.deepEqual([...new CoreCollectionStore(storage).unlocked], ['itchCore', 'gravityCore', 'pigmentCore']);
});
