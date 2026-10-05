import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_DEFS, resolveScenario, requiredItem } from '../src/game/ScenarioDefinitions.js';
import { NPC_ROLE_DEFS } from '../src/game/NPCRoleDefinitions.js';
import { NPC } from '../src/game/NPC.js';
import { STATES, CONDITIONS } from '../src/game/constants.js';
import { STAGE_DEFS, StageManager, STAGE_ORDER } from '../src/game/StageManager.js';
import { ItemSystem } from '../src/game/ItemSystem.js';
import { InteractionSystem } from '../src/game/InteractionSystem.js';
import { EventDirector } from '../src/game/EventDirector.js';
import { TravelPlanner } from '../src/game/TravelPlanner.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { PersonalBestStore } from '../src/game/PersonalBestStore.js';
import { TutorialDirector } from '../src/game/TutorialDirector.js';

function randomSeed(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function withRandom(callback) {
  const previous = Math.random; Math.random = randomSeed(92341);
  try { return callback(); } finally { Math.random = previous; }
}
const makeNpc = (role = 'runner', path = []) => new NPC({ id: role, role, x: 384, y: 600, path });

test('all scenarios resolve to their dedicated conditions; item correctness remains condition-only', () => {
  assert.equal(Object.keys(SCENARIO_DEFS).length, 8);
  assert.deepEqual(Object.keys(CONDITIONS), ['ITCH', 'SORENESS', 'PIGMENTATION', 'SALLOWNESS']);
  for (const [type, definition] of Object.entries(SCENARIO_DEFS)) {
    const expected = type === 'PIGMENT_CARE' ? 'PIGMENTATION' : type === 'SALLOW_CARE' ? 'SALLOWNESS'
      : ['SKINCARE', 'OUTDOOR_SKIN', 'GRASS_SKIN'].includes(type) ? 'ITCH' : 'SORENESS';
    assert.equal(resolveScenario(type).condition, expected);
    const items = new ItemSystem();
    if (['PIGMENT_CARE', 'SALLOW_CARE'].includes(type)) items.reset({ availableItems: ['DDM', 'SSW'] });
    items.select(requiredItem(expected));
    assert.equal(items.isCorrect(definition.condition), true); items.toggle();
    assert.equal(items.isCorrect(definition.condition), false);
    assert.ok(definition.dialogue.WARNING && definition.dialogue.HELP && definition.dialogue.CRITICAL && definition.dialogue.RESCUED);
  }
  assert.throws(() => resolveScenario('UNKNOWN'), RangeError);
});

test('reaction progresses inside WARNING; HELP, CRITICAL, FAILED, rescue and clear reset correctly', () => {
  for (const type of Object.keys(SCENARIO_DEFS)) {
    const npc = makeNpc(); let failures = 0;
    npc.onFailure = () => { failures += 1; };
    assert.equal(npc.startScenario(type, 4, 2, 5), true);
    assert.equal(npc.visualState, 'EVENT_REACTION');
    assert.equal(npc.startScenario(type, 4, 2), false);
    npc.update(1.2, STAGE_DEFS.sports, 6.2);
    assert.equal(npc.visualState, STATES.WARNING);
    npc.update(.8, STAGE_DEFS.sports, 7);
    assert.equal(npc.state, STATES.HELP);
    npc.update(3, STAGE_DEFS.sports, 10);
    assert.equal(npc.state, STATES.CRITICAL);
    npc.update(1, STAGE_DEFS.sports, 11);
    assert.equal(npc.state, STATES.FAILED); assert.equal(failures, 1);
    npc.clearEvent(12); assert.equal(npc.scenarioType, null); assert.equal(npc.reactionType, null);
    npc.startScenario(type, 4, 2, 15); npc.rescue(16);
    assert.equal(npc.reactionTimer, 0); assert.equal(npc.getResponseTime(16), 1);
    npc.update(1.3, STAGE_DEFS.sports, 17.3);
    assert.equal(npc.state, STATES.NORMAL); assert.equal(npc.condition, null); assert.equal(npc.scenarioType, null);
  }
});

test('FALL stumbles then stops; SPORT_SORE slows then stops; skin pauses without injury pose', () => {
  for (const type of ['FALL', 'SPORT_SORE', 'SKINCARE']) {
    const npc = makeNpc('runner', [{ x: 384, y: 850 }]);
    npc.startScenario(type, 10, 3);
    npc.update(.1, STAGE_DEFS.sports, .1);
    assert.equal(npc.y > 600, type !== 'SKINCARE');
    for (let frame = 0; frame < 40; frame += 1) npc.update(.05, STAGE_DEFS.sports, .15 + frame * .05);
    const position = { x: npc.x, y: npc.y };
    npc.update(.5, STAGE_DEFS.sports, 2.6);
    assert.deepEqual({ x: npc.x, y: npc.y }, position);
  }
});

test('nearby WARNING stays usable; CRITICAL target is prioritized over a closer warning', () => {
  const warning = makeNpc(); warning.startScenario('SKINCARE', 10, 3);
  const critical = makeNpc(); critical.x += 40; critical.startScenario('FALL', 10, 3); critical.state = STATES.CRITICAL;
  const interaction = new InteractionSystem(84);
  assert.equal(interaction.findTarget({ x: 384, y: 600 }, [warning]), warning);
  assert.equal(interaction.findTarget({ x: 384, y: 600 }, [warning, critical]), critical);
  assert.equal(interaction.findTarget({ x: 10, y: 10 }, [warning, critical]), null);
});

test('new stages have legal player/NPC spawns, patrol nodes, complete role definitions and phase data', () => {
  for (const id of ['city', 'sports']) {
    const stage = STAGE_DEFS[id]; const planner = new TravelPlanner(stage, 25);
    assert.equal(stage.duration, 60); assert.equal(stage.fitToScreen, true);
    assert.equal(planner.canOccupy(stage.start), true);
    for (const point of stage.spawnPoints) {
      assert.equal(planner.canOccupy(point), true, `${id} spawn ${JSON.stringify(point)}`);
      assert.ok(Number.isFinite(planner.pathDistance(stage.start, point)));
    }
    for (const points of Object.values(stage.routes)) for (const point of points) assert.equal(planner.canOccupy(point), true);
    for (const role of stage.npcTypes) {
      const definition = NPC_ROLE_DEFS[role]; assert.ok(definition.label && definition.movement);
      assert.equal(definition.spriteVariant, null);
      assert.ok(Object.keys(definition.scenarioWeights).some((type) => stage.scenarioPool.includes(type)));
    }
    assert.equal(stage.phases.at(-1).until, 60);
  }
});

test('route planner accounts for detours and rejects physically disconnected targets', () => {
  const stage = { world: { width: 400, height: 400 }, obstacles: [{ x: 175, y: 60, width: 50, height: 270 }] };
  const planner = new TravelPlanner(stage, 10);
  const from = { x: 100, y: 200 }; const to = { x: 300, y: 200 };
  assert.ok(planner.pathDistance(from, to) > 350);
  const sealed = new TravelPlanner({ ...stage, obstacles: [{ x: 175, y: 0, width: 50, height: 400 }] }, 10);
  assert.equal(sealed.pathDistance(from, to), Infinity);
});

test('two-event fairness tests both deadlines and stops dispatch before stage end', () => {
  const stage = { ...STAGE_DEFS.sports, world: { width: 1200, height: 1200 }, obstacles: [] };
  const player = { x: 50, y: 600, speed: 100, radius: 25 };
  const director = new EventDirector(stage, { getPlayer: () => player });
  const npc = makeNpc(); npc.x = 1100;
  const existing = makeNpc(); existing.x = 100; existing.startScenario('SPORT_SORE', 1, 1); existing.state = STATES.HELP;
  assert.equal(director.isScheduleFeasible(npc, [existing], 2, 1, 10), false);
  existing.tolerance = 20;
  assert.equal(director.isScheduleFeasible(npc, [existing], 12, 3, 10), true);
  assert.equal(director.isScheduleFeasible(npc, [], 12, 3, 50), false);
  assert.equal(director.triggerEvent(59, [makeNpc()]), false);
});

test('seeded scenario sampling respects family ratios, city introduction and role compatibility', () => withRandom(() => {
  for (const [id, expected] of [['city', .56], ['sports', .15]]) {
    const director = new EventDirector(STAGE_DEFS[id]); const npcs = []; director.seed(npcs);
    let ppa = 0; const observed = new Set();
    for (let sample = 0; sample < 12000; sample += 1) {
      const { npc, scenarioType } = director.pickScenario(npcs, 25);
      assert.ok(NPC_ROLE_DEFS[npc.role].scenarioWeights[scenarioType] > 0);
      observed.add(scenarioType); ppa += SCENARIO_DEFS[scenarioType].condition === CONDITIONS.ITCH;
    }
    assert.ok(Math.abs(ppa / 12000 - expected) < .02, `${id} ratio ${ppa / 12000}`);
    assert.equal(observed.size, STAGE_DEFS[id].scenarioPool.length);
    if (id === 'city') for (let i = 0; i < 80; i += 1) assert.ok(['SKINCARE', 'OUTDOOR_SKIN'].includes(director.pickScenario(npcs, 5).scenarioType));
  }
}));

test('Sports runner can receive both soreness and fall scenarios',()=>withRandom(()=>{
  const runner=makeNpc('runner');
  const director=new EventDirector(STAGE_DEFS.sports);
  assert.ok(NPC_ROLE_DEFS.runner.scenarioWeights.FALL>0);
  const observed=new Set();
  for(let sample=0;sample<50;sample+=1)
    observed.add(director.pickScenario([runner],25,CONDITIONS.SORENESS).scenarioType);
  assert.deepEqual(observed,new Set(['SPORT_SORE','FALL']));
}));

test('Tutorial remains untimed, practice never fails and legacy events keep movement/state behavior', () => {
  const manager = new StageManager(); manager.start('tutorial'); manager.update(600);
  assert.equal(manager.status, 'playing'); assert.equal(manager.getRemaining(), null);
  const tutorial = new TutorialDirector(manager.getStage()); const npcs = [];
  tutorial.step = 'first-rescue'; const npc = tutorial.beginRescue(5, npcs, { ...manager.getStage().start, direction: 'up' });
  assert.equal(npc.stageId,'tutorial');
  npc.update(1000, manager.getStage(), 1005); assert.equal(npc.state, STATES.HELP);
  assert.equal(npc.scenarioType, null);
  for (const id of ['park', 'mountain']) {
    manager.start(id); const stage = manager.getStage(); const director = new EventDirector(stage); const npcs = [];
    director.seed(npcs); assert.equal(npcs.length, 5); assert.ok(npcs.every((npc)=>npc.stageId===id));
    assert.equal(director.triggerEvent(5, npcs, CONDITIONS.ITCH), true);
    const target = npcs.find((npc) => npc.condition); assert.equal(target.condition, CONDITIONS.ITCH); assert.equal(target.scenarioType, null);
    target.rescue(6); target.update(1.3, stage, 7.3); assert.equal(target.state, STATES.NORMAL);
    manager.update(60); assert.equal(manager.status, 'complete');
  }
});

test('results aggregate by item and new personal best storage preserves old records', () => {
  const score = new ScoreManager(); score.recordRescue(2, CONDITIONS.ITCH, 1); score.recordRescue(4, CONDITIONS.SORENESS, 1);
  score.recordFailure(); score.recordWrongItem(); const result = score.getResult();
  assert.equal(result.ppaSuccess, 1); assert.equal(result.napSuccess, 1); assert.equal(result.averageResponseTime, 3);
  assert.equal(result.rescueRate, 2 / 3); assert.equal(result.toolAccuracy, 2 / 3);
  let saved = JSON.stringify({ park: { score: 200 }, mountain: { score: 300 } });
  const store = new PersonalBestStore({ storage: { getItem: () => saved, setItem: (_key, value) => { saved = value; } } });
  store.update('city', 400); store.update('sports', 500);
  for (const [id, value] of [['park', 200], ['mountain', 300], ['city', 400], ['sports', 500]]) assert.equal(store.get(id), value);
  assert.deepEqual(STAGE_ORDER, ['tutorial', 'park', 'mountain', 'city', 'sports', 'garden']);
});
