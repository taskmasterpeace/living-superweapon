import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/audio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(()=>STUDIO.preview.playing=false);
 const channels=await page.evaluate(async()=>{
  const {AudioBus}=await import('/src/core/audio.js'),{SampleBank,MANIFEST}=await import('/src/core/samples.js');
  const decode=new OfflineAudioContext(2,48000,48000),buffers={};
  for(const name of ['ki.blast','engine.low']){
   const response=await fetch('/audio/'+MANIFEST[name].f[0]+'.mp3');if(!response.ok)throw Error('Missing checked-in recording '+name);
   buffers[name]=await decode.decodeAudioData(await response.arrayBuffer());
  }
  const setup=seconds=>{
   const ctx=new OfflineAudioContext(2,Math.ceil(48000*seconds),48000),a=new AudioBus();
   a.ctx=ctx;a.ok=true;a.master=ctx.destination;a.bus={sfx:ctx.destination,ui:ctx.destination};
   a._bank=new SampleBank(a);for(const [name,buffer] of Object.entries(buffers))for(const file of MANIFEST[name].f)a._bank.buf.set(file,buffer);
   a.listen(0,0,0,{x:1,y:0,z:0});return {ctx,a};
  };
  const energy=(buffer,start=0,end=buffer.duration)=>{
   const values=[];for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);let sum=0;
    for(let i=Math.floor(start*buffer.sampleRate);i<Math.min(data.length,Math.floor(end*buffer.sampleRate));i++){if(!Number.isFinite(data[i]))throw Error('Non-finite rendered sample');sum+=data[i]*data[i];}values.push(sum);
   }return values;
  };
  const rows=[];
  for(const [name,pos,right] of [['right',{x:40,y:0,z:0}],['left',{x:-40,y:0,z:0}],['center',null],['legacyCenter',null],['above',{x:0,y:50,z:0}],['farAbove',{x:0,y:500,z:0}],['rotated',{x:0,y:0,z:40},{x:0,y:0,z:-1}],['snapshot',{x:40,y:0,z:0}]]){
   const {ctx,a}=setup(1);if(right)a.listen(0,0,0,right);if(name==='legacyCenter')ctx.createStereoPanner=undefined;
   const handled=a.sample('ki.blast',{pos});if(name==='snapshot')pos.x=-40;
   const rendered=await ctx.startRendering();rows.push({name,handled,energy:energy(rendered)});
  }
  const {ctx,a}=setup(1.5),pos={x:40,y:0,z:0},h=a.sampleLoop('engine.low',{pos});h.set(.8,pos);
  const moves=[ctx.suspend(.3).then(()=>{pos.x=-40;h.set(.8);return ctx.resume();}),
   ctx.suspend(.6).then(()=>{a.muted=true;h.set(.8);return ctx.resume();}),
   ctx.suspend(.85).then(()=>{a.muted=false;pos.x=40;h.set(.8);return ctx.resume();}),
   ctx.suspend(1).then(()=>{h.stop();h.set(1);return ctx.resume();})];
  const rendered=await ctx.startRendering();await Promise.all(moves);
  return {rows,loop:{right:energy(rendered,.1,.25),left:energy(rendered,.45,.58),muted:energy(rendered,.76,.83),stopped:energy(rendered,1.41,1.49),tracked:a._sus.size,dead:h._dead}};
 });
 const row=name=>channels.rows.find(r=>r.name===name).energy;
 for(const name of ['right','snapshot'])assert.ok(row(name)[1]>row(name)[0]*20,name+' must favor camera-right');
 for(const name of ['left','rotated'])assert.ok(row(name)[0]>row(name)[1]*20,name+' must favor camera-left');
 for(const name of ['center','above']){const e=row(name);assert.ok(e[0]>0);assert.ok(Math.abs(e[0]-e[1])<1e-6,name+' must remain centered');}
 const centerMix=row('center')[0]/row('legacyCenter')[0];assert.ok(centerMix>.8&&centerMix<1.25,`centered recording retains the original mix, allowing normal pitch jitter: ${centerMix}`);
 assert.deepEqual(row('farAbove'),[0,0]);assert.ok(channels.rows.every(r=>r.handled));
 assert.ok(channels.loop.right[1]>channels.loop.right[0]*20);assert.ok(channels.loop.left[0]>channels.loop.left[1]*5);
 assert.ok(channels.loop.muted.reduce((a,b)=>a+b,0)<channels.loop.left.reduce((a,b)=>a+b,0)*.1);
 assert.deepEqual(channels.loop.stopped,[0,0]);assert.equal(channels.loop.tracked,0);assert.equal(channels.loop.dead,true);
 // A real match owns the listener and passes live caster positions to recorded charge handles.
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=kano');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const runtime=await page.evaluate(async()=>{
  const g=LSW.game,f=g.player,update=g.update;g.update=()=>{};for(const e of g.entities)e.ai=null;
  f.pos.set(0,200,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';
  const calls=[],listen=g.audio.listen;g.audio.listen=function(x,z,y,right){calls.push([x,y,z]);return listen.call(this,x,z,y,right);};
  update.call(g,1/60);g.audio.listen=listen;
  const listener={calls:calls.length,height:g.audio._ly,bodyHeight:f.pos.y,near:g.audio._pg(f.pos),floor:g.audio._pg({x:f.pos.x,y:f.pos.y-500,z:f.pos.z})};
  const {MANIFEST,SampleBank}=await import('/src/core/samples.js');g.audio.init();g.audio.resume();g.audio._bank??=new SampleBank(g.audio);await g.audio._bank.load(MANIFEST['engine.charge'].f[0]);
  const {runSlot,clearSlotFx}=await import('/src/engine/abilities.js'),positions=[],charge=g.audio.charge;
  g.audio.charge=function(pos){positions.push(pos);return charge.call(this,pos);};
  f.ki=f.maxKi;f.slots.lmb.cd=0;f.hitstop=f.staggerT=f.stunT=f.frozenT=0;
  runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);
  const handle=f.slots.lmb.sfx,livePosition=positions.length===1&&positions[0]===f.pos,tracked=!!handle&&g.audio._sus.has(handle);
  clearSlotFx(f);g.audio.charge=charge;
  return {listener,livePosition,tracked,released:!!handle&&!g.audio._sus.has(handle)};
 });
 assert.equal(runtime.listener.calls,2);assert.equal(runtime.listener.height,runtime.listener.bodyHeight);assert.equal(runtime.listener.near,1);assert.equal(runtime.listener.floor,0);
 assert.equal(runtime.livePosition,true);assert.equal(runtime.tracked,true);assert.equal(runtime.released,true);assert.deepEqual(errors,[]);
 await writeFile(`${out}/spatial-results.json`,JSON.stringify({channels,runtime,errors},null,2));
 console.log('PASS actual recorded WebAudio channels, camera rotation, height attenuation, moving/muted/stopped loop and game listener/charge routing');
}catch(error){await page.screenshot({path:`${out}/spatial-failure.png`}).catch(()=>{});throw error;}finally{await browser.close();}
