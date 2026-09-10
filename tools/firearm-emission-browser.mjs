import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/firearm-emission/verified';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],scenes=[];
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const spec of [{hero:'sarge',key:'lmb',mode:'ground'},{hero:'merc',key:'f',mode:'ground'},{hero:'titan',key:'rmb',mode:'hover'},{hero:'sarge',key:'lmb',mode:'cover'}]){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${spec.hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  // Exercise the visible editor's real selector before the close-up harness.
  await page.getByRole('combobox',{name:'Motion state',exact:true}).selectOption('attack');
  await page.locator('#combat-slot').selectOption(spec.key);
  assert.equal(await page.locator('#combat-slot').inputValue(),spec.key);
  assert.equal(await page.locator('#state option[value="attack"]').evaluate(o=>o.disabled),false);
  await page.evaluate(async spec=>{
   const p=STUDIO.preview,THREE=await import('/node_modules/three/build/three.module.js'),{runSlot}=await import('/src/engine/abilities.js');
   const {firearmEmitter}=await import('/src/engine/weapon-emission.js'),{World}=await import('/src/engine/world.js');
   p.playing=false;p.view='front';p.controls.enabled=false;const f=p.fighter;p.combat.reset(f,true,'attack');
   const g=p.combat.game,t=p.combat.target;f.level=10;f.ki=100000;f.animT=0;f.hasAimWorld=true;f._openSky=true;
   f.flying=spec.mode==='hover';f.gait=f.flying?'airborne':'grounded';f.facing=0;f.pos.set(0,f.flying?18:0,spec.mode==='cover'?-6:0);
   f.obj.position.copy(f.pos);f.vel.set(0,0,0);f.aimWorld.set(0,f.pos.y+8,40);f.aim3.set(0,0,1);f.aim.set(0,0,1);
   t.pos.set(0,f.pos.y+2.8,40);t.obj.position.copy(t.pos);t.flying=true;t.invuln=0;
   g.world.cover=[];g.world.interiors=[];g.world.hitInteriorWall=World.prototype.hitInteriorWall;
   if(spec.mode==='cover'){
    const wall={x:0,z:2.4,hx:13,hz:.02};g.world.interiors=[{x:0,z:2.4,hx:13,hz:.02,top:22,walls:[wall]}];
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(26,22,.04),new THREE.MeshStandardMaterial({color:'#858579',roughness:.75}));mesh.position.set(0,11,2.4);p.scene.add(mesh);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#c9c2aa'})));
   }
   const emitter=()=>firearmEmitter(f,f.slots[spec.key].def);
   for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
   window.gunView=side=>{
    const offset={front:[8,11,24],right:[25,10,0],back:[-8,12,-25],left:[-25,10,0]}[side];
    p.camera.position.set(offset[0],f.pos.y+offset[1],offset[2]);p.controls.target.set(0,f.pos.y+6,0);p.camera.fov=44;
    p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
    document.querySelector('.view-tag').textContent=`${spec.hero.toUpperCase()} / ${spec.mode.toUpperCase()} / ${side.toUpperCase()} INSPECTION`;
    document.querySelector('.viewport-note').textContent='Actual equipped Fighter, production trigger, animated barrel and projectile contact. Inspection camera, not gameplay framing.';
   };
   gunView('right');
   window.gunStep=frame=>{
    const dt=1/60,time=frame*dt;g.time+=dt;
    if(spec.mode==='cover'){
     f.pos.z=time<2.8?Math.min(0,-6+time*6):-Math.min(6,(time-2.8)*6);f.vel.set(0,0,time<1?6:time>=2.8?-6:0);
    }else{f.pos.x=Math.sin(time*1.8)*3;f.vel.set(Math.cos(time*1.8)*5.4,0,0);}
    f.obj.position.copy(f.pos);f.aim3.copy(f.aimWorld).sub(f.muzzle(new THREE.Vector3())).normalize();
    f.slots[spec.key].cd=Math.max(0,f.slots[spec.key].cd-dt);const before=new Set(g.projectiles.list);
    runSlot(f,spec.key,{pressed:frame===10,held:frame>=10&&frame<150,released:frame===150,dt},g);
    f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);
    const source=emitter(),expected=source.socket.getWorldPosition(new THREE.Vector3()),shots=[];
    for(const s of g.projectiles.list)if(!before.has(s)){
     s.resolveLaunch(g);shots.push({gap:s.pos.distanceTo(expected),origin:s.pos.toArray(),direction:s.vel.clone().normalize().toArray()});
    }
    let meshMaxZ=-Infinity;source.hand.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;
     for(let i=0;i<mesh.geometry.attributes.position.count;i++)meshMaxZ=Math.max(meshMaxZ,mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).z);
    });
    g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);p.renderer.render(p.scene,p.camera);
    return {frame,shots,source:expected.toArray(),meshMaxZ,damage:p.combat.damage,groundWeight:f._groundMotion?.weight??0};
   };
  },spec);
  const rows=[];
  for(const [from,to,view]of [[0,50,'front'],[50,95,'right'],[95,140,'back'],[140,165,'left'],[165,230,'right']]){
   await page.evaluate(view=>gunView(view),view);
   rows.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(gunStep(i));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
   await page.locator('.viewport').screenshot({path:`${out}/${spec.hero}-${spec.mode}-${to===230?'recovery':view}.png`});
  }
  scenes.push({spec,rows});
 }
 await writeFile(out+'/results.json',JSON.stringify({scenes,errors},null,2));
 for(const {spec,rows}of scenes){
  const shots=rows.flatMap(r=>r.shots);assert.ok(shots.length>=(spec.hero==='merc'?5:15),'repeat count must respect the authored heavy-pistol interval');assert.ok(shots.every(s=>s.gap<1e-5));
  if(spec.mode==='cover'){assert.ok(rows.every(r=>r.meshMaxZ<2.38));assert.equal(rows.at(-1).damage,0);}
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(scenes.map(({spec,rows})=>({...spec,frames:rows.length,rounds:rows.flatMap(r=>r.shots).length,maxGap:Math.max(...rows.flatMap(r=>r.shots.map(s=>s.gap))),damage:rows.at(-1).damage,minClearance:spec.mode==='cover'?Math.min(...rows.map(r=>2.38-r.meshMaxZ)):null}))));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await page.video()?.saveAs(out+'/equipped-motion.webm');await browser.close();}
