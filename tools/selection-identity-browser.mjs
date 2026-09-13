import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/selection-identity-2026-09-12';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),p=await c.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try{
 for(const [hero,label] of [['volt','Momentum glide'],['rage','Charged leap'],['sarge','Soldier']]){
  await p.goto('http://127.0.0.1:5184/powerworld.html?hero='+hero);await p.locator('#hSelect.on .selidentity').waitFor();await p.waitForTimeout(1600);
  const identity=await p.locator('#hSelect .selidentity').innerText();assert.ok(identity.includes(label));
  assert.equal(await p.locator('#hSelect .scard .sidentity').count(),await p.locator('#hSelect .scard').count());
  const info=await p.locator('#selInfo').innerText();assert.ok(info.includes('STARTING ATTACKS'));results.push({hero,identity});await p.screenshot({path:out+'/'+hero+'.png'});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,errors},null,2));console.log(results);
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/selection.webm');await b.close();}
