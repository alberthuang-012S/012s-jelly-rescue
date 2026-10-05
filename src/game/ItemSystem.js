import { ITEMS } from './constants.js';

export class ItemSystem {
  constructor() {
    this.reset();
  }

  reset({ ppaOnly = false, lockedId = null, availableItems = ['PPA', 'NAP'] } = {}) {
    this.ppaOnly = ppaOnly;
    this.lockedId = ppaOnly ? 'PPA' : ITEMS[lockedId] ? lockedId : null;
    this.availableIds = this.lockedId ? [this.lockedId] : [...new Set(availableItems.filter((id) => ITEMS[id]))];
    if (!this.availableIds.length) this.availableIds = ['PPA', 'NAP'];
    this.selectedId = this.availableIds[0];
  }

  select(itemId) {
    if (this.availableIds.includes(itemId)) this.selectedId = itemId;
    return this.getSelected();
  }

  toggle() {
    if (this.lockedId) return this.select(this.lockedId);
    this.selectedId = this.availableIds[(this.availableIds.indexOf(this.selectedId) + 1) % this.availableIds.length];
    return this.getSelected();
  }

  getSelected() {
    return ITEMS[this.selectedId];
  }

  isCorrect(condition) {
    return this.getSelected().condition === condition;
  }
}
