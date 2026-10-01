import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE||'sharp');
const source='reference/generated-itch-core-v1.png';
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left=info.width,top=info.height,right=0,bottom=0,clear=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3];if(alpha===0)clear++;
  if(alpha<24)continue;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
}
assert.ok(clear>info.width*info.height*.25,'Collectible icon must be genuinely transparent');
const bounds={left,top,width:right-left+1,height:bottom-top+1};
const scale=Math.min(232/bounds.width,232/bounds.height),width=Math.round(bounds.width*scale),height=Math.round(bounds.height*scale);
const icon=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([
  {input:await sharp(source).extract(bounds).resize(width,height).png().toBuffer(),left:Math.round((256-width)/2),top:Math.round((256-height)/2)}
]).png().toBuffer();
await fs.writeFile('reference/runtime/itch-core-v1.png',icon);
await sharp(icon).webp({lossless:true}).toFile('reference/runtime/itch-core-v1.webp');
console.log('PASS: transparent 256px collectible core packed with padding.');
