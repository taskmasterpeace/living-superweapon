import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/chest-channel/final';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[],scenes=[];
page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const spec of [{kind:'shipped-charge',motion:'ground-right'},{kind:'shipped-charge',motion:'hover'},
  {kind:'dual-hose-fixture',motion:'ground-right'},{kind:'dual-hose-fixture',motion:'hover'}]){
  await page.goto('http://127.0.0.1:5180/studio.html?hero=titan');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();
  await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
  await page.getByLabel('Attack pose',{exact:true}).selectOption('chest-brace');
  await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
  await page.getByLabel('Preview level',{exact:true}).selectOption('10');
  await page.getByLabel('Preview attack',{exact:true}).selectOption('q');
  await page.getByLabel('Co-fire attack',{exact:true}).selectOption('lmb');
  await page.getByLabel('Fighter motion',{exact:true}).selectOption(spec.motion);
  await page.getByLabel('Target elevation',{exact:true}).fill('20');await page.getByLabel('Target elevation',{exact:true}).press('Tab');
  await page.evaluate(async spec=>{
   const p=STUDIO.preview,c=p.combat,f=p.fighter,THREE=await import('/node_modules/three/build/three.module.js');
   p.playing=false;p.view='front';p.controls.enabled=false;c.reset(f,true,'attack');
   c.shooterMotion=spec.motion;c.distance=55;c.motion='orbit-right';c.targetSpeed=20;c.chargeHold=1.8;
   if(spec.kind==='dual-hose-fixture'){
    // Deliberately distinct steering rates expose channel coupling. These are
    // labeled test powers; the shipped kit and saved profile are not rewritten.
    f.slots.q.def={type:'beam',name:'Chest test hose',chest:true,castStyle:'chest-brace',cost:1,kiPerSec:1,dps:1,steer:2,radius:.4,color:'#ffba48'};
    f.slots.lmb.def={type:'beam',name:'Palm test hose',castStyle:'palm',cost:1,kiPerSec:1,dps:1,steer:12,radius:.28,color:'#56bfff'};
   }
   f.energyInfinite=true;f.ki=f.maxKi;
   window.chestView=side=>{
    const offset={front:[14,12,27],right:[31,10,0],back:[-12,13,-29],left:[-31,11,0]}[side];
    p.camera.position.copy(f.pos).add(new THREE.Vector3(...offset));p.controls.target.copy(f.pos).y+=6;
    p.camera.fov=42;p.camera.lookAt(p.controls.target);p.camera.updateProjectionMatrix();
   };
   window.chestStep=frame=>{
    const time=(frame+1)/60;c.step(time,1/60);
    const s=f.slots.q,b=s.active,hand=f.slots.lmb.active;
    const chestRay=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(new THREE.Quaternion()));
    const palmRay=new THREE.Vector3(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(new THREE.Quaternion()));
    const side=time<1.8?'front':time<2.7?'right':time<3.6?'back':time<4.6?'left':'right';chestView(side);
    document.querySelector('.view-tag').textContent=`TITAN / ${spec.kind==='shipped-charge'?'REACTOR + CANNON':'CHEST + PALM TEST HOSES'} / ${side.toUpperCase()}`;
    document.querySelector('.viewport-note').textContent='Production Studio inputs, poses and contact. Inspection camera, not gameplay framing. '+(spec.kind==='dual-hose-fixture'?'Labeled test powers; no saved-kit changes.':'Shipped powers; authored Chest brace pose.');
    document.querySelector('.time').textContent=`${time.toFixed(2)} s`;
    document.querySelector('.attack-phase').textContent=`SEQUENCE / ${c.phase.toUpperCase()}`;
    document.querySelector('.measurements').textContent=`Combined contact ${c.damage.toFixed(1)} actual / ${c.contacts} events`;
    p.renderer.render(p.scene,p.camera);
    return {frame,time,chest:b?.sustaining?chestRay.dot(b.dir):null,hand:hand?.sustaining?palmRay.dot(hand.dir):null,
     chestCharging:!!s.charging,groundWeight:f._groundMotion?.weight??0,correction:f._chestPose?.rotation.angleTo(new THREE.Quaternion())??0,
     position:f.pos.toArray(),phase:c.phase,damage:c.damage};
   };
  },spec);
  const rows=[];
  for(const [from,to,view]of [[0,105,'front'],[105,160,'right'],[160,214,'back'],[214,274,'left'],[274,380,'recovery']]){
   rows.push(...await page.evaluate(async({from,to})=>{const rows=[];for(let i=from;i<to;i++){rows.push(chestStep(i));await new Promise(requestAnimationFrame);}return rows;},{from,to}));
   await page.locator('.viewport').screenshot({path:`${out}/${spec.kind}-${spec.motion}-${view}.png`});
  }
  scenes.push({spec,rows});
  if(spec.kind==='dual-hose-fixture'){
   const active=rows.filter(r=>r.time>1.2&&r.time<4.6);assert.ok(active.length>100);
   assert.ok(active.every(r=>r.chest>.985),`chest alignment failed in ${spec.motion}`);
   assert.ok(active.every(r=>r.hand>.985),`palm alignment failed in ${spec.motion}`);
  }else{
   assert.ok(rows.some(r=>r.chestCharging),'native reactor must actually charge');
   assert.ok(rows.filter(r=>r.hand!==null).every(r=>r.hand>.985),'the first actual cannon packet must already leave an aligned palm');
  }
  assert.ok(rows.at(-1).correction<1e-5,'torso recovers after both powers end');
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(scenes.map(({spec,rows})=>({...spec,frames:rows.length,minChest:Math.min(...rows.filter(r=>r.time>1.2&&r.chest!==null).map(r=>r.chest)),damage:rows.at(-1).damage})),null,2));
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}
finally{
 await writeFile(out+'/results.json',JSON.stringify({scenes,errors},null,2));
 await context.close();await page.video()?.saveAs(out+'/chest-motion.webm');await browser.close();
}
