import test from 'node:test';
import assert from 'node:assert/strict';
import { CONDITIONS, STATES } from '../src/game/constants.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { NPC } from '../src/game/NPC.js';
import { STAGE_DEFS, StageManager, STAGE_ORDER } from '../src/game/StageManager.js';
import { EventDirector } from '../src/game/EventDirector.js';
import { TravelPlanner } from '../src/game/TravelPlanner.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { PersonalBestStore } from '../src/game/PersonalBestStore.js';
import { scenarioDialogue, requiredItem } from '../src/game/ScenarioDefinitions.js';
const stage = STAGE_DEFS.garden;

test('garden pair excludes legacy items and resets correctly when returning to rescue or either boss', () => {
  const items = new ItemSystem(); items.reset({ availableItems: stage.availableItems });
  assert.equal(items.selectedId, 'DDM'); items.select('NAP'); assert.equal(items.selectedId, 'DDM');
  assert.equal(items.isCorrect(CONDITIONS.PIGMENTATION), true);
  items.toggle(); assert.equal(items.selectedId, 'SSW'); assert.equal(items.isCorrect(CONDITIONS.SALLOWNESS), true);
  assert.equal(items.isCorrect(CONDITIONS.PIGMENTATION), false);
  items.toggle(); assert.equal(items.selectedId, 'DDM');
  for (const lockedId of ['PPA', 'NAP']) {
    items.reset({ lockedId, availableItems: stage.availableItems });
    items.select('DDM'); items.toggle(); assert.equal(items.selectedId, lockedId);
  }
  items.reset(); assert.deepEqual(items.availableIds, ['PPA', 'NAP']); assert.equal(items.selectedId, 'PPA');
  items.toggle(); assert.equal(items.selectedId, 'NAP');
});

test('new conditions survive NPC normalization and keep their keyword through every waiting state', () => {
  for (const [type, condition, keyword, item] of [['PIGMENT_CARE', CONDITIONS.PIGMENTATION, '黑色素', 'DDM'], ['SALLOW_CARE', CONDITIONS.SALLOWNESS, '蠟黃', 'SSW']]) {
    const npc = new NPC({ id: type, role: 'cafeVisitor', x: 384, y: 800, stageId: 'garden' });
    npc.startScenario(type, 10, 3);
    assert.equal(npc.condition, condition); assert.equal(requiredItem(npc.condition), item);
    for (const state of [STATES.WARNING, STATES.HELP, STATES.CRITICAL]) {
      assert.match(scenarioDialogue(npc.role, type, state, 'garden'), new RegExp(keyword));
    }
    assert.equal(npc.getInjuryPose(0), null);
    const position = { x: npc.x, y: npc.y }; npc.update(.2, stage, .2);
    assert.deepEqual({ x: npc.x, y: npc.y }, position);
    npc.rescue(1); npc.update(1.3, stage, 2.3); assert.equal(npc.condition, null);
  }
});

test('all garden spawn points and patrol segments are legal and connected to the player', () => {
  const planner = new TravelPlanner(stage, 25);
  assert.equal(planner.canOccupy(stage.start), true);
  for (const point of stage.spawnPoints) {
    assert.ok(planner.canOccupy(point)); assert.ok(Number.isFinite(planner.pathDistance(stage.start, point)));
  }
  for (const route of Object.values(stage.routes)) for (let i = 0; i < route.length; i++) {
    assert.ok(planner.canOccupy(route[i])); assert.ok(planner.isClear(route[i], route[(i + 1) % route.length]));
  }
  const manager = new StageManager(); manager.start('garden'); manager.update(59); assert.equal(manager.status, 'playing');
  manager.update(1); assert.equal(manager.status, 'complete'); assert.equal(STAGE_ORDER.at(-1), 'garden');
});

test('garden teaches DDM then SSW, retries a deferred introduction and bounds mixed-condition streaks', () => {
  const director = new EventDirector(stage); const npcs = []; director.seed(npcs);
  assert.equal(director.pickScenario([], 18), null); assert.equal(director.introIndex, 0);
  assert.equal(director.triggerEvent(18, npcs), true);
  let npc = npcs.find(n => n.condition); assert.equal(npc.condition, CONDITIONS.PIGMENTATION); npc.clearEvent(0);
  assert.equal(director.triggerEvent(20, npcs), true);
  npc = npcs.find(n => n.condition); assert.equal(npc.condition, CONDITIONS.SALLOWNESS); npc.clearEvent(0);
  const original = Math.random; Math.random = () => 0;
  try {
    const received = [];
    for (let i = 0; i < 10; i++) {
      assert.equal(director.triggerEvent(35, npcs), true);
      npc = npcs.find(n => n.condition); received.push(npc.condition); npc.clearEvent(0);
    }
    for (let i = 2; i < received.length; i++) assert.ok(!(received[i] === received[i - 1] && received[i] === received[i - 2]));
    for (const resident of npcs) for (const type of stage.scenarioPool) assert.ok(director.getRoleScenarioWeight(resident, type) > 0);
  } finally { Math.random = original; }
});

test('garden fairness defers impossible final events and allows two feasible pressure events', () => {
  const player = { ...stage.start, speed: 205, radius: 25 };
  const director = new EventDirector(stage, { getPlayer: () => player }); const npcs = []; director.seed(npcs);
  npcs.forEach((npc, i) => { npc.x = 384; npc.y = 1000 - i * 40; });
  assert.equal(director.triggerEvent(46, npcs, CONDITIONS.PIGMENTATION), true);
  assert.equal(director.triggerEvent(47, npcs, CONDITIONS.SALLOWNESS), true);
  assert.equal(director.triggerEvent(48, npcs), false);
  npcs.forEach(npc => npc.clearEvent(0)); assert.equal(director.triggerEvent(55, npcs), false);
});

test('DDM and SSW scoring preserves legacy statistics and independent v1 personal bests', () => {
  const score = new ScoreManager(); score.recordRescue(2, CONDITIONS.PIGMENTATION, 1);
  score.recordRescue(4, CONDITIONS.SALLOWNESS, 1); score.recordWrongItem();
  const result = score.getResult(); assert.equal(result.score, 280);
  assert.deepEqual(result.itemSuccess, { PPA: 0, NAP: 0, DDM: 1, SSW: 1 });
  assert.equal(result.ppaSuccess, 0); assert.equal(result.napSuccess, 0); assert.equal(result.toolAccuracy, 2 / 3);
  result.itemSuccess.DDM = 99; assert.equal(score.getResult().itemSuccess.DDM, 1);
  let saved = JSON.stringify({ park: { score: 500 }, mountain: { score: 700 } });
  const storage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const store = new PersonalBestStore({ storage }); store.update('garden', 280);
  const reload = new PersonalBestStore({ storage }); assert.equal(reload.get('garden'), 280);
  assert.equal(reload.get('park'), 500); assert.equal(reload.get('mountain'), 700);
});
