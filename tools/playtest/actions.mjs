import {POWERWORLD_CONTROLS} from '../../src/core/powerworld-controls.js';
const histories=new WeakMap(),active=new WeakSet();
export const actionCatalog=()=>Object.fromEntries(['strike','guard','grab','item','fly','up','down'].map(name=>[name,{device:'keyboard',code:POWERWORLD_CONTROLS[name]}]).concat([['primary',{device:'mouse',button:'left'}],['secondary',{device:'mouse',button:'right'}]]));
export const actionHistory=page=>(histories.get(page)||[]).map(x=>({...x}));
export async function performAction(page,name,{holdMs=80}={}){
 const binding=actionCatalog()[name];
 if(!Object.hasOwn(actionCatalog(),name))throw new Error('Unknown playtest action: '+name);
 if(!Number.isFinite(holdMs)||holdMs<20||holdMs>1500)throw new Error('holdMs must be 20–1500 milliseconds');
 if(active.has(page))throw new Error('Concurrent action rejected; await the current action');
 const history=histories.get(page)||[];histories.set(page,history);
 const record={action:name,holdMs,requestedAt:new Date().toISOString(),status:'pending'};history.push(record);if(history.length>64)history.shift();active.add(page);
 const key=binding.code?.replace(/^Key/,'').toLowerCase();
 const keyName=binding.code?.startsWith('Key')?key:binding.code;
 const down=()=>binding.device==='mouse'?page.mouse.down({button:binding.button}):page.keyboard.down(keyName);
 const up=()=>binding.device==='mouse'?page.mouse.up({button:binding.button}):page.keyboard.up(keyName);
 let sent=false;
 try{
  const before=await page.evaluate(()=>{const g=globalThis.PW?.game;return {ready:!!(g?.running&&g.player?.alive&&!g.combatOverlayOpen),time:g?.time};});
  if(!before.ready||!Number.isFinite(before.time))throw new Error('Gameplay input unavailable: paused, overlay, no living player or no runtime');
  record.simulationBefore=before.time;await down();sent=true;await page.waitForTimeout(holdMs);
  await up();sent=false;record.released=true;
  await page.waitForFunction(t=>globalThis.PW?.game?.time>t,before.time,{timeout:5000,polling:100});
  record.simulationAfter=await page.evaluate(()=>PW.game.time);record.status='dispatched';
 }catch(e){record.status='failed';record.error=String(e.message).slice(0,1000);throw e;}
 finally{
  try{if(sent){await up();record.released=true;}}catch(e){record.status='failed';record.releaseError=String(e.message).slice(0,1000);throw e;}
  finally{active.delete(page);}
 }
 return {...record};
}
