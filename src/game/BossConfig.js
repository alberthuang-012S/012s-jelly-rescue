export const SPECIAL_STAGE_ID = 'alienMosquito';
export const COMBAT_CONFIG = Object.freeze({ range: 115, cooldown: .52, invulnerability: 1.2,
  maxBubbles: 4, bubbleSpeed: 78, bubbleLife: 5, bubbleRadius: 15, waveDelay: 1.1,
  arrivalDelay: 1.4, arrivalDuration: 4.4, victoryDuration: 5.5 });
export const ENEMY_DEFS = Object.freeze({
  mosquitoScout: { hp: 2, speed: 74, radius: 20, points: 100, telegraph: .65, dashSpeed: 175, dashTime: .28, recover: 1.1, trigger: 90 },
  mosquitoCharger: { hp: 2, speed: 88, radius: 22, points: 150, telegraph: .75, dashSpeed: 300, dashTime: .55, recover: 1.3, trigger: 230 },
  mosquitoBubble: { hp: 3, speed: 62, radius: 23, points: 200, bubbleInterval: 2.8, preferredDistance: 210 }
});
export const WAVES = Object.freeze([
  ['mosquitoScout', 'mosquitoScout', 'mosquitoScout'],
  ['mosquitoScout', 'mosquitoScout', 'mosquitoCharger'],
  ['mosquitoScout', 'mosquitoScout', 'mosquitoCharger', 'mosquitoBubble']
]);
export const MOSQUITO_BOSS_CONFIG = Object.freeze({ hp: 18, radius: 55, speed: 82,
  dashSpeed: 340, dashTime: .62, telegraph: .95, chaseTime: 1.5, recover: .45,
  coreTimes: [2.3, 2, 2.3], phase3Speed: 1.15, phasePause: 1, hitPause: .065,
  hitPoints: 50, defeatPoints: 1500, clearBonus: 500, noDamageBonus: 500 });
