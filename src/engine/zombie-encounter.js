import {AI} from './ai.js';
import {encounterGround} from './encounter-ground.js';
import {ZOMBIE_ENCOUNTER as RECIPE,zombieDefinition} from '../data/zombie-encounter.js';
export {zombieDefinition};

export class ZombieEncounter{
 constructor(game){
  this.game=game;this.units=[];this.wave=0;this.phase='combat';this.rest=0;this.disposed=false;this.finished=false;
  if(typeof document!=='undefined'){
   this.hud=document.createElement('aside');this.hud.id='zombieObjective';this.hud.setAttribute('aria-label','Outbreak encounter');
   this.hud.style.cssText='position:fixed;left:18px;top:108px;z-index:12;pointer-events:none;max-width:290px;padding:12px 14px;border:1px solid var(--line-gold);border-radius:var(--r-2);background:var(--surface-solid);color:var(--text);font:600 15px/1.4 var(--f-display);box-shadow:var(--sh-1)';
   document.body.appendChild(this.hud);
  }
  try{this.nextWave();}catch(error){this.dispose();throw error;}
 }
 nextWave(){
  const next=this.wave+1,used=[];
  try{for(let i=0;i<RECIPE.waves[next-1];i++)used.push(encounterGround(this.game.world,this.game.player.pos,i,used,RECIPE.spawnRadius));}
  catch(error){if(error.code!=='ENCOUNTER_NO_SPAWN')throw error;this.phase='blocked';this.rest=1;this.render();return false;}
  this.wave=next;this.phase='combat';
  for(const p of used){
   const f=this.game.addFighter(zombieDefinition(this.wave-1,{sprinter:(this.game.random?.()??Math.random())<.01}),{team:1,x:p.x,z:p.z});
   f.pos.copy(p);f.groundY=p.y;f.obj.position.copy(p);f._encounterNPC=true;f._chaseKb=true;f._openSky=true;f.noRespawn=true;f.ai=new AI(f,.7);
   f.faceDir(this.game.player.pos.x-p.x,this.game.player.pos.z-p.z);
   this.units.push(f);
  }
  this.game.hud?.announce?.(`OUTBREAK · WAVE ${this.wave}`,'TAB melee · final hits create space','#ffd24a');this.render();
 }
 update(dt){
  const g=this.game;if(this.disposed||this.finished||!g.running||g.matchOver||g.hud?.titleOpen)return;
  if(!g.player?.alive||g.player.hp<=0){this.finish(false);return;}
  if(this.phase==='recover'||this.phase==='blocked'){
   this.rest=Math.max(0,this.rest-Math.max(0,dt));if(this.rest<=0)this.nextWave();
  }else if(this.units.every(f=>!f.alive||f.hp<=0)){
   if(this.wave>=RECIPE.waves.length){this.finish(true);return;}
   this.phase='recover';this.rest=RECIPE.recovery;
  }
  this.render();
 }
 finish(win){
  if(this.finished)return;this.finished=true;this.phase=win?'complete':'failed';this.render();
  this.game.endMatch({win,title:win?'OUTBREAK CONTAINED':'OVERRUN',operation:'outbreak',wave:this.wave,
   lines:[win?'All three waves defeated.':'The outbreak overran this attempt.','Rematch to try another approach.'],winner:win?this.game.player:null});
 }
 render(){
  if(!this.hud)return;const alive=this.units.filter(f=>f.alive&&f.hp>0).length;
  const text=this.phase==='blocked'?'OUTBREAK · move into open ground to continue':this.phase==='recover'?`RECOVER · ${Math.ceil(this.rest)}s to next wave`:this.finished?(this.phase==='complete'?'OUTBREAK CONTAINED':'OVERRUN'):`OUTBREAK · ${this.wave}/3 · ${alive} remaining`;
  if(this.hud.textContent!==text)this.hud.textContent=text;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.hud?.remove();
  for(const f of this.units){const i=this.game.entities.indexOf(f);if(i>=0){this.game.entities.splice(i,1);f.obj.removeFromParent();f.dispose();}}
  this.units.length=0;
 }
}
