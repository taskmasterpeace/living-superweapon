// Focused, allocation-free ground-driving model for the scout car. Pure: it
// advances a kinematic state from throttle/steer/brake intents and never touches
// the world, collision, terrain height or three.js — the controller
// (scout-driving.js) owns entry/exit and the swept collision sweep, and calls
// this once per frame to shape one horizontal step.
//
// SOURCE AUDIT / provenance. The MODEL SHAPE (not the numbers) adapts ideas from
// ShootEM's arcade car feel — repo D:/git/ShootEM, file src/sim/vehicle-feel.ts,
// commit 8e0fba7c8bce16637624dee52cc40d07d88dea3b (read-only). Adapted here:
//   · speed-sensitive steer authority   (steerAuthority = 1 + (highSpeedSteer-1)*speed01)
//   · smoothed / self-centering steer    (approach at response vs return rates)
//   · roll authority + reverse-inverted steering while backing up
//   · eased, damped, capped yaw velocity (frame-rate-independent heading integration)
//   · lateral grip as exp decay so heading and travel are separate (weight, no on-rails snap)
//   · braking faster than acceleration; a distinct handbrake decel
//   · exponential coast drag + dt clamp + NaN guards
// NOT taken: the donor's multi-profile catalog, burnout, per-vehicle speed roles,
// telemetry, and its unit anchoring to INFANTRY_SPRINT_SPEED / VEHICLES — those are
// its game's units and do not fit PowerWorld. Every magnitude below is in PowerWorld
// engine units (u, s), chosen to KEEP the audited scout character (top ~52 u/s
// forward, ~18 reverse, ~0.9s handbrake stop) while fixing the feel.

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// Move `value` toward `target` by at most `amount` (linear, first-order dt-exact).
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);

// The one bounded scout profile. Tuning lives here so a test and the controller
// read the SAME numbers (they cannot drift).
export const SCOUT_DRIVE={
 topSpeed:52,        // forward cap (u/s) — unchanged from the audited controller
 reverseSpeed:18,    // reverse cap (u/s)
 accel:38,           // forward drive rate toward target (u/s^2) — punchier than the old flat 24
 reverseAccel:26,    // rate building reverse speed from rest
 opposeDecel:56,     // rate when throttle opposes travel (S while rolling forward brakes, then reverses)
 brakeDecel:64,      // Space handbrake decel (u/s^2) — firm, keeps the ~0.8s stop
 slopePull:58,      // gravity along heading per unit grade; flat handling remains unchanged
 coastDrag:0.85,     // exponential coast bleed (1/s) when no throttle and no brake
 turnRate:1.55,      // max yaw rate at low speed (rad/s); speed cuts authority from here
 highSpeedSteer:0.46,// steer authority retained at top speed (speed-sensitive steering)
 steerResponse:7.0,  // how fast steer input builds (1/s)
 steerReturn:9.5,    // how fast steer self-centers on release (1/s)
 yawResponse:9.0,    // how fast yaw velocity eases to wanted (1/s)
 yawDamping:6.0,     // yaw velocity bleed with no steer input (1/s) — straightens out
 yawCapK:1.15,       // yaw velocity cap = turnRate*this
 rollFloor:0.05,     // a wheeled scout barely steers at a standstill; authority ramps with roll
 rollSpan:0.28,      // fraction of top speed at which roll authority reaches 1 (~15 u/s)
 lateralGrip:8.5,    // lateral velocity bleed (1/s): high = planted, low = drifty
 stopEps:0.08,       // below this forward speed with no throttle, snap to rest
 maxDt:0.1,          // clamp a hitching frame (the sim honors nothing slower anyway)
};

// Ensure the persistent fields the model needs exist and are finite. Called on
// enter and defensively at the top of the step.
export function initDriveState(s){
 if(!Number.isFinite(s.speed))s.speed=0;
 if(!Number.isFinite(s.yaw))s.yaw=0;
 if(!Number.isFinite(s.vx))s.vx=0;
 if(!Number.isFinite(s.vz))s.vz=0;
 if(!Number.isFinite(s.steerSmooth))s.steerSmooth=0;
 if(!Number.isFinite(s.yawVel))s.yawVel=0;
 return s;
}

