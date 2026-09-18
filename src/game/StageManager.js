import { clamp } from './utils.js';

const PARK_DESIGN_WIDTH = 1024;
const PARK_DESIGN_HEIGHT = 1536;
const PARK_SCALE = 0.75;

const scaleParkPoint = (point) => ({
  ...point,
  x: Math.round(point.x * PARK_SCALE),
  y: Math.round(point.y * PARK_SCALE)
});

const scaleParkRect = (rect) => ({
  ...rect,
  x: Math.round(rect.x * PARK_SCALE),
  y: Math.round(rect.y * PARK_SCALE),
  width: Math.round(rect.width * PARK_SCALE),
  height: Math.round(rect.height * PARK_SCALE)
});

const parkRouteDesign = {
  mainTrail: [
    { x: 512, y: 1420 }, { x: 512, y: 1240 }, { x: 512, y: 1060 }, { x: 512, y: 900 },
    { x: 330, y: 900 }, { x: 250, y: 760 }, { x: 250, y: 620 }, { x: 350, y: 520 },
    { x: 512, y: 520 }, { x: 512, y: 340 }, { x: 512, y: 130 },
    // Close the patrol loop around the fountain instead of through it.
    { x: 250, y: 520 }, { x: 250, y: 900 }, { x: 512, y: 900 }
  ],
  leftLoop: [
    { x: 512, y: 1050 }, { x: 420, y: 1040 }, { x: 310, y: 980 }, { x: 215, y: 875 },
    { x: 185, y: 745 }, { x: 240, y: 610 }, { x: 350, y: 530 }, { x: 450, y: 570 }, { x: 512, y: 620 },
    { x: 250, y: 620 }, { x: 250, y: 900 }, { x: 512, y: 900 }
  ],
  rightLoop: [
    { x: 512, y: 1050 }, { x: 604, y: 1040 }, { x: 714, y: 980 }, { x: 809, y: 875 },
    { x: 839, y: 745 }, { x: 784, y: 610 }, { x: 674, y: 530 }, { x: 574, y: 570 }, { x: 512, y: 620 },
    { x: 780, y: 620 }, { x: 780, y: 900 }, { x: 512, y: 900 }
  ],
  upperLoop: [
    { x: 512, y: 520 }, { x: 415, y: 470 }, { x: 345, y: 385 }, { x: 375, y: 285 },
    { x: 512, y: 250 }, { x: 649, y: 285 }, { x: 679, y: 385 }, { x: 609, y: 470 }
  ]
};

const parkRoutes = Object.fromEntries(
  Object.entries(parkRouteDesign).map(([routeName, points]) => [routeName, points.map(scaleParkPoint)])
);

// The tutorial uses the same open Park artwork and collision layout. Keeping
// the obstacle set shared guarantees that the guided route teaches the player
// the exact movement rules used by the real Park stage.
const parkObstacles = [
  { x: 390, y: 675, width: 244, height: 155, kind: 'fountain' },
  { x: 700, y: 1110, width: 230, height: 120, kind: 'playground' },
  { x: 70, y: 220, width: 240, height: 160, kind: 'pond' }
].map(scaleParkRect);

const mountainRoutes = {
  mainTrail: [
    { x: 512, y: 1390 }, { x: 512, y: 1190 }, { x: 512, y: 1010 }, { x: 512, y: 840 },
    // The center lane deliberately crosses the pavilion deck, not its rails.
    { x: 512, y: 805 }, { x: 512, y: 675 }, { x: 512, y: 470 }, { x: 512, y: 290 }, { x: 512, y: 130 }
  ],
  leftLoop: [
    { x: 512, y: 1080 }, { x: 390, y: 1050 }, { x: 260, y: 970 }, { x: 175, y: 835 },
    { x: 190, y: 700 }, { x: 295, y: 585 }, { x: 410, y: 570 }, { x: 512, y: 630 }
  ],
  rightLoop: [
    { x: 512, y: 1080 }, { x: 634, y: 1050 }, { x: 764, y: 970 }, { x: 849, y: 835 },
    { x: 834, y: 700 }, { x: 729, y: 585 }, { x: 614, y: 570 }, { x: 512, y: 630 }
  ],
  upperLoop: [
    // Keep the upper patrol on the central meadow. The outer ledges in the
    // artwork are sky, cliff, or waterfall rather than connected walkable
    // ground, so the loop stays inside the open grass around the main trail.
    { x: 512, y: 470 }, { x: 458, y: 450 }, { x: 430, y: 410 }, { x: 438, y: 365 },
    { x: 454, y: 320 }, { x: 470, y: 278 }, { x: 512, y: 252 }, { x: 554, y: 278 },
    { x: 570, y: 320 }, { x: 586, y: 365 }, { x: 594, y: 410 }, { x: 566, y: 450 }
  ]
};

