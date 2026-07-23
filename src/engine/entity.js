// Living Superweapon — Fighter: articulated figure, stats, physics, flight, combat, ability state.
import * as THREE from 'three';
import { clamp, damp, TAU, lerp } from '../core/util.js';
import { ARENA } from './world.js';
import { Ragdoll } from './ragdoll.js';
import { buildTentacles } from './tentacles.js';
import { bakeSheet } from '../data/ranks.js';

// power tiers (Super-Saiyan-style): level 1–3 = I, 4–6 = II, 7–9 = III, 10 = MAX
export function tierOf(level) { return level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1; }
export const TIER_COLORS = ['#ffffff', null, '#ffd24a', '#ffedb0', '#ffffff'];   // [tier] — null = hero accent

let _fid = 1;
const _anchor = new THREE.Vector3();
// flight tuning — levitation model: hold to rise, release to HOVER, descend key to sink.
const FLY_RISE = 30, FLY_SINK = 26, FLY_TAKEOFF = 15, FLY_HOVER_BOB = 3.2;

// ---- weapon models — one registry, every archetype: mounts on the DRIVEN fist meshes so
// poses and the ragdoll carry them. Built along the arm's -Y axis (same convention as the rifle).
function buildWeapon(kind, m) {
  const g = new THREE.Group();
  const add = (mesh, x, y, z, rx = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.x = rx; mesh.rotation.z = rz; g.add(mesh); return mesh; };
  switch (kind) {
    case 'pistol':
      add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.55, 0.5), m.armor), 0, -0.15, 0.1);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.3), m.armor), 0, -0.6, 0.28);
      break;
    case 'shotgun': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 8), m.armor), -0.14, -1.1, 0.14);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 8), m.armor), 0.14, -1.1, 0.14);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), m.armor), 0, 0.25, 0.1);
      break;
    }
    case 'sword': {
      const blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 0.5), m.visorMat), 0, -2.1, 0.16);
      blade.scale.z = 1; add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.62), m.armor), 0, -0.55, 0.16);   // guard
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), m.armor), 0, -0.25, 0.16);              // grip
      break;
    }
    case 'knife':
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.36), m.visorMat), 0, -0.95, 0.16);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), m.armor), 0, -0.3, 0.16);
      break;
    case 'spear': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), m.armor), 0, -1.4, 0.16);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), m.visorMat), 0, -3.9, 0.16, Math.PI);
      break;
    }
    case 'axe': {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), m.armor), 0, -1.2, 0.16);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.16), m.visorMat), -0.6, -2.6, 0.16, 0, 0.2);   // twin heads
      add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.16), m.visorMat), 0.6, -2.6, 0.16, 0, -0.2);
      break;
    }
    case 'bow': {
      // vertical arc + string — held out in the off hand; the draw pose does the rest
      const arc = add(new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.09, 6, 20, Math.PI * 1.16), m.armor), 0, -0.6, 0.2);
      arc.rotation.z = Math.PI * 0.92;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.1, 4), m.armor), 0.42, -0.6, 0.2);   // string
      break;
    }
    case 'rifle':
      add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.0, 0.34), m.armor), 0, -1.15, 0.16);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.62), m.armor), 0, -0.3, 0.12);
      break;
  }
  return g;
}

// per-hero silhouette flourishes (all mounted on driven meshes so the ragdoll carries them).
const BUILDS = {
  sol: { pauldron: 1, gaunt: 1 }, kano: { band: 1, gaunt: 1 }, vega: { pauldron: 1, gaunt: 1, collar: 1 },
  aurum: { collar: 1, gaunt: 1 }, nova: { helmet: 1, visor: 1, pauldron: 1 }, rime: { crest: 1, collar: 1 },
  volt: { crest: 1, gaunt: 1 }, warden: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 }, hive: { crest: 1, pauldron: 1 },
  pyre: { crest: 1, gaunt: 1 }, torch: { crest: 1 }, apex: { crest: 1, pauldron: 1 },
  specter: { helmet: 1, visor: 1, collar: 1 }, vanguard: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 },
  kraken: { crest: 1, collar: 1 },                                     // + tentacles from def.tentacles
  rift: { helmet: 1, visor: 1, collar: 1 },
  titan: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1, gun: 1 },       // pulse rifle in the right fist
  sarge: { band: 1, gaunt: 1, gun: 1, weaponL: 'sword', shield: 1 },   // rifle + plasma SWORD + riot shield
  gale: { band: 1, weaponL: 'bow', weaponR: 'knife' },                 // the ranger: bow out, knife ready
  stefanos: { collar: 1, gaunt: 1 },                                   // presidential suit lines
  sandra: { band: 1, weaponL: 'pistol', weaponR: 'pistol' },           // the Jackal: a pistol in each hand
  // the thirty
  ironclad: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 }, rage: { band: 1 }, stormcall: { helmet: 1, pauldron: 2, gaunt: 1, weaponR: 'axe' },
  webline: { band: 1 }, ripclaw: { helmet: 1, gaunt: 1 }, majesty: { band: 1, pauldron: 1, gaunt: 1 },
  mystward: { collar: 1, band: 1 }, onyx: { helmet: 1, visor: 1, collar: 1 }, chainfire: { crest: 1, gaunt: 1 }, tempest: { crest: 1, collar: 1 },
  knightfall: { helmet: 1, visor: 1, collar: 1, gaunt: 1 }, aegis: { band: 1, pauldron: 1, gaunt: 1, weaponL: 'sword', shield: 1 },
  olympus: { collar: 1, gaunt: 1 }, marshal: { collar: 1 }, circuit: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1, gun: 1 },
  trench: { crest: 1, pauldron: 1, weaponR: 'spear' }, decibel: { band: 1 }, coldsnap: { helmet: 1, visor: 1, gun: 1 },
  foundry: { helmet: 1, pauldron: 2, gaunt: 1, weaponR: 'axe' }, talon: { band: 1, weaponL: 'knife', weaponR: 'knife' },
  abeo: { helmet: 1, pauldron: 2, gaunt: 1 }, jelani: { band: 1, gaunt: 1 }, kamaria: { collar: 1, band: 1 },
  ramiro: { band: 1, weaponR: 'shotgun', shield: 1 }, jawah: { collar: 1 }, moses: { crest: 1, gaunt: 1 },
  dune: { collar: 1, band: 1 }, graven: { helmet: 1, visor: 1, collar: 1 }, bulwark: { helmet: 1, pauldron: 2, gaunt: 1, shield: 1 }, feral: { crest: 1, gaunt: 1 },
};

