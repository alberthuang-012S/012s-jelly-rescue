import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE || 'sharp');
const metadata = await sharp('reference/generated-garden-map-v1.png').metadata();
if (metadata.width !== 1024 || metadata.height !== 1536) throw new Error('Garden art must be 1024 × 1536');
await sharp('reference/generated-garden-map-v1.png').webp({ quality: 90 }).toFile('reference/runtime/garden-map-v1.webp');
await fs.writeFile('reference/art-layouts/garden-art-registration-v1.json', JSON.stringify({
  source: 'reference/generated-garden-map-v1.png', runtime: 'reference/runtime/garden-map-v1.webp',
  pixels: [1024, 1536], world: [768, 1152], scale: .75,
  collision: 'src/game/GardenStage.js', npcArt: 'city-npcs-v1 / city-condition-v2',
  products: ['reference/runtime/ddm-chibi-v1.webp', 'reference/runtime/ssw-chibi-v1.webp'],
  productReferences: ['reference/runtime/DDM+1.webp', 'reference/runtime/SSW+1.webp'],
  productPolicy: 'Transparent Q-version icons generated from preserved product photographs; see care-items-chibi-registration-v1.json.'
}, null, 2) + '\n');
console.log('Garden WebP and art registration written.');
