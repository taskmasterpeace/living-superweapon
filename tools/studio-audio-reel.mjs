import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/studio-audio';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-forward');
 await page.getByRole('button',{name:'Side view',exact:true}).click();
 await page.getByRole('button',{name:'Sound off',exact:true}).click();await page.getByRole('button',{name:'Sound on',exact:true}).waitFor({timeout:30000});
 await page.evaluate(()=>{
  const p=STUDIO.preview,a=p.sound.backend;p.seek(0);
  const output=a.ctx.createMediaStreamDestination();a.master.connect(output);
  const stream=p.renderer.domElement.captureStream(30);for(const track of output.stream.getAudioTracks())stream.addTrack(track);
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];
  const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())));});
  window.audibleReel={recorder,stream,output,done};recorder.start(100);
 });
 await page.getByRole('button',{name:'Play preview',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.time>=6.2,null,{timeout:45000});
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const summary=await page.evaluate(()=>({time:STUDIO.preview.time,damage:STUDIO.preview.combat.damage,cues:STUDIO.preview.sound.events,errors:[]}));
 const bytes=await page.evaluate(async()=>{audibleReel.recorder.stop();const bytes=await audibleReel.done;for(const track of audibleReel.stream.getTracks())track.stop();STUDIO.preview.sound.backend.master.disconnect(audibleReel.output);return bytes;});
 await writeFile(out+'/kano-native-audio.webm',Buffer.from(bytes));await writeFile(out+'/reel-results.json',JSON.stringify({...summary,errors},null,2));
 assert.ok(summary.damage>0&&summary.cues.some(e=>e.name==='beamVoice'));assert.deepEqual(errors,[]);console.log(JSON.stringify({time:summary.time,damage:summary.damage,bytes:bytes.length,errors},null,2));
}finally{await browser.close();}
