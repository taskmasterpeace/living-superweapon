import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/issue15-native-target-'+(process.argv[2]||'verified');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await context.newPage(),rows=[],errors=[];
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));let failure=null,mx=720,my=450,locked=false;
const read=()=>page.evaluate(()=>{const g=window.PW.game,p=g.player,v=g.entities.find(e=>e!==p&&e.alive&&e.team!==p.team);return {time:g.time,yaw:g.world._lookYaw,pitch:g.world._lookPitch,sens:g.world._lookSens,camera:g.world.camera.position.toArray(),lock:g.hardLock?.id,p:{id:p.id,hp:p.hp,ki:p.ki,pos:p.pos.toArray(),alive:p.alive},v:v&&{id:v.id,hp:v.hp,pos:v.pos.toArray()},beams:g.projectiles.list.filter(b=>b.sustaining).map(b=>({radius:b.radius,range:b.maxLen,tip:b.tip.position.toArray()}))};});
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1500);await page.keyboard.press('d');await page.keyboard.press('d');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Back to character',exact:true}).click();await page.keyboard.press('Escape');await page.locator('[data-pick="foe"]').click();await page.locator('#pwRoster [data-id="sarge"]').click();await page.locator('#pwAi [data-ai="0.85"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.time>1);await page.mouse.click(mx,my);await page.waitForFunction(()=>!!document.pointerLockElement);await page.waitForTimeout(250);
 await page.evaluate(()=>{const g=window.PW.game,original=g.onHit;window.__targetHits=[];g.onHit=function(v,n,o,blocked,...rest){if(o.src===g.player)window.__targetHits.push({time:g.time,target:v.id,amount:n,healthLost:rest[0]?.healthLost,blocked,hp:v.hp,source:g.player.id,distance:g.player.pos.distanceTo(v.pos),dtype:o.dtype});return original.call(this,v,n,o,blocked,...rest);};});
 for(let i=0;i<80;i++){
  const s=await read();rows.push(s);if(!s.p.alive||!s.v)throw Error('Combat ended before beam test');
  const dx=s.v.pos[0]-s.camera[0],dz=s.v.pos[2]-s.camera[2],yaw=Math.atan2(dx,dz),pitch=Math.atan2(s.v.pos[1]+5-s.camera[1],Math.hypot(dx,dz)),delta=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  if(!locked){mx-=delta/s.sens;my+=(s.pitch-pitch)/s.sens;await page.mouse.move(mx,my);await page.waitForTimeout(50);await page.keyboard.press('t');locked=!!(await read()).lock;}
  const distance=Math.hypot(s.v.pos[0]-s.p.pos[0],s.v.pos[2]-s.p.pos[2]);
  if(locked&&distance<(process.argv.includes('--moving')?85:135)){await page.keyboard.up('w');if(process.argv.includes('--moving'))await page.keyboard.down('a');await page.mouse.down({button:'right'});await page.waitForTimeout(450);await page.mouse.up({button:'right'});for(let j=0;j<24;j++){await page.waitForTimeout(80);rows.push({...await read(),phase:'beam'});if(j===6)await page.screenshot({path:out+'/target-contact.png'});}await page.keyboard.up('a');break;}
  await page.keyboard.down('w');await page.waitForTimeout(80);
 }
 const hits=await page.evaluate(()=>window.__targetHits);if(!hits.some(h=>h.healthLost>0))throw Error('No attributed beam health loss observed');
}catch(e){failure=e.message;}finally{
 await page.keyboard.up('w').catch(()=>{});await page.screenshot({path:out+'/final.png'}).catch(()=>{});const hits=await page.evaluate(()=>window.__targetHits||[]).catch(()=>[]);
 await writeFile(out+'/result.json',JSON.stringify({kind:'Native VEGAS selection and sparring against rookie SARGE. Browser inputs only; camera steering from read-only telemetry; pass-through onHit observer.',rows,hits,errors,failure},null,2));await context.close();await browser.close();
}if(failure||errors.length)throw Error(failure||errors.join('\n'));
