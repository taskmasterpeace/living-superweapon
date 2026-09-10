// Import the UI-exported custom character into isolated browser storage, then
// exercise native gameplay with real mouse/keyboard edges and physics.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const label=process.argv[2]||'review';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const out=`artifacts/authored-origins/${label}`;await mkdir(out,{recursive:true});
const pack=JSON.parse(await readFile(`${out}/palm-relay.json`,'utf8'));
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(45000);
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();await page.locator('#profile-json').fill(JSON.stringify(pack));
 await page.getByRole('button',{name:'Import profile',exact:true}).click();await page.waitForFunction(()=>STUDIO.preview.fighter.def.name==='PALM RELAY');
 const id=await page.evaluate(()=>STUDIO.history.value.heroId);
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);
 await page.locator(`#pwTitle .pwc[data-id="${id}"]`).click();await page.locator('#pwGo').click();
 const initial=await page.evaluate(id=>{
  const {game:g,THREE:T}=LSW,world=g.world,update=g.update.bind(g),render=world.render.bind(world);
  g.update=()=>{};world.render=()=>{};g.controlBot=()=>{};g.fov=false;world.setFogEnabled(false);
  const f=g.player;for(const other of g.entities)if(other!==f){other.ai=null;other.pos.set(800,100,800);}
  f.level=10;f.invuln=100;f.pos.set(0,0,-80);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';g.hardLock=null;
  world._lookActive=true;world._lookYaw=0;world._lookPitch=0;world._shake=0;world.snapChase();
  const end=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};g.input.keys.clear();end();
  const shots=[],spawn=g.projectiles.spawnProjectile.bind(g.projectiles);g.projectiles.spawnProjectile=(...args)=>{const p=spawn(...args);shots.push(p);return p;};
  window.originGameStep=frame=>{
   const before=new Set(shots);update(1/60);end();const s=f.slots.lmb,b=s.active,hand=f.parts.armR.children[2].getWorldPosition(new T.Vector3());
   const emitted=shots.filter(p=>!before.has(p)).map(p=>{
    const expected=hand.clone().addScaledVector(f.aimWorld.clone().sub(hand).normalize(),p.radius);
    return {position:p.launchOrigin?.toArray(),gap:p.launchOrigin?.distanceTo(expected),radius:p.radius};
   });
   return {frame,pos:f.pos.toArray(),ki:f.ki,beamAge:b?.emissionAge??0,muzzleGap:b&&!b.pendingLaunch?b.muzzle.distanceTo(hand):null,
    charging:f.slots.q.charging,orb:!!f.slots.q.orb,emitted};
  };
  window.originGameRender=()=>{g.hud.setPlayer(f.def);g.hud.update();render();};
  return {id:f.def.id,name:f.def.name,leftBeam:f.slots.lmb.def.castHand,leftCharge:f.slots.q.def.castHand,kit:f.def.abilities};
 },id);
 assert.equal(initial.id,id);assert.equal(initial.leftBeam,'left');assert.equal(initial.leftCharge,'left');
 for(let i=0;i<60;i++)await page.evaluate(i=>originGameStep(i),i);
 await page.mouse.move(640,400);await page.mouse.down();await page.keyboard.down('d');
 assert.ok(await page.evaluate(()=>!!document.pointerLockElement),'Native pointer lock never engaged');
 for(let i=0;i<120;i++)rows.push(await page.evaluate(i=>originGameStep(i),i));
 await page.evaluate(()=>originGameRender());await page.screenshot({path:`${out}/gameplay-left-beam.png`});
 await page.mouse.up();await page.keyboard.up('d');for(let i=0;i<60;i++)await page.evaluate(i=>originGameStep(i),i);
 // Set up an open airborne lane, then drive the actual charge input. This is
 // not takeoff evidence; no controller, emission source or cost is replaced.
 await page.evaluate(()=>{const f=LSW.game.player;f.pos.set(0,100,-80);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';LSW.game.world.snapChase();});
 await page.keyboard.down('q');await page.keyboard.down('a');
 for(let i=0;i<60;i++)rows.push(await page.evaluate(i=>originGameStep(120+i),i));
 await page.evaluate(()=>originGameRender());await page.screenshot({path:`${out}/gameplay-left-charge.png`});
 await page.keyboard.up('q');for(let i=0;i<30;i++)rows.push(await page.evaluate(i=>originGameStep(180+i),i));
 await page.keyboard.up('a');await page.evaluate(()=>originGameRender());await page.screenshot({path:`${out}/gameplay-charge-released.png`});
 const fault=await page.evaluate(()=>[...LSW.game._errSeen.entries()]);
 await writeFile(`${out}/gameplay-results.json`,JSON.stringify({initial,rows,errors,fault,scope:'Exported custom package imported through Studio UI → native PowerWorld. Real D/LMB and A/Q input, batched native controller/physics/pose/emission. Bots disabled, lane positions set up; not balance, takeoff or FPS evidence.'},null,2));
 assert.ok(rows.filter(r=>r.beamAge>0).length>70);assert.ok(rows.filter(r=>r.muzzleGap!==null).every(r=>r.muzzleGap<1e-5));
 assert.ok(Math.abs(rows[119].pos[0]-rows[0].pos[0])>8,'Native gameplay never moves');
 assert.ok(rows.some(r=>r.orb));const launches=rows.flatMap(r=>r.emitted);assert.ok(launches.length>0,'The actual Q release never launches');
 assert.ok(launches.every(p=>p.gap<1e-5),'Native charge release loses the selected palm');assert.deepEqual(errors,[]);assert.deepEqual(fault,[]);
 console.log(JSON.stringify({id,states:rows.length,emitting:rows.filter(r=>r.beamAge>0).length,launches,errors}));
}finally{await browser.close();}
