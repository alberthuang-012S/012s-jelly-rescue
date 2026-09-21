import { CONDITIONS } from './constants.js';
import { NPC } from './NPC.js?mountain-pavilion-dialogue-v2';
import { circleHitsRect, clamp, distance } from './utils.js';

const STEPS = Object.freeze({
  MOVE: 'move',
  FIRST_RESCUE: 'first-rescue',
  SECOND_RESCUE: 'second-rescue',
  FINAL_CHECK: 'final-check',
  COMPLETE: 'complete'
});

const PRACTICE_TOLERANCE = 999;
const PRACTICE_WARNING_DURATION = 2.8;
const MOVE_DISTANCE = 150;
const PRACTICE_RADIUS = 19;
const PRACTICE_SAFE_INSET = Object.freeze({
  horizontal: 160,
  top: 190,
  bottom: 110
});

/**
 * Fixed, low-pressure onboarding for the two-condition rescue loop plus one
 * independent judgement check.
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
    this.finalNpc = null;
    this.nextNpcNumber = 1;
    this.finalCondition = null;
    this.finalWrongAttempts = 0;
  }

  update(_dt, _stageTime, _npcs, player) {
    // Every transition is driven by player action or rescue completion. There
    // is deliberately no elapsed-time fallback: Tutorial is an untimed,
    // confirmation-led learning flow.
    if (this.step === STEPS.MOVE && player.distanceTravelled >= MOVE_DISTANCE) {
      this.step = STEPS.FIRST_RESCUE;
      this.callbacks.onStep?.(this.step, null);
      return;
    }

    if (this.step === STEPS.FIRST_RESCUE && this.firstNpc?.isRescued) {
      this.step = STEPS.SECOND_RESCUE;
      this.callbacks.onStep?.(this.step, null);
      return;
    }

    if (this.step === STEPS.SECOND_RESCUE && this.secondNpc?.isRescued) {
      this.step = STEPS.FINAL_CHECK;
      this.finalWrongAttempts = 0;
      this.callbacks.onStep?.(this.step, null);
      return;
    }

    if (this.step === STEPS.FINAL_CHECK && this.finalNpc?.isRescued) {
      this.step = STEPS.COMPLETE;
      this.callbacks.onStep?.(this.step, this.finalNpc);
    }
  }

  beginRescue(stageTime, npcs, player) {
    if (this.step === STEPS.FIRST_RESCUE && !this.firstNpc) {
      this.firstNpc = this.spawnPracticeNpc(
        npcs,
        this.findPracticePosition(player || this.stage.start, npcs, 135, 105, 180),
        CONDITIONS.ITCH,
        stageTime
      );
      return this.firstNpc;
    }
    if (this.step === STEPS.SECOND_RESCUE && !this.secondNpc) {
      this.secondNpc = this.spawnPracticeNpc(
        npcs,
        this.findPracticePosition(player || this.stage.start, npcs, 220, 180, 260),
        CONDITIONS.SORENESS,
        stageTime
      );
      return this.secondNpc;
    }
    if (this.step === STEPS.FINAL_CHECK && !this.finalNpc) {
      this.finalCondition = this.finalCondition
        || this.callbacks.getFinalCondition?.()
        || (Math.random() < 0.5 ? CONDITIONS.ITCH : CONDITIONS.SORENESS);
      this.finalNpc = this.spawnPracticeNpc(
        npcs,
        this.findPracticePosition(player || this.stage.start, npcs, 195, 155, 245),
        this.finalCondition,
        stageTime
      );
      return this.finalNpc;
    }
    return null;
  }

  findPracticePosition(origin, npcs, preferredDistance, minDistance, maxDistance) {
    const safeBounds = this.getPracticeSafeBounds();
    const directionVectors = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const primary = directionVectors[origin.direction] || directionVectors.up;
    const directions = [
      primary,
      { x: primary.y, y: -primary.x },
      { x: -primary.y, y: primary.x },
      { x: -primary.x, y: -primary.y },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];
    const distances = [preferredDistance, minDistance, maxDistance, (minDistance + maxDistance) / 2];
    for (const direction of directions) {
      for (const amount of distances) {
        const candidate = {
          x: clamp(origin.x + direction.x * amount, safeBounds.left, safeBounds.right),
          y: clamp(origin.y + direction.y * amount, safeBounds.top, safeBounds.bottom)
        };
        const actualDistance = distance(origin, candidate);
        const occupiedByOtherNpc = npcs.some((npc) => npc.active && distance(npc, candidate) < 74);
        if (
          actualDistance >= minDistance * 0.78
          && actualDistance <= maxDistance * 1.08
          && this.canPracticeOccupy(candidate)
          && this.isPracticePathClear(origin, candidate)
          && !occupiedByOtherNpc
        ) return candidate;
      }
    }

    // The open training park should always provide a nearby point, but keep a
    // legal fallback if a device leaves the player beside a landmark.
    const fallbackCandidates = [
      {
        x: clamp(origin.x, safeBounds.left, safeBounds.right),
        y: clamp(origin.y - Math.min(preferredDistance, 150), safeBounds.top, safeBounds.bottom)
      },
      {
        x: clamp(this.stage.start.x, safeBounds.left, safeBounds.right),
        y: clamp(this.stage.start.y - 120, safeBounds.top, safeBounds.bottom)
      },
      {
        x: (safeBounds.left + safeBounds.right) / 2,
        y: (safeBounds.top + safeBounds.bottom) / 2
      }
    ];
    return fallbackCandidates.find((candidate) => this.canPracticeOccupy(candidate)) || fallbackCandidates[0];
  }

  getPracticeSafeBounds() {
    const { width, height } = this.stage.world;
    const minimumInset = PRACTICE_RADIUS + 12;
    const horizontalInset = Math.min(
      PRACTICE_SAFE_INSET.horizontal,
      Math.max(minimumInset, width / 2 - PRACTICE_RADIUS)
    );
    const topInset = Math.min(
      PRACTICE_SAFE_INSET.top,
      Math.max(minimumInset, height / 2 - PRACTICE_RADIUS)
    );
    const bottomInset = Math.min(
      PRACTICE_SAFE_INSET.bottom,
      Math.max(minimumInset, height / 2 - PRACTICE_RADIUS)
    );
    return {
      left: horizontalInset,
      right: Math.max(horizontalInset, width - horizontalInset),
      top: topInset,
      bottom: Math.max(topInset, height - bottomInset)
    };
  }

  canPracticeOccupy(position) {
    if (
      position.x < PRACTICE_RADIUS
      || position.x > this.stage.world.width - PRACTICE_RADIUS
      || position.y < PRACTICE_RADIUS
      || position.y > this.stage.world.height - PRACTICE_RADIUS
    ) return false;
    return !(this.stage.obstacles || []).some((obstacle) => circleHitsRect({ ...position, radius: PRACTICE_RADIUS }, obstacle));
  }

  isPracticePathClear(from, to) {
    const totalDistance = distance(from, to);
    const sampleCount = Math.max(2, Math.ceil(totalDistance / 12));
    for (let index = 1; index < sampleCount; index += 1) {
      const ratio = index / sampleCount;
      const sample = {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
      if (!this.canPracticeOccupy(sample)) return false;
    }
    return true;
  }

  spawnPracticeNpc(npcs, position, condition, stageTime) {
    const npc = new NPC({
      id: `tutorial-npc-${this.nextNpcNumber++}`,
      role: 'elder',
      x: position.x,
      y: position.y,
      zone: 'training',
      path: [],
      name: '練習居民',
      isPractice: true
    });
    npc.onFailure = this.callbacks.onFailure || null;
    npc.onStateChange = this.callbacks.onStateChange || null;
    npc.startEvent(condition, PRACTICE_TOLERANCE, PRACTICE_WARNING_DURATION, stageTime);
    npc.practicePulseTimer = 1.35;
    // The modal has already explained the task. Start the practice resident
    // directly in HELP so the first visible line is the actionable dialogue.
    npc.enterHelp(stageTime);
    npcs.push(npc);
    this.callbacks.onSpawn?.(npc);
    return npc;
  }

  getObjective(game) {
    if (this.step === STEPS.MOVE) return '移動看看';
    if (this.step === STEPS.FIRST_RESCUE) return '幫助覺得癢的居民';
    if (this.step === STEPS.SECOND_RESCUE) return '幫助覺得痠痛的居民';
    if (this.step === STEPS.FINAL_CHECK) return '觀察居民，自行選擇道具';
    return '';
  }

  getItemFocus() {
    if (this.step === STEPS.FIRST_RESCUE) return 'PPA';
    if (this.step === STEPS.SECOND_RESCUE) return 'NAP';
    return null;
  }

  recordFinalWrongItem() {
    if (this.step !== STEPS.FINAL_CHECK) return 0;
    this.finalWrongAttempts += 1;
    return this.finalWrongAttempts;
  }

  getFinalWrongAttempts() {
    return this.finalWrongAttempts;
  }

  setFinalCheckCondition(condition) {
    if ([CONDITIONS.ITCH, CONDITIONS.SORENESS].includes(condition)) this.finalCondition = condition;
  }

  isComplete() {
    return this.step === STEPS.COMPLETE;
  }
}
