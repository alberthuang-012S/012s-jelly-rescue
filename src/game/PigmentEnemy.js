import { PIGMENT_ENEMIES } from './PigmentConfig.js';
import { distance, normalize } from './utils.js';

export class PigmentEnemy {
  constructor(type, position, id) {
    Object.assign(this, position); this.id = id; this.type = type; this.def = PIGMENT_ENEMIES[type];
    this.hp = this.def.hp; this.radius = this.def.radius; this.state = 'SPAWN'; this.timer = .7;
    this.direction = { x: 0, y: 1 }; this.hitFlash = 0; this.plantTimer = 1.4;
  }
  get alive() { return this.hp > 0; }
  hit() { if (!this.alive) return false; this.hp--; this.hitFlash = .2; return true; }
  update(dt, player, navigation, ink) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    if (['SPAWN', 'RECOVER'].includes(this.state)) { if (this.timer <= 0) this.state = 'CHASE'; return; }
    if (this.state === 'TELEGRAPH') {
      if (this.timer <= 0) { this.state = 'DASH'; this.timer = this.def.dashTime; }
      return;
    }
    if (this.state === 'DASH') {
      const before = { x: this.x, y: this.y };
      navigation.move(this, this.direction, this.def.dashSpeed * dt);
      if (this.timer <= 0 || distance(this, before) < this.def.dashSpeed * dt * .5) {
        this.state = 'RECOVER'; this.timer = this.type === 'inkRoller' ? 1.7 : 1.1;
      }
      return;
    }
    const gap = distance(this, player);
    if (this.type === 'inkPlanter') {
      this.plantTimer -= dt;
      if (gap > 210) navigation.toward(this, player, this.def.speed * dt);
      else if (gap < 140) navigation.move(this, normalize(this.x - player.x, this.y - player.y), this.def.speed * dt);
      if (this.plantTimer <= 0 && ink.plant(player, false, this.id)) this.plantTimer = this.def.interval;
    } else if (gap < this.def.trigger && navigation.planner(0).isClear(this, player)) {
      this.direction = normalize(player.x - this.x, player.y - this.y);
      this.state = 'TELEGRAPH'; this.timer = this.def.warning;
    } else navigation.toward(this, player, this.def.speed * dt);
  }
}
