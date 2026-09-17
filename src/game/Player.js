import { drawShadow, moveWithCollision } from './utils.js';

export class Player {
  constructor(spriteImage) {
    this.spriteImage = spriteImage;
    this.radius = 25;
    this.speed = 205;
    this.x = 200;
    this.y = 450;
    this.direction = 'down';
    this.walkTime = 0;
    this.distanceTravelled = 0;
  }

  reset(startPosition) {
    this.x = startPosition.x;
    this.y = startPosition.y;
    this.direction = 'down';
    this.walkTime = 0;
    this.distanceTravelled = 0;
  }

  update(dt, input, stage) {
    const vector = input.getMovementVector();
    const moving = vector.x !== 0 || vector.y !== 0;
    if (moving) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) this.direction = vector.x < 0 ? 'left' : 'right';
      else this.direction = vector.y < 0 ? 'up' : 'down';
      this.walkTime += dt;
      const before = { x: this.x, y: this.y };
      const next = moveWithCollision({ x: this.x, y: this.y }, this.radius, vector, this.speed * dt, stage.world, stage.obstacles);
      this.x = next.x;
      this.y = next.y;
      this.distanceTravelled += Math.hypot(this.x - before.x, this.y - before.y);
    } else {
      this.walkTime = 0;
    }
  }

  draw(ctx) {
    const moving = this.walkTime > 0;
    const bob = moving ? Math.sin(this.walkTime * 14) * 2.4 : Math.sin(performance.now() / 600) * 1.2;
    drawShadow(ctx, this.x, this.y + 29, 27, 8, 0.2);
    if (!this.spriteImage?.complete || !this.spriteImage.naturalWidth) {
      this.drawFallback(ctx, bob);
      return;
    }

    const columns = { down: 0, up: 1, left: 0, right: 1 };
    const rows = { down: 0, up: 0, left: 1, right: 1 };
    const sourceWidth = this.spriteImage.naturalWidth / 2;
    const sourceHeight = this.spriteImage.naturalHeight / 2;
    const destinationWidth = 94;
    const destinationHeight = 82;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
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

