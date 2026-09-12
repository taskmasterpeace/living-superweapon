import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/sound-library';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
function wav(){const n=11025,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(22050,24);b.writeUInt32LE(44100,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/22050*Math.PI*2*523.25)*12000*Math.sin(Math.PI*i/n)),44+i*2);return b;}
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(`${base}/studio.html?hero=vega`);await page.waitForFunction(()=>!!window.STUDIO?.soundLibrary,{},{polling:100});
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend.ctx),null);
 await page.getByRole('button',{name:'Sound Library',exact:true}).click();
 await page.getByLabel('Choose local sound recording',{exact:true}).setInputFiles({name:'contact-proof.wav',mimeType:'audio/wav',buffer:wav()});
 await page.waitForFunction(()=>STUDIO.soundLibrary.state.bindings.light);
 await page.getByRole('button',{name:'Play recording',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.soundLibrary.lastPlayback?.source==='chosen-recording');
 await page.evaluate(()=>{const a=STUDIO.preview.sound.backend;window.slProbe=a.ctx.createAnalyser();slProbe.fftSize=2048;a.master.connect(slProbe);window.slPeak=0;window.slTimer=setInterval(()=>{const b=new Float32Array(2048);slProbe.getFloatTimeDomainData(b);for(const n of b)slPeak=Math.max(slPeak,Math.abs(n));},10);const dest=a.ctx.createMediaStreamDestination();a.master.connect(dest);window.slChunks=[];window.slRecorder=new MediaRecorder(dest.stream);slRecorder.ondataavailable=e=>slChunks.push(e.data);slRecorder.start();});
 await page.getByRole('button',{name:'Play recording',exact:true}).click();await page.waitForFunction(()=>slPeak>.0001);
 result.oneShot=await page.evaluate(()=>({playback:STUDIO.soundLibrary.lastPlayback,peak:slPeak}));
 await page.getByLabel('Search sound cues',{exact:true}).fill('hover');await page.locator('[data-cue="hover"]').click();
 await page.getByLabel('Existing sample',{exact:true}).selectOption('spaceEngineLow_000');await page.waitForFunction(()=>STUDIO.soundLibrary.state.bindings.hover);
 await page.getByRole('button',{name:'Play recording',exact:true}).click();await page.waitForFunction(()=>[...STUDIO.soundLibrary.active].some(h=>h.loop));
 result.loop=await page.evaluate(()=>STUDIO.soundLibrary.lastPlayback);await page.getByRole('button',{name:'Stop cue',exact:true}).click();
 assert.equal(await page.evaluate(()=>STUDIO.soundLibrary.active.size),0);
 await page.getByLabel('Search sound cues',{exact:true}).fill('light');await page.locator('[data-cue="light"]').click();
 await page.getByLabel('Choose local sound recording',{exact:true}).setInputFiles({name:'contact-proof.wav',mimeType:'audio/wav',buffer:wav()});
 await page.waitForFunction(()=>STUDIO.soundLibrary.state.bindings.light?.name==='contact-proof.wav');
 await page.getByRole('button',{name:'Play recording',exact:true}).click();await page.waitForFunction(()=>STUDIO.soundLibrary.lastPlayback.source==='chosen-recording');
 const exported=page.waitForEvent('download');await page.getByRole('button',{name:'Export library + audio',exact:true}).click();await(await exported).saveAs(`${out}/library.json`);
 await page.getByLabel('Choose local sound recording',{exact:true}).setInputFiles({name:'broken.wav',mimeType:'audio/wav',buffer:Buffer.alloc(48)});
 await page.getByRole('status').filter({hasText:'Cannot decode'}).waitFor();assert.equal(await page.evaluate(()=>STUDIO.soundLibrary.state.bindings.light.name),'contact-proof.wav');
 await page.screenshot({path:`${out}/library.png`});
 const recording=await page.evaluate(async()=>{await new Promise(r=>{slRecorder.onstop=r;slRecorder.stop();});clearInterval(slTimer);const bytes=new Uint8Array(await new Blob(slChunks).arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);});await writeFile(`${out}/audition-evidence.webm`,Buffer.from(recording,'base64'));
 await page.reload();await page.waitForFunction(()=>!!window.STUDIO?.soundLibrary,{},{polling:100});assert.equal(await page.evaluate(()=>STUDIO.soundLibrary.state.bindings.light.name),'contact-proof.wav');
 await page.getByRole('button',{name:'Sound Library',exact:true}).click();await page.getByRole('button',{name:'Play recording',exact:true}).click();
 await page.getByLabel('Import sound library',{exact:true}).setInputFiles(`${out}/library.json`);await page.getByRole('status').filter({hasText:'Library imported'}).waitFor();
 result.transfer=await page.evaluate(()=>({source:STUDIO.soundLibrary.source('light'),decoded:STUDIO.soundLibrary.buffers.has('light')}));
 assert.deepEqual(result.transfer,{source:'chosen-recording',decoded:true},'Imported selected recording must be decoded for playback');
 // Native diagnostic, explicitly not a physical player strike: real PowerWorld mixer/method.
 await page.goto(`${base}/powerworld.html`);await page.waitForFunction(()=>!!window.LSW?.game?.audio,{},{polling:100});
 await page.locator('body').click({position:{x:12,y:12}});
 result.native=await page.evaluate(async()=>{const a=LSW.game.audio;a.init();await a.ctx.resume();await a.soundLibrary.ready();const probe=a.ctx.createAnalyser();a.master.connect(probe);a.meleeHit(1,null,false);let peak=0;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,10));const b=new Float32Array(2048);probe.getFloatTimeDomainData(b);for(const v of b)peak=Math.max(peak,Math.abs(v));}return {diagnostic:true,playback:a.soundLibrary.lastPlayback,peak};});
 assert.equal(result.native.playback.id,'light','Native diagnostic must route the intended contact cue');
 assert.equal(result.native.playback.native,true,'Native method must use the shared resolver outside audition');
 assert.equal(result.native.playback.source,'chosen-recording','Native contact must play the selected asset');
 assert.equal(result.native.playback.name,'contact-proof.wav','Native source must identify the exact imported file');
 assert.ok(Number.isFinite(result.native.peak)&&result.native.peak>.0001,'Native mixer must produce measurable audio');
 assert.deepEqual(errors,[],'Console or page errors fail the browser proof');console.log(JSON.stringify(result,null,2));
}finally{console.log('Final browser state',await page.evaluate(()=>({url:location.href,keys:Object.keys(window.STUDIO||{}),text:document.body.innerText.slice(0,180)})).catch(()=>null));await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
