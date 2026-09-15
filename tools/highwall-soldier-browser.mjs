import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/highwall-soldier';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1440,height:900}});
const report={method:'Production Highwall, native W/fire/R. Camera orbit arranged for body and equipment inspection. No substituted attack/controller.',errors:[],samples:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const sample=()=>page.evaluate(()=>{const g=PW.game,f=g.player,w=f._gearMesh,c=f._modularCharacter;return {time:f.animT,model:c?.actor.name,armor:f._soldierEquipment,legacyArmor:!!f.parts.torso.getObjectByName('clone_vest_torso'),weapon:f._gearHeld?.inventoryRow,authored:w?.userData.authoredEquipment,ammo:f.slots.lmb?.ammo,ground:f._groundMotion?{take:f._groundMotion.take,phase:f._groundMotion.phase,duration:f._groundMotion.duration,source:f._groundMotion.source?.source}:null,reload:f._firearmReload?{phase:f._firearmReload.sourcePhase,source:f._firearmReload.motion?.clip?.take||(w.userData.reloadPresentation==='static-source-no-action-parts'?'Reload timing only; source action parts unavailable':'Procedural magazine/bolt contact')}:null};});
const snap=async name=>{report.samples.push({name,...await sample()});await page.screenshot({path:`${out}/${name}.png`});};
try{
 await page.route('**/@vite/client',r=>r.fulfill({contentType:'text/javascript',body:`export class ErrorOverlay extends HTMLElement{};export function createHotContext(){return{data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}};export function updateStyle(id,text){let e=document.getElementById(id);if(!e){e=document.createElement('style');e.id=id;document.head.append(e)}e.textContent=text};export function removeStyle(id){document.getElementById(id)?.remove()};export function injectQuery(u,q){return u+(u.includes('?')?'&':'?')+q}`}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor');
 await page.waitForFunction(()=>PW.game._highwall?.ready&&PW.game.player._modularCharacter&&PW.game._highwall.units.every(f=>f._gearMesh?.userData.authoredEquipment),null,{timeout:90000});
 report.squad=await page.evaluate(()=>PW.game._highwall.units.map(f=>({id:f.def.id,role:f.def.combatRole,loadout:f._gearHeld.rowId,asset:f._gearHeld.inventoryRow.equipmentAsset,authored:f._gearMesh.userData.authoredEquipment,legacyArmor:!!f.parts.torso.getObjectByName('clone_vest_torso')})));
 assert.ok(report.squad.every(f=>f.authored&&!f.legacyArmor));
 // Arrange a clear approach lane so neighboring inspection soldiers cannot
 // obscure the tested body. Movement and weapon actions remain native inputs.
 await page.evaluate(()=>{const g=PW.game;g.player.pos.set(238,0,-190);g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;g.world._lookPitch=0;g.world._chaseSnap=true;});
 await page.mouse.move(720,450);await page.waitForTimeout(300);
 // Existing free-look camera preserves world aiming; it only changes inspection.
 const view=angle=>page.evaluate(angle=>{const v=PW.game.world._freeLook;Object.assign(v,{latched:true,orbit:true,yaw:angle,pitch:.05,zoom:.6});},angle);
 for(const [name,angle]of [['front',Math.PI],['left',Math.PI/2],['right',-Math.PI/2],['rear',0]]){await view(angle);await page.waitForTimeout(250);await snap('idle-'+name);}
 await view(Math.PI*.75);
 await page.keyboard.down('w');for(let i=0;i<6;i++){await page.waitForTimeout(240);await snap('walk-'+i);}await page.keyboard.up('w');
 await page.mouse.down();for(let i=0;i<4;i++){await page.waitForTimeout(160);await snap('fire-'+i);}await page.mouse.up();
 const before=await sample();assert.ok(before.ammo.loaded<before.ammo.capacity,'Native fire must spend actual ammunition');
 await page.keyboard.press('r');for(let i=0;i<5;i++){await page.waitForTimeout(360);await snap('reload-'+i);}
 await page.waitForFunction(()=>!PW.game.player._firearmReload,null,{timeout:7000});await snap('reloaded');
 assert.ok((await sample()).ammo.loaded>before.ammo.loaded);assert.deepEqual(report.errors,[]);
 // Exercise the same shared recipe/rig functions used by character tools on
 // two real actors. This demonstrates fitted interchangeability, not wearable
 // inventory ownership (which is not implemented by these recipe edits).
 for(const body of ['A','B']){
  report.wearables??=[];
  report.wearables.push(await page.evaluate(async body=>{
   const {loadModularCharacter}=await import('/src/engine/modular-character.js');
   const g=PW.game,f=g._highwall.units[body==='A'?0:1];
   if(g.player!==f)g.player.pos.set(210,0,-190);
   g.player=f;f.pos.set(238,0,-190);f.vel.set(0,0,0);
   const shared={headwear:'none',helmet:true,armor:true,backpack:true};
   const recipe={...f.def.modularRecipe,...shared,frame:body==='A'?'hero':'agile'};
   f.def.modularRecipe=recipe;const c=await loadModularCharacter(f);g.world._chaseSnap=true;
   return {body,actor:f.def.id,frame:recipe.frame,shared,slots:c.meshes.filter(m=>['helmet','vest','backpack'].includes(m.userData.slot)&&m.visible).map(m=>({slot:m.userData.slot,skinned:m.isSkinnedMesh,bones:m.skeleton?.bones.map(b=>b.name)}))};
  },body));
  for(const [side,angle]of [['front',Math.PI],['rear',0]]){await view(angle);await page.waitForTimeout(350);await snap(`wearables-${body}-${side}`);}
 }
 assert.ok(report.wearables.every(row=>['helmet','vest','backpack'].every(slot=>row.slots.some(m=>m.slot===slot&&m.skinned))));
 await view(Math.PI*.75);const pistolBefore=await sample();
 await page.mouse.down();for(let i=0;i<3;i++){await page.waitForTimeout(200);await snap('pistol-fire-'+i);}await page.mouse.up();
 assert.ok((await sample()).ammo.loaded<pistolBefore.ammo.loaded,'Restored pistol must fire using native ammunition');
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({failure:report.failure,errors:report.errors,samples:report.samples.length,squad:report.squad}));await browser.close();}
