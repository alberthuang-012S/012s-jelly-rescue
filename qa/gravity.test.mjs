import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL_STAGE_DEFS, STAGE_DEFS, STAGE_ORDER } from '../src/game/StageManager.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { GravityCombatSystem } from '../src/game/GravityCombatSystem.js';
import { GravityEnemy } from '../src/game/GravityEnemy.js';
import { BossGravity } from '../src/game/BossGravity.js';
import { GroundAttackSystem } from '../src/game/GroundAttackSystem.js';
import { CombatNavigation } from '../src/game/CombatNavigation.js';
import { CoreCollectionStore } from '../src/game/CoreCollectionStore.js';

const arena = { world: { width: 1000, height: 1000 }, obstacles: [] };
const player = () => ({ x: 500, y: 500, radius: 25 });
const nav = new CombatNavigation(arena);
const make = () => new GravityCombatSystem(arena, player());
const tick = (c, seconds, options = {}) => { for (let t = 0; t < seconds; t += .02) c.update(.02, options); };

test('gravity is an optional untimed Sports encounter, separate from the rescue order', () => {
  const stage = SPECIAL_STAGE_DEFS.gravityOverload;
  assert.equal(stage.obstacles, STAGE_DEFS.sports.obstacles);
  assert.equal(stage.mapId, 'sports'); assert.equal(stage.timed, false);
  assert.deepEqual(STAGE_ORDER, ['tutorial', 'park', 'mountain', 'city', 'sports']);
});
test('NAP locks direct selection and toggle, then mosquito and rescue can restore their items', () => {
  const items = new ItemSystem(); items.reset({ lockedId: 'NAP' });
  items.select('PPA'); items.toggle(); assert.equal(items.selectedId, 'NAP');
  items.reset({ ppaOnly: true }); items.toggle(); assert.equal(items.selectedId, 'PPA');
  items.reset(); items.toggle(); assert.equal(items.selectedId, 'NAP'); items.toggle(); assert.equal(items.selectedId, 'PPA');
});
test('ground warnings lock geometry, never damage early, cap at two, and expire', () => {
  const ground = new GroundAttackSystem(nav), p = player(); let hits = 0;
  const first = ground.add({ ...p, radius: 90, warning: 1, active: .2 });
  ground.add({ x: 700, y: 700 }); assert.equal(ground.add(p), null);
  ground.update(.99, p, () => hits++); assert.equal(hits, 0);
  p.x = 800; ground.update(.02, p, () => hits++); assert.equal(first.x, 500); assert.equal(hits, 0);
  p.x = 500; ground.update(.02, p, () => hits++); assert.equal(hits, 1);
  ground.update(2, p, () => hits++); assert.equal(ground.zones.length, 0);
});
test('fan footprint protects its rear and sides and includes a player overlapping its edge', () => {
  const ground = new GroundAttackSystem(nav);
  const zone = ground.add({ x: 500, y: 500, radius: 180, shape: 'fan', angle: 0 });
  assert.equal(ground.contains(zone, { x: 620, y: 500, radius: 25 }), true);
  assert.equal(ground.contains(zone, { x: 400, y: 500, radius: 25 }), false);
  assert.equal(ground.contains(zone, { x: 500, y: 650, radius: 25 }), false);
  assert.equal(ground.contains(zone, { x: 700, y: 500, radius: 25 }), true);
  assert.equal(ground.contains(zone, { x: 706, y: 500, radius: 25 }), false);
});
test('ground obstacles shield targets from attacks and NAP, including a closed core behind cover', () => {
  const stage = { ...arena, obstacles: [{ x: 540, y: 400, width: 20, height: 200 }] };
  const c = new GravityCombatSystem(stage, player()); c.director.clear();
  c.state = 'BOSS'; c.boss = new BossGravity({ x: 590, y: 500 }); c.boss.enter('CORE_OPEN', 2);
  c.tryAction(); assert.equal(c.boss.hp, 18);
  let hits = 0; c.ground.add({ x: 590, y: 500, warning: 0 });
  c.ground.update(.02, c.player, () => hits++); assert.equal(hits, 0);
});
test('NAP clears crystals without enemies, respects range/cooldown, and records no fictitious hit', () => {
  const c = make(); c.director.clear();
  c.ground.add({ x: 560, y: 500, kind: 'crystal', owner: 'boss' });
  c.ground.add({ x: 680, y: 500, kind: 'crystal', owner: 'boss' });
  assert.equal(c.tryAction(), true); assert.equal(c.ground.zones.length, 1);
  assert.equal(c.score.crystalsCleared, 1); assert.equal(c.score.napHits, 0);
  assert.equal(c.tryAction(), false); assert.equal(c.pulses.length, 1);
});
test('gravity mobs have distinct HP and fully warned attacks', () => {
  const ground = new GroundAttackSystem(nav), p = player();
  const stiff = new GravityEnemy('gravityStiff', { x: 420, y: 500 }, 1);
  stiff.state = 'CHASE'; stiff.update(.01, p, nav, ground); assert.equal(stiff.state, 'TELEGRAPH');
  const direction = { ...stiff.direction }; stiff.update(.71, { x: 420, y: 700 }, nav, ground);
  assert.equal(stiff.state, 'DASH'); assert.deepEqual(stiff.direction, direction);
  const stomper = new GravityEnemy('gravityStomper', { x: 350, y: 500 }, 2);
  stomper.state = 'CHASE'; stomper.update(.01, p, nav, ground);
  assert.equal(ground.zones[0].state, 'WARNING'); assert.equal(ground.zones[0].warning, .95);
  const heavy = new GravityEnemy('gravityHeavy', { x: 300, y: 500 }, 3);
  heavy.state = 'CHASE'; heavy.update(1.61, p, nav, ground);
  assert.equal(ground.zones[1].kind, 'crystal');
  for (const [enemy, hp] of [[stiff, 2], [stomper, 2], [heavy, 3]]) {
    assert.equal(enemy.hp, hp); for (let i = 0; i < hp; i++) assert.ok(enemy.hit());
    assert.equal(enemy.alive, false); assert.equal(enemy.hit(), false);
  }
});
test('each boss phase completes its visible pattern before opening the core', () => {
  for (const phase of [1, 2, 3]) {
    const boss = new BossGravity({ x: 350, y: 500 }); boss.phase = phase;
    const ground = new GroundAttackSystem(nav), shapes = []; let serial = 0;
    for (let t = 0; t < 15 && !boss.coreOpen; t += .02) {
      ground.update(.02, player(), () => {}); boss.update(.02, player(), nav, ground, () => {});
      for (const z of ground.zones) if (z.id > serial) { serial = z.id; shapes.push(z.shape); }
    }
    assert.ok(boss.coreOpen); assert.deepEqual(shapes, phase === 1 ? ['circle'] : phase === 2 ? ['circle', 'circle'] : ['fan', 'circle']);
    assert.equal(boss.state, phase === 3 ? 'FATIGUE' : 'CORE_OPEN');
  }
});
test('core thresholds cancel hazards, summon two minions only once, and reject closed hits', () => {
  const c = make(); c.startArrival(); tick(c, 4.5); c.director.clear();
  Object.assign(c.boss, { x: 590, y: 500 }); assert.equal(c.boss.hit(), false);
  for (let i = 0; i < 3; i++) { c.boss.enter('CORE_OPEN', 2); c.cooldown = 0; c.hitPause = 0; c.tryAction(); }
  assert.equal(c.boss.hp, 12); assert.equal(c.boss.phase, 2); assert.equal(c.ground.zones.length, 0);
  tick(c, .2, { infiniteLife: true }); assert.equal(c.director.enemies.length, 2);
  c.director.clear();
  for (let i = 0; i < 3; i++) { c.boss.enter('CORE_OPEN', 2); c.cooldown = 0; c.hitPause = 0; c.tryAction(); }
  assert.equal(c.boss.phase, 3); tick(c, .2, { infiniteLife: true }); assert.equal(c.director.enemies.length, 0);
});
test('overlapping hazards cost one heart, pause freezes them, Game Over removes them', () => {
  const c = make(); c.director.clear();
  for (let i = 0; i < 2; i++) c.ground.add({ ...c.player, warning: 0, active: 5 });
  const before = JSON.stringify(c); c.update(.05, { paused: true }); assert.equal(JSON.stringify(c), before);
  c.update(.02); assert.equal(c.lives, 2); assert.equal(c.score.damageTaken, 1);
  c.state = 'WAVE'; c.invulnerability = 0; c.damage(); c.invulnerability = 0; c.damage();
  assert.equal(c.state, 'GAMEOVER'); assert.equal(c.ground.zones.length, 0);
});
test('gravity victory clears threats, awards only once, and never grants the mosquito core', () => {
  const c = make(); c.startArrival(); tick(c, 4.5); c.director.clear();
  Object.assign(c.boss, { x: 590, y: 500, hp: 2 }); c.boss.enter('FATIGUE', 2);
  c.ground.add({ ...c.player }); c.tryAction();
  assert.equal(c.state, 'VICTORY'); assert.equal(c.ground.zones.length, 0);
  const score = c.score.score; c.victory(); assert.equal(c.score.score, score);
  tick(c, 5.6); assert.equal(c.state, 'CLEAR'); assert.equal(c.coreDrop, null);
  const store = new CoreCollectionStore(null); assert.equal(store.collect('gravityOverload', c.coreDrop), null);
  assert.equal(c.score.napHits, 1); assert.equal(c.score.ppaHits, 0);
});
