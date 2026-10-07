import fs from 'node:fs';
import {createEndlessStage,seededRandom} from '../src/game/EndlessRun.js';
import {EndlessDirector} from '../src/game/EndlessDirector.js';
const runs=[];
for(const seed of [1,77,123,456,789]){
 const stage=createEndlessStage(seed),npcs=[];
 const director=new EndlessDirector(stage,{random:seededRandom(seed)});
 director.seed(npcs);director.nextEventAt=Infinity;
 let hub=0,total=0,middle=0,patrolTotal=0,patrolMiddle=0;const samples=[];
 for(let i=0;i<450;i++){
  director.update(.1,i*.1,npcs);npcs.forEach(n=>n.update(.1,stage,i*.1));
  if(i>=100&&i%5===0)for(const n of npcs.filter(n=>n.active&&!n.departing)){
   total++;if(Math.abs(n.x-384)<70)middle++;if(n.x>=300&&n.x<=468&&n.y>=410&&n.y<=680)hub++;
   if(['runner','skateboarder','basketballPlayer','deliveryWorker'].includes(n.role)){patrolTotal++;if(Math.abs(n.x-384)<70)patrolMiddle++;}
  }
  if([150,300,449].includes(i))samples.push({time:i*.1,npcs:npcs.map(n=>({role:n.role,x:+n.x.toFixed(1),y:+n.y.toFixed(1),zone:n.zone}))});
 }
 runs.push({seed,hubFraction:hub/total,middleFraction:middle/total,patrolMiddleFraction:patrolMiddle/patrolTotal,samples});
}
const report={method:'45s movement-only, events disabled to isolate routing; 5 seeded worlds, samples at 10–45s',runs};
fs.writeFileSync('qa/endless/distribution-after.json',JSON.stringify(report,null,2));console.log(runs.map(({seed,hubFraction,middleFraction,patrolMiddleFraction})=>({seed,hubFraction,middleFraction,patrolMiddleFraction})));

if(fs.existsSync('qa/endless/distribution-before.json')){
 const before=JSON.parse(fs.readFileSync('qa/endless/distribution-before.json','utf8'));
 const avg=(data,key)=>data.runs.reduce((sum,run)=>sum+run[key],0)/data.runs.length;
 console.log({beforeMiddle:avg(before,'middleFraction'),afterMiddle:avg(report,'middleFraction'),beforeHub:avg(before,'hubFraction'),afterHub:avg(report,'hubFraction')});
}
