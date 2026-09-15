// FLEET PILOT — the ONE boarding + driving manager for spawned reference-fleet
// vehicles. Robert: "everything needs a pilot." It owns game._fleetActors (spawned by
// game.spawnFleetVehicle), lets the player walk up + press J to board any of them, and
// each frame reads WASD into a per-class intent and runs the generic driveActor
// (vehicle-pilot.js) — so a tank, mech, hovercraft, ship, the carrier or the mothership
// all board and drive through this single path. Powerworld-gated; the city is untouched.
import { driveActor } from './vehicle-pilot.js';
import { cancelHeldAttacks } from './abilities.js';
import { FleetAudio } from './fleet-audio.js';
import {FleetControlsHud,fleetControls} from './fleet-controls.js';
import {canUseFlight} from './mobility-policy.js';

const busy=p=>!p?.alive||p.stunT>0||p.frozenT>0||p.staggerT>0||p.sleepT>0||p.launchT>0||p.grabbedBy||p.grabbing||p._carry||p._personCarry;
function boardReason(game,a,p){
 if(busy(p)||p._fleetVehicle||p._scoutVehicle||p._aircraftVehicle||p._passengerTransport)return 'Cannot board during this action.';
 if(!a?.ready||a.occupant||a.destroyed)return 'Vehicle is unavailable.';
 if(Math.abs(p.pos.y-a.pos.y)>8||Math.hypot(p.pos.x-a.pos.x,p.pos.z-a.pos.z)>(a.bodyRadius||8)+8)return 'Move closer to the vehicle entrance.';
 if(game.world?._camNearestT?.(p.pos.x,p.pos.y+3,p.pos.z,a.pos.x,a.pos.y+3,a.pos.z,.2)<.999)return 'Vehicle entrance is obstructed.';
 return null;
}
function clearExit(game,a,p,x,y,z){
 const w=game.world,r=p.radius||2,h=12*(p.sizeScale||1);
 if((w?.heightAt?.(x,z)??0)>y+.5)return false;
 if(Number.isFinite(w?.ARENA)&&(Math.abs(x)+r>w.ARENA||Math.abs(z)+r>w.ARENA))return false;
 for(const c of w?.cover||[]){
  if(c===a.cover||c.hidden||c.hp<=0||y>=(c.top??c.h??Infinity)+.05||y+h<(c.bottom??0)-.05)continue;
  const dx=Math.max(0,Math.abs(x-c.x)-(c.hx??c.r??0)),dz=Math.max(0,Math.abs(z-c.z)-(c.hz??c.r??0));
  if(dx*dx+dz*dz<(r+.3)**2)return false;
 }
 for(const other of game.entities||[])if(other!==p&&other.alive&&Math.abs(other.pos.y-y)<h&&Math.hypot(other.pos.x-x,other.pos.z-z)<r+(other.radius||2)+.5)return false;
 for(const other of game._fleetActors||[])if(other!==a&&!other.destroyed&&Math.abs(other.pos.y-y)<h+(other.bodyHeight||10)&&Math.hypot(other.pos.x-x,other.pos.z-z)<r+(other.bodyRadius||6))return false;
 return true;
}
export function fleetExitPosition(game,a,p){
 const w=game.world,r=(p.radius||2)+(a.bodyRadius||8)+3,base=(a.motion?.yaw||0)+Math.PI/2;
 for(const turn of [0,1,-1,2,-2,3,-3,4]){
  const angle=base+turn*Math.PI/4,x=a.pos.x+Math.sin(angle)*r,z=a.pos.z+Math.cos(angle)*r;
  const floor=w?.heightAt?.(x,z)??0,drop=a.pos.y-floor,air=Math.abs(drop)>6;
  if(air&&!canUseFlight(p)||floor>a.pos.y+6||(!air&&w?.waterAt?.(x,z)))continue;
  const y=air?a.pos.y:floor,steps=Math.max(1,Math.ceil(r/2));let safe=true;
  for(let i=1;i<=steps;i++){const t=i/steps;if(!clearExit(game,a,p,a.pos.x+(x-a.pos.x)*t,a.pos.y+(y-a.pos.y)*t,a.pos.z+(z-a.pos.z)*t)){safe=false;break;}}
  if(safe)return {x,y,z,air};
 }
 return null;
}

// Normalised controls → the intent shape each class's stepper expects. Ground classes
// drive on W/S; aircraft keep flight-sim mapping (throttle R/F, pitch W/S, bank A/D).
export function fleetIntent(cls, c) {
  if (cls === 'fixedwing') return { throttle: c.throttle, steer: c.bank, rudder: c.bank, pitch: c.pitch, barrel: 0, gearToggle:c.gearToggle, parked: false };
  if (cls === 'rotor') return { throttle: c.fwd, steer: c.turn, lift: c.lift, barrel: c.barrel, on: true };
  if (cls === 'tracked') return { throttle: c.fwd, steer: c.turn, brake: c.brake, turretX: c.aimX, turretY: c.aimY };
  if (cls === 'mech') return { throttle: c.fwd, steer: c.turn, brake: c.brake, torsoX: c.aimX, powerOn: true };
  if (cls === 'hover' || cls === 'ship') return { throttle: c.fwd, steer: c.turn, brake: c.brake };
  return { throttle: c.fwd, steer: c.turn, brake: c.brake, barrel: c.barrel };           // wheeled
}

