import {Vector3} from 'three';

// A repeatable Threat Room demonstration using the production movement/grab
// methods. Only setup positions are authored; impact, damage and recovery are live.
export class AerialGrabDemo {
 constructor(trial){this.trial=trial;this.g=trial.g;this.phase='ready';this.time=0;this.events=[];this.active=false;}
 start(){this.trial.recording.bind?.([this.g.player,this.trial.target]);this.active=true;this.phase='approach';this.time=0;this.elapsed=0;this.hp=this.trial.target.hp;this.g.player.toggleFlight();this.g.player.flyHeld=true;this.mark('Native takeoff / rear approach');}
 mark(label){this.events.push({time:this.elapsed||0,label});this.trial.recording.mark(this.g.time,{kind:'demo',label});this.g.hud?.feed?.(label,'#ffd24a');}
 next(phase,label){this.phase=phase;this.time=0;if(label)this.mark(label);}
 stop(reason='Demonstration cancelled'){this.active=false;this.outcome=reason;this.g.player.flyHeld=false;this.g.player.moveDir={x:0,y:0,z:0};this.mark(reason);this.onFinish?.();}
 update(dt){
  if(!this.active)return false;
  const {g,trial}=this,p=g.player,v=trial.target;
  if(g.ms?.threatLab?.state!=='preparing'||!v?.alive||!p.alive){this.stop('Demonstration stopped: actor unavailable');return false;}
  this.time+=dt;this.elapsed+=dt;
  if(this.elapsed>12){this.stop('Demonstration failed: timed out in '+this.phase);return true;}
  const move=new Vector3();
  if(this.phase==='approach'){
   move.subVectors(v.pos,p.pos).normalize();p.aim3.copy(move);p.faceDir(move.x,move.z);
   if(p.pos.y-g.world.heightAt(p.pos.x,p.pos.z)>2&&g.melee.grabTarget(p)?.fighter===v){move.set(0,0,0);p.flyHeld=false;g.melee.grab(p);this.next('capture','Reaching for rear capture');}
  }else if(this.phase==='capture'){
   if(p.grabbing===v){if(!g.melee.liftPerson(p)){this.stop('Demonstration failed: lift refused');return true;}this.next('carry','Rear hold / moving carry');}
   else if(this.time>1){this.stop('Demonstration failed: grab missed');return true;}
  }else if(this.phase==='carry'){
   if(p.grabbing!==v){this.stop('Demonstration failed: hold interrupted');return true;}
   move.set(0,.3,1);
   if(this.time>.65){p.aim3.set(0,-1,0);g.melee.grab(p);g.melee.releaseGrab(p);g.world._lookPitch=-.65;this.next('impact','Aimed downward release');}
  }else if(this.phase==='impact'){
   if(v.hp<this.hp&&v.pos.y<=g.world.heightAt(v.pos.x,v.pos.z)+.1){this.damage=this.hp-v.hp;this.next('recovery','Terrain impact: '+this.damage.toFixed(1)+' health lost');}
  }else if(this.phase==='recovery'&&this.time>.15&&g.melee.canAct(v)){
   this.next('complete','Recovery finished / control returned');
  }else if(this.phase==='complete'&&this.time>1.25){
   this.active=false;this.outcome='complete';this.onFinish?.();
  }
  p.move(move,dt);return true;
 }
 controlTarget(f,dt){f.faceDir(0,1);f.flyHeld=false;f.descendHeld=false;f.move(new Vector3(),dt);}
 frameCamera(){
  if(!this.active)return false;
  const p=this.g.player,v=this.trial.target,camera=this.g.world.camera;
  const center=p.pos.clone().add(v.pos).multiplyScalar(.5);center.y+=5;
  const distance=Math.max(30,p.pos.distanceTo(v.pos)*1.2+20);
  camera.position.copy(center).add(new Vector3(1,.4,-.55).normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateMatrixWorld(true);return true;
 }
 summary(){return {kind:'native-controller-demonstration',phase:this.phase,outcome:this.outcome||'incomplete',damage:this.damage||0,events:this.events};}
}

// Isolated status demonstration: no synthetic projectile, hit or damage. The
// production stun API relinquishes flight; gravity and fall rules determine impact.
export class AerialStunDemo extends AerialGrabDemo {
 start(){this.trial.recording.bind?.([this.g.player,this.trial.target]);this.active=true;this.phase='hover';this.time=0;this.elapsed=0;this.events=[];this.hp=this.trial.target.hp;this.mark('Airborne stun: native status demonstration');}
 update(dt){
  if(!this.active)return false;
  const v=this.trial.target;
  if(this.g.ms?.threatLab?.state!=='preparing'||!v?.alive||!this.g.player.alive){this.stop('Stun demonstration stopped: actor unavailable');return false;}
  this.time+=dt;this.elapsed+=dt;
  if(this.elapsed>12){this.stop('Stun demonstration failed: timed out in '+this.phase);return true;}
  if(this.phase==='hover'&&this.time>=.35){
   if(!v.flying){this.stop('Stun demonstration requires an airborne flying target');return true;}
   v.applyStun();this.flightReleased=!v.flying&&!v.gliding;this.next('fall','Stunned: flight relinquished to gravity');
  }else if(this.phase==='fall'){
   this.limpObserved||=v.stunT>0&&v._lostControlPose?.weight>.1;
   if(v.pos.y<=this.g.world.heightAt(v.pos.x,v.pos.z)+.1){this.damage=this.hp-v.hp;this.next('recovery',`Ground reached: ${this.damage.toFixed(1)} health lost under native fall rules`);}
  }else if(this.phase==='recovery'&&this.time>.15&&this.g.melee.canAct(v)){this.next('complete','Stun recovery finished / control returned');}
  else if(this.phase==='complete'&&this.time>1.25){this.active=false;this.outcome='complete';this.onFinish?.();}
  this.g.player.move(new Vector3(),dt);return true;
 }
 summary(){return {...super.summary(),kind:'native-airborne-stun-demonstration',flightReleased:!!this.flightReleased,limpObserved:!!this.limpObserved};}
}
