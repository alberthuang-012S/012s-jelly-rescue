import { clamp } from './utils.js';

const parkRoutes = {
  loop: [
    { x: 120, y: 455 }, { x: 1420, y: 455 }, { x: 1420, y: 640 }, { x: 120, y: 640 }
  ],
  shortLoop: [
    { x: 450, y: 280 }, { x: 1120, y: 280 }, { x: 1120, y: 720 }, { x: 450, y: 720 }
  ]
};

const mountainRoutes = {
  ridge: [
    { x: 160, y: 820 }, { x: 430, y: 610 }, { x: 760, y: 520 }, { x: 1140, y: 420 }, { x: 1510, y: 190 }
  ],
  lowerTrail: [
    { x: 120, y: 830 }, { x: 360, y: 760 }, { x: 620, y: 680 }, { x: 850, y: 570 }, { x: 1120, y: 510 }
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
    displayName: '山間步道',
    subtitle: '路線判斷 · 山頂觀景台',
    duration: 180,
    world: { width: 1700, height: 1000 },
    start: { x: 145, y: 830 },
    maxNpcs: 8,
    event: { initialDelay: 2.1, spawnCooldown: 6.3, initialTolerance: 8.2, warningDuration: 2.8 },
    routes: mountainRoutes,
    npcTypes: ['hiker', 'trailRunner', 'photographer', 'elder', 'family'],
    zones: [
      { id: 'trailhead', label: '登山口', x: 40, y: 730, width: 290, height: 220, preference: 'mixed' },
      { id: 'forest', label: '森林步道', x: 270, y: 350, width: 480, height: 380, preference: 'itch' },
      { id: 'platform', label: '休息平台', x: 660, y: 400, width: 300, height: 220, preference: 'mixed' },
      { id: 'rock', label: '岩石坡', x: 920, y: 350, width: 380, height: 310, preference: 'sore' },
      { id: 'summit', label: '山頂觀景台', x: 1250, y: 55, width: 390, height: 280, preference: 'sore' }
    ],
    spawnPoints: [
      { x: 220, y: 835, zone: 'trailhead', route: 'lowerTrail' },
      { x: 370, y: 570, zone: 'forest' },
      { x: 560, y: 420, zone: 'forest', route: 'ridge' },
      { x: 780, y: 510, zone: 'platform' },
      { x: 1040, y: 535, zone: 'rock' },
      { x: 1250, y: 280, zone: 'rock', route: 'ridge' },
      { x: 1410, y: 175, zone: 'summit' },
      { x: 1510, y: 270, zone: 'summit' }
    ],
    obstacles: [
      { x: 340, y: 225, width: 205, height: 125, kind: 'cliff' },
      { x: 760, y: 690, width: 210, height: 130, kind: 'cliff' },
      { x: 1040, y: 690, width: 280, height: 140, kind: 'cliff' },
      { x: 1350, y: 365, width: 210, height: 135, kind: 'cliff' }
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