const mountainPavilionInterior = Object.freeze({
  x: 420,
  y: 688,
  width: 184,
  height: 116
});

// The roof is redrawn from the loaded Mountain image after entities render.
// These points cover the blue roof only; the deck, stairs, and surrounding
// grass remain part of the background and stay fully walkable.
const mountainPavilionRoof = Object.freeze([
  { x: 418, y: 712 },
  { x: 512, y: 642 },
  { x: 607, y: 712 },
  { x: 598, y: 730 },
  { x: 512, y: 699 },
  { x: 426, y: 730 }
]);

const mountainPavilionRoofBounds = Object.freeze({
  x: 410,
  y: 636,
  width: 205,
  height: 101
});

// Collision follows the approved portrait artwork rather than treating the
// whole upper half as a single wall. Short stepped rectangles keep sky,
// waterfalls, fences, trees, and rock faces solid while leaving the road,
// meadow, platform, and pavilion entrance open. The rectangles are slightly
// inset from the visible edges because Player/NPC radii already provide the
// final clearance.
const mountainObstacles = [
  // The top corners are sky and distant mountains. The stepped shape leaves
  // the central stairway and summit lookout as the only upper approach.
  { x: 0, y: 0, width: 320, height: 160, kind: 'mountain-sky' },
  { x: 704, y: 0, width: 320, height: 160, kind: 'mountain-sky' },
  { x: 0, y: 160, width: 286, height: 100, kind: 'mountain-sky' },
  { x: 738, y: 160, width: 286, height: 100, kind: 'mountain-sky' },
  { x: 0, y: 260, width: 238, height: 100, kind: 'mountain-sky' },
  { x: 786, y: 260, width: 238, height: 100, kind: 'mountain-sky' },

  // The two inner cascades descend from the upper cliffs into the meadow.
  { x: 360, y: 145, width: 66, height: 78, kind: 'left-waterfall' },
  { x: 332, y: 208, width: 78, height: 104, kind: 'left-waterfall' },
  { x: 296, y: 286, width: 78, height: 112, kind: 'left-waterfall' },
  { x: 594, y: 145, width: 70, height: 78, kind: 'right-waterfall' },
  { x: 614, y: 208, width: 78, height: 104, kind: 'right-waterfall' },
  { x: 650, y: 286, width: 78, height: 112, kind: 'right-waterfall' },

  // Large side waterfalls continue down the visible rock shelves. Each side
  // is split into overlapping steps so the nearby grass route stays open.
  { x: 0, y: 330, width: 112, height: 210, kind: 'left-waterfall' },
  { x: 64, y: 420, width: 106, height: 205, kind: 'left-waterfall' },
  { x: 90, y: 530, width: 68, height: 160, kind: 'left-waterfall' },
  { x: 912, y: 330, width: 112, height: 210, kind: 'right-waterfall' },
  { x: 854, y: 420, width: 106, height: 205, kind: 'right-waterfall' },
  { x: 866, y: 530, width: 68, height: 160, kind: 'right-waterfall' },

  // Upper summit lookout: the platform is walkable, but its rear and side
  // rails are not. The lower central opening lines up with the stairs.
  { x: 424, y: 48, width: 176, height: 12, kind: 'summit-fence' },
  { x: 416, y: 62, width: 14, height: 62, kind: 'summit-fence' },
  { x: 594, y: 62, width: 14, height: 62, kind: 'summit-fence' },
  { x: 430, y: 112, width: 42, height: 12, kind: 'summit-fence' },
  { x: 552, y: 112, width: 42, height: 12, kind: 'summit-fence' },

  // Pavilion side rails and support posts are solid. There are intentionally
  // no horizontal roof/deck rectangles, leaving both entrances and the center
  // aisle open so Player/NPCs can walk through the entire shelter.
  { x: 382, y: 686, width: 16, height: 70, kind: 'pavilion-side-fence' },
  { x: 626, y: 686, width: 16, height: 70, kind: 'pavilion-side-fence' },
  { x: 454, y: 694, width: 18, height: 60, kind: 'pavilion-post' },
  { x: 552, y: 694, width: 18, height: 60, kind: 'pavilion-post' },

  // Only the trunks/rock bases are solid; the tree crowns remain visually
  // passable so the collision does not create a wide invisible wall.
  { x: 344, y: 710, width: 34, height: 58, kind: 'pavilion-tree-trunk' },
  { x: 394, y: 758, width: 28, height: 50, kind: 'pavilion-tree-trunk' },
  { x: 656, y: 710, width: 34, height: 58, kind: 'pavilion-tree-trunk' },
  { x: 602, y: 758, width: 28, height: 50, kind: 'pavilion-tree-trunk' },

  // Mid-height forest shelves leave a generous open lane beside each loop.
  { x: 0, y: 748, width: 82, height: 154, kind: 'left-forest' },
  { x: 0, y: 886, width: 92, height: 208, kind: 'left-forest' },
  { x: 30, y: 1080, width: 108, height: 170, kind: 'left-forest' },
  { x: 942, y: 748, width: 82, height: 154, kind: 'right-forest' },
  { x: 932, y: 886, width: 92, height: 208, kind: 'right-forest' },
  { x: 886, y: 1080, width: 108, height: 170, kind: 'right-forest' },
  // Bottom forest follows the artwork edge without narrowing the entrance.
  { x: 0, y: 1230, width: 108, height: 194, kind: 'left-bottom-forest' },
  { x: 48, y: 1380, width: 150, height: 156, kind: 'left-bottom-forest' },
  { x: 174, y: 1460, width: 126, height: 76, kind: 'left-bottom-forest' },
  { x: 916, y: 1230, width: 108, height: 194, kind: 'right-bottom-forest' },
  { x: 826, y: 1380, width: 150, height: 156, kind: 'right-bottom-forest' },
  { x: 724, y: 1460, width: 126, height: 76, kind: 'right-bottom-forest' }
];

