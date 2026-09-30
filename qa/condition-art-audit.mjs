import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.JELLY_PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,JELLY_PORT:'4180'},windowsHide:true});
let browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1250,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const groups=[];
  for(const group of ['park-itch','park-sore','mountain-itch','mountain-sore','city-itch','city-sore','sports-itch','sports-sore']){
    await page.goto(`http://localhost:4180/qa/condition-art-audit.html?group=${group}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>Boolean(window.__auditReady));
    groups.push({group,...await page.evaluate(()=>window.__auditReady)});
    await page.screenshot({path:`qa/scenarios/art-audit-${group}.png`,fullPage:true});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  await fs.writeFile('qa/scenarios/condition-art-audit-report.json',JSON.stringify({groups,errors},null,2)+'\n');
  console.log(JSON.stringify({groups,errors}));
}finally{await browser?.close();server.kill();}
