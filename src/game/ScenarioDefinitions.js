import { CONDITIONS, ITEMS } from './constants.js';

const define = (condition, reaction, warning, help, critical, rescued = '好多了！') => Object.freeze({
  condition, reaction, reactionDuration: reaction === 'fall' ? 0.85 : 1.1,
  dialogue: Object.freeze({ WARNING: warning, HELP: help, CRITICAL: critical, RESCUED: rescued }),
  wrongItem: condition === CONDITIONS.ITCH ? '這個不太適合……' : '好像不是這個……'
});

export const SCENARIO_DEFS = Object.freeze({
  SKINCARE: define(CONDITIONS.ITCH, 'skin', '皮膚乾乾的，好癢！', '皮膚還是好癢……', '皮膚癢得受不了！', '不癢了，謝謝你！'),
  OUTDOOR_SKIN: define(CONDITIONS.ITCH, 'skin', '待在外面，皮膚好癢！', '皮膚還是好癢……', '皮膚癢得受不了！', '不癢了，謝謝你！'),
  GRASS_SKIN: define(CONDITIONS.ITCH, 'skin', '碰到草，皮膚好癢！', '皮膚還是好癢……', '皮膚癢得受不了！', '不癢了，謝謝你！'),
  FALL: define(CONDITIONS.SORENESS, 'fall', '跌倒了，膝蓋好痛！', '膝蓋還是好痛……', '膝蓋痛得受不了！', '膝蓋好多了，謝謝！'),
  SPORT_SORE: define(CONDITIONS.SORENESS, 'sore', '運動後，肌肉好痠！', '肌肉還是好痠……', '肌肉痠得受不了！', '肌肉舒服多了，謝謝！'),
  LONG_WALK: define(CONDITIONS.SORENESS, 'sore', '走久了，雙腿好痠！', '雙腿還是好痠……', '雙腿痠得受不了！', '雙腿舒服多了，謝謝！')
});

export function resolveScenario(type) {
  const definition = SCENARIO_DEFS[type];
  if (!definition) throw new RangeError(`Unknown scenario: ${type}`);
  return definition;
}

const ROLE_SORE_DIALOGUE = Object.freeze({
  runner: Object.freeze({ WARNING: '跑完，雙腿好痠！', HELP: '雙腿還是好痠……', CRITICAL: '雙腿痠得受不了！', RESCUED: '雙腿舒服多了，謝謝！' }),
  fitnessGuy: Object.freeze({ WARNING: '練完，肌肉好痠！' }),
  basketballPlayer: Object.freeze({ WARNING: '打完球，肌肉好痠！' }),
  sportsGirl: Object.freeze({ WARNING: '運動後，雙腿好痠！', HELP: '雙腿還是好痠……', CRITICAL: '雙腿痠得受不了！', RESCUED: '雙腿舒服多了，謝謝！' }),
  deliveryWorker: Object.freeze({ WARNING: '送貨跑久了，肌肉好痠！', HELP: '肌肉還是好痠……', CRITICAL: '肌肉痠得背不動！', RESCUED: '肌肉舒服多了，謝謝！' })
});

export function scenarioDialogue(role, type, state) {
  if (type === 'SPORT_SORE') return ROLE_SORE_DIALOGUE[role]?.[state] || SCENARIO_DEFS[type]?.dialogue[state];
  if (role === 'shopper' && type === 'LONG_WALK' && state === 'WARNING') return '逛久了，雙腿好痠！';
  return SCENARIO_DEFS[type]?.dialogue[state];
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
