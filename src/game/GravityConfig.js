export const GRAVITY_STAGE_ID = 'gravityOverload';
export const GRAVITY_ENEMIES = Object.freeze({
  gravityStiff: { hp: 2, radius: 22, speed: 72, points: 100, trigger: 95, telegraph: .7, pushSpeed: 165, pushTime: .3, recover: 1.2 },
  gravityStomper: { hp: 3, radius: 24, speed: 63, points: 150, trigger: 175, telegraph: .95, attackRadius: 85, recover: 1.5 },
  gravityHeavy: { hp: 3, radius: 25, speed: 58, points: 200, preferredDistance: 205, interval: 3.2 }
});

export function gravityDevicePosition(stage) {
  return { x: stage.world.width / 2, y: stage.world.height / 2 };
}
export const GRAVITY_WAVES = Object.freeze([
  ['gravityStiff', 'gravityStiff', 'gravityStiff'],
  ['gravityStiff', 'gravityStiff', 'gravityStomper'],
  ['gravityStiff', 'gravityStomper', 'gravityHeavy']
]);
export const GRAVITY_CONFIG = Object.freeze({
  hp: 18, radius: 55, speed: 68, approachTime: 1.3, approachDistance: 150,
  telegraph: 1.05, circleRadius: 90, fanRadius: 180, fanHalfAngle: Math.PI / 3,
  impactTime: .22, recover: .4, phasePause: 1.1, comboDelay: .35,
  coreTimes: [2.3, 2.2, 2.5], maxZones: 2,
  crystalRadius: 64, crystalWarning: 1.25, crystalActive: 1.25,
  victoryDuration: 5.5, range: 115, bossRange: 165, cooldown: .52, invulnerability: 1.2
});
