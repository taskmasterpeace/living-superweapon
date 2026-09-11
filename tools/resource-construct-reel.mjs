import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Run resource-construct-browser.mjs first to produce a genuine exported character.
// Capture live native Studio playback and its actual AudioContext, never synthetic
// sounds or a replacement simulation. This scripted stage is not input-feel proof.
const out='artifacts/resource-construct-studio';await mkdir(out,{recursive:true});
const pack=JSON.parse(await readFile(`${out}/bulwark.character.json`,'utf8'));
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/studio.html?hero=aurum');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await page.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(pack));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.fighter.def.isCustom);
 await page.getByLabel('Preview level',{exact:true}).selectOption('10');
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
 await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
 await page.getByLabel('Construct starting ki',{exact:true}).fill('100');await page.getByLabel('Construct starting ki',{exact:true}).press('Tab');
 await page.getByRole('button',{name:'Sound off',exact:true}).click();
 await page.getByRole('button',{name:'Sound on',exact:true}).waitFor({timeout:30000});
 await page.evaluate(()=>{
  const p=STUDIO.preview,a=p.sound.backend;p.seek(0);
  const output=a.ctx.createMediaStreamDestination();a.master.connect(output);
  const stream=p.renderer.domElement.captureStream(30);for(const track of output.stream.getAudioTracks())stream.addTrack(track);
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus'}),chunks=[];
  const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())));});
  window.constructReel={recorder,stream,output,done};recorder.start(100);
 });
 await page.getByRole('button',{name:'Play preview',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.time>=6.5,null,{timeout:45000});
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const summary=await page.evaluate(()=>({time:STUDIO.preview.time,resource:STUDIO.preview.combat.resourceStats(),damage:STUDIO.preview.combat.damage,contacts:STUDIO.preview.combat.contacts,cues:STUDIO.preview.sound.events,cover:STUDIO.preview.chase.cover.length}));
 const bytes=await page.evaluate(async()=>{constructReel.recorder.stop();const bytes=await constructReel.done;for(const track of constructReel.stream.getTracks())track.stop();STUDIO.preview.sound.backend.master.disconnect(constructReel.output);return bytes;});
 await writeFile(`${out}/native-studio-tank.webm`,Buffer.from(bytes));
 await writeFile(`${out}/reel-results.json`,JSON.stringify({...summary,bytes:bytes.length,errors},null,2));
 assert.ok(summary.damage>0&&summary.cues.length>0);assert.equal(summary.resource.constructs[0].kiSpent,20);
 assert.equal(summary.cover,0);assert.equal(summary.resource.constructs[0].state,'dismissed');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({...summary,bytes:bytes.length,errors},null,2));
}finally{await browser.close();}
