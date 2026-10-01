import { TravelPlanner } from './TravelPlanner.js';
import { distance, normalize, moveWithCollision, clamp } from './utils.js';

// Reuse the rescue visibility graph; combat owns its routing and cached paths.
export class CombatNavigation {
  constructor(stage) { this.stage = stage; this.planners = new Map(); }
  planner(radius) {
    if (!this.planners.has(radius)) this.planners.set(radius, new TravelPlanner(this.stage, radius));
    return this.planners.get(radius);
  }
  move(entity, vector, amount) {
    // Substeps prevent fast dashes tunnelling through narrow collision rectangles.
    const steps = Math.max(1, Math.ceil(amount / 8));
    for (let i = 0; i < steps; i++) Object.assign(entity,
      moveWithCollision(entity, entity.radius, vector, amount / steps, this.stage.world, this.stage.obstacles));
  }
  flyMove(entity, vector, amount) {
    const {width,height}=this.stage.world;
    entity.x=clamp(entity.x+vector.x*amount,entity.radius,width-entity.radius);
    entity.y=clamp(entity.y+vector.y*amount,entity.radius,height-entity.radius);
  }
  flyToward(entity, target, amount) {
    this.flyMove(entity,normalize(target.x-entity.x,target.y-entity.y),Math.min(amount,distance(entity,target)));
  }
  toward(entity, target, amount) {
    const planner = this.planner(entity.radius);
    if (!planner.canOccupy(target)) {
      target = this.findPosition(target, entity.radius, [], 35, 180, false);
      if (!target) return;
    }
    let destination = target;
    if (!planner.isClear(entity, target)) {
      const costs = planner.nodes.map(p => planner.isClear(p, target) ? distance(p, target) : Infinity);
      const visited = new Set();
      for (let step = 0; step < costs.length; step++) {
        let best = -1;
        costs.forEach((cost, i) => { if (!visited.has(i) && (best < 0 || cost < costs[best])) best = i; });
        if (best < 0 || !Number.isFinite(costs[best])) break;
        visited.add(best);
        for (const [neighbor, length] of planner.edges[best]) costs[neighbor] = Math.min(costs[neighbor], costs[best] + length);
      }
      let bestCost = Infinity; destination = null;
      planner.nodes.forEach((point, i) => {
        const cost = distance(entity, point) + costs[i];
        if (cost < bestCost && planner.isClear(entity, point)) { destination = point; bestCost = cost; }
      });
      if (!destination) return;
    }
    this.move(entity, normalize(destination.x - entity.x, destination.y - entity.y), Math.min(amount, distance(entity, destination)));
  }
  findPosition(player, radius, occupied = [], min = 180, max = 420, reachable = true) {
    const planner = this.planner(radius);
    const playerPlanner = this.planner(25);
    for (let ring = min; ring <= max; ring += 35) for (let i = 0; i < 24; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 12;
      const point = { x: player.x + Math.cos(angle) * ring, y: player.y + Math.sin(angle) * ring };
      if (planner.canOccupy(point) && occupied.every(e => distance(e, point) > radius + e.radius + 30)
        && (!reachable || Number.isFinite(playerPlanner.pathDistance(player, point)))) return point;
    }
    return null;
  }
}
