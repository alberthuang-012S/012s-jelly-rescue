const STORAGE_KEY = 'jellyRescue.personalBest.v1';
import { STAGE_ORDER } from './StageManager.js';
const STAGE_IDS = STAGE_ORDER.filter((id) => id !== 'tutorial');

const createEmptyRecords = () => Object.fromEntries(STAGE_IDS.map((id) => [id, null]));

const cloneRecords = (records) => Object.fromEntries(STAGE_IDS.map((id) => [id, records[id] ? { score: records[id].score } : null]));

function normalizeRecord(value) {
  const score = Number(value?.score);
  if (!Number.isFinite(score) || score < 0) return null;
  return { score: Math.round(score) };
}

export class PersonalBestStore {
  constructor({ storage = null } = {}) {
    this.storage = storage;
    this.memoryRecords = createEmptyRecords();
  }

  getStorage() {
    if (this.storage !== null) return this.storage;
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  load() {
    let raw = null;
    try {
      const storage = this.getStorage();
      if (!storage) return cloneRecords(this.memoryRecords);
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return cloneRecords(this.memoryRecords);
    }

    if (!raw) return cloneRecords(this.memoryRecords);

    try {
      const parsed = JSON.parse(raw);
      const records = Object.fromEntries(STAGE_IDS.map((id) => [id, normalizeRecord(parsed?.[id])]));
      this.memoryRecords = records;
      return cloneRecords(records);
    } catch {
      // A malformed record is safely reset. The next successful stage clear
      // can rebuild a valid v1 object without affecting gameplay.
      this.memoryRecords = createEmptyRecords();
      return cloneRecords(this.memoryRecords);
    }
  }

  save(records) {
    this.memoryRecords = cloneRecords(records);
    try {
      const storage = this.getStorage();
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(this.memoryRecords));
    } catch {
      // Session memory remains usable when storage is blocked or unavailable.
    }
  }

  get(stageId) {
    if (!STAGE_IDS.includes(stageId)) return null;
    return this.load()[stageId]?.score ?? null;
  }

  update(stageId, score) {
    if (!STAGE_IDS.includes(stageId) || !Number.isFinite(Number(score))) {
      return { previousBest: null, bestScore: null, isNewBest: false };
    }

    const records = this.load();
    const previousBest = records[stageId]?.score ?? null;
    const nextScore = Math.max(0, Math.round(Number(score)));
    const isNewBest = previousBest === null || nextScore > previousBest;
    if (isNewBest) {
      records[stageId] = { score: nextScore };
      this.save(records);
    }

    return {
      previousBest,
      bestScore: records[stageId]?.score ?? null,
      isNewBest
    };
  }
}

export { STORAGE_KEY as PERSONAL_BEST_STORAGE_KEY };
