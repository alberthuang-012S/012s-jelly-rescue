import { ITEMS } from './constants.js';

export class ItemSystem {
  constructor() {
    this.selectedId = 'PPA';
  }

  reset() {
    this.selectedId = 'PPA';
  }

  select(itemId) {
    if (ITEMS[itemId]) this.selectedId = itemId;
    return this.getSelected();
  }

  toggle() {
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
