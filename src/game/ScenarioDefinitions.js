import { CONDITIONS, ITEMS } from './constants.js';

const define = (condition, reaction, warning, help, critical, rescued = '好多了！') => Object.freeze({
  condition, reaction, reactionDuration: reaction === 'fall' ? 0.85 : 1.1,
  dialogue: Object.freeze({ WARNING: warning, HELP: help, CRITICAL: critical, RESCUED: rescued }),
  wrongItem: condition === CONDITIONS.ITCH ? '這個不太適合……' : '好像不是這個……'
});

export const SCENARIO_DEFS = Object.freeze({
  SKINCARE: define(CONDITIONS.ITCH, 'skin', '好像該照顧一下皮膚……', '皮膚想保養一下～', '皮膚越來越不舒服了……', '舒服多了，謝謝！'),
  OUTDOOR_SKIN: define(CONDITIONS.ITCH, 'skin', '今天在外面待好久……', '皮膚有點不舒服……', '真的越來越難受了……'),
  GRASS_SKIN: define(CONDITIONS.ITCH, 'skin', '好像哪裡怪怪的……', '皮膚有點癢……', '真的好癢！'),
  FALL: define(CONDITIONS.SORENESS, 'fall', '啊！', '摔得有點痛……', '真的好痛……'),
  SPORT_SORE: define(CONDITIONS.SORENESS, 'sore', '好像有點不對勁……', '腿有點痠……', '越來越痠痛了……'),
  LONG_WALK: define(CONDITIONS.SORENESS, 'sore', '走好久了……', '腿開始痠了……', '走不太動了……')
});

export function resolveScenario(type) {
  const definition = SCENARIO_DEFS[type];
  if (!definition) throw new RangeError(`Unknown scenario: ${type}`);
  return definition;
}

export function requiredItem(condition) {
  return Object.values(ITEMS).find((item) => item.condition === condition)?.id || null;
}

export function weightedChoice(entries, random = Math.random) {
  const pool = entries.filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  if (!total) return null;
  let value = random() * total;
  for (const [key, weight] of pool) {
    value -= weight;
    if (value < 0) return key;
  }
  return pool.at(-1)[0];
}
