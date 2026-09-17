export class ComboManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.combo = 0;
    this.maxCombo = 0;
  }

  registerSuccess() {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    return this.combo;
  }

  break() {
    this.combo = 0;
  }

  getMultiplier() {
    if (this.combo >= 10) return 2;
    if (this.combo >= 5) return 1.5;
    if (this.combo >= 3) return 1.2;
    if (this.combo >= 2) return 1.1;
    return 1;
  }
}

