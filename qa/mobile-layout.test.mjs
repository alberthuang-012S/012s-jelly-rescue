import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/Game.js';
import { STAGE_DEFS, SPECIAL_STAGE_DEFS } from '../src/game/StageManager.js';

test('City, Sports, Garden and Gravity share Park framing and the Mountain portrait map size', () => {
  for (const [width, height, cameraMode] of [[320, 568, 'fit'], [375, 667, 'fit'], [390, 844, 'fit'], [430, 932, 'fit'], [655, 369, 'follow'], [832, 378, 'follow']]) {
    for (const player of [{ x: 420, y: 640 }, { x: 100, y: 100 }, { x: 700, y: 1080 }]) {
      const cameraFor = stage => Game.prototype.getCamera.call({ viewport: { width, height }, cameraMode, player, cameraState: null }, stage);
      const reference = cameraFor(STAGE_DEFS.park);
      for (const stage of [STAGE_DEFS.city, STAGE_DEFS.sports, STAGE_DEFS.garden, SPECIAL_STAGE_DEFS.gravityOverload]) {
        assert.deepEqual(cameraFor(stage), reference, `${stage.id}/${width}x${height}`);
      }
      if (cameraMode === 'fit') {
        const mountain = cameraFor(STAGE_DEFS.mountain);
        assert.equal(mountain.x, reference.x);
        assert.equal(mountain.y, reference.y);
        assert.equal(STAGE_DEFS.mountain.world.width * mountain.scale, STAGE_DEFS.park.world.width * reference.scale);
        assert.equal(STAGE_DEFS.mountain.world.height * mountain.scale, STAGE_DEFS.park.world.height * reference.scale);
      }
    }
  }
});
