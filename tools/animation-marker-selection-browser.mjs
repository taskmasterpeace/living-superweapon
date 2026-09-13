import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/animation-marker-selection-2026-09-13';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/animation-library.html');await p.waitForFunction(()=>window.animationLibrary?.hasRig);
 await p.locator('#marker-start').fill('0.1');await p.locator('#marker-end').fill('0.4');await p.getByRole('button',{name:'Assign to selected character',exact:true}).click();
 await p.locator('#character').selectOption('sol');assert.notEqual(await p.locator('#marker-start').inputValue(),'0.1');assert.match(await p.locator('#marker-status').innerText(),/no assignment/);
 await p.locator('#character').selectOption('vega');assert.equal(await p.locator('#marker-start').inputValue(),'0.1');assert.match(await p.locator('#marker-status').innerText(),/assigned markers loaded/);
 await p.locator('#marker-start').fill('0.12');await p.getByRole('button',{name:'Save draft',exact:true}).click();await p.reload();await p.waitForFunction(()=>window.animationLibrary?.hasRig);assert.equal(await p.locator('#marker-start').inputValue(),'0.12');assert.match(await p.locator('#marker-status').innerText(),/Shared local draft preview/);
 await p.getByRole('button',{name:'Discard local draft',exact:true}).click();assert.equal(await p.locator('#marker-start').inputValue(),'0.1');await p.screenshot({path:out+'/assigned-markers.png'});
 await p.getByRole('button',{name:'Remove character assignment',exact:true}).click();assert.notEqual(await p.locator('#marker-start').inputValue(),'0.1');assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,checks:['selection isolation','assigned reload','draft precedence labeled','discard restores assignment','unassign restores source']},null,2));
}finally{await b.close();}
