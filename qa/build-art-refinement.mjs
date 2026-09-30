import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.JELLY_SHARP_MODULE||'sharp');
const transparent={r:0,g:0,b:0,alpha:0};
async function crop(source,region){
  const {data,info}=await sharp(source).extract(region).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*4;
    if(data[i+3]<32){data[i+3]=0;continue;}
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  assert.ok(right>left&&bottom>top,'Nonempty transparent sprite');
  const bounds={left,top,width:right-left+1,height:bottom-top+1};
  return {bounds,buffer:await sharp(data,{raw:info}).extract(bounds).png().toBuffer()};
}
async function sourceCells(source,count){
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Find the transparent gutter between rows instead of cutting off shoes/hair.
  let seam=Math.floor(info.height/2),best=Infinity;
  for(let y=Math.floor(info.height*.45);y<info.height*.55;y++){
    let pixels=0;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=32)pixels++;
    if(pixels<best||(pixels===best&&Math.abs(y-info.height/2)<Math.abs(seam-info.height/2))){best=pixels;seam=y;}
  }
  const cells=[];
  for(let i=0;i<count;i++){
    const left=Math.floor((i%3)*info.width/3),right=Math.floor((i%3+1)*info.width/3);
    cells.push(await crop(source,{left,top:i<3?0:seam,width:right-left,height:i<3?seam:info.height-seam}));
  }
  return cells;
}
const report={conditions:[],injury:[]};
for(const stage of ['city','sports']){
  const count=stage==='city'?5:6;
  const source=`reference/generated-${stage}-condition-v2.png`;
  const cells=await sourceCells(source,count),layers=[],registration=[];
  for(let i=0;i<count;i++){
    const target=await crop(`reference/runtime/${stage}-npcs-v1.png`,{left:i%3*256,top:Math.floor(i/3)*384,width:256,height:384});
    const frame=cells[i];const scale=Math.min(target.bounds.width/frame.bounds.width,target.bounds.height/frame.bounds.height);
    const width=Math.round(frame.bounds.width*scale),height=Math.round(frame.bounds.height*scale);
    const left=target.bounds.left+Math.floor((target.bounds.width-width)/2),top=target.bounds.top+target.bounds.height-height;
    layers.push({input:await sharp(frame.buffer).resize(width,height).png().toBuffer(),left:i%3*256+left,top:Math.floor(i/3)*384+top});
    registration.push({frame:i,width,height,left,top,target:target.bounds,source:frame.bounds});
  }
  const atlas=await sharp({create:{width:768,height:768,channels:4,background:transparent}}).composite(layers).png().toBuffer();
  await fs.writeFile(`reference/runtime/${stage}-condition-v2.png`,atlas);
  await sharp(atlas).webp({lossless:true}).toFile(`reference/runtime/${stage}-condition-v2.webp`);
  report.conditions.push({stage,source,registration});
}
const source='reference/generated-soreness-v3.png';
const cells=await sourceCells(source,6);
const prior=await sharp('reference/runtime/sports-injury-v2.png').ensureAlpha().raw().toBuffer();
const corrected=Buffer.from(prior);
const heights=[];
for(let row=0;row<2;row++){
  const frames=cells.slice(row*3,row*3+3);
  const scale=Math.min(300/frames[0].bounds.height,244/Math.max(...frames.map(frame=>frame.bounds.width)));
  const layers=[],registration=[];
  for(let col=0;col<3;col++){
    const frame=frames[col],width=Math.round(frame.bounds.width*scale),height=Math.round(frame.bounds.height*scale);
    layers.push({input:await sharp(frame.buffer).resize(width,height).png().toBuffer(),left:col*256+Math.floor((256-width)/2),top:380-height});
    registration.push({col,width,height,source:frame.bounds});
  }
  const buffer=await sharp({create:{width:768,height:384,channels:4,background:transparent}}).composite(layers).raw().toBuffer();
  buffer.copy(corrected,(row+2)*768*384*4);
  heights.push(registration.map(frame=>frame.height));report.injury.push({row:row+2,scale,registration});
}
assert.deepEqual(corrected.subarray(0,768*768*4),prior.subarray(0,768*768*4),'Both fall rows remain pixel-identical');
const injury=await sharp(corrected,{raw:{width:768,height:1536,channels:4}}).png().toBuffer();
await fs.writeFile('reference/runtime/sports-injury-v3.png',injury);
await sharp(injury).webp({lossless:true}).toFile('reference/runtime/sports-injury-v3.webp');
const old=JSON.parse(await fs.readFile('reference/art-layouts/injury-runtime-manifest-v1.json'));
const skate=JSON.parse(await fs.readFile('reference/art-layouts/skateboard-registration-v2.json'));
const allHeights=[old.registration.slice(0,3).map(frame=>frame.height),skate.registration.map(frame=>frame.height),...heights];
const offsets=allHeights.map(row=>row.map(height=>Number((114-(380-height)*150/384).toFixed(2))));
await fs.writeFile('src/game/InjurySpriteLayout.js',`// Generated by qa/build-art-refinement.mjs from registered alpha bounds.\nexport const INJURY_TOP_OFFSETS = Object.freeze(${JSON.stringify(offsets)}.map(row => Object.freeze(row)));\n`);
await fs.writeFile('reference/art-layouts/art-refinement-manifest-v3.json',JSON.stringify({...report,injuryTopOffsets:offsets},null,2)+'\n');
console.log('PASS: 11 expressions registered to existing proportions; 6 soreness poses packed; fall rows unchanged.');
