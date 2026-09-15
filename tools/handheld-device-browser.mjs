import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/highwall/handheld';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),report={errors:[],scope:'Native Highwall inventory entry/exit; procedural two-hand device hold, not an imported retrieval animation. Alternate body views are diagnostic camera captures.'};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.route('**/@vite/client',r=>r.fulfill({contentType:'text/javascript',body:`export class ErrorOverlay extends HTMLElement{};export function createHotContext(){return{data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}};export function updateStyle(id,text){let e=document.getElementById(id);if(!e){e=document.createElement('style');e.id=id;document.head.append(e)}e.textContent=text};export function removeStyle(id){document.getElementById(id)?.remove()};export function injectQuery(u,q){return u+(u.includes('?')?'&':'?')+q}`}));
 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor');
 await page.waitForFunction(()=>window.PW?.game?._highwall?.ready&&PW.game.player._modularCharacter&&PW.game.player._gearMesh?.userData.authoredEquipment,null,{timeout:90000});
 await page.evaluate(()=>{const g=PW.game;window.deviceFrames=[];const original=g.cameraDrive;g.cameraDrive=function(dt){original.call(this,dt);if(this.handheldDeviceView?.state){const s=this.handheldDeviceView.state;deviceFrames.push({phase:s.phase,t:s.elapsed,anim:s.owner.animT,pos:this.world.camera.position.toArray(),root:s.owner.pos.toArray(),aim:s.owner.aim3.toArray(),contacts:s.contacts});}};});
 report.before=await page.evaluate(()=>{const f=PW.game.player;window.deviceOriginal={gear:f._gearHeld,ammo:f.slots._gear.ammo,weapon:f._gearMesh};return {position:f.pos.toArray(),aim:f.aim3.toArray(),time:f.animT,weapon:f._gearHeld.inventoryRow.equipmentAsset,ammo:{...f.slots._gear.ammo}};});
 await page.screenshot({path:out+'/before.png'});await page.keyboard.press('i');await page.getByRole('button',{name:'Game device',exact:true}).last().click();
 await page.waitForFunction(()=>PW.game.handheldDeviceView.state?.phase==='hold',null,{timeout:20000});await page.screenshot({path:out+'/held-screen.png'});
 for(const [name,angle]of [['front',0],['left',Math.PI/2],['rear',Math.PI],['right',-Math.PI/2]]){
  const data=await page.evaluate(async angle=>{const T=await import('/node_modules/.vite/deps/three.js'),g=PW.game,p=g.player,c=new T.PerspectiveCamera(38,1440/900,.1,4200),offset=new T.Vector3(Math.sin(angle)*23,12,Math.cos(angle)*23).applyAxisAngle(new T.Vector3(0,1,0),p.facing);c.position.copy(p.pos).add(offset);c.lookAt(p.pos.x,p.pos.y+6,p.pos.z);g.world.renderer.render(g.scene,c);return g.world.renderer.domElement.toDataURL();},angle);
  await writeFile(out+'/held-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
 }
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!PW.game.handheldDeviceView.isOpen,null,{timeout:20000});await page.screenshot({path:out+'/returned.png'});
 report.after=await page.evaluate(()=>{const g=PW.game,f=g.player;return {sameGear:f._gearHeld===deviceOriginal.gear,sameAmmo:f.slots._gear.ammo===deviceOriginal.ammo,sameMesh:f._gearMesh===deviceOriginal.weapon,visible:f._gearMesh.visible,stowed:f._inventoryStowed,position:f.pos.toArray(),time:f.animT,frames:deviceFrames,errors:[...g._errSeen.keys()]};});
 assert.ok(report.after.sameGear&&report.after.sameAmmo&&report.after.sameMesh&&report.after.visible&&!report.after.stowed);assert.ok(report.after.time>report.before.time);assert.ok(report.after.frames.filter(f=>f.phase==='hold').every(f=>f.contacts.every(c=>c.gap<.25)));assert.deepEqual(report.after.errors,[]);
 const before=await page.evaluate(()=>PW.game.player.pos.toArray());await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.down('w');try{await page.waitForFunction(before=>PW.game.player.pos.distanceTo({x:before[0],y:before[1],z:before[2]})>2,before,{timeout:20000});}finally{await page.keyboard.up('w');}
 report.moveAfter=await page.evaluate(()=>PW.game.player.pos.toArray());
 await page.waitForTimeout(500);await page.keyboard.press('i');await page.getByRole('button',{name:'Game device',exact:true}).last().click();await page.waitForFunction(()=>PW.game.handheldDeviceView.state?.phase==='hold',null,{timeout:20000});
 report.damage=await page.evaluate(()=>{const f=PW.game.player,before=f.hp;f.takeDamage(2,{ballistic:true,weapon:'rifle',hitstop:0});return {before,after:f.hp,method:'Native takeDamage diagnostic, not an enemy firing sequence'};});
 await page.waitForFunction(()=>!PW.game.handheldDeviceView.isOpen&&!PW.game.player._inventoryStowed,null,{timeout:20000});assert.ok(report.damage.after<report.damage.before);
 await page.evaluate(()=>{PW.game.player._inventoryDevice=false;});await page.keyboard.press('i');assert.equal(await page.getByRole('button',{name:'Game device',exact:true}).count(),0);report.ownershipFooterBlocked=true;await page.keyboard.press('Escape');
 await page.evaluate(()=>{PW.game.player._inventoryDevice=true;});assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({failure:report.failure,errors:report.errors,after:report.after&&{sameGear:report.after.sameGear,sameAmmo:report.after.sameAmmo,frames:report.after.frames.length}}));await browser.close();}
