import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const out='artifacts/audio-cue-brief';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'});
const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} ${m.location().url||''}`);});
await page.route('**/favicon.ico',route=>route.fulfill({status:204}));
try{
 await page.goto(base+'/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 if(await page.evaluate(()=>STUDIO.preview.playing))await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('tab',{name:'Effects',exact:true}).click();
 await page.getByRole('button',{name:'Sound & dialogue brief',exact:true}).click();
 const dialog=page.getByRole('dialog');
 assert.ok((await dialog.innerText()).includes('Charged energy attack'),'Dialog must describe the attack type, not just native method');
 assert.ok((await dialog.innerText()).includes('Charge / energy gathering'),'Human-readable phase label is visible');
 await dialog.getByText('Beam reference sound directions',{exact:false}).click();
 assert.ok((await dialog.innerText()).includes('Heavy / pressure beam'));
 assert.ok((await dialog.innerText()).includes('Direction only'));
 const downloadPromise=page.waitForEvent('download');
 await dialog.getByRole('button',{name:'Export sound brief',exact:true}).click();
 const download=await downloadPromise;assert.equal(download.suggestedFilename(),'lsw-sound-direction-v2.json');
 await download.saveAs(`${out}/sound-direction-v2.json`);
 const pack=JSON.parse(await readFile(`${out}/sound-direction-v2.json`,'utf8'));
 assert.equal(pack.version,2);assert.equal(pack.cues.length,21);assert.equal(pack.beamDirections.length,2);
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend.ctx),null,'Reading/exporting must not autoplay audio');
 await page.screenshot({path:`${out}/desktop.png`});
 await page.setViewportSize({width:390,height:844});
 result.layout=await page.evaluate(()=>{const d=document.querySelector('dialog');return {document:[document.documentElement.clientWidth,document.documentElement.scrollWidth],dialog:[d.clientWidth,d.scrollWidth]};});
 assert.ok(result.layout.document[1]<=result.layout.document[0]);assert.ok(result.layout.dialog[1]<=result.layout.dialog[0]+1);
 await page.screenshot({path:`${out}/mobile.png`});
 result.cues=pack.cues.length;result.profiles=pack.beamDirections.length;
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
