import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/directional-motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1500,height:1000},recordVideo:{dir:out,size:{width:1500,height:1000}}});
const page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const [hero,style]of [['sol','auto'],['sol','optic-focus'],['kano','palm'],['kano','two-hand']]){
  await page.goto(`http://127.0.0.1:5180/studio.html?hero=${hero}`);await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
  await page.getByRole('button',{name:'Pause preview',exact:true}).click();
  await page.getByRole('tab',{name:'Attacks',exact:true}).click();
  await page.locator('#attack-castStyle').selectOption(style);
  await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
  await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-right');
  await page.getByRole('button',{name:'Front view',exact:true}).click();
  const row=await page.evaluate(async()=>{
   const p=STUDIO.preview;p.seek(0);const samples=[];
   for(let i=0;i<240;i++){
    p.time=(i+1)/30;p.step(1/30,false,false);p.renderer.render(p.scene,p.camera);
    if(i%15===0){const f=p.fighter;samples.push({time:p.time,take:f._groundMotion?.take,gait:f.gait,speed:f.vel.length(),style:f._combatAim?.style,
     source:f._combatAim?.source,weight:f._combatAim?.weight,root:f.obj.rotation.y,knee:f.parts.legR.userData.knee.rotation.x,
     recoil:p.combat.target._hitReaction?.offset.length()||0,damage:p.combat.damage});}
    await new Promise(requestAnimationFrame);
   }
   return {samples,damage:p.combat.damage,contacts:p.combat.contacts,profileStyle:STUDIO.history.value.attacks?.[p.combat.slot]?.values.castStyle||'auto'};
  });
  assert.ok(row.damage>0&&row.contacts>0,'The preview must still hit its real measurement target');
  assert.ok(row.samples.some(s=>s.recoil>.005),'Real target recoil must be visible in Studio');
  assert.ok(row.samples.filter(s=>s.weight>.9&&s.speed>5).every(s=>s.take),'Ranged locomotion must remain source-backed');
  for(const [view,offset]of Object.entries({front:[0,4,27],left:[-27,4,0],right:[27,4,0],rear:[0,4,-27]})){
   await page.evaluate(({offset,view})=>{
    const p=STUDIO.preview;p.seek(3.2);p.view='front';p.controls.enabled=false;
    const center=p.fighter.pos.clone();center.y+=5;
    p.controls.target.copy(center);p.camera.position.copy(center).add({x:offset[0],y:offset[1],z:offset[2]});p.camera.fov=38;p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.renderer.render(p.scene,p.camera);
    document.querySelector('.view-tag').textContent='MOVING CAST / '+view.toUpperCase();
    document.querySelector('.viewport-note').textContent='Production pose / custom inspection camera / target and floor retained';
   },{offset,view});
   await page.locator('.viewport').screenshot({path:`${out}/${hero}-${style}-${view}.png`});
  }
  rows.push({hero,style,...row});console.log(JSON.stringify({hero,style,damage:row.damage,contacts:row.contacts}));
 }
 // Exercise the shipped Reactor Burst authoring path, not a synthetic chest kit.
 await page.goto('http://127.0.0.1:5180/studio.html?hero=titan');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('tab',{name:'Attacks',exact:true}).click();await page.getByLabel('Attack slot',{exact:true}).selectOption('q');
 await page.locator('#attack-castStyle').selectOption('chest-brace');
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await page.locator('#combat-slot').selectOption('q');await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-left');
 await page.getByRole('button',{name:'Side view',exact:true}).click();
 const chest=await page.evaluate(()=>{const p=STUDIO.preview;p.seek(1.2);return {source:p.fighter._combatAim.source,style:p.fighter._combatAim.style,charging:p.fighter.slots.q.charging};});
 assert.deepEqual(chest,{source:'chest',style:'chest-brace',charging:true});
 await page.screenshot({path:`${out}/titan-chest-studio.png`});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile Studio must not overflow horizontally');
 await page.screenshot({path:`${out}/titan-chest-mobile.png`,fullPage:true});
 await writeFile(`${out}/results.json`,JSON.stringify({rows,chest,errors},null,2));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({scenarios:rows.length,chest,errors}));
}finally{await context.close();await page.video()?.saveAs(`${out}/moving-casts.webm`);await browser.close();}
