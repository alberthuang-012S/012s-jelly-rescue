import { GRAVITY_ENEMIES, GRAVITY_CONFIG as C } from './GravityConfig.js';
import { distance, normalize } from './utils.js';

export class GravityEnemy {
  constructor(type, position, id) {
    Object.assign(this, position); this.type = type; this.id = id; this.def = GRAVITY_ENEMIES[type];
    this.hp = this.def.hp; this.radius = this.def.radius; this.state = 'SPAWN'; this.timer = .7;
    this.attackTimer = 1.6; this.direction = { x: 0, y: 1 }; this.hitFlash = 0;
  }
  get alive() { return this.hp > 0; }
  hit() { if (!this.alive) return false; this.hp--; this.hitFlash = .2; return true; }
  update(dt, player, navigation, ground) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    if (['SPAWN', 'RECOVER'].includes(this.state)) { if (this.timer <= 0) this.state = 'CHASE'; return; }
    if (this.state === 'TELEGRAPH') {
      if (this.timer <= 0) {
        this.state = this.type === 'gravityStiff' ? 'DASH' : 'RECOVER';
        this.timer = this.type === 'gravityStiff' ? this.def.pushTime : this.def.recover;
      }
      return;
    }
    if (this.state === 'DASH') {
      navigation.move(this, this.direction, this.def.pushSpeed * dt);
      if (this.timer <= 0) { this.state = 'RECOVER'; this.timer = this.def.recover; }
      return;
    }
    const gap = distance(this, player);
    if (this.type === 'gravityHeavy') {
      this.attackTimer -= dt;
      if (gap > this.def.preferredDistance + 30) navigation.toward(this, player, this.def.speed * dt);
      if (gap < this.def.preferredDistance - 40) navigation.move(this, normalize(this.x - player.x, this.y - player.y), this.def.speed * dt);
      if (this.attackTimer <= 0 && ground.add({ x: player.x, y: player.y, radius: C.crystalRadius,
        warning: C.crystalWarning, active: C.crystalActive, kind: 'crystal', owner: this.id })) this.attackTimer = this.def.interval;
    } else if (gap <= this.def.trigger && navigation.planner(0).isClear(this, player)) {
      if (this.type === 'gravityStomper' && !ground.add({ x: player.x, y: player.y,
        radius: this.def.attackRadius, warning: this.def.telegraph, owner: this.id })) return;
      this.direction = normalize(player.x - this.x, player.y - this.y);
      this.state = 'TELEGRAPH'; this.timer = this.def.telegraph;
    } else navigation.toward(this, player, this.def.speed * dt);
  }
}
