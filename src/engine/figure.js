// THE FIGURE — every mesh a fighter is made of (code review item 5).
//
// This is ~300 lines of PURE CONSTRUCTION: the per-hero silhouette table, the body-frame
// derivation, and the rig itself. It used to live inside entity.js beside combat, physics and
// status, which made that file the place everything went. Fighter is now what it should be —
// a simulated body — and this is the thing that gives it a shape.
//
// ⚠ THE RIG CONTRACT still holds and is why this is one file: arms index
// `arm.children[0..2]` = upper/fore/fist, legs expose `legL/R.userData = {thigh, knee, shin,
// boot}`, and the ragdoll drives those meshes in WORLD space assuming `g.scale === 1`. Any
// new detail must mount on a DRIVEN mesh, never as an extra pivot child.
import * as THREE from 'three';
import { rand, TAU } from '../core/util.js';

export const BUILDS = {
  sol: { pauldron: 1, gaunt: 1 }, kano: { band: 1, gaunt: 1 }, vega: { pauldron: 1, gaunt: 1, collar: 1 },
  aurum: { collar: 1, gaunt: 1 }, nova: { helmet: 1, visor: 1, pauldron: 1 }, rime: { crest: 1, collar: 1 },
  volt: { crest: 1, gaunt: 1 }, warden: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 }, hive: { tank: 1, crest: 1, pauldron: 1 },
  pyre: { crest: 1, gaunt: 1 }, torch: { crest: 1 }, apex: { crest: 1, pauldron: 1 },
  specter: { hood: 1, visor: 1, collar: 1 }, vanguard: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 },
  kraken: { horns: 1, collar: 1 },                                     // + tentacles from def.tentacles
  rift: { helmet: 1, visor: 1, collar: 1 },
  titan: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1, gun: 1 },       // pulse rifle in the right fist
  sarge: { band: 1, gaunt: 1, gun: 1, weaponL: 'sword', shield: 1 },   // rifle + plasma SWORD + riot shield
  gale: { band: 1, weaponL: 'bow', weaponR: 'knife' },                 // the ranger: bow out, knife ready
  stefanos: { collar: 1, gaunt: 1 },                                   // presidential suit lines
  sandra: { coat: 1, band: 1, weaponL: 'pistol', weaponR: 'pistol' },  // the Jackal: a pistol in each hand, long coat
  // the thirty
  kivuli: { tank: 1, hood: 1 }, jawah: { hood: 1, collar: 1 }, moses: { horns: 1, crest: 1, gaunt: 1 },
  ironclad: { helmet: 1, visor: 1, pauldron: 2, gaunt: 1 }, rage: { band: 1 }, stormcall: { helmet: 1, pauldron: 2, gaunt: 1, weaponR: 'axe' },
  webline: { band: 1 }, ripclaw: { mane: 1, gaunt: 1 }, majesty: { wings: 1, band: 1, pauldron: 1, gaunt: 1 },
  mystward: { hood: 1, collar: 1, coat: 1 }, onyx: { helmet: 1, visor: 1, collar: 1 }, chainfire: { horns: 1, gaunt: 1, coat: 1 }, tempest: { crest: 1, collar: 1 },
  knightfall: { hood: 1, visor: 1, collar: 1, gaunt: 1, coat: 1 }, aegis: { band: 1, pauldron: 1, gaunt: 1, weaponL: 'sword', shield: 1 },
  olympus: { wings: 1, collar: 1, gaunt: 1 }, marshal: { coat: 1, collar: 1 }, circuit: { tank: 1, helmet: 1, visor: 1, pauldron: 2, gun: 1 },
  trench: { crest: 1, pauldron: 1, weaponR: 'spear' }, decibel: { band: 1 }, coldsnap: { helmet: 1, visor: 1, gun: 1 },
  foundry: { tank: 1, helmet: 1, pauldron: 2, gaunt: 1, weaponR: 'axe' }, talon: { band: 1, weaponL: 'knife', weaponR: 'knife' },
  abeo: { helmet: 1, pauldron: 2, gaunt: 1 }, jelani: { band: 1, gaunt: 1 }, kamaria: { hood: 1, collar: 1 },
  ramiro: { coat: 1, band: 1, weaponR: 'shotgun' },   // ⚠ jawah/moses were DUPLICATED here — the repeats silently dropped their hood/horns (review find)
  dune: { collar: 1, band: 1 }, graven: { helmet: 1, visor: 1, collar: 1 }, bulwark: { helmet: 1, pauldron: 2, gaunt: 1, shield: 1 }, feral: { mane: 1, horns: 1, gaunt: 1 },
};

