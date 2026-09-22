export const EVOLUTION_STORAGE_KEY = 'jellyRescue.evolution.v1';
export const EVOLVED_SPEED_MULTIPLIER = 1.25;

export class EvolutionStore {
  constructor(storage) {
    this.state = { capsule: false, evolved: false };
    try {
      this.storage = storage === undefined ? globalThis.localStorage : storage;
      const saved = JSON.parse(this.storage?.getItem(EVOLUTION_STORAGE_KEY) || 'null');
      this.state.evolved = saved?.evolved === true;
      this.state.capsule = !this.state.evolved && saved?.capsule === true;
    } catch { /* Keep session progress when storage is unavailable. */ }
  }

  save() {
    try { this.storage?.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify(this.state)); }
    catch { /* In-memory progress remains available. */ }
  }

  award(stageId, rescuedCount) {
    if (stageId !== 'mountain' || rescuedCount !== 2 || this.state.evolved || this.state.capsule) return false;
    this.state.capsule = true;
    this.save();
    return true;
  }

  consume() {
    if (!this.state.capsule || this.state.evolved) return false;
    this.state = { capsule: false, evolved: true };
    this.save();
    return true;
  }
}
