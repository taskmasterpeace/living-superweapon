import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/guided-spear-studio';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const result={scope:'Isolated creator-saved custom fighter through existing Studio UI and production seek. Rendered inspection fixture, not native combat movement evidence.',samples:[],errors};
try{
 await page.goto('http://127.0.0.1:5193/studio.html');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(async()=>{const {freshPicks,buildDef,saveCustom}=await import('/src/data/creator.js');const {ROSTER}=await import('/src/data/characters.js');const picks=freshPicks();picks.name='Spear review';picks.flightTier=3;picks.slots.lmb='guided-spear';picks.slots.rmb='kibolt';const def=buildDef(picks,'cx_spear_review');def.model={...def.model,body:'faceted-v1'};saveCustom(picks,def,ROSTER);});
 await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);await page.locator('[data-hero="cx_spear_review"]').click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-hold');
 if(await page.evaluate(()=>STUDIO.preview.playing))await page.locator('#play').click();
 await page.getByRole('button',{name:'Side view',exact:true}).click();
 await page.evaluate(async()=>{await STUDIO.preview.fighter._modularReady;await STUDIO.preview.combat.target._modularReady;});
 for(const [name,time]of [['windup',.85],['outbound',1.05],['embedded',2.5]]){
  const row=await page.evaluate(async time=>{STUDIO.preview.seek(0);await STUDIO.preview.fighter._modularReady;await STUDIO.preview.combat.target._modularReady;for(let i=1;i<=Math.round(time*60);i++){STUDIO.preview.time=i/60;STUDIO.preview.step(1/60,false,false);}STUDIO.preview.step(0);const f=STUDIO.preview.fighter,s=f.slots.lmb.spear,m=f._modularCharacter;const hand=m?.actor.getObjectByName(s?.side===1?'DEF-handL':'DEF-handR');const native=s?.hand;const grip=native&&hand?s.obj.localToWorld(s.pos.clone().set(0,0,-3.2)).distanceTo(hand.getWorldPosition(s.pos.clone())):null;return{modular:!!m,hand:hand?.name,gripError:grip,time,state:s?.state,phase:STUDIO.preview.combat.phase,mesh:s?.obj.name,parts:s?.obj.children.map(c=>c.name),position:s?.pos.toArray()};},time);
  result.samples.push({name,...row});await page.screenshot({path:`${out}/${name}.png`});
  if(name!=='outbound'){
   const measured=await page.evaluate(name=>{
    const p=STUDIO.preview,f=name==='embedded'?p.combat.target:p.fighter;
    p.camera.position.copy(f.pos);p.camera.position.x+=14;p.camera.position.y+=8;p.camera.position.z+=8;
    p.controls.target.copy(f.pos);p.controls.target.y+=5;p.camera.lookAt(p.controls.target);p.renderer.render(p.scene,p.camera);
    return {damage:p.combat.damage,contacts:p.combat.contacts};
   },name);
   result.samples.at(-1).measured=measured;
   await page.locator('.viewport').screenshot({path:`${out}/${name}-detail.png`});
  }
 }
 assert.ok(result.samples.every(s=>s.modular));assert.ok(result.samples[0].gripError<.02);assert.equal(result.samples[0].state,'windup');assert.equal(result.samples[1].state,'outbound');assert.equal(result.samples[2].state,'embedded');assert.equal(errors.length,0);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
