import { CONDITIONS, ITEMS } from './constants.js';

const define = (condition, reaction, warning, help, critical, rescued = '好多了！') => Object.freeze({
  condition, reaction, reactionDuration: reaction === 'fall' ? 0.85 : 1.1,
  dialogue: Object.freeze({ WARNING: warning, HELP: help, CRITICAL: critical, RESCUED: rescued }),
  wrongItem: condition === CONDITIONS.ITCH ? '這個不太適合……' : '好像不是這個……'
});

export const SCENARIO_DEFS = Object.freeze({
  SKINCARE: define(CONDITIONS.ITCH, 'skin', '皮膚乾癢，想保養一下！', '皮膚乾乾癢癢的……', '皮膚癢得受不了了！', '皮膚舒服多了，謝謝！'),
  OUTDOOR_SKIN: define(CONDITIONS.ITCH, 'skin', '在外面待久，皮膚好癢！', '皮膚一直癢，好不舒服……', '皮膚越來越癢了！', '皮膚舒服多了，謝謝！'),
  GRASS_SKIN: define(CONDITIONS.ITCH, 'skin', '碰到草，皮膚好癢！', '皮膚癢癢的，想抓……', '皮膚癢得受不了了！', '皮膚不癢了，謝謝！'),
  FALL: define(CONDITIONS.SORENESS, 'fall', '跌倒了，膝蓋好痛！', '摔到膝蓋，還在痛……', '膝蓋越來越痛了！', '膝蓋好多了，謝謝！'),
  SPORT_SORE: define(CONDITIONS.SORENESS, 'sore', '運動後，肌肉好痠！', '肌肉痠痛，想休息……', '肌肉痠得受不了了！', '肌肉沒那麼痠了，謝謝！'),
  LONG_WALK: define(CONDITIONS.SORENESS, 'sore', '走太久，雙腿好痠！', '雙腿痠痛，想休息……', '雙腿痠得走不動了！', '雙腿輕鬆多了，謝謝！')
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
