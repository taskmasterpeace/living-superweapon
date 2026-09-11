// Opens the branch-owned viewer on the isolated 5181 origin, asserts the catalog rendered, and
// captures the milestone screenshot. Usage: node authoring/test/browser/viewer.check.mjs [name]
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PW_AUTHORING_URL||'http://127.0.0.1:5181';
assert.equal(new URL(base).hostname,'127.0.0.1','use an isolated 127.0.0.1 origin, never localhost storage');
assert.notEqual(new URL(base).port,'5180','5180 belongs to the main task; run the authoring viewer on its own port (5181 by default, or PW_AUTHORING_URL)');
const name=process.argv[2]||'viewer';
const out='authoring/artifacts';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:980}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(`${base}/authoring/viewer/index.html`);
 await page.waitForFunction(()=>window.AUTHORING?.state?.catalog!==undefined,null,{timeout:20000});
 await page.waitForTimeout(600);
 const summary=await page.evaluate(()=>({count:AUTHORING.state.catalog?.packages.length??0,state:document.querySelector('#catalog-state').textContent,title:document.querySelector('#title').textContent,
  fixtures:[...document.querySelectorAll('#fixture-list li')].map(li=>li.textContent)}));
 console.log(JSON.stringify(summary));
 assert.ok(summary.fixtures.length>=9,'the fixture board must list the valid fixture and every invalid one');
 assert.ok(summary.fixtures.some(f=>f.includes('nan-frame')&&f.endsWith('nan-frame')),'nan-frame fixture must show its code');
 await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:82});
 assert.deepEqual(errors,[],'viewer page must be error-free');
 console.log(`PASS viewer rendered ${summary.count} packages → ${out}/${name}.jpg`);
}finally{await browser.close();}
