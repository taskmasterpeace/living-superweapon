import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

// Run AFTER Task 3 publishes its protecting source. Real Game/player Guard and
// projectile sweeps; precision incoming launch fixtures, not AI firing/aim proof.
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180',privatePreview=process.env.LSW_NANITE_PRIVATE==='1',fitOnly=process.env.LSW_NANITE_FIT_ONLY==='1',out=fitOnly?'artifacts/nanite-shield-fit':privatePreview?'artifacts/nanite-contact-private':'artifacts/nanite-contact';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[],cases=[];page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(async privatePreview=>{
  const {game:g,THREE:T,ROSTER}=LSW;
  const {freshPicks,buildDef,POWERS}=await import('/src/data/creator.js');
  const {applyProfile,profileFromDef}=await import('/src/tool/studio-profile.js');
  const {naniteContact}=await import('/src/engine/nanite-forearms.js');
  if(!privatePreview&&!POWERS.some(p=>p.id==='nanite-shield'))throw Error('Physical shield publication gate must pass before browser acceptance');
  const update=g.update.bind(g),render=g.world.render.bind(g.world),hit=g.onHit.bind(g);
  g.update=()=>{};g.world.render=()=>{};g.controlBot=()=>{};
  let f,source,spec,events=[],shots=[],launches=[],queuedDamage=null,initialHp,inspectionCamera,inspectionCell=4;
  const key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
  const note=document.createElement('div');note.style.cssText='position:fixed;left:20px;right:20px;top:80px;color:#fff3d9;background:#171c18ed;padding:8px;z-index:10000;font:13px system-ui';document.body.append(note);
  g.onHit=(target,amount,opts,blocked)=>{if(target===f)events.push({time:g.time,amount,blocked,absorbed:opts?.naniteResult?.absorbed??0,integrity:opts?.naniteResult?.integrity??0,cell:opts?.naniteContact?.cell});return hit(target,amount,opts,blocked);};
  const cellFrame=()=>{
   f.obj.updateMatrixWorld(true);const v=f.parts.nanites.get('e'),cell=v.layout.find(c=>c.cell===inspectionCell),matrix=v.root.matrixWorld.clone().multiply(cell.matrix);
   const center=new T.Vector3().setFromMatrixPosition(matrix),body=f.parts.torso.getWorldPosition(new T.Vector3());
   return {center,direction:body.sub(center).normalize(),normal:new T.Vector3(0,0,1).transformDirection(matrix)};
  };
  const nativeProjectilesUpdate=g.projectiles.update.bind(g.projectiles);
  g.projectiles.update=(dt,...args)=>{
   if(dt>0&&queuedDamage!==null){
    // Precision fixture releases from the current final-pose lane, like the
    // native charged-launch prepass. It never freezes or predicts the receiver.
    const damage=queuedDamage;queuedDamage=null;
    const {center,direction}=cellFrame(),position=center.clone().addScaledVector(direction,-1);
    const shot=g.projectiles.spawnProjectile(source,{pos:position,vel:direction.clone().multiplyScalar(120),radius:.035,damage,ballistic:true,weapon:'rifle',ground:false,color:'#ffd97a',life:2});
    const probe={},found=naniteContact(f,position,position.clone().addScaledVector(direction,10),.035,probe);
    shots.push(shot);launches.push({time:g.time,damage,center:center.toArray(),position:position.toArray(),direction:direction.toArray(),query:{found,t:probe.t,slot:probe.naniteContact?.slot,cell:probe.naniteContact?.cell}});
   }
   return nativeProjectilesUpdate(dt,...args);
  };
  const state=()=>{
   const m=f._nanites.modules.get('e'),v=f.parts.nanites.get('e');
   return {time:g.time,hp:f.hp,damage:initialHp-f.hp,guarding:f.guarding,guardMeter:f.guardMeter,position:f.pos.toArray(),
    ready:m.ready,assembly:m.assemblyT,cells:m.cells.map(c=>({hp:c.hp,broken:c.broken,quiet:c.quietT,reform:c.reformT})),
    fragments:v.fragments.count,events:events.map(e=>({...e})),launches:launches.map(l=>({...l})),shots:shots.map(s=>({dead:!!s.dead,position:s.pos.toArray()}))};
  };
  window.naniteContactProof={
   setup(next){
    spec=next;events=[];shots=[];launches=[];queuedDamage=null;inspectionCell=4;g.input.keys.clear();g.input.endFrame();
    const basis=buildDef({...freshPicks(),name:'SHIELD CONTACT',cape:false,budget:'unbound',flightTier:3,
     slots:{lmb:'kibolt',rmb:'heatray',q:'nanite-cannon',e:privatePreview?null:'nanite-shield',f:null,r:null}},'cx_nanite_contact_browser');
    if(privatePreview)basis.abilities.e={type:'naniteShield',name:'PRIVATE protecting shield fixture',naniteForm:'shield',naniteAttachment:'left-forearm',cost:0,cd:.2};
    const profile=profileFromDef(basis);profile.model.body=spec.body;profile.model.costume='fitted';profile.frame.scale=spec.scale;profile.frame.bulk=spec.bulk;
    const def=applyProfile(basis,profile),index=ROSTER.findIndex(d=>d.id===def.id);if(index>=0)ROSTER[index]=def;else ROSTER.push(def);
    g.startMode('powerworld',{p1:def.id,p2:'sol'});f=g.player;LSW.hud.setPlayer(f.def);
    for(const actor of g.entities)if(actor!==f){actor.ai=null;actor.pos.set(900,900,900);}
    f.pos.set(-70,150,-70);f.vel.set(0,0,0);f.level=10;f.invuln=0;f.hp=f.maxHp;initialHp=f.hp;f.flying=true;f.gait='airborne';
    // Native training dummies cannot be attackers (Game.isFoe rejects them).
    // Use a real, explicitly staged hostile Fighter without scripted AI.
    const sourceDef=structuredClone(ROSTER.find(d=>d.id==='sol'));sourceDef.id='cx_nanite_incoming_fixture';sourceDef.name='Incoming test fighter';sourceDef.abilities={};
    source=g.addFighter(sourceDef,{team:1,x:-70,z:-10});source.pos.y=150;source.flying=true;source.gait='airborne';source._openSky=true;source._vis=1;
    source.hp=source.maxHp=1000;source.invuln=0;source.vel.set(0,0,0);g.hardLock=source;if(!g.isFoe(source,f))throw Error('Incoming source must be a genuine native hostile');
    g.world._lookYaw=0;g.world._lookPitch=0;g.world._lookActive=true;g.world.snapChase();key('KeyC',true);
    note.textContent=`${privatePreview?'PRIVATE SOURCE · ':''}NATIVE SHIELD CONTACT · ${spec.body} · real Guard / precision incoming projectile fixture`;
    return state();
   },
   step(){update(1/60);g.input.endFrame();render();return state();},
   fire(damage){
    if(queuedDamage!==null)throw Error('Precision launch already queued');queuedDamage=damage;
    const {center,direction}=cellFrame(),position=center.clone().addScaledVector(direction,-1);
    const probe={},found=naniteContact(f,position,position.clone().addScaledVector(direction,10),.035,probe);
    return {requestedAt:g.time,start:state(),center:center.toArray(),direction:direction.toArray(),query:{found,t:probe.t,slot:probe.naniteContact?.slot,cell:probe.naniteContact?.cell},team:{source:source.team,owner:f.team}};
   },
   move(on){key('KeyD',on);},
   selectCell(cell){inspectionCell=cell;},
   inspect(angle='front'){
    inspectionCamera={position:g.world.camera.position.clone(),quaternion:g.world.camera.quaternion.clone(),note:note.textContent};
    const {center}=cellFrame();g.world.camera.position.copy(center).add((angle==='side'?new T.Vector3(11,2,1):new T.Vector3(-7,3,9)).multiplyScalar(spec.scale));g.world.camera.lookAt(center);
    note.textContent=`NATIVE PANEL CONTACT · ${angle} close-up inspection angle (not gameplay framing)`;render();
   },
   gameView(){if(inspectionCamera){g.world.camera.position.copy(inspectionCamera.position);g.world.camera.quaternion.copy(inspectionCamera.quaternion);g.world.camera.updateMatrixWorld(true);note.textContent=inspectionCamera.note;inspectionCamera=null;}},
   state,
  };
 },privatePreview);
 for(const spec of [
  {body:'superhero-female',scale:.65,bulk:.65},
  {body:'superhero-male',scale:1,bulk:1},
  {body:'procedural',scale:1.5,bulk:1.65},
  {body:'superhero-male',scale:.65,bulk:1.65},
  {body:'superhero-female',scale:.65,bulk:1.65},
  {body:'procedural',scale:.65,bulk:1.65},
 ]){
  const dir=`${out}/${spec.body}-${spec.scale}-${spec.bulk}`;await mkdir(dir,{recursive:true});const proof={spec,phases:{}};cases.push(proof);
  await page.evaluate(spec=>naniteContactProof.setup(spec),spec);
  const step=async count=>{let row;for(let i=0;i<count;i++)row=await page.evaluate(async()=>{const row=naniteContactProof.step();await new Promise(requestAnimationFrame);return row;});return row;};
  const capture=async label=>{await page.screenshot({path:`${dir}/${label}-game.png`});for(const angle of ['front','side']){await page.evaluate(angle=>naniteContactProof.inspect(angle),angle);await page.screenshot({path:`${dir}/${label}-${angle}.png`});await page.evaluate(()=>naniteContactProof.gameView());}};
  proof.phases.ready=await step(60);assert.equal(proof.phases.ready.ready,true);assert.equal(proof.phases.ready.guarding,true);await capture('ready');
  if(fitOnly)continue;
  proof.soft=await page.evaluate(()=>naniteContactProof.fire(4));proof.phases.soak=await step(5);await capture('soak');
  assert.equal(proof.phases.soak.hp,proof.phases.ready.hp,'Intact raised cell must fully absorb the small accepted hit');
  assert.ok(proof.phases.soak.cells[4].hp<proof.phases.ready.cells[4].hp,'Real projectile must debit the struck cell');
  assert.ok(proof.phases.soak.guardMeter<proof.phases.ready.guardMeter,'Full soak must retain native Guard consequences');
  proof.heavy=await page.evaluate(()=>naniteContactProof.fire(30));proof.phases.broken=await step(5);await capture('broken');
  assert.equal(proof.phases.broken.cells.filter(c=>c.broken).length,1);proof.brokenCell=proof.phases.broken.cells.findIndex(c=>c.broken);
  await page.evaluate(cell=>naniteContactProof.selectCell(cell),proof.brokenCell);
  // Allow the native hit-pose to settle before targeting a narrow moving hole.
  // Firing immediately during recoil can legitimately strike its neighbor.
  // This remains inside the .4s quiet period; no cell repair is injected.
  proof.phases.holeReady=await step(12);assert.equal(proof.phases.holeReady.cells[proof.brokenCell].hp,0);
  proof.hole=await page.evaluate(()=>naniteContactProof.fire(4));proof.phases.through=await step(8);await capture('through');
  assert.ok(proof.phases.through.hp<proof.phases.broken.hp,'A narrow shot through the missing plate must reach real owner HP');
  assert.equal(proof.phases.through.cells[proof.brokenCell].hp,0,'The missing plate cannot absorb or be billed again');
  await page.evaluate(()=>naniteContactProof.move(true));proof.phases.reforming=await step(32);await capture('reforming');
  proof.phases.repaired=await step(70);await page.evaluate(()=>naniteContactProof.move(false));await capture('repaired');
  assert.equal(proof.phases.repaired.cells[proof.brokenCell].broken,false);assert.equal(proof.phases.repaired.cells[proof.brokenCell].hp,proof.phases.ready.cells[proof.brokenCell].hp);
  assert.notDeepEqual(proof.phases.repaired.position,proof.phases.through.position,'Repair must follow a natively moving forearm');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fitOnly,cases:cases.map(c=>fitOnly?{...c.spec,ready:c.phases.ready.ready}:{...c.spec,soak:c.phases.soak.cells[4].hp,brokenCell:c.brokenCell,bodyDamage:c.phases.through.damage,repaired:c.phases.repaired.cells[c.brokenCell].hp}),errors}));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/results.json`,JSON.stringify({scope:fitOnly?'Native Guard fit imagery only; no contact acceptance.':'Native Game/Guard with precision ballistic launch fixtures; no direct reducer damage, AI firing, or subjective feel claim.',fitOnly,privateSource:privatePreview,cases,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/native-panel-contact.webm`);await browser.close();}
