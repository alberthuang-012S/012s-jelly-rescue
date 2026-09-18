import { STATES } from './constants.js';
import { distance } from './utils.js';

const STATE_PRIORITY = Object.freeze({
  [STATES.CRITICAL]: 0,
  [STATES.HELP]: 1,
  [STATES.WARNING]: 2
});

export class InteractionSystem {
  constructor(radius = 82) {
    this.radius = radius;
    this.currentTarget = null;
  }

  findTarget(player, npcs) {
    const candidates = npcs
      .filter((npc) => npc.active && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(npc.state))
      .map((npc) => ({ npc, distance: distance(player, npc) }))
      .filter((item) => item.distance <= this.radius)
      .sort((a, b) => {
        const priorityDifference = STATE_PRIORITY[a.npc.state] - STATE_PRIORITY[b.npc.state];
        if (priorityDifference !== 0) return priorityDifference;
        return a.distance - b.distance;
      });
    this.currentTarget = candidates[0]?.npc || null;
    npcs.forEach((npc) => { npc.highlighted = npc === this.currentTarget; });
    return this.currentTarget;
  }

  getDistance(player, target) {
    return target ? distance(player, target) : null;
  }
}
