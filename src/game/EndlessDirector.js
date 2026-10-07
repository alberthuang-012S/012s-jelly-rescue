import { EventDirector } from './EventDirector.js?mountain-pavilion-dialogue-v2';
import { endlessSchedule } from './EndlessStage.js';
import { STATES } from './constants.js';

export class EndlessDirector extends EventDirector {
  constructor(stage, callbacks) {
    super(stage, callbacks);
    this.stageTime = 0;
    this.fourItemsDispatched = false;
  }

  spawn(npcs, preferredIndex = null) {
    const npc = super.spawn(npcs, preferredIndex);
    // Match the player's clearance so a reacting resident cannot drift into
    // the narrow band beside a planter that the rescue planner cannot enter.
    npc.radius = Math.max(25, npc.radius);
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
    super.update(dt, stageTime, npcs);
    // A resident can receive a request immediately after the four-item unlock.
    if (stageTime >= 60 && !this.fourItemsDispatched) {
      this.fourItemsDispatched = true;
      this.nextEventAt = Math.min(this.nextEventAt, stageTime + .4);
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
    // At most four requests: enumerate complete visit orders (24 at most).
    // Checking pairs alone does not prove all four residents are rescuable.
    const visit = (from, remaining, elapsed) => remaining.length === 0 || remaining.some((request, index) => {
      const arrival = elapsed + this.routeTime(from, request.npc) + .75;
      return arrival <= request.deadline && visit(request.npc, remaining.filter((_, i) => i !== index), arrival);
    });
    return visit(player, requests, 0);
  }
}
