import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const combatOnly=process.argv.includes('--combat');
const out=`artifacts/hero-skin${combatOnly?'/combat-motion':''}`;await mkdir(out,{recursive:true});
const stills=process.argv.includes('--stills');
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},...(stills?{}:{recordVideo:{dir:out,size:{width:1440,height:1000}}})});
const page=await context.newPage(),errors=[],rows=[],segments=[],started=Date.now();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Body source',{exact:true}).selectOption('superhero-male');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.skin?.id),'superhero-male');
 await page.screenshot({path:`${out}/studio-desktop.png`});
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
  const p=STUDIO.preview;cancelAnimationFrame(p.raf);p.controls.enabled=false;
  document.querySelector('.inspector').style.visibility='hidden';document.querySelector('.library').style.visibility='hidden';
  window.skinFixture=(hero,body)=>{
   const def=ROSTER.find(d=>d.id===hero),profile=profileFromDef(def);profile.model.body=body;
   p.setProfile(def,profile);p.setState('hover');p.setView('front');
  };
  window.skinCamera=(angle='front')=>{
   const f=p.fighter,center=f.parts.torso.getWorldPosition(new T.Vector3());center.y-=1.2;
   const offsets={front:[0,1,24],left:[-25,1,0],right:[25,1,0],rear:[0,1,-24],threequarter:[16,2,23]};
   const offset=new T.Vector3(...offsets[angle]);
   if(p.isCombat&&!p.isolated){
    const other=p.combat.target.parts.torso.getWorldPosition(new T.Vector3());other.y-=1.2;
    const distance=center.distanceTo(other);center.lerp(other,.5);
    offset.setLength(Math.max(offset.length(),(distance*.5+8)/Math.tan(19*Math.PI/180)/Math.min(1,p.camera.aspect)*1.12));
   }
   p.camera.fov=38;p.camera.position.copy(center).add(offset);p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`${f.def.name} / ${f.parts.skin?.id??'procedural'} / ${p.isCombat?p.combat.meleeSequence:p.state} / ${angle}`;
   document.querySelector('.viewport-note').textContent=p.isCombat?`Actual contact · ${p.isolated?'opponent hidden':'full encounter'} · silent Studio fixture · custom inspection camera`:'Quaternius CC0 anatomy · existing production pose · custom inspection camera';
   document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed','false'));
   const phase=document.querySelector('.attack-phase');phase.hidden=!p.isCombat;phase.textContent=p.isCombat?p.combat.phase:'';
   document.querySelector('.hero-heading').textContent=`${f.def.name} · ${f.parts.skin?.id??'procedural'}`;
   document.querySelector('.measurements').textContent=`${f._flightPoseState??p.state} · ${f.vel.length().toFixed(1)} u/s · ${p.time.toFixed(2)} s · 38°`;
   document.querySelector('.time').textContent=`${p.time.toFixed(2)} s`;document.querySelector('#state').value=p.state;
  };
  window.skinState=label=>{
   if(['block','combo','heavy','throw'].includes(label)){p.combat.meleeSequence=label;p.setState('melee');p.setIsolated(true);}
   else p.setState(label);
  };
  window.skinSample=()=>({hero:p.fighter.def.id,body:p.fighter.parts.skin?.id,state:p.state,sequence:p.isCombat?p.combat.meleeSequence:null,phase:p.isCombat?p.combat.phase:null,isolated:p.isolated,target:p.isCombat?{position:p.combat.target.pos.toArray(),velocity:p.combat.target.vel.toArray(),hitstop:p.combat.target.hitstop}:null,guarding:p.fighter.guarding,events:p.isCombat?p.combat.meleeEvents.map(event=>({...event})):[],time:p.time,root:p.fighter.pos.toArray(),
   matrices:p.fighter.parts.skin?.skeleton.bones.map(b=>b.matrixWorld.toArray()),
   source:p.fighter.parts.skin?.source});
 });
 for(const [hero,body] of (combatOnly?[]:[['sol','superhero-male'],['sol','superhero-female'],['gale','superhero-male'],['stormcall','superhero-male']])){
  const key=`${hero}-${body}`;await page.evaluate(([h,b])=>skinFixture(h,b),[hero,body]);
  for(const angle of ['front','left','right','rear']){
   const visibility=await page.evaluate(async a=>{
    const p=STUDIO.preview;p.seek(1);skinCamera(a);
    const before=[p.renderer.domElement.width,p.renderer.domElement.height];
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);skinCamera(a);
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(p.renderer.domElement,0,0,32,32);
    const pixels=ctx.getImageData(0,0,32,32).data,colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
    return {before,after:[p.renderer.domElement.width,p.renderer.domElement.height],colors:colors.size};
   },angle);
   assert.ok(visibility.colors>32,`blank initial canvas: ${JSON.stringify(visibility)}`);
   await page.locator('.viewport').screenshot({path:`${out}/${key}-${angle}.png`});
  }
  if(!stills)for(const state of ['hover','cycle','block','groundJog','combo','heavy','throw']){
   await page.evaluate(s=>skinState(s),state);
   for(const t of [0,.8,1.12,2,4,7.983333333]){
    rows.push(await page.evaluate(time=>{STUDIO.preview.seek(time);skinCamera('threequarter');return skinSample();},t));
    await page.locator('.viewport').screenshot({path:`${out}/${key}-${state}-${t.toFixed(2)}.png`});
   }
  }
 }
 const loops=combatOnly?[...['superhero-male','superhero-female'].flatMap(body=>['combo','heavy','throw'].map(state=>['sol',body,state])),['stormcall','superhero-male','heavy'],['stormcall','procedural','heavy']]:[['sol','superhero-male','cycle'],['sol','superhero-female','cycle'],['gale','superhero-male','groundJog'],['stormcall','superhero-male','block']];
 if(!stills)for(const [hero,body,state] of loops){
  const segment={hero,body,state,startSeconds:(Date.now()-started)/1000};
  const samples=await page.evaluate(async([hero,body,state,combatOnly])=>{
   skinFixture(hero,body);const p=STUDIO.preview;skinState(state);p.seek(0);
   const samples=[],steps=combatOnly?2:1,frames=960/steps;
   for(let i=0;i<frames;i++){
    if(i===frames/2){p.seek(0);if(combatOnly)p.setIsolated(false);}
    for(let j=0;j<steps;j++){p.time=((i*steps+j)/60)%8;p.step(1/60,false,false);}
    skinCamera(i<frames/2?'threequarter':'right');if(combatOnly&&i%15===0)samples.push(skinSample());await new Promise(requestAnimationFrame);
   }
   return samples;
  },[hero,body,state,combatOnly]);
  if(combatOnly){
   rows.push(...samples);
   for(const isolated of [true,false]){
    const loop=samples.filter(sample=>sample.isolated===isolated);
    assert.equal(loop[0].events.length,0,'historical samples must not alias the later mutable event list');
    assert.equal(loop.at(-1).events.filter(e=>e.move===(state==='combo'?'light':state)).length,state==='combo'?3:1,`${body} ${state} contact sequence changed`);
   }
  }
  segment.endSeconds=(Date.now()-started)/1000;segments.push(segment);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/review-results.json`,JSON.stringify({rows,segments,errors,stills},null,2));console.log(`PASS ${rows.length} phase samples; ${stills?'stills only':'full motion capture'}`);
}finally{await context.close();if(!stills)await page.video()?.saveAs(`${out}/motion.webm`);await browser.close();}
