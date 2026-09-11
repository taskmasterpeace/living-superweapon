// THE ARMORY — real weapons, real gear, and the sounds they make.
//
// Robert: "make standard weapons — 2 sniper rifles, 2 rifles, AK and M-16, etc, pistols, and get
// sounds for them all. And get night vision and motion detector — make all items they have in
// military or special ops missions: gear, tear gas, mustard gas, all military and spec ops and
// police. And we need superhero weapons — katana, claws, etc."
//
// ⚠ EVERYTHING HERE IS AN EXISTING ENGINE TYPE, NOT A NEW ONE. A firearm is a `rifle` ability with
// a `weapon` class; a blade is a `melee` ability with `dmgClass: 'slash'`; gas is a `payload` on a
// canister; a sight is an item. Nothing in this file needed a new branch in the combat pipeline,
// which is the whole test of whether a weapon system is data or a special case.
//
// ⚠ THE BALLISTIC SCALE ALREADY DECIDES WHAT THESE DO (manual §3): damage meets ARMOUR, then
// TOUGHNESS. That is why an AK is lethal to a person and an annoyance to TITAN without anyone
// writing a rule about it — and why `pierce` on the anti-materiel rifle is the interesting stat
// rather than raw damage.
//
// ⚠ SOUND IS SYNTHESIZED, AND THAT IS A DECISION. The CC0 sample library has no true gunfire
// (documented in the sample-bank notes), so every firearm here carries a VOICE PROFILE instead —
// calibre, action, barrel, and the room slap — and audio.gunshot builds the report from it. A
// generic "bang.ogg" on twelve weapons would be worse than the synth, because the whole point of
// having twelve is that you can hear which one is shooting at you.

// -------------------------------------------------------------------------------------------------
// VOICE PROFILES. `crack` is the supersonic transient (brightness), `body` the chest thump in Hz,
// `tail` the room slap in seconds, `mech` the action noise (bolt, blowback, cylinder). These are
// relative to each other, not absolute physics — what matters is that no two are confusable.
export const VOICES = {
  //                     crack  body  tail  mech   character
  pistol9:   { crack: 0.72, body: 150, tail: 0.16, mech: 0.30 },  // flat, snappy, small room
  magnum:    { crack: 0.95, body: 110, tail: 0.30, mech: 0.22 },  // deep, loud, long slap
  smg9:      { crack: 0.62, body: 165, tail: 0.11, mech: 0.42 },  // buzzy, mechanical, close
  ar556:     { crack: 1.00, body: 138, tail: 0.20, mech: 0.26 },  // sharp, high, cracking
  ak762:     { crack: 0.86, body: 104, tail: 0.26, mech: 0.40 },  // lower, heavier, clattery
  battle762: { crack: 0.92, body:  96, tail: 0.30, mech: 0.30 },  // a full-power rifle
  sniper762: { crack: 1.05, body:  88, tail: 0.42, mech: 0.55 },  // one shot, long bolt, big echo
  amr50:     { crack: 1.15, body:  58, tail: 0.62, mech: 0.62 },  // the anti-materiel boom
  shotgun12: { crack: 0.55, body:  74, tail: 0.28, mech: 0.58 },  // dull roar and a pump
  lmg762:    { crack: 0.88, body:  98, tail: 0.24, mech: 0.50 },  // sustained, belt clatter
  supp:      { crack: 0.24, body: 190, tail: 0.06, mech: 0.72 },  // suppressed: mostly action
};

