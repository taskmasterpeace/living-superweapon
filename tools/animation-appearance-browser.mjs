import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/animation-appearance-2026-09-13';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/animation-library.html');await p.waitForFunction(()=>window.animationLibrary?.hasRig);
 await p.evaluate(async()=>{const {ROSTER}=await import('/src/data/characters.js'),{profileFromDef,saveProfile}=await import('/src/tool/studio-profile.js');for(const id of ['vega','merc']){const profile=profileFromDef(ROSTER.find(d=>d.id===id));profile.colors.primary='#181818';profile.colors.accent='#d3ac45';saveProfile(profile);}});
 await p.reload();await p.waitForFunction(()=>window.animationLibrary?.hasRig);let appearance=await p.evaluate(()=>animationLibrary.appearance);assert.equal(appearance.colors.primary,'#181818');assert.match(await p.locator('#appearance-status').innerText(),/saved Studio appearance/);
 await p.locator('#category').selectOption('Paired holds');
 await p.locator('#clips button').first().click();appearance=await p.evaluate(()=>animationLibrary.appearance);assert.equal(appearance.receiver.colors.primary,'#181818');await p.screenshot({path:out+'/saved-pair.png'});
 await p.evaluate(()=>localStorage.setItem('lsw.studio.profiles.v1','{broken'));await p.reload();await p.waitForFunction(()=>window.animationLibrary?.hasRig);assert.match(await p.locator('#appearance-status').innerText(),/could not load/);assert.equal(await p.evaluate(()=>localStorage.getItem('lsw.studio.profiles.v1')),'{broken');await p.screenshot({path:out+'/invalid-profile.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,appearance,errors,staging:'Isolated browser context seeded saved Studio colors, then corrupted storage to test visible fallback and data preservation.'},null,2));
}finally{await b.close();}

