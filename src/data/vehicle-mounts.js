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
