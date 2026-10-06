import { PIGMENT_CONFIG as C } from './PigmentConfig.js';
import { distance } from './utils.js';

export class BossPigment {
  constructor(position) {
    Object.assign(this, position); this.hp = C.hp; this.radius = C.radius; this.phase = 1;
    this.state = 'CHASE'; this.timer = C.approach; this.hitFlash = 0;
    this.aim = 0; this.volley = 0; this.shieldCreated = 0;
  }
  get alive() { return this.hp > 0; }
  get coreOpen() { return this.alive && ['CORE_OPEN', 'FATIGUE'].includes(this.state); }
  get shotOffsets() {
    return this.state === 'SHIELD_WARN' ? [-.35, 0, .35]
      : this.phase === 3 ? [-.8, -.45, .45, .8] : this.phase === 2 ? [-.12, 0, .12] : [-.38, 0, .38];
  }
  enter(state, timer) { this.state = state; this.timer = timer; }
  hit() {
    if (!this.coreOpen) return false;
    this.hp = Math.max(0, this.hp - 2); this.hitFlash = .25;
    if (!this.hp) { this.enter('DEFEATED', 0); return true; }
    const phase = this.hp <= 6 ? 3 : this.hp <= 12 ? 2 : 1;
    if (phase !== this.phase) { this.phase = phase; this.enter('SUMMON', C.phasePause); }
    return true;
  }
  warn(player, state = 'TELEGRAPH') {
    this.aim = Math.atan2(player.y - this.y, player.x - this.x);
    this.enter(state, C.warning);
  }
  checkShield(ink) {
    // Count creations, not current crystals: broken shields cannot regrow this cycle.
    if (['SHIELD', 'SHIELD_WARN'].includes(this.state) && ink.shields() === 0) {
      this.enter(this.phase === 3 ? 'FATIGUE' : 'CORE_OPEN', C.coreTimes[this.phase - 1]);
    }
  }
  update(dt, player, navigation, ink) {
    if (!this.alive) return;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.timer -= dt;
    if (this.state === 'SUMMON') {
      if (this.timer <= 0) { this.volley = 0; this.enter('CHASE', C.approach); }
    } else if (this.state === 'CHASE') {
      if (distance(this, player) > 260) navigation.toward(this, player, C.speed * dt);
      if (this.timer <= 0) this.warn(player);
    } else if (this.state === 'TELEGRAPH' && this.timer <= 0) {
      ink.fire(this, this.aim, this.shotOffsets);
      this.volley++;
      if (this.phase === 3 && this.volley < 2) this.enter('VOLLEY_WAIT', C.volleyGap);
      else { ink.clear(); this.shieldCreated = 0; this.enter('SHIELD_BUILD', 0); }
    } else if (this.state === 'VOLLEY_WAIT' && this.timer <= 0) this.warn(player);
    else if (this.state === 'SHIELD_BUILD') {
      const count = this.phase === 1 ? 1 : 2;
      if (this.shieldCreated < count && ink.plant(this, true, 'boss')) this.shieldCreated++;
      if (this.shieldCreated === count) this.enter('SHIELD', C.shieldInterval);
    } else if (['SHIELD', 'SHIELD_WARN'].includes(this.state)) {
      this.checkShield(ink);
      if (this.state === 'SHIELD' && this.timer <= 0) this.warn(player, 'SHIELD_WARN');
      else if (this.state === 'SHIELD_WARN' && this.timer <= 0) {
        ink.fire(this, this.aim, this.shotOffsets); this.enter('SHIELD', C.shieldInterval);
      }
    } else if (this.coreOpen && this.timer <= 0) this.enter('CORE_CLOSE', .4);
    else if (this.state === 'CORE_CLOSE' && this.timer <= 0) { this.volley = 0; this.enter('CHASE', C.approach); }
  }
}