// THE BODY FRAME — the fix for "every character is the same guy in a different colour."
// Derives PROPORTIONS from what a character IS: a Might-10 bruiser is a wall of muscle, a wiry
// speedster is lean and short, a robot is a boxy chassis. So you can tell fighters apart by
// SILHOUETTE from across the arena, not just by palette. `def.frame` overrides for a hand-tuned one.
//   scale  — overall height/size (parts only; the group is NOT scaled, so ground markers + the
//            ragdoll stay world-true — see applyFrame)
//   bulk   — torso & limb thickness · broad — shoulder span · stance — leg span
//   head   — head size ratio (heavies have small heads on huge bodies) · neck — neck thickness
// ⚠ REVIEW ITEM 12: an EXPLICIT tag beats prose sniffing. `def.archetype` names the build
// outright, so a new hero simply SAYS what it is instead of hoping the regexes read its blurb
// correctly. The prose pass stays as the fallback for the 52 heroes written before this — and
// the word-boundary law still governs it (the `imp` in "simpler" once built the biggest
// bruiser in the game as a child).
export const FRAME_ARCHETYPES = {
  bruiser:   { scale: 1.16, bulk: 1.35, broad: 1.30, stance: 1.15, head: 0.88, neck: 1.20 },
  titan:     { scale: 1.24, bulk: 1.50, broad: 1.42, stance: 1.20, head: 0.82, neck: 1.30 },
  speedster: { scale: 0.97, bulk: 0.82, broad: 0.90, stance: 0.95, head: 1.04, neck: 0.95 },
  archer:    { scale: 1.00, bulk: 0.92, broad: 0.98, stance: 1.00, head: 1.00, neck: 1.00 },
  soldier:   { scale: 1.02, bulk: 1.08, broad: 1.10, stance: 1.05, head: 0.97, neck: 1.05 },
  mystic:    { scale: 1.00, bulk: 0.90, broad: 0.95, stance: 0.98, head: 1.02, neck: 1.00 },
  machine:   { scale: 1.10, bulk: 1.30, broad: 1.28, stance: 1.10, head: 0.90, neck: 1.15 },
};