function figure(def) {
  const c = def.colors || def;
  const b = def.build || BUILDS[def.id] || {};   // ORIGIN customs carry their own frame
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';   // yaw → pitch → roll, so flight pitch/bank happen along the FACING axis
  const skin = c.skin || '#e8c39a';
  const metal = !!def.metal;   // robot archetype — chromed plating instead of cloth
  const suit = new THREE.MeshStandardMaterial({ color: c.primary, roughness: metal ? 0.28 : 0.48, metalness: metal ? 0.85 : 0.18, emissive: c.primary, emissiveIntensity: 0.05 });
  const suit2 = new THREE.MeshStandardMaterial({ color: c.secondary, roughness: metal ? 0.32 : 0.5, metalness: metal ? 0.9 : 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: metal ? c.secondary : skin, roughness: metal ? 0.3 : 0.7, metalness: metal ? 0.8 : 0 });
  const glow = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 1.6, roughness: 0.4 });
  const armor = new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.34, metalness: 0.62 });
  const visorMat = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.2 });

  // soft contact shadow (grounds the figure; repositioned every frame)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; shadow.renderOrder = 1; g.add(shadow);

  // torso (chest taper) + neck + collar
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.2, 6, 12), suit);
  torso.position.y = 5.2; torso.castShadow = true; g.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.0, 10), skinMat);
  neck.position.set(0, 2.0, 0); torso.add(neck);
  if (b.collar) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.02, 1.2, 14, 1, true, -1.05, 2.1), armor);
    col.material.side = THREE.DoubleSide; col.position.set(0, 1.9, -0.15); torso.add(col);
  }
  // chest emblem
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), glow);
  emblem.position.set(0, 5.7, 1.5); g.add(emblem);
  // pelvis + glowing belt
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 0.8, 4, 10), suit2);
  pelvis.position.y = 3.2; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.16, 8, 16), glow.clone());
  belt.material.emissiveIntensity = 0.5; belt.rotation.x = Math.PI / 2; belt.position.y = 0.35; pelvis.add(belt);

  // head + jaw
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 14), skinMat);
  head.position.y = 8.0; head.castShadow = true; g.add(head);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.86, 12, 10), skinMat);
  jaw.position.set(0, -0.42, 0.32); jaw.scale.set(1, 0.72, 0.92); head.add(jaw);
  // hair/cowl (child of g; ragdoll pins it to the head)
  const cowl = new THREE.Mesh(new THREE.SphereGeometry(1.22, 16, 12, 0, TAU, 0, Math.PI * 0.62), suit2);
  cowl.position.y = 8.15; g.add(cowl);
  if (b.helmet) { cowl.visible = false; const hel = new THREE.Mesh(new THREE.SphereGeometry(1.3, 18, 12, 0, TAU, 0, Math.PI * 0.66), armor); hel.position.y = 0.1; head.add(hel); }
  if (b.crest) {                                   // fin / flame / antenna
    const cr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 4), glow.clone()); cr.material.emissiveIntensity = 0.85; cr.position.set(0, 1.15, -0.1); head.add(cr);
    const cr2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 4), cr.material); cr2.position.set(0, 0.9, -0.7); head.add(cr2);
  }
  if (b.band) { const bd = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.14, 8, 18), new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.55, metalness: 0.2 })); bd.rotation.x = Math.PI / 2; bd.position.y = 0.32; head.add(bd); }
  if (b.visor) { const vis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.42), visorMat); vis.position.set(0, 0.12, 0.92); head.add(vis); }
  // eyes (children of head; hidden behind a visor)
  const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: c.accent });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.42, 0.05, 1.0); head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.42, 0.05, 1.0); head.add(eyeR);
  if (b.visor) { eyeL.visible = false; eyeR.visible = false; }

  // arms — pivot groups; children[0]=upper,[1]=fore,[2]=fist (indices are a ragdoll contract).
  const mkArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.7, 6.6, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.5, 4, 8), suit);
    upper.position.y = -1.05; upper.castShadow = true; pivot.add(upper);
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.66, 10, 8), suit); delt.position.y = 0.35; upper.add(delt);   // deltoid cap
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.5, 4, 8), skinMat);
    fore.position.y = -2.85; pivot.add(fore);
    const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 0), glow.clone());   // faceted glove
    fist.material.emissiveIntensity = 0.0; fist.position.y = -3.85; pivot.add(fist);
    if (b.pauldron) {
      const pa = new THREE.Mesh(new THREE.SphereGeometry(0.98, 12, 10, 0, TAU, 0, Math.PI * 0.62), armor); pa.scale.set(1.15, 0.8, 1.15); pa.position.y = 0.55; upper.add(pa);
      if (b.pauldron > 1) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 6), armor); sp.position.set(side * 0.55, 0.95, 0); sp.rotation.z = -side * 0.5; upper.add(sp); }
    }
    if (b.gaunt) { const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.5, 1.05, 10), armor); gl.position.y = -0.15; fore.add(gl); const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 6, 12), glow.clone()); band.material.emissiveIntensity = 0.6; band.rotation.x = Math.PI / 2; band.position.y = 0.55; fore.add(band); }
    // gear — mounted on the DRIVEN fist/fore meshes so poses and the ragdoll carry them
    if (b.gun && side === 1) {
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.0, 0.34), armor); barrel.position.set(0, -1.15, 0.16); fist.add(barrel);
      const gbody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.62), armor); gbody.position.set(0, -0.3, 0.12); fist.add(gbody);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glow.clone()); tip.material.emissiveIntensity = 1.5; tip.position.set(0, -2.15, 0.16); fist.add(tip);
    }
    if (b.blade && side === -1) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.56), visorMat); bl.position.set(0, -1.7, 0.18); fist.add(bl);
    }
    if (b.shield && side === -1) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.22, 18), armor); sh.rotation.x = Math.PI / 2; sh.position.set(-0.35, -0.3, 0.55); fore.add(sh);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), glow.clone()); boss.material.emissiveIntensity = 0.7; boss.position.set(0, 0.2, 0); sh.add(boss);
    }
    const wk = side === -1 ? b.weaponL : b.weaponR;   // any registry weapon in either hand
    if (wk) fist.add(buildWeapon(wk, { armor, glow, visorMat }));
    g.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // legs — two-bone with a KNEE. pivot(hip) → [thigh, knee]; knee → [shin, kneecap, boot].
  // Parts exposed on pivot.userData so the ragdoll drives thigh (hip→knee), shin (knee→ankle) & boot by name.
  // _animate swings the hip (pivot.rotation.x) and flexes the knee (knee.rotation.x) for a real gait.
  const mkLeg = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.7, 3.0, 0);          // hip joint
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.5, 4, 8), suit2);
    thigh.position.y = -0.95; thigh.castShadow = true; pivot.add(thigh);              // hip → knee
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), suit2); hipCap.position.y = 0.85; thigh.add(hipCap);
    const knee = new THREE.Group(); knee.position.y = -1.9; pivot.add(knee);          // knee joint
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.3, 4, 8), suit2);
    shin.position.y = -0.85; shin.castShadow = true; knee.add(shin);                  // knee → ankle
    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), suit2); kneeCap.position.y = 0.05; knee.add(kneeCap);
    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 0.7, 4, 8), glow.clone());
    boot.material.emissiveIntensity = 0.3; boot.position.set(0, -1.85, 0.2); knee.add(boot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), boot.material); toe.position.set(0, -0.15, 0.62); toe.scale.set(1, 0.7, 1.35); boot.add(toe);
    pivot.userData = { thigh, knee, shin, boot };
    g.add(pivot); return pivot;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // cape (optional)
  let cape = null;
  if (c.cape) {
    cape = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2, 1, 4), new THREE.MeshStandardMaterial({ color: c.cape, roughness: 0.6, side: THREE.DoubleSide, metalness: 0.1 }));
    cape.position.set(0, 5.0, -1.4); cape.castShadow = true; g.add(cape);
  }

  // aura (additive shell, scales with power)
  const aura = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 16), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.position.y = 5.0; aura.scale.set(1, 1.7, 1); g.add(aura);

  // guard arc — a visible energy shield in front while blocking (full ring for 'barrier' guards).
  // Reads state at a glance: bright = fresh guard, red = about to break, flash = just blocked a hit.
  const barrier = def.guardType === 'barrier';
  const guardArc = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 4.2, 6.2, 24, 1, true, barrier ? 0 : -0.85, barrier ? TAU : 1.7),
    new THREE.MeshBasicMaterial({ color: def.guardType === 'deflect' ? '#ffd24a' : '#bfe0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  guardArc.position.y = 5.4; g.add(guardArc);

  // frost shell — appears when frozen solid
  const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(4.6, 1), new THREE.MeshStandardMaterial({ color: '#bfeaff', transparent: true, opacity: 0, roughness: 0.15, metalness: 0.1, emissive: '#4fb8e6', emissiveIntensity: 0.15 }));
  ice.position.y = 5.2; ice.scale.set(1, 1.5, 1); ice.visible = false; g.add(ice);

  return { g, torso, head, pelvis, cowl, emblem, aura, cape, armL, armR, legL, legR, eyeL, eyeR, shadow, guardArc, ice, mats: { suit, suit2, glow } };
}

