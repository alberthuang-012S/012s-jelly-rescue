import { ITEMS } from './constants.js';

export class ItemSystem {
  constructor() {
    this.selectedId = 'PPA';
  }

  reset({ ppaOnly = false } = {}) {
    this.ppaOnly = ppaOnly;
    this.selectedId = 'PPA';
  }

  select(itemId) {
    if (ITEMS[itemId] && (!this.ppaOnly || itemId === 'PPA')) this.selectedId = itemId;
    return this.getSelected();
  }

  toggle() {
    if (this.ppaOnly) return this.select('PPA');
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
