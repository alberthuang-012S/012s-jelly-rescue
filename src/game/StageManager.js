import { clamp } from './utils.js';

const parkRoutes = {
  mainTrail: [
    { x: 512, y: 1420 }, { x: 512, y: 1240 }, { x: 512, y: 1060 }, { x: 512, y: 900 },
    { x: 360, y: 850 }, { x: 250, y: 760 }, { x: 250, y: 620 }, { x: 350, y: 520 },
    { x: 512, y: 520 }, { x: 512, y: 340 }, { x: 512, y: 130 }
  ],
  leftLoop: [
    { x: 512, y: 1050 }, { x: 420, y: 1040 }, { x: 310, y: 980 }, { x: 215, y: 875 },
    { x: 185, y: 745 }, { x: 240, y: 610 }, { x: 350, y: 530 }, { x: 450, y: 570 }, { x: 512, y: 650 }
  ],
  rightLoop: [
    { x: 512, y: 1050 }, { x: 604, y: 1040 }, { x: 714, y: 980 }, { x: 809, y: 875 },
    { x: 839, y: 745 }, { x: 784, y: 610 }, { x: 674, y: 530 }, { x: 574, y: 570 }, { x: 512, y: 650 }
  ],
  upperLoop: [
    { x: 512, y: 520 }, { x: 415, y: 470 }, { x: 345, y: 385 }, { x: 375, y: 285 },
    { x: 512, y: 250 }, { x: 649, y: 285 }, { x: 679, y: 385 }, { x: 609, y: 470 }
  ]
};

const mountainRoutes = {
  mainTrail: [
    { x: 512, y: 1390 }, { x: 512, y: 1190 }, { x: 512, y: 1010 }, { x: 512, y: 820 },
    { x: 512, y: 650 }, { x: 512, y: 470 }, { x: 512, y: 290 }, { x: 512, y: 130 }
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
    { x: 512, y: 430 }, { x: 405, y: 400 }, { x: 330, y: 320 }, { x: 350, y: 235 },
    { x: 512, y: 205 }, { x: 674, y: 235 }, { x: 694, y: 320 }, { x: 619, y: 400 }
  ]
};

