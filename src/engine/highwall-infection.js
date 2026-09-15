// Reversible Highwall policy. Exposure requires actual unblocked zombie melee damage.
// No airborne spread, no proximity infection, no automatic death of living subjects.
export class HighwallInfection {
 constructor(scope){this.scope=scope;this.events=[];this.serial=0;}
 hit(target,amount,opts,blocked){
  if(!this.scope.scenario.infection||blocked||amount<=0||!opts.strike||!opts.src?.def.zombieProfile||target.def.highwallBiological!==true||target._highwallInfection)return;
  target._highwallInfection={stage:'exposed',age:0,deathAge:0,source:opts.src.def.id,turned:false};
  this.record('exposure',target);target.persistCorpse=true;
 }
 record(type,f){this.events.push({type,id:f.def.id,time:this.scope.g.time});if(this.events.length>256)this.events.shift();}
 tick(dt){
  for(const f of this.scope.units){
   const s=f._highwallInfection;if(!s||s.turned)continue;
   s.age+=dt;if(s.age>=4&&s.stage==='exposed'){s.stage='symptomatic';this.record('symptoms',f);}
   if(f.alive)continue;
   s.deathAge+=dt;const delay=this.scope.scenario.turnDelay??20;
   if(s.deathAge<delay){s.stage='incubating';continue;}
   if(s.stage!=='turning'){s.stage='turning';this.record('turning',f);}
   if(s.deathAge<delay+1)continue;
   if(!this.scope.nav.isClear(f.pos,{radius:2.2,height:12}))continue;
   // Death already transferred gear into loot. The new actor receives no weapons/items.
   s.turned=true;this.record('reanimation',f);
   const zombie=this.scope.spawnTurned(f,++this.serial);
   if(f.human||f===this.scope.g.player){
    // Keep the dead human as a camera/save anchor, never as a second visible body.
    f._highwallRetiredBody=true;f.persistCorpse=true;f.noRespawn=true;f._remove=false;f.obj.visible=false;
   }else{f.persistCorpse=false;f._remove=true;}
   for(const other of this.scope.g.entities){if(other.ai?.target===f)other.ai.target=null;}
   if(f===this.scope.g.player)this.scope.g.hud.feed('You are down. Your infected body has turned. Reset or resume another scenario.');
   zombie._reanimatedFrom=f.def.id;
  }
 }
}
