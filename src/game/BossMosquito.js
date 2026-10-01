import { MOSQUITO_BOSS_CONFIG as C } from './BossConfig.js';
import { normalize } from './utils.js';

export class BossMosquito {
  constructor(position) {
    Object.assign(this, position); this.radius = C.radius; this.hp = C.hp; this.phase = 1;
    this.state = 'CHASE'; this.timer = C.chaseTime; this.direction = { x: 0, y: 1 };
    this.summoned = false; this.summonPending = false; this.secondDash = false; this.hitFlash = 0;
  }
  get alive() { return this.hp > 0; }
  get coreOpen() { return this.alive && ['CORE_OPEN', 'FATIGUE'].includes(this.state); }
  enter(state, timer) { this.state = state; this.timer = timer; }
  hit() {
    if (!this.coreOpen) return false;
    this.hp = Math.max(0, this.hp - 2); this.hitFlash = .25;
    if (!this.hp) { this.enter('DEFEATED', 0); return true; }
    const next = this.hp <= 6 ? 3 : this.hp <= 12 ? 2 : 1;
    if (next !== this.phase) {
      this.phase = next; this.secondDash = false;
      if (!this.summoned) this.summonPending = true;
      this.enter('SUMMON', C.phasePause);
    }
    return true;
  }
  telegraph(player) {
    this.direction = normalize(player.x - this.x, player.y - this.y);
    this.enter('TELEGRAPH', C.telegraph / (this.phase === 3 ? C.phase3Speed : 1));
  }
  update(dt, player, navigation, fire, summon) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    const multiplier = this.phase === 3 ? C.phase3Speed : 1;
    if (this.state === 'CHASE') {
      navigation.flyToward(this, player, C.speed * multiplier * dt);
      if (this.timer <= 0) this.telegraph(player);
    } else if (this.state === 'SUMMON') {
      if (this.summonPending && !this.summoned) { summon(); this.summoned = true; this.summonPending = false; }
      if (this.timer <= 0) {
        if (this.phase === 2) this.enter('BUBBLE', .65); else this.telegraph(player);
      }
    } else if (this.state === 'TELEGRAPH' && this.timer <= 0) this.enter('DASH', C.dashTime);
    else if (this.state === 'DASH') {
      navigation.flyMove(this, this.direction, C.dashSpeed * multiplier * dt);
      if (this.timer <= 0) {
        if (this.phase === 3 && !this.secondDash) this.enter('BUBBLE', .65);
        else this.enter('RECOVER', C.recover);
      }
    } else if (this.state === 'BUBBLE' && this.timer <= 0) {
      fire(this, player, 2); this.secondDash = this.phase === 3; this.telegraph(player);
    } else if (this.state === 'RECOVER' && this.timer <= 0) this.enter(this.phase === 3 ? 'FATIGUE' : 'CORE_OPEN', C.coreTimes[this.phase - 1]);
    else if (this.coreOpen && this.timer <= 0) this.enter('CORE_CLOSE', .3);
    else if (this.state === 'CORE_CLOSE' && this.timer <= 0) {
      this.secondDash = false;
      this.enter(this.phase === 2 ? 'BUBBLE' : 'CHASE', this.phase === 2 ? .65 : C.chaseTime / multiplier);
    }
  }
}
