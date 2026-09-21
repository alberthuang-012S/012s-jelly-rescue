import { CONDITIONS, STATES } from './constants.js';
import { NPC } from './NPC.js?mountain-pavilion-dialogue-v2';
import { choose, distance } from './utils.js';

const ACTIVE_STATES = [STATES.WARNING, STATES.HELP, STATES.CRITICAL];

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
    const events = npcs.filter((npc) => npc.active && ACTIVE_STATES.includes(npc.state));
    if (events.length >= this.getMaxSimultaneous(stageTime)) return false;
    const candidates = npcs.filter((npc) => npc.canReceiveEvent(stageTime));
    if (!candidates.length) return false;
    const baseTolerance = this.getTolerance(stageTime);
    const warningDuration = this.getWarningDuration(stageTime);
    const reachableCandidates = this.getReachableCandidates(candidates, baseTolerance, warningDuration);
    const npc = this.selectCandidate(
      reachableCandidates.length ? reachableCandidates : candidates,
      stageTime,
      npcs
    );
    const condition = forcedCondition || this.pickCondition(npc, stageTime);
    const estimatedTravelTime = this.estimateTravelTime(npc);
    // Direct distance is intentionally only a fairness guard, not pathfinding.
    // If every candidate is far away, grant enough tolerance for a reasonable
    // run instead of creating an event that is impossible by construction.
    const safetyMargin = 1.5;
    const adjustedTolerance = Math.max(
      baseTolerance,
      estimatedTravelTime + safetyMargin - warningDuration
    );
    npc.startEvent(condition, adjustedTolerance, warningDuration, stageTime);
    this.lastCondition = condition;
    this.callbacks.onEvent?.(npc, condition);
    return true;
  }

  selectCandidate(candidates, stageTime, npcs = []) {
    if (candidates.length <= 1) return candidates[0];
    const activeEvents = npcs.filter((npc) => npc.active && ACTIVE_STATES.includes(npc.state));
    if (!activeEvents.length) return choose(candidates);

    const preferredSeparation = this.stage.id === 'mountain' ? 230 : 180;
    const separated = candidates.filter((candidate) => activeEvents.every((event) => (
      distance(candidate, event) >= preferredSeparation
    )));
    const pool = separated.length ? separated : candidates;
    const player = this.callbacks.getPlayer?.();
    const pressure = stageTime >= (this.stage.id === 'mountain' ? 40 : 45);
    const scored = pool.map((candidate) => {
      const nearestActiveDistance = Math.min(...activeEvents.map((event) => distance(candidate, event)));
      const playerDistance = player ? distance(player, candidate) : 0;
      const oppositeDirectionBonus = player && activeEvents.some((event) => {
        const activeX = event.x - player.x;
        const activeY = event.y - player.y;
        const candidateX = candidate.x - player.x;
        const candidateY = candidate.y - player.y;
        const activeHorizontal = Math.abs(activeX) > Math.abs(activeY);
        const candidateHorizontal = Math.abs(candidateX) > Math.abs(candidateY);
        return activeHorizontal === candidateHorizontal
          ? Math.sign(activeHorizontal ? activeX : activeY) !== Math.sign(candidateHorizontal ? candidateX : candidateY)
          : true;
      }) ? 120 : 0;
      return {
        candidate,
        score: nearestActiveDistance
          + oppositeDirectionBonus
          + (pressure ? nearestActiveDistance * 0.25 : 0)
          - playerDistance * 0.08
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].candidate;
  }

  estimateTravelTime(npc) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return 0;
    const rescueRange = 60;
    return Math.max(0, distance(player, npc) - rescueRange) / Math.max(1, player.speed || 205);
  }

  getReachableCandidates(candidates, tolerance, warningDuration) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return candidates;
    const availableTime = tolerance + warningDuration - 1.5;
    return candidates.filter((candidate) => this.estimateTravelTime(candidate) <= availableTime);
  }

  pickCondition(npc, stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return CONDITIONS.ITCH;
      if (stageTime < 20) return Math.random() < 0.58 ? CONDITIONS.SORENESS : CONDITIONS.ITCH;
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
      if (stageTime < 20) return 10.2;
      if (stageTime < 45) return 8.9;
      return 7.4;
    }
    if (stageTime < 15) return 10.4;
    if (stageTime < 40) return 9.4;
    return 8.1;
  }

  getWarningDuration(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 3.8;
      if (stageTime < 20) return 3.5;
      if (stageTime < 45) return 3;
      return 2.6;
    }
    if (stageTime < 15) return 4;
    if (stageTime < 40) return 3.5;
    return 3.1;
  }

  getMaxSimultaneous(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 20) return 1;
      if (stageTime < 45) return 2;
      return 2;
    }
    if (stageTime < 15) return 1;
    if (stageTime < 40) return 2;
    return 2;
  }

  getSpawnCooldown(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 6.2;
      if (stageTime < 20) return 5.3;
      if (stageTime < 45) return 4.8;
      return 3.8;
    }
    if (stageTime < 15) return 6;
    if (stageTime < 40) return 5;
    return 4;
  }

  getEventCooldown(stageTime) {
    if (this.stage.id === 'park') {
      if (stageTime < 12) return 5.6;
      if (stageTime < 20) return 4.7;
      if (stageTime < 45) return 4.1;
      return 3;
    }
    if (stageTime < 15) return 5.8;
    if (stageTime < 40) return 4.5;
    return 3.1;
  }
}