export function frameOf(def) {
  if (def && def.archetype && FRAME_ARCHETYPES[def.archetype]) return { ...FRAME_ARCHETYPES[def.archetype], ...(def.frame || {}) };
  const F = { scale: 1, bulk: 1, broad: 1, head: 1, neck: 1, stance: 1 };
  if (def.frame) return Object.assign(F, def.frame);
  const s = def.strength ?? 5;
  const tag = ((def.role || '') + ' ' + (def.title || '') + ' ' + (def.blurb || '')).toLowerCase();
  if (s >= 10)      Object.assign(F, { scale: 1.20, bulk: 1.42, broad: 1.34, head: 0.84, neck: 1.5, stance: 1.28 });
  else if (s >= 8)  Object.assign(F, { scale: 1.12, bulk: 1.28, broad: 1.24, head: 0.9, neck: 1.34, stance: 1.18 });
  else if (s >= 7)  Object.assign(F, { scale: 1.06, bulk: 1.15, broad: 1.13, head: 0.94, neck: 1.18, stance: 1.09 });
  else if (s <= 3)  Object.assign(F, { scale: 0.92, bulk: 0.79, broad: 0.9, head: 1.09, neck: 0.84, stance: 0.94 });
  else if (s <= 4)  Object.assign(F, { scale: 0.97, bulk: 0.9, broad: 0.96, head: 1.03, neck: 0.92 });
  // archetype overlays — read the concept, not just the number
  // ⚠ WORD BOUNDARIES ARE LOAD-BEARING. Without , `imp` matches "simpler" and `small` matches
  // "smaller" — which built RAGE (Might 10, the biggest bruiser in the game) as a CHILD, because
  // his blurb contains the word "simpler". Never substring-match prose.
  if (/(speed|lightning|acrobat|sprint|ranger|archer|nimble|swift)\w*/.test(tag)) { F.scale = Math.min(F.scale, 0.96); F.bulk = Math.min(F.bulk, 0.82); F.stance = Math.min(F.stance, 0.92); }
  if (def.metal) { F.bulk = Math.max(F.bulk, 1.22); F.broad = Math.max(F.broad, 1.2); F.head = Math.min(F.head, 0.9); F.neck = Math.max(F.neck, 1.32); }   // a chassis, not a body
  if (/(giant|colossus|titan|behemoth|rampart|fortress|mountain|atlas|leviathan)\w*/.test(tag)) { F.scale = Math.max(F.scale, 1.2); F.bulk = Math.max(F.bulk, 1.38); }
  if (/(child|kid|imp|sprite|dwarf)/.test(tag)) { F.scale = Math.min(F.scale, 0.84); F.head = Math.max(F.head, 1.16); F.bulk = Math.min(F.bulk, 0.85); }
  return F;
}
// Apply the frame to the BODY meshes only. ⚠ Deliberately does NOT scale the group `g`: the
// ground markers (ring/wedge/shadow) sit at un-scaled world positions as children of g, and the
// ragdoll drives body meshes in group-local space assuming g.scale=1 — scaling g would float the
// markers and misplace ragdoll limbs. Framing the parts instead leaves both correct.
export function applyFrame(P, F) {
  P.g.userData.frame = F;
  const S = F.scale;
  P.torso.position.y *= S; P.torso.scale.set(F.bulk, S, F.bulk);
  P.pelvis.position.y *= S; P.pelvis.scale.set(F.bulk * 0.96, S, F.bulk * 0.96);
  P.head.position.y *= S; P.head.scale.setScalar(0.88 * F.head);
  if (P.cowl) { P.cowl.position.y *= S; P.cowl.scale.setScalar(0.9 * F.head); }
  if (P.emblem) P.emblem.position.y *= S;
  for (const arm of [P.armL, P.armR]) {
    arm.position.x *= F.broad; arm.position.y *= S;
    for (const m of arm.children) { m.scale.x *= F.bulk; m.scale.z *= F.bulk; m.scale.y *= S; m.position.y *= S; }
  }
  for (const leg of [P.legL, P.legR]) {
    leg.position.x *= F.stance; leg.position.y *= S;
    const u = leg.userData;
    if (u.knee) u.knee.position.y *= S;
    for (const m of [u.thigh, u.shin, u.boot]) { if (!m) continue; m.scale.x *= F.bulk; m.scale.z *= F.bulk; m.scale.y *= S; m.position.y *= S; }
  }
  // the energy shells wrap the torso — lift them so they still hug a tall frame
  for (const m of [P.aura, P.guardArc, P.ice, P.cape]) if (m) m.position.y *= (1 + (S - 1) * 0.7);
}

