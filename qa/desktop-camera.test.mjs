import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { HUD } from '../src/game/HUD.js';
import { STAGE_DEFS, SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';

test('Desktop wide camera centers every map at both horizontal edges and clamps the vertical route', () => {
  const stages = [...Object.values(STAGE_DEFS), ...Object.values(SPECIAL_STAGE_DEFS)];
  for (const viewport of [{ width: 984, height: 550 }, { width: 1300, height: 728 }, { width: 1432, height: 802 }]) {
    for (const stage of stages) {
      for (const player of [{ x: 0, y: 0 }, { x: stage.world.width, y: stage.world.height }]) {
        const game = { viewport, player, cameraMode: 'follow', desktopWideView: true, cameraState: null };
        const camera = Game.prototype.getCamera.call(game, stage);
        const left = -camera.x * camera.scale;
        const right = (stage.world.width - camera.x) * camera.scale;
        assert.ok(Math.abs(left - (viewport.width - right)) < 1e-6);
        assert.ok(viewport.height / camera.scale / stage.world.height > .55);
        assert.equal(camera.y, player.y === 0 ? 0 : stage.world.height - viewport.height / camera.scale);
        const bounds = Game.prototype.getVisibleWorldBounds.call(game, stage, camera);
        assert.equal(bounds.left, 0); assert.equal(bounds.right, stage.world.width);
        const indicators = HUD.prototype.getIndicatorBounds.call({}, game);
        assert.ok(indicators.left > left && indicators.right < right);
      }
    }
  }
});

test('Wide desktop camera retains smooth vertical follow without horizontal drift', () => {
  const stage = STAGE_DEFS.city;
  const game = { viewport: { width: 1300, height: 728 }, player: { x: 384, y: 600 }, cameraMode: 'follow', desktopWideView: true, cameraState: null };
  const first = Game.prototype.getCamera.call(game, stage);
  game.player.y += 100;
  const next = Game.prototype.getCamera.call(game, stage);
  assert.ok(next.y > first.y && next.y < first.y + 100);
  assert.equal(next.x, first.x); assert.equal(next.scale, first.scale);
});
