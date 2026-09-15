// VEHICLE MOUNTED WEAPONS — every armed mount is a DATA ROW keyed to the
// reference-fleet catalog id, fired through the game's own projectile system
// (never a bespoke damage path). Magnitudes are tunable proposals in engine
// units, same law as vehicle-envelopes.js.
//
// Fields: damage/blast/power/radius/speed/life feed spawnProjectile exactly;
// magazine = rounds between reloads · reserve = rounds carried · cycleS =
// seconds between shots inside a magazine · reloadS = magazine change ·
// recoil = presentation kick (barrel slide + hull nudge via recoilKick).
// bullet:true marks a BALLISTIC stream (armor-gated, no explosion) — a cannon
// shell without it explodes through areaDamage like every other blast.

export const VEHICLE_MOUNTS = {
  tank: {
    kind: 'cannon', label: 'MAIN GUN',
    damage: 58, blast: 8.5, power: 1.7, radius: .6, speed: 220, life: 3.5, kb: 26,
    magazine: 1, reserve: 20, cycleS: .25, reloadS: 3.6,
    recoil: 1.0, recoilKick: 2.6, sound: 'scout-gunshot', dtype: 'physical',
  },
  'drone-tank': {
    kind: 'cannon', label: 'AUTOCANNON',
    damage: 16, blast: 2.2, power: .9, radius: .35, speed: 250, life: 2.6, kb: 8,
    magazine: 4, reserve: 48, cycleS: .5, reloadS: 2.8,
    recoil: .35, recoilKick: .8, sound: 'scout-gunshot', dtype: 'physical',
  },
  helicopter: {
    kind: 'rotary', label: 'CHIN GUN',
    damage: 6, blast: .6, radius: .3, speed: 270, life: 2.0, kb: 2,
    magazine: 40, reserve: 360, cycleS: .09, reloadS: 2.6,
    recoil: .05, recoilKick: 0, sound: 'scout-gunshot', dtype: 'ballistic', bullet: true,
  },
};

export function mountFor(id) { return VEHICLE_MOUNTS[id] || null; }

// ---- HULLS — every fleet vehicle is a finite-volume damage receiver --------
// hp scales are proposals on the city cover formula's order of magnitude.
// `disabledAt` is the hull fraction below which the drivetrain limps.
export const VEHICLE_HULLS = {
  tank: { hp: 420 }, 'drone-tank': { hp: 300 }, 'aa-tank': { hp: 340 },
  motorcycle: { hp: 70 }, atv: { hp: 90 }, humvee: { hp: 190 }, 'armored-scout': { hp: 180 },
  'cargo-transport': { hp: 240 }, 'mobile-fabricator': { hp: 260 },
  helicopter: { hp: 170 }, 'transport-helicopter': { hp: 210 },
  'jet-a': { hp: 140 }, 'jet-b': { hp: 130 }, 'jet-c': { hp: 150 }, 'stealth-jet': { hp: 130 },
  'mech-light': { hp: 320 }, 'mech-medium': { hp: 460 }, 'mech-heavy': { hp: 640 },
};
const CLASS_HULL = { tracked: 380, mech: 400, wheeled: 150, hover: 140, rotor: 180, fixedwing: 150, ship: 2400 };
export function hullFor(actor) {
  const row = VEHICLE_HULLS[actor?.id];
  return { hp: row?.hp ?? CLASS_HULL[actor?.cls] ?? 160, disabledAt: row?.disabledAt ?? .25 };
}
