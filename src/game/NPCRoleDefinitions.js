const role = (label, movement, speed, shirt, hair, accent, spriteVariant, scenarioWeights = {}, accessory = null) =>
  Object.freeze({ label, movement, speed, shirt, hair, accent, radius: 20, spriteVariant, scenarioWeights: Object.freeze(scenarioWeights), accessory });

export const NPC_ROLE_DEFS = Object.freeze({
  jogger: role('慢跑者', 'runner', 78, '#f47c8d', '#24324a', '#ffd687', 0),
  picnic: role('野餐遊客', 'sit', 14, '#f47ca4', '#5d3e70', '#ffd687', 1),
  elder: { ...role('長椅居民', 'sit', 8, '#8272db', '#e8e5d7', '#f3c997', 1), radius: 19 },
  visitor: { ...role('公園遊客', 'wander', 32, '#ffd687', '#503e4a', '#96c981', 2), radius: 19 },
  dogWalker: { ...role('遛狗路人', 'patrol', 58, '#72d6ff', '#24324a', '#f3c997', 0), radius: 21 },
  hiker: role('登山客', 'patrol', 35, '#f3a66b', '#24324a', '#75d2dc', 0),
  trailRunner: role('跑山者', 'runner', 82, '#f47c8d', '#24324a', '#ffd687', 0),
  photographer: { ...role('攝影遊客', 'wander', 24, '#bca9f4', '#24324a', '#75d2dc', 2), radius: 19 },
  family: role('親子遊客', 'wander', 25, '#78c98a', '#754b4d', '#ffd687', 2),
  youngWoman: role('年輕女性', 'wander', 32, '#c9b3ed', '#554265', '#ffdabd', null, { SKINCARE: .55, OUTDOOR_SKIN: .3, LONG_WALK: .15 }, 'ribbon'),
  shopper: role('逛街者', 'wander', 34, '#edb98b', '#544256', '#ffdabd', null, { SKINCARE: .6, LONG_WALK: .4 }, 'bags'),
  cafeVisitor: role('咖啡店遊客', 'wander', 22, '#8bcbc2', '#594638', '#ffdabd', null, { SKINCARE: .6, OUTDOOR_SKIN: .4 }, 'cup'),
  photographerGirl: role('拍照遊客', 'wander', 28, '#e6a5c6', '#544256', '#ffdabd', null, { SKINCARE: .6, LONG_WALK: .4 }, 'camera'),
  deliveryWorker: role('外送員', 'patrol', 58, '#78bdd9', '#24324a', '#ffdabd', null, { SPORT_SORE: .35, LONG_WALK: .65 }, 'delivery'),
  basketballPlayer: role('籃球員', 'runner', 76, '#f3b779', '#24324a', '#e6b58d', null, { FALL: .55, SPORT_SORE: .45 }, 'ball'),
  runner: role('跑者', 'runner', 82, '#89cbbd', '#554265', '#ffdabd', null, { SPORT_SORE: .6, OUTDOOR_SKIN: .15, FALL: .25 }, 'headband'),
  skateboarder: role('滑板玩家', 'runner', 68, '#b1ace5', '#544256', '#ffdabd', null, { FALL: 1 }, 'board'),
  fitnessGuy: role('健身者', 'patrol', 42, '#87b7dd', '#24324a', '#e6b58d', null, { SPORT_SORE: 1 }, 'weights'),
  sportsGirl: role('運動女孩', 'runner', 72, '#e9a8c0', '#554265', '#ffdabd', null, { SPORT_SORE: .7, OUTDOOR_SKIN: .3 }, 'headband'),
  grassVisitor: role('草地遊客', 'wander', 20, '#e5cf89', '#594638', '#ffdabd', null, { GRASS_SKIN: 1 }, 'hat')
});
