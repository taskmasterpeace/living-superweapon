import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/ballistic-jump',url=process.env.LSW_JUMP_URL||'http://127.0.0.1:5180';await mkdir(out,{recursive:true});
if(process.argv[2]==='verify'){
 const {frames,errors}=JSON.parse(await readFile(`${out}/game-results.json`,'utf8'));
 assert.equal(frames.length,120);assert.ok(frames.every(f=>!f.flying&&Math.abs(f.pitch)<.35));assert.equal(frames[0].vy,24.5);assert.ok(Math.max(...frames.map(f=>f.y))>3);assert.equal(frames.at(-1).y,0);
 assert.deepEqual([...new Set(frames.map(f=>f.take).filter(Boolean))].sort(),['Jump_Land','Jump_Loop','Jump_Start']);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({nativeFrames:frames.length,apex:Math.max(...frames.map(f=>f.y)),upright:true,landed:true,errors}));process.exit(0);
}
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1500,height:1800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 if(!['game','inspection'].includes(process.argv[2])){
 await page.goto(url);
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{Fighter}=await import('/src/engine/entity.js'),{ROSTER}=await import('/src/data/characters.js');
  const {JUMP_CLIPS}=await import('/src/engine/jump-motion.js'),{samplePoseFrame,applyAuthoredPose}=await import('/src/engine/authored-pose.js');
  document.body.innerHTML='';document.body.style.cssText='margin:0;background:#252823';
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1500,1800);document.body.append(renderer.domElement);renderer.setScissorTest(true);
  const scene=new T.Scene();scene.background=new T.Color('#252823');scene.add(new T.HemisphereLight('#e4f3ff','#857865',2));
  const key=new T.DirectionalLight('#fff1d0',3);key.position.set(4,8,5);scene.add(key);scene.add(new T.GridHelper(8,16,'#6e7063','#383f36'));
  const camera=new T.PerspectiveCamera(32,250/300,.01,100),source=await new GLTFLoader().loadAsync('/assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf');
  source.scene.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of [].concat(o.material))if(m.name==='M_Joints')m.color.set('#343c40');}});
  scene.add(source.scene);const mixer=new T.AnimationMixer(source.scene);camera.position.set(3,1.6,4.4);camera.lookAt(0,.9,0);
  for(const [row,name]of ['Jump_Start','Jump_Loop','Jump_Land'].entries())for(const [col,fraction]of [0,.25,.5,.75,1,.999].entries()){
   const clip=source.animations.find(c=>c.name===name);mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(clip.duration*fraction);scene.updateMatrixWorld(true);
   source.scene.visible=true;renderer.setViewport(col*250,(5-row*2)*300,250,300);renderer.setScissor(col*250,(5-row*2)*300,250,300);renderer.render(scene,camera);
   const label=(line,text)=>{const label=document.createElement('div');label.style.cssText=`position:fixed;left:${col*250+8}px;top:${line*300+8}px;color:#eee8d7;font:12px system-ui`;label.textContent=text;document.body.append(label);};
   label(row*2,`SOURCE ${name} · ${(fraction*100).toFixed(1)}%`);
   // Direct shared retarget audition, not runtime timing or imported root travel.
   const fighter=new Fighter(ROSTER.find(d=>d.id==='sarge'));fighter.obj.scale.setScalar(.15);fighter.pos.y=row===2?0:.12;fighter.parts.groundRig.visible=false;
   for(const key of ['aura','shadow','ring','guardArc'])if(fighter.parts[key])fighter.parts[key].visible=false;
   scene.add(fighter.obj);source.scene.visible=false;
   const targetClip=JUMP_CLIPS[['takeoff','fall','landing'][row]],frame=new Float64Array(45);samplePoseFrame(targetClip,fraction,frame,false);applyAuthoredPose(fighter,frame,1,{hips:true,support:row===2});
   renderer.setViewport(col*250,(4-row*2)*300,250,300);renderer.setScissor(col*250,(4-row*2)*300,250,300);renderer.render(scene,camera);
   label(row*2+1,`ARMED TARGET · ${(fraction*100).toFixed(1)}% · no root travel`);scene.remove(fighter.obj);fighter.dispose();
  }
 });
 await page.screenshot({path:`${out}/source-target-quarters.png`});console.log('Source/target quarters captured');
 if(process.argv[2]==='source')process.exitCode=0;
 else{
  await page.setViewportSize({width:1280,height:850});await page.goto(`${url}/studio.html?hero=sarge`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('groundJump');
  const studio=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(.75);const first={position:p.fighter.pos.toArray(),take:p.fighter._jumpMotion.take,phase:p.fighter._jumpMotion.phase};p.seek(2);const landed=p.fighter.pos.y;p.seek(.75);return {first,repeat:{position:p.fighter.pos.toArray(),take:p.fighter._jumpMotion.take,phase:p.fighter._jumpMotion.phase},landed,sound:p.sound.active};});
  assert.deepEqual(studio.first,studio.repeat);assert.equal(studio.landed,0);assert.equal(studio.sound,false);await page.screenshot({path:`${out}/studio-native-jump.png`});
  await writeFile(`${out}/studio-results.json`,JSON.stringify(studio,null,2));console.log('Studio seek/repeat passed');
 }
 }
 if(!['source','inspection'].includes(process.argv[2])){
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),gamePage=await context.newPage(),frames=[];
  gamePage.on('pageerror',e=>errors.push(e.message));
  try{
   await gamePage.goto(`${url}/powerworld.html`);await gamePage.waitForFunction(()=>window.LSW?.game);await gamePage.locator('#pwGo').click();
   await gamePage.evaluate(()=>{
    const g=LSW.game;g.setPlayerChar('sarge');const f=g.player,update=g.update.bind(g),render=g.world.render.bind(g.world);LSW.hud.setPlayer(f.def);
    // PowerWorld's mode.tick supplies the dimension flags to late arrivals.
    g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};for(const actor of g.entities)if(actor!==f){actor.ai=null;actor.pos.set(300,50,300);}
    g.input.keys.clear();g.input.endFrame();g.hardLock=null;g.world._lookYaw=0;g.world._lookPitch=0;
    f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;
    const key=(code,on)=>{if(on&&g._tapT)g._tapT[code]=-9;dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));};
    const step=()=>{update(1/60);g.input.endFrame();};for(let i=0;i<30;i++)step();key('KeyW',true);for(let i=0;i<50;i++)step();
    const note=document.createElement('div');note.id='jump-proof-note';note.style.cssText='position:fixed;left:20px;top:85px;color:white;background:#171c18dd;padding:8px;z-index:10000;font:13px system-ui';note.textContent='Native W + four-frame Space tap · SARGE armed · production camera';document.body.append(note);
    window.jumpProof={g,f,key,step,render};
   });
   for(let i=0;i<120;i++){
    frames.push(await gamePage.evaluate(async i=>{const {g,f,key,step,render}=jumpProof;if(i===0)key('Space',true);if(i===4)key('Space',false);if(i===80)key('KeyW',false);step();render();await new Promise(requestAnimationFrame);
     return {frame:i,y:f.pos.y,vy:f.vel.y,flying:f.flying,gait:f.gait,pitch:f.parts.g.rotation.x,take:f._jumpMotion?.take,phase:f._jumpMotion?.phase};},i));
    if([2,8,24,40,52,80,119].includes(i))await gamePage.screenshot({path:`${out}/game-${String(i).padStart(3,'0')}.png`});
   }
   await writeFile(`${out}/game-results.json`,JSON.stringify({frames,errors},null,2));
   assert.ok(frames.every(f=>!f.flying&&Math.abs(f.pitch)<.35));assert.equal(frames[0].vy,24.5);assert.ok(Math.max(...frames.map(f=>f.y))>3);assert.equal(frames.at(-1).y,0);
   // One additional armed/aimed diagnostic frame, explicitly not the game lens.
   await gamePage.evaluate(async()=>{const {g,f,key,step,render}=jumpProof;const {runSlot}=await import('/src/engine/abilities.js');key('KeyW',true);key('Space',true);for(let i=0;i<22;i++){if(i===4)key('Space',false);f.hasAimWorld=true;f.aimWorld.set(f.pos.x+15,14,f.pos.z+90);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/60},g);step();}g.world.camera.position.set(f.pos.x+19,f.pos.y+10,f.pos.z+23);g.world.camera.lookAt(f.pos.x,f.pos.y+5,f.pos.z);document.querySelector('#jump-proof-note').textContent='Native armed jump + rifle aim · extra inspection lens (not production camera)';render();});
   await gamePage.screenshot({path:`${out}/armed-aim-inspection.png`});
   await writeFile(`${out}/game-results.json`,JSON.stringify({frames,errors},null,2));console.log(JSON.stringify({nativeFrames:frames.length,apex:Math.max(...frames.map(f=>f.y)),takes:[...new Set(frames.map(f=>f.take))],errors}));
  }finally{await context.close();await gamePage.video()?.saveAs(`${out}/native-jump.webm`);}
 }
 if(process.argv[2]==='inspection'){
  await page.setViewportSize({width:1280,height:850});await page.goto(`${url}/studio.html?hero=sarge`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('groundJump');await page.getByRole('button',{name:'Side view',exact:true}).click();
  await page.evaluate(async()=>{const p=STUDIO.preview,{runSlot}=await import('/src/engine/abilities.js');p.seek(0);
   for(let i=1;i<=44;i++){const f=p.fighter;f.hasAimWorld=true;f.aimWorld.set(f.pos.x+12,14,f.pos.z+90);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();runSlot(f,'lmb',{pressed:i===1,held:true,released:false,dt:1/60},p.combat.game);p.time=i/60;p.step(1/60,false,false);p.combat.game.projectiles.update(1/60,p.combat.game);}
   p.step(0);const note=document.createElement('div');note.style.cssText='position:fixed;left:25px;top:75px;color:white;background:#171c18dd;padding:8px;z-index:10000;font:13px system-ui';note.textContent='Native Studio jump + native rifle slot · supplied aim · side inspection lens';document.body.append(note);
  });
  await page.screenshot({path:`${out}/armed-aim-inspection.png`});console.log('One armed/aimed native Studio jump inspection frame captured');
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(`${out}/browser-errors.json`,JSON.stringify(errors));await browser.close();}