export const STAGE_DEFS = Object.freeze({
  park: {
    id: 'park',
    name: 'Jelly Park',
    displayName: '城市公園',
    subtitle: '開放公園 · 寬路巡邏',
    duration: 180,
    world: { width: 1024, height: 1536 },
    fitToScreen: true,
    start: { x: 512, y: 1390 },
    maxNpcs: 8,
    event: { initialDelay: 2.4, spawnCooldown: 7.2, initialTolerance: 10.5, warningDuration: 3.4 },
    routes: parkRoutes,
    npcTypes: ['jogger', 'picnic', 'elder', 'visitor', 'dogWalker'],
    zones: [
      { id: 'entrance', label: '公園入口', x: 300, y: 1260, width: 424, height: 250, preference: 'mixed' },
      { id: 'grove', label: '樹蔭草地', x: 70, y: 420, width: 300, height: 330, preference: 'itch' },
      { id: 'fountain', label: '中央噴水池', x: 350, y: 570, width: 324, height: 340, preference: 'mixed' },
      { id: 'picnic', label: '野餐區', x: 650, y: 300, width: 300, height: 300, preference: 'itch' },
      { id: 'playground', label: '遊戲區', x: 620, y: 1040, width: 330, height: 280, preference: 'itch' },
      { id: 'track', label: '慢跑步道', x: 180, y: 720, width: 660, height: 470, preference: 'sore' }
    ],
    spawnPoints: [
      { x: 512, y: 1390, zone: 'entrance', route: 'mainTrail' },
      { x: 270, y: 830, zone: 'grove', route: 'leftLoop' },
      { x: 754, y: 830, zone: 'picnic', route: 'rightLoop' },
      { x: 512, y: 940, zone: 'fountain', route: 'mainTrail' },
      { x: 380, y: 360, zone: 'grove', route: 'upperLoop' },
      { x: 644, y: 360, zone: 'picnic', route: 'upperLoop' },
      { x: 760, y: 1290, zone: 'playground', route: 'rightLoop' },
      { x: 280, y: 1210, zone: 'track', route: 'leftLoop' }
    ],
    obstacles: [
      { x: 390, y: 675, width: 244, height: 155, kind: 'fountain' },
      { x: 700, y: 1110, width: 230, height: 120, kind: 'playground' },
      { x: 70, y: 220, width: 240, height: 160, kind: 'pond' }
    ]
  },
  mountain: {
    id: 'mountain',
    name: 'Jelly Mountain',
    displayName: '山谷全景',
    subtitle: '開放草地 · 全景巡邏',
    duration: 180,
    world: { width: 1024, height: 1536 },
    fitToScreen: true,
    start: { x: 512, y: 1390 },
    maxNpcs: 8,
    event: { initialDelay: 2.1, spawnCooldown: 6.3, initialTolerance: 8.2, warningDuration: 2.8 },
    routes: mountainRoutes,
    npcTypes: ['hiker', 'trailRunner', 'photographer', 'elder', 'family'],
    zones: [
      { id: 'trailhead', label: '登山入口', x: 290, y: 1220, width: 444, height: 250, preference: 'mixed' },
      { id: 'meadow', label: '中央開放草地', x: 250, y: 500, width: 524, height: 670, preference: 'itch' },
      { id: 'leftMeadow', label: '左側草坡', x: 95, y: 690, width: 245, height: 350, preference: 'mixed' },
      { id: 'rightMeadow', label: '右側草坡', x: 684, y: 690, width: 245, height: 350, preference: 'sore' },
      { id: 'platform', label: '中央休息平台', x: 360, y: 650, width: 304, height: 220, preference: 'mixed' },
      { id: 'summit', label: '山頂觀景台', x: 320, y: 55, width: 384, height: 365, preference: 'sore' }
    ],
    spawnPoints: [
      { x: 512, y: 1390, zone: 'trailhead', route: 'mainTrail' },
      { x: 295, y: 985, zone: 'leftMeadow', route: 'leftLoop' },
      { x: 729, y: 985, zone: 'rightMeadow', route: 'rightLoop' },
      { x: 512, y: 760, zone: 'platform', route: 'mainTrail' },
      { x: 190, y: 735, zone: 'leftMeadow', route: 'leftLoop' },
      { x: 834, y: 735, zone: 'rightMeadow', route: 'rightLoop' },
      { x: 405, y: 300, zone: 'summit', route: 'upperLoop' },
      { x: 619, y: 300, zone: 'summit', route: 'upperLoop' }
    ],
    // Keep the center open. Only the illustrated edge clusters are blocked so
    // the player can cross the map without getting trapped in narrow lanes.
    obstacles: [
      { x: 0, y: 170, width: 230, height: 300, kind: 'upper-left-cliff' },
      { x: 794, y: 220, width: 230, height: 330, kind: 'upper-right-cliff' },
      { x: 0, y: 480, width: 150, height: 260, kind: 'left-waterfall' },
      { x: 874, y: 470, width: 150, height: 260, kind: 'right-waterfall' },
      { x: 0, y: 1330, width: 250, height: 206, kind: 'left-bottom-forest' },
      { x: 774, y: 1330, width: 250, height: 206, kind: 'right-bottom-forest' }
    ]
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
    this.elapsed = clamp(this.elapsed + dt, 0, stage.duration);
    if (this.elapsed >= stage.duration) this.status = 'complete';
  }

  getStage() {
    return STAGE_DEFS[this.currentStageId];
  }

  getRemaining() {
    return Math.max(0, this.getStage().duration - this.elapsed);
  }

  getPhase() {
    if (this.elapsed < 30) return 'intro';
    if (this.elapsed < 60) return 'nap';
    if (this.elapsed < 120) return 'mixed';
    return 'pressure';
  }
}
