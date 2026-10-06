import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PigmentCombatSystem } from '../src/game/PigmentCombatSystem.js';
import { SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';
import { distance, normalize } from '../src/game/utils.js';

const stage = SPECIAL_STAGE_DEFS.pigmentBloom, results = [];
for (const start of [stage.start, { x: 384, y: 210 }, { x: 190, y: 810 }]) {
  const player = { ...start, radius: 25 }, c = new PigmentCombatSystem(stage, player);
  const states = new Set(), phases = new Set(); let seconds = 0;
  while (seconds < 300 && c.state !== 'CLEAR') {
    const dt = .02; seconds += dt; states.add(c.state); if (c.boss) phases.add(c.boss.phase);
    if (!c.frozen) {
      if (c.state === 'COLLECT') c.navigation.toward(player, c.coreDrop, 205 * dt);
      else {
        const enemy = c.director.enemies.filter(e => e.alive).sort((a, b) => distance(a, player) - distance(b, player))[0];
        const crystal = c.crystals.filter(e => e.alive).sort((a, b) => distance(a, player) - distance(b, player))[0];
        const target = enemy || crystal || (c.boss?.coreOpen ? c.boss : null);
        if (target) {
          if (distance(player, target) > (target === c.boss || target.type === 'inkCrystal' ? 135 : 75) || c.findTarget() !== target)
            c.navigation.toward(player, target, 205 * dt);
          if (c.findTarget() === target) c.tryAction();
        } else if (c.boss && distance(player, c.boss) < 210) c.navigation.move(player, normalize(player.x - c.boss.x, player.y - c.boss.y), 205 * dt);
      }
    }
    c.update(dt, { infiniteLife: true });
    assert.ok(c.crystals.length <= 3); assert.ok(c.projectiles.length <= 8);
  }
  assert.equal(c.state, 'CLEAR', JSON.stringify({ start, seconds, hp: c.boss?.hp, state: c.boss?.state, player, crystals: c.crystals }));
  assert.deepEqual([...phases], [1, 2, 3]); assert.equal(c.score.bossHits, 9);
  assert.equal(c.score.defeatedEnemies, 9); assert.equal(c.score.score, 4050);
  assert.ok(c.score.crystalsCleared >= 5); assert.equal(c.score.ddmHits, 28 + c.score.crystalsCleared);
  assert.equal(c.coreDrop.id, 'pigmentCore'); assert.equal(c.coreDrop.collected, true);
  results.push({ start, seconds: Math.round(seconds), states: [...states], phases: [...phases], ...c.score });
}
const report = { status: 'PASS', results, note: 'Actual pulses, shield breaks and pickup with normal-speed movement from three positions. Infinite life isolates flow/score; not a human difficulty assessment.' };
await fs.mkdir('qa/pigment', { recursive: true });
await fs.writeFile('qa/pigment/simulation-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
