import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/animation-authoring-guide-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/animation-library.html');await p.waitForFunction(()=>window.animationLibrary?.hasRig);
 const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Download authoring guide',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/authoring-guide.md');
 const text=await readFile(out+'/authoring-guide.md','utf8');assert(text.includes('45 finite numbers'));assert(text.includes('validate-animation-bank.mjs'));assert(text.includes('procedural flight, grabbing'));
 await p.getByRole('button',{name:'Back',exact:true}).click();await p.waitForTimeout(1800);await p.getByRole('button',{name:'Side',exact:true}).click();await p.waitForTimeout(1800);await p.screenshot({path:out+'/library.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({download:download.suggestedFilename(),clips:await p.locator('.clip').count(),errors},null,2));
}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/authoring.webm');await b.close();}
