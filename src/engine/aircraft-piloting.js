import {Vector3,MathUtils} from 'three';
import {cancelHeldAttacks} from './abilities.js';
import {canPilotVehicle} from './mobility-policy.js';
import {soldierControlsActive} from '../core/soldier-controls.js';

// Arcade flight, not a scripted orbit: force-integrated helicopter motion and
// airspeed-dependent fixed-wing lift share native terrain and cover collision.
export class AircraftPiloting {
 constructor(support){this.support=support;this.game=support.game;this.vehicle=null;this.throttle=0;this.steer=0;this.rudder=0;this.collective=0;this.fire=false;this._next=new Vector3();this._exit=new Vector3();}
 get blocked(){const g=this.game;return g.paused||g.running===false||g.matchOver||g.hud?.titleOpen||g.combatOverlayOpen||g._frontlinePreparing||g._threatRoom?.active;}
 handleInput(input){
  if(this.blocked){this.throttle=this.steer=this.rudder=this.collective=0;this.fire=false;return !!this.vehicle;}
  const p=this.game.player;
  const use=input?.pressed?.('KeyJ')?'KeyJ':!this.vehicle&&soldierControlsActive(p,this.game)&&input?.pressed?.('KeyE')?'KeyE':null;
  if(use){
   if(this.vehicle){input.justPressed?.delete('KeyJ');if(!this.exit())this.game.hud?.feed?.('LAND AND STOP BEFORE EXITING','#ffce75');return true;}
   const actor=this.nearest(p);
   if(actor){input.justPressed?.delete(use);this.enter(actor,p);return true;}
  }
  if(!this.vehicle)return false;
  const jet=this.vehicle.kind==='jet';
  this.throttle=Number(!!input?.down?.(jet?'KeyR':'KeyW'))-Number(!!input?.down?.(jet?'KeyF':'KeyS'));
  this.steer=Number(!!input?.down?.('KeyD'))-Number(!!input?.down?.('KeyA'));
  this.rudder=jet?Number(!!input?.down?.('KeyE'))-Number(!!input?.down?.('KeyQ')):0;
  this.collective=jet?Number(!!input?.down?.('KeyS'))-Number(!!input?.down?.('KeyW')):
   Number(!!input?.down?.('Space'))-Number(!!(input?.down?.('ControlLeft')||input?.down?.('ControlRight')||input?.down?.('KeyZ')));
  // The mouse can press and release between simulation frames. Preserve that
  // edge for this tick without queuing another round across the gun cooldown.
  this.fire=!!(input?.down?.('Mouse0')||input?.mouse?.left||input?.mouse?.leftEdge);return true;
 }
 nearest(p){
  if(this.game._threatRoom?.active)return null;
  if(!p?.alive||!canPilotVehicle(p)||p.flying||p._scoutVehicle||p.grabbedBy||p.grabbing||p.staggerT>0||p.frozenT>0)return null;
  let best=null,distance=Infinity;
  for(const a of this.support.actors){
   if(!a.pilotable||!a.parked||a.destroyed||a.combat?.dead||a.occupant)continue;
   const d=Math.hypot(p.pos.x-a.wrapper.position.x,p.pos.z-a.wrapper.position.z);
   if(d<a.bodyRadius+9&&d<distance&&Math.abs(p.pos.y-a.ground)<7&&this._accessClear(p,a)) {best=a;distance=d;}
  }
  return best;
 }
 _accessClear(p,a){
  const dx=a.wrapper.position.x-p.pos.x,dz=a.wrapper.position.z-p.pos.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/2));
  for(let i=0;i<=steps;i++)if(!this._clear(p.pos.x+dx*i/steps,p.pos.y+4,p.pos.z+dz*i/steps,p.radius||2,a))return false;return true;
 }
 enter(a,p){
  if(this.game._threatRoom?.active)return false;
  if(!p?.alive||!canPilotVehicle(p)||!a.parked||a.occupant||a.destroyed||a.combat?.dead)return false;
  cancelHeldAttacks(p);a.occupant=p;a._occupantVisible=p.obj.visible;this.vehicle=a;p._aircraftVehicle=a;
  a.velocity??=new Vector3();a.speed=0;a.pitch=0;a.roll=0;a.yaw??=a.wrapper.rotation.y;a.velocity.set(0,0,0);
  p.flying=p.flyHeld=p.descendHeld=p.guarding=p.prone=p.crouching=p.sprintHeld=false;p.moveDir={x:0,z:0};p.vel.set(0,0,0);p.obj.visible=false;
  this.throttle=this.steer=this.rudder=this.collective=0;this.fire=false;this.game.world._chaseSnap=true;this._seat();
  this.game.hud?.feed?.(a.kind==='jet'?'JET · W/S PITCH · A/D BANK · Q/E RUDDER · R/F THROTTLE · LMB CANNON':'HELICOPTER · W/S FORWARD · A/D TURN · SPACE/CTRL LIFT · LMB CANNON','#ffce75');return true;
 }
 _seat(){const a=this.vehicle,p=a?.occupant;if(!p)return;p.pos.copy(a.wrapper.position);p.vel.set(0,0,0);p.obj.position.copy(p.pos);p.obj.visible=false;}
 _clear(x,y,z,r,a,vertical=r){
  const w=this.game.world;if(Number.isFinite(w.ARENA)&&(Math.abs(x)+r>w.ARENA||Math.abs(z)+r>w.ARENA))return false;
  for(const c of w.cover||[]){if(c===a.combat?.cover||c.hp<=0||y+vertical<(c.bottom??0)||y-vertical>(c.top??c.h??Infinity))continue;
   const dx=Math.max(0,Math.abs(x-c.x)-(c.hx??c.r??0)),dz=Math.max(0,Math.abs(z-c.z)-(c.hz??c.r??0));if(dx*dx+dz*dz<r*r)return false;
  }return true;
 }
 update(dt){
  const a=this.vehicle;if(!a)return;
  if(a.destroyed||a.combat?.dead){this.exit(true);return;}
  if(!a.occupant?.alive||a.occupant!==this.game.player||a.occupant._formDisposed){if(a.parked)this.exit(true);else this.crash();return;}
  if(this.blocked||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);
  const jet=a.kind==='jet',v=a.velocity;
  if(jet){
   a.speed=MathUtils.clamp(a.speed+this.throttle*38*dt-(a.parked?4:1.2)*dt,0,260);
   a.roll=a.parked?0:MathUtils.clamp((a.roll||0)+this.steer*1.3*dt,-.95,.95);
   if(!this.steer)a.roll*=Math.exp(-1.5*dt); // assisted wings-level recovery
   // +Z is forward, camera-right is -X: positive roll lowers the right wing.
   // Banked lift turns the flight path; rudder remains a separate yaw input.
   const bankTurn=42*Math.tan(a.roll)/Math.max(60,a.speed);
   a.yaw-=(this.rudder*(a.parked?.4:.55)*Math.min(1,a.speed/35)+bankTurn)*dt;
   a.pitch=MathUtils.clamp((a.pitch||0)+this.collective*.5*dt,-.48,.48);
   if(a.parked&&a.speed<65)a.pitch=0;
   const lift=MathUtils.clamp((a.speed-45)/30,0,1),vertical=a.speed*Math.sin(a.pitch)*lift-(1-lift)*22;
   v.set(Math.sin(a.yaw)*a.speed*Math.cos(a.pitch),vertical,Math.cos(a.yaw)*a.speed*Math.cos(a.pitch));
   a.wrapper.rotation.set(-a.pitch,a.yaw,a.roll,'YXZ');
  }else{
   a.yaw+=this.steer*.95*dt;const gain=1-Math.exp(-2*dt),target=this.throttle*80;
   v.x+=(Math.sin(a.yaw)*target-v.x)*gain;v.z+=(Math.cos(a.yaw)*target-v.z)*gain;v.y+=(this.collective*30-v.y)*gain;
   a.speed=Math.hypot(v.x,v.z);a.wrapper.rotation.set(this.throttle*.17,a.yaw,-this.steer*.14,'YXZ');
  }
  const steps=Math.max(1,Math.ceil(v.length()*dt/2)),step=dt/steps,r=a.bodyRadius||12;
  for(let i=0;i<steps;i++){
   this._next.copy(a.wrapper.position).addScaledVector(v,step);const ground=this.game.world.heightAt?.(this._next.x,this._next.z)??0,floor=ground+a.groundOffset;
   const vertical=a.groundOffset+(Math.abs(Math.sin(a.wrapper.rotation.x))+Math.abs(Math.sin(a.wrapper.rotation.z)))*r;
   if(!Number.isFinite(ground)||this.game.world.waterAt?.(this._next.x,this._next.z)||!this._clear(this._next.x,this._next.y,this._next.z,r,a,vertical)){this.crash();break;}
   if(this._next.y<=floor||(this._next.y<=floor+.05&&v.y<=.01)){
    if((!a.parked&&(v.y< -35||jet&&a.speed>85))||floor-a.wrapper.position.y>3){this.crash();break;}
    this._next.y=floor;v.y=0;a.parked=true;a.pitch=0;
   }else a.parked=false;
   a.ground=ground;a.wrapper.position.copy(this._next);
  }
  if(!this.vehicle)return;
  a.combat?.syncBounds();a.combat?.pilotFire?.(dt,this.fire);this._seat();
 }
 crash(){const a=this.vehicle;if(!a)return;a.destroyed=true;a.combat?.destroy();a.wrapper.visible=false;this.game.hud?.feed?.('AIRCRAFT DISABLED','#ff8b63');this.exit(true);}
 exit(force=false){
  const a=this.vehicle,p=a?.occupant;if(!p)return false;
  if(!force&&(!a.parked||a.speed>5||Math.abs(a.velocity.y)>3))return false;
  let found=false;
  if(a.parked)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=a.wrapper.position.x+dx*(a.bodyRadius+6),z=a.wrapper.position.z+dz*(a.bodyRadius+6),h=this.game.world.heightAt?.(x,z)??0;
   if(Number.isFinite(h)&&!this.game.world.waterAt?.(x,z)&&this._clear(x,h+4,z,p.radius||2,a)){this._exit.set(x,h,z);found=true;break;}
  }
  if(!found&&!force)return false;
  if(!found)this._exit.copy(a.wrapper.position).add(new Vector3(0,a.groundOffset+8,0));
  p.pos.copy(this._exit);p.obj.position.copy(p.pos);p.obj.visible=a._occupantVisible!==false;p.vel.set(0,0,0);p._aircraftVehicle=null;
  a.occupant=null;a.velocity.set(0,0,0);a.speed=0;this.vehicle=null;this.throttle=this.steer=this.rudder=this.collective=0;this.fire=false;this.game.world._chaseSnap=true;return true;
 }
 dispose(){this.exit(true);}
}
