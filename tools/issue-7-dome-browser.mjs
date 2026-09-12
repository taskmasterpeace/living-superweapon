import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/issue-7-dome';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});
 const result=await page.evaluate(async()=>{
  const {Vector3}=await import('/node_modules/three/build/three.module.js'),{domeAt,updateDomes}=await import('/src/engine/systems2.js'),{MANIFEST}=await import('/src/core/samples.js');
  const g=window.PW.game,a=g.audio,originalUpdate=g.update,originalSample=a.sample;g.update=()=>{};
  const calls=[];a.init();await a.ctx.resume();a.sample('ui.confirm');
  const ids=['op.shield.deploy','op.shield.hit','op.shield.collapse'];
  const loaded=await Promise.all(ids.flatMap(id=>MANIFEST[id].f).map(async f=>({file:f,decoded:!!await a._bank.load(f)})));
  a.sample=function(id,options){const played=originalSample.call(this,id,options);if(id.startsWith('op.shield'))calls.push({id,played,time:g.time,pos:options.pos?.toArray?.()});return played;};
  const stream=a.ctx.createMediaStreamDestination();a.master.connect(stream);const chunks=[],rec=new MediaRecorder(stream.stream);rec.ondataavailable=e=>chunks.push(e.data);rec.start();
  const pos=g.player.pos.clone().add(new Vector3(0,80,0));g.player.pos.copy(pos).add(new Vector3(0,0,-65));g.world._lookYaw=0;g.world._lookPitch=0;
  a.listen(g.player.pos.x,g.player.pos.z,g.player.pos.y);const owner=g.player,enemy={team:owner.team+1,alive:true,powerBuff:1,pos:pos.clone().add(new Vector3(0,0,-50)),aim3:new Vector3(0,0,1)};
  const d=domeAt(g,pos,16,10,owner),shots=[];
  const fire=(caster,damage)=>{const p=g.projectiles.spawnProjectile(caster,{pos:pos.clone().add(new Vector3(0,0,-50)),vel:new Vector3(0,0,1200),radius:1,damage,blast:0,ground:false,color:'#ffcc33',dtype:'energy'});shots.push(p);};
  const frame=()=>{g.time+=1/60;g.projectiles.update(1/60,g);updateDomes(g,1/60);g.world.render();};
  try{
   for(let i=0;i<180;i++){if(i===20)fire(owner,20);if(i===50)fire(enemy,20);if(i===70)fire(enemy,20);if(i===100)fire(enemy,500);frame();await new Promise(r=>setTimeout(r,1000/60));}
   await new Promise(r=>setTimeout(r,1000));const stopped=new Promise(r=>rec.onstop=r);rec.stop();await stopped;
   const bytes=new Uint8Array(await new Blob(chunks,{type:rec.mimeType}).arrayBuffer());
   return {kind:'Staged dome and shots, production projectile manager and audio bank; fixed-step render fixture, not player-input proof; audio tapped before master compressor',loaded,calls,remaining:g._domes.length,shots:shots.map(p=>({dead:p.dead,pos:p.pos.toArray()})),audio:Array.from(bytes),listener:[a._lx,a._ly,a._lz],audioState:a.ctx.state};
  }finally{a.master.disconnect(stream);a.sample=originalSample;g.update=originalUpdate;}
 });
 const audio=result.audio;delete result.audio;await writeFile(out+'/dome-audio.webm',Buffer.from(audio));await writeFile(out+'/result.json',JSON.stringify({result,errors},null,2));await page.screenshot({path:out+'/after.png'});
 if(errors.length||result.loaded.some(f=>!f.decoded)||result.calls.filter(c=>c.id==='op.shield.hit'&&c.played).length!==2||result.remaining!==0)throw Error('Dome runtime acceptance failed; see result.json');
}finally{await context.close();await browser.close();}
