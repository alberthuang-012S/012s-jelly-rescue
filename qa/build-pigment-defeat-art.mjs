import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE || 'sharp');
const source = 'reference/generated-pigment-queen-defeat-v2.png';
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * 4 + 3];
  if (alpha === 0) transparent++;
  if (alpha < 32) continue;
  left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
}
assert.ok(transparent / (info.width * info.height) > .35);
assert.ok(left > 2 && top > 2 && right < info.width - 3 && bottom < info.height - 3, 'Complete silhouette and transparent margins required');
const bounds = { left: left - 2, top: top - 2, width: right - left + 5, height: bottom - top + 5 };
const registration = JSON.parse(await fs.readFile('reference/art-layouts/pigment-art-registration-v1.json', 'utf8'));
const size = 384, foot = registration.boss[5].foot;
const scale = Math.min(registration.boss[5].height / bounds.height, (size - 24) / bounds.width);
const width = Math.round(bounds.width * scale), height = Math.round(bounds.height * scale);
const position = { left: Math.round(foot.x - width / 2), top: foot.y - height };
const image = await sharp(source).extract(bounds).resize(width, height).png().toBuffer();
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const cell = await sharp({ create: { width: size, height: size, channels: 4, background: clear } }).composite([{ input: image, ...position }]).png().toBuffer();
// Copy raw rows to preserve every channel in the untouched frames, including
// semitransparent edge colors that alpha compositing can round by one level.
const atlas = await sharp('reference/runtime/pigment-queen-v1.png').ensureAlpha().raw().toBuffer();
const replacement = await sharp(cell).ensureAlpha().raw().toBuffer();
for (let y = 0; y < size; y++) replacement.copy(atlas, ((size + y) * size * 3 + size * 2) * 4, y * size * 4, (y + 1) * size * 4);
const png = 'reference/runtime/pigment-queen-v2.png';
await sharp(atlas, { raw: { width: size * 3, height: size * 2, channels: 4 } }).png().toFile(png);
await sharp(png).webp({ lossless: true }).toFile(png.replace('.png', '.webp'));
await fs.writeFile('reference/art-layouts/pigment-defeat-registration-v2.json', `${JSON.stringify({ source, frame: 5, bounds, ...position, width, height, foot }, null, 2)}\n`);
for (let frame = 0; frame < 5; frame++) {
  const region = { left: frame % 3 * size, top: Math.floor(frame / 3) * size, width: size, height: size };
  assert.deepEqual(await sharp(png).extract(region).raw().toBuffer(), await sharp('reference/runtime/pigment-queen-v1.png').extract(region).raw().toBuffer(), `Frame ${frame} must be pixel-identical`);
}
console.log('PASS: Tearful defeat pose replaces frame 5; five combat poses are pixel-identical and feet stay registered.');
