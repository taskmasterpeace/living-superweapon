import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='artifacts/air-cast-locomotion';
const baseUrl=process.env.LSW_AIR_LEG_URL||'http://127.0.0.1:5180';
const kinds=['palm','two-hand','eye','chest','rifle'],selected=process.argv[2];
assert.ok(!selected||kinds.includes(selected),'Unknown emitter inspection');
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const results=selected?JSON.parse(await readFile(`${out}/results.json`,'utf8').catch(()=>'[]')).filter(row=>row.kind!==selected):[];
try{
 for(const kind of selected?[selected]:kinds){
  const dir=`${out}/${kind}`;await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir,size:{width:1440,height:1000}}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(`${baseUrl}/studio.html?hero=${kind==='rifle'?'sarge':'sol'}`);
   await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
   await page.getByRole('button',{name:'Pause preview',exact:true}).click();
   await page.evaluate(async kind=>{
    const p=STUDIO.preview,T=await import('/node_modules/three/build/three.module.js');
    const {Fighter}=await import('/src/engine/entity.js'),{ROSTER}=await import('/src/data/characters.js');
    const {runSlot}=await import('/src/engine/abilities.js');
    p.playing=false;p.view='front';p.controls.enabled=false;p.combat.clear();p.fighter.dispose();p.scene.remove(p.fighter.obj);
    const def=structuredClone(ROSTER.find(d=>d.id===(kind==='rifle'?'sarge':'sol')));
    if(kind==='rifle')def.abilities.lmb.recoil=0;
    else def.abilities={lmb:{type:'beam',name:'Procedural air-leg inspection',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffaa44',
     faceOrigin:kind==='eye',chest:kind==='chest',castStyle:kind==='two-hand'?'two-hand':kind==='chest'?'chest-brace':kind==='eye'?'optic-focus':'palm'}};
    const f=p.fighter=new Fighter(def),g=p.combat.game;p.scene.add(f.obj);g.entities=[f];f._game=g;
    Object.assign(f,{_openSky:true,flying:true,gait:'airborne',hasAimWorld:true,energyInfinite:true,level:10,animT:0});
    f.pos.set(0,18,0);f.obj.position.copy(f.pos);f.faceDir(0,1);f.aimWorld.set(0,25,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
    const arrow=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(0,16,0),8,0xffcc55,1.2,.6);p.scene.add(arrow);
    const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);f.obj.updateMatrixWorld(true);g.projectiles.update(1/60,g);g.particles.update(1/60);g.vfx.update(1/60);};
    for(let i=0;i<60;i++)step();
    const legs=()=>[f.parts.legL.rotation.x,f.parts.legR.rotation.x,f.parts.legL.userData.knee.rotation.x,f.parts.legR.userData.knee.rotation.x];
    window.airLegStep=frame=>{
     const velocity=frame<90?[0,0,0]:frame<150?[0,0,45]:frame<210?[0,30,14]:frame<270?[0,-30,14]:[0,0,0];
     f.vel.set(...velocity);const held=frame>=30&&frame<270;
     f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-1/60);
     runSlot(f,'lmb',{pressed:frame===30,held,released:frame===270,dt:1/60},g);step();
     arrow.visible=velocity.some(n=>n!==0);if(arrow.visible)arrow.setDirection(f.vel.clone().normalize());
     const phase=frame<30?'neutral':frame<90?'entry / hover brace':frame<150?'cruise':frame<210?'rise':frame<270?'descent':'release / recover';
     p.camera.position.set(24,31,33);p.camera.fov=38;p.camera.lookAt(0,23,0);p.camera.updateProjectionMatrix();
     document.querySelector('.view-tag').textContent=`${kind.toUpperCase()} / ${phase.toUpperCase()}`;
     document.querySelector('.viewport-note').textContent='Scripted procedural motion: native Fighter + runSlot; supplied velocity, fixed position. Gold arrow = travel. No gameplay-camera or player-input claim.';
     document.querySelector('.measurements').textContent=`Legs ${legs().map(n=>n.toFixed(2)).join(' / ')} rad`;
     p.renderer.render(p.scene,p.camera);
     return {frame,phase,legs:legs(),velocity,position:f.pos.toArray(),carrier:f.obj.rotation.x,castWeight:f._combatAim?.weight||0};
    };
   },kind);
   const rows=[];
   for(const [start,end,name]of [[0,30,'neutral'],[30,50,'entry'],[50,90,'hover'],[90,150,'cruise'],[150,210,'rise'],[210,270,'descent'],[270,290,'release'],[290,390,'recovered']]){
    rows.push(...await page.evaluate(async({start,end})=>{const r=[];for(let i=start;i<end;i++){r.push(airLegStep(i));await new Promise(requestAnimationFrame);}return r;},{start,end}));
    await page.locator('.viewport').screenshot({path:`${dir}/${name}.png`});
   }
   assert.deepEqual(errors,[]);
   // SARGE's native thruster profile has the same .12 knee in hover/cruise;
   // its smaller additive hover brace is intentional, unlike SOL's tucked leg.
   assert.ok(rows[89].legs[2]-rows[149].legs[2]>.1,'Native browser hold lost flight leg response');
   assert.ok(rows.every(row=>row.position.every((v,i)=>v===[0,18,0][i])),'Pose changed fixed simulation position');
   const result={kind,frames:rows.length,hover:rows[89].legs,cruise:rows[149].legs,errors,rows};results.push(result);
   await writeFile(`${dir}/results.json`,JSON.stringify(result,null,2));
   console.log(JSON.stringify({kind,frames:rows.length,hover:rows[89].legs,cruise:rows[149].legs,errors}));
  }finally{await context.close();await page.video()?.saveAs(`${dir}/motion.webm`);}
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}
