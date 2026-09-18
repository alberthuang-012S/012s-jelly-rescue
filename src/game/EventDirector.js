import { CONDITIONS, STATES } from './constants.js';
import { NPC } from './NPC.js';
import { choose } from './utils.js';

export class EventDirector {
  constructor(stage, callbacks = {}) {
    this.callbacks = callbacks;
    this.reset(stage);
  }

  reset(stage) {
    this.stage = stage;
    this.nextNpcId = 1;
    this.nextSpawnAt = 0.8;
    this.nextEventAt = stage.event.initialDelay;
    this.lastCondition = null;
  }

  seed(npcs) {
    const seedCount = this.stage.id === 'mountain' ? 5 : 5;
    for (let index = 0; index < seedCount; index += 1) this.spawn(npcs, index);
  }

  spawn(npcs, preferredIndex = null) {
    const pointIndex = preferredIndex === null ? Math.floor(Math.random() * this.stage.spawnPoints.length) : preferredIndex % this.stage.spawnPoints.length;
    const point = this.stage.spawnPoints[pointIndex];
    const role = this.stage.npcTypes[(this.nextNpcId - 1) % this.stage.npcTypes.length];
    const route = point.route ? this.stage.routes[point.route] : [];
    const npc = new NPC({
      id: `npc-${this.nextNpcId++}`,
      role,
      x: point.x,
      y: point.y,
      zone: point.zone,
      path: route
    });
    npc.onFailure = this.callbacks.onFailure;
    npc.onStateChange = this.callbacks.onStateChange;
    npcs.push(npc);
    this.callbacks.onSpawn?.(npc);
    return npc;
  }

  update(dt, stageTime, npcs) {
    const activeCount = npcs.filter((npc) => npc.active).length;
    if (stageTime < this.stage.duration && stageTime >= this.nextSpawnAt && activeCount < this.stage.maxNpcs) {
      this.spawn(npcs);
      this.nextSpawnAt = stageTime + this.getSpawnCooldown(stageTime);
    }
    if (stageTime >= this.nextEventAt && stageTime < this.stage.duration) {
      const triggered = this.triggerEvent(stageTime, npcs);
      this.nextEventAt = stageTime + (triggered ? this.getEventCooldown(stageTime) : 1.1);
    }
  }

  triggerEvent(stageTime, npcs, forcedCondition = null) {
    const events = npcs.filter((npc) => npc.active && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state));
    if (events.length >= this.getMaxSimultaneous(stageTime)) return false;
    const candidates = npcs.filter((npc) => npc.canReceiveEvent(stageTime));
    if (!candidates.length) return false;
    const npc = this.selectCandidate(candidates, stageTime);
    const condition = forcedCondition || this.pickCondition(npc, stageTime);
    npc.startEvent(condition, this.getTolerance(stageTime), this.getWarningDuration(stageTime), stageTime);
    this.lastCondition = condition;
    this.callbacks.onEvent?.(npc, condition);
    return true;
  }

  selectCandidate(candidates, stageTime) {
    const urgent = this.stage.id === 'mountain' && stageTime >= 40;
    if (urgent) {
      const farthest = [...candidates].sort((a, b) => b.x - a.x)[0];
      if (farthest && Math.random() < 0.45) return farthest;
    }
    return choose(candidates);
  }

  pickCondition(npc, stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return CONDITIONS.ITCH;
      if (stageTime < 24) return Math.random() < 0.68 ? CONDITIONS.SORENESS : CONDITIONS.ITCH;
      if (stageTime < 45) return Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
    }
    const zone = this.stage.zones.find((item) => item.id === npc.zone);
    if (zone?.preference === 'itch' && Math.random() < (stageTime >= 45 ? 0.62 : 0.74)) return CONDITIONS.ITCH;
    if (zone?.preference === 'sore' && Math.random() < (stageTime >= 45 ? 0.62 : 0.74)) return CONDITIONS.SORENESS;
    return Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
  }

  getTolerance(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 11;
      if (stageTime < 24) return 10.2;
      if (stageTime < 45) return 8.9;
      return 7.6;
    }
    if (stageTime < 15) return 9.8;
    if (stageTime < 40) return 8.8;
    return 7.5;
  }

  getWarningDuration(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 3.8;
      if (stageTime < 24) return 3.4;
      if (stageTime < 45) return 3;
      return 2.6;
    }
    if (stageTime < 15) return 3.6;
    if (stageTime < 40) return 3.1;
    return 2.6;
  }

  getMaxSimultaneous(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 24) return 1;
      if (stageTime < 45) return 2;
      return 3;
    }
    if (stageTime < 15) return 1;
    if (stageTime < 40) return 2;
    return 3;
  }

  getSpawnCooldown(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 6.2;
      if (stageTime < 24) return 5.5;
      if (stageTime < 45) return 4.8;
      return 4.1;
    }
    if (stageTime < 15) return 6;
    if (stageTime < 40) return 5;
    return 4.2;
  }

  getEventCooldown(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 5.6;
      if (stageTime < 24) return 4.9;
      if (stageTime < 45) return 4.1;
      return 3.3;
    }
    if (stageTime < 15) return 5.8;
    if (stageTime < 40) return 4.5;
    return 3.4;
  }
}
