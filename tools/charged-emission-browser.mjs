import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/charged-emission/verified';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],scenes=[];
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const spec of [{hero:'vega',slot:'q',style:'palm',motion:'ground-right'},{hero:'vega',slot:'q',style:'two-hand',motion:'ground-left'},
  {hero:'titan',slot:'q',style:'chest-brace',motion:'hover'},{hero:'vega',slot:'q',style:'two-hand',motion:'hover',cover:true}]){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${spec.hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByRole('combobox',{name:'Motion state',exact:true}).selectOption('attack');
  await page.locator('#combat-slot').selectOption(spec.slot);
  await page.evaluate(async spec=>{
   const p=STUDIO.preview,THREE=await import('/node_modules/three/build/three.module.js');
   p.playing=false;p.view='front';p.controls.enabled=false;
   const c=p.combat,f=p.fighter;c.slot=spec.slot;c.reset(f,true,'attack');c.shooterMotion=spec.motion;c.distance=50;c.chargeHold=1.8;
   f.slots[spec.slot].def.castStyle=spec.style;f.level=10;f.ki=100000;
   c.game.world.cover=[];c.game.world.interiors=[];
   if(spec.cover){
    const top=f.pos.y+30,wall={x:0,z:7,hx:20,hz:.02};c.game.world.interiors=[{x:0,z:7,hx:20,hz:.02,top,walls:[wall]}];
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(40,top,.04),new THREE.MeshStandardMaterial({color:'#858579',roughness:.75}));
    mesh.position.set(0,top/2,7);p.scene.add(mesh);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:'#c9c2aa'})));
   }
   window.chargeView=side=>{
    const a={front:[12,12,29],right:[31,11,0],back:[-10,14,-32],left:[-31,11,0]}[side];
    p.camera.position.set(a[0],f.pos.y+a[1],a[2]);p.controls.target.set(0,f.pos.y+7,2);p.camera.fov=46;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
    document.querySelector('.view-tag').textContent=`${spec.hero.toUpperCase()} / ${spec.style.toUpperCase()} / ${side.toUpperCase()} INSPECTION`;
    document.querySelector('.viewport-note').textContent='Production Studio charge, launch, contact and recovery. Inspection camera, not gameplay framing.';
   };
   window.chargeStep=frame=>{
    const before=new Set(c.game.projectiles.list),time=(frame+1)/60;c.step(time,1/60);
    const s=f.slots[spec.slot],orb=s.orb,rows=[];
    for(const shot of c.game.projectiles.list)if(!before.has(shot))rows.push({origin:shot.launchOrigin?.toArray(),radius:shot.radius,damage:shot.damage});
    document.querySelector('.view-tag').textContent=`${spec.hero.toUpperCase()} / ${spec.style.toUpperCase()} / ${c.phase.toUpperCase()}`;
    p.renderer.render(p.scene,p.camera);
    return {frame,phase:c.phase,position:f.pos.toArray(),groundWeight:f._groundMotion?.weight??0,orb:orb?{center:orb.position.toArray(),radius:orb.scale.x,stored:s._chargeRadius}:null,shots:rows,damage:c.damage};
   };chargeView('right');
  },spec);
  const rows=[];
  for(const [from,to,view]of [[0,65,'front'],[65,100,'right'],[100,135,'back'],[135,158,'left'],[158,260,'right']]){
   await page.evaluate(view=>chargeView(view),view);
   rows.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(chargeStep(i));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
   await page.locator('.viewport').screenshot({path:`${out}/${spec.hero}-${spec.style}-${spec.cover?'cover':spec.motion}-${to===260?'recovery':view}.png`});
  }
  scenes.push({spec,rows});
 }
 await writeFile(out+'/results.json',JSON.stringify({scenes,errors},null,2));assert.deepEqual(errors,[]);
 for(const {spec,rows}of scenes){
  assert.ok(rows.some(r=>r.orb),'must actually hold a real charge');
  assert.ok(rows.some(r=>r.phase==='in flight'),'must actually release');
  if(spec.cover)assert.ok(rows.filter(r=>r.orb).every(r=>r.orb.center[2]+r.orb.radius<=6.9801));
 }
 console.log(JSON.stringify(scenes.map(({spec,rows})=>({...spec,frames:rows.length,chargeFrames:rows.filter(r=>r.orb).length,shots:rows.flatMap(r=>r.shots),damage:rows.at(-1).damage}))));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await context.close();await page.video()?.saveAs(out+'/charge-motion.webm');await browser.close();}
