// Package approved source art: preserve PNG masters, compress maps, and register
// transparent character crops into a consistent 3×2 runtime atlas.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.JELLY_SHARP_MODULE || 'sharp');
const report = [];
for (const stage of ['city', 'sports']) {
  const map = `reference/generated-${stage}-map-v1.png`;
  await sharp(map).webp({ quality: 90 }).toFile(`reference/runtime/${stage}-map-v1.webp`);
  const source = `reference/generated-${stage}-npcs-v1.png`;
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = stage === 'city' ? 5 : 6;
  const crops = [];
  const layers = [];
  // City top-row shoes finish just below the nominal 512px seam.
  const seam = stage === 'city' ? 518 : Math.floor(info.height / 2);
  for (let frame = 0; frame < count; frame++) {
    const col = frame % 3; const row = Math.floor(frame / 3);
    const x0 = Math.floor(col * info.width / 3); const x1 = Math.floor((col + 1) * info.width / 3);
    const y0 = row ? seam : 0; const y1 = row ? info.height : seam;
    let left = x1, top = y1, right = x0, bottom = y0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 32) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right <= left || bottom <= top) throw new Error(`${stage} frame ${frame} is empty`);
    const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
    crops.push(crop);
    const buffer = await sharp(source).extract(crop).resize(256, 384, {
      fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3'
    }).png().toBuffer();
    layers.push({ input: buffer, left: col * 256, top: row * 384 });
  }
  const atlas = await sharp({ create: { width: 768, height: 768, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
  await fs.writeFile(`reference/runtime/${stage}-npcs-v1.png`, atlas);
  await sharp(atlas).webp({ lossless: true }).toFile(`reference/runtime/${stage}-npcs-v1.webp`);
  report.push({ stage, source, crops, runtime: { columns: 3, rows: 2, frameWidth: 256, frameHeight: 384, count } });
}
await fs.writeFile('reference/art-layouts/runtime-manifest-v1.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
