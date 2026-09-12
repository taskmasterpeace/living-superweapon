import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/escort-native-route';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],trace=[];let failure=null;
page.on('pageerror',e=>errors.push(e.message));
async function walk(kind,stop){
 for(let i=0;i<160;i++){
  const s=await page.evaluate(({kind,stop})=>{const g=window.PW.game,o=g.ms.convoyOperation,p=g.player;let t=kind==='scientist'?o.scientist.pos:{x:o.vehicle.cover.x+19,z:o.vehicle.cover.z};const dx=t.x-p.pos.x,dz=t.z-p.pos.z,d=Math.hypot(dx,dz);g.world._lookYaw=Math.atan2(dx,dz);g.world._lookPitch=0;return {kind,d,x:p.pos.x,z:p.pos.z,hp:p.hp,alive:p.alive,finished:o.finished};},{kind,stop});
  if(i%20===0){trace.push(s);console.log(s);}if(s.d<stop){await page.keyboard.up('w');return;}if(!s.alive||s.finished)throw Error('Operation ended during approach');
  await page.keyboard.down('w');await page.waitForTimeout(250);
 }
 await page.keyboard.up('w');throw Error('Approach stalled: '+kind);
}
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.bringToFront();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');
 for(const name of ['KANO','VEGAS','RIME','TITAN','VANGUARD'])await page.getByRole('dialog',{name:'Choose your squad'}).getByRole('button',{name:new RegExp('^'+name+' ')}).click();
 await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);
 await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForFunction(()=>{const g=window.PW.game;return g.ms.threatLab.deployed.has(g.player);},{},{timeout:8000});await page.keyboard.up('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.state==='field');
 await walk('scientist',11);await page.waitForTimeout(400);await page.keyboard.press('g');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player,{},{timeout:5000});await page.screenshot({path:out+'/recruited.png'});
 await walk('vehicle',10);await page.waitForFunction(()=>['loaded','disabled'].includes(window.PW.game.ms.convoyOperation.state),{},{timeout:30000});
 for(let i=0;i<4;i++){await page.keyboard.press('g');await page.waitForTimeout(400);if(await page.evaluate(()=>['travel','disabled'].includes(window.PW.game.ms.convoyOperation.state)))break;}
 for(let i=0;i<100;i++){const state=await page.evaluate(()=>window.PW.game.ms.convoyOperation.state);if(['disabled','complete','failed'].includes(state))break;await page.waitForTimeout(1000);}
 if(await page.evaluate(()=>window.PW.game.ms.convoyOperation.state==='disabled')){
  await walk('scientist',11);await page.waitForTimeout(300);await page.keyboard.press('g');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player,{},{timeout:5000});
  await page.evaluate(()=>{const g=window.PW.game,v=g.ms.convoyOperation.vehicle;g.world._lookYaw=Math.atan2(v.cover.x-g.player.pos.x,v.cover.z-g.player.pos.z);});
  for(let i=0;i<4;i++){await page.keyboard.press('g');await page.waitForTimeout(300);if(await page.evaluate(()=>!!window.PW.game.ms.convoyOperation.cargoOwner))break;}
  if(!await page.evaluate(()=>!!window.PW.game.ms.convoyOperation.cargoOwner))throw Error('Recovery cargo interaction failed');
  const route=await page.evaluate(()=>window.PW.game.ms.convoyOperation.route.map(p=>({x:p.x,z:p.z})));let index=1;
  for(let tick=0;tick<360;tick++){
   const s=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {x:g.player.pos.x,z:g.player.pos.z,gap:g.player.pos.distanceTo(o.scientist.pos),finished:o.finished};});if(s.finished)break;
   while(index<route.length-1&&Math.hypot(route[index].x-s.x,route[index].z-s.z)<10)index++;
   await page.evaluate(t=>{const g=window.PW.game;g.world._lookYaw=Math.atan2(t.x-g.player.pos.x,t.z-g.player.pos.z);},route[index]);
   if(s.gap>24)await page.keyboard.up('w');else await page.keyboard.down('w');await page.waitForTimeout(250);
  }
  await page.keyboard.up('w');
 }
 if(!await page.evaluate(()=>window.PW.game.ms.convoyOperation.finished))throw Error('Operation did not finish');
}catch(e){failure=e.message;}finally{
 await page.keyboard.up('w').catch(()=>{});
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o?.state,events:o?.events,scientist:o?.scientist&&{hp:o.scientist.hp,pos:o.scientist.pos.toArray()},player:{hp:g.player.hp,pos:g.player.pos.toArray()},save:g.campaign.snapshot()};}).catch(()=>null);
 await page.screenshot({path:out+'/result.png'});await writeFile(out+'/result.json',JSON.stringify({kind:'Normal menus and native G/W, camera heading steered by harness. No position staging, damage overrides or outcome injection.',failure,result,trace,errors},null,2));await context.close();await browser.close();
}
