import test from 'node:test';
import assert from 'node:assert/strict';
import { StageManager, STAGE_ORDER, STAGE_DEFS, SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { InputController } from '../src/game/InputController.js';
import { Game } from '../src/game/Game.js';
import { BossRenderer } from '../src/game/BossRenderer.js';
import { Enemy } from '../src/game/Enemy.js';
import { BossMosquito } from '../src/game/BossMosquito.js';
import { BossCombatSystem } from '../src/game/BossCombatSystem.js';
import { CombatNavigation } from '../src/game/CombatNavigation.js';
import { COMBAT_CONFIG as C, MOSQUITO_BOSS_CONFIG as B } from '../src/game/BossConfig.js';
import { BossScoreManager } from '../src/game/BossScoreManager.js';
import { ScoreManager } from '../src/game/ScoreManager.js';

const arena = { world: { width: 1000, height: 1000 }, obstacles: [] };
const player = () => ({ x: 500, y: 500, radius: 25 });
const make = () => new BossCombatSystem(arena, player());
function tick(combat, seconds, options = {}) { for (let n = 0; n < Math.ceil(seconds / .02); n++) combat.update(.02, options); }
const navigation = new CombatNavigation(arena);
const noFire = () => {};
function bossCombat() { const c = make(); c.startArrival(); tick(c, 4.5); c.director.clear(); return c; }

test('special stage is separate from the five-stage mainline and untimed, sharing Park collision', () => {
  assert.deepEqual(STAGE_ORDER, ['tutorial', 'park', 'mountain', 'city', 'sports']);
  assert.equal(STAGE_DEFS.alienMosquito, undefined);
  const manager = new StageManager(); manager.start('alienMosquito'); manager.update(1000);
  assert.equal(manager.status, 'playing'); assert.equal(manager.getRemaining(), null);
  assert.equal(manager.getStage().obstacles, STAGE_DEFS.park.obstacles);
});
test('PPA lock blocks selection and actual Q dispatch; rescue Q is restored by reset', () => {
  const items = new ItemSystem(); items.reset({ ppaOnly: true });
  const input = Object.create(InputController.prototype); input.enabled = true; input.onItemToggle = () => items.toggle();
  const q = () => input.handleKeyDown({ code: 'KeyQ', preventDefault() {}, repeat: false });
  items.select('NAP'); q(); assert.equal(items.selectedId, 'PPA');
  items.reset(); q(); assert.equal(items.selectedId, 'NAP'); q(); assert.equal(items.selectedId, 'PPA');
});
test('scout takes exactly two hits and defeated targets cannot take more hits', () => {
  const e = new Enemy('mosquitoScout', player(), 1);
  assert.equal(e.hp, 2); assert.ok(e.hit()); assert.equal(e.hp, 1); assert.ok(e.hit()); assert.equal(e.alive, false); assert.equal(e.hit(), false);
});
test('charger advertises its fixed dash vector for .75s then recovers', () => {
  const e = new Enemy('mosquitoCharger', { x: 350, y: 500 }, 1); e.state = 'CHASE';
  e.update(.01, player(), navigation, noFire); assert.equal(e.state, 'TELEGRAPH');
  const direction = { ...e.direction };
  e.update(.7, { x: 350, y: 600 }, navigation, noFire); assert.equal(e.state, 'TELEGRAPH');
  e.update(.06, player(), navigation, noFire); assert.equal(e.state, 'DASH');
  e.update(.2, { x: 350, y: 600 }, navigation, noFire); assert.deepEqual(e.direction, direction); assert.equal(e.y, 500);
  e.update(.4, player(), navigation, noFire); assert.equal(e.state, 'RECOVER');
});
test('bubble enemy has 3HP, keeps distance, and fires slowly', () => {
  const e = new Enemy('mosquitoBubble', { x: 400, y: 500 }, 1); e.state = 'CHASE'; let shots = 0;
  assert.equal(e.hp, 3); e.update(.1, player(), navigation, () => shots++); assert.ok(e.x < 400);
  for (let n = 0; n < 30; n++) e.update(.1, player(), navigation, () => shots++);
  assert.equal(shots, 1);
});
test('bubble lifecycle respects cap, expiration, world obstacles and pulse defense', () => {
  const c = make(); c.director.clear();
  for (let i = 0; i < 12; i++) c.fire({ x: 100, y: 100 }, player());
  assert.equal(c.projectiles.length, 4);
  c.projectiles.forEach(p => { p.life = .01; }); c.update(.02); assert.equal(c.projectiles.length, 0);
  c.state = 'WAVE'; c.fire({ x: 550, y: 500 }, player()); c.tryAction(); assert.equal(c.projectiles.length, 0);
  c.cooldown = 0; c.fire({ x: 980, y: 400 }, { x: 1200, y: 400 });
  c.update(.05); c.state = 'WAVE'; c.update(.05); assert.equal(c.projectiles.length, 0);
});
test('PPA range, nearest target, cooldown, empty feedback and single-hit pulse', () => {
  const c = make(); c.director.clear();
  const near = new Enemy('mosquitoScout', { x: 600, y: 500 }, 1);
  const far = new Enemy('mosquitoScout', { x: 616, y: 500 }, 2); c.director.enemies = [far, near];
  assert.equal(c.tryAction(), true); assert.equal(near.hp, 1); assert.equal(far.hp, 2);
  assert.equal(c.tryAction(), false);
  near.state = 'SPAWN'; near.timer = 3; far.state = 'SPAWN'; far.timer = 3;
  tick(c, .36); assert.equal(near.hp, 1); assert.equal(c.pulses.length, 0);
  c.director.clear(); c.cooldown = 0; c.tryAction(); assert.equal(c.pulses.length, 1); assert.equal(c.score.ppaHits, 1);
});
test('PPA cannot hit through Park collision', () => {
  const c = new BossCombatSystem({ ...arena, obstacles: [{ x: 530, y: 400, width: 20, height: 200 }] }, player());
  c.director.enemies = [new Enemy('mosquitoScout', { x: 580, y: 500 }, 1)];
  c.tryAction(); assert.equal(c.director.enemies[0].hp, 2);
});
test('closed core blocks damage; open core takes two HP and gives a hit pause', () => {
  const c = bossCombat(); Object.assign(c.boss, { x: 550, y: 500 });
  c.tryAction(); assert.equal(c.boss.hp, 18); assert.ok(c.blockedTime > 0);
  c.cooldown = 0; c.boss.enter('CORE_OPEN', 2.3); c.tryAction();
  assert.equal(c.boss.hp, 16); assert.equal(c.score.bossHits, 1); assert.ok(c.hitPause > 0);
});
test('phase thresholds are 12 and 6; phase 2 summons only once across cycles', () => {
  const boss = new BossMosquito({ x: 300, y: 500 }); let summons = 0;
  for (let i = 0; i < 3; i++) { boss.enter('CORE_OPEN', 2); boss.hit(); }
  assert.equal(boss.hp, 12); assert.equal(boss.phase, 2);
  for (let i = 0; i < 1200; i++) boss.update(.02, player(), navigation, noFire, () => summons++);
  assert.equal(summons, 1);
  for (let i = 0; i < 3; i++) { boss.enter('CORE_OPEN', 2); boss.hit(); }
  assert.equal(boss.hp, 6); assert.equal(boss.phase, 3);
  for (let i = 0; i < 800; i++) boss.update(.02, player(), navigation, noFire, () => summons++);
  assert.equal(summons, 1);
});
test('phase 1 and phase 3 expose openings after the specified dash patterns', () => {
  for (const phase of [1, 3]) {
    const boss = new BossMosquito({ x: 200, y: 500 }); boss.phase = phase; const states = []; let bubbles = 0;
    for (let i = 0; i < 1000 && !boss.coreOpen; i++) {
      if (states.at(-1) !== boss.state) states.push(boss.state);
      boss.update(.02, player(), navigation, () => bubbles++, noFire);
    }
    assert.ok(boss.coreOpen); assert.equal(bubbles, phase === 3 ? 1 : 0);
    assert.equal(states.filter(s => s === 'DASH').length, phase === 3 ? 2 : 1);
    assert.ok(boss.timer >= 2.28);
  }
});
test('defeated boss never moves, fires or summons', () => {
  const boss = new BossMosquito({ x: 200, y: 500 }); boss.hp = 2; boss.enter('CORE_OPEN', 2); boss.hit();
  const before = JSON.stringify(boss); let calls = 0;
  boss.update(20, player(), navigation, () => calls++, () => calls++);
  assert.equal(JSON.stringify(boss), before); assert.equal(calls, 0); assert.equal(boss.state, 'DEFEATED');
});
test('one contact drains one life; invulnerability blocks overlapping attacks; zero is Game Over', () => {
  const c = make(); assert.ok(c.damage()); assert.equal(c.lives, 2);
  for (let i = 0; i < 10; i++) assert.equal(c.damage(), false);
  c.invulnerability = 0; c.damage(); c.invulnerability = 0; c.damage();
  assert.equal(c.lives, 0); assert.equal(c.state, 'GAMEOVER'); assert.equal(c.tryAction(), false);
});
test('infinite life does not pollute score or drain hearts', () => {
  const c = make(); c.damage(true); assert.equal(c.lives, 3); assert.equal(c.score.damageTaken, 0);
});
test('waves progress 3 / 3 / 4 and wave 3 transitions to a protected arrival', () => {
  const c = make();
  for (const [wave, count] of [[1, 3], [2, 3], [3, 4]]) {
    assert.equal(c.wave, wave); assert.equal(c.director.enemies.length, count);
    c.director.enemies.forEach(e => { e.hp = 0; }); c.update(.02);
    assert.equal(c.state, 'WAVE_CLEAR'); tick(c, wave === 3 ? 1.5 : 1.2);
  }
  assert.equal(c.state, 'ARRIVAL'); assert.equal(c.damage(), false); assert.equal(c.tryAction(), false);
  tick(c, 4.5); assert.equal(c.state, 'BOSS'); assert.equal(c.boss.hp, 18);
});
test('zero Boss HP clears threats immediately and finishes full victory before result', () => {
  const c = bossCombat(); c.boss.hp = 2; c.boss.enter('CORE_OPEN', 2);
  Object.assign(c.boss, { x: 550, y: 500 }); c.fire({ x: 200, y: 200 }, player()); c.tryAction();
  assert.equal(c.state, 'VICTORY'); assert.equal(c.projectiles.length, 0); assert.equal(c.director.enemies.length, 0);
  assert.equal(c.damage(), false); const time = c.clearTime;
  tick(c, 5); assert.equal(c.state, 'VICTORY'); tick(c, .6); assert.equal(c.state, 'CLEAR'); assert.equal(c.clearTime, time);
});
test('pause freezes all combat clocks, enemies, projectiles, arrival and victory', () => {
  for (const state of ['WAVE', 'ARRIVAL', 'BOSS', 'VICTORY']) {
    const c = state === 'WAVE' ? make() : bossCombat(); c.state = state;
    c.fire({ x: 200, y: 200 }, player()); const snapshot = JSON.stringify(c);
    c.update(30, { paused: true }); assert.equal(JSON.stringify(c), snapshot);
  }
});
test('Game background guard freezes combat and resume resets timestamp and input', () => {
  const oldDocument = globalThis.document; globalThis.document = { hidden: false };
  try {
    const c = make(); const stub = { backgroundPaused: true, bossCombat: c, state: 'playing', lastTimestamp: 123,
      clearBackgroundPause() { this.backgroundPaused = false; }, input: { reset() { this.cleared = true; }, setEnabled(value) { this.enabled = value; } },
      backgroundResume: { blur() {} } };
    const before = c.elapsed; Game.prototype.update.call(stub, 100); assert.equal(c.elapsed, before);
    Game.prototype.resumeFromBackground.call(stub); assert.equal(stub.lastTimestamp, 0); assert.ok(stub.input.cleared);
    c.update(30); assert.ok(c.elapsed <= .05); // defensive dt clamp
  } finally { globalThis.document = oldDocument; }
});
test('special spawns are legal, separated, reachable for player and retry unplaced waves', () => {
  const stage = SPECIAL_STAGE_DEFS.alienMosquito;
  for (const position of [stage.start, { x: 40, y: 40 }, { x: 730, y: 1110 }]) {
    const c = new BossCombatSystem(stage, { ...position, radius: 25 });
    for (const e of c.director.enemies) {
      assert.ok(c.navigation.planner(e.radius).canOccupy(e));
      assert.ok(Math.hypot(e.x - position.x, e.y - position.y) >= 179);
      assert.ok(Number.isFinite(c.navigation.planner(25).pathDistance(position, e)));
    }
    assert.ok(c.startArrival()); assert.ok(c.navigation.planner(B.radius).canOccupy(c.boss));
  }
  const c = new BossCombatSystem({ world: { width: 100, height: 100 }, obstacles: [] }, { x: 50, y: 50, radius: 25 });
  assert.equal(c.director.pending.length, 3); assert.equal(c.director.cleared, false);
});
test('navigation routes around obstacles and dash substeps never tunnel', () => {
  const stage = { ...arena, obstacles: [{ x: 400, y: 200, width: 20, height: 500 }] };
  const nav = new CombatNavigation(stage); const e = { x: 300, y: 500, radius: 20 };
  nav.move(e, { x: 1, y: 0 }, 500); assert.ok(e.x <= 380);
  for (let i = 0; i < 500; i++) nav.toward(e, { x: 500, y: 500 }, 3);
  assert.ok(Math.hypot(e.x - 500, e.y - 500) < 5);
});
test('boss scoring is isolated, transparent, idempotent and no-damage bonus concerns boss combat', () => {
  const score = new BossScoreManager(); const rescue = new ScoreManager();
  score.damage(false);
  for (const type of ['mosquitoScout', 'mosquitoCharger', 'mosquitoBubble']) score.enemyHit({ type, alive: false });
  score.bossHit(); score.clear(); score.clear();
  assert.equal(score.score, 450 + 50 + 1500 + 500 + 500); assert.equal(score.defeatedEnemies, 3);
  assert.equal(rescue.score, 0); assert.equal(rescue.ppaSuccess, 0);
});

test('portrait combat camera frames all actors with readable scale and reserves HUD/control regions', () => {
  const stage = SPECIAL_STAGE_DEFS.alienMosquito;
  for (const [width, height] of [[390, 844], [375, 667], [1280, 900]]) {
    const c = new BossCombatSystem(stage, { ...stage.start, radius: 25 });
    c.debug('wave3');
    const renderer = new BossRenderer();
    const camera = renderer.camera({ width, height }, c);
    for (const e of [c.player, ...c.director.enemies]) {
      const x = camera.x + e.x * camera.scale; const y = camera.y + e.y * camera.scale;
      assert.ok(x >= camera.clip.x && x <= camera.clip.x + camera.clip.width);
      assert.ok(y >= camera.clip.y && y <= camera.clip.y + camera.clip.height);
    }
    assert.ok(camera.scale >= .5); assert.equal(camera.clip.y, 160);
    assert.equal(camera.clip.y + camera.clip.height, height - 180);
  }
});
