import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/combat-pass-2026-09-12/vehicle-melee-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await ctx.newPage(),video=page.video();
const result={kind:'Normal SOL practice, movement and V attacks. Read-only navigation and pass-through damage observer. Silent video.',errors:[],samples:[]};page.on('pageerror',e=>result.errors.push(e.message));let mx=720,my=450;
const read=()=>page.evaluate(()=>{const g=PW.game,p=g.player,c=g.world.cover.find(c=>c.frontlineVehicle&&!c.frontlineAircraft&&c.hp>0),w=g.world,dir=w.camera.getWorldDirection(p.pos.clone());return {time:g.time,pos:p.pos.toArray(),vehicle:c?{x:c.x,z:c.z,hx:c.hx,hz:c.hz,bottom:c.bottom,top:c.top,hp:c.hp}:null,yaw:w._lookYaw,pitch:w._lookPitch,sens:w._lookSens,camera:w.camera.position.toArray(),dir:dir.toArray(),flight:p.flying,aim:p.aimWorld.toArray(),state:p.mstate};});
async function moveAim(yaw){const s=await read();mx-=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw))/s.sens;my+=s.pitch/s.sens;await page.mouse.move(mx,my);}
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('#pwRoster [data-id="sol"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});await page.mouse.click(mx,my,{button:'middle'});
 await page.evaluate(()=>{const g=PW.game,old=g.damageBlock;window.__vehicleHits=[];g.damageBlock=function(c,amount,pos,src){const hp=c.hp;const value=old.call(this,c,amount,pos,src);if(c.frontlineVehicle)window.__vehicleHits.push({time:g.time,before:hp,after:c.hp,amount,src:src?.id,move:src?.mId,state:src?.mstate,point:pos?.toArray()});return value;};});
 const initial=await read();if(!initial.vehicle)throw Error('No native vehicle');result.initial=initial;
 await page.keyboard.press('f');await page.keyboard.down('Space');await page.waitForTimeout(800);await page.keyboard.up('Space');
 for(let i=0;i<150;i++){const s=await read(),c=s.vehicle,dx=c.x-c.hx-6-s.pos[0],dz=c.z-s.pos[2];if(Math.hypot(dx,dz)<3)break;await moveAim(Math.atan2(dx,dz));await page.keyboard.down('w');await page.waitForTimeout(65);}await page.keyboard.up('w');await page.waitForTimeout(300);await page.keyboard.down('ControlLeft');await page.waitForTimeout(1900);await page.keyboard.up('ControlLeft');
 for(let i=0;i<12;i++){
  const s=await read(),c=s.vehicle;if(!c)break;result.samples.push(s);
  const target=[c.x-c.hx+.4,Math.min(c.top-.4,s.pos[1]+5.2),c.z],dx=target[0]-s.camera[0],dy=target[1]-s.camera[1],dz=target[2]-s.camera[2];
  const desired=Math.atan2(dx,dz),actual=Math.atan2(s.dir[0],s.dir[2]);mx-=Math.atan2(Math.sin(desired-actual),Math.cos(desired-actual))/s.sens;my+=(Math.asin(s.dir[1])-Math.atan2(dy,Math.hypot(dx,dz)))/s.sens;await page.mouse.move(mx,my);await page.waitForTimeout(150);
  if(Math.hypot(c.x-c.hx-s.pos[0],c.z-s.pos[2])>3){await page.keyboard.down('w');await page.waitForTimeout(65);await page.keyboard.up('w');}
  await page.keyboard.down('v');await page.waitForTimeout(45);await page.keyboard.up('v');await page.waitForTimeout(300);if(i%3===0)await page.screenshot({path:`${out}/hit-${i}.png`});
 }
 result.hits=await page.evaluate(()=>window.__vehicleHits);result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);result.passed=result.hits.some(h=>h.src===1&&h.move&&h.after<h.before)&&!result.errors.length&&!result.faults.length;
}catch(e){result.failure=String(e);process.exitCode=1;}finally{await page.screenshot({path:out+'/final.png'}).catch(()=>{});await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-vehicle-melee.webm');await browser.close();console.log(JSON.stringify(result));}
