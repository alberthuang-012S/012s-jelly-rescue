import { NPC_ROLE_DEFS } from './NPCRoleDefinitions.js';

export const VIEWPORT = { width: 960, height: 540 };

export const STATES = Object.freeze({
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  HELP: 'HELP',
  CRITICAL: 'CRITICAL',
  FAILED: 'FAILED',
  RESCUED: 'RESCUED'
});

export const CONDITIONS = Object.freeze({
  ITCH: 'ITCH',
  SORENESS: 'SORENESS',
  PIGMENTATION: 'PIGMENTATION',
  SALLOWNESS: 'SALLOWNESS'
});

export const ITEMS = Object.freeze({
  PPA: { id: 'PPA', label: 'PPA+1', condition: CONDITIONS.ITCH, color: '#b58cff', short: '癢' },
  NAP: { id: 'NAP', label: 'NAP+1', condition: CONDITIONS.SORENESS, color: '#77c8ff', short: '痠痛' },
  DDM: { id: 'DDM', label: 'DDM+1', condition: CONDITIONS.PIGMENTATION, color: '#9375c4', short: '黑色素' },
  SSW: { id: 'SSW', label: 'SSW+1', condition: CONDITIONS.SALLOWNESS, color: '#d7a23e', short: '蠟黃' }
});

export const CONDITION_LABELS = Object.freeze({
  [CONDITIONS.ITCH]: { warningTitle: '皮膚有點癢……', title: '皮膚還是好癢……', criticalTitle: '皮膚癢得受不了！', rescuedTitle: '不癢了，謝謝你！', short: '癢', english: 'ITCH', icon: '✦', color: '#b58cff' },
  [CONDITIONS.SORENESS]: { warningTitle: '雙腿有點痠……', title: '雙腿還是好痠……', criticalTitle: '雙腿痠得受不了！', rescuedTitle: '雙腿舒服多了，謝謝！', short: '痠痛', english: 'SORE', icon: '↯', color: '#77c8ff' },
  [CONDITIONS.PIGMENTATION]: { warningTitle: '想照顧黑色素困擾……', title: '黑色素，請幫幫我！', criticalTitle: '黑色素照顧，我快要走了！', rescuedTitle: '照顧完成，謝謝你！', short: '黑色素', english: 'PIGMENT', icon: '●', color: '#9375c4' },
  [CONDITIONS.SALLOWNESS]: { warningTitle: '皮膚看起來蠟黃……', title: '皮膚蠟黃，請幫幫我！', criticalTitle: '皮膚蠟黃，我快要走了！', rescuedTitle: '照顧完成，謝謝你！', short: '蠟黃', english: 'SALLOW', icon: '☀', color: '#d7a23e' }
});

export const ROLE_LABELS = Object.freeze(Object.fromEntries(Object.entries(NPC_ROLE_DEFS).map(([id, role]) => [id, role.label])));

export const PALETTE = Object.freeze({
  ink: '#14283d',
  deep: '#10253c',
  cream: '#f8f5ee',
  sky: '#b9e7f5',
  water: '#6ccbd5',
  grass: '#8bcfa5',
  leaf: '#4d9d7d',
  lavender: '#b9a2e8',
  coral: '#f29b83',
  yellow: '#f9cb70'
});
