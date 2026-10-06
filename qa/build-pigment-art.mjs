import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE || 'sharp');
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const registration = { version: 1, boss: [], enemies: [], props: [] };

async function cells(source, columns, rows) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
  assert.ok(transparent / (info.width * info.height) > .35, `${source}: genuine alpha required`);
  const result = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x0 = Math.round(col * info.width / columns), x1 = Math.round((col + 1) * info.width / columns);
    const y0 = Math.round(row * info.height / rows), y1 = Math.round((row + 1) * info.height / rows);
    let left = x1, top = y1, right = -1, bottom = -1;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    assert.ok(right > left && bottom > top, `${source}: missing cell ${row}/${col}`);
    assert.ok(left > x0 && right < x1 - 1 && top > y0 && bottom < y1 - 1, `${source}: clipped cell ${row}/${col}`);
    const bounds = { left: Math.max(x0, left - 2), top: Math.max(y0, top - 2), width: right - left + 5, height: bottom - top + 5 };
    result.push({ bounds, buffer: await sharp(source).extract(bounds).png().toBuffer() });
  }
  return result;
}
async function output(layers, name, width, height) {
  const png = `reference/runtime/pigment-${name}-v1.png`;
  await sharp({ create: { width, height, channels: 4, background: clear } }).composite(layers).png().toFile(png);
  await sharp(png).webp({ lossless: true }).toFile(png.replace('.png', '.webp'));
}
const boss = await cells('reference/generated-pigment-queen-v1.png', 3, 2);
const enemies = await cells('reference/generated-pigment-enemies-v1.png', 3, 2);
for (const [name, frames, size] of [['queen', boss, 384], ['enemies', enemies, 256]]) {
  const uniform = Math.min(...frames.flatMap(f => [(size - 24) / f.bounds.width, (size * .9 - 12) / f.bounds.height]));
  const layers = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], width = Math.round(f.bounds.width * uniform), height = Math.round(f.bounds.height * uniform);
    const left = Math.round((size - width) / 2), top = Math.round(size * .9) - height;
    layers.push({ input: await sharp(f.buffer).resize(width, height).png().toBuffer(), left: i % 3 * size + left, top: Math.floor(i / 3) * size + top });
    registration[name === 'queen' ? 'boss' : 'enemies'].push({ frame: i, source: f.bounds, left, top, width, height, foot: { x: size / 2, y: Math.round(size * .9) } });
  }
  await output(layers, name, size * 3, size * 2);
}
const props = await cells('reference/generated-pigment-props-v1.png', 3, 1);
for (const [i, name] of ['crystal', 'shield', 'core'].entries()) {
  const f = props[i], { data, info } = await sharp(f.buffer).resize(224, 220, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  const left = Math.round((256 - info.width) / 2), top = 230 - info.height;
  await output([{ input: data, left, top }], name, 256, 256);
  registration.props.push({ name, source: f.bounds, left, top, width: info.width, height: info.height, foot: { x: 128, y: 230 } });
}
await fs.writeFile('reference/art-layouts/pigment-art-registration-v1.json', `${JSON.stringify(registration, null, 2)}\n`);
await sharp('reference/generated-pigment-map-v1.png').resize(1024, 1536).png().toFile('reference/runtime/pigment-map-v1.png');
await sharp('reference/runtime/pigment-map-v1.png').webp({ quality: 94 }).toFile('reference/runtime/pigment-map-v1.webp');
console.log('PASS: Pigment sprites retain real alpha, unclipped silhouettes and fixed foot anchors.');
