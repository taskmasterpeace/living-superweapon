import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/studio-isolation';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('melee');
 await page.getByLabel('Melee sequence',{exact:true}).selectOption('block');
 await page.getByRole('button',{name:'Front view',exact:true}).click();
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  window.inspectSubject=()=>{
   const p=STUDIO.preview,f=p.fighter,target=p.combat.target;
   p.camera.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);target.obj.updateMatrixWorld(true);
   const point=f.parts.torso.localToWorld(new T.Vector3(0,.5,.2)),ray=new T.Raycaster(p.camera.position,point.clone().sub(p.camera.position).normalize());
   const hit=ray.intersectObjects([f.obj,target.obj],true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return !h.object.material?.transparent;});
   let owner=hit?.object;while(owner&&owner!==f.obj&&owner!==target.obj)owner=owner.parent;
   const head=f.parts.head.getWorldPosition(new T.Vector3()).project(p.camera),foot=f.parts.legL.userData.boot.getWorldPosition(new T.Vector3()).project(p.camera);
   const bounds=actor=>{
    const box=new T.Box3();for(const key of ['head','cowl','torso','armL','armR','legL','legR'])box.union(new T.Box3().setFromObject(actor.parts[key]));
    const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).project(p.camera));
    return {x:Math.max(...points.map(v=>Math.abs(v.x))),y:Math.max(...points.map(v=>Math.abs(v.y)))};
   };
   return {subjectVisible:owner===f.obj,targetVisible:target.obj.visible,height:(head.y-foot.y)/2,bounds:bounds(f),targetBounds:bounds(target),
    pose:[...f.parts.torso.matrixWorld.elements,...f.parts.armL.matrixWorld.elements],root:f.pos.toArray(),
    time:p.time,damage:p.combat.damage,contacts:p.combat.contacts,guard:f.guardMeter,profile:JSON.stringify(p.profile),view:p.view};
  };
  STUDIO.preview.seek(.55);
 });
 const before=await page.evaluate(()=>inspectSubject());
 await page.locator('.viewport').screenshot({path:`${out}/before.png`});
 assert.equal(before.subjectVisible,false,'the axial encounter reproduces the opponent obstruction');
 const focused=await page.evaluate(()=>{STUDIO.preview.setIsolated?.(true);return inspectSubject();});
 assert.equal(focused.subjectVisible,true,'isolation must expose the selected fighter, not merely change a label');
 assert.ok(focused.height>.3&&focused.height<.85,'isolated body should fill a useful, unclipped part of the viewport');
 for(const k of ['pose','root','time','damage','contacts','guard','profile'])assert.deepEqual(focused[k],before[k],`${k} changed just by inspecting`);
 await page.evaluate(()=>STUDIO.preview.setIsolated(false));
 const isolate=page.getByLabel('Isolate fighter',{exact:true});
 await isolate.check();
 await isolate.uncheck();assert.equal((await page.evaluate(()=>inspectSubject())).targetVisible,true);
 await isolate.check();
 assert.match(await page.locator('.viewport-note').innerText(),/opponent hidden/i);
 const readOutcome=()=>page.evaluate(()=>{const p=STUDIO.preview;p.seek(3);return {damage:p.combat.damage,contacts:p.combat.contacts,events:structuredClone(p.combat.meleeEvents)};});
 const isolatedOutcome=await readOutcome();await isolate.uncheck();
 const outcomes={isolated:isolatedOutcome,encounter:await readOutcome()};
 assert.ok(outcomes.isolated.contacts>0);assert.deepEqual(outcomes.isolated,outcomes.encounter,'hiding a mesh must not remove its combat simulation');
 await isolate.check();await page.evaluate(()=>STUDIO.preview.seek(.55));
 assert.equal((await page.evaluate(()=>inspectSubject())).subjectVisible,true,'the captured UI state must actually expose the selected subject');
 await page.screenshot({path:`${out}/desktop.png`});
 await page.getByRole('button',{name:'Game camera',exact:true}).click();
 assert.equal((await page.evaluate(()=>inspectSubject())).targetVisible,true);assert.equal(await isolate.isChecked(),false);assert.equal(await isolate.isDisabled(),true);
 await page.getByRole('button',{name:'Front view',exact:true}).click();await isolate.check();
 await page.getByLabel('Body definition value',{exact:true}).fill('.4');await page.getByLabel('Body definition value',{exact:true}).press('Tab');
 assert.equal((await page.evaluate(()=>inspectSubject())).targetVisible,false,'editing the rig must retain inspection mode');
 await page.getByLabel('Scale value',{exact:true}).fill('1.5');await page.getByLabel('Scale value',{exact:true}).press('Tab');
 await page.getByRole('tab',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:'Add transformation form',exact:true}).click();
 await page.getByLabel('Form level',{exact:true}).fill('4');await page.getByLabel('Form scale',{exact:true}).fill('.65');
 await page.getByRole('button',{name:'Apply to draft',exact:true}).click();await page.getByLabel('Preview level',{exact:true}).selectOption('4');
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.def.frame.scale),.65);
 assert.ok((await page.evaluate(()=>inspectSubject())).height>.28,'a smaller active form must not inherit the large base body camera distance');
 await page.getByRole('tab',{name:'Model',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>STUDIO.preview.seek(.55));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${out}/mobile.png`,fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Scale value',{exact:true}).fill('.65');await page.getByLabel('Scale value',{exact:true}).press('Tab');
 await page.getByRole('tab',{name:'Progression',exact:true}).click();await page.getByRole('button',{name:'Edit level 4 form',exact:true}).click();
 await page.getByLabel('Form scale',{exact:true}).fill('1.5');await page.getByRole('button',{name:'Apply to draft',exact:true}).click();
 const large=await page.evaluate(()=>inspectSubject());assert.ok(large.bounds.x<.96&&large.bounds.y<.96,'large form body clips');
 const encounters=[];
 for(const motion of ['beam','attack']){
  await page.getByLabel('Motion state',{exact:true}).selectOption(motion);
  await page.getByLabel('Target distance',{exact:true}).fill('60');await page.getByLabel('Target distance',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Side view',exact:true}).click();await page.evaluate(()=>STUDIO.preview.seek(0));
  await isolate.check();await isolate.uncheck();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const row=await page.evaluate(()=>inspectSubject());
  for(const bounds of [row.bounds,row.targetBounds])assert.ok(bounds.x<.96&&bounds.y<.96,`${motion} responsive encounter clips`);
  assert.equal(row.targetVisible,true);encounters.push({motion,bounds:row.bounds,targetBounds:row.targetBounds});
  await page.setViewportSize({width:1440,height:1000});
 }
 await page.getByLabel('Motion state',{exact:true}).selectOption('hover');assert.equal(await isolate.isChecked(),false);assert.equal(await isolate.isDisabled(),true);
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({before,focused,outcomes,large,encounters,errors},null,2));
 console.log('PASS real isolation visibility/framing, unchanged pose/contact/profile, simulation retention, Game camera restore, draft rebuild and mobile');
}finally{await browser.close();}
