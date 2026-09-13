import {chromium} from 'playwright';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.PW_CAPTURE_OUT||'artifacts/marketing/flight-audio-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/sound-library.html');await p.getByRole('button',{name:'Add AI audio pack',exact:true}).click();await p.waitForFunction(()=>Object.keys(AUDIO_WORKSHOP.library.state.bindings).length===37);
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});
 await p.keyboard.press('f');await p.keyboard.down('Space');await p.waitForTimeout(700);await p.keyboard.up('Space');
 await p.waitForFunction(()=>PW.game.player._flightAudio?.id==='hover');
 await p.keyboard.down('w');await p.waitForFunction(()=>PW.game.player._flightAudio?.id==='flight');await p.waitForTimeout(500);await p.screenshot({path:out+'/flight.png'});await p.keyboard.up('w');
 await p.keyboard.down('Control');await p.waitForFunction(()=>!PW.game.player.flying,null,{timeout:15000});await p.keyboard.up('Control');
 await p.waitForFunction(()=>!PW.game.player._flightAudio);
 const result=await p.evaluate(()=>({events:PW.game.audio.soundLibrary.events.filter(e=>['hover','flight'].includes(e.id)),active:[...PW.game.audio.soundLibrary.active].map(h=>h.id)}));
 assert(result.events.some(e=>e.id==='hover'&&e.source==='chosen-recording'&&e.loop));assert(result.events.some(e=>e.id==='flight'&&e.source==='chosen-recording'&&e.loop));assert(!result.active.some(id=>['flight','hover'].includes(id)));assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({...result,errors},null,2));console.log(result);
}catch(e){console.log(await p.evaluate(()=>{const g=PW.game,f=g.player;return {flying:f.flying,airborne:f.airborne,alive:f.alive,launch:f.launchT,vel:f.vel.toArray(),audio:f._flightAudio?.id,events:g.audio.soundLibrary.events,buffers:g.audio.soundLibrary.buffers.size};}));throw e;}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/flight.webm');await b.close();}
