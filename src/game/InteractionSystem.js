import { STATES } from './constants.js';
import { distance } from './utils.js';

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
      .sort((a, b) => a.distance - b.distance);
    this.currentTarget = candidates[0]?.npc || null;
    npcs.forEach((npc) => { npc.highlighted = npc === this.currentTarget; });
    return this.currentTarget;
  }

  getDistance(player, target) {
    return target ? distance(player, target) : null;
  }
}
