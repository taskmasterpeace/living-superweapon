import {PoliceSystem,COP_DEF,SWAT_DEF,FED_DEF,GUARD_DEF} from './police.js';
import {AI} from './ai.js';
import {encounterGround} from './encounter-ground.js';
import {applyDesertUnitPresentation} from '../data/desert-unit-presentation.js';
import {loadFighterEquipment} from './authored-equipment.js';

// Reuse the native incident ledger and escalation ladder. This outpost has
// ground entrances, not the city's road/water/cruiser assumptions.
const AUTHORITY=Object.freeze({milBudget:70,milService:65,intelBudget:50,lawBudget:65,lswRegs:'Banned',lswActivity:0});
const NAMES=['CLEAR','POLICE','POLICE BACKUP','TACTICAL','FEDERAL','MILITARY'];
export class DesertSecurity extends PoliceSystem{
 constructor(game){
  super(game);this._forced=true;this.disposed=false;this.allUnits=[];this.arrival=null;this.cooldown=0;this.lastTier=0;
  if(typeof document!=='undefined'){
   this.hud=document.createElement('aside');this.hud.id='desertSecurity';this.hud.setAttribute('aria-label','Outpost security response');
   this.hud.style.cssText='position:fixed;left:18px;top:108px;z-index:12;pointer-events:none;max-width:290px;padding:12px 14px;border:1px solid var(--line-gold);border-radius:var(--r-2);background:var(--surface-solid);color:var(--text);font:600 15px/1.4 var(--f-display);box-shadow:var(--sh-1)';document.body.appendChild(this.hud);
  }
  try{this.patrolPending=!this.deploy(1,2,true);this.patrolRetry=1;}catch(error){this.dispose();throw error;}this.render();
 }
 _country(){return AUTHORITY;}
 onCopHurt(src,amount){
  super.onCopHurt(src,amount);
  if(this.active&&src?.def&&!src.def.police&&amount>1)this.heat.set(src,Math.max(35,this.heatOf(src)));
 }
 deploy(tier,count,patrol=false){
  const g=this.g,base=tier>=5?GUARD_DEF:tier===4?FED_DEF:tier===3?SWAT_DEF:COP_DEF,used=[];
  const space=Math.max(0,10-this.cops.filter(f=>f.alive&&f.hp>0&&!f._remove).length);
  // Preflight the whole group; an obstructed second footprint must not leave
  // the first actor allocated or consume serial numbers on every retry.
  try{for(let i=0;i<Math.min(space,count);i++)used.push(encounterGround(g.world,g.player.pos,this._unitNo+i,used,patrol?32:95));}
  catch(error){if(error.code!=='ENCOUNTER_NO_SPAWN')throw error;return false;}
  for(const pos of used){
   this._unitNo++;
   const def=structuredClone(base);def.name=`${tier>=5?'MILITARY':tier>=3?'TACTICAL':'OFFICER'} ${this._unitNo}`;
   applyDesertUnitPresentation(def,tier);def.items=[];
   Object.assign(def.abilities.lmb,{cost:0,magazine:tier>=3?24:12,reserveAmmo:tier>=3?96:48,reloadTime:2.2});
   const f=g.addFighter(def,{team:2,x:pos.x,z:pos.z});f.pos.copy(pos);f.groundY=pos.y;f.obj.position.copy(pos);
   f._encounterNPC=true;f._responseTier=tier;f._desertPatrol=patrol;f.noRespawn=true;f._openSky=true;f._chaseKb=true;
   // Reinforcements stay combat-ready on the procedural rifle while the audited
   // package loads. Attachment changes geometry only, never slots or ammunition.
   if(tier>=5&&(g.world.renderer||g._equipmentAssetLoader))f._desertEquipmentReady=loadFighterEquipment(f,{loader:g._equipmentAssetLoader});
   f.faceDir(g.player.pos.x-pos.x,g.player.pos.z-pos.z);f.ai=new AI(f,.85+tier*.1);
   const combatIntent=f.ai.intent.bind(f.ai);
   f.ai.intent=(dt,game)=>{
    if(this.wantedLevel(game.player)>0&&!f._remove)return combatIntent(dt,game);
    return {move:{x:0,z:0},aimDir:{x:f.aim.x,z:f.aim.z},slots:Object.fromEntries(Object.keys(f.slots).map(k=>[k,{pressed:false,held:false,released:true}])),fly:false,target:null,ready:false};
   };
   this.cops.push(f);this.allUnits.push(f);
  }
  if(!patrol){g.hud?.announce?.(`${NAMES[tier]} ON SCENE`,'Outpost response · disengage to lose pursuit','#ffd24a');
   g.news?.highlight?.('police',`${NAMES[tier]} ARRIVE AT THE DESERT OUTPOST`,{dur:2.5,priority:tier>=5?3:2,focus:g.player.pos});}
  return true;
 }
 update(dt){
  const g=this.g;if(this.disposed||!this.active||!g.running||g.matchOver||g.hud?.titleOpen)return;
  dt=Math.max(0,dt);this.cops=this.cops.filter(f=>g.entities.includes(f));
  if(!g.player?.alive||g.player.hp<=0)this.heat.clear();
  if(this.patrolPending&&g.player?.alive&&g.player.hp>0){
   this.patrolRetry-=dt;
   if(this.patrolRetry<=0){this.patrolPending=!this.deploy(1,2,true);this.patrolRetry=1;}
  }
  if(g.time-this._lastHarmT>6){
   for(const [f,heat] of this.heat){
    const escaped=this.cops.every(c=>!c.alive||c.hp<=0||c._remove||c.pos.distanceTo(f.pos)>220);
    const next=Math.max(0,heat-dt*(escaped?16:1.3));if(next===0)this.heat.delete(f);else this.heat.set(f,next);
   }
  }
  const target=this.villain(),tier=target?this.wantedLevel(target):0;
  if(!tier){
   this.arrival=null;this.lastTier=0;this.cooldown=0;
   for(const f of this.cops)if(!f._desertPatrol){f._leaveT=(f._leaveT??4)-dt;if(f._leaveT<=0)f._remove=true;}
   this.render();return;
  }
  for(const f of this.cops){f._leaveT=4;f.fixation=target;}
  if(tier>this.lastTier){this.lastTier=tier;this.cooldown=0;g.hud?.announce?.(`${NAMES[tier]} RESPONSE`,'Further attacks escalate the response','#ffd24a');}
  if(this.arrival){
   this.arrival.remaining-=dt;
   if(this.arrival.remaining<=0){
    if(this.deploy(tier,tier>=5?4:2)){this.arrival=null;this.cooldown=12;}
    else{this.arrival.remaining=1;this.arrival.blocked=true;}
   }
  }else{
   this.cooldown=Math.max(0,this.cooldown-dt);
   if(this.cooldown===0&&this.cops.filter(f=>f.alive&&f.hp>0&&!f._remove).length<10){this.arrival={remaining:3};this._dispatch(target.pos,true);}
  }
  this.render();
 }
 render(){if(!this.hud)return;const tier=this.wantedLevel(this.g.player),text=tier?`${NAMES[tier]} · ${'★'.repeat(tier)}${this.arrival?.blocked?' · backup waiting for open ground':this.arrival?` · backup ${Math.ceil(this.arrival.remaining)}s`:''}`:'OUTPOST SECURITY · peaceful until attacked';if(text!==this.hud.textContent)this.hud.textContent=text;}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.hud?.remove();this.arrival=null;
  for(const f of this.allUnits){const i=this.g.entities.indexOf(f);if(i>=0){this.g.entities.splice(i,1);f.obj.removeFromParent();f.dispose();}}
  this.allUnits.length=0;super.reset();
 }
}
