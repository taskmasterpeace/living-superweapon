// THE VEHICLE ENVELOPE REGISTRY — every fleet vehicle is a DATA ROW: a motion
// CLASS (a pure stepper in engine/vehicle-motion.js) plus the numbers that make
// it itself. ONE editable surface for the whole fleet ("easily editable for the
// main application"): tweak a number here — or live via window.VEHICLE_ENVELOPES —
// and the stats bench (tools/vehicle-stats.mjs) re-measures it.
//
// ⚠ Every magnitude is a TUNABLE PROPOSAL in engine units (u, s; 1u = 0.19 m,
// km/h = u/s × 0.684) pending the flight-speed-scale ratification (#44). Rows are
// keyed to public/reference-fleet/catalog.json ids. Drones (swarm/gun/kamikaze)
// live in engine/drone-swarm.js DRONE_MOTION — the swarm is its own system.
//
// WIND (Robert: "the game has wind — very important"): every class takes a wind
// vector; `windK` is how much of the wind a vehicle actually feels (aircraft and
// hover craft ride it, tracked steel ignores it). The game feeds the Weather
// system's wind; the steppers just obey.

export const VEHICLE_ENVELOPES = {
  // ---- AIR · fixedwing (airspeed/lift/stall/bank; wind drifts ground track) ----
  'jet-b':        { cls:'fixedwing', name:'Interceptor',          top:260, burnTop:420, thrust:55, throttleRate:.7, stall:48, liftRamp:28, sink:28, bank:1.5, bankCap:1.05, turnK:46, pitchRate:.62, pitchCap:.5, climbBleed:1.1, rotate:70, windK:1, barrel:true, rollRate:8.4 },
  'jet-a':        { cls:'fixedwing', name:'Strike jet',           top:234, burnTop:365, thrust:50, throttleRate:.7, stall:46, liftRamp:27, sink:27, bank:1.4, bankCap:1.0,  turnK:44, pitchRate:.6,  pitchCap:.5, climbBleed:1.1, rotate:66, windK:1, barrel:true, rollRate:7.8 },
  'jet-c':        { cls:'fixedwing', name:'Two-seat escort jet',  top:212, burnTop:329, thrust:46, throttleRate:.65,stall:45, liftRamp:26, sink:26, bank:1.3, bankCap:.95,  turnK:42, pitchRate:.55, pitchCap:.48,climbBleed:1.1, rotate:64, windK:1, barrel:true, rollRate:7.2 },
  'stealth-jet':  { cls:'fixedwing', name:'Sable stealth jet',    top:219, burnTop:351, thrust:48, throttleRate:.65,stall:47, liftRamp:27, sink:27, bank:1.35,bankCap:1.0,  turnK:43, pitchRate:.58, pitchCap:.5, climbBleed:1.1, rotate:66, windK:1, barrel:true, rollRate:7.6 },
  'bomber':       { cls:'fixedwing', name:'Heavy bomber',         top:168, burnTop:0,   thrust:26, throttleRate:.45,stall:52, liftRamp:34, sink:24, bank:.55, bankCap:.5,   turnK:26, pitchRate:.3,  pitchCap:.3, climbBleed:1.4, rotate:78, windK:.8 },
  'troop-plane':  { cls:'fixedwing', name:'Troop jump transport', top:154, burnTop:0,   thrust:28, throttleRate:.5, stall:50, liftRamp:32, sink:24, bank:.65, bankCap:.55,  turnK:28, pitchRate:.34, pitchCap:.34,climbBleed:1.35,rotate:74, windK:.85 },
  'drone-carrier':{ cls:'fixedwing', name:'Drone carrier Kestrel',top:158, burnTop:0,   thrust:30, throttleRate:.5, stall:44, liftRamp:30, sink:22, bank:.8,  bankCap:.6,   turnK:32, pitchRate:.4,  pitchCap:.38,climbBleed:1.25,rotate:62, windK:.9 },
  // A flying capital ship — ROTOR class: it hovers on direct lift (never stalls or
  // falls like a plane), crawls forward, and turns like a continent. You fly it like a building.
  'mothership':   { cls:'rotor', name:'Obsidian mothership', top:40, accelK:.9, climb:12, sinkMax:16, turn:.3, lean:.05, leanK:.005, rock:.014, rockHz:.35, spool:5, windK:.4 },
  'mothership-fighter':{ cls:'fixedwing', name:'Catapult fighter', top:238, burnTop:372, thrust:52, throttleRate:.72,stall:47, liftRamp:27, sink:27, bank:1.45,bankCap:1.05, turnK:45, pitchRate:.62, pitchCap:.5, climbBleed:1.1, rotate:68, windK:1, barrel:true, rollRate:8.2 },

  // ---- AIR · rotor (hover, lean-into-motion, subtle rock, spool-up) ----------
  'helicopter':          { cls:'rotor', name:'Attack helicopter',    top:88, accelK:2.2, climb:32, sinkMax:40, turn:1.15, lean:.2, leanK:.011, rock:.028, rockHz:.9, spool:2.2, windK:.85, barrel:true, rollRate:6.5 },
  'transport-helicopter':{ cls:'rotor', name:'Transport helicopter', top:74, accelK:1.8, climb:26, sinkMax:34, turn:.85,  lean:.16,leanK:.010, rock:.034, rockHz:.7, spool:2.8, windK:.9, barrel:true, rollRate:5 },

  // ---- GROUND · wheeled (grip/steer; grade saps; bikes LEAN) -----------------
  'armored-scout':  { cls:'wheeled', name:'Armored scout (Jeep)', top:52, reverse:18, accel:38, brake:64, coast:.85, grip:8.5, turnRate:1.55, hiSteer:.46, slopePull:44, maxGrade:.62, windK:.06, lean:0 },
  'humvee':         { cls:'wheeled', name:'Armored utility',      top:47, reverse:16, accel:32, brake:58, coast:.8,  grip:9,   turnRate:1.35, hiSteer:.44, slopePull:46, maxGrade:.58, windK:.05, lean:0 },
  'cargo-transport':{ cls:'wheeled', name:'Armored cargo',        top:38, reverse:12, accel:20, brake:46, coast:.7,  grip:9.5, turnRate:1.0,  hiSteer:.4,  slopePull:52, maxGrade:.5,  windK:.05, lean:0 },
  'mobile-fabricator':{cls:'wheeled',name:'Mobile fabricator',    top:26, reverse:9,  accel:12, brake:34, coast:.6,  grip:10,  turnRate:.7,   hiSteer:.4,  slopePull:56, maxGrade:.42, windK:.05, lean:0 },
  'motorcycle':     { cls:'wheeled', name:'Pursuit motorcycle',   top:91, reverse:8,  accel:52, brake:70, coast:.9,  grip:6.2, turnRate:2.1,  hiSteer:.5,  slopePull:40, maxGrade:.66, windK:.10, lean:.55, airSteer:.22, barrel:true, rollRate:8, openSeat:true, saddleH:.6 },
  'atv':            { cls:'wheeled', name:'ATV',                  top:66, reverse:14, accel:44, brake:60, coast:.9,  grip:7.5, turnRate:1.9,  hiSteer:.52, slopePull:38, maxGrade:.85, windK:.08, lean:.3,  airSteer:.28, barrel:true, rollRate:7, openSeat:true, saddleH:.6 },

  // ---- GROUND · tracked (pivot turns; the TURRET is its own channel) ---------
  'tank':      { cls:'tracked', name:'Battle tank',         top:36, reverse:14, accel:14, brake:30, pivot:1.1, moveTurn:.55, slopePull:34, maxGrade:.7, windK:0, turretRate:1.4, turretPitchRate:.8, turretPitchMin:-.14, turretPitchMax:.35 },
  'drone-tank':{ cls:'tracked', name:'Drone tank Sentinel', top:42, reverse:20, accel:20, brake:36, pivot:1.6, moveTurn:.8,  slopePull:30, maxGrade:.75,windK:0, turretRate:2.2, turretPitchRate:1.2, turretPitchMin:-.2, turretPitchMax:.5 },
  'aa-tank':   { cls:'tracked', name:'Anti-air missile tank',top:34, reverse:13, accel:13, brake:28, pivot:1.0, moveTurn:.5,  slopePull:34, maxGrade:.68,windK:0, turretRate:1.9, turretPitchRate:1.5, turretPitchMin:-.05,turretPitchMax:1.35 },

  // ---- GROUND · hover (ground-effect, drifty, rides the wind) ----------------
  'hoverboard':     { cls:'hover', name:'Thrust hoverboard',    top:108, accel:60, brake:44, grip:2.6, turnRate:2.4, hoverH:2.2, bob:.4, bobHz:2.4, windK:.55, lean:.5, barrel:true, rollRate:8.5, openSeat:true, saddleH:1 },
  'hover-transport':{ cls:'hover', name:'Armed hover transport',top:58,  accel:26, brake:30, grip:3.4, turnRate:1.1, hoverH:3.4, bob:.5, bobHz:1.6, windK:.4,  lean:.14, barrel:true, rollRate:5 },

  // ---- MECHS (walkers: POWER-DOWN is a real state; the TORSO twists free) ----
  'mech-light':  { cls:'mech', name:'Light mech Outrider', top:34, accel:26, brake:40, turn:1.7, torsoRate:2.4, torsoMax:1.22, powerTime:1.6, stride:2.3, slopePull:20, maxGrade:.9, windK:0 },
  'mech-medium': { cls:'mech', name:'Medium mech',         top:26, accel:18, brake:32, turn:1.2, torsoRate:1.8, torsoMax:1.22, powerTime:2.4, stride:1.7, slopePull:22, maxGrade:.85,windK:0 },
  'mech-heavy':  { cls:'mech', name:'Heavy mech (2-crew)', top:19, accel:12, brake:26, turn:.8,  torsoRate:1.3, torsoMax:1.05, powerTime:3.4, stride:1.2, slopePull:24, maxGrade:.8, windK:0 },

  // ---- SEA (a mobile airbase turns like one) ---------------------------------
  'aircraft-carrier': { cls:'ship', name:'Aircraft carrier', top:16, reverse:5, accel:1.6, brake:2.4, turn:.055, windK:.08 },
};
try { if (typeof window !== 'undefined') window.VEHICLE_ENVELOPES = VEHICLE_ENVELOPES; } catch {}

export const VEHICLE_CLASSES = ['fixedwing', 'rotor', 'wheeled', 'tracked', 'hover', 'mech', 'ship'];
export function envelopeOf(id) { return VEHICLE_ENVELOPES[id] || null; }
