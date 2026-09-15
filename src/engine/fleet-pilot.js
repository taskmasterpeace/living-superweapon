// FLEET PILOT — the ONE boarding + driving manager for spawned reference-fleet
// vehicles. Robert: "everything needs a pilot." It owns game._fleetActors (spawned by
// game.spawnFleetVehicle), lets the player walk up + press J to board any of them, and
// each frame reads WASD into a per-class intent and runs the generic driveActor
// (vehicle-pilot.js) — so a tank, mech, hovercraft, ship, the carrier or the mothership
// all board and drive through this single path. Powerworld-gated; the city is untouched.
import { driveActor } from './vehicle-pilot.js';
import { FleetAudio } from './fleet-audio.js';
import {FleetControlsHud,fleetControls} from './fleet-controls.js';
import {canUseFlight} from './mobility-policy.js';
import {sessionOf,seatBusy,SEAT_DRIVER} from './vehicle-session.js';
import {turretSlewIntent,wrapAngle,attachMount,fireVehicleWeapon} from './vehicle-weapons.js';

const AIMED = new Set(['tracked','mech']);   // classes whose mount the mouse aims

const busy=seatBusy;
function boardReason(game,a,p){
 // seat/occupancy law lives in the shared session; the pilot layers the
 // physical rules (proximity, obstruction) on top of it, never instead of it.
 const seatReason=sessionOf(game,a)?.claimReason(SEAT_DRIVER,p);
 if(seatReason)return seatReason;
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
    // THE MOUSE AIMS THE MOUNT (tracked turret / mech torso). Ordinary mouse
    // look is already suppressed while seated (game.js), so the deltas are free;
    // Alt keeps the freelook and therefore never moves the gun. The aim is a
    // WORLD yaw/pitch — a turning hull does not drag the gun off target.
    if (AIMED.has(cls) && this._aim && !d('AltLeft') && !d('AltRight')) {
      const mx = input?.mouse?.dx || 0, my = input?.mouse?.dy || 0, sens = this.game.world?._lookSens || .0024;
      this._aim.yaw = wrapAngle(this._aim.yaw + mx * sens);
      const e = this.actor.env;
      this._aim.pitch = Math.max(e.turretPitchMin ?? -0.6, Math.min(e.turretPitchMax ?? 0.6, this._aim.pitch - my * sens * .7));
    }
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
      fire: !!input?.mouse?.left,
      reload: cls !== 'fixedwing' && !!input?.pressed?.('KeyR'),
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
    const claim=sessionOf(this.game,a).claim(SEAT_DRIVER,p,{source:'player'});
    if(claim){this.game.hud?.feed?.(claim,'#ffce75');return false;}
    this.actor = a;
    // open with the gun where the mount is actually pointing — no snap on entry
    const m = a.motion;
    this._aim = AIMED.has(a.cls) ? { yaw: wrapAngle((m.yaw || 0) + (m.turretYaw ?? m.torsoYaw ?? 0)), pitch: m.turretPitch || 0 } : null;
    this._c = null; this.game.world && (this.game.world._chaseSnap = true);
    this._seat();
    attachMount(a);
    this._hud.update(a,{canSwitchVehicle:!!this.game._simActive});
    this._audio.enter(a);
    this.game.hud?.feed?.(`${(a.name || a.id).toUpperCase()} — ${fleetControls(a.cls,{canSwitchVehicle:!!this.game._simActive,armed:!!a.weapon})}`, '#ffce75');
    return true;
  }

  _seat() { this.actor?.session?.tick(); }

  update(dt) {
    const a = this.actor; if (!a) { this._audio.stop(); return; }
    if (a.destroyed || !a.occupant?.alive || a.occupant !== this.game.player) { this.exit({force:true}); return; }
    if (this._blocked() || !(dt > 0)) { this._audio.pause(); return; }
    this._audio.update(this._c || {});
    const intent = fleetIntent(a.cls, this._c || {});
    if (this._aim) Object.assign(intent, turretSlewIntent(a.cls, a.motion, a.env, this._aim, dt));
    driveActor(a, intent, dt, this.game.world);
    // the mounted weapon: same fire path the AI crew uses (vehicle-weapons.js)
    const w = attachMount(a);
    if (w) {
      w.update(dt);
      if (this._c?.reload && w.reloadNow()) this.game.hud?.feed?.(`${w.spec.label || 'GUN'} — RELOADING`, '#ffce75');
      if (this._c?.fire) {
        const wasDry = w.dry;
        fireVehicleWeapon(this.game, a, a.occupant);
        if (wasDry && !this._saidDry) { this._saidDry = true; this.game.hud?.feed?.(`${w.spec.label || 'GUN'} DRY — no rounds remain`, '#ff8b63'); }
        if (!wasDry) this._saidDry = false;
      }
    }
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
    // Forced lifecycle cleanup always releases ownership. If boxed in, the
    // session keeps the seat position rather than teleport through a wall.
    if(destination&&!(destination.air&&!canUseFlight(p)))a.session?.release(SEAT_DRIVER,{destination});
    else a.session?.release(SEAT_DRIVER,{});
    this.actor = null; this._c = null; this._aim = null; this.game.world && (this.game.world._chaseSnap = true);
    return true;
  }

  dispose() { this._audio.stop(); if (this.actor) this.exit({force:true}); }
}
