import { CONDITION_LABELS, CONDITIONS, ROLE_LABELS, STATES } from './constants.js';
import { choose, clamp, drawShadow, drawText, distance, roundedRect } from './utils.js';
import { NPCStateMachine } from './NPCStateMachine.js';

const ROLE_STYLE = {
  jogger: { shirt: '#f47c8d', hair: '#24324a', accent: '#ffd687', speed: 78, movement: 'runner' },
  picnic: { shirt: '#f47ca4', hair: '#5d3e70', accent: '#ffd687', speed: 14, movement: 'sit' },
  elder: { shirt: '#8272db', hair: '#e8e5d7', accent: '#f3c997', speed: 8, movement: 'sit' },
  visitor: { shirt: '#ffd687', hair: '#503e4a', accent: '#96c981', speed: 32, movement: 'wander' },
  dogWalker: { shirt: '#72d6ff', hair: '#24324a', accent: '#f3c997', speed: 58, movement: 'patrol' },
  hiker: { shirt: '#f3a66b', hair: '#24324a', accent: '#75d2dc', speed: 35, movement: 'patrol' },
  trailRunner: { shirt: '#f47c8d', hair: '#24324a', accent: '#ffd687', speed: 82, movement: 'runner' },
  photographer: { shirt: '#bca9f4', hair: '#24324a', accent: '#75d2dc', speed: 24, movement: 'wander' },
  family: { shirt: '#78c98a', hair: '#754b4d', accent: '#ffd687', speed: 25, movement: 'wander' }
};

const NPC_SPRITE_VARIANTS = Object.freeze({
  jogger: 0,
  picnic: 1,
  elder: 1,
  visitor: 2,
  dogWalker: 0,
  hiker: 0,
  trailRunner: 0,
  photographer: 2,
  family: 2
});

function normalizeCondition(condition) {
  // Keep the visual dialogue aligned with the two supported rescue conditions.
  // Older/debug callers may pass SORE instead of SORENESS; anything that is not
  // explicitly ITCH should therefore resolve to the soreness dialogue.
  return condition === CONDITIONS.ITCH ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
}

