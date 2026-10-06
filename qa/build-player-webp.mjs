import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE || 'sharp');
const files = [
  ['reference/runtime/jelly-anthropomorphic-player-walk-v12.png', 'reference/runtime/jelly-anthropomorphic-player-walk-v12.webp', 90],
  ['reference/jelly-anthropomorphic-home.png', 'reference/runtime/jelly-anthropomorphic-home-v1.webp', 90],
  ['reference/player-jelly-preferred.png', 'reference/runtime/player-jelly-preferred-v1.webp', null]
];
const report = [];
await fs.mkdir('qa/player-webp', { recursive: true });
for (const [source, output, quality] of files) {
  await sharp(source).webp(quality ? { quality, alphaQuality: 100, effort: 6 } : { lossless: true, effort: 6 }).toFile(output);
  const original = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const converted = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(converted.info.width, original.info.width); assert.equal(converted.info.height, original.info.height);
  let transparentPixels = 0, visiblePixels = 0, differentChannels = 0;
  for (let i = 0; i < original.data.length; i += 4) {
    assert.equal(converted.data[i + 3], original.data[i + 3], `${source}: alpha changed at pixel ${i / 4}`);
    if (!original.data[i + 3]) { transparentPixels++; continue; }
    visiblePixels++;
    for (let channel = 0; channel < 3; channel++) {
      if (converted.data[i + channel] !== original.data[i + channel]) differentChannels++;
      if (!quality) assert.equal(converted.data[i + channel], original.data[i + channel], `${source}: visible color changed at pixel ${i / 4}`);
    }
  }
  // Compare at the actual player/hero display size on both dark and light
  // backgrounds. The atlas retains all sixteen original cells and resolution.
  const display = [];
  if (quality) for (const background of ['#173249', '#f5ecd8']) {
    let total = 0, squared = 0, channels = 0;
    const walk = source.includes('walk-v12');
    for (let frame = 0; frame < (walk ? 16 : 1); frame++) {
      const get = async path => {
        let pipeline = sharp(path);
        if (walk) pipeline = pipeline.extract({ left: frame % 4 * 420, top: Math.floor(frame / 4) * 400, width: 420, height: 400 });
        return pipeline.resize(walk ? 84 : 200, walk ? 92 : 200, { fit: 'fill' }).flatten({ background }).raw().toBuffer();
      };
      const a = await get(source), b = await get(output);
      for (let i = 0; i < a.length; i++) { const delta = Math.abs(a[i] - b[i]); total += delta; squared += delta * delta; channels++; }
    }
    const meanDelta = total / channels, psnr = 10 * Math.log10(255 ** 2 / (squared / channels));
    assert.ok(meanDelta < (walk ? 1 : 3), `${source}: display difference too large`);
    display.push({ background, meanDelta, psnr });
  }
  const pngBytes = (await fs.stat(source)).size, webpBytes = (await fs.stat(output)).size;
  assert.ok(webpBytes < pngBytes);
  report.push({ source, output, width: original.info.width, height: original.info.height, pngBytes, webpBytes,
    reduction: `${((1 - webpBytes / pngBytes) * 100).toFixed(1)}%`, quality, lossless: !quality,
    visiblePixels, transparentPixels, alphaIdentical: true, visibleColorsIdentical: differentChannels === 0, display });
}
await fs.writeFile('qa/player-webp/art-report.json', `${JSON.stringify(report, null, 2)}\n`);
const layers = [{ input: Buffer.from('<svg width="704" height="32"><text x="24" y="24" fill="white" font-size="20">PNG original</text><text x="376" y="24" fill="white" font-size="20">WebP Q90</text></svg>'), left: 0, top: 0 }];
for (const [side, path] of [[0, files[1][0]], [1, files[1][1]]]) layers.push({ input: await sharp(path).resize(200, 200).png().toBuffer(), left: 76 + side * 352, top: 38 });
for (let frame = 0; frame < 16; frame++) for (const [side, path] of [[0, files[0][0]], [1, files[0][1]]]) {
  layers.push({ input: await sharp(path).extract({ left: frame % 4 * 420, top: Math.floor(frame / 4) * 400, width: 420, height: 400 }).resize(84, 92, { fit: 'fill' }).png().toBuffer(), left: 8 + side * 352 + frame % 4 * 84, top: 250 + Math.floor(frame / 4) * 92 });
}
await sharp({ create: { width: 704, height: 626, channels: 4, background: '#173249' } }).composite(layers).png().toFile('qa/player-webp/quality-comparison.png');
console.log(JSON.stringify(report, null, 2));
