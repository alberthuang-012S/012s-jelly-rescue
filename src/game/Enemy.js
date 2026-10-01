import { ENEMY_DEFS } from './BossConfig.js';
import { distance, normalize } from './utils.js';

export class Enemy {
  constructor(type, position, id) {
    this.type = type; this.id = id; this.def = ENEMY_DEFS[type];
    Object.assign(this, position); this.hp = this.def.hp; this.radius = this.def.radius;
    this.state = 'SPAWN'; this.timer = .65; this.shotTimer = 1.8;
    this.direction = { x: 0, y: 1 }; this.hitFlash = 0;
  }
  get alive() { return this.hp > 0; }
  hit() { if (!this.alive) return false; this.hp--; this.hitFlash = .2; return true; }
  update(dt, player, navigation, fire) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    if (this.state === 'SPAWN' || this.state === 'RECOVER') {
      if (this.timer <= 0) this.state = 'CHASE';
      return;
    }
    if (this.state === 'TELEGRAPH') {
      if (this.timer <= 0) { this.state = 'DASH'; this.timer = this.def.dashTime; }
      return;
    }
    if (this.state === 'DASH') {
      navigation.move(this, this.direction, this.def.dashSpeed * dt);
      if (this.timer <= 0) { this.state = 'RECOVER'; this.timer = this.def.recover; }
      return;
    }
    const gap = distance(this, player);
    if (this.type === 'mosquitoBubble') {
      this.shotTimer -= dt;
      if (gap > this.def.preferredDistance + 30) navigation.toward(this, player, this.def.speed * dt);
      else if (gap < this.def.preferredDistance - 40) navigation.move(this, normalize(this.x - player.x, this.y - player.y), this.def.speed * dt);
      if (this.shotTimer <= 0) { fire(this, player); this.shotTimer = this.def.bubbleInterval; }
    } else if (gap < this.def.trigger && navigation.planner(this.radius).isClear(this, player)) {
      this.direction = normalize(player.x - this.x, player.y - this.y);
      this.state = 'TELEGRAPH'; this.timer = this.def.telegraph;
    } else navigation.toward(this, player, this.def.speed * dt);
  }
}
