import { BossCombatSystem } from './BossCombatSystem.js';
import { BossScoreManager } from './BossScoreManager.js';
import { BossGravity } from './BossGravity.js';
import { GravityEnemy } from './GravityEnemy.js';
import { GroundAttackSystem } from './GroundAttackSystem.js';
import { GRAVITY_ENEMIES, GRAVITY_WAVES, GRAVITY_CONFIG as C } from './GravityConfig.js';

export class GravityScoreManager extends BossScoreManager {
  constructor() { super(); this.napHits = 0; this.crystalsCleared = 0; }
  enemyHit(enemy) {
    this.napHits++;
    if (!enemy.alive) { this.defeatedEnemies++; this.score += GRAVITY_ENEMIES[enemy.type].points; }
  }
  bossHit() { this.napHits++; this.bossHits++; this.score += 50; }
}

// Reuse encounter lifecycle, lives, cooldown and pause semantics. Ground attacks,
// creatures and victory presentation are independent of the mosquito encounter.
export class GravityCombatSystem extends BossCombatSystem {
  constructor(stage, player) {
    super(stage, player, { enemyOptions: { definitions: GRAVITY_ENEMIES, waves: GRAVITY_WAVES,
      EnemyClass: GravityEnemy, summonType: 'gravityStiff' }, ScoreClass: GravityScoreManager,
      BossClass: BossGravity, bossIgnoresCover: false });
    this.ground = new GroundAttackSystem(this.navigation); this.attackContext = this.ground;
  }
  tryAction() {
    const phase = this.boss?.phase;
    const used = super.tryAction();
    if (used) {
      this.score.crystalsCleared += this.ground.clearCrystals(this.player, C.range);
      this.ground.zones = this.ground.zones.filter(z => z.owner === 'boss'
        || this.director.enemies.some(e => e.id === z.owner && e.alive));
      if (phase !== this.boss?.phase) this.ground.clear();
    }
    return used;
  }
  damage(infiniteLife = false) {
    const hit = super.damage(infiniteLife);
    if (this.state === 'GAMEOVER') this.ground.clear();
    return hit;
  }
  startArrival() { const started = super.startArrival(); if (started) this.ground.clear(); return started; }
  victory() { super.victory(); this.ground.clear(); }
  // This stage has its own result; the mosquito's collection remains untouched.
  dropCore() { this.state = 'CLEAR'; }
  update(dt, options = {}) {
    const frozen = this.frozen;
    if (options.paused) return;
    // Existing warning geometry advances before new enemy/Boss warnings are born,
    // so every telegraph gets its full advertised duration.
    if (!frozen && ['WAVE', 'BOSS'].includes(this.state)) {
      this.ground.update(Math.max(0, Math.min(.05, dt)), this.player, () => this.damage(options.infiniteLife));
    }
    super.update(dt, options);
    if (!['WAVE', 'BOSS'].includes(this.state)) this.ground.clear();
  }
  debug(action) { super.debug(action); this.ground.clear(); }
}
