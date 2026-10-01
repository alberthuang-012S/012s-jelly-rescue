import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.JELLY_SHARP_MODULE||'sharp');
const clear={r:0,g:0,b:0,alpha:0};
const registration={};
async function pack(kind,size,anchors,target,groups,seam=512){
  const source=`reference/generated-alien-${kind}-v1.png`;
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,1536);assert.equal(info.height,1024);
  let clearPixels=0;for(let i=3;i<data.length;i+=4)clearPixels+=data[i]===0;
  assert.ok(clearPixels>info.width*info.height*.5,'Source must have true transparent background');
  const frames=[];
  for(let i=0;i<6;i++){
    const region={left:i%3*512,top:i<3?0:seam,width:512,height:i<3?seam:1024-seam};
    let left=1536,top=1024,right=0,bottom=0;
    for(let y=region.top;y<region.top+region.height;y++)for(let x=region.left;x<region.left+512;x++){
      if(data[(y*1536+x)*4+3]<24)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    assert.ok(right>left&&bottom>top);
    const bounds={left,top,width:right-left+1,height:bottom-top+1};
    frames.push({bounds,anchor:anchors[i],buffer:await sharp(source).extract(bounds).png().toBuffer()});
  }
  const layers=[];
  for(const group of groups){
    // Register faces (small enemies) or belly sockets (King), so wing changes
    // do not move the body or weak point between animation frames.
    const scale=Math.min(...group.flatMap(i=>{
      const f=frames[i],b=f.bounds,a=f.anchor;
      const origin=kind==='boss'&&i===5?{x:192,y:192}:target;
      return [(origin.x-12)/(a.x-b.left),(size-origin.x-12)/(b.left+b.width-a.x),
        (origin.y-12)/(a.y-b.top),(size-origin.y-12)/(b.top+b.height-a.y)];
    }));
    for(const i of group){
      const f=frames[i],width=Math.round(f.bounds.width*scale),height=Math.round(f.bounds.height*scale);
      const origin=kind==='boss'&&i===5?{x:192,y:192}:target;
      const left=Math.round(origin.x-(f.anchor.x-f.bounds.left)*scale),top=Math.round(origin.y-(f.anchor.y-f.bounds.top)*scale);
      assert.ok(left>=8&&top>=8&&left+width<=size-8&&top+height<=size-8,'Full sprite stays inside its cell');
      layers.push({input:await sharp(f.buffer).resize(width,height).png().toBuffer(),left:i%3*size+left,top:Math.floor(i/3)*size+top});
      Object.assign(f,{scale,width,height,left,top});delete f.buffer;
    }
  }
  const atlas=await sharp({create:{width:3*size,height:2*size,channels:4,background:clear}}).composite(layers).png().toBuffer();
  await fs.writeFile(`reference/runtime/alien-${kind}-v1.png`,atlas);
  await sharp(atlas).webp({lossless:true}).toFile(`reference/runtime/alien-${kind}-v1.webp`);
  registration[kind]={source,size,target,frames};
  if(kind==='boss')await sharp(atlas).extract({left:0,top:0,width:size,height:size}).webp({lossless:true}).toFile('reference/runtime/alien-king-portrait-v1.webp');
}
await pack('enemies',256,[{x:282,y:273},{x:814,y:296},{x:1318,y:285},{x:282,y:785},{x:814,y:810},{x:1318,y:797}],{x:128,y:128},[[0,3],[1,4],[2,5]]);
await pack('boss',384,[{x:287,y:424},{x:766,y:442},{x:1305,y:479},{x:311,y:861},{x:726,y:868},{x:1275,y:804}],{x:192,y:302},[[0,1,2,3,4],[5]],552);
await sharp('reference/generated-alien-map-v1.png').resize(1024,1536).png().toFile('reference/runtime/alien-map-v1.png');
await sharp('reference/runtime/alien-map-v1.png').webp({quality:94}).toFile('reference/runtime/alien-map-v1.webp');
await fs.writeFile('reference/art-layouts/alien-art-registration-v1.json',JSON.stringify(registration,null,2)+'\n');
console.log('PASS: night map, six wing frames, five registered King poses and one UFO packed with transparent cell padding.');
