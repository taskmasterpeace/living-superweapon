import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/failure-then-success';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],trace=[];let failure=null;const operations=[];
page.on('pageerror',e=>errors.push(e.message));
async function walk(kind,stop){
 for(let i=0;i<160;i++){
  const s=await page.evaluate(({kind,stop})=>{const g=window.PW.game,o=g.ms.convoyOperation,p=g.player;let t=kind==='scientist'?o.scientist.pos:{x:o.vehicle.cover.x+(p.pos.x<o.vehicle.cover.x?-19:19),z:o.vehicle.cover.z};const dx=t.x-p.pos.x,dz=t.z-p.pos.z,d=Math.hypot(dx,dz);g.world._lookYaw=Math.atan2(dx,dz);g.world._lookPitch=0;return {kind,d,x:p.pos.x,z:p.pos.z,hp:p.hp,alive:p.alive,finished:o.finished};},{kind,stop});
  if(i%20===0){trace.push(s);console.log(s);}if(s.d<stop){await page.keyboard.up('w');return;}if(!s.alive||s.finished)throw Error('Operation ended during approach');
  await page.keyboard.down('w');await page.waitForTimeout(250);
 }
 await page.keyboard.up('w');throw Error('Approach stalled: '+kind);
}
try{
 const result={};
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.locator('.scard').filter({has:page.locator('.snm',{hasText:/^SARGE$/})}).click();await page.keyboard.press('Enter');await page.getByRole('button',{name:'SOLDIER SIDE',exact:true}).click();await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);await page.keyboard.press('e');await page.keyboard.down('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.deployed.has(window.PW.game.player),{}, {timeout:8000});await page.keyboard.up('w');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.opponents?.length>0);
 result.before=await page.evaluate(()=>window.PW.game.campaign.snapshot());
 for(let i=0;i<240;i++){
  const s=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation,p=g.player,e=o.opponents.find(f=>f.alive);if(!e)return {finished:o.finished};const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z;g.world._lookYaw=Math.atan2(dx,dz);g.world._lookPitch=0;return {finished:o.finished,hp:p.hp,d:Math.hypot(dx,dz)};});
  if(s.finished)break;if(s.d>20)await page.keyboard.down('w');else await page.keyboard.up('w');if(i%20===0)console.log(s);await page.waitForTimeout(500);
 }
 await page.keyboard.up('w');result.failed=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o.state,id:o.id,save:g.campaign.snapshot(),hp:g.player.hp};});await page.screenshot({path:out+'/failed.png'});
 if(result.failed.state!=='failed')throw Error('Natural defeat did not occur');
 await page.locator('#eRematch').click();await page.waitForFunction(()=>window.PW.game.ms.threatLab?.state==='preparing',{}, {timeout:90000});
 result.retry=await page.evaluate(()=>{const g=window.PW.game;return {hp:g.player.hp,alive:g.player.alive,state:g.ms.threatLab.state,save:g.campaign.snapshot()};});await page.screenshot({path:out+'/retry.png'});
 if(!result.retry.alive||JSON.stringify(result.retry.save)!==JSON.stringify(result.failed.save))throw Error('Retry reset or duplicated campaign result');
 await page.reload();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);result.reload=await page.evaluate(()=>window.PW.game.campaign.snapshot());if(JSON.stringify(result.reload)!==JSON.stringify(result.failed.save))throw Error('Reload changed failed operation save');
 if(result.failed.save.awarded.length!==1||result.failed.save.supplies!==result.before.supplies||result.failed.save.research!==result.before.research)throw Error('Failure reward incorrect');
