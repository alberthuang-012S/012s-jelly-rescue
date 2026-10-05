import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE || 'sharp');
const report = {};
for (const id of ['ddm', 'ssw']) {
  const source = `reference/generated-${id}-chibi-v1.png`;
  const runtime = `reference/runtime/${id}-chibi-v1`;
  const metadata = await sharp(source).metadata();
  const stats = await sharp(source).stats();
  if (!metadata.hasAlpha || stats.channels.at(-1).min !== 0 || stats.channels.at(-1).max !== 255) throw new Error(`${id}: expected real transparent alpha and opaque bottle`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const corners = [0, info.width - 1, (info.height - 1) * info.width, info.height * info.width - 1].map(pixel => data[pixel * info.channels + info.channels - 1]);
  if (corners.some(alpha => alpha !== 0)) throw new Error(`${id}: canvas corners must be transparent`);
  const sprite = await sharp(source).trim().resize(224, 352, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await fs.writeFile(`${runtime}.png`, sprite);
  await sharp(sprite).webp({ lossless: true }).toFile(`${runtime}.webp`);
  const final = await sharp(`${runtime}.webp`).metadata();
  if (final.width !== 256 || final.height !== 384 || !final.hasAlpha) throw new Error(`${id}: invalid runtime sprite`);
  report[id] = { source, sourceSize: [metadata.width, metadata.height], runtime: [`${runtime}.webp`, `${runtime}.png`], runtimeSize: [256, 384], hasAlpha: final.hasAlpha, transparentCorners: corners, bytes: (await fs.stat(`${runtime}.webp`)).size };
}
await fs.writeFile('reference/art-layouts/care-items-chibi-registration-v1.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