export const STAGE_DEFS = Object.freeze({
  park: {
    id: 'park',
    name: 'Jelly Park',
    displayName: '城市公園',
    subtitle: '開放公園 · 寬路巡邏',
    timed: true,
    duration: 60,
    // Keep the same 2:3 portrait ratio as the artwork, but reduce the logical
    // world so the full map reads larger on a phone screen.
    world: { width: Math.round(PARK_DESIGN_WIDTH * PARK_SCALE), height: Math.round(PARK_DESIGN_HEIGHT * PARK_SCALE) },
    fitToScreen: true,
    start: scaleParkPoint({ x: 512, y: 1390 }),
    maxNpcs: 8,
    event: { initialDelay: 2.4, spawnCooldown: 5.6, initialTolerance: 10.5, warningDuration: 3.6 },
    routes: parkRoutes,
    npcTypes: ['jogger', 'picnic', 'elder', 'visitor', 'dogWalker'],
    zones: [
      { id: 'entrance', label: '公園入口', x: 300, y: 1260, width: 424, height: 250, preference: 'mixed' },
      { id: 'grove', label: '樹蔭草地', x: 70, y: 420, width: 300, height: 330, preference: 'itch' },
      { id: 'fountain', label: '中央噴水池', x: 350, y: 570, width: 324, height: 340, preference: 'mixed' },
      { id: 'picnic', label: '野餐區', x: 650, y: 300, width: 300, height: 300, preference: 'itch' },
      { id: 'playground', label: '遊戲區', x: 620, y: 1040, width: 330, height: 280, preference: 'itch' },
      { id: 'track', label: '慢跑步道', x: 180, y: 720, width: 660, height: 470, preference: 'sore' }
    ].map(scaleParkRect),
    spawnPoints: [
      { x: 512, y: 1390, zone: 'entrance', route: 'mainTrail' },
      { x: 270, y: 830, zone: 'grove', route: 'leftLoop' },
      { x: 754, y: 830, zone: 'picnic', route: 'rightLoop' },
      { x: 512, y: 940, zone: 'fountain', route: 'mainTrail' },
      { x: 380, y: 360, zone: 'grove', route: 'upperLoop' },
      { x: 644, y: 360, zone: 'picnic', route: 'upperLoop' },
      { x: 760, y: 1290, zone: 'playground', route: 'rightLoop' },
      { x: 280, y: 1210, zone: 'track', route: 'leftLoop' }
    ].map(scaleParkPoint),
    obstacles: parkObstacles
  },
  tutorial: {
    id: 'tutorial',
    name: 'Jelly Training',
    displayName: '新手教學',
    subtitle: '基礎救援 · 無壓力練習',
    timed: false,
    duration: 45,
    world: { width: Math.round(PARK_DESIGN_WIDTH * PARK_SCALE), height: Math.round(PARK_DESIGN_HEIGHT * PARK_SCALE) },
    fitToScreen: true,
    start: scaleParkPoint({ x: 512, y: 1390 }),
    maxNpcs: 2,
    // TutorialDirector controls the two fixed practice events. These values
    // only keep the stage definition compatible with shared HUD/debug code.
    event: { initialDelay: 999, spawnCooldown: 999, initialTolerance: 999, warningDuration: 2.8 },
    routes: {},
    npcTypes: ['elder'],
    zones: [
      { id: 'training', label: '教學草地', x: 220, y: 820, width: 328, height: 360, preference: 'mixed' }
    ].map(scaleParkRect),
    spawnPoints: [],
    obstacles: parkObstacles
  },
  mountain: {
    id: 'mountain',
    name: 'Jelly Mountain',
    displayName: '山谷全景',
    subtitle: '開放草地 · 全景巡邏',
    timed: true,
    duration: 60,
    world: { width: 1024, height: 1536 },
    fitToScreen: true,
    pavilionInterior: { ...mountainPavilionInterior },
    pavilionRoof: mountainPavilionRoof,
    pavilionRoofBounds: { ...mountainPavilionRoofBounds },
    start: { x: 512, y: 1390 },
    maxNpcs: 8,
    event: { initialDelay: 2.1, spawnCooldown: 5.2, initialTolerance: 9.2, warningDuration: 3.2 },
    routes: mountainRoutes,
    npcTypes: ['hiker', 'trailRunner', 'photographer', 'elder', 'family'],
    zones: [
      { id: 'trailhead', label: '登山入口', x: 290, y: 1220, width: 444, height: 250, preference: 'mixed' },
      { id: 'meadow', label: '中央開放草地', x: 250, y: 500, width: 524, height: 670, preference: 'itch' },
      { id: 'leftMeadow', label: '左側草坡', x: 95, y: 690, width: 245, height: 350, preference: 'mixed' },
      { id: 'rightMeadow', label: '右側草坡', x: 684, y: 690, width: 245, height: 350, preference: 'sore' },
      { id: 'platform', label: '中央休息平台', x: 360, y: 650, width: 304, height: 220, preference: 'mixed' },
      // Keep random wander attempts in the central summit meadow instead of
      // repeatedly sampling the sky, waterfalls, and fenced lookout.
      { id: 'summit', label: '山頂觀景台', x: 440, y: 238, width: 144, height: 222, preference: 'sore' }
    ],
    spawnPoints: [
      { x: 512, y: 1390, zone: 'trailhead', route: 'mainTrail' },
      { x: 295, y: 985, zone: 'leftMeadow', route: 'leftLoop' },
      { x: 729, y: 985, zone: 'rightMeadow', route: 'rightLoop' },
      { x: 512, y: 760, zone: 'platform', route: 'mainTrail' },
      { x: 190, y: 735, zone: 'leftMeadow', route: 'leftLoop' },
      { x: 834, y: 735, zone: 'rightMeadow', route: 'rightLoop' },
      { x: 454, y: 320, zone: 'summit', route: 'upperLoop' },
      { x: 570, y: 320, zone: 'summit', route: 'upperLoop' }
    ],
    obstacles: mountainObstacles
  }
});