// -------------------------------------------------------------------------------------------------
// FIREARMS. `ab` is the ability this becomes — dropped in as-is, so a weapon IS its stat block.
// `prof` follows weaponProficiency: soldiers shoot better, STR-10 bruisers shoot worse.
export const FIREARMS = [
  // ---- SNIPERS (two, as asked: a bolt rifle and an anti-materiel gun)
  { id: 'm24', n: 'M24 MARKSMAN RIFLE', cls: 'sniper', voice: 'sniper762', mesh: 'sniper',
    d: 'Bolt-action 7.62. One shot, one long second to work the bolt, and almost no spread.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'M24 Marksman Rifle', gear: true, cost: 0, magazine: 5, reserveAmmo: 35, reloadTime: 2.7, scopeZoom: 4,
          interval: 1.35, damage: 46, speed: 340, spread: 0.004, radius: 0.55, blast: 0, recoil: 3.4,
          color: '#ffe08a', color2: '#fff' } },
  { id: 'm107', n: 'M107 ANTI-MATERIEL', cls: 'sniper', voice: 'amr50', mesh: 'sniper',
    d: '.50 calibre. It is not built for people — it is built for what people hide behind. Defeats armour.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'M107 Anti-Materiel', gear: true, cost: 0, magazine: 10, reserveAmmo: 30, reloadTime: 3.6, scopeZoom: 5,
          interval: 2.1, damage: 78, pierce: 9, speed: 420, spread: 0.006, radius: 0.9, blast: 1.6,
          recoil: 6.5, color: '#fff0c0', color2: '#fff' } },

  // ---- RIFLES (AK and M16 by name, plus the two that round the class out)
  { id: 'ak', n: 'AK PATTERN RIFLE', cls: 'rifle', voice: 'ak762', mesh: 'rifle',
    d: '7.62 short. Hits harder than the M16 and wanders more doing it. Never jams.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'AK Pattern Rifle', gear: true, cost: 0, magazine: 30, reserveAmmo: 150, reloadTime: 2.5,
          interval: 0.10, damage: 8.5, speed: 190, spread: 0.032, radius: 0.5, blast: 2, recoil: 2.2,
          color: '#ffcf7a', color2: '#fff' } },
  { id: 'm16', n: 'M16 RIFLE', cls: 'rifle', voice: 'ar556', mesh: 'rifle',
    d: '5.56. Lighter round, faster cycle, and it goes where you point it.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'M16 Rifle', gear: true, cost: 0, magazine: 30, reserveAmmo: 180, reloadTime: 2.2,
          interval: 0.075, damage: 6.2, speed: 215, spread: 0.016, radius: 0.45, blast: 1.8, recoil: 1.5,
          color: '#ffe08a', color2: '#fff' } },
  { id: 'kuchler', n: 'KUCHLER MK I', cls: 'rifle', voice: 'ar556', mesh: 'rifle', equipmentAsset: 'equipment.kuchler-rifle@2',
    d: 'Fictional compact rifle from War World: Earth. Thirty rounds, a detachable magazine, and standard service-rifle handling.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'Kuchler Mk I', gear: true, cost: 0, magazine: 30, reserveAmmo: 180, reloadTime: 2.2,
          interval: 0.075, damage: 6.2, speed: 215, spread: 0.016, radius: 0.45, blast: 1.8, recoil: 1.5,
          color: '#ffe08a', color2: '#fff' } },
  { id: 'battle', n: 'BATTLE RIFLE', cls: 'rifle', voice: 'battle762', mesh: 'rifle',
    d: 'Full-power 7.62 in a semi-automatic. Fewer shots that matter more.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'Battle Rifle', gear: true, cost: 0, magazine: 20, reserveAmmo: 100, reloadTime: 2.6, scopeZoom: 2,
          interval: 0.26, damage: 16, speed: 240, spread: 0.012, radius: 0.5, blast: 2, recoil: 3.0,
          color: '#ffd898', color2: '#fff' } },
  { id: 'saw', n: 'SQUAD AUTOMATIC', cls: 'lmg', voice: 'lmg762', mesh: 'rifle',
    d: 'Belt-fed. It does not out-damage a rifle per shot; it simply does not stop.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'Squad Automatic', gear: true, cost: 0, magazine: 100, reserveAmmo: 200, reloadTime: 4.6,
          interval: 0.065, damage: 7.4, speed: 200, spread: 0.055, radius: 0.5, blast: 2, recoil: 2.6,
          color: '#ffd24a', color2: '#fff' } },

  // ---- SUBMACHINE GUNS
  { id: 'mp5', n: 'MP5 SUBMACHINE GUN', cls: 'smg', voice: 'smg9', mesh: 'smg',
    d: '9mm, closed bolt, very controllable. Devastating in a corridor, useless across a plaza.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'MP5 Submachine Gun', gear: true, cost: 0, magazine: 30, reserveAmmo: 150, reloadTime: 2,
          interval: 0.055, damage: 4.4, speed: 150, spread: 0.030, life: 0.7, radius: 0.4, blast: 1.4,
          recoil: 1.0, color: '#ffe8b0', color2: '#fff' } },
  { id: 'pdw', n: 'SUPPRESSED PDW', cls: 'smg', voice: 'supp', mesh: 'smg', quiet: true,
    d: 'Subsonic and suppressed. Half the noise radius — the block does not hear you working.',
    ab: { type: 'rifle', weapon: 'rifle', name: 'Suppressed PDW', gear: true, cost: 0, magazine: 30, reserveAmmo: 150, reloadTime: 2,
          interval: 0.075, damage: 4.0, speed: 130, spread: 0.022, life: 0.65, radius: 0.4, blast: 1.2,
          recoil: 0.7, quiet: 0.35, color: '#e8e0c8', color2: '#fff' } },

  // ---- SHOTGUNS
  { id: 'pump', n: 'COMBAT SHOTGUN', cls: 'shotgun', voice: 'shotgun12', mesh: 'shotgun',
    d: '12 gauge, eight pellets, and a short life on every one — the falloff is physical, not a curve.',
    ab: { type: 'rifle', weapon: 'shotgun', name: 'Combat Shotgun', gear: true, cost: 0, magazine: 8, reserveAmmo: 40, reloadTime: 3.8,
          interval: 0.72, damage: 8.5, pellets: 8, speed: 150, life: 0.42, radius: 0.7, blast: 2.4,
          recoil: 5.2, color: '#ffd24a', color2: '#fff' } },
  { id: 'auto12', n: 'AUTO SHOTGUN', cls: 'shotgun', voice: 'shotgun12', mesh: 'shotgun',
    d: 'Six pellets a shell and no pump. Empties fast, and everything in front of it knows.',
    ab: { type: 'rifle', weapon: 'shotgun', name: 'Auto Shotgun', gear: true, cost: 0, magazine: 12, reserveAmmo: 48, reloadTime: 3.1,
          interval: 0.30, damage: 6.0, pellets: 6, speed: 145, life: 0.40, radius: 0.65, blast: 2.2,
          recoil: 3.4, color: '#ffc86a', color2: '#fff' } },

  // ---- PISTOLS
  { id: 'p9', n: '9MM SIDEARM', cls: 'pistol', voice: 'pistol9', mesh: 'pistol', oneHand: true,
    d: 'What everyone actually carries. Accurate, quiet-ish, and it will not stop anything armoured.',
    ab: { type: 'rifle', weapon: 'pistol', name: '9mm Sidearm', gear: true, oneHand: true, cost: 0, magazine: 15, reserveAmmo: 75, reloadTime: 1.6,
          interval: 0.22, damage: 7, speed: 165, spread: 0.014, radius: 0.45, blast: 1.4, recoil: 1.3,
          color: '#ffe8b0', color2: '#fff' } },
  { id: 'magnum', n: '.44 REVOLVER', cls: 'pistol', voice: 'magnum', mesh: 'pistol', oneHand: true,
    d: 'Six rounds that hit like a rifle, and a cylinder you have to think about.',
    ab: { type: 'rifle', weapon: 'pistol', name: '.44 Revolver', gear: true, oneHand: true, cost: 0, magazine: 6, reserveAmmo: 36, reloadTime: 2.8,
          interval: 0.55, damage: 21, speed: 185, spread: 0.018, radius: 0.55, blast: 1.8, recoil: 3.6,
          color: '#ffd24a', color2: '#fff' } },
  { id: 'machinepistol', n: 'MACHINE PISTOL', cls: 'pistol', voice: 'smg9', mesh: 'pistol', oneHand: true,
    d: 'A sidearm with the safety filed off. Spread like a hose past ten metres.',
    ab: { type: 'rifle', weapon: 'pistol', name: 'Machine Pistol', gear: true, oneHand: true, cost: 0, magazine: 20, reserveAmmo: 100, reloadTime: 1.8,
          interval: 0.05, damage: 3.6, speed: 140, spread: 0.055, life: 0.6, radius: 0.38, blast: 1.2,
          recoil: 1.1, color: '#ffe8b0', color2: '#fff' } },
];

