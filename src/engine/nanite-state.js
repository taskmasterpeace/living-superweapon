// Pure, bounded cell state. No scene objects, resource disposal or action calls.
import {naniteConfig,validateNaniteLoadout} from '../data/nanite-tuning.js';
import {attackIdentity} from '../data/attack-tuning.js';
let nextEpoch=1;
const epsilon=1e-10;
const cell=hp=>({hp,quietT:0,reformT:0,broken:false,hitPoint:null,hitNormal:null});
const assembled=m=>!m.retired&&m.unlocked&&m.deployed&&m.assemblyT+epsilon>=m.config.naniteAssemblyTime;
export function createNaniteState(abilities){
 validateNaniteLoadout(abilities);
 let state=null;
 for(const [slot,source] of Object.entries(abilities||{})){
  const config=naniteConfig(source);if(!config)continue;
  state||={modules:new Map(),disposed:false};
  const m={slot,epoch:nextEpoch++,config,sourceKey:attackIdentity(source),deployed:true,assemblyT:0,unlocked:false,retired:false,
   cells:Array.from({length:config.naniteForm==='cannon'?6:9},()=>cell(config.naniteCellHp))};
  Object.defineProperty(m,'ready',{enumerable:true,get(){return assembled(this)&&(config.naniteForm!=='cannon'||this.cells.every(c=>!c.broken));}});
  state.modules.set(slot,m);
 }
 return state;
}
export function advanceNanites(state,dt,unlockedSlots){
 if(!state||state.disposed||!Number.isFinite(dt)||dt<=0)return;
 for(const m of state.modules.values()){
  if(m.retired)continue;
  const unlocked=unlockedSlots?.has(m.slot)===true;
  if(!unlocked){m.unlocked=false;m.assemblyT=0;continue;}
  m.unlocked=true;
  const cfg=m.config;
  if(m.deployed){m.assemblyT=Math.min(cfg.naniteAssemblyTime,m.assemblyT+dt);if(m.assemblyT+epsilon>=cfg.naniteAssemblyTime)m.assemblyT=cfg.naniteAssemblyTime;}
  for(const c of m.cells){
   if(c.hp===cfg.naniteCellHp)continue;
   const quiet=Math.min(dt,Math.max(0,cfg.naniteRepairDelay-c.quietT));c.quietT+=quiet;
   c.reformT=Math.min(cfg.naniteReformTime,c.reformT+dt-quiet);
   if(c.reformT+epsilon>=cfg.naniteReformTime){c.hp=cfg.naniteCellHp;c.broken=false;c.hitPoint=null;c.hitNormal=null;}
  }
 }
}
export function toggleNanite(state,slot){
 const m=state?.modules.get(slot);if(!m||state.disposed||m.retired||!m.unlocked)return false;
 m.deployed=!m.deployed;if(m.deployed)m.assemblyT=0;return m.deployed;
}
const finitePoint=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
export function damageNanite(state,contact,amount,canAbsorb){
 const result={remaining:amount,absorbed:0,disabledSlot:null},m=state?.modules.get(contact?.slot),c=m?.cells[contact?.cell];
 if(!Number.isFinite(amount)||amount<=0||!m||state.disposed||!assembled(m)||contact.epoch!==m.epoch||!Number.isInteger(contact.cell)||!c||c.broken||!finitePoint(contact.point)||!finitePoint(contact.normal))return result;
 const lost=Math.min(c.hp,amount);c.hp-=lost;c.broken=c.hp<=0;c.quietT=0;c.reformT=0;
 c.hitPoint={...contact.point};c.hitNormal={...contact.normal};
 if(m.config.naniteForm==='shield'&&canAbsorb){result.absorbed=lost;result.remaining=amount-lost;}
 if(m.config.naniteForm==='cannon'&&c.broken)result.disabledSlot=m.slot;
 return result;
}
export function resetNanites(state){
 if(!state)return;state.disposed=false;
 for(const m of state.modules.values())Object.assign(m,{epoch:nextEpoch++,deployed:true,assemblyT:0,unlocked:false,retired:false,
  cells:Array.from({length:m.cells.length},()=>cell(m.config.naniteCellHp))});
}
export function retireNanites(state,slot=null){
 if(!state)return;
 for(const m of state.modules.values())if((slot===null||m.slot===slot)&&!m.retired){
  m.epoch=nextEpoch++;m.retired=true;m.unlocked=false;m.deployed=false;
  for(const c of m.cells){c.hitPoint=null;c.hitNormal=null;}
 }
 if(slot===null)state.disposed=true;
}
