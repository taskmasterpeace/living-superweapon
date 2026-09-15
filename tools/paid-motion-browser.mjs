import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkoutIdentity,assertSameCheckout} from './playtest/identity.mjs';
const base=process.env.PW_URL||'http://127.0.0.1:5193',out='artifacts/paid-motion-review';
await mkdir(out,{recursive:true});
assertSameCheckout(await checkoutIdentity(process.cwd()),await (await fetch(base+'/__pw_playtest_identity')).json());
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/animation-library.html');
 await page.waitForFunction(()=>window.animationLibrary?.hasRig);
 await page.waitForFunction(()=>document.querySelector('#load-full-motions')?.textContent.includes('studies loaded'),{},{timeout:90000});
 const reviews=[];
 for(const take of ['Paid_AS_SV_Fly_idle_React','Paid_AS_SV_Fly_Front_React','Paid_AS_SV_Fly_Catch']){
  await page.locator('#search').fill(take);
  await page.locator('#clips button').filter({hasText:take}).first().click();
  if(await page.evaluate(()=>window.animationLibrary.playing))await page.locator('#play').click();
  for(const phase of [0,.25,.5,.75,1]){
   await page.locator('#scrub').fill(String(phase));
   await page.getByRole('button',{name:'Side',exact:true}).click();
   await page.screenshot({path:`${out}/${take}-${phase}.png`});
  }
  reviews.push({take,phases:[0,.25,.5,.75,1],view:'side'});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(out+'/result.json',JSON.stringify({reviews,errors,acceptance:'Captured phase review; visual acceptance requires inspecting frames.'},null,2));
 console.log(JSON.stringify({reviews:reviews.length,frames:reviews.length*5,errors}));
}finally{await browser.close();}
