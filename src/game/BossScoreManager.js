import { ENEMY_DEFS, MOSQUITO_BOSS_CONFIG as C } from './BossConfig.js';
export class BossScoreManager {
  constructor() { this.score = 0; this.defeatedEnemies = 0; this.damageTaken = 0; this.bossDamageTaken = 0; this.ppaHits = 0; this.bossHits = 0; this.cleared = false; }
  enemyHit(enemy) { this.ppaHits++; if (!enemy.alive) { this.defeatedEnemies++; this.score += ENEMY_DEFS[enemy.type].points; } }
  bossHit() { this.ppaHits++; this.bossHits++; this.score += C.hitPoints; }
  damage(inBoss) { this.damageTaken++; if (inBoss) this.bossDamageTaken++; }
  clear() { if (this.cleared) return; this.cleared = true; this.score += C.defeatPoints + C.clearBonus + (this.bossDamageTaken === 0 ? C.noDamageBonus : 0); }
  result(time) { return { ...this, clearTime: time }; }
}