// Advance one frame. `state` carries {speed,yaw,vx,vz,steerSmooth,yawVel}; the
// controller then sweeps a displacement of (vx,vz)*dt with its own collision
// guard. `intent` is {throttle:-1..1, steer:-1..1, brake:bool}. Mutates state.
// Never throws and never leaves a NaN in the state (the frame loop depends on it).
export function stepGroundDrive(state,intent,dt,tune=SCOUT_DRIVE){
 initDriveState(state);
 const t=tune;
 // Guard every input; a bad dt/intent resets motion rather than poisoning it.
 if(!Number.isFinite(dt)||dt<=0||!intent){return state;}
 const throttle=clamp(Number.isFinite(intent.throttle)?intent.throttle:0,-1,1);
 const steerIn=clamp(Number.isFinite(intent.steer)?intent.steer:0,-1,1);
 const brake=!!intent.brake;
 const sdt=clamp(dt,0,t.maxDt);
 const top=Math.max(0.01,t.topSpeed);

 // --- Forward speed (the signed along-heading component) ---------------------
 let forward=state.speed;
 if(brake){
  forward=approach(forward,0,t.brakeDecel*sdt);
 }else if(Math.abs(throttle)<0.001){
  forward*=Math.exp(-t.coastDrag*sdt);
 }else{
  const targetFwd=throttle>0?top*throttle:-t.reverseSpeed*Math.abs(throttle);
  const opposing=forward*throttle<-0.01;             // pressing against current travel
  const rate=opposing?t.opposeDecel:(throttle>0?t.accel:t.reverseAccel);
  forward=approach(forward,targetFwd,rate*sdt);
 }
 const grade=clamp(Number.isFinite(intent.grade)?intent.grade:0,-.35,.35);
 // A held handbrake keeps a stopped vehicle planted instead of creeping downhill.
 if(!brake)forward-=grade*(t.slopePull??0)*sdt;
 forward=clamp(forward,-t.reverseSpeed,top);

 // --- Steering (smoothed, speed-sensitive, roll-limited, reverse-aware) -------
 const speed01=clamp(Math.abs(forward)/top,0,1);
 const steerAuthority=1+(t.highSpeedSteer-1)*speed01;     // <1 at speed = less bite fast
 const steerTarget=steerIn*steerAuthority;
 const returning=steerIn===0||Math.sign(steerTarget)!==Math.sign(state.steerSmooth)
  ||Math.abs(steerTarget)<Math.abs(state.steerSmooth);
 state.steerSmooth=approach(state.steerSmooth,steerTarget,(returning?t.steerReturn:t.steerResponse)*sdt);

 const roll=clamp(Math.abs(forward)/(top*t.rollSpan),t.rollFloor,1);
 const reverse=forward<-0.05?-1:1;                        // backing up inverts the wheel
 const wantedYaw=state.steerSmooth*t.turnRate*roll*reverse;
 state.yawVel=approach(state.yawVel,wantedYaw,t.yawResponse*sdt);
 if(Math.abs(steerIn)<0.001)state.yawVel*=Math.exp(-t.yawDamping*sdt);
 const yawCap=t.turnRate*t.yawCapK;
 state.yawVel=clamp(state.yawVel,-yawCap,yawCap);
 const nextYaw=state.yaw+state.yawVel*sdt;

 // --- Traction: keep heading and travel separate, then bleed the slip ---------
 // The controller's heading convention is forward = (sin(yaw), cos(yaw)); the
 // true perpendicular (right) axis is (cos(yaw), -sin(yaw)). Decompose world
 // velocity into the NEW car frame on THOSE axes, bleed the sideways part, recompose.
 const cos=Math.cos(nextYaw),sin=Math.sin(nextYaw);
 let lateral=cos*state.vx - sin*state.vz;                 // v · (cos,-sin) = sideways
 lateral*=Math.exp(-t.lateralGrip*sdt);
 let vx=sin*forward + cos*lateral;
 let vz=cos*forward - sin*lateral;

 // Snap to a clean rest so a parked scout never creeps.
 if(!brake&&Math.abs(throttle)<0.001&&Math.hypot(vx,vz)<t.stopEps){forward=0;vx=0;vz=0;lateral=0;}

 state.speed=forward;
 state.yaw=nextYaw;
 state.vx=vx;
 state.vz=vz;

 if(!Number.isFinite(state.speed)||!Number.isFinite(state.yaw)||!Number.isFinite(state.vx)
   ||!Number.isFinite(state.vz)||!Number.isFinite(state.steerSmooth)||!Number.isFinite(state.yawVel)){
  state.speed=0;state.vx=0;state.vz=0;state.yawVel=0;state.steerSmooth=0;
 }
 return state;
}

// Kill all momentum without touching heading — the controller calls this when the
// swept step hits cover, a cliff or water, so the hull dead-stops (never tunnels).
export function haltDrive(state){
 state.speed=0;state.vx=0;state.vz=0;state.yawVel=0;
 return state;
}
