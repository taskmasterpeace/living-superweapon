import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.HIGHWALL_URL||'http://127.0.0.1:5193',out='artifacts/entry-hub';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],report={};page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
try{
 // Keep the native QA page stable while other workers edit the shared worktree.
 await page.route('**/@vite/client',route=>route.fulfill({contentType:'text/javascript',body:`
 export class ErrorOverlay extends HTMLElement {}
 export function createHotContext(){return {data:{},accept(){},dispose(){},prune(){},invalidate(){},on(){},off(){},send(){}}}
 const styles=new Map();export function updateStyle(id,text){let el=styles.get(id);if(!el){el=document.createElement('style');styles.set(id,el);document.head.append(el)}el.textContent=text}
 export function removeStyle(id){styles.get(id)?.remove();styles.delete(id)}
 export function injectQuery(url,query){return url+(url.includes('?')?'&':'?')+query}
 `}));
 await page.goto(base+'/');await page.getByRole('heading',{name:'Choose your next deployment.'}).waitFor();await page.screenshot({path:out+'/hub.png'});
 await page.getByRole('link',{name:'Fleet library',exact:false}).click();await page.waitForFunction(()=>window.ASSET_LIBRARY?.model&&window.ASSET_LIBRARY?.soldier,{},{timeout:60000});
 report.fleet=await page.evaluate(()=>({selected:ASSET_LIBRARY.selected.id,count:document.querySelectorAll('[data-model]').length,soldier:!!ASSET_LIBRARY.soldier}));assert.equal(report.fleet.selected,'tank');assert.ok(report.fleet.count>=90);await page.screenshot({path:out+'/fleet.png'});
 await page.getByRole('button',{name:'Characters & constructs',exact:true}).click();await page.locator('[data-model="nanite-hound"]').click();await page.waitForFunction(()=>ASSET_LIBRARY.selected.id==='nanite-hound'&&document.querySelector('#model-status').textContent.startsWith('Drag'),{},{timeout:30000});await page.screenshot({path:out+'/construct.png'});
 await page.getByRole('link',{name:'Open character motion tools',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#family')?.value==='hound'&&document.querySelector('#status')?.textContent.includes('named pivots'),{},{timeout:30000});report.houndTools=true;
 for(const [name,path]of [['Character editor','character-foundation.html'],['Power & motion studio','studio.html'],['Authored packages','authoring/viewer/index.html']]){await page.goto(base+'/');await page.getByRole('link',{name,exact:false}).click();await page.waitForURL('**/'+path);await page.waitForTimeout(600);report[name]={url:page.url()};}
 for(const [name,ready,file]of [
  ['Frontline desert',()=>window.PW?.game?.pwStage?.frontlineReady&&!PW.game._simActive,'desert'],
  ['Vehicle proving ground',()=>window.PW?.game?._simActive&&PW.game._simVehicle&&!PW.game._frontlinePreparing,'vehicle-sim'],
  ['Threat Room',()=>window.PW?.game?._threatRoom?.active,'training'],
  ['Play Highwall',()=>window.PW?.game?._highwall?.ready&&!document.querySelector('#highwall-loading'),'highwall'],
 ]){
  if(process.env.ENTRY_ROUTES&&!process.env.ENTRY_ROUTES.split(',').includes(file))continue;
  await page.goto(base+'/');await page.getByRole('link',{name,exact:false}).click();await page.waitForFunction(ready,{},{timeout:180000});report[file]=await page.evaluate(()=>({url:location.href,mode:PW.game.modeId,player:PW.game.player?.def.id,sim:!!PW.game._simActive,training:!!PW.game._threatRoom?.active,highwall:PW.game._highwall?.preset}));await page.screenshot({path:`${out}/${file}.png`});console.log('PASS',file);
 }
 await page.goto(base+'/');await page.getByRole('link',{name:'War World city',exact:false}).click();await page.waitForURL('**/citygame.html');report.cityPage=page.url();
 assert.deepEqual(errors,[]);report.errors=errors;await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){report.failure=error.message;report.errors=errors;report.runtime=await page.evaluate(()=>{const g=window.PW?.game,s=g?.pwStage;return{url:location.href,running:g?.running,preparation:s?.preparation?.status,preparationError:s?.preparation?.error,frontlineReady:s?.frontlineReady,outpostError:s?.outpostError,terrainError:s?.frontlineError,lab:!!s?.researchLab,training:g?.ms?.threatLab?.state};}).catch(()=>null);await writeFile(out+'/result.json',JSON.stringify(report,null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
