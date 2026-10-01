export const CORE_COLLECTION_KEY = 'jellyRescue.coreCollection.v1';
export const CORE_CATALOG = Object.freeze([
  Object.freeze({id:'itchCore',stageId:'alienMosquito',name:'癢癢核心',
    description:'異星嗡嗡王留下的能量核心。經 PPA 淨化後，封存在圖鑑中。'})
]);

export class CoreCollectionStore {
  constructor(storage) {
    this.unlocked = new Set(); this.persisted = false;
    try {
      this.storage = storage === undefined ? globalThis.localStorage : storage;
      const saved = JSON.parse(this.storage?.getItem(CORE_COLLECTION_KEY) || 'null');
      if (saved?.version === 1 && Array.isArray(saved.unlocked)) {
        this.unlocked = new Set(saved.unlocked.filter(id => CORE_CATALOG.some(core => core.id === id)));
        this.persisted = true;
      }
    } catch { /* Collection remains usable for the current session. */ }
  }
  has(id) { return this.unlocked.has(id); }
  save() {
    try {
      if (!this.storage?.setItem) return this.persisted = false;
      this.storage.setItem(CORE_COLLECTION_KEY,JSON.stringify({version:1,unlocked:[...this.unlocked]}));
      return this.persisted = true;
    } catch { return this.persisted = false; }
  }
  awardClear(stageId, won) {
    const core = won && CORE_CATALOG.find(entry => entry.stageId === stageId);
    if (!core) return null;
    const newlyUnlocked = !this.has(core.id);
    this.unlocked.add(core.id);
    return {core,newlyUnlocked,persisted:this.save()};
  }
}
