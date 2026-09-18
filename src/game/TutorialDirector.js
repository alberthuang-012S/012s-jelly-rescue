import { CONDITIONS } from './constants.js';
import { NPC } from './NPC.js';

const STEPS = Object.freeze({
  MOVE: 'move',
  FIRST_RESCUE: 'first-rescue',
  SECOND_RESCUE: 'second-rescue',
  COMPLETE: 'complete'
});

const PRACTICE_TOLERANCE = 999;
const PRACTICE_WARNING_DURATION = 2.8;

/**
 * Fixed, low-pressure onboarding for the two-condition rescue loop.
 *
 * This is deliberately separate from EventDirector: the tutorial should not
 * introduce random spawns, critical events, lives, or a hidden difficulty
 * curve while the player is learning movement and item selection.
 */
export class TutorialDirector {
  constructor(stage, callbacks = {}) {
    this.stage = stage;
    this.callbacks = callbacks;
    this.reset();
  }

  reset() {
    this.step = STEPS.MOVE;
    this.firstNpc = null;
    this.secondNpc = null;
    this.nextNpcNumber = 1;
  }

  update(_dt, stageTime, npcs, player) {
    if (this.step === STEPS.MOVE && (player.distanceTravelled >= 55 || stageTime >= 8)) {
      this.firstNpc = this.spawnPracticeNpc(
        npcs,
        { x: this.stage.start.x, y: this.stage.start.y - 155 },
        CONDITIONS.ITCH,
        stageTime
      );
      this.step = STEPS.FIRST_RESCUE;
      this.callbacks.onStep?.(this.step, this.firstNpc);
      return;
    }

    if (this.step === STEPS.FIRST_RESCUE && this.firstNpc?.isRescued) {
      this.secondNpc = this.spawnPracticeNpc(
        npcs,
        { x: this.stage.start.x, y: this.stage.start.y - 340 },
        CONDITIONS.SORENESS,
        stageTime
      );
      this.step = STEPS.SECOND_RESCUE;
      this.callbacks.onStep?.(this.step, this.secondNpc);
      return;
    }

    if (this.step === STEPS.SECOND_RESCUE && this.secondNpc?.isRescued) {
      this.step = STEPS.COMPLETE;
      this.callbacks.onStep?.(this.step, this.secondNpc);
    }
  }

  spawnPracticeNpc(npcs, position, condition, stageTime) {
    const npc = new NPC({
      id: `tutorial-npc-${this.nextNpcNumber++}`,
      role: 'elder',
      x: position.x,
      y: position.y,
      zone: 'training',
      path: [],
      name: '練習居民'
    });
    npc.onFailure = this.callbacks.onFailure || null;
    npc.onStateChange = this.callbacks.onStateChange || null;
    npc.startEvent(condition, PRACTICE_TOLERANCE, PRACTICE_WARNING_DURATION, stageTime);
    npcs.push(npc);
    this.callbacks.onSpawn?.(npc);
    return npc;
  }

  getObjective(game) {
    if (this.step === STEPS.MOVE) return '移動看看';
    if (this.step === STEPS.FIRST_RESCUE) {
      return game.interactionSystem.currentTarget
        ? '選擇 PPA+1'
        : '找到需要幫忙的居民';
    }
    if (this.step === STEPS.SECOND_RESCUE) {
      return game.interactionSystem.currentTarget
        ? '選擇 NAP+1'
        : '找到下一位需要幫忙的居民';
    }
    return '教學完成';
  }

  getItemFocus() {
    if (this.step === STEPS.FIRST_RESCUE) return 'PPA';
    if (this.step === STEPS.SECOND_RESCUE) return 'NAP';
    return null;
  }

  isComplete() {
    return this.step === STEPS.COMPLETE;
  }
}
