import { CONDITIONS } from './constants.js';
import { TravelPlanner } from './TravelPlanner.js';

export const ENDLESS_STAGE_ID = 'endlessPlaza';
export const ENDLESS_UNLOCK_AT = 60;
export const ENDLESS_ITEMS = Object.freeze(['PPA', 'NAP', 'DDM', 'SSW']);
export const ENDLESS_SPORTS_ROLES = Object.freeze(['basketballPlayer', 'runner', 'skateboarder']);

export function endlessSchedule(time) {
  if (time < 20) return { interval: 4, maxSimultaneous: 2, tolerance: 12, warning: 3.6 };
  if (time < 80) return { interval: 3, maxSimultaneous: 2, tolerance: 11, warning: 3.4 };
  if (time < 150) return { interval: 2.4, maxSimultaneous: 3, tolerance: 10, warning: 3.2 };
  // A continuous ten-second rush and five-second breath, without transitions.
  return { interval: (time - 150) % 15 < 10 ? 1.8 : 2.6, maxSimultaneous: 4, tolerance: 9, warning: 3 };
}

const ppaNap = ['OUTDOOR_SKIN', 'LONG_WALK', 'FALL'];
const allScenarios = [...ppaNap, 'PIGMENT_CARE', 'SALLOW_CARE'];
export const ENDLESS_STAGE = Object.freeze({
  id: ENDLESS_STAGE_ID, name: 'Jelly Rescue Central', displayName: '救援中央廣場',
  renderer: 'endless', npcArtId: 'city', timed: false, duration: Infinity,
  world: { width: 768, height: 1152 }, fitToScreen: true, start: { x: 384, y: 520 },
  endless: { continuous: true }, availableItems: ['PPA', 'NAP'], maxNpcs: 12, seedCount: 8,
  event: { initialDelay: 1, spawnCooldown: 1.5 },
  introConditions: [], maxConditionStreak: 2,
  scenarioPool: allScenarios, scenarioWeights: Object.fromEntries(allScenarios.map((type) => [type, type === 'FALL' ? .6 : 1])),
  // Fall uses the sports roles' own weights so only animated fall roles are selected.
  roleScenarioWeights: Object.fromEntries(allScenarios.filter((type) => type !== 'FALL').map((type) => [type, 1])),
  phases: [
    { until: ENDLESS_UNLOCK_AT, name: 'two-items', scenarioPool: ppaNap, conditionWeights: { [CONDITIONS.ITCH]: .5, [CONDITIONS.SORENESS]: .5 } },
    { until: Infinity, name: 'four-items', scenarioPool: allScenarios, conditionWeights: Object.fromEntries(Object.values(CONDITIONS).map((id) => [id, .25])) }
  ],
  npcTypes: ['youngWoman', 'shopper', 'cafeVisitor', 'photographerGirl', 'deliveryWorker', ...ENDLESS_SPORTS_ROLES],
  zones: [
    { id: 'north', x: 230, y: 300, width: 310, height: 170 },
    { id: 'west', x: 110, y: 370, width: 210, height: 330 },
    { id: 'east', x: 448, y: 370, width: 210, height: 190 },
    { id: 'south', x: 265, y: 685, width: 230, height: 160 },
    { id: 'central', x: 300, y: 410, width: 168, height: 270 }
  ],
  routes: {
    promenade: [{ x: 384, y: 830 }, { x: 384, y: 520 }, { x: 520, y: 520 }, { x: 520, y: 355 }, { x: 384, y: 355 }, { x: 250, y: 355 }, { x: 250, y: 650 }, { x: 384, y: 650 }]
  },
  spawnPoints: [
    { x: 250, y: 340, zone: 'north', route: 'promenade' }, { x: 510, y: 340, zone: 'north', route: 'promenade' },
    { x: 150, y: 450, zone: 'west', route: 'promenade' }, { x: 620, y: 450, zone: 'east', route: 'promenade' },
    { x: 200, y: 610, zone: 'west', route: 'promenade' }, { x: 535, y: 610, zone: 'central', route: 'promenade' },
    { x: 325, y: 795, zone: 'south', route: 'promenade' }, { x: 445, y: 795, zone: 'south', route: 'promenade' },
    { x: 384, y: 325, zone: 'north', route: 'promenade' }, { x: 384, y: 825, zone: 'south', route: 'promenade' }
  ],
  obstacles: [
    // Ground footprints measured on generated-endless-map-v3.png (1024×1536).
    { x: 56, y: 155, width: 190, height: 150, kind: 'cafe' },
    { x: 530, y: 155, width: 182, height: 150, kind: 'flower-shop' },
    { x: 65, y: 769, width: 162, height: 44, kind: 'bench' },
    { x: 541, y: 769, width: 163, height: 44, kind: 'bench' },
    { x: 562, y: 586, width: 96, height: 62, kind: 'flower-bed' },
    { x: 562, y: 692, width: 96, height: 54, kind: 'flower-bed' }
  ]
});

// Older saves retain their clocks, events and poses. Relocate only positions
// covered by a newly measured prop footprint, without consuming random values.
export function safeEndlessPosition(stage, position, radius = 20) {
  const planner = new TravelPlanner(stage, radius);
  if (planner.canOccupy(position)) return { x: position.x, y: position.y };
  const candidates = [...planner.nodes, ...stage.spawnPoints, stage.start]
    .filter((point) => Number.isFinite(planner.pathDistance(stage.start, point)))
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y));
  const point = candidates[0] || stage.start;
  return { x: point.x, y: point.y };
}