export class Fighter {
  constructor(def, opts = {}) {
    this.id = _fid++;
    this.def = def;
    this.name = def.name;
    this.team = opts.team ?? 1;
    this.isPlayer = !!opts.isPlayer;
    this.isDummy = !!opts.dummy;

    this.parts = figure(def);
    this.obj = this.parts.g;
    this.pos = this.obj.position;
    this.pos.set(opts.x || 0, 0, opts.z || 0);
    this.spawn = this.pos.clone();
    this.vel = new THREE.Vector3();
    this.facing = 0;            // radians around Y (body orientation)
    this.aim = new THREE.Vector3(1, 0, 0); // world dir on XZ (facing)
    this.aim3 = new THREE.Vector3(1, 0, 0); // full 3D attack direction (adjusts up/down for height)

    this.maxHp = def.hp || 100; this.hp = this.maxHp;
    this.maxKi = def.ki || 100; this.ki = def.energyInfinite ? (def.ki || 100) : this.maxKi * 0.5;
    this.speed = def.speed || 30;
    this.radius = 2.2;

    this.state = 'idle';       // idle|move|cast|hit|ko|charge
    this.stateT = 0;
    this.hitstop = 0;
    this.hitFlash = 0;
    this.castPose = 0;         // 0..1 arms-forward blend
    this.punchPose = 0;
    this.koT = 0;
    this.invuln = 0;
    this.powerBuff = 1;        // damage/speed multiplier (levelMult × active transform)
    this.buffT = 0; this.buffName = '';
    // --- progression / scoring (gamified combat) ---
    this.level = 1; this.xp = 0; this.xpNext = 100; this.levelMult = 1;
    this.score = 0; this.kills = 0; this.streak = 0;
    this.lastHitBy = null; this.lastHitT = 99; this.lastKillT = 99;
    this.flyHeld = false;       // ascend intent (SPACE / pad ✕ held)
    this.descendHeld = false;   // descend intent (Ctrl / pad held)
    this.flying = false;        // levitation mode — gravity suspended, you hover
    this._flyPrev = false;      // rising-edge detector for take-off
    this.onBlock = false;
    this.animT = Math.random() * 10;

    // per-slot ability runtime state
    this.slots = {};
    for (const k in def.abilities) this.slots[k] = { def: def.abilities[k], cd: 0, charging: false, chargeT: 0, active: null, sustainT: 0 };
    this.globalCast = 0; // small global cast lockout

    // --- melee trifecta state (Strike / Guard / Grab) ---
    this.guarding = false; this.guardMeter = 1; this.staggerT = 0; this._blocked = 0;
    this.grabbing = null; this.grabbedBy = null; this.grabState = null; this.grabT = 0; this.grabMode = '';
    this.strikeIdx = 0; this.strikeActive = 0; this.strikeCd = 0; this.comboWin = 0; this.strikeHit = null;
    this.phase = false;                 // energy-intangible
    this.poseStrike = 0; this.poseGuard = 0; this.poseGrab = 0;
    // AI reaction state (must start at 0, not undefined — guard/counter logic compares <= 0)
    this._forceBeamT = 0; this._forceBeam = null; this._forceBeamActive = false; this._counterCd = 0; this._meleeCd = 0; this._guardT = 0; this._aiCharge = 0;
    // double-tap evade + energy-drained state
    this.evadeCd = 0; this.sprintT = 0; this.sprintMult = 1.6; this._slideT = 0; this.drainedT = 0;
    this.burstT = 0;            // dash-burst window — move() doesn't clamp velocity back to walk speed
    this._sprintThrough = false; this._sprintLightning = false;   // VOLT: run through cover, blue lightning wake
    // slam physics: launchT > 0 = recently knocked/thrown → wall/ground impacts hurt (dashing into walls doesn't)
    this.launchT = 0; this._slamCd = 0;
    this.metal = !!def.metal;   // robot: sparks when hit, foot exhaust, sturdier vs knockback
    this.tier = 1;              // power tier (from level) — drives aura color + HUD meter size
    this.tentacles = null;      // built lazily on first update (needs the scene)
    // strength (1–10, default 5): melee damage up, knockback/beam-shove down, faster freeze break-outs
    this.strength = def.strength ?? 5;
    // the SHEET — seven ranked attributes + talents baked to flat multipliers (data/ranks.js).
    // This is the D&D layer: FGT/AGL/MGT/VIG/INT/AWR/RES all do real engine work.
    this.sheet = bakeSheet(def);
    this.attrs = this.sheet.attrs;
    this._shieldHp = 0; this._jetT = 0; this._jetPrev = 0;   // gadget states (shield cell / jump jets)
    // flight expertise: 0 = grounded (leapers) · 1 = clumsy forward flier (can't hover — Greatest
    // American Hero) · 2 = levitator (hover + reposition, no cruise speed) · 3 = full flight (Superman)
    this.flightTier = def.flightTier ?? 3;
    this.energyInfinite = !!def.energyInfinite;   // android core: ki never drains — but tier caps at II
    this.meleeCharge = 0;       // charged-melee wind-up (melee.js) — >0 while holding the punch
    this._heavyT = 0; this._heavyP = 0; this._heavyHay = false;
    this.frost = 0; this.frozenT = 0; this._frostImmuneT = 0;   // cold buildup → encased in ice
    this._dots = [];            // damage-over-time stacks [{dps,t,color,kind,src}]
    this._quiverIdx = 0;        // archer payload selector (quiver ability cycles it)
    // ITEMS — gadgets a character CARRIES, outside the ability slots: no ki, cooldown-only,
    // one button (X). First kind: the teleport beacon (drop → fight elsewhere → recall to it).
    this.items = (def.items || []).map(d => ({ def: d, state: 'ready', cd: 0, pos: null, mesh: null, charges: d.charges ?? 1 }));
    // per-character trifecta traits
    this.thorns = def.thorns || 0;                                   // damages whoever holds you
    this.canPhase = !!def.phase;                                     // can spend energy to go intangible
    this.grabHeal = def.grabHeal || 0;                              // lifesteal on your throws
    this.teleEscape = def.teleEscape || Object.values(def.abilities || {}).some(a => a.type === 'teleport'); // blinks out of grabs
  }

  get grounded() { return (this.pos.y <= 0.01 || this.onBlock) && !this.flying; }
  get alive() { return this.state !== 'ko'; }

  // F key: flight is a MODE you switch on and off, not a button you hold.
  toggleFlight() {
    if (this.state === 'ko' || this.grabbedBy || this.frozenT > 0) return;
    if (this.flying) { this.flying = false; }                       // cut it — gravity takes you down
    else if (this.flightTier > 0) {
      this.flying = true;
      if (this.pos.y < 1.5) this.vel.y = 15;                        // pop off the ground
      this._liftFx = 0.25;
      if (this._game) { try { this._game.audio.zap(560); } catch (e) {} }
    } else if (this._game && this._game.isHuman(this) && this._game.hud) {
      this._game.hud.feed(this.name + ' cannot fly', '#8b8577');    // leapers stay honest
    }
  }

