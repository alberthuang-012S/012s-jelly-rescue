import { CONDITION_LABELS, CONDITIONS, STATES } from './constants.js';
import { clamp, circleHitsRect, drawShadow, drawText, distance, moveWithCollision, roundedRect } from './utils.js';

export const LIFESTYLE_SPRITE_FRAMES = Object.freeze({
  youngWoman: 0, shopper: 1, cafeVisitor: 2, photographerGirl: 3, deliveryWorker: 4,
  basketballPlayer: 0, runner: 1, skateboarder: 2, fitnessGuy: 3, sportsGirl: 4, grassVisitor: 5
});
import { NPCStateMachine } from './NPCStateMachine.js';
import { NPC_ROLE_DEFS } from './NPCRoleDefinitions.js';
import { SCENARIO_DEFS, resolveScenario } from './ScenarioDefinitions.js';
import { injuryPose } from './InjuryAnimation.js';

function normalizeCondition(condition) {
  // Keep the visual dialogue aligned with the two supported rescue conditions.
  // Older/debug callers may pass SORE instead of SORENESS; anything that is not
  // explicitly ITCH should therefore resolve to the soreness dialogue.
  return condition === CONDITIONS.ITCH ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
}

export class NPC {
  constructor({ id, role, x, y, zone, path = [], name, isPractice = false }) {
    this.id = id;
    this.role = role;
    this.name = name || NPC_ROLE_DEFS[role]?.label || '遊客';
    this.x = x;
    this.y = y;
    this.radius = NPC_ROLE_DEFS[role]?.radius || 20;
    this.zone = zone || 'park';
    this.path = path;
    this.pathIndex = 0;
    this.wanderTarget = null;
    this.wanderWait = Math.random() * 2;
    this.blockedTime = 0;
    this.state = STATES.NORMAL;
    this.condition = null;
    this.scenarioType = null;
    this.reactionType = null;
    this.reactionTimer = 0;
    this.reactionDuration = 0;
    this.tolerance = 0;
    this.maxTolerance = 0;
    this.warningTimer = 0;
    this.conditionTimer = 0;
    this.dialogueOverride = '';
    this.dialogueOverrideTimer = 0;
    this.eventStartedAt = 0;
    this.rescueTimer = 0;
    this.removeTimer = 0;
    this.nextEventAt = 0;
    this.active = true;
    this.isRescued = false;
    this.isPractice = isPractice;
    this.practicePulseTimer = 0;
    this.highlighted = false;
    this.phase = Math.random() * Math.PI * 2;
    this.spriteImage = null;
    this.spriteSheet = null;
    this.stateMachine = new NPCStateMachine(this);
    this.onFailure = null;
    this.onStateChange = null;
  }

  canReceiveEvent(stageTime) {
    return this.active && this.state === STATES.NORMAL && stageTime >= this.nextEventAt;
  }

  startEvent(condition, maxTolerance, warningDuration, stageTime = 0) {
    if (this.state !== STATES.NORMAL) return false;
    this.resetScenario();
    this.state = STATES.WARNING;
    this.condition = normalizeCondition(condition);
    this.maxTolerance = maxTolerance;
    this.tolerance = maxTolerance;
    this.warningTimer = warningDuration;
    this.conditionTimer = maxTolerance;
    this.eventStartedAt = stageTime;
    this.isRescued = false;
    return true;
  }

  startScenario(type, maxTolerance, warningDuration, stageTime = 0) {
    const definition = resolveScenario(type);
    if (!this.startEvent(definition.condition, maxTolerance, warningDuration, stageTime)) return false;
    this.scenarioType = type;
    this.reactionType = definition.reaction;
    this.reactionDuration = Math.min(definition.reactionDuration, warningDuration);
    this.reactionTimer = this.reactionDuration;
    return true;
  }

  resetScenario() {
    this.scenarioType = null;
    this.reactionType = null;
    this.reactionTimer = 0;
    this.reactionDuration = 0;
    this.dialogueOverride = '';
    this.dialogueOverrideTimer = 0;
  }

