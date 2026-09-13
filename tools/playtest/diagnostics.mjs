import {actionHistory} from './actions.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {snapshotBrowser} from './snapshot.mjs';
export function observeErrors(page){
 const entries=[];const push=(kind,message)=>{entries.push({kind,message:String(message).slice(0,2000)});if(entries.length>40)entries.shift();};
 const error=e=>push('pageerror',e.message),log=m=>{if(m.type()==='error')push('console',m.text());};
 page.on('pageerror',error);page.on('console',log);
 return {entries,dispose(){page.off('pageerror',error);page.off('console',log);}};
}
export async function saveSnapshot(page,out,{error=null,errors=[],name='failure'}={}){
 const bundle={version:1,actions:actionHistory(page),capturedAt:new Date().toISOString(),error:error?{name:error.name,message:String(error.message).slice(0,4000)}:null,errors:errors.slice(-40)};
 try{bundle.state=await page.evaluate(snapshotBrowser);}catch(e){bundle.observationError=String(e.message).slice(0,2000);}
 if(error)try{await page.screenshot({path:path.join(out,name+'.png'),timeout:5000});}catch(e){bundle.screenshotError=String(e.message).slice(0,2000);}
 await writeFile(path.join(out,name+'.json'),JSON.stringify(bundle,null,2));return bundle;
}