// -------------------------------------------------------------------------------------------------
// BLADES AND FISTS — the superhero end. Every one is a `melee` ability with a real `dmgClass`, so
// the bleed system, the swing audio and the trifecta all apply with no new code.
// ⚠ `slash` is load-bearing: it is what opens WOUNDS (manual §12) and what makes the swing audio
// pick the metallic shing instead of the airy whoosh. A katana that did `physical` would be a bat.
export const BLADES = [
  { id: 'katana', n: 'KATANA', mesh: 'katana', hero: true,
    d: 'A long single edge. Reach and a deep cut — it wounds where a fist only bruises.',
    ab: { type: 'melee', name: 'Katana', gear: true, dmgClass: 'slash', dtype: 'physical',
          cost: 0, cd: 0.42, damage: 19, reach: 15, arc: 1.5, color: '#dfe8f0' } },
  { id: 'claws', n: 'CLAWS', mesh: 'claws', hero: true,
    d: 'Three edges on each hand. Fast, shallow, and they stack wounds faster than anything else.',
    ab: { type: 'melee', name: 'Claws', dmgClass: 'slash', dtype: 'physical',
          cost: 0, cd: 0.24, damage: 11, reach: 10, arc: 1.7, color: '#e8eef4' } },
  { id: 'knife', n: 'COMBAT KNIFE', mesh: 'knife', oneHand: true,
    d: 'Short, quiet, and always there. The weapon you have when the rifle is empty.',
    ab: { type: 'melee', name: 'Combat Knife', gear: true, oneHand: true, dmgClass: 'slash',
          dtype: 'physical', cost: 0, cd: 0.28, damage: 12, reach: 9, arc: 1.4, color: '#cfd8e0' } },
  { id: 'tomahawk', n: 'BREACHING TOMAHAWK', mesh: 'axe',
    d: 'A door tool that is also an axe. Heavy, slow, and it does not care about a guard.',
    ab: { type: 'melee', name: 'Breaching Tomahawk', gear: true, dmgClass: 'slash', dtype: 'physical',
          cost: 0, cd: 0.62, damage: 26, reach: 12, arc: 1.2, color: '#b8b0a4' } },
  { id: 'baton', n: 'RIOT BATON', mesh: 'baton', police: true,
    d: 'Not meant to kill. Meant to make somebody stop, and it staggers rather than cuts.',
    ab: { type: 'melee', name: 'Riot Baton', gear: true, oneHand: true, dtype: 'physical',
          cost: 0, cd: 0.34, damage: 9, reach: 10, arc: 1.5, stagger: 0.5, color: '#2a2e36' } },
  { id: 'nodachi', n: 'GREAT BLADE', mesh: 'katana', hero: true,
    d: 'Two hands, enormous reach, and a wind-up you can read from across the street.',
    ab: { type: 'melee', name: 'Great Blade', gear: true, dmgClass: 'slash', dtype: 'physical',
          cost: 0, cd: 0.78, damage: 34, reach: 19, arc: 1.35, color: '#eef4fa' } },
];

