import { CONDITIONS } from './constants.js';

export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.rescuedCount = 0;
    this.failedCount = 0;
    this.ppaSuccess = 0;
    this.napSuccess = 0;
    this.wrongItemCount = 0;
    this.responseTimes = [];
    this.fastestResponseTime = null;
    this.distanceTravelled = 0;
  }

  recordRescue(responseTime, condition, multiplier) {
    let bonus = 0;
    if (responseTime <= 3) bonus = 50;
    else if (responseTime <= 5) bonus = 30;
    else if (responseTime <= 8) bonus = 10;
    const raw = 100 + bonus;
    const points = Math.round(raw * multiplier);
    this.score += points;
    this.rescuedCount += 1;
    this.responseTimes.push(responseTime);
    this.fastestResponseTime = this.fastestResponseTime === null ? responseTime : Math.min(this.fastestResponseTime, responseTime);
    if (condition === CONDITIONS.ITCH) this.ppaSuccess += 1;
    if (condition === CONDITIONS.SORENESS) this.napSuccess += 1;
    return { points, bonus, raw };
  }

  recordFailure() {
    this.failedCount += 1;
  }

  recordWrongItem() {
    this.wrongItemCount += 1;
  }

  addDistance(distance) {
    this.distanceTravelled += distance;
  }

  getAverageResponseTime() {
    if (!this.responseTimes.length) return 0;
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  getGrade() {
    if (this.score >= 2600 || this.rescuedCount >= 18) return 'EXCELLENT';
    if (this.score >= 1200 || this.rescuedCount >= 9) return 'GREAT';
    return this.rescuedCount ? 'GOOD' : 'READY';
  }

  getResult() {
    return {
      score: this.score,
      rescuedCount: this.rescuedCount,
      failedCount: this.failedCount,
      ppaSuccess: this.ppaSuccess,
      napSuccess: this.napSuccess,
      wrongItemCount: this.wrongItemCount,
      averageResponseTime: this.getAverageResponseTime(),
      fastestResponseTime: this.fastestResponseTime || 0,
      maxCombo: 0,
      distanceTravelled: Math.round(this.distanceTravelled)
    };
  }
}

