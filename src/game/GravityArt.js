// Atlas order and foot anchors are recorded in gravity-art-registration-v1.json.
export const GRAVITY_ART = Object.freeze({
  gravityStiff: 'stiff', gravityStomper: 'stomper', gravityHeavy: 'heavy'
});

export function gravityEnemyFrame(entity, time, moving = true) {
  if (entity.hp <= 0 || entity.state === 'DEFEATED') return 5;
  if (entity.hitFlash > 0) return 4;
  const state = entity.artState || entity.state;
  if (state === 'TELEGRAPH') return 2;
  if (['DASH', 'IMPACT', 'DROP'].includes(state) || state === 'RECOVER' && entity.type === 'gravityStomper') return 3;
  if (state === 'CHASE' && moving) return Math.floor(time * 7) % 2;
  return 0;
}

export function gravityBossFrame(entity, light = false) {
  if (light || entity.state === 'DEFEATED') return 8;
  if (entity.hitFlash > 0) return 7;
  if (entity.coreOpen) return entity.state === 'FATIGUE' ? 6 : 5;
  if (entity.state === 'IMPACT') return 4;
  if (entity.state === 'TELEGRAPH') {
    if (entity.phase === 1 || entity.phase === 3 && entity.attackIndex === 0) return 1;
    return entity.attackIndex % 2 ? 3 : 2;
  }
  return 0;
}

// Opening anchors, in pixels within each 384px Boss cell.
export const GRAVITY_CORE_ANCHORS = Object.freeze({
  5: Object.freeze({ x: 223, y: 273, angle: -.4 }),
  6: Object.freeze({ x: 223, y: 284, angle: -.22 }),
  7: Object.freeze({ x: 244, y: 263, angle: -.7 })
});
