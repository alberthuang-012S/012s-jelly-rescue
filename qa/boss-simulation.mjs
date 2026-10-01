import assert from 'node:assert/strict';
import { BossCombatSystem } from '../src/game/BossCombatSystem.js';
import { SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';
import { distance, normalize } from '../src/game/utils.js';

// Deterministic integration smoke test: all damage goes through real pulses,
// all phases use their natural windows, and movement pays the normal speed.
// Infinite life isolates completion from this deliberately simple bot's skill.
const stage = SPECIAL_STAGE_DEFS.alienMosquito;
const player = { ...stage.start, radius: 25 };
const combat = new BossCombatSystem(stage, player);
const states = new Set(); const phases = new Set(); let seconds = 0;
while (seconds < 360 && combat.state !== 'CLEAR') {
  const dt = .02; seconds += dt; states.add(combat.state); if (combat.boss) phases.add(combat.boss.phase);
  if (!combat.frozen) {
    if (combat.state === 'COLLECT') combat.navigation.toward(player, combat.coreDrop, 205 * dt);
    const enemy = combat.director.enemies.filter(e => e.alive).sort((a, b) => distance(a, player) - distance(b, player))[0];
    const target = enemy || combat.boss;
    if (target?.alive) {
      const gap = distance(target, player);
      if (target === combat.boss && !target.coreOpen && gap < 190) {
        combat.navigation.move(player, normalize(player.x - target.x, player.y - target.y), 205 * dt);
      } else if (gap > 90) combat.navigation.toward(player, target, 205 * dt);
      if (combat.findTarget() && (target !== combat.boss || target.coreOpen)) combat.tryAction();
    }
  }
  combat.update(dt, { infiniteLife: true });
}
assert.equal(combat.state, 'CLEAR', JSON.stringify({ state: combat.state, hp: combat.boss?.hp, seconds }));
assert.equal(combat.coreDrop.collected, true);
assert.deepEqual([...phases], [1, 2, 3]);
assert.equal(combat.score.bossHits, 9);
assert.equal(combat.score.defeatedEnemies, 12);
assert.equal(combat.score.score, 4350);
console.log(JSON.stringify({ status: 'PASS', seconds: Math.round(seconds), states: [...states], phases: [...phases], ...combat.score,
  note: 'Normal-speed automated mover, infinite life; not a human difficulty assessment.' }, null, 2));
