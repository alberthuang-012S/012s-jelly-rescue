import { CONDITIONS } from './constants.js';

const phase = (until, name, conditionWeights, maxSimultaneous, warningDuration, tolerance, eventCooldown) =>
  ({ until, name, conditionWeights, maxSimultaneous, warningDuration, tolerance, eventCooldown, spawnCooldown: 5 });

export const GARDEN_STAGE = Object.freeze({
  id: 'garden', name: 'Jelly Radiance Garden', displayName: '光采花園', subtitle: '辨認需求・光采照顧',
  renderer: 'lifestyle', theme: 'garden', npcArtId: 'city',
  timed: true, duration: 60, world: { width: 768, height: 1152 }, fitToScreen: true,
  start: { x: 384, y: 1060 }, maxNpcs: 8, seedCount: 5, availableItems: ['DDM', 'SSW'],
  event: { initialDelay: 1.8, spawnCooldown: 5, initialTolerance: 11, warningDuration: 3.8 },
  introConditions: [CONDITIONS.PIGMENTATION, CONDITIONS.SALLOWNESS], maxConditionStreak: 2,
  phases: [
    // More scoring opportunities within the same minute, using the shared 100-point base.
    phase(15, 'ddm', { PIGMENTATION: 1 }, 1, 3.8, 11, 4.8),
    phase(30, 'ssw', { SALLOWNESS: 1 }, 1, 3.8, 11, 4.4),
    phase(45, 'mixed', { PIGMENTATION: .5, SALLOWNESS: .5 }, 1, 3.4, 9.5, 3.8),
    phase(60, 'pressure', { PIGMENTATION: .5, SALLOWNESS: .5 }, 2, 3, 8.5, 3.2)
  ],
  scenarioPool: ['PIGMENT_CARE', 'SALLOW_CARE'], scenarioWeights: { PIGMENT_CARE: 1, SALLOW_CARE: 1 },
  npcTypes: ['youngWoman', 'shopper', 'cafeVisitor', 'photographerGirl', 'deliveryWorker'],
  // Stage-local weights let every resident need either product without changing city probabilities.
  roleScenarioWeights: { PIGMENT_CARE: 1, SALLOW_CARE: 1 },
  zones: [
    { id: 'entrance', label: '花園入口', x: 300, y: 960, width: 170, height: 170 },
    { id: 'plaza', label: '中央花園', x: 320, y: 280, width: 125, height: 620 },
    { id: 'cafe', label: '咖啡露台', x: 65, y: 275, width: 220, height: 160 },
    { id: 'shops', label: '花店步道', x: 465, y: 285, width: 240, height: 160 },
    { id: 'photo', label: '花牆拍照區', x: 300, y: 110, width: 165, height: 150 },
    { id: 'leftLawn', label: '左側花園', x: 85, y: 740, width: 200, height: 220 },
    { id: 'rightLawn', label: '右側花園', x: 485, y: 740, width: 200, height: 220 }
  ],
  routes: {
    mainTrail: [{ x: 384, y: 1060 }, { x: 384, y: 700 }, { x: 384, y: 310 }, { x: 384, y: 210 }],
    leftLoop: [{ x: 384, y: 700 }, { x: 180, y: 700 }, { x: 180, y: 870 }, { x: 384, y: 870 }],
    rightLoop: [{ x: 384, y: 700 }, { x: 580, y: 700 }, { x: 580, y: 870 }, { x: 384, y: 870 }],
    upperLoop: [{ x: 384, y: 310 }, { x: 180, y: 310 }, { x: 180, y: 235 }, { x: 384, y: 235 }]
  },
  spawnPoints: [
    { x: 384, y: 960, zone: 'entrance', route: 'mainTrail' },
    { x: 180, y: 310, zone: 'cafe', route: 'upperLoop' },
    { x: 580, y: 325, zone: 'shops', route: 'mainTrail' },
    { x: 190, y: 810, zone: 'leftLawn', route: 'leftLoop' },
    { x: 580, y: 820, zone: 'rightLawn', route: 'rightLoop' }
  ],
  // Measured footprints from generated-garden-map-v1.png, scaled by 0.75.
  // Low flower edging is decorative; buildings, cafe tables and ponds are solid.
  obstacles: [
    { x: 46, y: 457, width: 203, height: 182, kind: 'cafe' },
    { x: 553, y: 471, width: 182, height: 188, kind: 'flowerShop' },
    { x: 552, y: 94, width: 182, height: 173, kind: 'clothes' },
    { x: 84, y: 381, width: 64, height: 61, kind: 'table' },
    { x: 175, y: 336, width: 61, height: 64, kind: 'table' },
    { x: 48, y: 0, width: 132, height: 68, kind: 'pond' },
    { x: 603, y: 0, width: 133, height: 67, kind: 'pond' }
  ],
  landmarks: [
    { kind: 'cafe', label: '花園咖啡', x: 46, y: 457, width: 203, height: 182, color: '#bca5de', solid: true },
    { kind: 'flowerShop', label: '花日子', x: 553, y: 471, width: 182, height: 188, color: '#e9a9bf', solid: true },
    { kind: 'clothes', label: '光采小屋', x: 552, y: 94, width: 182, height: 173, color: '#e7c279', solid: true },
    { kind: 'flowers', label: '光采花園', x: 90, y: 30, width: 588, height: 75, color: '#e8d9ee', solid: false },
    { kind: 'table', x: 84, y: 381, width: 64, height: 61, color: '#dbc7e7', solid: true },
    { kind: 'table', x: 175, y: 336, width: 61, height: 64, color: '#f4d9cf', solid: true }
  ]
});
