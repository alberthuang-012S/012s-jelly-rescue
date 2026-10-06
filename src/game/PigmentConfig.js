export const PIGMENT_STAGE_ID = 'pigmentBloom';
export const PIGMENT_ENEMIES = Object.freeze({
  inkDrop: { hp: 2, radius: 21, speed: 67, points: 100, trigger: 100, warning: .75, dashSpeed: 170, dashTime: .32 },
  inkRoller: { hp: 2, radius: 24, speed: 60, points: 150, trigger: 240, warning: 1, dashSpeed: 245, dashTime: .7 },
  inkPlanter: { hp: 3, radius: 24, speed: 55, points: 200, interval: 3.6 }
});
export const PIGMENT_WAVES = Object.freeze([
  ['inkDrop', 'inkDrop', 'inkDrop'],
  ['inkDrop', 'inkDrop', 'inkRoller'],
  ['inkDrop', 'inkRoller', 'inkPlanter']
]);
export const PIGMENT_CONFIG = Object.freeze({
  hp: 18, radius: 55, speed: 42, range: 115, bossRange: 165,
  approach: 1.2, warning: 1, volleyGap: .65, phasePause: 1.1,
  coreTimes: [3, 3, 3.5], crystalWarning: 1.1, crystalRadius: 32,
  crystalLife: 8, maxCrystals: 3, maxProjectiles: 8, projectileSpeed: 96,
  shieldInterval: 3.2
});
