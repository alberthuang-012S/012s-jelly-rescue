import { clamp } from './utils.js';

export function statusBounds(layout) {
  const above = Math.max(layout.showBar ? layout.barGap + layout.barHeight : 0, layout.pointerHeight);
  return { x: layout.bubbleX, y: layout.bubbleY - above,
    width: Math.max(layout.bubbleWidth, layout.showBar ? layout.barWidth : 0),
    height: above + layout.bubbleHeight + layout.pointerHeight };
}

function overlap(a, b, gap = 0) {
  const width = Math.min(a.x + a.width + gap, b.x + b.width) - Math.max(a.x - gap, b.x);
  const height = Math.min(a.y + a.height + gap, b.y + b.height) - Math.max(a.y - gap, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

// Work in world coordinates, with screen-sized gaps. No NPC/gameplay state is changed.
export function layoutStatusBubbles(entries, visibleBounds, bodies = []) {
  const result = new Map(), placed = [];
  const ordered = [...entries].sort((a, b) => Number(b.layout.isCritical) - Number(a.layout.isCritical)
    || a.layout.anchorY - b.layout.anchorY || String(a.npc.id).localeCompare(String(b.npc.id)));
  for (const { npc, layout } of ordered) {
    const gap = 6 / layout.scale;
    const above = Math.max(layout.showBar ? layout.barGap + layout.barHeight : 0, layout.pointerHeight);
    const minX = visibleBounds.left + layout.safePadding;
    const maxX = Math.max(minX, visibleBounds.right - layout.safePadding - layout.bubbleWidth);
    const minY = visibleBounds.top + layout.safePadding + above;
    const maxY = Math.max(minY, visibleBounds.bottom - layout.safePadding - layout.bubbleHeight - layout.pointerHeight);
    const stepY = above + layout.bubbleHeight + layout.pointerHeight + gap;
    const stepX = layout.bubbleWidth + gap;
    const candidates = [];
    for (let row = -5; row <= 5; row++) for (let col = -2; col <= 2; col++) {
      const x = clamp(layout.bubbleX + col * stepX / 2, minX, maxX);
      const y = clamp(layout.bubbleY + row * stepY, minY, maxY);
      const candidate = { ...layout, bubbleX: x, bubbleY: y, bubbleCenterX: x + layout.bubbleWidth / 2 };
      const bounds = statusBounds(candidate);
      const collision = placed.reduce((sum, rect) => sum + overlap(bounds, rect, gap), 0);
      // The pointer may touch its character; only the text/bar panel must clear bodies.
      const panel = { ...bounds, height: bounds.height - layout.pointerHeight };
      const coveredBodies = bodies.reduce((sum, rect) => sum
        + overlap(rect.protected ? bounds : panel, rect, rect.protected ? gap : 0), 0);
      const distance = Math.abs(x - layout.bubbleX) + Math.abs(y - layout.bubbleY) * 1.15;
      candidates.push({ candidate, bounds, score: collision * 1000 + coveredBodies * 100 + distance });
    }
    candidates.sort((a, b) => a.score - b.score);
    const { candidate, bounds } = candidates[0];
    candidate.pointerPointsUp = candidate.bubbleY >= layout.footY;
    candidate.pointerX = clamp(layout.anchorX, candidate.bubbleX + layout.pointerSafeInset,
      candidate.bubbleX + candidate.bubbleWidth - layout.pointerSafeInset);
    result.set(npc, candidate); placed.push(bounds);
  }
  return result;
}
