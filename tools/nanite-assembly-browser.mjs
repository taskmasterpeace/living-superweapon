import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Task 1 private-source inspection. This advances the native nanite reducer and
// production rig in Studio's existing lit scene; it does not publish an ability,
// simulate an incoming attack, or establish gameplay/authoring readiness.
const out='artifacts/nanite-assembly';await mkdir(out,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],rows=[],motionRows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Preview level',{exact:true}).selectOption('10');
 await page.evaluate(async()=>{
  const threeUrl=performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname.endsWith('/three.js'));
  if(!threeUrl)throw Error('The already-loaded Vite Three.js module was not found');
  const T=await import(threeUrl),state=await import('/src/engine/nanite-state.js'),views=await import('/src/engine/nanite-forearms.js');
  const {profileFromDef}=await import('/src/tool/studio-profile.js');
  const {ROSTER}=await import('/src/data/characters.js');
  const p=STUDIO.preview,base=structuredClone(ROSTER.find(d=>d.id==='sol'));
  const cannon={type:'charge',name:'PRIVATE cannon fit',naniteForm:'cannon',naniteAttachment:'right-forearm',castStyle:'palm',castHand:'right',cost:6,cd:1.2,kiPerSec:12,maxCharge:1.8,minR:.55,maxR:1.8,dmgMin:20,dmgMax:64,maxBlast:18,speedMin:65,speedMax:105,chargePower:2.2,color:'#ffd97a',color2:'#ffffff'};
  const shield={type:'naniteShield',name:'PRIVATE shield fit',naniteForm:'shield',naniteAttachment:'left-forearm',cost:0,cd:.2};
  const banner=document.createElement('p');banner.style.cssText='position:absolute;left:18px;right:18px;bottom:16px;padding:10px;background:#1c211fed;color:#f5edd9;font:12px system-ui;z-index:4;pointer-events:none';
  p.host.append(banner);
  const inspect=()=>{
   const f=p.fighter,fragments=[];f.obj.traverse(o=>{if(o.isInstancedMesh&&o.userData.naniteOwned)fragments.push({name:o.name,count:o.count,capacity:o.instanceMatrix.count,visible:o.visible});});
   return {time:p.time,position:f.pos.toArray(),body:f.parts.skin?.id||'procedural',modules:[...f._nanites.modules].map(([slot,m])=>({slot,ready:m.ready,deployed:m.deployed,assemblyT:m.assemblyT,epoch:m.epoch,cells:m.cells.map(c=>({hp:c.hp,broken:c.broken,quietT:c.quietT,reformT:c.reformT}))})),fragments,contactCells:views.snapshotNaniteCells(f).map(c=>({...c,matrix:c.matrix.toArray()}))};
  };
  const frame=view=>{
   p.setView(view);
   // Inspection-only framing uses visible rendered meshes, including weighted
   // source anatomy. It neither edits nor certifies the gameplay chase camera.
   const box=new T.Box3();p.fighter.obj.updateMatrixWorld(true);
   p.fighter.obj.traverseVisible(o=>{
    if(!o.isMesh||!o.layers.isEnabled(0)||!o.geometry||[].concat(o.material).some(m=>m.transparent))return;
    if(o.isSkinnedMesh||o.isInstancedMesh){o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}
    else{o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}
   });
   const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
   const direction=new T.Vector3(...({front:[0,.15,1],side:[1,.15,0],rear:[0,.15,-1],orbit:[.8,.35,1]}[view]));
   const distance=Math.max(size.y,size.x/p.camera.aspect,size.z)*.7/Math.tan(T.MathUtils.degToRad(p.camera.fov*.5));
   p.controls.minDistance=1;p.camera.position.copy(center).addScaledVector(direction.normalize(),Math.max(8,distance));p.controls.target.copy(center);p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
  };
  window.naniteAssembly={
   setup({body,scale,bulk,mirror=false,pose='hover'}){
    const def=structuredClone(base);def.id='private_nanite_assembly';def.name='PRIVATE NANITE FIT';
    def.model={...def.model,body};def.frame={scale,bulk,broad:1,head:1,neck:1,stance:1};
    // This private fitting fixture has no cape, keeping the rear forearms visible.
    def.colors={...def.colors};delete def.colors.cape;
    def.abilities={q:{...cannon,naniteAttachment:mirror?'left-forearm':'right-forearm'},e:{...shield,naniteAttachment:mirror?'right-forearm':'left-forearm'}};
    p.setProfile(def,profileFromDef(def));p.setState(pose);p.seek(0);
    banner.textContent=`PRIVATE STATE / RIG INSPECTION · ${body} · scale ${scale} / bulk ${bulk} · ${mirror?'mirrored':'default'} attachments · no attack or UI capability claim`;
    return inspect();
   },
   advance(duration){
    const steps=Math.max(1,Math.ceil(duration*60)),dt=duration/steps;
    for(let i=0;i<steps;i++){state.advanceNanites(p.fighter._nanites,dt,new Set(['q','e']));p.time+=dt;p.step(dt,false,false);}
    p.renderer.render(p.scene,p.camera);return inspect();
   },
   breakCell(slot='e',cell=4){
    const f=p.fighter,contact=views.snapshotNaniteCells(f).find(c=>c.slot===slot&&c.cell===cell);
    if(!contact)throw Error('No assembled cell for the direct reducer inspection');
    const point=new T.Vector3(0,0,.5).applyMatrix4(contact.matrix),normal=new T.Vector3(0,0,1).applyNormalMatrix(new T.Matrix3().getNormalMatrix(contact.matrix));
    const result=state.damageNanite(f._nanites,{...contact,point,normal},20,slot==='e');views.presentNanites(f);p.renderer.render(p.scene,p.camera);
    banner.textContent='PRIVATE MOVING RIG INSPECTION · directly injected local cell damage/reform · not a gameplay hit or shield-interception test';
    return {result,state:inspect()};
   },
   frame,inspect,
  };
 });
 for(const body of ['procedural','superhero-male','superhero-female']){
  for(const [label,scale,bulk,mirror] of [['normal',1,1,false],['small',.65,.65,true],['large',1.5,1.65,false]]){
   const id=body+'-'+label,dir=`${out}/${id}`;await mkdir(dir,{recursive:true});
   const start=await page.evaluate(config=>naniteAssembly.setup(config),{body,scale,bulk,mirror});
   assert.equal(start.modules.length,2);assert.ok(start.modules.every(m=>!m.ready));assert.equal(start.body,body);
   await page.evaluate(()=>naniteAssembly.frame('front'));await page.locator('.viewport').screenshot({path:dir+'/00-start.png'});
   const middle=await page.evaluate(()=>naniteAssembly.advance(.325));
   await page.evaluate(()=>naniteAssembly.frame('front'));await page.locator('.viewport').screenshot({path:dir+'/01-assembling.png'});
   const closing=await page.evaluate(()=>naniteAssembly.advance(.2275));
   await page.evaluate(()=>naniteAssembly.frame('front'));await page.locator('.viewport').screenshot({path:dir+'/01-closing.png'});
   const settled=await page.evaluate(()=>naniteAssembly.advance(.1125));assert.ok(settled.modules.every(m=>m.ready));
   for(const view of ['front','side','rear','orbit']){
    await page.evaluate(view=>naniteAssembly.frame(view),view);await page.locator('.viewport').screenshot({path:`${dir}/02-settled-${view}.png`});
   }
   const paused=await page.evaluate(()=>{const before=naniteAssembly.inspect();naniteAssembly.advance(0);return {before,after:naniteAssembly.inspect()};});
   assert.deepEqual(paused.after,paused.before,'Zero-time inspection must not advance assembly or cells');
   rows.push({id,body,scale,bulk,mirror,start,middle,closing,settled});
  }
 }
 for(const body of ['procedural','superhero-male','superhero-female'])for(const pose of ['groundWalk','forward']){
  const id=body+'-'+pose,dir=`${out}/${id}`;await mkdir(dir,{recursive:true});
  await page.evaluate(config=>naniteAssembly.setup(config),{body,scale:1,bulk:1,pose});
  await page.evaluate(()=>naniteAssembly.advance(.665));
  await page.evaluate(()=>naniteAssembly.frame('orbit'));
  const hit=await page.evaluate(()=>naniteAssembly.breakCell());
  assert.equal(hit.result.absorbed,12);assert.equal(hit.result.remaining,8);
  assert.equal(hit.state.modules.find(m=>m.slot==='e').cells.filter(c=>c.broken).length,1);
  assert.equal(hit.state.contactCells.length,14);
  await page.locator('.viewport').screenshot({path:dir+'/00-local-break.png'});
  const reform=await page.evaluate(()=>naniteAssembly.advance(.775));
  assert.ok(reform.modules.find(m=>m.slot==='e').cells[4].broken);
  assert.ok(reform.modules.find(m=>m.slot==='e').cells[4].reformT>0);
  assert.notDeepEqual(reform.position,hit.state.position,'Reform inspection must actually travel');
  assert.notDeepEqual(reform.contactCells[0].matrix,hit.state.contactCells[0].matrix,'Intact cells must follow the moving rig');
  await page.locator('.viewport').screenshot({path:dir+'/01-local-reform.png'});
  const fixed=await page.evaluate(()=>naniteAssembly.advance(.375));
  assert.ok(fixed.modules.find(m=>m.slot==='e').cells.every(c=>!c.broken&&c.hp===12));
  assert.equal(fixed.contactCells.length,15);assert.ok(fixed.fragments.filter(o=>o.name.endsWith('-fragments')).every(o=>o.count===0));
  await page.locator('.viewport').screenshot({path:dir+'/02-local-restored.png'});
  motionRows.push({id,body,pose,hit,reform,fixed});
 }
 if(process.env.LSW_NANITE_REEL==='1'){
  await page.evaluate(()=>{
   naniteAssembly.setup({body:'superhero-female',scale:1,bulk:1,pose:'groundWalk'});naniteAssembly.frame('orbit');
   const stream=STUDIO.preview.renderer.domElement.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}),chunks=[];
   const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer())));});
   window.naniteReel={stream,recorder,done};recorder.start(100);
  });
  const samples=[];
  for(let frame=1;frame<=240;frame++){
   const result=await page.evaluate(async frame=>{
    const snapshot=naniteAssembly.advance(1/60);const hit=frame===75?naniteAssembly.breakCell():null;
    await new Promise(requestAnimationFrame);
    return [1,39,75,100,143,145,240].includes(frame)?{frame,snapshot,hit}:null;
   },frame);
   if(result)samples.push(result);
  }
  const bytes=await page.evaluate(async()=>{naniteReel.recorder.stop();const result=await naniteReel.done;for(const track of naniteReel.stream.getTracks())track.stop();return result;});
  assert.equal(samples.find(s=>s.frame===100).snapshot.contactCells.length,14);
  assert.equal(samples.find(s=>s.frame===145).snapshot.contactCells.length,15);
  await writeFile(`${out}/private-moving-assembly.webm`,Buffer.from(bytes));
  await writeFile(`${out}/reel-results.json`,JSON.stringify({scope:'Silent private state/rig inspection. Native Studio ground-walk travel plus shared nanite reducer; direct cell damage injection at frame 75. Not a native attack or player feel test.',simSeconds:4,samples,bytes:bytes.length},null,2));
 }
 await page.evaluate(()=>STUDIO.preview.dispose());assert.deepEqual(errors,[]);
 console.log(JSON.stringify({cases:rows.length,movingCases:motionRows.length,images:rows.length*7+motionRows.length*3,errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:'Private trusted sources; native reducer plus native rendered moving rig. Local damage is directly injected. Not native contact, ability execution or public authoring.',rows,motionRows,errors},null,2));await browser.close();}