// -------------------------------------------------------------------------------------------------
// SPEC-OPS, MILITARY AND POLICE GEAR. Items, not abilities — carried on `def.items`, fired by X.
// ⚠ TWO GASES, AND THEY ARE DELIBERATELY DIFFERENT WEAPONS. Tear gas is a CONTROL tool: it blinds
// and it makes you cough, and it does almost no damage — which is what makes it police equipment
// rather than a weapon. Mustard is a BLISTER AGENT: it is slow, it does not blind, and it corrodes,
// so it is the thing you use on armour and the thing a war-crimes tribunal asks you about.
export const GEAR = [
  // ---- gas and grenades
  { id: 'teargas', n: 'CS GAS GRENADE', kind: 'gas', charges: 2, police: true,
    d: 'Blinds and doubles you over. Almost no damage — it is here to move people, not kill them.',
    payload: 'teargas', r: 16, dur: 9 },
  { id: 'mustard', n: 'MUSTARD CANISTER', kind: 'gas', charges: 1, banned: true,
    d: 'A blister agent. Slow, cruel, and it eats armour — the one thing a plated chassis fears.',
    payload: 'mustard', r: 14, dur: 12 },
  { id: 'smoke', n: 'SMOKE GRENADE', kind: 'gas', charges: 3,
    d: 'No damage at all. It takes away the one thing every shooter needs.',
    payload: 'smoke', r: 18, dur: 8 },
  { id: 'flashbang', n: 'FLASHBANG', kind: 'flashbang', charges: 2, police: true,
    d: 'Staggers, and wipes what a bot believed about where you were.' },
  { id: 'frag', n: 'FRAG GRENADE', kind: 'frag', charges: 2,
    d: 'The honest one. A canister, a fuse, and a radius.' },
  { id: 'breach', n: 'BREACHING CHARGE', kind: 'breach', charges: 2,
    d: 'Shaped, directional, and meant for a wall rather than a person.' },
  { id: 'claymore', n: 'DIRECTIONAL MINE', kind: 'mine', charges: 2,
    d: 'Faces one way. Placed well it wins a corridor; placed badly it does nothing at all.' },

  // ---- vision and sensors  (Robert: "night vision and motion detector")
  { id: 'nvg', n: 'NIGHT VISION GOGGLES', kind: 'vision', mode: 'night', dur: 30, charges: 3,
    d: 'Amplifies what little light there is. The night stops being cover — and a flashbang becomes far worse.' },
  { id: 'motion', n: 'MOTION DETECTOR', kind: 'vision', mode: 'motion', dur: 24, charges: 3,
    d: 'Pings anything MOVING, through walls. Stand still and it never sees you — which cuts both ways.' },
  { id: 'thermal', n: 'THERMAL SCOPE', kind: 'vision', mode: 'thermal', dur: 22, charges: 2,
    d: 'Bodies burn through the walls, and they leave a trail where they ran.' },

  // ---- kit
  { id: 'plate', n: 'BALLISTIC PLATE', kind: 'armor', charges: 1,
    d: 'An ablative pool that eats bullets first. Consumed by what it stops.' },
  { id: 'shield', n: 'RIOT SHIELD', kind: 'shieldpack', charges: 1, police: true,
    d: 'Frontal cover you carry. It is the reason a line of officers can walk forward.' },
  { id: 'ifak', n: 'TRAUMA KIT', kind: 'medkit', charges: 2,
    d: 'Stops a bleed and buys back some hull. It cannot regrow an arm.' },
  { id: 'rappel', n: 'RAPPEL LINE', kind: 'grapnel', charges: 3,
    d: 'A roof is a position. This is how a person without powers gets to one.' },
  { id: 'jammer', n: 'COMMS JAMMER', kind: 'jammer', charges: 1,
    d: 'Cuts squad radio — bots stop sharing what they have seen and fight on their own eyes.' },
  { id: 'beacon', n: 'EXTRACTION BEACON', kind: 'beacon', charges: 1,
    d: 'Plant it, and later be back at it from anywhere.' },
];

