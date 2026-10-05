import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { STAGE_DEFS } from '../src/game/StageManager.js';
import { EventDirector } from '../src/game/EventDirector.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { ComboManager } from '../src/game/ComboManager.js';
import { requiredItem } from '../src/game/ScenarioDefinitions.js';
import { STATES } from '../src/game/constants.js';
const stage = STAGE_DEFS.garden;
const activeStates = [STATES.WARNING, STATES.HELP, STATES.CRITICAL];
const originalRandom = Math.random;
const summary = { rounds: 200, events: 0, ddm: 0, ssw: 0, rescued: 0, failed: 0, simultaneousRounds: 0, illegalPositions: 0, missingIntroductions: 0 };
const results = [];
const distribution = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], mean: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    median: sorted[Math.floor(sorted.length / 2)], p90: sorted[Math.floor(sorted.length * .9)], max: sorted.at(-1) };
};
const scoreSummary = (rounds) => ({ rounds: rounds.length, ...distribution(rounds.map(round => round.score)),
  atLeast3000: rounds.filter(round => round.score >= 3000).length });
try {
  for (let seed = 1; seed <= summary.rounds; seed++) {
    let randomState = seed;
    Math.random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
    const npcs = []; const eventsSeen = [];
    const player = { ...stage.start, speed: seed % 2 ? 205 : 256.25, radius: 25 };
    const items = new ItemSystem(); items.reset({ availableItems: stage.availableItems });
    const score = new ScoreManager(); const combo = new ComboManager(); let pending = null; let simultaneous = false;
    const director = new EventDirector(stage, {
      getPlayer: () => player, onFailure: () => { summary.failed++; score.recordFailure(); combo.break(); },
      onEvent: npc => {
        const item = requiredItem(npc.condition); assert.ok(['DDM', 'SSW'].includes(item));
        summary.events++; summary[item.toLowerCase()]++; eventsSeen.push(item);
      }
    });
    director.seed(npcs);
    for (let frame = 0; frame < 600; frame++) {
      const time = frame / 10; director.update(.1, time, npcs);
      const events = npcs.filter(n => n.active && activeStates.includes(n.state));
      assert.ok(events.length <= director.getMaxSimultaneous(time));
      if (events.length === 2) simultaneous = true;
      for (const npc of npcs) {
        npc.update(.1, stage, time);
        if (npc.active && !npc.canOccupy(npc, stage)) summary.illegalPositions++;
      }
      if (pending && time >= pending.arriveAt) {
        const npc = pending.npc;
        if (npc.active && activeStates.includes(npc.state)) {
          player.x = npc.x; player.y = npc.y; items.select(requiredItem(npc.condition));
          assert.equal(items.isCorrect(npc.condition), true);
          combo.registerSuccess();
          score.recordRescue(npc.getResponseTime(time), npc.condition, combo.getMultiplier()); npc.rescue(time); summary.rescued++;
        }
        pending = null;
      }
      if (!pending && events.length) {
        events.sort((a, b) => a.tolerance + a.warningTimer - b.tolerance - b.warningTimer);
        const npc = events[0]; pending = { npc, arriveAt: time + director.routeTime(player, npc) + 1 };
      }
    }
    if (simultaneous) summary.simultaneousRounds++;
    assert.equal(eventsSeen[0], 'DDM');
    if (!eventsSeen.includes('SSW')) summary.missingIntroductions++;
    assert.equal(score.getResult().itemSuccess.PPA + score.getResult().itemSuccess.NAP, 0);
    results.push({ speed: player.speed, score: score.score, rescued: score.rescuedCount });
  }
  assert.equal(summary.illegalPositions, 0); assert.equal(summary.missingIntroductions, 0);
  assert.ok(summary.simultaneousRounds > 0);
  assert.equal(summary.failed, 0);
  summary.scoring = { all: scoreSummary(results), baseSpeed: scoreSummary(results.filter(round => round.speed === 205)),
    evolvedSpeed: scoreSummary(results.filter(round => round.speed === 256.25)), rescuesPerRound: distribution(results.map(round => round.rescued)) };
  // Both movement speeds must have a route-feasible path to 3000 with the normal scoring rules.
  assert.ok(summary.scoring.baseSpeed.atLeast3000 > 0);
  assert.ok(summary.scoring.evolvedSpeed.atLeast3000 > 0);
  summary.cadence = { initialDelay: stage.event.initialDelay, eventCooldowns: stage.phases.map(phase => phase.eventCooldown) };
  await mkdir('qa/garden', { recursive: true });
  await writeFile('qa/garden/simulation-report.json', JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally { Math.random = originalRandom; }
