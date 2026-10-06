import { BossCombatSystem } from './BossCombatSystem.js';
import { BossScoreManager } from './BossScoreManager.js';
import { BossPigment } from './BossPigment.js';
import { PigmentEnemy } from './PigmentEnemy.js';
import { COMBAT_CONFIG, MOSQUITO_BOSS_CONFIG } from './BossConfig.js';
import { PIGMENT_CONFIG as C, PIGMENT_ENEMIES, PIGMENT_WAVES } from './PigmentConfig.js';
import { distance } from './utils.js';

class InkCrystal {
  constructor(point, id, shield, owner) {
    Object.assign(this, point); this.id = id; this.type = 'inkCrystal'; this.radius = C.crystalRadius;
    this.shield = shield; this.owner = owner; this.age = 0; this.hp = 1;
  }
  get alive() { return this.hp > 0; }
  get active() { return this.age >= C.crystalWarning; }
  hit() { if (!this.alive) return false; this.hp = 0; return true; }
}
export class PigmentScoreManager extends BossScoreManager {
  constructor() { super(); this.ddmHits = 0; this.crystalsCleared = 0; }
  enemyHit(enemy) {
    this.ddmHits++;
    if (!enemy.alive) { this.defeatedEnemies++; this.score += PIGMENT_ENEMIES[enemy.type].points; }
  }
  bossHit() { this.ddmHits++; this.bossHits++; this.score += MOSQUITO_BOSS_CONFIG.hitPoints; }
}

export class PigmentCombatSystem extends BossCombatSystem {
  constructor(stage, player) {
    super(stage, player, { enemyOptions: { definitions: PIGMENT_ENEMIES, waves: PIGMENT_WAVES,
      EnemyClass: PigmentEnemy, summonType: 'inkDrop' }, ScoreClass: PigmentScoreManager,
      BossClass: BossPigment, bossIgnoresCover: false });
    this.crystals = []; this.crystalSerial = 0; this.petals = [];
    this.attackContext = {
      plant: (anchor, shield, owner) => this.plantCrystal(anchor, shield, owner),
      fire: (source, angle, offsets) => this.fireInk(source, angle, offsets),
      shields: () => this.crystals.filter(c => c.alive && c.shield).length,
      clear: () => { this.crystals = []; }
    };
  }
  plantCrystal(anchor, shield = false, owner = null) {
    if (this.crystals.filter(c => c.alive).length >= C.maxCrystals) return null;
    const planner = this.navigation.planner(25);
    // Non-solid hazards preserve every walking route; every center is reachable.
    for (let ring = shield ? 130 : 100; ring <= 340; ring += 35) for (let i = 0; i < 24; i++) {
      const angle = -Math.PI / 2 + (i + this.crystalSerial * 5) * Math.PI / 12;
      const point = { x: anchor.x + Math.cos(angle) * ring, y: anchor.y + Math.sin(angle) * ring };
      // Keep shield targets out of the tall Queen artwork's footprint.
      if (shield && Math.abs(point.x - anchor.x) < 105 && point.y < anchor.y + 95) continue;
      if (distance(point, this.player) < 95 || !planner.canOccupy(point)
        || !Number.isFinite(planner.pathDistance(this.player, point))
        || this.crystals.some(c => c.alive && distance(c, point) < 100)
        || this.boss?.alive && distance(point, this.boss) < 120) continue;
      const crystal = new InkCrystal(point, ++this.crystalSerial, shield, owner);
      this.crystals.push(crystal); return crystal;
    }
    return null;
  }
  fireInk(source, angle, offsets) {
    if (!['WAVE', 'BOSS'].includes(this.state)) return;
    for (const offset of offsets) {
      if (this.projectiles.length >= C.maxProjectiles) break;
      const a = angle + offset;
      this.projectiles.push({ x: source.x, y: source.y, vx: Math.cos(a) * C.projectileSpeed,
        vy: Math.sin(a) * C.projectileSpeed, radius: 13, life: 5 });
    }
  }
  findTarget() {
    const eligible = [...this.targets, ...this.crystals.filter(c => c.alive)].filter(e =>
      distance(e, this.player) <= (e === this.boss || e.type === 'inkCrystal' ? C.bossRange : C.range)
      && this.navigation.planner(0).isClear(this.player, e));
    // A closed shell must not steal pulses from a nearby crystal or creature.
    const actionable = eligible.filter(e => e !== this.boss || e.coreOpen);
    return (actionable.length ? actionable : eligible).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || null;
  }
  tryAction() {
    if (this.frozen || this.state === 'COLLECT' || this.cooldown > 0) return false;
    this.cooldown = COMBAT_CONFIG.cooldown;
    const target = this.findTarget(), phase = this.boss?.phase;
    this.pulses.push({ x: this.player.x, y: this.player.y, life: .35, radius: C.bossRange, strong: Boolean(target) });
    this.projectiles = this.projectiles.filter(p => distance(p, this.player) > C.bossRange || !this.navigation.planner(0).isClear(this.player, p));
    if (!target) return true;
    if (target.type === 'inkCrystal' && target.hit()) {
      this.score.ddmHits++; this.score.crystalsCleared++;
      this.petals.push({ x: target.x, y: target.y, life: 1.4 });
      this.crystals = this.crystals.filter(c => c.alive);
      this.boss?.checkShield(this.attackContext);
    } else if (target === this.boss) {
      if (target.hit()) {
        this.score.bossHit(); this.hitPause = MOSQUITO_BOSS_CONFIG.hitPause;
        if (phase !== target.phase) { this.crystals = []; this.projectiles = []; }
        if (!target.alive) this.victory();
      } else this.blockedTime = .45;
    } else if (target.hit()) {
      this.score.enemyHit(target);
      if (!target.alive) this.crystals = this.crystals.filter(c => c.owner !== target.id || c.shield);
    }
    return true;
  }
  startArrival() { const started = super.startArrival(); if (started) this.crystals = []; return started; }
  damage(infiniteLife = false) { const hit = super.damage(infiniteLife); if (this.state === 'GAMEOVER') this.crystals = []; return hit; }
  victory() { super.victory(); this.crystals = []; }
  dropCore() { super.dropCore(); this.coreDrop.id = 'pigmentCore'; }
  update(dt, options = {}) {
    if (options.paused) return;
    dt = Math.max(0, Math.min(.05, dt));
    if (!this.frozen && ['WAVE', 'BOSS'].includes(this.state)) {
      for (const c of this.crystals) {
        c.age += dt;
        if (c.alive && c.active && distance(c, this.player) < c.radius + this.player.radius
          && this.navigation.planner(0).isClear(c, this.player)) this.damage(options.infiniteLife);
      }
      this.crystals = this.crystals.filter(c => c.alive && (c.shield || c.age < C.crystalLife));
    }
    super.update(dt, options);
    if (!['WAVE', 'BOSS'].includes(this.state)) this.crystals = [];
    if (!this.frozen) { this.petals.forEach(p => p.life -= dt); this.petals = this.petals.filter(p => p.life > 0); }
  }
  debug(action) {
    super.debug(action); this.crystals = []; this.petals = [];
    if (this.boss && ['core', 'hit'].includes(action)) this.projectiles = [];
  }
}