// =================================================================================================
// THE RIM LIGHT — material-level, not a post-process, because it must know what a FIGHTER is.
//
// A full-screen rim would light every silhouette in the city; the point of this one is that the 52
// things that matter separate from a grey street. It is the cheapest identity effect on the list
// (~0.1ms) precisely because it is four lines of ALU inside a shader that is already running.
//
// ⚠ INJECTED ALWAYS, DRIVEN BY A UNIFORM — never toggled by re-injecting. `onBeforeCompile` changes
// the program, and swapping it at runtime recompiles every material that uses it. That is the same
// class of stall as the light-count law (a beam on a raised guard recompiling the city, +152
// programs in 4s). Compile once with the rim in it; turn it off by setting the strength to zero.
//
// ⚠ AND IT NEEDS A CACHE KEY. Without `customProgramCacheKey` three.js may hand a rim-injected
// material a program compiled for an un-injected one with identical parameters, and the rim silently
// does not appear on some fighters and does on others.
export function applyRim(mat, color, strength = 1, power = 2.6) {
  if (!mat || mat._rimU) return mat;
  const u = { uRimCol: { value: new THREE.Color(color || '#bcd8ff') },
              uRimK: { value: strength }, uRimP: { value: power } };
  mat._rimU = u;
  mat.customProgramCacheKey = () => 'wwa-rim';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = 'uniform vec3 uRimCol;\nuniform float uRimK;\nuniform float uRimP;\n' + sh.fragmentShader;
    // ⚠ AFTER the lighting has resolved, before tone mapping — a rim is light arriving at a grazing
    // angle, so it ADDS to the lit result rather than tinting the albedo.
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      [
        '{',
        '  float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);',
        '  outgoingLight += uRimCol * pow(rim, uRimP) * uRimK;',
        '}',
        '#include <opaque_fragment>',
      ].join('\n'));
  };
  return mat;
}

export function setRim(parts, strength) {
  if (!parts || !parts.mats) return;
  for (const m of Object.values(parts.mats)) if (m && m._rimU) m._rimU.uRimK.value = strength;
  if (parts._rimExtra) for (const m of parts._rimExtra) if (m && m._rimU) m._rimU.uRimK.value = strength;
}

