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

  getRescueRate() {
    const attempts = this.rescuedCount + this.failedCount;
    return attempts ? this.rescuedCount / attempts : 0;
  }

  getResponseSpeedScore() {
    const average = this.getAverageResponseTime();
    if (!this.responseTimes.length) return 0;
    if (average <= 3) return 100;
    if (average <= 5) return 100 - ((average - 3) / 2) * 18;
    if (average <= 8) return 82 - ((average - 5) / 3) * 22;
    return Math.max(0, 60 - (average - 8) * 8);
  }

  getToolAccuracy() {
    const operations = this.rescuedCount + this.wrongItemCount;
    return operations ? this.rescuedCount / operations : 1;
  }

  getComboScore(maxCombo = 0) {
    if (maxCombo <= 0) return 20;
    if (maxCombo === 1) return 32;
    if (maxCombo === 2) return 55;
    if (maxCombo === 3) return 68;
    if (maxCombo === 4) return 80;
    if (maxCombo === 5) return 89;
    return Math.min(100, 92 + (maxCombo - 6) * 2);
  }

  getPerformanceMetrics(maxCombo = 0) {
    const rescueRate = this.getRescueRate();
    const responseSpeed = this.getResponseSpeedScore();
    const toolAccuracy = this.getToolAccuracy();
    const comboScore = this.getComboScore(maxCombo);
    const performanceScore = (
      rescueRate * 40
      + responseSpeed * 0.25
      + toolAccuracy * 20
      + comboScore * 0.15
    );
    return {
      rescueRate,
      responseSpeed,
      toolAccuracy,
      comboScore,
      performanceScore: Math.round(performanceScore * 10) / 10
    };
  }

  getGrade(maxCombo = 0) {
    if (!this.rescuedCount) return 'READY';
    const { performanceScore } = this.getPerformanceMetrics(maxCombo);
    if (performanceScore >= 90) return 'EXCELLENT';
    if (performanceScore >= 75) return 'GREAT';
    if (performanceScore >= 55) return 'GOOD';
    return 'KEEP GOING';
  }

  getResult(maxCombo = 0) {
    const metrics = this.getPerformanceMetrics(maxCombo);
    return {
      score: this.score,
      rescuedCount: this.rescuedCount,
      failedCount: this.failedCount,
      ppaSuccess: this.ppaSuccess,
      napSuccess: this.napSuccess,
      wrongItemCount: this.wrongItemCount,
      averageResponseTime: this.getAverageResponseTime(),
      fastestResponseTime: this.fastestResponseTime || 0,
      maxCombo,
      ...metrics,
      distanceTravelled: Math.round(this.distanceTravelled)
    };
  }
}
