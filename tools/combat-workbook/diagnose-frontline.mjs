import {chromium} from '../../node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-preparation-diagnosis-20260914';await mkdir(out,{recursive:true});
const result={started:new Date().toISOString(),snapshots:[],pageErrors:[],consoleErrors:[],failed:[],badResponses:[]},pending=new Map();
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1600,height:900}});
page.setDefaultTimeout(15000);
const bounded=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('Browser response exceeded '+ms+'ms')),ms))]);
page.on('pageerror',e=>result.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text())});
page.on('request',r=>pending.set(r,{url:r.url(),start:Date.now()}));
page.on('requestfinished',r=>pending.delete(r));page.on('requestfailed',r=>{result.failed.push({url:r.url(),failure:r.failure()});pending.delete(r)});
page.on('response',r=>{if(r.status()>=400)result.badResponses.push({url:r.url(),status:r.status()})});
try{
 await page.goto('http://127.0.0.1:5193/',{waitUntil:'domcontentloaded'});await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 const start=Date.now();
 await page.evaluate(()=>{const g=PW.game,s=g.pwStage;window.__prepProbe={};for(const[name,p]of Object.entries({frontline:s?.frontlineLoading,outpost:s?.outpostLoading,aircraft:s?.aircraft?.loading,convoy:s?.convoy?.loading,equipment:g.ms?.frontline?.equipmentLoading,...Object.fromEntries(g.entities.map((f,i)=>['soldier'+i,f._soldierEquipmentLoading]))})){if(!p)continue;window.__prepProbe[name]='pending';Promise.resolve(p).then(()=>window.__prepProbe[name]='resolved',e=>window.__prepProbe[name]='rejected:'+e.message)}});
 while(Date.now()-start<95000){
  const state=await bounded(page.evaluate(()=>{const g=PW.game,s=g.pwStage,r=g.world.renderer,gl=r.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {status:g._frontlinePreparing?.status,preparationError:g._frontlinePreparing?.error,frontlineReady:s?.frontlineReady,frontlineError:String(s?.frontlineError||''),outpostError:String(s?.outpostError||''),aircraftError:String(s?.aircraft?.error||''),convoyError:String(s?.convoy?.error||''),promises:window.__prepProbe,programs:r.info.programs?.length,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,loadingText:document.querySelector('#frontlinePreparing [role=status]')?.textContent,running:g.running}}));
  const row={elapsedMs:Date.now()-start,...state,pendingRequests:[...pending.values()].map(r=>({url:r.url,elapsedMs:Date.now()-r.start}))};result.snapshots.push(row);console.log(JSON.stringify(row));
  if(state.frontlineReady||state.status==='error')break;
  await new Promise(resolve=>setTimeout(resolve,7000));
 }
 await bounded(page.screenshot({path:out+'/final.png',timeout:8000}));
}catch(e){result.error=String(e);console.log(result.error)}finally{
 result.pendingRequests=[...pending.values()].map(r=>({url:r.url,elapsedMs:Date.now()-r.start}));await writeFile(out+'/diagnosis.json',JSON.stringify(result,null,2));
 await bounded(browser.close(),5000).catch(()=>{});console.log(JSON.stringify({out,error:result.error,pageErrors:result.pageErrors,failed:result.failed,badResponses:result.badResponses}));
}
