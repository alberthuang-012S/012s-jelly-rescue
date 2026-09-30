import { circleHitsRect, distance } from './utils.js';

// A small visibility graph follows the actual collision rectangles. It is
// cached per stage/radius; only the player and target connectors change.
export class TravelPlanner {
  constructor(stage, radius = 20) {
    this.stage = stage;
    this.radius = radius;
    const padding = radius + 2;
    this.nodes = (stage.obstacles || []).flatMap((rect) => [
      { x: rect.x - padding, y: rect.y - padding },
      { x: rect.x + rect.width + padding, y: rect.y - padding },
      { x: rect.x - padding, y: rect.y + rect.height + padding },
      { x: rect.x + rect.width + padding, y: rect.y + rect.height + padding }
    ]).filter((point) => this.canOccupy(point));
    this.edges = this.nodes.map(() => []);
    this.nodes.forEach((from, i) => this.nodes.forEach((to, j) => {
      if (j > i && this.isClear(from, to)) {
        const length = distance(from, to);
        this.edges[i].push([j, length]);
        this.edges[j].push([i, length]);
      }
    }));
  }

  canOccupy(point) {
    const { world, obstacles = [] } = this.stage;
    return point.x >= this.radius && point.y >= this.radius
      && point.x <= world.width - this.radius && point.y <= world.height - this.radius
      && !obstacles.some((rect) => circleHitsRect({ ...point, radius: this.radius }, rect));
  }

  isClear(from, to) {
    if (!this.canOccupy(from) || !this.canOccupy(to)) return false;
    // Exact segment intersection with radius-expanded rectangles. The square
    // expansion is deliberately conservative around rounded collision corners.
    return !(this.stage.obstacles || []).some((rect) => {
      let low = 0; let high = 1;
      for (const axis of ['x', 'y']) {
        const delta = to[axis] - from[axis];
        const min = rect[axis] - this.radius;
        const max = rect[axis] + rect[axis === 'x' ? 'width' : 'height'] + this.radius;
        if (Math.abs(delta) < 1e-9) {
          if (from[axis] < min || from[axis] > max) return false;
        } else {
          const a = (min - from[axis]) / delta; const b = (max - from[axis]) / delta;
          low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
          if (low > high) return false;
        }
      }
      return low <= high;
    });
  }

  pathDistance(from, to) {
    if (this.isClear(from, to)) return distance(from, to);
    if (!this.canOccupy(from) || !this.canOccupy(to)) return Infinity;
    const costs = this.nodes.map((point) => this.isClear(from, point) ? distance(from, point) : Infinity);
    const targetCosts = this.nodes.map((point) => this.isClear(point, to) ? distance(point, to) : Infinity);
    const visited = new Set();
    let best = Infinity;
    for (let step = 0; step < this.nodes.length; step += 1) {
      let index = -1;
      costs.forEach((cost, i) => { if (!visited.has(i) && (index < 0 || cost < costs[index])) index = i; });
      if (index < 0 || !Number.isFinite(costs[index]) || costs[index] >= best) break;
      visited.add(index);
      best = Math.min(best, costs[index] + targetCosts[index]);
      for (const [neighbor, length] of this.edges[index]) costs[neighbor] = Math.min(costs[neighbor], costs[index] + length);
    }
    return best;
  }
}
