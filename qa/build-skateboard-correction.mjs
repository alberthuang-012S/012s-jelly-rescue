import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.JELLY_SHARP_MODULE||'sharp');
const source='reference/generated-skateboard-fall-v2.png';
const regions=[{left:0,top:0,width:536,height:1024},{left:536,top:0,width:531,height:1024},{left:1067,top:0,width:469,height:1024}];
const frames=[];
for(const region of regions){
  const {data,info}=await sharp(source).extract(region).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const offset=(y*info.width+x)*4;
    if(data[offset+3]<32){data[offset+3]=0;continue;}
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const bounds={left,top,width:right-left+1,height:bottom-top+1};
  const buffer=await sharp(data,{raw:info}).extract(bounds).png().toBuffer();
  frames.push({buffer,bounds,region});
}
const scale=Math.min(307/frames[0].bounds.height,244/Math.max(...frames.map(frame=>frame.bounds.width)));
const composites=[];const registration=[];
for(let col=0;col<3;col++){
  const frame=frames[col],width=Math.round(frame.bounds.width*scale),height=Math.round(frame.bounds.height*scale);
  composites.push({input:await sharp(frame.buffer).resize(width,height).png().toBuffer(),left:col*256+Math.floor((256-width)/2),top:380-height});
  registration.push({col,region:frame.region,bounds:frame.bounds,scale,width,height});
}
const row=await sharp({create:{width:768,height:384,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toBuffer();
await fs.writeFile('reference/runtime/skateboard-fall-v2.png',row);
const original='reference/runtime/sports-injury-v1.png';
// Copy RGBA bytes directly so alpha compositing cannot round untouched edges.
const originalRaw=await sharp(original).ensureAlpha().raw().toBuffer();
const correctedRaw=Buffer.from(originalRaw);
(await sharp(row).ensureAlpha().raw().toBuffer()).copy(correctedRaw,768*384*4);
const atlas=await sharp(correctedRaw,{raw:{width:768,height:1536,channels:4}}).png().toBuffer();
await fs.writeFile('reference/runtime/sports-injury-v2.png',atlas);
await sharp(atlas).webp({lossless:true}).toFile('reference/runtime/sports-injury-v2.webp');
for(const index of [0,2,3]){
  const region={left:0,top:index*384,width:768,height:384};
  assert.deepEqual(await sharp(original).extract(region).raw().toBuffer(),await sharp(atlas).extract(region).raw().toBuffer());
}
await fs.writeFile('reference/art-layouts/skateboard-registration-v2.json',JSON.stringify({source,columns:3,frameWidth:256,frameHeight:384,footBaseline:380,registration,preservedRows:[0,2,3]},null,2)+'\n');
console.log('PASS: skateboard correction packed; other three character rows remain pixel-identical.');
