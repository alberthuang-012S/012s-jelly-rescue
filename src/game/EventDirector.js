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
    if (stageTime >= this.nextSpawnAt && activeCount < this.stage.maxNpcs) {
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
    npc.startEvent(condition, this.getTolerance(stageTime), this.getWarningDuration(stageTime));
    this.lastCondition = condition;
    this.callbacks.onEvent?.(npc, condition);
    return true;
  }

  selectCandidate(candidates, stageTime) {
    const urgent = this.stage.id === 'mountain' && stageTime > 90;
    if (urgent) {
      const farthest = [...candidates].sort((a, b) => b.x - a.x)[0];
      if (farthest && Math.random() < 0.45) return farthest;
    }
    return choose(candidates);
  }

  pickCondition(npc, stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 30) return CONDITIONS.ITCH;
      if (stageTime < 60) return CONDITIONS.SORENESS;
    }
    const zone = this.stage.zones.find((item) => item.id === npc.zone);
    if (zone?.preference === 'itch' && Math.random() < 0.74) return CONDITIONS.ITCH;
    if (zone?.preference === 'sore' && Math.random() < 0.74) return CONDITIONS.SORENESS;
    return Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
  }

  getTolerance(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 60) return 11.5;
      if (stageTime < 120) return 10;
      return 8.5;
    }
    if (stageTime < 60) return 9.5;
    if (stageTime < 120) return 8.4;
    return 7.2;
  }

  getWarningDuration(stageTime) {
    if (this.stage.id === 'park') return stageTime < 60 ? 3.4 : 3;
    return stageTime < 60 ? 3.1 : 2.6;
  }

  getMaxSimultaneous(stageTime) {
    if (this.stage.id === 'park') return stageTime < 120 ? 1 : 2;
    return stageTime < 45 ? 1 : stageTime < 105 ? 2 : 3;
  }

  getSpawnCooldown(stageTime) {
    const base = this.stage.event.spawnCooldown;
    return Math.max(3.2, base - Math.min(3.2, stageTime / 70));
  }

  getEventCooldown(stageTime) {
    const base = this.stage.id === 'mountain' ? 5.2 : 6.2;
    return Math.max(2.9, base - Math.min(3, stageTime / 70));
  }
}

