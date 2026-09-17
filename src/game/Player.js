import { drawShadow, moveWithCollision } from './utils.js';

function damp(current, target, sharpness, dt) {
  return current + (target - current) * (1 - Math.exp(-sharpness * dt));
}

export class Player {
  constructor(spriteImage) {
    this.spriteImage = spriteImage;
    this.radius = 25;
    this.speed = 205;
    this.x = 200;
    this.y = 450;
    this.direction = 'down';
    this.walkTime = 0;
    this.walkPhase = 0;
    this.walkBlend = 0;
    this.idleTime = 0;
    this.distanceTravelled = 0;
    this.spriteSheet = null;
  }

  reset(startPosition) {
    this.x = startPosition.x;
    this.y = startPosition.y;
    this.direction = 'down';
    this.walkTime = 0;
    this.walkPhase = 0;
    this.walkBlend = 0;
    this.idleTime = 0;
    this.distanceTravelled = 0;
  }

  update(dt, input, stage) {
    const vector = input.getMovementVector();
    const hasIntent = vector.x !== 0 || vector.y !== 0;
    if (hasIntent) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) this.direction = vector.x < 0 ? 'left' : 'right';
      else this.direction = vector.y < 0 ? 'up' : 'down';
    }

    const before = { x: this.x, y: this.y };
    const next = hasIntent
      ? moveWithCollision({ x: this.x, y: this.y }, this.radius, vector, this.speed * dt, stage.world, stage.obstacles)
      : before;
    this.x = next.x;
    this.y = next.y;

    const distanceMoved = Math.hypot(this.x - before.x, this.y - before.y);
    const isMoving = distanceMoved > 0.01;
    if (isMoving) {
      // Advance the walk cycle by distance, not wall-clock time. If the jelly
      // is held against a rock, it stops animating instead of sliding in place.
      this.walkPhase = (this.walkPhase + distanceMoved / 112) % 1;
      this.walkTime += dt;
      this.idleTime = 0;
      this.distanceTravelled += distanceMoved;
    } else {
      this.walkTime = 0;
      this.idleTime += dt;
    }
    this.walkBlend = damp(this.walkBlend, isMoving ? 1 : 0, 13, dt);
  }

  draw(ctx) {
    const stepWave = Math.sin(this.walkPhase * Math.PI * 2);
    const idleWave = Math.sin(this.idleTime * 2.4);
    const bob = stepWave * 2.4 * this.walkBlend + idleWave * 1.1 * (1 - this.walkBlend);
    const shadowWidth = 27 + Math.abs(stepWave) * this.walkBlend * 2;
    drawShadow(ctx, this.x, this.y + 29, shadowWidth, 8, 0.2);
    if (!this.spriteImage?.complete || !this.spriteImage.naturalWidth) {
      this.drawFallback(ctx, bob);
      return;
    }

    if (this.spriteSheet?.frameWidth) {
      const frameCount = this.spriteSheet.frameCount || 1;
      const directionFrames = this.spriteSheet.directionFrames;
      const frame = directionFrames
        ? (directionFrames[this.direction] ?? directionFrames.down ?? 0)
        : Math.floor(this.walkPhase * frameCount) % frameCount;
      const { frameWidth, frameHeight } = this.spriteSheet;
      const sourceY = this.spriteSheet.sourceY || 0;
      const sourceHeight = this.spriteSheet.sourceHeight || frameHeight;
      const destinationWidth = this.spriteSheet.destinationWidth || 72;
      const destinationHeight = this.spriteSheet.destinationHeight || 72;
      const anchorOffset = this.spriteSheet.anchorOffset || destinationHeight - 30;
      const squash = Math.abs(stepWave) * this.walkBlend * 0.035;
      const scaleX = 1 + squash * 0.35;
      const scaleY = 1 - squash;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(this.x, this.y + bob);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(
        this.spriteImage,
        frame * frameWidth,
        sourceY,
        frameWidth,
        sourceHeight,
        -destinationWidth / 2,
        -anchorOffset,
        destinationWidth,
        destinationHeight
      );
      ctx.restore();
      return;
    }

    const columns = { down: 0, up: 1, left: 0, right: 1 };
    const rows = { down: 0, up: 0, left: 1, right: 1 };
    const sourceWidth = this.spriteImage.naturalWidth / 2;
    const sourceHeight = this.spriteImage.naturalHeight / 2;
    const destinationWidth = 94;
    const destinationHeight = 82;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.spriteImage,
      columns[this.direction] * sourceWidth,
      rows[this.direction] * sourceHeight,
      sourceWidth,
      sourceHeight,
      this.x - destinationWidth / 2,
      this.y - destinationHeight + 16 + bob,
      destinationWidth,
      destinationHeight
    );
    ctx.restore();
  }

  drawFallback(ctx, bob) {
    ctx.save();
    ctx.translate(this.x, this.y - 10 + bob);
    ctx.fillStyle = '#f7f4ed';
    ctx.strokeStyle = '#1459a1';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -17, 25, Math.PI, 0);
    ctx.lineTo(23, 8);
    ctx.quadraticCurveTo(0, 23, -23, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3fa9ee';
    ctx.beginPath();
    ctx.arc(0, -29, 18, Math.PI, Math.PI * 2);
    ctx.fill();
    for (let i = -2; i <= 2; i += 1) {
      ctx.strokeStyle = '#3fa9ee';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(i * 10, 7);
      ctx.quadraticCurveTo(i * 12, 19, i * 10 + 4, 25);
      ctx.stroke();
    }
    ctx.restore();
  }
}
