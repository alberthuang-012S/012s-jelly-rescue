import { GRAVITY_CONFIG as C } from './GravityConfig.js';
import { distance, clamp } from './utils.js';

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}

// A warning and its damage footprint are the same immutable geometry.
export class GroundAttackSystem {
  constructor(navigation) { this.navigation = navigation; this.zones = []; this.serial = 0; }
  add({ x, y, radius = C.circleRadius, warning = C.telegraph, active = C.impactTime,
    shape = 'circle', angle = 0, halfAngle = C.fanHalfAngle, kind = 'slam', owner = null }) {
    if (this.zones.length >= C.maxZones || !this.navigation.planner(0).canOccupy({ x, y })) return null;
    const zone = { id: ++this.serial, x, y, radius, warning, active, shape, angle, halfAngle, kind, owner,
      age: 0, state: 'WARNING' };
    this.zones.push(zone); return zone;
  }
  clear() { this.zones = []; }
  removeOwner(owner) { this.zones = this.zones.filter(z => z.owner !== owner); }
  clearCrystals(player, range) {
    const before = this.zones.length;
    this.zones = this.zones.filter(z => z.kind !== 'crystal' || distance(z, player) > range
      || !this.navigation.planner(0).isClear(player, z));
    return before - this.zones.length;
  }
  contains(zone, player) {
    if (distance(zone, player) > zone.radius + player.radius) return false;
    if (zone.shape === 'circle') return true;
    const relative = Math.atan2(player.y - zone.y, player.x - zone.x) - zone.angle;
    const angle = Math.atan2(Math.sin(relative), Math.cos(relative));
    if (Math.abs(angle) <= zone.halfAngle) return true;
    return [-1, 1].some(side => distanceToSegment(player, zone, {
      x: zone.x + Math.cos(zone.angle + side * zone.halfAngle) * zone.radius,
      y: zone.y + Math.sin(zone.angle + side * zone.halfAngle) * zone.radius
    }) <= player.radius);
  }
  update(dt, player, damage) {
    for (const zone of this.zones) {
      zone.age += dt;
      zone.state = zone.age >= zone.warning ? 'ACTIVE' : 'WARNING';
      if (zone.state === 'ACTIVE' && zone.age < zone.warning + zone.active && this.contains(zone, player)
        && this.navigation.planner(0).isClear(zone, player)) damage();
    }
    this.zones = this.zones.filter(z => z.age < z.warning + z.active);
  }
}
