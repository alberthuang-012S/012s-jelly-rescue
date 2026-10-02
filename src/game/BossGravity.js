import { GRAVITY_CONFIG as C } from './GravityConfig.js';
import { distance } from './utils.js';

export class BossGravity {
  constructor(position) {
    Object.assign(this, position); this.hp = C.hp; this.radius = C.radius; this.phase = 1;
    this.state = 'CHASE'; this.timer = C.approachTime; this.attackIndex = 0;
    this.summoned = false; this.summonPending = false; this.hitFlash = 0; this.zoneId = null;
  }
  get alive() { return this.hp > 0; }
  get coreOpen() { return this.alive && ['CORE_OPEN', 'FATIGUE'].includes(this.state); }
  enter(state, timer) { this.state = state; this.timer = timer; }
  hit() {
    if (!this.coreOpen) return false;
    this.hp = Math.max(0, this.hp - 2); this.hitFlash = .25;
    if (!this.hp) { this.enter('DEFEATED', 0); return true; }
    const phase = this.hp <= 6 ? 3 : this.hp <= 12 ? 2 : 1;
    if (phase !== this.phase) {
      this.phase = phase; this.attackIndex = 0; this.zoneId = null;
      this.summonPending = !this.summoned;
      this.enter('SUMMON', C.phasePause);
    }
    return true;
  }
  attack(player, ground) {
    const fan = this.phase === 3 && this.attackIndex === 0;
    const zone = ground.add({ x: fan ? this.x : player.x, y: fan ? this.y : player.y,
      shape: fan ? 'fan' : 'circle', radius: fan ? C.fanRadius : C.circleRadius,
      angle: Math.atan2(player.y - this.y, player.x - this.x), owner: 'boss',
      warning: C.telegraph, active: C.impactTime });
    if (!zone) return false; // Wait for a visible telegraph slot; never hit invisibly.
    this.zoneId = zone.id; this.enter('TELEGRAPH', C.telegraph); return true;
  }
  update(dt, player, navigation, ground, summon) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    if (this.state === 'SUMMON') {
      if (this.summonPending && !this.summoned) { summon(); this.summoned = true; this.summonPending = false; }
      if (this.timer <= 0) this.enter('CHASE', C.approachTime);
    } else if (this.state === 'CHASE') {
      if (distance(this, player) > C.approachDistance) navigation.toward(this, player, C.speed * (this.phase === 3 ? 1.15 : 1) * dt);
      if (this.timer <= 0) this.attack(player, ground);
    } else if (this.state === 'TELEGRAPH' && this.timer <= 0) this.enter('IMPACT', C.impactTime);
    else if (this.state === 'IMPACT' && this.timer <= 0) {
      this.attackIndex++;
      this.enter(this.attackIndex < (this.phase === 1 ? 1 : 2) ? 'COMBO_WAIT' : 'RECOVER',
        this.attackIndex < (this.phase === 1 ? 1 : 2) ? C.comboDelay * (this.phase === 3 ? .75 : 1) : C.recover);
    } else if (this.state === 'COMBO_WAIT' && this.timer <= 0) this.attack(player, ground);
    else if (this.state === 'RECOVER' && this.timer <= 0) this.enter(this.phase === 3 ? 'FATIGUE' : 'CORE_OPEN', C.coreTimes[this.phase - 1]);
    else if (this.coreOpen && this.timer <= 0) this.enter('CORE_CLOSE', .3);
    else if (this.state === 'CORE_CLOSE' && this.timer <= 0) { this.attackIndex = 0; this.enter('CHASE', C.approachTime / (this.phase === 3 ? 1.15 : 1)); }
  }
}
