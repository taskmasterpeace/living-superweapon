import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {checkoutIdentity,assertSameCheckout} from './playtest/identity.mjs';
const base=process.env.PW_URL||'http://127.0.0.1:5193',out='artifacts/paid-held-runtime';
await mkdir(out,{recursive:true});
assertSameCheckout(await checkoutIdentity(process.cwd()),await(await fetch(base+'/__pw_playtest_identity')).json());
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/studio.html');
 await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(async()=>{
  const {ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
  const p=STUDIO.preview;p.playing=false;
  const def=ROSTER.find(d=>d.id==='sol');p.setProfile(def,profileFromDef(def));
  p.combat.meleeSequence='throw';p.combat.meleeStage='airborne';p.setState('melee');p.seek(0);
  p.combat.target.faceDir(0,1);
  for(let i=1;i<=43;i++){p.time=i/60;p.step(1/60,false,false);}
  p.setView('side');p.camera.position.set(17,87,10);p.controls.target.set(0,85,1);p.camera.lookAt(p.controls.target);
 });
 await page.waitForFunction(()=>STUDIO.preview.fighter._modularCharacter&&STUDIO.preview.combat.target._modularCharacter&&STUDIO.preview.combat.target._paidMotionBank,{},{timeout:60000});
 for(const motion of ['hover','travel'])for(const phase of [0,.25,.5,.75,1]){
  const row=await page.evaluate(({motion,phase})=>{
   const p=STUDIO.preview,h=p.fighter,v=p.combat.target;
   if(h.grabbing!==v)throw Error('Production grab did not connect');
   h.vel.set(0,0,motion==='travel'?40:0);
   const e=v._paidMotionBank.entries.find(e=>e.role===(motion==='travel'?'aerial-travel-receiver':'aerial-hold-receiver'));
   h._clinchElapsed=phase*e.duration;
   h._animate(0);v._animate(0);h.obj.updateMatrixWorld(true);v.obj.updateMatrixWorld(true);
   h._modularCharacter.syncHeldContact();v._modularCharacter.syncHeldContact();
   p.renderer.render(p.scene,p.camera);
   return {motion,phase,mode:h.grabMode,held:v.grabbedBy===h,holder:h.def.id,receiver:v.def.id,paid:v._paidMotionActive,positions:[h.pos.toArray(),v.pos.toArray()]};
  },{motion,phase});
  if(!row.paid)throw Error('Purchased receiver motion was not assigned');rows.push(row);
  await page.locator('.viewport').screenshot({path:`${out}/${motion}-${phase}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(out+'/results.json',JSON.stringify({context:'Studio scripted production grab; phase/velocity inspection, not a full input-driven gameplay test',rows,errors},null,2));
 console.log(JSON.stringify({frames:rows.length,errors}));
}finally{await browser.close();}
