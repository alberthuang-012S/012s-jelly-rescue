import test from 'node:test';
import assert from 'node:assert/strict';
import { injuryPose } from '../src/game/InjuryAnimation.js';
import { NPC } from '../src/game/NPC.js';
import { STATES } from '../src/game/constants.js';

const cases = [['basketballPlayer', 'FALL', 0], ['skateboarder', 'FALL', 1],
  ['runner', 'SPORT_SORE', 2], ['fitnessGuy', 'SPORT_SORE', 3]];
const npcFor = (role, scenario) => {
  const npc = new NPC({ id: role, role, x: 200, y: 200 });
  npc.startScenario(scenario, 10, 3);
  return npc;
};

test('injury poses progress through distinct frames, hold after onset and stop on rescue/failure/clear', () => {
  for (const [role, scenario, row] of cases) {
    const npc = npcFor(role, scenario);
    assert.deepEqual(injuryPose(npc, 0), { row, frame: 0, settled: false });
    npc.reactionTimer = npc.reactionDuration * .5;
    assert.equal(injuryPose(npc, 0).frame, 1);
    npc.reactionTimer = 0;
    assert.equal(injuryPose(npc, 650).frame, 2);
    npc.state = STATES.CRITICAL;
    assert.equal(injuryPose(npc, 1300).frame, scenario === 'FALL' ? 2 : 1);
    npc.rescue(1); assert.equal(injuryPose(npc), null);
    npc.clearEvent(2); assert.equal(injuryPose(npc), null);
    npc.startScenario(scenario, 10, 3); assert.equal(injuryPose(npc).frame, 0);
    npc.fail(); assert.equal(injuryPose(npc), null);
  }
  assert.equal(injuryPose(npcFor('runner', 'OUTDOOR_SKIN')), null);
  assert.equal(injuryPose(npcFor('runner', 'FALL')), null);
  assert.equal(injuryPose(npcFor('basketballPlayer', 'SPORT_SORE')), null);
  assert.equal(injuryPose(npcFor('sportsGirl', 'SPORT_SORE')), null);
});

test('injury sprite uses the correct row/frame and safely falls back when the atlas is unavailable', () => {
  for (const [role, scenario, row] of cases) {
    const npc = npcFor(role, scenario); npc.reactionTimer = 0;
    const base = { complete: true, naturalWidth: 768 };
    const injury = { complete: true, naturalWidth: 768 };
    npc.spriteImage = base;
    npc.spriteSheet = { lifestyle: true, columns: 3, frameWidth: 256, frameHeight: 384, injuryImage: injury };
    const calls = [];
    const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
    assert.equal(npc.drawWorldSprite(ctx, 0, 650), true);
    assert.deepEqual(calls[0].slice(0, 5), [injury, 512, row * 384, 256, 384]);
    injury.naturalWidth = 0;
    assert.equal(npc.getInjuryPose(650), null);
    npc.spriteImage = null;
    assert.equal(npc.drawWorldSprite(ctx, 0, 650), false);
  }
});
