import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {GRAVITY_CORE_ANCHORS} from '../src/game/GravityArt.js';
const sharp=createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE||'sharp');
const clear={r:0,g:0,b:0,alpha:0};
const registration={};
async function frames(source,rows){
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent=0;for(let i=3;i<data.length;i+=4)transparent+=data[i]===0;
  assert.ok(transparent/(info.width*info.height)>.45,'Real alpha transparency required');
  function seam(axis, hint, spread, crossStart=0, crossEnd=axis==='x'?info.height:info.width) {
    const length=axis==='x'?info.width:info.height;
    const start=Math.max(1,Math.round((hint-spread)*length)),end=Math.min(length-1,Math.round((hint+spread)*length));
    let bandStart=-1,bestStart=-1,bestLength=0;
    for(let coordinate=start;coordinate<=end;coordinate++){
      let occupied=false;
      for(let cross=crossStart;cross<crossEnd;cross++){
        const x=axis==='x'?coordinate:cross,y=axis==='x'?cross:coordinate;
        if(data[(y*info.width+x)*4+3]>=24){occupied=true;break;}
      }
      if(!occupied&&bandStart<0)bandStart=coordinate;
      if((occupied||coordinate===end)&&bandStart>=0){
        const width=coordinate-bandStart;if(width>bestLength){bestStart=bandStart;bestLength=width;}bandStart=-1;
      }
    }
    assert.ok(bestLength>=2,`${source}: must have transparent separation at ${axis} ${hint}`);
    return Math.round(bestStart+bestLength/2);
  }
  const rowEdges=rows.map((r,i)=>i===0?0:i===rows.length-1?info.height:seam('y',r,.04));
  const cells=[];
  for(let row=0;row<rows.length-1;row++){
    const columns=[0,seam('x',1/3,.06,rowEdges[row],rowEdges[row+1]),seam('x',2/3,.06,rowEdges[row],rowEdges[row+1]),info.width];
    for(let col=0;col<3;col++){
    const region={left:columns[col],right:columns[col+1],top:rowEdges[row],bottom:rowEdges[row+1]};
    let left=info.width,top=info.height,right=-1,bottom=-1;
    for(let y=region.top;y<region.bottom;y++)for(let x=region.left;x<region.right;x++){
      if(data[(y*info.width+x)*4+3]<24)continue;
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    assert.ok(right>left&&bottom>top,'Each pose must be present');
    assert.ok(left>region.left&&right<region.right-1&&top>region.top&&bottom<region.bottom-1,JSON.stringify({source,row,col,region,bounds:{left,top,right,bottom}}));
    const bounds={left,top,width:right-left+1,height:bottom-top+1};
    cells.push({bounds,buffer:await sharp(source).extract(bounds).png().toBuffer()});
    }
  }
  return cells;
}
async function pack(source,kind,size,rows){
  const cells=await frames(source,rows),target={x:size/2,y:size*.9};
  const scale=Math.min(...cells.flatMap(f=>[(size-20)/f.bounds.width,(target.y-10)/f.bounds.height]));
  const layers=[];
  for(let i=0;i<cells.length;i++){
    const f=cells[i],width=Math.round(f.bounds.width*scale),height=Math.round(f.bounds.height*scale);
    const left=Math.round(target.x-width/2),top=Math.round(target.y-height);
    assert.ok(left>=8&&top>=8&&left+width<=size-8&&top+height<=size-8);
    layers.push({input:await sharp(f.buffer).resize(width,height).png().toBuffer(),left:i%3*size+left,top:Math.floor(i/3)*size+top});
    Object.assign(f,{width,height,left,top});delete f.buffer;
  }
  const atlas=await sharp({create:{width:size*3,height:size*(rows.length-1),channels:4,background:clear}}).composite(layers).png().toBuffer();
  await fs.writeFile(`reference/runtime/gravity-${kind}-v1.png`,atlas);
  await sharp(atlas).webp({lossless:true}).toFile(`reference/runtime/gravity-${kind}-v1.webp`);
  registration[kind]={source,size,target,scale,frames:cells};
  return atlas;
}
for(const type of ['stiff','stomper','heavy'])await pack(`reference/generated-gravity-${type}-v1.png`,type,256,[0,.5,1]);
const boss=await pack('reference/generated-gravity-boss-v1.png','boss',384,[0,.365,.67,1]);
registration.boss.coreAnchors=GRAVITY_CORE_ANCHORS;
await sharp(boss).extract({left:0,top:0,width:384,height:384}).webp({lossless:true}).toFile('reference/runtime/gravity-king-portrait-v1.webp');
await sharp('reference/generated-gravity-map-v1.png').resize(1024,1536).png().toFile('reference/runtime/gravity-map-v1.png');
await sharp('reference/runtime/gravity-map-v1.png').webp({quality:94}).toFile('reference/runtime/gravity-map-v1.webp');
await fs.writeFile('reference/art-layouts/gravity-art-registration-v1.json',JSON.stringify(registration,null,2)+'\n');
console.log('PASS: gravity map, 18 small-creature poses, nine King poses and home portrait; real transparency and fixed foot registration.');
