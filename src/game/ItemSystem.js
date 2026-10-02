import { ITEMS } from './constants.js';

export class ItemSystem {
  constructor() {
    this.selectedId = 'PPA';
  }

  reset({ ppaOnly = false, lockedId = null } = {}) {
    this.ppaOnly = ppaOnly;
    this.lockedId = ppaOnly ? 'PPA' : ITEMS[lockedId] ? lockedId : null;
    this.selectedId = this.lockedId || 'PPA';
  }

  select(itemId) {
    if (ITEMS[itemId] && (!this.lockedId || itemId === this.lockedId)) this.selectedId = itemId;
    return this.getSelected();
  }

  toggle() {
    if (this.lockedId) return this.select(this.lockedId);
    this.selectedId = this.selectedId === 'PPA' ? 'NAP' : 'PPA';
    return this.getSelected();
  }

  getSelected() {
    return ITEMS[this.selectedId];
  }

  isCorrect(condition) {
    return this.getSelected().condition === condition;
  }
}