export function figure(def) {
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

  // ⚠ THE GROUND RIG. Every ground marker hangs off THIS, not off `g` directly, and `_animate`
  // counter-rotates it against the body's flight pitch and roll.
  //
  // The bug it fixes: the flight pose writes pitch and roll onto `p.g` — the very group the markers
  // were children of — so a fighter at prone cruise (~87 degrees) rotated the markers' local "down"
  // offset almost to horizontal, and the shadow and rings swung out sideways instead of staying
  // beneath the feet. The one thing a ground marker exists to do is say WHERE ON THE GROUND YOU
  // ARE, and it stopped doing it exactly when you were airborne and needed it most.
  //
  // Order 'ZXY' is deliberate: the parent composes Ry*Rx*Rz, so cancelling pitch and roll while
  // KEEPING yaw needs Rz(-roll)*Rx(-pitch), which is what 'ZXY' with y=0 produces.
  const groundRig = new THREE.Group();
  groundRig.rotation.order = 'ZXY';
  g.add(groundRig);

  // ⚠ AND THEY MUST NOT SHARE A PLANE. These four discs sat at y = 0.06 / 0.08 / 0.09 / 0.10 — one
  // to two HUNDREDTHS of a unit apart, which at 1:1 scale is inside depth-buffer precision. They
  // z-fought and the ground under every fighter flickered. They are spread an order of magnitude
  // further apart now; 0.75u is still 14cm at this scale, so nothing reads as floating.
  // soft contact shadow (grounds the figure; repositioned every frame)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; shadow.renderOrder = 1; groundRig.add(shadow);
  // altitude-band ring (the ruled four bands): ground-pinned, colored by the fighter's CURRENT
  // band — readable from across the map so you can climb to someone's level
  // THE GROUND MARKER — the fighter's whole state, read from directly under them:
  // ring colour = altitude band · notch = WHICH WAY THEY'RE LOOKING · ring style = what they're doing.
  const bandRing = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.7, 24), new THREE.MeshBasicMaterial({ color: '#8fe08a', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  bandRing.rotation.x = -Math.PI / 2; bandRing.position.y = 0.55; bandRing.renderOrder = 1; groundRig.add(bandRing);
  // THE PLUMB LINE (altitude plan 2): a GRADUATED vertical tether from a flier down to their
  // ground column. Dashes every 50u with a brighter tick at each band boundary, so you can
  // COUNT RUNGS to a flier the way you count floors on a building — measurable, not merely
  // present. Non-additive (only ki glows) and hidden unless the fighter is genuinely seen.
  const tetherGeo = new THREE.BufferGeometry();
  const TETHER_SEGS = 28;
  tetherGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TETHER_SEGS * 6), 3));
  const tether = new THREE.LineSegments(tetherGeo, new THREE.LineBasicMaterial({ color: '#8fe08a', transparent: true, opacity: 0.5, depthWrite: false }));
  tether.frustumCulled = false; tether.visible = false; tether.renderOrder = 1; groundRig.add(tether);
  // the facing wedge: a bright arc at the FRONT of the ring, so you always know where they look
  const faceWedge = new THREE.Mesh(new THREE.RingGeometry(3.0, 4.5, 18, 1, -0.42, 0.84), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  faceWedge.rotation.x = -Math.PI / 2; faceWedge.position.y = 0.75; faceWedge.renderOrder = 2; groundRig.add(faceWedge);
  // the state ring: flares and recolours for guard / grab / strike (blue shield, green grip, white hit)
  const stateRing = new THREE.Mesh(new THREE.RingGeometry(4.0, 4.9, 28), new THREE.MeshBasicMaterial({ color: '#9fd0ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  stateRing.rotation.x = -Math.PI / 2; stateRing.position.y = 0.35; stateRing.renderOrder = 2; groundRig.add(stateRing);

  // torso (chest taper) + neck + collar
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.2, 6, 12), suit);
  torso.position.y = 5.2; torso.castShadow = true; g.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 1.0, 10), skinMat);
  neck.position.set(0, 2.0, 0); torso.add(neck);
  { const nk = (def.frame || frameOf(def)).neck || 1; neck.scale.set(nk, 1, nk); }   // a heavy frame has no neck to speak of
  if (b.collar) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.02, 1.2, 14, 1, true, -1.05, 2.1), armor);
    col.material.side = THREE.DoubleSide; col.position.set(0, 1.9, -0.15); torso.add(col);
  }
  // ---- THE BODY FORGE STANDARD (Robert, 2026-07-28): "use the models I designed in WAR WORLD —
  // that military stripe across the chest — as the standard Multiverse model." Slice 1: the
  // BANDOLIER. A diagonal fabric strap from one shoulder to the opposite hip, mounted on the TORSO
  // so poses and the ragdoll carry it (the rig contract). Per-hero: it wears the hero's ACCENT
  // (matte, not the glow), so it varies by fighter like the creator would. `def.build.noSash`
  // opts a bespoke figure out. Cube head + Forge proportions are the next slices.
  if (!b.noSash) {
    // ⚠ TORSO-LOCAL COORDS — child of `torso` (world y≈5.2, capsule r≈1.5). Local origin = chest
    // centre; front face ≈ z 1.3; chest spans local y ≈ ±2. The sash runs shoulder→opposite hip.
    // ⚠ SIT IT PROUD OF THE CHEST. The torso is a CAPSULE bulging to z≈1.5 at the centre; a strap set
    // back at z1.18 sank into that bulge and read as two disconnected ends. z1.62 + a shallow box keeps
    // the whole diagonal on the surface as one continuous bandolier.
    const sashMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.62, metalness: 0.12 });
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.62, 3.6, 0.22), sashMat);
    sash.position.set(-0.05, 0.1, 1.62);      // proud of the chest front
    sash.rotation.set(0.12, 0, 0.6);          // shoulder→hip diagonal, tipped to follow the chest
    sash.castShadow = true; torso.add(sash);
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
  head.position.y = 8.0; head.scale.setScalar(0.88); head.castShadow = true; g.add(head);   // a touch smaller — heroic proportions
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.86, 12, 10), skinMat);
  jaw.position.set(0, -0.42, 0.32); jaw.scale.set(1, 0.72, 0.92); head.add(jaw);
  // hair/cowl (child of g; ragdoll pins it to the head)
  const cowl = new THREE.Mesh(new THREE.SphereGeometry(1.22, 16, 12, 0, TAU, 0, Math.PI * 0.62), suit2);
  cowl.position.y = 8.1; cowl.scale.setScalar(0.9); g.add(cowl);   // tracks the smaller head
  if (b.helmet) { cowl.visible = false; const hel = new THREE.Mesh(new THREE.SphereGeometry(1.3, 18, 12, 0, TAU, 0, Math.PI * 0.66), armor); hel.position.y = 0.1; head.add(hel); }
  if (b.crest) {                                   // fin / flame / antenna
    const cr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 4), glow.clone()); cr.material.emissiveIntensity = 0.85; cr.position.set(0, 1.15, -0.1); head.add(cr);
    const cr2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 4), cr.material); cr2.position.set(0, 0.9, -0.7); head.add(cr2);
  }
  if (b.band) { const bd = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.14, 8, 18), new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.55, metalness: 0.2 })); bd.rotation.x = Math.PI / 2; bd.position.y = 0.32; head.add(bd); }
  // ---- SIGNATURE SILHOUETTE PIECES -----------------------------------------------------------
  // The frame gives you size; these give you SHAPE. Every one mounts on a DRIVEN mesh (head /
  // torso / pelvis) so poses and the ragdoll carry them for free — the rig contract.
  if (b.horns) {                                   // beast / demon read
    for (const side of [-1, 1]) {
      const hn = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.5, 7), armor);
      hn.position.set(side * 0.62, 0.78, -0.05); hn.rotation.z = -side * 0.42; hn.rotation.x = -0.22; head.add(hn);
    }
  }
  if (b.hood) {                                    // a raised hood — assassin / mystic
    cowl.visible = false;
    const hd = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.1, 10, 1, true), suit2);
    hd.material.side = THREE.DoubleSide; hd.position.set(0, 0.42, -0.22); hd.rotation.x = -0.16; head.add(hd);
    const drape = new THREE.Mesh(new THREE.ConeGeometry(1.32, 1.5, 10, 1, true), suit2);
    drape.material.side = THREE.DoubleSide; drape.position.set(0, -0.55, -0.5); drape.rotation.x = 0.3; head.add(drape);
  }
  if (b.mane) {                                    // a shaggy volume — feral / lion
    const mn = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62, 0), suit2);
    mn.position.set(0, -0.05, -0.28); mn.scale.set(1.1, 0.95, 1.0); head.add(mn);
  }
  if (b.wings) {                                   // back wings — the fliers that should LOOK it
    for (const side of [-1, 1]) {
      const wg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.4, 3, 2), new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.35, transparent: true, opacity: 0.72, side: THREE.DoubleSide, roughness: 0.5 }));
      wg.position.set(side * 2.1, 0.7, -1.0); wg.rotation.y = side * 0.9; wg.rotation.z = side * 0.3; torso.add(wg);
    }
  }
  if (b.tank) {                                    // a back tank / pack — gas, tech, engineer
    const tk = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.7, 4, 10), armor);
    tk.position.set(-0.62, 0.25, -1.35); torso.add(tk);
    const tk2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.7, 4, 10), armor);
    tk2.position.set(0.62, 0.25, -1.35); torso.add(tk2);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.11, 6, 12, Math.PI), glow.clone());
    hose.material.emissiveIntensity = 0.5; hose.position.set(0, 1.1, -1.1); hose.rotation.x = Math.PI / 2; torso.add(hose);
  }
  if (b.coat) {                                    // a long coat skirt — gunslinger / hunter
    const ct = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 2.0, 3.0, 12, 1, true), suit2);
    ct.material.side = THREE.DoubleSide; ct.position.set(0, -1.25, -0.1); pelvis.add(ct);
  }
  if (b.visor) { const vis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.42), visorMat); vis.position.set(0, 0.12, 0.92); head.add(vis); }
  // eyes (children of head; hidden behind a visor)
  const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: c.accent });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.42, 0.05, 1.0); head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.42, 0.05, 1.0); head.add(eyeR);
  if (b.visor) { eyeL.visible = false; eyeR.visible = false; }

  // arms — pivot groups; children[0]=upper,[1]=fore,[2]=fist (indices are a ragdoll contract).
  const mkArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.58, 6.72, 0);   // seated INTO the torso, at shoulder height
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.5, 4, 8), suit);
    upper.position.y = -1.05; upper.castShadow = true; pivot.add(upper);
    // deltoid cap sits ON the joint so the shoulder reads solid from the top-down camera
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.74, 10, 8), suit); delt.position.set(-side * 0.1, 0.92, 0); delt.scale.set(1.05, 0.9, 1.05); upper.add(delt);
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
    // ⚠ `kneeCap` IS EXPOSED because anything parented to a JOINT GROUP must be reachable by the
    // ragdoll. The knee group is zeroed during a ragdoll so its children can be driven in world
    // space — but a child the ragdoll does not drive is then left at the corpse's own origin.
    // Measured before this: after 400 ragdoll steps the kneecap sat at [0, 0.05, 0] while its own
    // shin was at [-0.73, 0.50, -0.04]. A kneecap on the floor under every dead body.
    pivot.userData = { thigh, knee, shin, boot, kneeCap };
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

  // the rim rides the hero's OWN accent, cooled toward the scene's back light — a fighter separates
  // from the street in their own colour, not in a generic blue
  for (const m of [suit, suit2, skinMat, armor]) applyRim(m, new THREE.Color(c.accent).lerp(new THREE.Color('#bcd8ff'), 0.55), 0);
  const P = { g, groundRig, torso, head, pelvis, cowl, emblem, aura, cape, armL, armR, legL, legR, eyeL, eyeR, shadow, bandRing, faceWedge, stateRing, guardArc, ice, tether, mats: { suit, suit2, glow, skin: skinMat, armor } };
  applyFrame(P, frameOf(def));   // ← the silhouette: proportions derived from who this fighter IS
  return P;
}

