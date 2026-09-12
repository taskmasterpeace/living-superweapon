// Measurements come from admitted damage, not inferred button presses.
export class RangeDrill {
  constructor(){this.state='idle';this.duration=30;this.elapsed=0;this.damage=0;this.contacts=0;}
  start(target,player,mode){
    if(!target?.alive||!player?.alive)return false;
    Object.assign(this,{state:'running',target,player,mode,elapsed:0,damage:0,contacts:0,reason:null});
    return true;
  }
  contact(target,source,healthLost){
    if(this.state!=='running'||target!==this.target||source!==this.player||!(healthLost>0))return;
    this.damage+=healthLost;this.contacts++;
  }
  update(dt,currentTarget){
    if(this.state!=='running')return;
    if(currentTarget!==this.target){this.stop('TARGET CHANGED');return;}
    if(!this.player.alive){this.stop('PLAYER DOWN');return;}
    this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,dt));
    if(!this.target.alive)this.stop('TARGET DOWN');
    else if(this.elapsed>=this.duration)this.stop('TIME UP');
  }
  stop(reason='STOPPED'){if(this.state!=='running')return;this.state='finished';this.reason=reason;}
  get remaining(){return Math.max(0,this.duration-this.elapsed);}
}