await writeFile(out+'/failure-retry.json',JSON.stringify(result,null,2));
 for(let attempt=0;attempt<1;attempt++){
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.bringToFront();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.locator('.scard').filter({has:page.locator('.snm',{hasText:/^SARGE$/})}).click();await page.keyboard.press('Enter');await page.getByRole('button',{name:'SOLDIER SIDE',exact:true}).click();
 for(const name of ['KANO'])await page.getByRole('dialog',{name:'Choose your squad'}).getByRole('button',{name:new RegExp('^'+name+' ')}).click();
 await page.getByRole('button',{name:'Enter with squad',exact:true}).click();await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);
 if(attempt===1){
  await page.keyboard.press('i');const inv=page.getByRole('dialog',{name:'Inventory'});
  await inv.getByRole('button',{name:'Threat Scanner → slot 1',exact:true}).click();await inv.getByRole('button',{name:'Shield Cell → slot 2',exact:true}).click();
  await inv.locator('section').filter({has:page.getByRole('heading',{name:'2 · Shield Cell',exact:true})}).getByRole('button',{name:'Use and return'}).click();
  const shield=await page.evaluate(()=>window.PW.game.player._shieldHp);await writeFile(out+'/research-effect.json',JSON.stringify({shield,save:await page.evaluate(()=>window.PW.game.campaign.snapshot())},null,2));if(shield!==54)throw Error('Research not applied: '+shield);await page.screenshot({path:out+'/second-operation-shield.png'});
 }
 await page.keyboard.press('e');await page.keyboard.down('w');await page.waitForFunction(()=>{const g=window.PW.game;return g.ms.threatLab.deployed.has(g.player);},{},{timeout:8000});await page.keyboard.up('w');await page.waitForFunction(()=>window.PW.game.ms.threatLab.state==='field');
 await walk('scientist',11);await page.waitForTimeout(400);await page.keyboard.press('e');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player,{},{timeout:5000});await page.screenshot({path:out+'/recruited.png'});
 await walk('vehicle',10);await page.waitForFunction(()=>['loaded','disabled'].includes(window.PW.game.ms.convoyOperation.state),{},{timeout:30000});
 for(let i=0;i<4;i++){await page.keyboard.press('e');await page.waitForTimeout(400);if(await page.evaluate(()=>['travel','disabled'].includes(window.PW.game.ms.convoyOperation.state)))break;}
 for(let i=0;i<100;i++){const state=await page.evaluate(()=>window.PW.game.ms.convoyOperation.state);if(['disabled','complete','failed'].includes(state))break;const follow=await page.evaluate(()=>{const g=window.PW.game,v=g.ms.convoyOperation.vehicle,dx=v.cover.x-g.player.pos.x,dz=v.cover.z-g.player.pos.z;g.world._lookYaw=Math.atan2(dx,dz);return Math.hypot(dx,dz)>35;});if(follow)await page.keyboard.down('w');else await page.keyboard.up('w');await page.waitForTimeout(1000);}await page.keyboard.up('w');
 if(await page.evaluate(()=>window.PW.game.ms.convoyOperation.state==='disabled')){
  await walk('scientist',11);await page.waitForTimeout(300);await page.keyboard.press('e');await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player,{},{timeout:5000});
  await page.evaluate(()=>{const g=window.PW.game,v=g.ms.convoyOperation.vehicle;g.world._lookYaw=Math.atan2(v.cover.x-g.player.pos.x,v.cover.z-g.player.pos.z);});
  for(let i=0;i<4;i++){await page.keyboard.press('e');await page.waitForTimeout(300);if(await page.evaluate(()=>!!window.PW.game.ms.convoyOperation.cargoOwner))break;}
  if(!await page.evaluate(()=>!!window.PW.game.ms.convoyOperation.cargoOwner))throw Error('Recovery cargo interaction failed');
  const route=await page.evaluate(()=>window.PW.game.ms.convoyOperation.route.map(p=>({x:p.x,z:p.z})));const here=await page.evaluate(()=>({x:window.PW.game.player.pos.x,z:window.PW.game.player.pos.z}));let nearest=0;for(let j=1;j<route.length;j++)if(Math.hypot(route[j].x-here.x,route[j].z-here.z)<Math.hypot(route[nearest].x-here.x,route[nearest].z-here.z))nearest=j;let index=Math.min(route.length-1,nearest+1);
  for(let tick=0;tick<360;tick++){
   const s=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {x:g.player.pos.x,z:g.player.pos.z,gap:g.player.pos.distanceTo(o.scientist.pos),finished:o.finished};});if(tick%20===0){await writeFile(out+"/recovery-progress.json",JSON.stringify({tick,index,...s},null,2));}if(s.finished)break;
   while(index<route.length-1&&Math.hypot(route[index].x-s.x,route[index].z-s.z)<10)index++;
   await page.evaluate(t=>{const g=window.PW.game;g.world._lookYaw=Math.atan2(t.x-g.player.pos.x,t.z-g.player.pos.z);},route[index]);
   if(s.gap>24)await page.keyboard.up('w');else await page.keyboard.down('w');await page.waitForTimeout(250);
  }
  await page.keyboard.up('w');
 }
 if(!await page.evaluate(()=>window.PW.game.ms.convoyOperation.finished))throw Error('Operation did not finish');
 const receipt=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o.state,id:o.id,save:g.campaign.snapshot()};});operations.push(receipt);await writeFile(out+"/operations.json",JSON.stringify(operations,null,2));await page.screenshot({path:out+`/operation-${attempt+1}.png`});
 if(receipt.save.awarded.length!==attempt+2)throw Error('Award count mismatch');
 if(receipt.state!=='complete')throw Error(`Operation ${attempt+1} did not complete successfully`);
 await page.reload();await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);const restored=await page.evaluate(()=>window.PW.game.campaign.snapshot());if(JSON.stringify(restored)!==JSON.stringify(receipt.save))throw Error('Save changed on reload');
 if(attempt===99){if(receipt.state!=='complete')throw Error('First attempt lost; research purchase unavailable');await page.keyboard.press('Escape');await page.locator('#pwCampaign').click();const campaign=page.getByRole('dialog',{name:'Campaign records'});await campaign.getByRole('button',{name:'60 supplies + 30 research',exact:true}).click();await campaign.getByRole('button',{name:'Close',exact:true}).click();}
 }
}catch(e){failure=e.message;}finally{
 await page.keyboard.up('w').catch(()=>{});
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {state:o?.state,events:o?.events,scientist:o?.scientist&&{hp:o.scientist.hp,pos:o.scientist.pos.toArray()},player:g.player?{hp:g.player.hp,pos:g.player.pos.toArray()}:null,save:g.campaign.snapshot()};}).catch(()=>null);
 await page.screenshot({path:out+'/result.png'}).catch(()=>{});await writeFile(out+'/result.json',JSON.stringify({kind:'Normal menus and native Soldier E/W, camera heading steered by harness. No position staging, damage overrides or outcome injection.',failure,operations,result,trace,errors},null,2));await context.close();await browser.close();
}
if(failure||errors.length)throw Error(failure||errors.join('\n'));