  clearEvent(stageTime = 0) {
    this.state = STATES.NORMAL;
    this.condition = null;
    this.tolerance = this.maxTolerance = this.warningTimer = this.conditionTimer = 0;
    this.isRescued = false;
    this.resetScenario();
    this.nextEventAt = stageTime + 2;
  }

  get visualState() {
    return this.reactionTimer > 0 ? 'EVENT_REACTION' : this.state;
  }

  enterHelp(stageTime) {
    this.state = STATES.HELP;
    this.conditionTimer = this.tolerance;
  }

  getResponseTime(stageTime) {
    return Math.max(0, stageTime - this.eventStartedAt);
  }

  rescue(stageTime) {
    this.reactionTimer = 0;
    this.state = STATES.RESCUED;
    this.rescueTimer = 1.2;
    this.tolerance = this.maxTolerance;
    this.conditionTimer = 0;
    this.isRescued = true;
    this.dialogueOverride = '';
    this.dialogueOverrideTimer = 0;
    this.nextEventAt = stageTime + 4 + Math.random() * 2;
  }

  finishRescue() {
    this.resetScenario();
    this.state = STATES.NORMAL;
    this.condition = null;
    this.isRescued = false;
    this.warningTimer = 0;
  }

  fail() {
    if (this.state === STATES.FAILED) return;
    this.state = STATES.FAILED;
    this.reactionTimer = 0;
    this.removeTimer = 1.25;
    this.isRescued = false;
    this.dialogueOverride = '';
    this.dialogueOverrideTimer = 0;
  }

  showDialogue(text, duration = 1.2) {
    this.dialogueOverride = text;
    this.dialogueOverrideTimer = duration;
  }

  update(dt, stage, stageTime) {
    if (!this.active) return;
    this.phase += dt * 2;
    if (this.practicePulseTimer > 0) this.practicePulseTimer = Math.max(0, this.practicePulseTimer - dt);
    if (this.dialogueOverrideTimer > 0) {
      this.dialogueOverrideTimer = Math.max(0, this.dialogueOverrideTimer - dt);
      if (this.dialogueOverrideTimer <= 0) this.dialogueOverride = '';
    }
    if (this.state === STATES.FAILED) {
      this.removeTimer -= dt;
      this.moveByVector({ x: 15, y: -7 }, Math.hypot(15, 7), dt, stage);
      if (this.removeTimer <= 0) this.active = false;
      return;
    }
    this.updateMovement(dt, stage, stageTime);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    this.stateMachine.update(dt, stageTime);
  }

