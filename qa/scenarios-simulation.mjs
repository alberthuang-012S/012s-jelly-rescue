import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { STAGE_DEFS } from '../src/game/StageManager.js';
import { EventDirector } from '../src/game/EventDirector.js';
import { STATES } from '../src/game/constants.js';

const activeStates = [STATES.WARNING, STATES.HELP, STATES.CRITICAL];
const originalRandom = Math.random;
const summary = {};
try {
  for (const id of ['city', 'sports']) {
    const result = { rounds: 200, events: 0, ppa: 0, nap: 0, simultaneousRounds: 0, illegalPositions: 0 };
    for (let seed = 1; seed <= result.rounds; seed += 1) {
      let randomState = seed;
      Math.random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
      const stage = STAGE_DEFS[id]; const npcs = [];
      const player = { ...stage.start, speed: seed % 2 ? 205 : 256.25, radius: 25 };
      let simultaneous = false; let pending = null;
      const director = new EventDirector(stage, { getPlayer: () => player, onEvent(npc) {
        result.events += 1; result[npc.condition === 'ITCH' ? 'ppa' : 'nap'] += 1;
      } });
      director.seed(npcs);
      for (let frame = 0; frame < 600; frame += 1) {
        const time = frame / 10;
        director.update(.1, time, npcs);
        const events = npcs.filter((npc) => npc.active && activeStates.includes(npc.state));
        if (events.length === 2) simultaneous = true;
        assert.ok(events.length <= director.getMaxSimultaneous(time));
        for (const npc of npcs) {
          npc.update(.1, stage, time);
          if (npc.active && !npc.canOccupy(npc, stage)) result.illegalPositions += 1;
        }
        if (pending && time >= pending.arriveAt) {
          const npc = pending.npc;
          if (npc.active && activeStates.includes(npc.state)) {
            player.x = npc.x; player.y = npc.y; npc.rescue(time);
          }
          pending = null;
        }
        if (!pending && events.length) {
          // A virtual rescuer pays the full planned route time plus one second
          // to observe/use the item. This stress test is not a UI playtest.
          events.sort((a, b) => a.tolerance + a.warningTimer - b.tolerance - b.warningTimer);
          const npc = events[0]; pending = { npc, arriveAt: time + director.routeTime(player, npc) + 1 };
        }
      }
      if (simultaneous) result.simultaneousRounds += 1;
    }
    result.ppaRatio = Number((result.ppa / result.events).toFixed(4));
    assert.equal(result.illegalPositions, 0);
    assert.ok(result.simultaneousRounds > 0, `${id} never dispatched simultaneous events`);
    summary[id] = result;
  }
  assert.ok(summary.city.ppaRatio >= .65 && summary.city.ppaRatio <= .7);
  assert.ok(summary.sports.ppaRatio >= .27 && summary.sports.ppaRatio <= .33);
  await mkdir(new URL('./scenarios/', import.meta.url), { recursive: true });
  await writeFile(new URL('./scenarios/simulation-report.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally { Math.random = originalRandom; }
