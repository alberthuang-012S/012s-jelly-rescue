import { COMBAT_CONFIG as C, MOSQUITO_BOSS_CONFIG as B } from './BossConfig.js';
import { CombatNavigation } from './CombatNavigation.js';
import { EnemyDirector } from './EnemyDirector.js';
import { BossMosquito } from './BossMosquito.js';
import { BossScoreManager } from './BossScoreManager.js';
import { distance } from './utils.js';

export class BossCombatSystem {
  constructor(stage, player) {
    this.stage = stage; this.player = player; this.navigation = new CombatNavigation(stage);
    this.director = new EnemyDirector(this.navigation); this.score = new BossScoreManager();
    this.boss = null; this.coreDrop = null; this.projectiles = []; this.pulses = []; this.wave = 1;
    this.state = 'WAVE'; this.timer = 0; this.elapsed = 0; this.visualTime = 0;
    this.cooldown = 0; this.invulnerability = 0; this.lives = 3; this.hitPause = 0;
    this.blockedTime = 0; this.director.wave(1, player);
  }
  get frozen() { return ['ARRIVAL', 'VICTORY', 'CLEAR', 'GAMEOVER'].includes(this.state) || this.hitPause > 0; }
  get targets() { return [...this.director.enemies.filter(e => e.alive), ...(this.state === 'BOSS' && this.boss?.alive ? [this.boss] : [])]; }
  findTarget() {
    return this.targets.filter(e => distance(e, this.player) <= C.range
      && (e === this.boss || this.navigation.planner(0).isClear(this.player, e)))
      .sort((a, b) => distance(a, this.player) - distance(b, this.player))[0] || null;
  }
  fire = (source, target, count = 1) => {
    if (!['WAVE', 'BOSS'].includes(this.state)) return;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    for (let i = 0; i < count && this.projectiles.length < C.maxBubbles; i++) {
      const direction = angle + (count === 2 ? (i ? .17 : -.17) : 0);
      this.projectiles.push({ x: source.x, y: source.y, vx: Math.cos(direction) * C.bubbleSpeed,
        vy: Math.sin(direction) * C.bubbleSpeed, radius: C.bubbleRadius, life: C.bubbleLife });
    }
  };
  tryAction() {
    if (this.frozen || this.state === 'COLLECT' || this.cooldown > 0) return false;
    this.cooldown = C.cooldown;
    const target = this.findTarget();
    this.pulses.push({ x: this.player.x, y: this.player.y, life: .35, strong: Boolean(target) });
    this.projectiles = this.projectiles.filter(p => distance(p, this.player) > C.range
      || !this.navigation.planner(0).isClear(this.player, p));
    // Damage resolves once at dispatch; the rendered ripple never runs hit logic.
    if (!target) return true;
    if (target === this.boss) {
      if (target.hit()) {
        this.score.bossHit(); this.hitPause = B.hitPause;
        if (!target.alive) this.victory();
      } else this.blockedTime = .45;
    } else if (target.hit()) this.score.enemyHit(target);
    return true;
  }
  damage(infiniteLife = false) {
    if (this.frozen || this.invulnerability > 0 || !['WAVE', 'BOSS'].includes(this.state)) return false;
    this.invulnerability = C.invulnerability;
    if (!infiniteLife) { this.lives--; this.score.damage(this.state === 'BOSS'); }
    if (this.lives <= 0) { this.state = 'GAMEOVER'; this.projectiles = []; }
    return true;
  }
  startArrival() {
    const point = this.navigation.findPosition(this.player, B.radius, [], 240, 800);
    if (!point) return false;
    this.director.clear(); this.projectiles = []; this.boss = new BossMosquito(point);
    this.state = 'ARRIVAL'; this.timer = C.arrivalDuration; return true;
  }
  victory() {
    if (['VICTORY', 'COLLECT', 'CLEAR'].includes(this.state)) return;
    this.state = 'VICTORY'; this.timer = C.victoryDuration; this.clearTime = this.elapsed;
    this.projectiles = []; this.director.clear(); this.hitPause = 0; this.score.clear();
  }
  dropCore() {
    const point = this.navigation.findGroundDrop(this.boss, this.player, C.corePickupRadius);
    this.coreDrop = { id: 'itchCore', ...point, radius: C.corePickupRadius, collected: false,
      playerStart: { x: this.player.x, y: this.player.y } };
    this.state = 'COLLECT';
  }
  update(dt, { paused = false, infiniteLife = false } = {}) {
    if (paused || ['CLEAR', 'GAMEOVER'].includes(this.state)) return;
    dt = Math.max(0, Math.min(.05, dt));
    this.visualTime += dt;
    if (!['VICTORY', 'COLLECT'].includes(this.state)) this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerability = Math.max(0, this.invulnerability - dt);
    this.blockedTime = Math.max(0, this.blockedTime - dt);
    this.pulses.forEach(p => p.life -= dt); this.pulses = this.pulses.filter(p => p.life > 0);
    if (this.hitPause > 0) { this.hitPause = Math.max(0, this.hitPause - dt); return; }
    if (this.state === 'COLLECT') {
      if (this.coreDrop && !this.coreDrop.collected
        && distance(this.player, this.coreDrop.playerStart) > 1
        && distance(this.player, this.coreDrop) <= this.player.radius + this.coreDrop.radius
        && this.navigation.planner(0).isClear(this.player, this.coreDrop)) {
        this.coreDrop.collected = true; this.state = 'CLEAR';
      }
      return;
    }
    if (['ARRIVAL', 'VICTORY', 'WAVE_CLEAR'].includes(this.state)) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'ARRIVAL') this.state = 'BOSS';
        else if (this.state === 'VICTORY') this.dropCore();
        else if (this.wave < 3) { this.wave++; this.state = 'WAVE'; this.director.wave(this.wave, this.player); }
        else this.startArrival();
      }
      return;
    }
    this.director.update(dt, this.player, this.fire);
    if (this.state === 'BOSS') this.boss.update(dt, this.player, this.navigation, this.fire, () => this.director.summon(this.player));
    for (const p of this.projectiles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!this.navigation.planner(p.radius).canOccupy(p)) p.life = 0;
      if (p.life > 0 && distance(p, this.player) < p.radius + this.player.radius) { this.damage(infiniteLife); p.life = 0; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    for (const enemy of this.director.enemies) {
      if (enemy.alive && !['SPAWN', 'RECOVER'].includes(enemy.state) && distance(enemy, this.player) < enemy.radius + this.player.radius) {
        this.damage(infiniteLife); enemy.state = 'RECOVER'; enemy.timer = 1.1;
      }
    }
    if (this.state === 'BOSS' && this.boss.alive && distance(this.boss, this.player) < this.boss.radius + this.player.radius) this.damage(infiniteLife);
    if (this.state === 'WAVE' && this.director.cleared) {
      this.state = 'WAVE_CLEAR'; this.timer = this.wave === 3 ? C.arrivalDelay : C.waveDelay; this.projectiles = [];
    }
  }
  debug(action) {
    if (action.startsWith('wave')) {
      this.wave = Number(action.at(-1)); this.state = 'WAVE'; this.boss = null; this.coreDrop = null;
      this.projectiles = []; this.director.wave(this.wave, this.player);
    } else if (action === 'spawn') this.startArrival();
    else if (action === 'clear') this.director.clear();
    else if (this.boss?.alive) {
      if (action === 'core') this.boss.enter('CORE_OPEN', 2.3);
      if (action === 'hit') { this.boss.enter('CORE_OPEN', 2.3); if (this.boss.hit() && !this.boss.alive) this.victory(); }
      if (action === 'phase2' || action === 'phase3') {
        this.state = 'BOSS'; this.boss.hp = action === 'phase2' ? 14 : 8;
        this.boss.enter('CORE_OPEN', 2.3); this.boss.hit();
      }
    }
  }
}
