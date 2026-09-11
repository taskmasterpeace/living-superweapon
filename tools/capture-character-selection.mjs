import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5184';
const out='artifacts/gameplay-loop-screenshots-2026-09-11';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));

try{
 await page.goto(base+'/powerworld.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.LSW?.game?.world?.renderer);
 await page.waitForSelector('#pwTitle',{state:'visible'});
 await page.waitForTimeout(900);
 await page.screenshot({path:`${out}/14-powerworld-character-roster.png`});

 await page.locator('#pwTitle .pwtab[data-pick="you"]').click();
 await page.waitForSelector('#hSelect.on',{state:'visible'});
 const tempest=page.locator('#hSelect .scard').filter({hasText:'TEMPEST'}).first();
 if(await tempest.count())await tempest.click();
 await page.waitForFunction(()=>{
  const cards=document.querySelectorAll('#hSelect .scard');
  return cards.length>0&&document.querySelectorAll('#hSelect .scard.portrait-ready').length===cards.length;
 },null,{timeout:120000});
 await page.screenshot({path:`${out}/15-character-selection-live-preview.png`});

 await writeFile(`${out}/character-selection-capture-results.json`,JSON.stringify({base,viewport:[1600,900],errors},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
