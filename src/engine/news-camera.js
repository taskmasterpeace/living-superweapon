// The field lens observes world positions; it never drives the gameplay camera or fighters.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const value = (n, fallback, lo, hi) => clamp(Number.isFinite(Number(n)) ? Number(n) : fallback, lo, hi);
export const NEWS_CAMERA_DEFAULTS = Object.freeze({ crashZoom: 0.75, handheld: 0.35, shotHold: 1.2 });
export function normalizeNewsCameraProfile(profile = {}) {
  return {
    crashZoom: value(profile.crashZoom, 0.75, 0, 1),
    handheld: value(profile.handheld, 0.35, 0, 1),
    shotHold: value(profile.shotHold, 1.2, 0.6, 2.4),
  };
}
export const normalizeCameraProfile = normalizeNewsCameraProfile;
const point = p => p?.pos || p;
const center = p => ({ x: p.x, y: (p.y || 0) + 5, z: p.z });

// Fit subject bodies with headroom in perspective (including vertical fights).
function fit(eye, look, subjects) {
  let dx = look.x - eye.x, dy = look.y - eye.y, dz = look.z - eye.z;
  const distance = Math.hypot(dx, dy, dz) || 1; dx /= distance; dy /= distance; dz /= distance;
  const horizontal = Math.hypot(dx, dz);
  const rx = horizontal > 0.00001 ? -dz / horizontal : 1, rz = horizontal > 0.00001 ? dx / horizontal : 0;
  const ux = -dy * rz, uy = dz * rx - dx * rz, uz = dy * rx;
  let tangent = 0.14;
  for (const s of subjects) {
    const x = s.x - eye.x, y = s.y - eye.y, z = s.z - eye.z;
    const depth = Math.max(3, x * dx + y * dy + z * dz);
    const radius = s.radius ?? 6;
    tangent = Math.max(tangent, (Math.abs(x * rx + z * rz) + radius) / (depth * 16 / 9),
      (Math.abs(x * ux + y * uy + z * uz) + radius) / depth);
  }
  return clamp(2 * Math.atan(tangent * 1.22) * 180 / Math.PI, 20, 76);
}

export function sampleNewsShot(input) {
  const { eye, focus, time, event, reporter, standup, down = 0, winner } = input;
  const profile = normalizeNewsCameraProfile(input.profile);
  const a = point(input.actor), b = point(input.target);
  let look = { ...focus }, kind = 'action', subjects = [];
  if (a) subjects.push(center(a)); if (b) subjects.push(center(b));
  if (a && b) look = { x: (a.x + b.x) / 2, y: ((a.y || 0) + (b.y || 0)) / 2 + 5, z: (a.z + b.z) / 2 };
  else if (a) look = center(a);
  if (!subjects.length) subjects = [{ ...look, radius: Math.max(7, (input.spread || 16) * 0.38) }];
  const age = event ? time - event.time : Infinity;
  let zoom = 1;
  if (standup && reporter && down < 0.1) {
    kind = 'reporter'; look = { x: reporter.x, y: (reporter.y || 0) + 7.1, z: reporter.z };
    subjects = [{ ...look, radius: 3.2 }];
  } else if (winner) {
    kind = 'winner'; look = center(point(winner)); subjects = [{ ...look, radius: 6 }];
  } else if (age >= 0 && age < 0.3 && event?.focus) {
    kind = 'impact'; look = { ...event.focus, y: Math.max(4, event.focus.y || 0) };
    // A quick optical crash, followed by a held subject and then a readable two-shot.
    zoom = 1 - profile.crashZoom * 0.3;
  } else if (age >= 0.3 && age < profile.shotHold && a) {
    kind = event.tag === 'tier' ? 'ascension' : 'attacker';
    look = center(a); subjects = [{ ...look, radius: 6 }];
  }
  let fov = fit(eye, look, subjects) * zoom;
  if (down > 0.1) { kind = 'ground'; fov = 58; }
  return { kind, look, fov: clamp(fov, 17, 76), response: kind === 'impact' ? 24 : kind === 'action' ? 6 : 10 };
}