  faceDir(dx, dz) { if (dx * dx + dz * dz > 1e-4) { this.facing = Math.atan2(dx, dz); this.aim.set(dx, 0, dz).normalize(); } }
  center(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + 5.2, this.pos.z); }

  muzzle(out = new THREE.Vector3(), fwd = 3.4, h = 5.8) {
    return out.set(this.pos.x + this.aim.x * fwd, this.pos.y + h, this.pos.z + this.aim.z * fwd);
  }

  // Free all scene-level extras (tentacles, deployed items, planted mines). Call when the fighter leaves play.
  dispose() {
    if (this.tentacles) { for (const t of this.tentacles) t.dispose(); this.tentacles = null; }
    for (const k in this.slots) {
      const st = this.slots[k];
      if (st.list) { for (const m of st.list) if (m.mesh && m.mesh.parent) { m.mesh.parent.remove(m.mesh); m.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); } st.list.length = 0; }
    }
    for (const it of this.items) if (it.mesh) {
      it.mesh.parent && it.mesh.parent.remove(it.mesh);
      it.mesh.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
      it.mesh = null; it.state = 'ready'; it.pos = null;
    }
  }

  // ---- status: damage-over-time (poison/burn/gas arrows & clouds) ----
  addDot(o) {
    if (this.state === 'ko' || this.invuln > 0) return;
    const same = this._dots.find(d => d.kind === o.kind);
    if (same) { same.t = Math.max(same.t, o.dur || 3); same.dps = Math.max(same.dps, o.dps || 4); same.src = o.src || same.src; }
    else this._dots.push({ dps: o.dps || 4, t: o.dur || 3, color: o.color || '#8fe08a', kind: o.kind || 'poison', src: o.src || null });
  }

  // ---- status: frost buildup → ENCASED IN ICE. Strength melts out faster; fire heroes resist;
  // blink heroes spend ki to teleport out the instant it lands. A heavy hit shatters it early (bonus dmg).
  addFrost(amt, src) {
    if (this.state === 'ko' || this.frozenT > 0 || this._frostImmuneT > 0 || this.invuln > 0) return;
    this.frost = clamp(this.frost + amt * (this.def.frostResist ? 0.45 : 1), 0, 1);
    if (this.frost >= 1) {
      this.frost = 0;
      if (this.teleEscape && this.ki >= 20) {           // magic/blink types slip out instantly
        this.ki -= 20;
        if (this._game) { this._game.afterimage(this); this._game.audio.teleport(); }
        this.pos.x -= this.aim.x * 18; this.pos.z -= this.aim.z * 18; this.invuln = 0.4; this._frostImmuneT = 2;
        return;
      }
      // freeze duration: strength melts it — STR 10 ≈ 0.9s, STR 1 ≈ 2.4s
      this.frozenT = clamp(2.6 - this.strength * 0.17, 0.8, 2.6);
      if (src && src !== this) { this.lastHitBy = src; this.lastHitT = 0; }
      this.guarding = false; this.meleeCharge = 0; this.strikeActive = 0;
      this.flyHeld = false; this.descendHeld = false;
      if (this._game) {
        this._game.audio.zap(180);
        this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 16, speed: 14, life: 0.5, size: 2.6, color: ['#bfeaff', '#eaffff', '#fff'], up: 4, drag: 1.5 });
        if (this._game.hud && this._game.isHuman(this)) this._game.hud.damageNumber(this.pos, 'FROZEN', '#bfeaff', true);
      }
    }
  }
  _thaw(shattered) {
    if (this.frozenT <= 0) return;
    this.frozenT = 0; this._frostImmuneT = 2.5; this.invuln = Math.max(this.invuln, 0.4);
    if (this._game) {
      this._game.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: shattered ? 26 : 14, speed: shattered ? 26 : 14, life: 0.6, size: 3, color: ['#bfeaff', '#eaffff', '#fff'], up: 6, grav: 18, drag: 1.4 });
      this._game.audio.zap(shattered ? 90 : 300);
      if (shattered) { this._game.world.shake(0.8); this._game.audio.impact(0.9); }
    }
  }

  takeDamage(amount, opts = {}) {
    if (this.state === 'ko' || this.invuln > 0) return 0;
    if (opts.src && opts.src.sheet && opts.src.sheet.predator && this.hp < this.maxHp * 0.3) amount *= 1.15;   // Predator talent finishes hunts
    // shield cell gadget: an ablative pool eats hits before anything else
    if (this._shieldHp > 0 && !opts.trueDamage) {
      const soak = Math.min(this._shieldHp, amount);
      this._shieldHp -= soak; amount -= soak;
      if (this._game) this._game.particles.burst(this.pos.x, this.pos.y + 5.5, this.pos.z, { count: 5, speed: 16, life: 0.3, size: 1.8, color: ['#7fe6ff', '#fff'], drag: 1.4 });
      if (amount <= 0.01) { if (this._game) this._game.onHit(this, 0, opts, true); return 0; }
    }
    // energy-intangible: strikes/projectiles pass through
    if (this.phase && !opts.unblockable && !opts.trueDamage) {
      const g = this._game;
      if (g && Math.random() < 0.6) g.particles.burst(this.pos.x, this.pos.y + 5, this.pos.z, { count: 3, speed: 8, life: 0.3, size: 2.2, color: [this.def.colors.accent, '#fff'] });
      return 0;
    }
    // GUARD beats STRIKE: block frontal, non-grab damage ('barrier' guards cover ALL directions)
    if (this.guarding && this.staggerT <= 0 && !opts.unblockable && opts.src) {
      const dx = opts.src.pos.x - this.pos.x, dz = opts.src.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      const inArc = this.def.guardType === 'barrier' || (dx / d) * this.aim.x + (dz / d) * this.aim.z > -0.15;
      if (inArc) {   // attacker in front arc (or omnidirectional barrier)
        const sh = this.def.guardStrong ? 0.55 : 1;                  // riot shield: harder block, tougher meter
        amount *= (opts.strike ? 0.12 : opts.dot ? 0.5 : 0.42) * sh;
        this.guardMeter = clamp(this.guardMeter - (opts.strike ? 0.14 : opts.dot ? 0.012 : 0.22) * sh, 0, 1);
        const pb = opts.dot ? 0.8 : 5;                                // beams shove gently while blocked
        this.vel.x += (dx / d) * pb; this.vel.z += (dz / d) * pb;
        this.hitstop = Math.max(this.hitstop, opts.dot ? 0 : 0.03); this._blocked = 0.16;
        this.hp = clamp(this.hp - amount, 0, this.maxHp);
        if (this.guardMeter <= 0.001) { this.guarding = false; this.staggerT = 0.7; this.state = 'hit'; this.stateT = 0; } // guard break
        if (this._game) this._game.onHit(this, amount, opts, true);
        return amount;
      }
    }
    if (opts.src && opts.src !== this) { this.lastHitBy = opts.src; this.lastHitT = 0; }   // for kill attribution
    // getting hit cancels your own grab attempt (STRIKE beats GRAB)
    if (this.grabState === 'startup') { this.grabState = null; this.grabT = 0; }
    if (this.grabbing && this._game) this._game.melee.release(this);

    // frozen solid: a heavy hit SHATTERS the ice early for bonus damage
    if (this.frozenT > 0 && (opts.strike || (opts.kb && Math.hypot(opts.kb.x || 0, opts.kb.z || 0) > 30))) {
      amount *= 1.3; this._thaw(true);
    }
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.ki = clamp(this.ki + amount * 0.4, 0, this.maxKi); // build ki when hurt
    this.hitFlash = 1; this.hitstop = Math.max(this.hitstop, opts.hitstop || 0.04);
    // STRENGTH plants your feet: 10 shrugs off ~40% of knockback, 1 gets ragdolled around
    const kbMul = (this.metal ? 0.72 : 1) * (1.22 - this.strength * 0.047);
    if (opts.kb) { this.vel.x += (opts.kb.x || 0) * kbMul; this.vel.y += (opts.kb.y || 0) * kbMul; this.vel.z += (opts.kb.z || 0) * kbMul; }
    if (opts.launch) this.vel.y += opts.launch * kbMul;
    // launched hard enough → walls and the ground become weapons for ~1.1s (slam damage in _physics)
    if (!opts.slam) {
      const kmag = opts.kb ? Math.hypot(opts.kb.x || 0, opts.kb.z || 0) : 0;
      if (kmag > 30 || (opts.launch || 0) > 12) this.launchT = 1.1;
    }
    // robots shower sparks instead of bruising
    if (this.metal && this._game && amount >= 3) {
      this._game.particles.burst(this.pos.x, this.pos.y + 5.5, this.pos.z, { count: 8, speed: 26, life: 0.4, size: 1.8, color: ['#ffd97a', '#fff', '#ff9a2a'], up: 4, grav: 26, drag: 1.2 });
    }
    this.state = 'hit'; this.stateT = 0;
    if (this.hp <= 0) this._ko();
    if (this._game) this._game.onHit(this, amount, opts, false);
    return amount;
  }

  _ko() {
    this.state = 'ko'; this.koT = 0; this.flyHeld = false; this.flying = false; this.descendHeld = false;
    this.guarding = false; this.phase = false; this.strikeActive = 0;
    this.frozenT = 0; this.frost = 0; this._dots.length = 0; this.meleeCharge = 0; this._heavyT = 0;
    if (this.parts.ice) this.parts.ice.visible = false;
    if (this._game && (this.grabbing || this.grabbedBy)) this._game.melee.release(this.grabbing ? this : this.grabbedBy);
    if (this._game) for (const e of this._game.entities) if (e.grabbedBy === this) { e.grabbedBy = null; if (e.state === 'hit') e.state = 'idle'; }   // tentacle holds die with the holder
    for (const k in this.slots) { this.slots[k].charging = false; this.slots[k].active = null; }
    // become a ragdoll — carry the killing blow's knockback (+ a small pop) into the sim as launch
    if (this.canPhase) { for (const m of [this.parts.mats.suit, this.parts.mats.suit2]) { m.transparent = false; m.opacity = 1; } }
    this.ragdoll = new Ragdoll(this, this.vel.clone().add(new THREE.Vector3(0, 12, 0)));
    this.vel.set(0, 0, 0);
  }

  heal(a) { this.hp = clamp(this.hp + a * this.sheet.healMult, 0, this.maxHp); }
  spendKi(a) { if (this.energyInfinite) return true; if (this.ki < a) return false; this.ki -= a; return true; }

  // Impact damage from being hurled into geometry. Only fires while launched (launchT) — dashing
  // or flying into a wall on your own never hurts. Credit goes to whoever launched you.
  _slam(game, speed, kind) {
    if (!game || this.launchT <= 0 || this._slamCd > 0 || this.state === 'ko' || speed < 30) return;
    this._slamCd = 0.45;
    const dmg = Math.min(32, (speed - 22) * 0.5);
    const src = this.lastHitT < 3 ? this.lastHitBy : null;
    this.takeDamage(dmg, { src, slam: true, unblockable: true, hitstop: 0.1 });
    if (game.onSlam) game.onSlam(this, dmg, kind);
  }

  update(dt, game) {
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    if (this.buffT > 0) { this.buffT -= dt; if (this.buffT <= 0) { this.powerBuff = this.levelMult; this.buffName = ''; } }
    this.lastHitT += dt; this.lastKillT += dt;
    if (this._landT > 0) this._landT -= dt; if (this._liftFx > 0) this._liftFx -= dt;
    if (this._chill > 0) { this._chill -= dt; if (this._chill <= 0) this.speed = this.def.speed || 30; }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.evadeCd > 0) this.evadeCd -= dt;
    if (this.sprintT > 0) this.sprintT -= dt;
    if (this._slideT > 0) this._slideT -= dt;
    if (this.burstT > 0) this.burstT -= dt;
    if (this.launchT > 0) this.launchT -= dt;
    if (this._slamCd > 0) this._slamCd -= dt;
    if (this.drainedT > 0) this.drainedT -= dt;
    if (this._noKiT > 0) this._noKiT -= dt;
    this._bowDraw = damp(this._bowDraw || 0, this._bowDrawT || 0, 16, dt);   // archer draw pose blend
    for (const it of this.items) if (it.cd > 0) { it.cd -= dt; if (it.cd <= 0 && it.state === 'cooldown') it.state = 'ready'; }
    if (this._revealT > 0) this._revealT -= dt;
    // jump-jet gadget: temporary full flight for grounded heroes
    if (this._jetT > 0) {
      this._jetT -= dt;
      if (game && Math.random() < 0.7) game.particles.spawn({ x: this.pos.x + (Math.random() * 2 - 1), y: this.pos.y + 0.8, z: this.pos.z + (Math.random() * 2 - 1), vx: 0, vy: -12, vz: 0, life: 0.35, size: 2.2, color: ['#ffd97a', '#8a8f99'], drag: 1.2, shrink: true });
      if (this._jetT <= 0) { this.flightTier = this._jetPrev; if (this.flying && this.flightTier < 1) this.flying = false; }
    }
    if (this._frostImmuneT > 0) this._frostImmuneT -= dt;
    if (this.frost > 0 && this.frozenT <= 0) this.frost = Math.max(0, this.frost - dt * 0.25);   // buildup decays
    // damage-over-time stacks (poison/burn/gas)
    for (let i = this._dots.length - 1; i >= 0; i--) {
      const d = this._dots[i]; d.t -= dt;
      if (this.state !== 'ko' && this.invuln <= 0) {
        this.hp = clamp(this.hp - d.dps * dt, 0, this.maxHp);
        if (d.src && d.src !== this) { this.lastHitBy = d.src; this.lastHitT = 0; }
        d._acc = (d._acc || 0) + d.dps * dt; d._tick = (d._tick || 0) + dt;
        if (d._tick > 0.6 && game && game.hud) { game.hud.damageNumber(this.pos, Math.max(1, Math.round(d._acc)), d.color, true); d._acc = 0; d._tick = 0; }
        if (game && Math.random() < 0.25) game.particles.spawn({ x: this.pos.x + (Math.random() * 3 - 1.5), y: this.pos.y + 4 + Math.random() * 4, z: this.pos.z + (Math.random() * 3 - 1.5), vx: 0, vy: 5, vz: 0, life: 0.5, size: 2, color: d.color, drag: 1, shrink: true });
        if (this.hp <= 0) this._ko();
      }
      if (d.t <= 0) this._dots.splice(i, 1);
    }
    // FROZEN SOLID — a block of ice: no actions, physics still shoves you around
    if (this.frozenT > 0) {
      this.frozenT -= dt * this.sheet.ccRecover;
      this.guarding = false; this.meleeCharge = 0;
      if (this.frozenT <= 0) this._thaw(false);
      this._physics(dt, game); this._animate(dt); this._sync(); return;
    }
    // Green-Lantern-style barrier guards run on ki, not just the guard meter (out-drains base regen)
    if (this.guarding && this.def.guardType === 'barrier') {
      this.ki = Math.max(0, this.ki - 16 * dt);
      if (this.ki <= 0) { this.guarding = false; this.staggerT = 0.4; if (game && game.onDrained) game.onDrained(this); }
    }
    for (const k in this.slots) if (this.slots[k].cd > 0) this.slots[k].cd -= dt;
    // melee timers
    if (this.strikeCd > 0) this.strikeCd -= dt;
    if (this.comboWin > 0) this.comboWin -= dt;
    if (this.staggerT > 0) this.staggerT -= dt * this.sheet.ccRecover;   // RESOLVE + Iron Will shake it off
    if (this._blocked > 0) this._blocked -= dt;
    this.guardMeter = clamp(this.guardMeter + (this.guarding ? 0 : 0.55) * dt, 0, 1);
    if (game && game.melee) game.melee.update(this, dt);
    if (this.sprintT > 0 && game && Math.random() < 0.45) game.trail(this, this.def.colors.accent);   // sprint streak
    // VOLT-style lightning wake: blue arcs crackle behind a sprinting speedster
    if (this.sprintT > 0 && this._sprintLightning && game && Math.random() < 0.3) {
      game.vfx.lightning(this.pos.clone().setY(1.2), { color: '#7fd4ff', count: 2, radius: 5, height: 4 });
    }
    // procedural tentacles (built lazily; idle sway unless an ability aims them)
    if (this.def.tentacles && !this.tentacles && game) this.tentacles = buildTentacles(game.scene, this.def);
    if (this.tentacles) {
      _anchor.set(this.pos.x - this.aim.x * 1.2, this.pos.y + 6.6, this.pos.z - this.aim.z * 1.2);
      for (const t of this.tentacles) t.update(dt, _anchor, this.animT);
    }
    // readability: skid dust when you're being SHOVED along the ground (beam push / knockback / blockstun)
    if (game && this.grounded && (this.launchT > 0 || this._blocked > 0) && Math.hypot(this.vel.x, this.vel.z) > 24 && Math.random() < 0.55) {
      game.particles.spawn({ x: this.pos.x - this.vel.x * 0.02, y: 0.6, z: this.pos.z - this.vel.z * 0.02, vx: -this.vel.x * 0.12 + (Math.random() * 2 - 1) * 4, vy: 5 + Math.random() * 4, vz: -this.vel.z * 0.12 + (Math.random() * 2 - 1) * 4, life: 0.45, size: 3, color: ['#6a655a', '#8a8577'], grav: 8, drag: 1.6 });
    }
    // robot foot exhaust — thruster wash while flying or hustling
    if (this.metal && game && (this.flying || Math.hypot(this.vel.x, this.vel.z) > 14) && Math.random() < 0.6) {
      game.particles.spawn({ x: this.pos.x + (Math.random() * 2 - 1), y: this.pos.y + 0.8, z: this.pos.z + (Math.random() * 2 - 1), vx: -this.vel.x * 0.15, vy: this.flying ? -16 : -4, vz: -this.vel.z * 0.15, life: 0.4, size: 2.6, color: ['#ff9a2a', '#6a6f78', '#ffd97a'], drag: 1.4, shrink: true });
    }
    // signature flight styles — the old-Torch fire wake, the Iceman ride
    const flySpd = Math.hypot(this.vel.x, this.vel.z);
    if (game && this.flying && this.def.flyStyle === 'fire' && flySpd > 8 && Math.random() < 0.8) {
      game.particles.spawn({ x: this.pos.x - this.vel.x * 0.04, y: this.pos.y + 3.5 + Math.random() * 3, z: this.pos.z - this.vel.z * 0.04, vx: -this.vel.x * 0.2 + (Math.random() * 2 - 1) * 4, vy: 3 + Math.random() * 5, vz: -this.vel.z * 0.2 + (Math.random() * 2 - 1) * 4, life: 0.55, size: 3.4, color: ['#ff6a1a', '#ffd24a', '#ff3b1a'], drag: 1, shrink: true });
    }
    if (this.def.flyStyle === 'ice') {
      // he doesn't fly — he RIDES: a frozen board under his feet + a frost ribbon behind
      if (!this.parts.iceBoard) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 6.2), new THREE.MeshStandardMaterial({ color: '#bfeaff', transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0.1, emissive: '#4fb8e6', emissiveIntensity: 0.3 }));
        b.visible = false; this.obj.add(b); this.parts.iceBoard = b;
      }
      const board = this.parts.iceBoard;
      board.visible = this.flying;
      if (this.flying) {
        board.position.set(0, 0.35, 0.4);
        board.rotation.x = Math.sin(this.animT * 2.6) * 0.05;
        if (game && flySpd > 8 && Math.random() < 0.7) game.particles.spawn({ x: this.pos.x - this.vel.x * 0.06, y: this.pos.y + 0.5, z: this.pos.z - this.vel.z * 0.06, vx: -this.vel.x * 0.1, vy: -2, vz: -this.vel.z * 0.1, life: 0.7, size: 2.4, color: ['#bfeaff', '#eaffff'], drag: 0.8, shrink: true });
      }
    }
    this.poseStrike = damp(this.poseStrike, this.strikeActive > 0 ? 1 : 0, 18, dt);
    this.poseGuard = damp(this.poseGuard, this.guarding ? 1 : 0, 14, dt);
    this.poseGrab = damp(this.poseGrab, (this.grabState || this.grabbing) ? 1 : 0, 16, dt);

    if (this.state === 'ko') {
      this._updateKO(dt, game);
      if (this.ragdoll) { this.ragdoll.step(dt, game); this.ragdoll.apply(this); this._sync(); return; }
      this._physics(dt, game); this._animate(dt); this._sync(); return;
    }

    // ki regen (slower while casting/charging; guarding safely doubles as a charge stance)
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    // the DBZ charge scream: shout when the wind-up starts, ROAR if you keep pouring into it
    if (this._yellCd > 0) this._yellCd -= dt;
    if (anyCharge && !this._wasCharge) { this._chargeHeldT = 0; if (game && game.heroYell) game.heroYell(this, 0.7); }
    if (anyCharge) { this._chargeHeldT = (this._chargeHeldT || 0) + dt; if (this._chargeHeldT > 1.15 && !this._bigYelled && game && game.heroYell) { this._bigYelled = true; game.heroYell(this, 1.3); } }
    else this._bigYelled = false;
    this._wasCharge = anyCharge;
    if (this.energyInfinite) this.ki = this.maxKi;                             // android core — the tank never moves
    else this.ki = clamp(this.ki + (anyCharge ? 3 : 8) * this.sheet.kiRegenMult * dt, 0, this.maxKi);   // ki is a budget — RESOLVE refills it
    if (this.guarding && this._blocked <= 0 && this.def.guardType !== 'barrier') this.ki = clamp(this.ki + 22 * this.sheet.kiRegenMult * dt, 0, this.maxKi); // guard to recover it (barriers COST ki instead)

    if (this.hitstop > 0) { this.hitstop -= dt; this._animate(dt); this._sync(); return; }

    this._physics(dt, game);

    if (this.state === 'hit' && (this.stateT += dt) > 0.22) this.state = 'idle';
    this.castPose = damp(this.castPose, (this.state === 'cast' || anyCharge) ? 1 : 0, 12, dt);
    this.punchPose = damp(this.punchPose, 0, 10, dt);
    if (this.state === 'cast' && (this.stateT += dt) > 0.28) this.state = 'idle';

    this._animate(dt);
    this._sync();
  }

  _updateKO(dt, game) {
    this.koT += dt;
    if (this.koT > (this.isDummy ? 2.2 : 3.4)) {
      if (this.noRespawn) { this._remove = true; return; }   // survival/wave enemies stay dead
      // put the figure hierarchy back exactly, then respawn
      if (this.ragdoll) { this.ragdoll.restore(); this.ragdoll = null; }
      this.hp = this.maxHp; this.ki = this.maxKi * 0.4;
      for (const it of this.items) if (it.state !== 'deployed') { it.charges = it.def.charges ?? 1; it.state = 'ready'; it.cd = 0; }   // fresh pouch each life
      this.state = 'idle'; this.invuln = 1.4; this.vel.set(0, 0, 0);
      if (this.isDummy) this.pos.copy(this.spawn);
      else { this.pos.set(this.spawn.x, 0, this.spawn.z); }
      game.vfx.flash(this.pos.clone().setY(5), this.def.colors.accent, 8, 0.4);
    }
  }

  _physics(dt, game) {
    // --- flight / levitation ---
    if (this.state !== 'ko') {
      // rising edge of the ascend intent → take off into levitation (grounded heroes can't)
      if (this.flyHeld && !this._flyPrev && !this.flying && this.flightTier > 0) {
        this.flying = true;
        if (this.pos.y < 1.5) this.vel.y = FLY_TAKEOFF;      // pop off the ground so even a tap lifts into a hover
        this._liftFx = 0.25;
        if (game && game.audio) { try { game.audio.zap(560); } catch (e) {} }
      }
      // releasing ascend while aloft → stop climbing and settle here (no long coast up)
      if (!this.flyHeld && this._flyPrev && this.flying) this.vel.y = clamp(this.vel.y, -FLY_SINK, 5);
      this._flyPrev = this.flyHeld;

      if (this.flying) {
        let target, rate;
        if (this.flyHeld) { target = FLY_RISE; rate = 7; }                 // ascend
        else if (this.descendHeld) { target = -FLY_SINK; rate = 7; }       // descend
        else if (this.flightTier <= 1) { target = -7; rate = 4; }          // tier 1 can't hover — it sags
        else { target = Math.sin(this.animT * 2.3) * FLY_HOVER_BOB; rate = 5; }  // hover: gentle levitation bob
        this.vel.y = damp(this.vel.y, target, rate, dt);
        if (this.flightTier <= 1) {                                        // clumsy drift — the GAH wobble
          this.vel.x += Math.sin(this.animT * 3.1) * 9 * dt;
          this.vel.z += Math.cos(this.animT * 2.6) * 9 * dt;
        }
      } else if (this.pos.y > 0 || this.vel.y > 0) {
        this.vel.y -= 60 * dt;                               // gravity — jumps & knockback arcs
      }
    }
    // horizontal drag (near-frictionless while sliding — RIME's ice skate etc.)
    const dragF = Math.exp((this._slideT > 0 ? -1.3 : -6) * dt);
    this.vel.x *= dragF; this.vel.z *= dragF;
    this.vel.y = clamp(this.vel.y, -160, 70);       // never let launches/lift escape

    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    if (this.pos.y <= 0) {
      const impact = this.vel.y;
      this.pos.y = 0; if (this.vel.y < 0) this.vel.y = 0;
      if (this.flying && !this.flyHeld) this.flying = false;    // descended onto the ground → land, stop levitating
      if (impact < -30 && this.state !== 'ko') this._landT = Math.min(0.26, -impact * 0.006);   // knee-crouch on a hard landing
      if (impact < -38) this._slam(game, -impact, 'ground');    // hurled into the floor — fall/slam damage
    }
    if (this.pos.y > 85) { this.pos.y = 85; if (this.vel.y > 0) this.vel.y = 0; }  // flight/knockback ceiling

    // arena bounds — getting hurled into the border wall slams (and bounces)
    const b = ARENA - 4;
    if (Math.abs(this.pos.x) > b) { this._slam(game, Math.abs(this.vel.x), 'wall'); this.vel.x *= -0.4; }
    if (Math.abs(this.pos.z) > b) { this._slam(game, Math.abs(this.vel.z), 'wall'); this.vel.z *= -0.4; }
    this.pos.x = clamp(this.pos.x, -b, b); this.pos.z = clamp(this.pos.z, -b, b);

    // Box3 (AABB) collision vs cover — walls block you, and you can stand on their tops
    this.onBlock = false;
    const ghost = this.sprintT > 0 && this._sprintThrough;   // VOLT sprints straight through cover
    for (const c of game.world.cover) {
      if (ghost) break;
      const hx = (c.hx ?? c.r) + this.radius, hz = (c.hz ?? c.r) + this.radius, top = c.top ?? c.h;
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz);
      if (ox <= 0 || oz <= 0) continue;                    // no horizontal overlap
      // land on top — hovering fighters can perch on a block when they sink onto it
      if (this.pos.y >= top - 2.5 && this.vel.y <= 2 && !this.flyHeld && (!this.flying || this.descendHeld)) {
        this.pos.y = top; if (this.vel.y < 0) this.vel.y = 0; this.onBlock = true; this.flying = false;
      } else if (this.pos.y < top - 0.5) {
        const spd = Math.hypot(this.vel.x, this.vel.z);
        if (ox < oz) { this.pos.x += Math.sign(dx || 1) * ox; this.vel.x *= -0.3; }   // push out + bounce
        else { this.pos.z += Math.sign(dz || 1) * oz; this.vel.z *= -0.3; }
        // slammed into a wall hard enough → crack it AND hurt whoever got thrown into it
        if (spd > 34 && c.hp != null && this._game) { this._game.damageBlock(c, spd * 0.55, { x: this.pos.x, y: this.pos.y + 4, z: this.pos.z }); this.hitstop = Math.max(this.hitstop, 0.04); }
        this._slam(game, spd, 'wall');
      }
    }
  }

  move(dir, dt, sprint = 1) {
    if (this.state === 'ko' || this.hitstop > 0 || this.grabbedBy || this.grabState === 'clinch' || this.staggerT > 0 || this.frozenT > 0) return;
    let s = this.speed * this.powerBuff * sprint;
    if (this.sprintT > 0) s *= this.sprintMult;   // double-tap sprint surge
    if (this.meleeCharge > 0) s *= 0.4;           // winding up a haymaker roots you
    if (this.flying) s *= this.flightTier >= 3 ? 1 : this.flightTier === 2 ? 0.62 : 0.85;   // levitators reposition, fliers cruise
    if (this.guarding) s *= 0.34;               // guarding slows you
    if (this.strikeActive > 0) s *= 0.5;
    this.vel.x += dir.x * s * dt * 9;
    this.vel.z += dir.z * s * dt * 9;
    // during a dash/slide burst the clamp lifts, so the impulse actually carries you (drag reins it in)
    const mx = (this.burstT > 0 || this._slideT > 0) ? Math.max(s, 150) : s;
    const h = Math.hypot(this.vel.x, this.vel.z);
    if (h > mx) { this.vel.x = this.vel.x / h * mx; this.vel.z = this.vel.z / h * mx; }
    if (dir.x || dir.z) { if (this.state === 'idle' || this.state === 'move') this.state = 'move'; }
    else if (this.state === 'move') this.state = 'idle';
  }

  _animate(dt) {
    const p = this.parts; const moving = Math.hypot(this.vel.x, this.vel.z) > 4;
    // face
    this.obj.rotation.y = damp(this.obj.rotation.y, this.facing, 14, dt);
    // idle bob / breathe (+ landing crouch dips the upper body)
    const bob = Math.sin(this.animT * 3.2) * 0.12;
    const land = clamp(this._landT || 0, 0, 1);
    p.torso.position.y = 5.2 + bob + (this.pos.y > 0 ? 0.3 : 0) - land * 1.1;
    p.head.position.y = 8.0 + bob - land * 1.1;
    // run cycle — hips swing, KNEES flex on the back-lift; blends to a trailing pose in flight
    const mv = moving ? 1 : 0;
    const rc = Math.sin(this.animT * 12) * (moving ? 0.7 : 0.05);
    this._flyPose = damp(this._flyPose || 0, this.flying ? 1 : 0, 7, dt);
    const fp = this._flyPose, kneeBase = 0.14;
    const prone = clamp(this.obj.rotation.x / 1.5, 0, 1);        // how horizontal the body currently is
    let hipL = rc, hipR = -rc;
    let kneeL = kneeBase + clamp(rc, 0, 1) * 1.5 * mv;   // knee bends as that leg lifts behind
    let kneeR = kneeBase + clamp(-rc, 0, 1) * 1.5 * mv;
    const trail = fp * prone;                                    // legs trail only when CRUISING prone —
    hipL = lerp(hipL, 0.44, trail); hipR = lerp(hipR, 0.44, trail);   // hovering keeps them hanging straight
    kneeL = lerp(kneeL, 0.9, trail); kneeR = lerp(kneeR, 0.9, trail);
    kneeL = lerp(kneeL, 0.08, fp * (1 - prone)); kneeR = lerp(kneeR, 0.08, fp * (1 - prone));   // hover: straight legs
    hipL = lerp(hipL, 0.06, fp * (1 - prone)); hipR = lerp(hipR, 0.06, fp * (1 - prone));
    kneeL += land * 0.9; kneeR += land * 0.9;                    // landing crouch
    hipL -= land * 0.5; hipR -= land * 0.5;
    p.legL.rotation.x = hipL; p.legR.rotation.x = hipR;
    p.legL.userData.knee.rotation.x = kneeL; p.legR.userData.knee.rotation.x = kneeR;
    // arms: blend between run-swing, cast-forward, punch
    const cast = this.castPose, punch = this.punchPose;
    const swing = -rc * 0.8;
    const armFwd = -Math.PI * 0.5; // point forward
    p.armL.rotation.x = lerp(swing, armFwd, Math.max(cast, punch));
    p.armR.rotation.x = lerp(-swing, armFwd, Math.max(cast, punch));
    p.armL.rotation.z = lerp(0, 0.25, cast);
    p.armR.rotation.z = lerp(0, -0.25, cast);
    // --- melee poses (override) ---
    const gS = this.poseStrike, gG = this.poseGuard, gR = this.poseGrab;
    if (gS > 0.02) {
      const thr = -Math.PI * 0.66 * gS;
      if (this.strikeIdx === 2) { p.legR.rotation.x = lerp(p.legR.rotation.x, -1.25 * gS, 0.7); p.legR.userData.knee.rotation.x = lerp(p.legR.userData.knee.rotation.x, 0.1, gS); p.armR.rotation.x += thr * 0.3; }   // kick snaps the knee straight
      else { (this.strikeIdx % 2 === 0 ? p.armR : p.armL).rotation.x = thr; }
    }
    if (gG > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.9, gG); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.9, gG);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.6, gG); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.6, gG);
    }
    if (gR > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.5, gR); p.armR.rotation.x = lerp(p.armR.rotation.x, -1.5, gR);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.22, gR); p.armR.rotation.z = lerp(p.armR.rotation.z, -0.22, gR);
    }
    // SUPERHERO flight arms — prone cruise: lead fist punched out past the head, off arm swept back
    // along the hip; hover: relaxed float with arms slightly flared. Combat poses always win.
    const combatPose = Math.max(cast, punch, gS, gG, gR, this._bowDraw || 0, this.meleeCharge > 0 ? 1 : 0);
    const flyArm = this._flyPose * (1 - combatPose);
    if (flyArm > 0.02) {
      const pr = prone * flyArm, hov = (1 - prone) * flyArm;
      p.armR.rotation.x = lerp(p.armR.rotation.x, -2.95, pr);
      p.armL.rotation.x = lerp(p.armL.rotation.x, 0.35, pr);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.14, pr);
      p.armR.rotation.x = lerp(p.armR.rotation.x, -0.22, hov * 0.85);
      p.armL.rotation.x = lerp(p.armL.rotation.x, -0.22, hov * 0.85);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.4, hov);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.4, hov);
    }
    // bow draw: bow arm locked out, draw hand pulled to the cheek
    const bd = this._bowDraw || 0;
    if (bd > 0.02) {
      p.armL.rotation.x = lerp(p.armL.rotation.x, -1.55, bd);
      p.armL.rotation.z = lerp(p.armL.rotation.z, 0.1, bd);
      p.armR.rotation.x = lerp(p.armR.rotation.x, -1.15, bd);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.45, bd);
    }
    // guard arc — glanceable shield state: visible while guarding, flashes on block, reddens near break
    const ga = p.guardArc;
    if (ga) {
      const flash = this._blocked > 0 ? 0.5 : 0;
      const target = this.guarding ? 0.24 + flash : flash * 0.7;
      ga.material.opacity = damp(ga.material.opacity, target, 14, dt);
      if (this.def.guardType !== 'deflect') {
        const gm = this.guardMeter;
        ga.material.color.setRGB(0.75 + (1 - gm) * 0.25, 0.88 * gm + 0.25 * (1 - gm), 1 * gm + 0.2 * (1 - gm));   // ice-blue → red as the meter dies
      }
      ga.rotation.y = damp(ga.rotation.y, 0, 20, dt);   // arc follows body facing (child of g)
      ga.scale.setScalar(1 + Math.sin(this.animT * 10) * 0.02);
    }
    // frozen shell
    if (p.ice) {
      const iceOn = this.frozenT > 0;
      if (p.ice.visible !== iceOn) p.ice.visible = iceOn;
      if (iceOn) { p.ice.material.opacity = 0.66 + Math.sin(this.animT * 9) * 0.06; p.ice.rotation.y += dt * 0.4; }
    }
    // charged-melee wind-up: right arm coils back, fist blazes
    if (this.meleeCharge > 0) {
      const ch = Math.min(1, this.meleeCharge);
      p.armR.rotation.x = lerp(p.armR.rotation.x, 0.9 + ch * 0.5, 0.8);
      p.armR.rotation.z = lerp(p.armR.rotation.z, -0.4, 0.6);
      p.armR.children[2].material.emissiveIntensity = 1 + ch * 2.4;
      p.torso.rotation.y = lerp(p.torso.rotation.y, -0.35 * ch, 0.5);
    } else if (Math.abs(p.torso.rotation.y) > 0.01) p.torso.rotation.y = damp(p.torso.rotation.y, 0, 12, dt);
    // phase-intangibility: go ghostly
    if (this.canPhase) {
      const ph = this.phase ? 0.32 : 1;
      for (const m of [p.mats.suit, p.mats.suit2]) { m.transparent = true; m.opacity = damp(m.opacity, ph, 12, dt); }
    }
    // fists glow while casting/charging
    const anyCharge = Object.values(this.slots).some(s => s.charging || s.sustainT > 0);
    const fi = anyCharge ? 2.2 : (cast > 0.3 ? 1.2 : 0);
    p.armL.children[2].material.emissiveIntensity = damp(p.armL.children[2].material.emissiveIntensity, fi, 10, dt);
    p.armR.children[2].material.emissiveIntensity = p.armL.children[2].material.emissiveIntensity;
    // flight pose — the body aligns with the direction of TRAVEL:
    // level cruise → prone (head first, Superman), rising → vertical (head points where you're going),
    // pure up/down or hovering at altitude → fully upright, dives → nose-down, strafes → bank into the turn.
    let pitchT = 0, rollT = 0;
    if (this.flying) {
      const fwd = this.vel.x * this.aim.x + this.vel.z * this.aim.z;       // motion along facing
      const latR = this.vel.x * this.aim.z - this.vel.z * this.aim.x;      // motion to the body's right
      const vy = this.vel.y;
      const k = clamp((Math.hypot(this.vel.x, this.vel.z, vy * 0.5) - 6) / 20, 0, 1);   // engage with real speed
      const ang = fwd > 2 ? Math.atan2(fwd, vy) : 0;                       // vertical travel stays feet-first
      pitchT = clamp(ang, 0, 1.85) * k;
      if (fwd < -4) pitchT = -0.25 * k;                                    // backpedal: slight back-lean
      rollT = clamp(-latR * 0.014, -0.5, 0.5) * k;
    }
    p.g.rotation.x = damp(p.g.rotation.x, pitchT, 7, dt);
    p.g.rotation.z = damp(p.g.rotation.z, rollT, 7, dt);
    // cape sway
    if (p.cape) { p.cape.rotation.x = -0.3 + Math.sin(this.animT * 4) * 0.1 - Math.min(0.6, Math.hypot(this.vel.x, this.vel.z) * 0.02); }
    // aura from ki%/charge/buff — and POWER TIER: higher tiers burn brighter in gold → white-hot
    const auraP = clamp((this.ki / this.maxKi) * 0.25 + (anyCharge ? 0.5 : 0) + (this.powerBuff > 1 ? 0.5 : 0) + (this.tier - 1) * 0.18, 0, 1);
    const tc = TIER_COLORS[this.tier];
    p.aura.material.color.set(tc || this.def.colors.accent);
    p.aura.material.opacity = damp(p.aura.material.opacity, auraP * (0.5 + (this.tier - 1) * 0.1), 8, dt);
    const tp = 1 + (this.tier - 1) * 0.08;
    p.aura.scale.set((1 + Math.sin(this.animT * 8) * 0.04) * tp, (1.7 + auraP * 0.5) * tp, (1 + Math.sin(this.animT * 8) * 0.04) * tp);
    // contact shadow — pinned to the ground, shrinks & fades as the fighter climbs
    if (p.shadow) {
      p.shadow.position.set(0, 0.06 - this.pos.y, 0);
      const alt = clamp(1 - this.pos.y / 42, 0.08, 1);
      p.shadow.material.opacity = 0.36 * alt;
      p.shadow.scale.setScalar(clamp(1 - this.pos.y * 0.006, 0.4, 1));
    }
    // hit flash
    const hf = this.hitFlash;
    p.mats.suit.emissiveIntensity = 0.05 + hf * 2;
    p.mats.suit.emissive.setRGB(0.05 + hf, 0.05 + hf * 0.3, 0.05);
    if (hf <= 0) p.mats.suit.emissive.set(this.def.colors.primary);
  }

  _sync() { /* obj.position is this.pos (same ref); nothing extra */ }
}
