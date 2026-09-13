import {touchButton,touchMove} from './touch.mjs';
import {POWERWORLD_MAP} from '../../src/core/gamepad.js';
import {gamepadButton,gamepadMove} from './gamepad.mjs';
import {beginAcceptance} from './session.mjs';
import {POWERWORLD_CONTROLS} from '../../src/core/powerworld-controls.js';
const histories=new WeakMap(),active=new WeakSet();
export const actionCatalog=(scheme='kbm')=>scheme==='touch'?Object.fromEntries(Object.entries({strike:'strike',guard:'guard',grab:'grab',item:'item',up:'fly',down:'descend',primary:'lmb',secondary:'rmb'}).map(([name,id])=>[name,{device:'touch',id}])):scheme==='pad'?Object.fromEntries(Object.entries({strike:'strike',guard:'guard',grab:'grab',item:'item',fly:'flightToggle',up:'fly',down:'descend',primary:'lmb',secondary:'rmb'}).map(([name,key])=>[name,{device:'gamepad',button:POWERWORLD_MAP[key]}])):Object.fromEntries(['strike','guard','grab','item','fly','up','down'].map(name=>[name,{device:'keyboard',code:POWERWORLD_CONTROLS[name]}]).concat([['primary',{device:'mouse',button:'left'}],['secondary',{device:'mouse',button:'right'}]]));
export const actionHistory=page=>(histories.get(page)||[]).map(x=>({...x}));
export async function performAction(page,name,{holdMs=80,until=null,scheme='kbm',move=null}={}){
 if(!['kbm','pad','touch'].includes(scheme))throw new Error('Unsupported playtest input scheme');
 if(move!==null&&(!['pad','touch'].includes(scheme)||!Array.isArray(move)||move.length!==2||!move.every(v=>Number.isFinite(v)&&v>=-1&&v<=1)))throw new Error('Movement requires pad or touch scheme and two axes from -1 to 1');
 const binding=actionCatalog(scheme)[name];
 if(!Object.hasOwn(actionCatalog(scheme),name))throw new Error('Unknown playtest action: '+name);
 if(!Number.isFinite(holdMs)||holdMs<20||holdMs>1500)throw new Error('holdMs must be 20–1500 milliseconds');
 if(until!==null&&!((until==='melee-charged'&&name==='strike')||(until==='grab-armed'&&name==='grab')||(until==='flight-height'&&name==='up')))throw new Error('Unsupported action release condition');
 if(active.has(page))throw new Error('Concurrent action rejected; await the current action');
 beginAcceptance(page);
 const history=histories.get(page)||[];histories.set(page,history);
 const record={action:name,scheme,move:move?.slice()??null,holdMs:until?null:holdMs,until,requestedAt:new Date().toISOString(),status:'pending'};history.push(record);if(history.length>64)history.shift();active.add(page);
 const key=binding.code?.replace(/^Key/,'').toLowerCase();
 const keyName=binding.code?.startsWith('Key')?key:binding.code;
 const down=()=>binding.device==='touch'?touchButton(page,binding.id,true):binding.device==='gamepad'?gamepadButton(page,binding.button,true):binding.device==='mouse'?page.mouse.down({button:binding.button}):page.keyboard.down(keyName);
 const up=()=>binding.device==='touch'?touchButton(page,binding.id,false):binding.device==='gamepad'?gamepadButton(page,binding.button,false):binding.device==='mouse'?page.mouse.up({button:binding.button}):page.keyboard.up(keyName);
 const setMove=(x,y)=>scheme==='touch'?touchMove(page,x,y):gamepadMove(page,x,y);
 let sent=false,moving=false;
 try{
  const before=await page.evaluate(()=>{const g=globalThis.PW?.game;return {ready:!!(g?.running&&g.player?.alive&&!g.combatOverlayOpen),time:g?.time};});
  if(!before.ready||!Number.isFinite(before.time))throw new Error('Gameplay input unavailable: paused, overlay, no living player or no runtime');
  record.simulationBefore=before.time;if(move){moving=true;await setMove(...move);}await down();sent=true;if(until==='melee-charged'){await page.waitForFunction(()=>globalThis.PW?.game?.player?.meleeCharge>=.6,null,{timeout:10000,polling:100});record.chargeAtRelease=await page.evaluate(()=>PW.game.player.meleeCharge);}else if(until==='grab-armed'){await page.waitForFunction(()=>globalThis.PW?.game?.player?._contextGrab?.armed===true,null,{timeout:10000,polling:50});record.throwArmed=true;}else if(until==='flight-height'){await page.waitForFunction(()=>{const g=globalThis.PW?.game,f=g?.player;return f?.flying&&f.pos.y-g.world.heightAt(f.pos.x,f.pos.z)>=24;},null,{timeout:30000,polling:50});record.flightHeightReached=true;}else await page.waitForTimeout(holdMs);
  await up();sent=false;record.released=true;if(moving){await setMove(0,0);moving=false;record.movementReleased=true;}
  await page.waitForFunction(t=>globalThis.PW?.game?.time>t,before.time,{timeout:5000,polling:100});
  record.simulationAfter=await page.evaluate(()=>PW.game.time);record.status='dispatched';
 }catch(e){record.status='failed';record.error=String(e.message).slice(0,1000);throw e;}
 finally{
  try{if(sent){await up();record.released=true;}}catch(e){record.status='failed';record.releaseError=String(e.message).slice(0,1000);throw e;}
  finally{try{if(moving){await setMove(0,0);record.movementReleased=true;}}finally{active.delete(page);}}
 }
 return {...record};
}
