import { STATES } from './constants.js';

export class NPCStateMachine {
  constructor(npc) {
    this.npc = npc;
  }

  update(dt, stageTime) {
    const npc = this.npc;
    if (!npc.active) return;
    if (npc.state === STATES.WARNING) {
      npc.warningTimer = Math.max(0, npc.warningTimer - dt);
      if (npc.warningTimer <= 0) {
        npc.enterHelp(stageTime);
        npc.onStateChange?.(npc, STATES.HELP);
      }
      return;
    }
    if (npc.state === STATES.HELP || npc.state === STATES.CRITICAL) {
      npc.tolerance = Math.max(0, npc.tolerance - dt);
      npc.conditionTimer = npc.tolerance;
      if (npc.state === STATES.HELP && npc.tolerance <= npc.maxTolerance * 0.3) {
        npc.state = STATES.CRITICAL;
        npc.onStateChange?.(npc, STATES.CRITICAL);
      }
      if (npc.tolerance <= 0) {
        npc.fail();
        npc.onFailure?.(npc);
      }
      return;
    }
    if (npc.state === STATES.RESCUED) {
      npc.rescueTimer = Math.max(0, npc.rescueTimer - dt);
      if (npc.rescueTimer <= 0) npc.finishRescue(stageTime);
    }
  }
}

