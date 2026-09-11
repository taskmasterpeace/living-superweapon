import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5184';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
page.setDefaultTimeout(15000);
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});

try{
 await page.goto(base+'/powerworld.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.LSW?.game?.world?.renderer);
 await page.locator('#pwTitle .pwtab[data-pick="you"]').evaluate(element=>element.click());
 await page.waitForSelector('#hSelect.on',{state:'visible'});
 const selected=page.locator('#hSelect .scard.on');
 await page.waitForSelector('#hSelect .scard.on.portrait-ready');
 assert.ok(await selected.locator('img.sportrait').evaluate(image=>image.naturalWidth>0),'selected fighter portrait did not render');
 assert.equal(await selected.locator('.ssil').evaluate(initial=>getComputedStyle(initial).opacity),'0','initial fallback remained visible over a loaded portrait');
 await page.keyboard.press('ArrowRight');
 const next=page.locator('#hSelect .scard.on');
 await page.waitForSelector('#hSelect .scard.on.portrait-ready');
 assert.ok(await next.locator('img.sportrait').evaluate(image=>image.naturalWidth>0),'newly selected fighter portrait did not render');
 const tempest=page.locator('#hSelect .scard').filter({hasText:'TEMPEST'}).first();
 await tempest.evaluate(card=>card.click());
 await page.waitForFunction(()=>document.querySelectorAll('#hSelect .scard.portrait-ready').length>=12,null,{timeout:10000});
 assert.deepEqual(errors,[]);
 console.log('PASS bottom character filmstrip uses rendered fighter portraits with an initials fallback');
}finally{await browser.close();}
