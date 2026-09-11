import { MOTION_DEFAULTS } from '../data/flight-tuning.js';

// Powered flight owns velocity; impact/throw/grapple systems can explicitly take ownership back.
// All input schemes use this same response. Presentation never changes the collision transform.
export function steerFlight(f, dir, speed, dt, responseProfile) {
  let x = dir.x || 0, y = dir.y || 0, z = dir.z || 0;
  if (f.flyHeld) y += 0.85;
  if (f.descendHeld) y -= 0.85;
  const length = Math.hypot(x, y, z);
  if (length > 1) { x /= length; y /= length; z /= length; }
  const moving = length > 0.01;
  const v = f.vel, oldSpeed = v.length();
  // Snappy initial authority, a little more commitment at full throttle. Braking carries the
  // body about one length, then ends in a stable hover rather than an endless exponential crawl.
  const motion = f.def?.model?.motion;
  const key = moving ? (f.cruiseHeld ? 'boostAcceleration' : 'acceleration') : 'braking';
  const turning=moving&&oldSpeed>1&&(v.x*x+v.y*y+v.z*z)/oldSpeed<.8;
  const response = motion?.[key] ?? (turning?responseProfile?.turning:responseProfile?.[key]) ?? MOTION_DEFAULTS[key];
  const blend = 1 - Math.exp(-response * dt);
  v.x += (x * speed - v.x) * blend;
  v.y += (y * speed - v.y) * blend;
  v.z += (z * speed - v.z) * blend;
  if (!moving && v.lengthSq() < 0.16) v.set(0, 0, 0);
  f._flightBrake = !moving ? Math.min(1, oldSpeed / 32) : 0;
  f._flightThrottle = moving ? Math.min(1, length) : 0;
}

export function ownsFlightVelocity(f) {
  return f._openSky && f.flying && f.airborne && f.launchT <= 0 &&
    !(f.burstT > 0 || f._slideT > 0 || f._thrownT > 0 || f._grapple || f.hanging);
}