export class NPC {
  constructor({ id, role, x, y, zone, path = [], name }) {
    this.id = id;
    this.role = role;
    this.name = name || ROLE_LABELS[role] || '遊客';
    this.x = x;
    this.y = y;
    this.zone = zone || 'park';
    this.path = path;
    this.pathIndex = 0;
    this.wanderTarget = null;
    this.wanderWait = Math.random() * 2;
    this.state = STATES.NORMAL;
    this.condition = null;
    this.tolerance = 0;
    this.maxTolerance = 0;
    this.warningTimer = 0;
    this.conditionTimer = 0;
    this.eventStartedAt = 0;
    this.rescueTimer = 0;
    this.removeTimer = 0;
    this.nextEventAt = 0;
    this.active = true;
    this.isRescued = false;
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

  startEvent(condition, maxTolerance, warningDuration) {
    if (this.state !== STATES.NORMAL) return false;
    this.state = STATES.WARNING;
    this.condition = normalizeCondition(condition);
    this.maxTolerance = maxTolerance;
    this.tolerance = maxTolerance;
    this.warningTimer = warningDuration;
    this.conditionTimer = maxTolerance;
    this.isRescued = false;
    return true;
  }

  enterHelp(stageTime) {
    this.state = STATES.HELP;
    this.eventStartedAt = stageTime;
    this.conditionTimer = this.tolerance;
  }

  getResponseTime(stageTime) {
    return Math.max(0, stageTime - this.eventStartedAt);
  }

  rescue(stageTime) {
    this.state = STATES.RESCUED;
    this.rescueTimer = 1.2;
    this.tolerance = this.maxTolerance;
    this.conditionTimer = 0;
    this.isRescued = true;
    this.nextEventAt = stageTime + 4 + Math.random() * 2;
  }

  finishRescue() {
    this.state = STATES.NORMAL;
    this.condition = null;
    this.isRescued = false;
    this.warningTimer = 0;
  }

  penalizeWrongItem() {
    this.tolerance = Math.max(0.25, this.tolerance - 0.9);
    this.conditionTimer = this.tolerance;
  }

  fail() {
    if (this.state === STATES.FAILED) return;
    this.state = STATES.FAILED;
    this.removeTimer = 1.25;
    this.isRescued = false;
  }

  update(dt, stage, stageTime) {
    if (!this.active) return;
    this.phase += dt * 2;
    if (this.state === STATES.FAILED) {
      this.removeTimer -= dt;
      this.x += 15 * dt;
      this.y -= 7 * dt;
      if (this.removeTimer <= 0) this.active = false;
      return;
    }
    this.updateMovement(dt, stage, stageTime);
    this.stateMachine.update(dt, stageTime);
  }

  updateMovement(dt, stage, stageTime) {
    const style = ROLE_STYLE[this.role] || ROLE_STYLE.visitor;
    if (this.state === STATES.RESCUED || style.movement === 'sit') return;
    if (style.movement === 'runner' || style.movement === 'patrol') {
      this.moveAlongPath(dt, style.speed, stage);
      return;
    }
    this.wanderWait -= dt;
    if (!this.wanderTarget || distance(this, this.wanderTarget) < 8) {
      if (this.wanderWait > 0) return;
      const zone = stage.zones?.find((item) => item.id === this.zone) || stage.zones?.[0];
      if (zone) {
        this.wanderTarget = {
          x: zone.x + 24 + Math.random() * Math.max(1, zone.width - 48),
          y: zone.y + 24 + Math.random() * Math.max(1, zone.height - 48)
        };
      }
      this.wanderWait = 0.4;
    }
    const dx = this.wanderTarget.x - this.x;
    const dy = this.wanderTarget.y - this.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = style.speed * (this.state === STATES.CRITICAL ? 1.15 : 1);
    this.x += (dx / length) * speed * dt;
    this.y += (dy / length) * speed * dt;
    this.x = clamp(this.x, 30, stage.world.width - 30);
    this.y = clamp(this.y, 50, stage.world.height - 30);
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
    this.x += (dx / length) * velocity * dt;
    this.y += (dy / length) * velocity * dt;
  }

  draw(ctx, now, { debugRadius = false, cameraScale = 1, compactStatusBubble = false } = {}) {
    if (!this.active) return;
    const bob = this.state === STATES.RESCUED ? Math.sin(now * 0.012 + this.phase) * 4 : Math.sin(now * 0.004 + this.phase) * 1.3;
    const style = ROLE_STYLE[this.role] || ROLE_STYLE.visitor;
    drawShadow(ctx, this.x, this.y + 43, 23, 7, this.state === STATES.FAILED ? 0.06 : 0.16);
    if (this.highlighted) {
      ctx.save();
      ctx.strokeStyle = '#ffe39b';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (this.state === STATES.RESCUED) {
      ctx.fillStyle = 'rgba(255, 231, 155, 0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 14 + bob, 35 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.drawWorldSprite(ctx, bob)) {
      ctx.translate(this.x, this.y - 10 + bob);
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
      if (this.role === 'dogWalker') {
        ctx.fillStyle = '#b57e63'; ctx.beginPath(); ctx.arc(27, 15, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dca78a'; ctx.beginPath(); ctx.arc(31, 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#855e78'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(25, 14); ctx.stroke();
      }
    }
    ctx.restore();

    if (this.state === STATES.WARNING || this.state === STATES.HELP || this.state === STATES.CRITICAL || this.state === STATES.RESCUED || this.state === STATES.FAILED) {
      this.drawStatus(ctx, now, { cameraScale, compactStatusBubble });
    }
    if (debugRadius) {
      ctx.save(); ctx.strokeStyle = 'rgba(36, 50, 74, 0.38)'; ctx.lineWidth = 2; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(this.x, this.y, 78, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  drawWorldSprite(ctx, bob) {
    if (!this.spriteImage?.complete || !this.spriteImage.naturalWidth || !this.spriteSheet) return false;
    const frame = NPC_SPRITE_VARIANTS[this.role] ?? 0;
    const frameWidth = this.spriteSheet.frameWidth;
    const frameHeight = this.spriteSheet.frameHeight;
    const destinationWidth = 72;
    const destinationHeight = 132;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.spriteImage,
      frame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      this.x - destinationWidth / 2,
      this.y - 84 + bob,
      destinationWidth,
      destinationHeight
    );
    ctx.restore();
    return true;
  }

  drawStatus(ctx, now, { cameraScale = 1, compactStatusBubble = false } = {}) {
    const conditionKey = this.condition === CONDITIONS.ITCH ? CONDITIONS.ITCH : CONDITIONS.SORENESS;
    const condition = CONDITION_LABELS[conditionKey];
    const isWarning = this.state === STATES.WARNING;
    const isCritical = this.state === STATES.CRITICAL;
    const isRescued = this.state === STATES.RESCUED;
    const isFailed = this.state === STATES.FAILED;
    const label = isRescued
      ? '好多了！'
      : isFailed
        ? '我先回去了……'
        : isWarning
          ? condition.warningTitle
          : isCritical
            ? '快受不了了！'
            : condition.title;
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
    const bubbleX = this.x - bubbleWidth / 2;
    const spriteTopOffset = this.spriteSheet ? 84 : 52;
    const gap = (compactStatusBubble ? 7 : 9) / scale;
    const pulse = isCritical ? (Math.sin(now * 0.02) * (compactStatusBubble ? 1.5 : 2)) / scale : 0;
    const bubbleBottom = this.y - spriteTopOffset - gap;
    const bubbleY = bubbleBottom - bubbleHeight - pulse;
    const fill = isCritical ? '#ffe1ea' : isRescued ? '#def5e8' : isFailed ? '#eef3f5' : '#fff5df';
    const stroke = isCritical ? '#e77fa2' : isRescued ? '#65ae91' : isFailed ? '#95a9b4' : '#5686c5';
    const textColor = isCritical ? '#a83d67' : isRescued ? '#287b64' : isFailed ? '#566d7b' : '#173a76';
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
    ctx.moveTo(this.x - 5 / scale, bubbleY + bubbleHeight);
    ctx.lineTo(this.x, bubbleY + bubbleHeight + pointerHeight);
    ctx.lineTo(this.x + 5 / scale, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawText(ctx, label, this.x, bubbleY + bubbleHeight / 2, {
      size: screenFontSize / scale,
      color: textColor,
      weight: 900,
      font: "Manrope, 'Noto Sans TC', sans-serif"
    });
    ctx.restore();
    if (!isRescued && !isFailed) {
      const screenBarWidth = compactStatusBubble ? 92 : 112;
      const screenBarHeight = compactStatusBubble ? 8 : 10;
      const barWidth = screenBarWidth / scale;
      const barHeight = screenBarHeight / scale;
      const barY = bubbleY - (compactStatusBubble ? 8 : 10) / scale - barHeight;
      const ratio = clamp(this.tolerance / Math.max(0.1, this.maxTolerance), 0, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(36, 50, 74, 0.52)';
      roundedRect(ctx, this.x - barWidth / 2, barY, barWidth, barHeight, 3 / scale); ctx.fill();
      ctx.fillStyle = isCritical ? '#ed8d75' : condition.color;
      roundedRect(ctx, this.x - barWidth / 2, barY, barWidth * ratio, barHeight, 3 / scale); ctx.fill();
      ctx.restore();
    }
  }
}
