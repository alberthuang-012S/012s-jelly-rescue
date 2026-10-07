import { EventDirector } from './EventDirector.js?mountain-pavilion-dialogue-v2';
import { endlessSchedule, assignEndlessPatrol, ENDLESS_UNLOCK_AT } from './EndlessStage.js';
import { weightedChoice } from './ScenarioDefinitions.js';
import { STATES, CONDITIONS } from './constants.js';

const isRequest = npc => npc.active && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state);

export class EndlessDirector extends EventDirector {
  constructor(stage, callbacks) {
    super(stage, callbacks);
    this.stageTime = 0;
    this.fourItemsDispatched = false;
    this.pendingIntroductions = [];
  }

  spawn(npcs, preferredIndex = null) {
    const points = this.stage.spawnPoints;
    const residents = npcs.filter((npc) => npc.active && !npc.departing);
    const counts = Object.fromEntries(Object.keys(this.stage.routes).map((zone) => [zone, residents.filter((npc) => npc.zone === zone).length]));
    const minimum = Math.min(...Object.values(counts));
    const candidates = points.map((point, index) => ({ point, index }))
      .filter(({ point }) => counts[point.zone] === minimum);
    const preferred = preferredIndex === null ? null : candidates.find(({ index }) => index === preferredIndex % points.length);
    let chosen = preferred;
    if (!chosen) {
      for (const candidate of candidates) candidate.clearance = residents.length
        ? Math.min(...residents.map((npc) => Math.hypot(npc.x - candidate.point.x, npc.y - candidate.point.y))) : Infinity;
      const widest = Math.max(...candidates.map((candidate) => candidate.clearance));
      const pool = candidates.filter((candidate) => candidate.clearance === widest);
      chosen = pool[Math.floor(this.random() * pool.length)];
    }
    const npc = super.spawn(npcs, chosen.index);
    // Match the player's clearance so a reacting resident cannot drift into
    // the narrow band beside a planter that the rescue planner cannot enter.
    npc.radius = Math.max(25, npc.radius);
    assignEndlessPatrol(this.stage, npc, this.random() < .5);
    npc.departAt = (this.stageTime || 0) + 45 + this.random() * 30;
    return npc;
  }

  update(dt, stageTime, npcs) {
    this.stageTime = stageTime;
    // Remove inactive residents, keeping an arbitrarily long run bounded.
    for (let i = npcs.length - 1; i >= 0; i--) if (!npcs[i].active) npcs.splice(i, 1);
    for (const npc of npcs) {
      if (npc.state === STATES.NORMAL && !npc.departing && stageTime >= npc.departAt) {
        npc.departing = true;
        npc.path = [{ x: 384, y: npc.y }, { x: 384, y: 1010 }];
        npc.pathIndex = 0;
      }
    }
    if (stageTime >= ENDLESS_UNLOCK_AT && !this.fourItemsDispatched) {
      this.fourItemsDispatched = true;
      this.pendingIntroductions = [CONDITIONS.PIGMENTATION, CONDITIONS.SALLOWNESS];
      this.nextEventAt = Math.min(this.nextEventAt, stageTime + .4);
    }
    super.update(dt, stageTime, npcs);
  }

  triggerEvent(stageTime, npcs, forcedCondition = null) {
    const introduction = stageTime >= ENDLESS_UNLOCK_AT ? this.pendingIntroductions[0] : null;
    const triggered = super.triggerEvent(stageTime, npcs, forcedCondition || introduction || null);
    if (triggered && introduction && (!forcedCondition || forcedCondition === introduction)) this.pendingIntroductions.shift();
    return triggered;
  }

  pickScenario(candidates, stageTime, forcedCondition) {
    const selection = super.pickScenario(candidates, stageTime, forcedCondition);
    if (!selection || !this.callbacks.getPlayer?.()) return selection;
    const player = this.callbacks.getPlayer();
    // Keep product/scenario ratios while favoring nearby and adjacent regions.
    const npcId = weightedChoice(candidates.map(npc => [npc.id,
      this.getRoleScenarioWeight(npc, selection.scenarioType) / (1 + this.routeTime(player, npc) * .35)]), this.random);
    return { ...selection, npc: candidates.find(npc => npc.id === npcId) };
  }

  onRescue(stageTime, npcs) {
    if (npcs.filter(isRequest).length <= 1) {
      this.nextEventAt = Math.min(this.nextEventAt, stageTime + .8 + this.random() * .4);
    }
  }

  getTolerance(time) { return endlessSchedule(time).tolerance; }
  getWarningDuration(time) { return endlessSchedule(time).warning; }
  getMaxSimultaneous(time) { return endlessSchedule(time).maxSimultaneous; }
  getEventCooldown(time) { return endlessSchedule(time).interval; }
  getSpawnCooldown() { return 1.5; }

  isScheduleFeasible(candidate, events, tolerance, warningDuration) {
    const player = this.callbacks.getPlayer?.();
    if (!player) return true;
    const travel = this.routeTime(player, candidate);
    if (!Number.isFinite(travel)) return false;
    const requests = [...events.map((npc) => ({ npc,
      deadline: (npc.state === STATES.WARNING ? npc.warningTimer : 0) + npc.tolerance })),
    { npc: candidate, deadline: Math.max(tolerance + warningDuration, travel + 1.5) }];
    // Five requests have at most 120 visit orders. Calculate each travel leg
    // once rather than running collision pathfinding again for each permutation.
    const points = [player, ...requests.map(request => request.npc)];
    const legs = points.map((from, i) => points.map((to, j) => i === j ? 0 : this.routeTime(from, to)));
    const visit = (from, remaining, elapsed) => remaining.length === 0 || remaining.some((target, index) => {
      const arrival = elapsed + legs[from][target] + .75;
      return arrival <= requests[target - 1].deadline
        && visit(target, remaining.filter((_, i) => i !== index), arrival);
    });
    return visit(0, requests.map((_, index) => index + 1), 0);
  }
}