// -------------------------------------------------------------------------------------------------
// LOADOUTS — a weapon list is not a kit. These are the packages the world actually issues, so a
// spawner can ask for "SWAT" instead of assembling one from parts.
export const LOADOUTS = {
  patrol:   { n: 'PATROL OFFICER',   guns: ['p9'],              gear: ['baton', 'teargas'] },
  swat:     { n: 'TACTICAL UNIT',    guns: ['mp5', 'p9'],       gear: ['shield', 'flashbang', 'nvg'] },
  marksman: { n: 'POLICE MARKSMAN',  guns: ['m24', 'p9'],       gear: ['thermal'] },
  infantry: { n: 'LINE INFANTRY',    guns: ['m16'],             gear: ['frag', 'plate', 'nvg'] },
  insurgent:{ n: 'IRREGULAR',        guns: ['ak'],              gear: ['frag'] },
  specops:  { n: 'SPECIAL OPERATIONS', guns: ['pdw', 'p9'],     gear: ['nvg', 'motion', 'breach', 'ifak', 'rappel'] },
  sniper:   { n: 'DESIGNATED MARKSMAN', guns: ['m107', 'machinepistol'], gear: ['thermal', 'motion'] },
  heavy:    { n: 'SUPPORT GUNNER',   guns: ['saw'],             gear: ['plate'] },
  breacher: { n: 'BREACHER',         guns: ['pump'],            gear: ['breach', 'flashbang', 'shield'] },
};

// -------------------------------------------------------------------------------------------------
export const firearmById = (id) => FIREARMS.find((w) => w.id === id) || null;
export const bladeById = (id) => BLADES.find((w) => w.id === id) || null;
export const gearById = (id) => GEAR.find((g) => g.id === id) || null;
export const weaponById = (id) => firearmById(id) || bladeById(id);
export const voiceOf = (id) => { const w = firearmById(id); return (w && VOICES[w.voice]) || VOICES.ar556; };

// Everything, for the codex and the armoury screen.
export function armoryList() {
  return [
    ...FIREARMS.map((w) => ({ ...w, group: 'FIREARM' })),
    ...BLADES.map((w) => ({ ...w, group: 'CLOSE QUARTERS' })),
    ...GEAR.map((g) => ({ ...g, group: 'GEAR' })),
  ];
}

// Turn a loadout into something spawnable: abilities keyed to slots plus an items array.
// ⚠ Slots follow the engine's own names, so a loadout drops straight onto a def with no adapter.
export function buildLoadout(key) {
  const L = LOADOUTS[key];
  if (!L) return null;
  const abilities = {};
  const slots = ['lmb', 'rmb', 'q'];
  L.guns.forEach((gid, i) => { const w = firearmById(gid); if (w && slots[i]) abilities[slots[i]] = { ...w.ab }; });
  const items = [];
  for (const gid of L.gear) {
    const g = gearById(gid);
    if (!g) continue;
    const bl = bladeById(gid);
    if (bl) { abilities.e = { ...bl.ab }; continue; }
    items.push({ kind: g.kind, name: g.n, charges: g.charges || 1, mode: g.mode,
                 payload: g.payload, r: g.r, dur: g.dur });
  }
  // a blade listed in `gear` is an ability, not an item — resolve those too
  for (const gid of L.gear) { const bl = bladeById(gid); if (bl && !abilities.e) abilities.e = { ...bl.ab }; }
  return { name: L.n, abilities, items };
}