  updateMovement(dt, stage, stageTime) {
    const style = NPC_ROLE_DEFS[this.role] || NPC_ROLE_DEFS.visitor;
    if (this.state === STATES.RESCUED || style.movement === 'sit') return;
    const scenarioActive = this.scenarioType && [STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(this.state);
    const reactionProgress = this.reactionDuration ? 1 - this.reactionTimer / this.reactionDuration : 1;
    if (scenarioActive && (this.reactionTimer <= 0 || this.reactionType === 'skin' || reactionProgress > .7)) return;
    const reactionSpeed = scenarioActive ? Math.max(0, 1 - reactionProgress / .7) : 1;
    if (style.movement === 'runner' || style.movement === 'patrol') {
      this.moveAlongPath(dt, style.speed * reactionSpeed, stage);
      return;
    }
    this.wanderWait -= dt;
    if (!this.wanderTarget || distance(this, this.wanderTarget) < 8) {
      if (this.wanderWait > 0) return;
      this.wanderTarget = this.findWanderTarget(stage);
      this.blockedTime = 0;
      this.wanderWait = 0.4;
    }
    if (!this.wanderTarget) return;
    const dx = this.wanderTarget.x - this.x;
    const dy = this.wanderTarget.y - this.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = style.speed * reactionSpeed * (this.state === STATES.CRITICAL ? 1.15 : 1);
    const moved = this.moveByVector({ x: dx, y: dy }, speed, dt, stage);
    if (moved < 0.05) this.blockedTime += dt;
    else this.blockedTime = 0;
    if (this.blockedTime >= 0.75) {
      this.wanderTarget = null;
      this.wanderWait = 0.12;
      this.blockedTime = 0;
    }
  }

  moveAlongPath(dt, speed, stage) {
    if (!this.path.length) return;
    const point = this.path[this.pathIndex % this.path.length];
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const length = Math.hypot(dx, dy) || 1;
    if (length < 14) {
      this.pathIndex = (this.pathIndex + 1) % this.path.length;
      return;
    }
    const velocity = speed * (this.state === STATES.CRITICAL ? 1.2 : 1);
    const moved = this.moveByVector({ x: dx, y: dy }, velocity, dt, stage);
    if (moved < 0.05) this.blockedTime += dt;
    else this.blockedTime = 0;
    if (this.blockedTime >= 0.85) {
      this.pathIndex = (this.pathIndex + 1) % this.path.length;
      this.blockedTime = 0;
    }
  }

  findWanderTarget(stage) {
    const zone = stage.zones?.find((item) => item.id === this.zone) || stage.zones?.[0];
    if (!zone) return null;
    const padding = this.radius + 12;
    const minX = Math.max(this.radius, zone.x + padding);
    const maxX = Math.min(stage.world.width - this.radius, zone.x + zone.width - padding);
    const minY = Math.max(this.radius, zone.y + padding);
    const maxY = Math.min(stage.world.height - this.radius, zone.y + zone.height - padding);
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = {
        x: minX + Math.random() * Math.max(1, maxX - minX),
        y: minY + Math.random() * Math.max(1, maxY - minY)
      };
      if (this.canOccupy(candidate, stage)) return candidate;
    }
    return this.canOccupy({ x: this.x, y: this.y }, stage) ? { x: this.x, y: this.y } : null;
  }

  canOccupy(position, stage) {
    if (
      position.x < this.radius ||
      position.x > stage.world.width - this.radius ||
      position.y < this.radius ||
      position.y > stage.world.height - this.radius
    ) return false;
    return !(stage.obstacles || []).some((obstacle) => circleHitsRect({ ...position, radius: this.radius }, obstacle));
  }

  placeAt(position, stage) {
    const offsets = [
      { x: 58, y: 0 }, { x: -58, y: 0 }, { x: 0, y: 58 }, { x: 0, y: -58 },
      { x: 42, y: 42 }, { x: -42, y: 42 }, { x: 42, y: -42 }, { x: -42, y: -42 }
    ];
    for (const offset of offsets) {
      const candidate = {
        x: clamp(position.x + offset.x, this.radius, stage.world.width - this.radius),
        y: clamp(position.y + offset.y, this.radius, stage.world.height - this.radius)
      };
      if (this.canOccupy(candidate, stage)) {
        this.x = candidate.x;
        this.y = candidate.y;
        this.blockedTime = 0;
        return true;
      }
    }
    return false;
  }

  moveByVector(vector, speed, dt, stage) {
    const length = Math.hypot(vector.x, vector.y);
    if (!length) return 0;
    const before = { x: this.x, y: this.y };
    const next = moveWithCollision(
      { x: this.x, y: this.y },
      this.radius,
      { x: vector.x / length, y: vector.y / length },
      speed * dt,
      stage.world,
      stage.obstacles || []
    );
    this.x = next.x;
    this.y = next.y;
    return Math.hypot(this.x - before.x, this.y - before.y);
  }

  hasStatusBubble() {
    return [STATES.WARNING, STATES.HELP, STATES.CRITICAL, STATES.RESCUED, STATES.FAILED].includes(this.state);
  }