export class StageManager {
  constructor() {
    this.currentStageId = 'park';
    this.status = 'idle';
    this.elapsed = 0;
  }

  start(stageId = 'park') {
    this.currentStageId = STAGE_DEFS[stageId] ? stageId : 'park';
    this.elapsed = 0;
    this.status = 'playing';
    return this.getStage();
  }

  update(dt) {
    if (this.status !== 'playing') return;
    const stage = this.getStage();
    this.elapsed += Math.max(0, dt);
    if (stage.timed === false) return;
    this.elapsed = clamp(this.elapsed, 0, stage.duration);
    if (this.elapsed >= stage.duration) this.status = 'complete';
  }

  getStage() {
    return STAGE_DEFS[this.currentStageId];
  }

  getRemaining() {
    if (this.getStage().timed === false) return null;
    return Math.max(0, this.getStage().duration - this.elapsed);
  }

  getPhase() {
    if (this.currentStageId === 'tutorial') {
      if (this.elapsed < 8) return 'intro';
      if (this.elapsed < 28) return 'normal';
      return 'pressure';
    }
    if (this.currentStageId === 'mountain') {
      if (this.elapsed < 15) return 'intro';
      if (this.elapsed < 40) return 'normal';
      return 'pressure';
    }
    if (this.elapsed < 12) return 'intro';
    if (this.elapsed < 20) return 'nap';
    if (this.elapsed < 45) return 'mixed';
    return 'pressure';
  }
}