export function buildWeapon(kind, m) {
  const g = new THREE.Group();
  const add = (mesh, x, y, z, rx = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.x = rx; mesh.rotation.z = rz; g.add(mesh); return mesh; };
  switch (kind) {
    // ---- THE ARMORY'S OWN SILHOUETTES (2026-07-26). Built along the arm's -Y axis like every
    // other weapon here, so the poses and the ragdoll carry them for free.
    case 'katana': {                                   // long single edge + a guard + a wrapped hilt
      const bl = add(new THREE.Mesh(new THREE.BoxGeometry(0.10, 3.4, 0.30), m.metal || m.armor), 0, -1.9, 0);
      bl.castShadow = true;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), m.armor), 0, -0.22, 0);   // tsuba
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), m.suit2 || m.armor), 0, 0.2, 0);
      break;
    }
    case 'claws': {                                    // three blades PAST the knuckles, not a held thing
      for (let i = -1; i <= 1; i++) {
        const c2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.16), m.metal || m.armor), i * 0.22, -0.95, 0.04);
        c2.rotation.z = i * 0.10; c2.castShadow = true;
      }
      break;
    }
    case 'smg': {                                      // stubby receiver, folding stock, fat suppressor
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.34), m.armor), 0, -0.7, 0.05);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8), m.armor), 0, -1.7, 0.05);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.2), m.armor), 0, 0.2, 0.22);   // magazine
      break;
    }
    case 'sniper': {                                   // long barrel, big scope, bipod
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), m.armor), 0, -1.9, 0.05);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.5, 0.36), m.armor), 0, -0.2, 0.05);
      const sc = add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 8), m.metal || m.armor), 0, -0.35, -0.3);
      sc.rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.24), m.armor), 0, 0.55, 0.16);   // stock
      break;
    }
    case 'baton': {                                    // a stick, and a grip you can see
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 2.1, 8), m.armor), 0, -1.0, 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), m.suit2 || m.armor), 0, 0.15, 0);
      break;
    }
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


