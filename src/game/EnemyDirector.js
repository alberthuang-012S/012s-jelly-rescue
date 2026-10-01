import { Enemy } from './Enemy.js';
import { ENEMY_DEFS, WAVES } from './BossConfig.js';

export class EnemyDirector {
  constructor(navigation) { this.navigation = navigation; this.enemies = []; this.serial = 0; this.pending = []; }
  clear() { this.enemies = []; this.pending = []; }
  wave(number, player) { this.clear(); this.pending = [...WAVES[number - 1]]; this.spawnPending(player); }
  summon(player) { this.pending.push('mosquitoScout', 'mosquitoScout'); this.spawnPending(player); }
  spawnPending(player) {
    while (this.pending.length && this.enemies.filter(e => e.alive).length < 4) {
      const type = this.pending[0];
      const point = this.navigation.findPosition(player, ENEMY_DEFS[type].radius, this.enemies.filter(e => e.alive));
      if (!point) break; // Retry next update, never silently skip a required wave.
      this.pending.shift(); this.enemies.push(new Enemy(type, point, ++this.serial));
    }
  }
  get cleared() { return !this.pending.length && this.enemies.every(e => !e.alive); }
  update(dt, player, fire) {
    this.enemies = this.enemies.filter(e => e.alive);
    this.spawnPending(player);
    for (const enemy of this.enemies) enemy.update(dt, player, this.navigation, fire);
  }
}
