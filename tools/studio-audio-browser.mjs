import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/studio-audio';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],result={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend.ctx),null,'No autoplay AudioContext');
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.getByRole('button',{name:'Sound off',exact:true}).click();
 await page.getByRole('button',{name:'Sound on',exact:true}).waitFor({timeout:30000});
 result.ready=await page.evaluate(()=>{const a=STUDIO.preview.sound;return {state:a.backend.ctx.state,buffers:a.backend._bank.buf.size,events:a.eventCount};});
 assert.equal(result.ready.state,'running');assert.ok(result.ready.buffers>0);assert.equal(result.ready.events,0);
 // Measure real mixer signal, not merely a forwarded method counter.
 await page.evaluate(()=>{const a=STUDIO.preview.sound.backend;window.audioProbe=a.ctx.createAnalyser();audioProbe.fftSize=1024;a.master.connect(audioProbe);window.audioPeak=0;window.probeTimer=setInterval(()=>{const b=new Float32Array(1024);audioProbe.getFloatTimeDomainData(b);for(const v of b)audioPeak=Math.max(audioPeak,Math.abs(v));},20);});
 await page.getByRole('button',{name:'Play preview',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.sound.backend._sus.size>0,{timeout:10000});
 await page.waitForFunction(()=>audioPeak>.001,{timeout:10000});
 result.live=await page.evaluate(()=>({time:STUDIO.preview.time,phase:STUDIO.preview.combat.phase,handles:STUDIO.preview.sound.backend._sus.size,events:STUDIO.preview.sound.events,peak:audioPeak}));
 await page.screenshot({path:`${out}/audible-charge.png`});
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 result.paused=await page.evaluate(()=>({handles:STUDIO.preview.sound.backend._sus.size,count:STUDIO.preview.sound.eventCount}));assert.equal(result.paused.handles,0);
 await page.waitForFunction(()=>{const b=new Float32Array(1024);audioProbe.getFloatTimeDomainData(b);return b.every(v=>Math.abs(v)<1e-7);},{timeout:2000});
 await page.evaluate(()=>STUDIO.preview.seek(3.5));
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.eventCount),result.paused.count,'Silent scrub emitted audio');
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend._sus.size),0);
 await page.getByRole('button',{name:'Play preview',exact:true}).click();
 await page.waitForFunction(()=>STUDIO.preview.sound.backend._sus.size>0,{timeout:10000});
 result.resumed=await page.evaluate(()=>({phase:STUDIO.preview.combat.phase,handles:STUDIO.preview.sound.backend._sus.size,events:STUDIO.preview.sound.events}));
 await page.getByRole('button',{name:'Sound on',exact:true}).click();assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend._sus.size),0);
 await page.getByRole('tab',{name:'Effects',exact:true}).click();await page.getByRole('button',{name:'Sound & dialogue brief',exact:true}).click();
 await page.screenshot({path:`${out}/cue-brief.png`});
 const downloadWait=page.waitForEvent('download');await page.getByRole('button',{name:'Export sound brief',exact:true}).click();await (await downloadWait).saveAs(`${out}/sound-direction.json`);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Sound off',exact:true}).click();await page.getByRole('button',{name:'Sound on',exact:true}).waitFor();
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
 const prior=await page.evaluate(()=>STUDIO.preview.sound.eventCount);
 await page.waitForFunction(prior=>STUDIO.preview.sound.eventCount>prior&&STUDIO.preview.combat.damage>0,prior,{timeout:10000});
 result.melee=await page.evaluate(()=>({damage:STUDIO.preview.combat.damage,events:STUDIO.preview.sound.events}));
 // Hero changes rebuild simulation while audio is enabled. Reconstruction stays gated.
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.locator('[data-hero="aurum"]').click();
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend._sus.size),0);
 await page.evaluate(async()=>{clearInterval(probeTimer);await STUDIO.preview.sound.dispose();});
 assert.equal(await page.evaluate(()=>STUDIO.preview.sound.backend.ctx.state),'closed');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({...result,errors},null,2));await browser.close();}
