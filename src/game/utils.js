export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function chance(probability) {
  return Math.random() < probability;
}

export function formatClock(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function formatScore(value) {
  return Math.max(0, Math.round(value)).toString().padStart(5, '0');
}

export function roundedRect(ctx, x, y, width, height, radius = 8) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function circleHitsRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
}

export function moveWithCollision(position, radius, vector, distanceToMove, world, obstacles) {
  const desiredX = clamp(position.x + vector.x * distanceToMove, radius, world.width - radius);
  const desiredY = clamp(position.y + vector.y * distanceToMove, radius, world.height - radius);
  const next = { x: position.x, y: position.y };
  const xCandidate = { x: desiredX, y: position.y, radius };
  if (!obstacles.some((obstacle) => circleHitsRect(xCandidate, obstacle))) next.x = desiredX;
  const yCandidate = { x: next.x, y: desiredY, radius };
  if (!obstacles.some((obstacle) => circleHitsRect(yCandidate, obstacle))) next.y = desiredY;
  return next;
}

export function drawText(ctx, text, x, y, options = {}) {
  const { size = 14, color = '#14283d', weight = 700, align = 'center', baseline = 'middle', font = 'Nunito, system-ui, sans-serif' } = options;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawShadow(ctx, x, y, width = 32, height = 10, alpha = 0.18) {
  ctx.save();
  ctx.fillStyle = `rgba(25, 43, 56, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

