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
  SORENESS: 'SORENESS'
});

export const ITEMS = Object.freeze({
  PPA: { id: 'PPA', label: 'PPA+1', condition: CONDITIONS.ITCH, color: '#b58cff', short: '癢' },
  NAP: { id: 'NAP', label: 'NAP+1', condition: CONDITIONS.SORENESS, color: '#77c8ff', short: '痠痛' }
});

export const CONDITION_LABELS = Object.freeze({
  [CONDITIONS.ITCH]: { warningTitle: '好像有點癢……', title: '好癢！', short: '癢', english: 'ITCH', icon: '✦', color: '#f3bd70' },
  [CONDITIONS.SORENESS]: { warningTitle: '好像有點痠痛……', title: '痠痛不太舒服……', short: '痠痛', english: 'SORE', icon: '↯', color: '#86c8ff' }
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