  draw(ctx, now, {
    debugRadius = false,
    cameraScale = 1,
    compactStatusBubble = false,
    visibleBounds = null,
    drawStatusBubble = true
  } = {}) {
    if (!this.active) return;
    const bob = this.state === STATES.RESCUED ? Math.sin(now * 0.012 + this.phase) * 4 : Math.sin(now * 0.004 + this.phase) * 1.3;
    const style = NPC_ROLE_DEFS[this.role] || NPC_ROLE_DEFS.visitor;
    drawShadow(ctx, this.x, this.y + 43, 23, 7, this.state === STATES.FAILED ? 0.06 : 0.16);
    if (this.highlighted) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 224, 154, .2)';
      ctx.strokeStyle = 'rgba(255, 224, 154, .82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 35, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (this.isPractice && this.practicePulseTimer > 0 && !this.isRescued) {
      const pulseProgress = 1 - this.practicePulseTimer / 1.35;
      const pulseScale = 1 + pulseProgress * 0.35;
      ctx.save();
      ctx.globalAlpha = (1 - pulseProgress) * 0.58;
      ctx.strokeStyle = '#fff0ad';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 37, 30 * pulseScale, 9 * pulseScale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (!this.getInjuryPose(now)) this.applyReactionTransform(ctx, now);
    if (this.state === STATES.RESCUED) {
      ctx.fillStyle = 'rgba(255, 231, 155, 0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 14 + bob, 35 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.drawWorldSprite(ctx, bob, now)) {
      ctx.translate(this.x, this.y - 10 + bob);
      if (style.spriteVariant === null) ctx.scale(1.6, 1.6);
      ctx.lineJoin = 'miter';
      ctx.fillStyle = style.shirt;
      ctx.strokeStyle = '#24324a';
      ctx.lineWidth = 3;
      roundedRect(ctx, -15, -2, 30, 27, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.arc(0, -13, 13, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = style.hair;
      ctx.beginPath();
      ctx.arc(0, -19, 12, Math.PI, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#24324a';
      ctx.beginPath(); ctx.arc(-5, -13, 1.5, 0, Math.PI * 2); ctx.arc(5, -13, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#24324a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -9, 4, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = style.shirt; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-19, 12); ctx.moveTo(12, 5); ctx.lineTo(19, 12); ctx.stroke();
      ctx.strokeStyle = '#24324a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-7, 24); ctx.lineTo(-8, 30); ctx.moveTo(7, 24); ctx.lineTo(8, 30); ctx.stroke();
      this.drawAccessory(ctx, style.accessory);
      this.drawReactionCue(ctx, now);
      if (this.role === 'dogWalker') {
        ctx.fillStyle = '#b57e63'; ctx.beginPath(); ctx.arc(27, 15, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dca78a'; ctx.beginPath(); ctx.arc(31, 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#855e78'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(25, 14); ctx.stroke();
      }
    }
    ctx.restore();

    if (drawStatusBubble && this.hasStatusBubble()) {
      this.drawStatus(ctx, now, { cameraScale, compactStatusBubble, visibleBounds });
    }
    if (debugRadius) {
      ctx.save(); ctx.strokeStyle = 'rgba(36, 50, 74, 0.38)'; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(this.x, this.y, 78, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  drawWorldSprite(ctx, bob, now = 0) {
    const lifestyle = this.spriteSheet?.lifestyle && LIFESTYLE_SPRITE_FRAMES[this.role] !== undefined;
    if (NPC_ROLE_DEFS[this.role]?.spriteVariant === null && !lifestyle) return false;
    if (!this.spriteImage?.complete || !this.spriteImage.naturalWidth || !this.spriteSheet) return false;
    const injury = this.getInjuryPose(now);
    if (injury) {
      ctx.save();
      const breath = injury.settled ? Math.sin(now * .005) * .8 : 0;
      ctx.drawImage(this.spriteSheet.injuryImage, injury.frame * 256, injury.row * 384,
        256, 384, this.x - 50, this.y - 114 + breath, 100, 150);
      ctx.restore();
      return true;
    }
    const frame = lifestyle ? LIFESTYLE_SPRITE_FRAMES[this.role] : NPC_ROLE_DEFS[this.role]?.spriteVariant ?? 0;
    const frameWidth = this.spriteSheet.frameWidth;
    const frameHeight = this.spriteSheet.frameHeight;
    const destinationWidth = lifestyle ? 80 : 72;
    const destinationHeight = lifestyle ? 120 : 132;
    const columns = this.spriteSheet.columns || this.spriteSheet.frameCount;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.spriteImage,
      (frame % columns) * frameWidth,
      Math.floor(frame / columns) * frameHeight,
      frameWidth,
      frameHeight,
      this.x - destinationWidth / 2,
      this.y - 84 + bob,
      destinationWidth,
      destinationHeight
    );
    if (lifestyle) {
      ctx.translate(this.x, this.y - 10 + bob);
      ctx.scale(1.6, 1.6);
      this.drawReactionCue(ctx, now);
    }
    ctx.restore();
    return true;
  }

  getInjuryPose(now = 0) {
    const image = this.spriteSheet?.injuryImage;
    return image?.complete && image.naturalWidth ? injuryPose(this, now) : null;
  }

  applyReactionTransform(ctx, now) {
    if (!this.scenarioType || ![STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(this.state)) return;
    const progress = this.reactionDuration ? 1 - this.reactionTimer / this.reactionDuration : 1;
    let angle = 0; let offset = 0; let squash = 1;
    if (this.reactionType === 'fall') {
      angle = this.reactionTimer > 0 ? Math.sin(progress * Math.PI * 3) * .24 + progress * .25 : .25;
      offset = progress * 16; squash = 1 - progress * .16;
    } else if (this.reactionType === 'sore') {
      angle = .09 + Math.sin(now * .005) * .025; offset = 4; squash = .96;
    } else angle = -.06;
    ctx.translate(this.x, this.y + offset);
    ctx.rotate(angle); ctx.scale(1, squash); ctx.translate(-this.x, -this.y);
  }

  drawReactionCue(ctx, now) {
    if (!this.scenarioType || ![STATES.WARNING, STATES.HELP, STATES.CRITICAL].includes(this.state)) return;
    ctx.save();
    // Hand across the arm or thigh makes the intent readable without injury art.
    ctx.strokeStyle = NPC_ROLE_DEFS[this.role]?.accent || '#ffdabd';
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(13, 4);
    ctx.lineTo(this.reactionType === 'skin' ? -8 : 6, this.reactionType === 'skin' ? 10 : 23); ctx.stroke();
    if (this.reactionType === 'skin') drawText(ctx, '✦', -24, 7 + Math.sin(now * .004), { size: 15, color: '#9785c9' });
    else drawText(ctx, '〰', 22, 24, { size: 15, color: '#668bb8' });
    ctx.restore();
  }

  drawAccessory(ctx, accessory) {
    if (!accessory) return;
    ctx.save(); ctx.strokeStyle = '#24324a'; ctx.lineWidth = 2;
    const box = (x, y, width, height, color) => {
      ctx.fillStyle = color; roundedRect(ctx, x, y, width, height, 3); ctx.fill(); ctx.stroke();
    };
    switch (accessory) {
      case 'ribbon':
        ctx.fillStyle = '#e6a5c6'; ctx.beginPath(); ctx.moveTo(-15, -23); ctx.lineTo(-5, -19); ctx.lineTo(-15, -14); ctx.fill(); break;
      case 'bags': box(-27, 11, 13, 18, '#ead6b1'); box(16, 11, 12, 16, '#c0b4e5'); break;
      case 'cup': box(15, 6, 10, 13, '#fff5df'); break;
      case 'camera': box(-9, 7, 18, 12, '#6789a4'); ctx.fillStyle = '#d6eced'; ctx.beginPath(); ctx.arc(0, 13, 4, 0, Math.PI * 2); ctx.fill(); break;
      case 'delivery': box(12, -6, 16, 28, '#e6c28c'); box(-15, -26, 30, 6, '#8ccddd'); break;
      case 'ball': ctx.fillStyle = '#e7a96b'; ctx.beginPath(); ctx.arc(22, 12, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(13, 12); ctx.lineTo(31, 12); ctx.moveTo(22, 3); ctx.lineTo(22, 21); ctx.stroke(); break;
      case 'board': box(-22, 30, 44, 5, '#aca1d9'); ctx.fillStyle = '#24324a'; ctx.fillRect(-14, 35, 5, 4); ctx.fillRect(10, 35, 5, 4); break;
      case 'weights': box(-27, 8, 8, 15, '#7898b1'); box(19, 8, 8, 15, '#7898b1'); break;
      case 'headband': box(-12, -23, 24, 4, '#fff5df'); break;
      case 'hat': box(-14, -29, 28, 9, '#dfc48c'); box(-20, -21, 40, 4, '#dfc48c'); break;
    }
    ctx.restore();
  }

  drawStatus(ctx, now, { cameraScale = 1, compactStatusBubble = false, visibleBounds = null } = {}) {
    const conditionKey = this.condition === CONDITIONS.ITCH ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
    const condition = CONDITION_LABELS[conditionKey];
    const isWarning = this.state === STATES.WARNING;
    const isCritical = this.state === STATES.CRITICAL;
    const isRescued = this.state === STATES.RESCUED;
    const isFailed = this.state === STATES.FAILED;
    const label = this.dialogueOverride || SCENARIO_DEFS[this.scenarioType]?.dialogue[this.state] || (isRescued
      ? '好多了！'
      : isFailed
        ? '我先回去了……'
        : isWarning
          ? condition.warningTitle
          : isCritical
            ? '快受不了了！'
            : condition.title);
    const scale = Math.max(0.25, cameraScale);
    const screenFontSize = compactStatusBubble ? (isCritical ? 16 : 14) : (isCritical ? 19 : 17);
    const screenPadding = compactStatusBubble ? 24 : 30;
    const screenBaseWidth = compactStatusBubble ? 116 : 138;
    ctx.save();
    ctx.font = `900 ${screenFontSize}px Manrope, 'Noto Sans TC', sans-serif`;
    const measuredTextWidth = ctx.measureText(label).width;
    ctx.restore();
    const screenBubbleWidth = Math.max(screenBaseWidth, measuredTextWidth + screenPadding);
    const screenBubbleHeight = compactStatusBubble ? 35 : 42;
    const screenPointerHeight = compactStatusBubble ? 8 : 10;
    const bubbleWidth = screenBubbleWidth / scale;
    const bubbleHeight = screenBubbleHeight / scale;
    const pointerHeight = screenPointerHeight / scale;
    const spriteTopOffset = this.spriteSheet && (NPC_ROLE_DEFS[this.role]?.spriteVariant !== null || this.spriteSheet.lifestyle) ? 84 : 52;
    const gap = (compactStatusBubble ? 7 : 9) / scale;
    const pulse = isCritical ? (Math.sin(now * 0.02) * (compactStatusBubble ? 1.5 : 2)) / scale : 0;
    const bubbleBottom = this.y - spriteTopOffset - gap;
    const normalBubbleY = bubbleBottom - bubbleHeight - pulse;
    const canClampToViewport = Boolean(
      visibleBounds
      && this.x + this.radius >= visibleBounds.left
      && this.x - this.radius <= visibleBounds.right
      && this.y + this.radius >= visibleBounds.top
      && this.y - this.radius <= visibleBounds.bottom
    );
    const safePadding = (compactStatusBubble ? 10 : 14) / scale;
    let bubbleCenterX = this.x;
    let bubbleX = this.x - bubbleWidth / 2;
    let bubbleY = normalBubbleY;
    let pointerPointsUp = false;
    if (canClampToViewport) {
      const minCenterX = visibleBounds.left + bubbleWidth / 2 + safePadding;
      const maxCenterX = visibleBounds.right - bubbleWidth / 2 - safePadding;
      bubbleCenterX = minCenterX <= maxCenterX
        ? clamp(this.x, minCenterX, maxCenterX)
        : (visibleBounds.left + visibleBounds.right) / 2;
      bubbleX = bubbleCenterX - bubbleWidth / 2;

      const safeTop = visibleBounds.top + safePadding;
      const safeBottom = visibleBounds.bottom - safePadding;
      const maxBubbleY = Math.max(safeTop, safeBottom - bubbleHeight);
      const spriteBottomOffset = this.spriteSheet ? 54 : 40;
      const belowBubbleY = this.y + spriteBottomOffset + gap;
      if (normalBubbleY < safeTop && belowBubbleY <= maxBubbleY) {
        bubbleY = belowBubbleY;
        pointerPointsUp = true;
      } else {
        bubbleY = clamp(normalBubbleY, safeTop, maxBubbleY);
      }
    }
    const pointerSafeInset = Math.min(
      Math.max(8 / scale, 5 / scale),
      Math.max(0, bubbleWidth / 2 - 5 / scale)
    );
    const pointerX = canClampToViewport
      ? clamp(this.x, bubbleX + pointerSafeInset, bubbleX + bubbleWidth - pointerSafeInset)
      : this.x;
    const softSkin = Boolean(this.scenarioType && this.condition === CONDITIONS.ITCH);
    const fill = isCritical ? (softSkin ? '#eee7fa' : '#ffe1ea') : isRescued ? '#def5e8' : isFailed ? '#eef3f5' : '#fff5df';
    const stroke = isCritical ? (softSkin ? '#9b87c7' : '#e77fa2') : isRescued ? '#65ae91' : isFailed ? '#95a9b4' : '#5686c5';
    const textColor = isCritical ? (softSkin ? '#65508f' : '#a83d67') : isRescued ? '#287b64' : isFailed ? '#566d7b' : '#173a76';
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2 / scale;
    roundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 7 / scale);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    if (pointerPointsUp) {
      ctx.moveTo(pointerX - 5 / scale, bubbleY);
      ctx.lineTo(pointerX, bubbleY - pointerHeight);
      ctx.lineTo(pointerX + 5 / scale, bubbleY);
    } else {
      ctx.moveTo(pointerX - 5 / scale, bubbleY + bubbleHeight);
      ctx.lineTo(pointerX, bubbleY + bubbleHeight + pointerHeight);
      ctx.lineTo(pointerX + 5 / scale, bubbleY + bubbleHeight);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawText(ctx, label, bubbleCenterX, bubbleY + bubbleHeight / 2, {
      size: screenFontSize / scale,
      color: textColor,
      weight: 900,
      font: "Manrope, 'Noto Sans TC', sans-serif"
    });
    ctx.restore();
    if (!this.isPractice && !isRescued && !isFailed) {
      const screenBarWidth = compactStatusBubble ? 92 : 112;
      const screenBarHeight = compactStatusBubble ? 8 : 10;
      const barWidth = screenBarWidth / scale;
      const barHeight = screenBarHeight / scale;
      let barY = bubbleY - (compactStatusBubble ? 8 : 10) / scale - barHeight;
      if (canClampToViewport) {
        const barSafeTop = visibleBounds.top + safePadding;
        const barSafeBottom = visibleBounds.bottom - safePadding;
        const maxBarY = Math.max(barSafeTop, barSafeBottom - barHeight);
        barY = clamp(barY, barSafeTop, maxBarY);
      }
      const ratio = clamp(this.tolerance / Math.max(0.1, this.maxTolerance), 0, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(36, 50, 74, 0.52)';
      roundedRect(ctx, bubbleCenterX - barWidth / 2, barY, barWidth, barHeight, 3 / scale); ctx.fill();
      const toleranceColor = isCritical
        ? '#ed8d75'
        : ratio > 0.6
          ? '#73c8b4'
          : ratio >= 0.3
            ? '#f2c66d'
            : '#ed8d75';
      ctx.fillStyle = toleranceColor;
      roundedRect(ctx, bubbleCenterX - barWidth / 2, barY, barWidth * ratio, barHeight, 3 / scale); ctx.fill();
      ctx.restore();
    }
  }
}
