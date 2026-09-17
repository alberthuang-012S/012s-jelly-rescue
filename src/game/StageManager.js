import { clamp } from './utils.js';

const parkRoutes = {
  loop: [
    { x: 120, y: 455 }, { x: 1480, y: 455 }, { x: 1480, y: 820 }, { x: 120, y: 820 }
  ],
  shortLoop: [
    { x: 460, y: 278 }, { x: 1120, y: 278 }, { x: 1120, y: 730 }, { x: 460, y: 730 }
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
    subtitle: '教學巡邏 · 中央噴水池',
    duration: 180,
    world: { width: 1600, height: 900 },
    start: { x: 160, y: 505 },
    maxNpcs: 8,
    event: { initialDelay: 2.4, spawnCooldown: 7.2, initialTolerance: 10.5, warningDuration: 3.4 },
    routes: parkRoutes,
    npcTypes: ['jogger', 'picnic', 'elder', 'visitor', 'dogWalker'],
    zones: [
      { id: 'entrance', label: '公園入口', x: 40, y: 360, width: 250, height: 280, preference: 'mixed' },
      { id: 'grove', label: '樹蔭草地', x: 300, y: 80, width: 400, height: 260, preference: 'itch' },
      { id: 'fountain', label: '中央噴水池', x: 620, y: 300, width: 360, height: 280, preference: 'mixed' },
      { id: 'picnic', label: '野餐區', x: 1020, y: 80, width: 430, height: 260, preference: 'itch' },
      { id: 'playground', label: '遊戲區', x: 1160, y: 620, width: 330, height: 220, preference: 'itch' },
      { id: 'track', label: '慢跑步道', x: 280, y: 580, width: 820, height: 250, preference: 'sore' }
    ],
    spawnPoints: [
      { x: 230, y: 470, zone: 'entrance', route: 'loop' },
      { x: 360, y: 185, zone: 'grove' },
      { x: 540, y: 245, zone: 'grove' },
      { x: 1080, y: 190, zone: 'picnic' },
      { x: 1330, y: 255, zone: 'picnic' },
      { x: 1090, y: 650, zone: 'track', route: 'shortLoop' },
      { x: 1290, y: 735, zone: 'playground' },
      { x: 770, y: 730, zone: 'track', route: 'loop' }
    ],
    obstacles: [
      { x: 675, y: 350, width: 250, height: 150, kind: 'fountain' },
      { x: 1180, y: 640, width: 230, height: 120, kind: 'playground' },
      { x: 55, y: 105, width: 230, height: 135, kind: 'pond' }
    ]
  },
  mountain: {
    id: 'mountain',
    name: 'Jelly Mountain',
    displayName: '山谷全景',
    subtitle: '開放草地 · 全景巡邏',
    duration: 180,
    world: { width: 1024, height: 1536 },
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
