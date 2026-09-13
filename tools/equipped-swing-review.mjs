import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const args=process.argv.slice(2),guard=args.includes('--guard'),hero=args.find(a=>a.startsWith('--hero='))?.split('=')[1]||'merc';
const ids=args.filter(a=>!a.startsWith('--')),out=guard?`artifacts/marketing/weapon-guard-${hero}`:ids.length?`artifacts/marketing/${ids.includes('claws')?'claws':'great-blade'}-review`:'artifacts/marketing/equipped-swing-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:out}}),page=await context.newPage();
await page.goto(`http://127.0.0.1:5184/studio.html?hero=${encodeURIComponent(hero)}`);
await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
await page.evaluate(async()=>{
 const v=STUDIO.preview;v.playing=false;cancelAnimationFrame(v.raf);v.controls.enabled=false;v.controls.update=()=>{};
 const {Game}=await import('/src/engine/game.js'),{TYPES}=await import('/src/engine/abilities.js'),{bladeById}=await import('/src/data/armory.js');
 const f=v.fighter;f._openSky=true;f.aim.set(0,0,1);f.aim3.copy(f.aim);f.flying=false;f.gait='grounded';f.pos.set(0,0,0);f.vel.set(0,0,0);
 for(let i=0;i<120;i++)f._animate(1/60);
 const g={isHuman:()=>false,world:{},audio:{zap(){}},trail(){},coneFoe(){return null;}};
 g.dropGear=(...args)=>Game.prototype.dropGear.call(g,...args);
 window.review={v,f,g,TYPES,bladeById,equip:Game.prototype.equipFrom,results:[]};
});
for(const id of ids.length?ids:['bat','tomahawk','katana','bat']){
 await page.evaluate(id=>{const r=review;r.equip.call(r.g,r.f,r.bladeById(id),{primary:true});r.f._abilityMeleePose=null;r.f.state='idle';},id);
 for(let i=0;i<(guard?150:id==='claws'?125:65);i++){
  const sample=await page.evaluate(({i,guard})=>{
   const {v,f,g,TYPES}=review,st=f.slots.lmb;
   if(guard)f.guarding=i>=45&&i<80;
   if(i===15||i===(guard?120:75))TYPES.melee(f,st.def,st,g,{pressed:true,dt:1/60});
   else TYPES.melee(f,st.def,st,g,{dt:1/60});
   f.update(1/60,v.combat.game);f.obj.updateMatrixWorld(true);
   v.camera.position.copy(f.pos).add({x:10,y:8,z:12});v.camera.lookAt(f.pos.x,f.pos.y+5,f.pos.z+2);v.renderer.render(v.scene,v.camera);
   return {weapon:f._gearMesh.userData.weaponKind,elapsed:f._abilityMeleePose?.elapsed};
  },{i,guard});
  if([10,23,35,60,83,120].includes(i)){await page.screenshot({path:`${out}/${id}-${i}.png`});await page.evaluate(s=>review.results.push(s),sample);}
  await page.waitForTimeout(17);
 }
}
await writeFile(`${out}/results.json`,JSON.stringify(await page.evaluate(()=>review.results),null,2));
const video=page.video();await context.close();await video.saveAs(`${out}/equipment-swaps.webm`);await browser.close();
