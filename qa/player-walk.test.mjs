import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/game/Player.js';
import { PLAYER_SPRITE_MANIFESTS } from '../src/game/Game.js';

const manifest = PLAYER_SPRITE_MANIFESTS['./reference/runtime/jelly-anthropomorphic-player-walk-v12.png'];
const stage = { world: { width: 2000, height: 2000 }, obstacles: [] };
const input = (x, y) => ({ getMovementVector: () => ({ x, y }) });
function player() {
  const result = new Player(null);
  result.spriteSheet = manifest;
  result.speed = 256.25;
  return result;
}

test('diagonal steering retains facing axis until a deliberate turn', () => {
  const p = player();
  p.update(1 / 60, input(1, 0), stage);
  for (const x of [.69, .71, .68, .72]) {
    p.update(1 / 60, input(x, .71), stage);
    assert.equal(p.direction, 'right');
  }
  p.update(1 / 60, input(.3, -.9), stage);
  assert.equal(p.direction, 'up');
  p.update(1 / 60, input(-1, 0), stage);
  assert.equal(p.direction, 'left');
});

test('stopping or hitting a wall immediately settles the feet; restart uses neutral pose', () => {
  const p = player();
  p.update(.1, input(1, 0), stage);
  assert.equal(p.isMoving, true);
  assert.ok(p.walkPhase > 0);
  p.update(.016, input(0, 0), stage);
  assert.equal(p.isMoving, false);
  assert.equal(p.walkPhase, 0);
  p.x = stage.world.width - p.radius;
  p.update(.016, input(1, 0), stage);
  assert.equal(p.isMoving, false);
  assert.equal(p.walkPhase, 0);
});

test('gait follows distance consistently across frame rates without changing movement speed', () => {
  const a = player();
  const b = player();
  for (let n = 0; n < 30; n++) a.update(1 / 30, input(1, 0), stage);
  for (let n = 0; n < 120; n++) b.update(1 / 120, input(1, 0), stage);
  assert.ok(Math.abs(a.x - b.x) < 1e-8);
  assert.ok(Math.abs(a.walkPhase - b.walkPhase) < 1e-8);
  assert.ok(Math.abs(a.distanceTravelled - 256.25) < 1e-8);
  assert.ok(a.speed / manifest.strideDistance < 1.8);
});

test('legacy fallback frame registration keeps the crest in place', () => {
  const manifest = PLAYER_SPRITE_MANIFESTS['./reference/runtime/jelly-anthropomorphic-player-walk-v3.png'];
  const centers = { down: [240.9, 214.5, 181.5], left: [196.7, 199.5, 180.3], right: [249, 217.1, 203], up: [235.6, 210.4, 186.2] };
  for (const [direction, x] of Object.entries(centers)) {
    for (let frame = 0; frame < 3; frame++) {
      assert.ok(Math.abs(x[frame] + manifest.frameOffsets[direction][frame].x - x[1]) < .01);
    }
  }
});

test('both side directions render the four-cell cycle in the intended order', () => {
  const p = player();
  p.spriteImage = { complete: true, naturalWidth: 1680 };
  p.isMoving = true;
  const drawn = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'drawImage' ? (...args) => drawn.push(args) : () => {} });
  for (const direction of ['left', 'right']) {
    p.direction = direction;
    drawn.length = 0;
    for (let step = 0; step < 4; step++) {
      p.walkPhase = (step + .1) / 4;
      p.draw(ctx);
    }
    assert.deepEqual(drawn.map(args => args[1]), [420, 840, 1260, 0]);
    assert.ok(drawn.every(args => args[2] === manifest.directionRows[direction] * 400));
  }
});
