import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/squad-radio-play';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'AMBUSH RESEARCH CONVOY',exact:true}).click();for(const name of ['KANO','VEGAS','RIME','TITAN','VANGUARD'])await page.getByRole('dialog',{name:'Choose your squad'}).getByRole('button',{name:new RegExp('^'+name+' ')}).click();await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1500);await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.scientist,{}, {timeout:30000});
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientist._scoutVehicle);
 // Controlled interception: stop native convoy and stage player at released scientist.
 await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;o.stop();g.player.pos.copy(o.scientist.pos);g.player.pos.z+=10;g.player.vel.set(0,0,0);g.world._lookYaw=Math.PI;});
 await page.waitForTimeout(500);await page.keyboard.press('g');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation.scientistLeader===window.PW.game.player);
 await page.waitForTimeout(1000);
 await page.keyboard.press('g');await page.waitForTimeout(400);
 const secured=await page.evaluate(()=>!!window.PW.game.ms.convoyOperation.cargoOwner);if(!secured)throw Error('Cargo not secured');
 const route=await page.evaluate(()=>window.PW.game.ms.convoyOperation.route.map(p=>({x:p.x,z:p.z})));
 await page.waitForTimeout(5000);const trace=[];let index=1;
 // Heading is steered by fixture; positions and following stay in native physics.
 for(let tick=0;tick<360;tick++){
  const state=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {p:{x:g.player.pos.x,z:g.player.pos.z,hp:g.player.hp},scientist:{x:o.scientist.pos.x,z:o.scientist.pos.z,hp:o.scientist.hp},state:o.state,finished:o.finished};});
  if(tick%20===0){trace.push({...state,index});console.log(trace.at(-1));}
  if(state.finished)break;
  while(index<route.length-1&&Math.hypot(route[index].x-state.p.x,route[index].z-state.p.z)<10)index++;
  const target=route[index],gap=Math.hypot(state.p.x-state.scientist.x,state.p.z-state.scientist.z);
  await page.evaluate(t=>{const g=window.PW.game;g.world._lookYaw=Math.atan2(t.x-g.player.pos.x,t.z-g.player.pos.z);},target);
  if(gap>24)await page.keyboard.up('w');else await page.keyboard.down('w');
  await page.waitForTimeout(250);
 }
 await page.keyboard.up('w');await page.screenshot({path:out+'/route-result.png'});
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation;return {reports:g.ms.squadReports||[],state:o.state,events:o.events,squad:g.ms.squad.members.map(f=>({name:f.def.name,hp:f.hp,kills:f.kills,x:f.pos.x,z:f.pos.z})),playerHp:g.player.hp,scientistHp:o.scientist.hp,save:g.campaign.snapshot()};});
 await writeFile(out+'/result.json',JSON.stringify({kind:'Route-follow diagnostic: normal ambush selection, staged interception/approach, fixture steers camera heading, native W and scientist physics; no damage override',trace,result,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
