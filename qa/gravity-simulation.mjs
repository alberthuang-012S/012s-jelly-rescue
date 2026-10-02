import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { GravityCombatSystem } from '../src/game/GravityCombatSystem.js';
import { SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';
import { distance, normalize } from '../src/game/utils.js';

// No forced damage, phases or teleports: actual pulses and normal-speed movement.
// Infinite life deliberately isolates encounter completion from bot skill.
const stage = SPECIAL_STAGE_DEFS.gravityOverload;
const player = { ...stage.start, radius: 25 };
const combat = new GravityCombatSystem(stage, player);
const states = new Set(), phases = new Set(), patterns = new Set(); let seconds = 0;
while (seconds < 360 && combat.state !== 'CLEAR') {
  const dt = .02; seconds += dt; states.add(combat.state);
  if (combat.boss) phases.add(combat.boss.phase);
  for (const zone of combat.ground.zones) patterns.add(zone.kind === 'crystal' ? 'crystal' : zone.shape);
  if (!combat.frozen) {
    const enemy = combat.director.enemies.filter(e => e.alive).sort((a, b) => distance(a, player) - distance(b, player))[0];
    const target = enemy || combat.boss;
    if (target?.alive) {
      const gap = distance(target, player);
      if (target === combat.boss && !target.coreOpen && gap < 190) {
        combat.navigation.move(player, normalize(player.x - target.x, player.y - target.y), 205 * dt);
      } else if (gap > (enemy ? 30 : 90) || enemy && combat.findTarget() !== enemy) combat.navigation.toward(player, target, 205 * dt);
      if (combat.findTarget() === target && (target !== combat.boss || target.coreOpen)) combat.tryAction();
    }
  }
  combat.update(dt, { infiniteLife: true });
}
assert.equal(combat.state, 'CLEAR', JSON.stringify({ state: combat.state, hp: combat.boss?.hp, seconds, player,
  enemies: combat.director.enemies, boss: combat.boss }));
assert.deepEqual([...phases], [1, 2, 3]);
assert.equal(combat.coreDrop, null); assert.equal(combat.score.bossHits, 9);
assert.equal(combat.score.defeatedEnemies, 11); assert.equal(combat.score.napHits, 32);
assert.equal(combat.score.score, 4250);
assert.ok(patterns.has('circle')); assert.ok(patterns.has('fan')); assert.ok(patterns.has('crystal'));
const report = { status: 'PASS', seconds: Math.round(seconds), states: [...states], phases: [...phases], patterns: [...patterns], ...combat.score,
  note: 'Normal-speed automated mover, infinite life; not a human difficulty assessment.' };
await fs.mkdir('qa/gravity', { recursive: true });
await fs.writeFile('qa/gravity/simulation-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
