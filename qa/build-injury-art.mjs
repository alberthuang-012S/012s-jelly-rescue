import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.JELLY_SHARP_MODULE || 'sharp');
const source = 'reference/generated-sports-injury-v1.png';
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== 1086 || info.height !== 1448) throw new Error('Source atlas changed; remeasure crop regions.');
// Measured cell boundaries: source art is almost a grid, but the top row
// finishes below the nominal seam and the skateboard spans a wider cell.
const regions = [
  [0, 0, 362, 380], [362, 0, 362, 380], [724, 0, 362, 380],
  [0, 380, 362, 338], [362, 380, 384, 340], [746, 380, 340, 340],
  [0, 718, 362, 350], [362, 720, 362, 358], [724, 720, 362, 358],
  [0, 1068, 362, 380], [362, 1078, 362, 370], [724, 1078, 362, 370]
];
const frames = [];
for (const [left, top, width, height] of regions) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) data.copy(pixels, y * width * 4,
    ((top + y) * info.width + left) * 4, ((top + y) * info.width + left + width) * 4);
  for (let p = 0; p < width * height; p++) if (pixels[p * 4 + 3] < 32) pixels[p * 4 + 3] = 0;
  // Exclude tiny disconnected seam fragments from neighbouring frames.
  const visited = new Uint8Array(width * height);
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || pixels[start * 4 + 3] < 32) continue;
    const queue = [start]; visited[start] = 1;
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], x = p % width, y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const q = ny * width + nx;
        if (!visited[q] && pixels[q * 4 + 3] >= 32) { visited[q] = 1; queue.push(q); }
      }
    }
    if (queue.length < 128) for (const p of queue) pixels[p * 4 + 3] = 0;
  }
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] < 32) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x1 <= x0 || y1 <= y0) throw new Error('Empty injury frame');
  const bounds = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  const buffer = await sharp(pixels, { raw: { width, height, channels: 4 } }).extract(bounds).png().toBuffer();
  frames.push({ buffer, bounds, region: { left, top, width, height } });
}
const layers = [], registration = [];
for (let row = 0; row < 4; row++) {
  const group = frames.slice(row * 3, row * 3 + 3);
  // One scale per character: sitting/kneeling frames stay shorter than upright
  // frames. All feet share the baseline, instead of stretching each pose.
  const scale = Math.min(307 / group[0].bounds.height, ...group.map((f) => 244 / f.bounds.width));
  for (let col = 0; col < 3; col++) {
    const frame = group[col];
    const w = Math.round(frame.bounds.width * scale), h = Math.round(frame.bounds.height * scale);
    layers.push({ input: await sharp(frame.buffer).resize(w, h).png().toBuffer(),
      left: col * 256 + Math.round((256 - w) / 2), top: row * 384 + 380 - h });
    registration.push({ row, col, region: frame.region, bounds: frame.bounds, scale, width: w, height: h });
  }
}
const atlas = await sharp({ create: { width: 768, height: 1536, channels: 4,
  background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
await fs.writeFile('reference/runtime/sports-injury-v1.png', atlas);
await sharp(atlas).webp({ lossless: true }).toFile('reference/runtime/sports-injury-v1.webp');
await fs.writeFile('reference/art-layouts/injury-runtime-manifest-v1.json', JSON.stringify({
  columns: 3, rows: 4, frameWidth: 256, frameHeight: 384, footBaseline: 380,
  roles: ['basketballPlayer', 'skateboarder', 'runner', 'fitnessGuy'], registration
}, null, 2) + '\n');
console.log('Packaged 12 transparent poses with a shared per-character scale and foot baseline.');
