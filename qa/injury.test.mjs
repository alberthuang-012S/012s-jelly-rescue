import test from 'node:test';
import assert from 'node:assert/strict';
import { injuryPose } from '../src/game/InjuryAnimation.js';
import { NPC } from '../src/game/NPC.js';
import { STATES, CONDITIONS } from '../src/game/constants.js';
import { NPC_ROLE_DEFS } from '../src/game/NPCRoleDefinitions.js';

const cases = [['basketballPlayer', 'FALL', 0], ['skateboarder', 'FALL', 1],
  ['runner', 'SPORT_SORE', 2], ['fitnessGuy', 'SPORT_SORE', 3], ['runner', 'FALL', 4]];
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
    assert.equal(injuryPose(npc, 1300).frame, 2);
    npc.rescue(1); assert.equal(injuryPose(npc), null);
    npc.clearEvent(2); assert.equal(injuryPose(npc), null);
    npc.startScenario(scenario, 10, 3); assert.equal(injuryPose(npc).frame, 0);
    npc.fail(); assert.equal(injuryPose(npc), null);
  }
  assert.equal(injuryPose(npcFor('runner', 'OUTDOOR_SKIN')), null);
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
    assert.equal(calls[0][7],row===4?120:100);
    assert.equal(calls[0][8],row===4?180:150);
    assert.ok(Math.abs(calls[0][6]+calls[0][8]-(npc.y+36))<=.8,'Feet stay registered across pose sizes');
    injury.naturalWidth = 0;
    assert.equal(npc.getInjuryPose(650), null);
    npc.spriteImage = null;
    assert.equal(npc.drawWorldSprite(ctx, 0, 650), false);
  }
});

test('dialogue-only scenarios draw the normal sprite without extra gestures or symbols', () => {
  for (const [role, scenario] of [['youngWoman', 'SKINCARE'], ['grassVisitor', 'GRASS_SKIN'],
    ['sportsGirl', 'SPORT_SORE'], ['runner', 'OUTDOOR_SKIN'], ['basketballPlayer', 'SPORT_SORE']]) {
    const npc = npcFor(role, scenario);
    const base = { complete: true, naturalWidth: 768 };
    npc.spriteImage = base;
    npc.spriteSheet = { lifestyle: true, columns: 3, frameWidth: 256, frameHeight: 384,
      injuryImage: { complete: true, naturalWidth: 768 } };
    const calls = [];
    // Only sprite operations are permitted. Drawing an extra cue/transform
    // would require a missing context method and fail this check.
    const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
    assert.equal(npc.getInjuryPose(650), null);
    assert.equal(npc.drawWorldSprite(ctx, 0, 650), true);
    assert.equal(calls.length, 1); assert.equal(calls[0][0], base);
    assert.equal(npc.hasStatusBubble(), true);
  }
});

test('static concerned expressions follow active scenarios, restore after rescue and fall back when unavailable', () => {
  for (const [role, scenario] of [['youngWoman', 'SKINCARE'], ['deliveryWorker', 'LONG_WALK'],
    ['sportsGirl', 'SPORT_SORE'], ['runner', 'OUTDOOR_SKIN'], ['basketballPlayer', 'SPORT_SORE']]) {
    const npc = npcFor(role, scenario);
    const base = { complete: true, naturalWidth: 768 };
    const concerned = { complete: true, naturalWidth: 768 };
    npc.spriteImage = base;
    npc.spriteSheet = { lifestyle: true, columns: 3, frameWidth: 256, frameHeight: 384, conditionImage: concerned };
    let drawn;
    const ctx = { save() {}, restore() {}, drawImage(image) { drawn = image; } };
    for (const state of [STATES.WARNING, STATES.HELP, STATES.CRITICAL]) {
      npc.state = state; npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn, concerned);
    }
    concerned.naturalWidth = 0;
    npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn, base);
    concerned.naturalWidth = 768;
    npc.rescue(1); npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn, base);
    npc.clearEvent(); npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn, base);
  }
});

test('Park and Mountain generic events select concerned sprites for each role and restore the normal sprite', () => {
  const roles = ['jogger', 'picnic', 'elder', 'visitor', 'dogWalker', 'hiker', 'trailRunner', 'photographer', 'family'];
  for (const role of roles) for (const condition of Object.values(CONDITIONS)) {
    const npc = new NPC({ id: role, role, x: 200, y: 200 });
    const base = { complete: true, naturalWidth: 960 };
    const concerned = { complete: true, naturalWidth: 960 };
    npc.spriteImage = base;
    npc.spriteSheet = { lifestyle: false, columns: 3, frameWidth: 320, frameHeight: 640, conditionImage: concerned };
    npc.startEvent(condition, 10, 3);
    assert.equal(npc.scenarioType, null);
    let drawn;
    const ctx = { save() {}, restore() {}, drawImage(...args) { drawn = args; } };
    for (const state of [STATES.WARNING, STATES.HELP, STATES.CRITICAL]) {
      npc.state = state; npc.drawWorldSprite(ctx, 0, 0);
      assert.equal(drawn[0], concerned);
      assert.equal(drawn[1], NPC_ROLE_DEFS[role].spriteVariant * 320);
    }
    concerned.complete = false; npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn[0], base);
    concerned.complete = true; npc.rescue(1); npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn[0], base);
    npc.clearEvent(); npc.drawWorldSprite(ctx, 0, 0); assert.equal(drawn[0], base);
  }
});
