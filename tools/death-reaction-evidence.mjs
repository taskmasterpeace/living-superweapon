// Mission A evidence harness — captures death/reaction clips PLAYING ON THE ACTUAL
// 53-bone modular hero rig via animation-library.html (same seam the runtime uses).
// Generalizes tools/paid-motion-browser.mjs: takes, views and output are arguments.
//   PW_URL=http://localhost:5180 node tools/death-reaction-evidence.mjs \
//     [--out=DIR] [--views=front,side] [take ...]
// Phases captured per view: 0 (start), .25, .5 (mid), .75, 1 (final pose).
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkoutIdentity,assertSameCheckout} from './playtest/identity.mjs';
const args=process.argv.slice(2);
const base=process.env.PW_URL||'http://127.0.0.1:5193';
const out=args.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/asset-lab/death-reaction-evidence';
const views=(args.find(a=>a.startsWith('--views='))?.slice(8)||'front,side').split(',');
const takes=args.filter(a=>!a.startsWith('--'));
if(!takes.length)takes.push('Paid_AS_KG_Front_Getup','Paid_AS_KG_Back_Getup');
await mkdir(out,{recursive:true});
assertSameCheckout(await checkoutIdentity(process.cwd()),await (await fetch(base+'/__pw_playtest_identity')).json());
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/animation-library.html');
 await page.waitForFunction(()=>window.animationLibrary?.hasRig);
 const btn=page.locator('#load-full-motions');
 if(await btn.isEnabled().catch(()=>false))await btn.click();
 await page.waitForFunction(()=>document.querySelector('#load-full-motions')?.textContent.includes('studies loaded'),{},{timeout:180000});
 const reviews=[];
 for(const take of takes){
  await page.locator('#search').fill(take);
  const row=page.locator('#clips button').filter({hasText:take}).first();
  if(!await row.count()){reviews.push({take,error:'not-in-catalog'});continue;}
  await row.click();
  if(await page.evaluate(()=>window.animationLibrary.playing))await page.locator('#play').click();
  for(const view of views){
   await page.getByRole('button',{name:view[0].toUpperCase()+view.slice(1),exact:true}).click();
   for(const phase of [0,.25,.5,.75,1]){
    await page.locator('#scrub').fill(String(phase));
    await page.screenshot({path:`${out}/${take}-${view}-${phase}.png`});
   }
  }
  reviews.push({take,views,phases:[0,.25,.5,.75,1]});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(out+'/result.json',JSON.stringify({base,takes,reviews,errors,acceptance:'Rig playback captured; visual acceptance requires inspecting frames.'},null,2));
 console.log(JSON.stringify({reviews:reviews.length,missing:reviews.filter(r=>r.error).map(r=>r.take),errors}));
}finally{await browser.close();}
