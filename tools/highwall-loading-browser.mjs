import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/highwall/resume',{recursive:true});
const browser=await chromium.launch({headless:false});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 // Delay the boot module only to inspect the real first-paint loading state.
 let release;const held=new Promise(r=>release=r);
 await page.route('**/src/pw-main.js',async route=>{await held;await route.continue();});
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=systems',{waitUntil:'commit'});
 await page.locator('#warworld-boot-loading img').waitFor();
 await page.waitForFunction(()=>document.querySelector('#warworld-boot-loading img')?.naturalWidth>0);
 await page.screenshot({path:'artifacts/highwall/resume/loading-screen.png'});release();
 await page.waitForFunction(()=>window.PW?.game?._highwall?.ready&&!document.querySelector('#highwall-loading'),{},{timeout:60000});
 assert.equal(await page.locator('#warworld-boot-loading').count(),0);
 console.log('Actual first-paint image and automatic transition passed.');
}finally{await browser.close();}