export class FleetPilot {
  constructor(game) { this.game = game; this.actor = null; this._tapT = 0; this._tapKey = ''; this._audio = new FleetAudio(game.audio); this._hud=new FleetControlsHud(); }

  _blocked() { const g = this.game; return g.paused || g.running === false || g.matchOver || g.hud?.titleOpen || g.combatOverlayOpen; }

  handleInput(input) {
    const g = this.game, p = g.player;
    if (this._blocked()) { this._audio.pause(); return !!this.actor; }
    if (input?.pressed?.('KeyJ')) {
      input.justPressed?.delete?.('KeyJ');
      if (this.actor) { this.exit(); return true; }
      const a = this._nearest(p);
      if (a) { this.enter(a, p); return true; }
    }
    if (!this.actor) return false;
    const d = code => !!input?.down?.(code), cls = this.actor.cls;
    // Steering taps never trigger an aerobatic maneuver.
    const barrel = 0;
    this._c = {
      fwd: Number(d('KeyW')) - Number(d('KeyS')),
      turn: Number(d('KeyD')) - Number(d('KeyA')),
      bank: Number(d('KeyD')) - Number(d('KeyA')),
      throttle: Number(d('KeyR')) - Number(d('KeyF')),      // aircraft throttle
      pitch: Number(d('KeyS')) - Number(d('KeyW')),          // aircraft collective
      lift: Number(d('Space')) - Number(d('ControlLeft') || d('KeyZ')),
      brake: d('Space'),
      aimX: 0, aimY: 0, barrel, gearToggle:!!input?.pressed?.('KeyG'),
    };
    return true;
  }

  _nearest(p) {
    if (!p?.alive) return null;
    let best = null, dist = Infinity;
    for (const a of (this.game._fleetActors || [])) {
      if (boardReason(this.game,a,p)) continue;
      const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      if (d < (a.bodyRadius || 8) + 8 && d < dist) { best = a; dist = d; }
    }
    return best;
  }

  enter(a, p) {
    const reason=this._blocked()?'Close the current menu before boarding.':boardReason(this.game,a,p);
    if(reason){this.game.hud?.feed?.(reason,'#ffce75');return false;}
    cancelHeldAttacks(p); this.actor = a; a.occupant = p; p._fleetVehicle = a; p._occVisible = p.obj?.visible;
    p.flying = p.flyHeld = p.descendHeld = p.guarding = p.prone = p.crouching = p.sprintHeld = false;
    if (p.moveDir) p.moveDir = { x: 0, z: 0 }; p.vel?.set?.(0, 0, 0); if (p.obj) p.obj.visible = false;
    this._c = null; this.game.world && (this.game.world._chaseSnap = true);
    this._seat();
    this._hud.update(a,{canSwitchVehicle:!!this.game._simActive});
    this._audio.enter(a);
    this.game.hud?.feed?.(`${(a.name || a.id).toUpperCase()} — ${fleetControls(a.cls,{canSwitchVehicle:!!this.game._simActive})}`, '#ffce75');
    return true;
  }

  _seat() { const a = this.actor, p = a?.occupant; if (!p) return; p.pos?.set ? p.pos.set(a.pos.x, a.pos.y + (a.groundOffset || 2), a.pos.z) : (p.pos.x = a.pos.x, p.pos.y = a.pos.y, p.pos.z = a.pos.z); p.vel?.set?.(0, 0, 0); if (p.obj) { p.obj.position?.copy?.(p.pos); p.obj.visible = false; } }

  update(dt) {
    const a = this.actor; if (!a) { this._audio.stop(); return; }
    if (a.destroyed || !a.occupant?.alive || a.occupant !== this.game.player) { this.exit({force:true}); return; }
    if (this._blocked() || !(dt > 0)) { this._audio.pause(); return; }
    this._audio.update(this._c || {});
    driveActor(a, fleetIntent(a.cls, this._c || {}), dt, this.game.world);
    if(this._c)this._c.gearToggle=false;
    this._hud.update(a,{canSwitchVehicle:!!this.game._simActive});
    this._seat();
  }

  exit({force=false}={}) {
    const a = this.actor, p = a?.occupant;
    const destination=p?fleetExitPosition(this.game,a,p):null;
    if(p&&!force&&(busy(p)||!destination)){this.game.hud?.feed?.('No safe exit. Land or move the vehicle into clear space.','#ffce75');return false;}
    this._hud.dispose();
    this._audio.stop({off:!force&&!this._blocked()});
    if (!p) { this.actor = null; this._c=null;return false; }
    // Forced lifecycle cleanup always releases ownership. If boxed in, retain
    // the actor's existing world position rather than teleport through a wall.
    if(destination){p.pos?.set?p.pos.set(destination.x,destination.y,destination.z):Object.assign(p.pos,destination);p.flying=!!destination.air&&p.alive&&canUseFlight(p);p.groundY=this.game.world?.heightAt?.(destination.x,destination.z)??0;}
    p.obj && (p.obj.position?.copy?.(p.pos), p.obj.visible = p._occVisible !== false);
    p.vel?.set?.(0, 0, 0); p._fleetVehicle = null; a.occupant = null;
    this.actor = null; this._c = null; this.game.world && (this.game.world._chaseSnap = true);
    return true;
  }

  dispose() { this._audio.stop(); if (this.actor) this.exit({force:true}); }
}
