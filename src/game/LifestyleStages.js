// Scenery, collision and movement share one portrait coordinate system.
const cityZones = [
  { id: 'entrance', label: '城市入口', x: 260, y: 880, width: 248, height: 245 },
  { id: 'cafe', label: '咖啡露台', x: 55, y: 580, width: 235, height: 280 },
  { id: 'shops', label: '花店・服飾店', x: 465, y: 450, width: 235, height: 400 },
  { id: 'plaza', label: '中央廣場', x: 250, y: 380, width: 265, height: 490 },
  { id: 'photo', label: '拍照花園', x: 200, y: 145, width: 370, height: 215 }
];
const sportsZones = [
  { id: 'entrance', label: '運動入口', x: 255, y: 910, width: 258, height: 210 },
  { id: 'court', label: '籃球場', x: 65, y: 610, width: 230, height: 260 },
  { id: 'skate', label: '滑板區', x: 465, y: 610, width: 235, height: 260 },
  { id: 'fitness', label: '健身區', x: 70, y: 270, width: 235, height: 255 },
  { id: 'grass', label: '休憩草地', x: 475, y: 235, width: 225, height: 300 },
  { id: 'track', label: '慢跑道', x: 285, y: 175, width: 200, height: 750 }
];
const routes = {
  mainTrail: [{ x: 384, y: 1040 }, { x: 384, y: 840 }, { x: 384, y: 600 }, { x: 384, y: 360 }, { x: 384, y: 180 }, { x: 384, y: 600 }],
  leftLoop: [{ x: 180, y: 790 }, { x: 180, y: 630 }, { x: 320, y: 575 }, { x: 320, y: 890 }],
  rightLoop: [{ x: 580, y: 790 }, { x: 580, y: 630 }, { x: 450, y: 575 }, { x: 450, y: 890 }],
  upperLoop: [{ x: 384, y: 180 }, { x: 280, y: 220 }, { x: 320, y: 540 }, { x: 450, y: 540 }, { x: 485, y: 220 }]
};
const cityLandmarks = [
  { kind: 'cafe', label: 'JELLY CAFÉ', x: 50, y: 440, width: 205, height: 120, color: '#a5d4ce', solid: true },
  { kind: 'flowerShop', label: '花日子', x: 520, y: 340, width: 195, height: 95, color: '#ebbad2', solid: true },
  { kind: 'clothes', label: '衣間', x: 520, y: 900, width: 195, height: 120, color: '#beb6e4', solid: true },
  { kind: 'flowers', label: '✦ PHOTO GARDEN', x: 90, y: 65, width: 588, height: 100, color: '#efd2b9', solid: false },
  { kind: 'table', x: 82, y: 665, width: 42, height: 38, color: '#d9b890', solid: true },
  { kind: 'table', x: 215, y: 770, width: 42, height: 38, color: '#d9b890', solid: true }
];
const sportsLandmarks = [
  { kind: 'court', label: '籃球場', x: 62, y: 590, width: 230, height: 295, color: '#b1dace', solid: false },
  { kind: 'skate', label: '滑板區', x: 477, y: 590, width: 230, height: 295, color: '#c5d0e9', solid: false },
  { kind: 'fitness', label: '戶外健身', x: 63, y: 275, width: 230, height: 260, color: '#eedcb5', solid: false },
  { kind: 'grass', label: '休憩草地', x: 490, y: 245, width: 215, height: 290, color: '#b8dbac', solid: false },
  { kind: 'bench', label: '休息區', x: 65, y: 950, width: 170, height: 35, color: '#d5b48c', solid: true },
  { kind: 'water', label: '飲水區', x: 535, y: 960, width: 130, height: 45, color: '#a7d7e1', solid: true },
  { kind: 'equipment', x: 100, y: 325, width: 40, height: 55, color: '#91aac7', solid: true },
  { kind: 'equipment', x: 238, y: 435, width: 32, height: 55, color: '#91aac7', solid: true }
];
const phase = (until, name, ppaRatio, tolerance, warningDuration, eventCooldown, maxSimultaneous, scenarioPool) =>
  ({ until, name, ppaRatio, tolerance, warningDuration, eventCooldown, maxSimultaneous, spawnCooldown: 5, scenarioPool });
const makeStage = (id, name, displayName, subtitle, npcTypes, zones, landmarks, phases, scenarioWeights, spawnPoints) => ({
  id, name, displayName, subtitle, timed: true, duration: 60,
  world: { width: 768, height: 1152 }, fitToScreen: true, cameraPadding: { top: 110, bottom: 145 },
  start: { x: 384, y: 1055 }, maxNpcs: 9, seedCount: npcTypes.length,
  event: { initialDelay: 2.4, spawnCooldown: 5, initialTolerance: 11, warningDuration: 3.6 },
  routes, npcTypes, zones, landmarks, phases,
  renderer: 'lifestyle', theme: id, scenarioPool: Object.keys(scenarioWeights), scenarioWeights,
  obstacles: landmarks.filter((landmark) => landmark.solid).map(({ x, y, width, height, kind }) => ({ x, y, width, height, kind })),
  spawnPoints
});

export const LIFESTYLE_STAGES = {
  city: makeStage('city', 'Jelly City Plaza', '城市生活廣場', '城市日常 · 皮膚照顧',
    ['youngWoman', 'shopper', 'cafeVisitor', 'photographerGirl', 'deliveryWorker'], cityZones, cityLandmarks,
    [phase(15, 'intro', .9, 11, 3.8, 5.6, 1, ['SKINCARE', 'OUTDOOR_SKIN']),
      phase(40, 'mixed', .56, 9.5, 3.4, 4.5, 1), phase(60, 'pressure', .55, 8.5, 3, 3.7, 2)],
    { SKINCARE: .65, OUTDOOR_SKIN: .35, LONG_WALK: .75, SPORT_SORE: .25 },
    [{ x: 350, y: 930, zone: 'entrance', route: 'mainTrail' }, { x: 580, y: 760, zone: 'shops', route: 'rightLoop' },
      { x: 175, y: 725, zone: 'cafe', route: 'leftLoop' }, { x: 380, y: 270, zone: 'photo', route: 'upperLoop' },
      { x: 415, y: 870, zone: 'plaza', route: 'mainTrail' }]),
  sports: makeStage('sports', 'Jelly Sports Park', '活力運動公園', '運動日常 · 反應救援',
    ['basketballPlayer', 'runner', 'skateboarder', 'fitnessGuy', 'sportsGirl', 'grassVisitor'], sportsZones, sportsLandmarks,
    [phase(15, 'intro', .3, 11, 3.7, 5.4, 1), phase(35, 'mixed', .3, 9.5, 3.3, 4.4, 2),
      phase(60, 'pressure', .3, 8.2, 2.9, 3.1, 2)],
    { FALL: .45, SPORT_SORE: .55, OUTDOOR_SKIN: .5, GRASS_SKIN: .5 },
    [{ x: 180, y: 785, zone: 'court', route: 'leftLoop' }, { x: 384, y: 930, zone: 'track', route: 'mainTrail' },
      { x: 580, y: 760, zone: 'skate', route: 'rightLoop' }, { x: 200, y: 405, zone: 'fitness', route: 'upperLoop' },
      { x: 445, y: 860, zone: 'track', route: 'mainTrail' }, { x: 590, y: 370, zone: 'grass', route: 'upperLoop' }])
};
