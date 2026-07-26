# LIMB SEGMENTATION — plan for close-camera third person
**WAR WORLD: ASCENDANTS · D:\lsw · master @ 0a80a76 · 2026-07-26**

Everything below is cited to `file:line`. Numbers marked **MEASURED** came from running the real
modules under node (three 0.169 via `file:///D:/lsw/node_modules/three/build/three.module.js`,
scripts in this scratchpad: `count.mjs`, `geom.mjs`, `foot.mjs`, `rag.mjs`). Anything I could not
verify is in §6, and inline guesses are marked **GUESS**.

---

## 0. Three findings that change the shape of the job

Read these before the plan; they invalidate part of the brief's premise and they are the reason
the work is smaller in one place and bigger in another than it looks.

**0.1 — The leg is already three capsules with a real knee. The ARM is one rigid stick.**
`mkLeg` (`src/engine/figure.js:332-346`) builds `thigh` → `knee` (a real `THREE.Group` joint at
`figure.js:337`) → `shin` + `boot`, and `_animate` drives both the hip and the knee
(`src/engine/entity.js:1630-1631`). So "a 2-part leg reads as a mannequin" is out of date — the
knee shipped in Goal 10 and is animated.

`mkArm` (`figure.js:294-326`) does **not** do the same thing. `upper`, `fore` and `fist` are all
**flat siblings of the shoulder pivot** at fixed local offsets `y = -1.05 / -2.85 / -3.85`
(`figure.js:297, 301, 303`). There is no elbow group and no wrist group. Grep confirms nothing
anywhere writes a rotation below the shoulder: every animation write is `p.armL/armR.rotation.x`
or `.rotation.z` at the pivot (`entity.js:1636-1639, 1644-1645, 1648-1653, 1661-1667, 1672-1675,
1699-1700`). **The arm is a straight rod hinged only at the shoulder.** That is the actual
mannequin tell, and at close range it is far more damaging than the knee ever was.

The elbow *does* exist in the ragdoll (`ragdoll.js:228-229` caps `shL→elL` and `elL→haL`), so
**an arm bends only when the fighter is dead.**

**0.2 — There is no third-person camera to segment for yet.** The only camera in `world.js` is
`new THREE.OrthographicCamera(...)` at `src/engine/world.js:55`; grep for
`PerspectiveCamera|thirdPerson|cameraMode` across `world.js`, `game.js`, `core/settings.js`
returns nothing else. CLAUDE.md states the law directly ("THE GAME CAMERA IS ORTHOGRAPHIC
(isometric game)") and the space layer had to borrow the news crew's POV camera for exactly this
reason. So this work is *preparation* for a mode that does not exist. That is fine, but it means
**no screenshot can currently prove the payoff**, and the verification recipe in §5 has to use a
borrowed perspective camera.

**0.3 — Feet already clip through the pavement, and the corpse leaves two orphan spheres.**
Both are invisible at iso range and both become visible the moment a camera gets close. Details
in §1.5 and §1.6. They are the same class of bug segmentation would multiply, so they belong in
this pass.

---

## 1. What exists now

### 1.1 The full hierarchy (built by `figure()`, `figure.js:156-379`)

```
g  = THREE.Group          rotation.order = 'YXZ'   (figure.js:160)   ← position IS fighter.pos (entity.js:170)
│                          NEVER scaled (see §2.2). userData.rig = true (entity.js:169)
├── groundRig  Group       rotation.order = 'ZXY'  (figure.js:181-183)
│   │                      counter-rotates the flight pitch/roll (entity.js:1736)
│   ├── shadow     Mesh Circle(3.0)      y 0.05    figure.js:190-191
│   ├── bandRing   Mesh Ring(3.1,3.7)    y 0.55    figure.js:196-197
│   ├── tether     LineSegments (28 seg) y 0       figure.js:202-206
│   ├── faceWedge  Mesh Ring(3.0,4.5)    y 0.75    figure.js:208-209
│   └── stateRing  Mesh Ring(4.0,4.9)    y 0.35    figure.js:211-212
│
├── torso    Mesh Capsule(1.5, 2.2)  y 5.2   castShadow   figure.js:215-216
│   ├── neck  Cylinder                y 2.0            figure.js:217-219   ⚠ NOT in `parts`
│   ├── collar        [b.collar]      y 1.9            figure.js:220-223
│   ├── wings ×2      [b.wings]                        figure.js:267-272
│   └── tank ×2 + hose ×1 [b.tank]                     figure.js:273-280
├── emblem   Mesh Circle(0.8)         y 5.7            figure.js:225-226
├── pelvis   Mesh Capsule(1.3, 0.8)   y 3.2   castShadow   figure.js:228-229
│   ├── belt  Torus                   y 0.35           figure.js:230-231
│   └── coat          [b.coat]                         figure.js:281-284
├── head     Mesh Sphere(1.15)        y 8.0   castShadow   figure.js:234-235
│   ├── jaw, helmet[b], crest ×2[b], band[b], horns ×2[b], hood ×2[b], mane[b],
│   │   visor[b], eyeL, eyeR                           figure.js:236-291
├── cowl     Mesh Sphere(1.22)        y 8.1            figure.js:239-240
│
├── armL / armR  = PIVOT Group at (±1.58 × broad, 6.72 × S, 0)      figure.js:295
│   ├── children[0]  upper  Capsule(0.52, 1.5)  y -1.05  castShadow   figure.js:296-297
│   │     └── delt Sphere(0.74) y 0.92        figure.js:299
│   │     └── pauldron[b] / spike[b]          figure.js:304-307
│   ├── children[1]  fore   Capsule(0.46, 1.5)  y -2.85              figure.js:300-301
│   │     └── gaunt cyl + gaunt band [b.gaunt]  figure.js:308
│   │     └── shield [b.shield, side −1]        figure.js:318-321
│   └── children[2]  fist   Icosahedron(0.66), glow.clone()  y -3.85  figure.js:302-303
│         └── gun barrel/body/tip [b.gun, side +1]  figure.js:310-314
│         └── blade [b.blade, side −1]             figure.js:315-317
│         └── buildWeapon(weaponL|weaponR) Group   figure.js:322-323
│   ⚠ FLAT: fore and fist are siblings of upper, NOT descendants. No elbow, no wrist.
│
├── legL / legR  = PIVOT Group (hip) at (±0.7 × stance, 3.0 × S, 0)  figure.js:333
│   ├── thigh Capsule(0.56, 1.5)  y -0.95  castShadow    figure.js:334-335
│   │     └── hipCap Sphere(0.62) y 0.85                 figure.js:336
│   └── knee  = JOINT Group  y -1.9                      figure.js:337
│         ├── shin    Capsule(0.5, 1.3)  y -0.85  castShadow   figure.js:338-339
│         ├── kneeCap Sphere(0.5)        y 0.05                figure.js:340   ⚠ see §1.6
│         └── boot    Capsule(0.58, 0.7) y -1.85 z 0.2         figure.js:341-342
│               └── toe Sphere(0.5) z 0.62                     figure.js:343
│   pivot.userData = { thigh, knee, shin, boot }           figure.js:344
│
├── cape [c.cape]   figure.js:350-354
├── aura            figure.js:357-358
├── guardArc        figure.js:363-367
└── ice             figure.js:370-371
```

`parts` (the `P` object, `figure.js:376`):
`g, groundRig, torso, head, pelvis, cowl, emblem, aura, cape, armL, armR, legL, legR, eyeL, eyeR,
shadow, bandRing, faceWedge, stateRing, guardArc, ice, tether, mats:{suit, suit2, glow, skin, armor}`
plus `iceBoard` added lazily at `entity.js:1095-1097`, and `stars` / `zzz` / `woundPips` / `eyeMark`
added lazily in `_animate` (`entity.js:1520, 1538, 1561, 1580`) — note those four are added to
`this.obj` (= `g`) directly, not to `groundRig`.

**MEASURED** across all 52 heroes (`count.mjs`): **38–52 meshes** (min RAGE 38, max FOUNDRY 52),
avg 43.2 meshes / 52.5 Object3D nodes / **21.1 unique materials** / 43.2 unique geometries.
CLAUDE.md's "45–60" matches my **node count** (47–62), not the mesh count — worth correcting there.
Per-limb: `legL`/`legR` are 6 meshes each on every hero; `armL`/`armR` are 4 on a plain hero
(RAGE) and up to 11 with a weapon and a gauntlet (SARGE `armL` = 11, TITAN `armR` = 11).

### 1.2 The two contracts, and every external reader

Contract A — **`arm.children[0..2] = upper / fore / fist`**, stated at `figure.js:8-11`:

| # | Site | What it does | Breaks if a group is inserted? |
|---|---|---|---|
| 1 | `ragdoll.js:58` | `driven` list: `armL.children[0],[1],[2]` | **YES** — `[1]` becomes the elbow group |
| 2 | `ragdoll.js:59` | same for `armR` | **YES** |
| 3 | `ragdoll.js:227-229` | `const aL = armL.children` then `cap(aL[0],'shL','elL'); cap(aL[1],'elL','haL'); pin(aL[2],'haL')` | **YES** |
| 4 | `entity.js:1701` | `p.armR.children[2].material.emissiveIntensity` — haymaker fist blaze | **YES** |
| 5 | `entity.js:1712-1713` | `p.armL/armR.children[2].material.emissiveIntensity` — cast/charge fist glow | **YES** |
| 6 | `figure.js:100` | `applyFrame`: `for (const m of arm.children) { m.scale.x *= bulk; … }` | **YES, silently** — scales the inserted GROUP, which then compounds onto its children |
| 7 | `systems2.js:119-131` | `updateElastic`: iterates `arm.children`, caches `_el0`, volume-preserving stretch | **YES, silently** — would stretch the elbow group and double-apply to the forearm |

Contract B — **`legX.userData = { thigh, knee, shin, boot }`**, `figure.js:344`:

| # | Site | What it does |
|---|---|---|
| 1 | `ragdoll.js:56` | `pivots` includes `legL.userData.knee`, `legR.userData.knee` (they get zeroed) |
| 2 | `ragdoll.js:60-61` | `driven` includes `thigh`, `shin`, `boot` per leg |
| 3 | `ragdoll.js:227, 230-231` | `cap(uL.thigh,'hiL','kneeL'); cap(uL.shin,'kneeL','ftL'); pin(uL.boot,'ftL')` |
| 4 | `entity.js:1631` | `p.legL/legR.userData.knee.rotation.x = kneeL/kneeR` — the gait |
| 5 | `entity.js:1644` | kick: `p.legR.userData.knee.rotation.x = lerp(…, 0.1, gS)` — snaps the knee straight |
| 6 | `figure.js:104-106` | `applyFrame`: `u.knee.position.y *= S` (position only, **never scale**), then explicitly scales `[u.thigh, u.shin, u.boot]` |

Note the asymmetry: **the leg loop in `applyFrame` is already the correct pattern** (name the
meshes, move the joint group but never scale it). The arm loop is the naive one. Any arm
articulation must convert the arm to the leg's pattern.

Contract C — **`parts` key names**, read by:
- `systems.js:177` — `setSize` scales `['torso','head','pelvis','armL','armR','legL','legR','neck']`.
  ⚠ **`'neck'` is not in `parts`** (`figure.js:376`) — the neck is a child of `torso`
  (`figure.js:218`). That loop entry has never done anything. Harmless today because the neck
  inherits the torso's scale, but it is a dead key that reads as intent.
- `whiteroom.js:436-439` — `_dummySkin` hides everything under `g` except `_bagRig` and
  `groundRig`. Structure-agnostic; new pivots nested inside `armL`/`legL` are unaffected.
- `spaceflight.js:616-623` — builds a `figure()` for space-layer flyers and **does** scale the
  group (`obj.scale.setScalar(1.5)`, line 618). Legal there only because it hides `groundRig`
  (line 619) and never ragdolls.
- `opening.js:364` — calls `f._animate(dt)` directly during cold opens.
- `comic.js:284` — reads `f.parts.head` only as a truthiness test for balloon height.
- `game.js:1055-1058` — writes `parts.stateRing.material` for the psyche tint.
- `game.js:1095-1097` and `1126-1128` — the held-gear mesh is added to **`f.obj`** at a hard-coded
  `(1.55, 4.6, 1.1)`, i.e. **not on the fist**, so it does not follow any arm pose. (See §2.6.)

### 1.3 `frameOf` / `applyFrame` (`figure.js:55-110`)

`frameOf(def)` (`figure.js:65-85`) returns `{scale, bulk, broad, head, neck, stance}` from
`def.archetype` → `FRAME_ARCHETYPES` (55-63), else `def.frame`, else derived from
`def.strength` (71-75) with word-boundary regex overlays on role/title/blurb (80-83).
**MEASURED** frames: GALE `{scale 0.92, bulk 0.79, broad 0.90, stance 0.94}`, SOL `{1.12, 1.28,
1.24, 1.18}`, RAGE `{1.20, 1.42, 1.34, 1.28}`.

`applyFrame(P, F)` (`figure.js:90-110`) — the load-bearing law is in the comment at 86-89:
**it never touches `P.g.scale`.** What it does touch:
- `torso`/`pelvis`/`head`/`cowl`/`emblem`: `position.y *= S`, `scale` set (93-97)
- arms (98-101): `arm.position.x *= broad`, `arm.position.y *= S`, then **every child mesh** gets
  `scale.x *= bulk; scale.z *= bulk; scale.y *= S; position.y *= S`
- legs (102-107): `leg.position.x *= stance`, `leg.position.y *= S`, `u.knee.position.y *= S`,
  then `thigh`/`shin`/`boot` get the same four multiplies
- shells (109): `aura`/`guardArc`/`ice`/`cape` `position.y *= 1 + (S-1)*0.7`

⚠ `position.z` is never scaled — `boot.position.z = 0.2` and every weapon's z offset stay literal
at any frame scale. Minor today; more visible once a foot is articulated.

### 1.4 The ragdoll (`ragdoll.js`)

**MEASURED** (`rag.mjs`, RAGE): **15 particles · 20 bones · 6 pivots · 18 driven meshes**.

| thing | value | line |
|---|---|---|
| `GRAV` | −62 (matches world gravity) | `ragdoll.js:16` |
| `DAMP` | 0.986 | 17 |
| `ITER` | 12 relaxation iterations/step | 18 |
| `GROUND_FRICTION` | 0.42 | 19 |
| `GROUND_R` | `chest 1.25 · pelvis 1.15 · head 0.95 · shL/R 0.7 · hiL/R 0.75`, `DEFAULT_R 0.5` | 21-22 |
| `REST` | 15 named points, absolute local-to-feet coords + invMass | 26-36 |
| `BONES` | 20 `[a, b, stiffness]` | 38-46 |
| sleep | `energy < 0.03` sustained 0.45 s → `asleep` | 139 |
| `gravMul` | `0.88 + strength × 0.032` → STR 1 ≈ 0.91, STR 10 ≈ 1.20 | 104 |
| `dt` clamp | `[1/140, 1/45]` | 112 |

**REST bone lengths, MEASURED** from the table: `shL–elL 1.778 · elL–haL 1.809 · hiL–kneeL 1.501 ·
kneeL–ftL 1.011 · chest–pelvis 2.550`.

Lifecycle: `_ko()` at `entity.js:766-785` constructs `new Ragdoll(this, vel + (0,12,0))` (783);
`update()` at `entity.js:1111-1115` runs `step` then `apply` and returns before `_animate`, so
**`_animate` does not run on a corpse**; `_updateKO` at `entity.js:1171-1185` calls
`ragdoll.restore()` (1176) at 3.4 s (2.2 s for a dummy) then respawns.

#### The integration trick — why limbs are driven in world space with no reparenting

Three facts compose:

1. `apply()` sets `g.rotation.set(0, 0, 0)` (`ragdoll.js:210`) and `o.y = 0` (212). `g` is a
   plain `Group` whose scale is **1 by construction** — that is exactly what `applyFrame`'s
   refusal to scale the group buys (`figure.js:86-89`). So `g`'s world matrix degenerates to a
   **pure translation** by `g.position`.
2. `apply()` then zeroes every intermediate joint: `for (const v of this.pivots) { v.position.set(0,0,0);
   v.rotation.set(0,0,0); v.scale.set(1,1,1); }` (`ragdoll.js:214`), where `pivots = [armL, armR,
   legL, legR, legL.userData.knee, legR.userData.knee]` (56). Every transform between `g` and a
   driven capsule is now the **identity**.
3. Therefore the composed parent chain for any driven mesh is `translate(g.position)` and nothing
   else, so `worldMatrix(mesh) = translate(o) · localMatrix(mesh)` — i.e.
   **`mesh.local = mesh.world − o`**, exactly. `_orient` (`ragdoll.js:237-244`) can write
   `position = midpoint(a,b) − o` and `quaternion = rotationFrom(+Y → a−b)` straight from world
   particle coordinates, and `pin` (217) can write `position = p − o`.

No reparenting is needed because the *structure* is left alone and only the *transforms* are
flattened. That is what preserves every BUILDS decoration for free: a pauldron parented to `upper`
still rides `upper`, a weapon group parented to `fist` still rides the fist, because their parents
are being driven and the chain above them is identity. `_snap` (63) and `_pivotSnap` (64) then
restore the original local transforms exactly (252-256) — **MEASURED**: `kneeCap` world position
before ragdoll and after `restore()` both read `[-0.90, 1.37, 0]`, boot `[-0.90, -0.90, 0.20]`.

**Three corollaries the segmentation plan lives or dies on:**

- **C1.** A new joint GROUP that is not in `pivots` leaves a non-identity transform in the chain,
  and every capsule below it lands offset by that group's local position/rotation.
- **C2.** A new capsule that is not in `driven` keeps its *animation-pose* local transform inside
  a now-identity chain, so it snaps to `g.position + itsLocalOffset` — a limb piece detached from
  the body. **This bug exists today** (§1.6).
- **C3.** `_orient` writes position and quaternion but **not scale**, so a driven capsule keeps its
  `applyFrame` scale during ragdoll. That is deliberate (a heavy fighter's ragdoll limbs stay
  thick) but it is also why the capsules overshoot the bones — see §3.2.

### 1.5 `_animate` (`entity.js:1516-1894`) — what actually poses the rig

| beat | lines | writes |
|---|---|---|
| status tells (stars/zzz/woundPips/eyeMark) | 1518-1594 | lazily adds meshes to `this.obj` |
| yaw, shortest-path damped | 1598-1602 | `obj.rotation.y` |
| idle bob + landing crouch | 1604-1607 | `torso.position.y = 5.2 + bob + …− land*1.1`, `head.position.y = 8.0 + bob − land*1.1` |
| **run cycle** | 1608-1631 | `rc = sin(animT*12) * (moving ? 0.7 : 0.05)`; `hipL = rc`, `hipR = −rc`; `kneeL = 0.14 + clamp(rc,0,1)*1.5*mv` (the ~86°/1.5 rad knee bend, brief's "~68 deg"); flight `trail` lerps hips→0.44 knees→0.9; hover lerps knees→1.35/0.22; `land*0.9` crouch; §18 limp adds to `kneeR`. Final writes: `legL/legR.rotation.x` (1630) and `legL/legR.userData.knee.rotation.x` (1631) |
| arms: run swing / cast / punch | 1632-1639 | `armL/armR.rotation.x` and `.rotation.z` — **pivot only** |
| melee poses | 1640-1654 | `poseStrike` throw `−π*0.66*gS` (1643); `strikeIdx === 2` = **kick**: `legR.rotation.x → −1.25*gS` and `legR.userData.knee.rotation.x → 0.1` (straighten) (1644); guard `armX.rotation.x → −1.9`, `.z → ±0.6` (1648-1649); grab `→ −1.5`, `±0.22` (1652-1653) |
| `combatPose` gate | 1657-1658 | `max(cast, punch, gS, gG, gR, _bowDraw, meleeCharge>0)`; `flyArm = _flyPose * (1 − combatPose)` — **combat always wins over flight** |
| `_flyPose` | 1659-1668 | prone: `armR → −2.95` (lead fist past the head), `armL → 0.35`; hover: both `→ −0.22`, `.z ±0.4` |
| `_bowDraw` | 1669-1676 | `armL → −1.55`, `armR → −1.15`, `.z −0.45` |
| melee charge wind-up | 1697-1703 | `armR.rotation.x → 0.9 + ch*0.5`, `armR.children[2].material.emissiveIntensity` (1701), `torso.rotation.y → −0.35*ch` |
| fist glow | 1710-1713 | `armL/armR.children[2].material.emissiveIntensity` |
| **flight pitch/roll on `g`** | 1717-1729 | `p.g.rotation.x = damp(…, pitchT)`, `p.g.rotation.z = damp(…, rollT)` — this is why `g.rotation.order = 'YXZ'` (`figure.js:160`): with YXZ the parent composes `Ry·Rx·Rz`, so pitch and roll happen **along the facing axis** and a strafe reads as a bank, not a sideways roll |
| ground-rig counter-rotation | 1736 | `groundRig.rotation.x = −g.rotation.x; .z = −g.rotation.z` — order `'ZXY'` with `y = 0` composes `Rz(−roll)·Rx(−pitch)`, the exact inverse, **leaving yaw alone** (`figure.js:180`) |
| markers | 1747-1879 | `shadow`, `bandRing` (+ log altitude lift), `tether`, `faceWedge` (counter-rotates `facing − obj.rotation.y`), `stateRing` — all at `y = <rung> − pos.y + groundY` |

Footsteps (`entity.js:1347-1359`) are planted on the **sign flip of `sin(animT*12)`** — the same
sine the leg swing uses (1610). Any change to the gait's frequency desynchronises footstep audio.
The surface-height rungs are the shared `GROUND_LAYER` ladder in `core/util.js:92`
(`shadow 0.05 · stateRing 0.35 · bandRing 0.55 · faceWedge 0.75 · mark 0.95 · spacing 1.15`,
`DECAL_LIFT 0.35` at line 90).

### 1.6 Latent defects found while mapping (all relevant, all cheap to fix in this pass)

1. **`kneeCap` orphans on every KO.** `kneeCap` is a child of the `knee` GROUP (`figure.js:340`),
   the knee group is in `pivots` and gets zeroed (`ragdoll.js:56, 214`), and `kneeCap` is **not**
   in `driven` (`ragdoll.js:60-61`). **MEASURED** after 400 ragdoll steps: `kneeCap` world position
   `[0, 0.05, 0]` — the fighter's ground origin — while `shin` is at `[-0.73, 0.50, -0.04]`.
   Two stray 0.5-radius spheres sit at every corpse's feet. Invisible at iso range; a defect in
   third person. This is corollary **C2** already firing, and it is the single best argument for
   the rule in §2.1. (`delt` on `upper` and `hipCap` on `thigh` are safe — their parents are driven.)
2. **The standing pose's boots are below the ground plane.** **MEASURED** with the idle pose
   applied (`hip.rotation.x = 0`, `knee.rotation.x = 0.14`): boot bounding-box bottom at
   `y = −1.61` (GALE) · `−1.98` (SOL/TITAN) · `−2.13` (RAGE), while the contact shadow sits at
   `groundY + 0.05` (`entity.js:1749`) and `pos.y` is clamped to `groundY` when grounded
   (`entity.js:1363-1365`). So feet penetrate 30–40 cm of pavement at 1 u ≈ 0.19 m. The shadow
   disc drawn over the top is what hides it.
3. **`_pivotSnap` does not save scale.** `ragdoll.js:64` stores `{v, p, r}` only (**MEASURED**:
   `pivotSnap fields v,p,r`), `apply()` sets `v.scale.set(1,1,1)` (214), and `restore()` only
   copies position and rotation (254). `setSize` scales the arm/leg **pivots**
   (`systems.js:177-181`), so a size-changed fighter who dies comes back at pivot scale 1 — limbs
   snap to normal size while torso/head/pelvis stay giant. Adding pivots makes this worse.
4. **`parts._rimExtra` is read and never written.** `figure.js:153` iterates it in `setRim`; grep
   finds no writer anywhere in `src/`. It is precisely the hook for per-mesh **cloned** materials
   (the `glow.clone()` fists and boots at `figure.js:302, 341` never get rim), and it has been dead
   since it was added.
5. **`f._sizeLift` is written and never read.** `systems.js:184` sets it, `entity.js:238`
   initialises it, nothing consumes it. So a giant does not stand taller off the ground — which is
   the same family as defect 2.
6. **`'neck'` in `setSize`'s key list is dead** (`systems.js:177`; `neck` is not in `parts`).
7. **Ground markers are not driven during ragdoll** (except `shadow`, `ragdoll.js:57, 233`). Their
   local y still contains the `− pos.y` term from the last animated frame, and `apply()` forces
   `o.y = 0`, so a fighter KO'd at altitude leaves `bandRing`/`faceWedge`/`stateRing`/`tether`
   parked hundreds of units below the corpse. `groundRig`'s counter-rotation is also frozen at its
   last value, so a corpse from prone cruise has a tilted shadow. **Not verified visually** — see §6.

---

## 2. The segmentation plan

### 2.0 Reconciling "six new capsules"

The brief's arithmetic works out exactly once you count **articulated** segments rather than
meshes. Today: the arm is functionally **1** segment (no elbow, `figure.js:296-303`), the leg is
functionally **2** (knee exists, `figure.js:337`). Target 3 each →
`(3−1)×2 arms + (3−2)×2 legs = 4 + 2 = ` **6 newly articulated limb segments per fighter**.
That is my reading, and it is the one I plan against. Mesh-wise the same work adds
**6 new joint Groups** (elbow ×2, wrist ×2, ankle ×2) and — if you also want a palm distinct from
the knuckles and an instep distinct from the heel — **4 new capsules** (`hand` ×2, `foot` ×2).
Flagging that as interpretation, not fact.

Ordered by value per unit of risk:

- **Phase A — the elbow (2 groups, 0 new capsules).** Highest payoff by a wide margin: it is the
  only limb in the game with no mid-joint and the one the brief's "mannequin" complaint actually
  describes. Reparents existing meshes; no new geometry, no new material, no ragdoll particles.
- **Phase B — the wrist + a real hand (2 groups, 2 capsules).** Makes the fist read as knuckles on
  a hand rather than a ball on a stick, and gives `game.equipFrom` somewhere honest to mount a
  weapon (§2.6). Needs 2 ragdoll particles.
- **Phase C — the ankle + a real foot (2 groups, 2 capsules).** Fixes defect §1.6-2 in the same
  breath: an articulated ankle is where you put the sole so it lands at `y ≈ 0`. Needs 2 ragdoll
  particles.

### 2.1 The rule to write into `figure.js`'s header comment

> Anything parented to a JOINT GROUP must be listed in the ragdoll's `driven` array, or
> re-parented onto a driven mesh. A joint group's transform is zeroed during ragdoll; a child
> that nothing drives collapses to the group origin.

That is the generalisation of the `kneeCap` bug (§1.6-1), and with six new joint groups it is the
rule that decides whether this ships clean.

### 2.2 New hierarchy

```
armL / armR   PIVOT (shoulder)  ±1.58×broad, 6.72×S
├── upper  Capsule(0.52, 1.5)   y −1.05          [unchanged mesh, unchanged parent]
│    └── delt / pauldron / spike                  [unchanged]
└── elbow  GROUP                y −2.10           ← NEW joint (was the implicit gap)
     ├── fore  Capsule(0.46, 1.5)  y −0.75        [MOVED: was pivot child at y −2.85]
     │    └── gaunt cyl + band / shield           [unchanged, rides `fore`]
     └── wrist GROUP               y −1.60        ← NEW joint
          ├── hand  Capsule(0.30, 0.42)  y −0.26  ← NEW capsule (the palm)
          └── fist  Icosahedron(0.66)    y −0.62  [MOVED: was pivot child at y −3.85]
               └── gun / blade / buildWeapon()    [unchanged, rides `fist`]

legL / legR   PIVOT (hip)       ±0.7×stance, 3.0×S
├── thigh Capsule(0.56, 1.5)  y −0.95            [unchanged]
│    └── hipCap                                   [unchanged]
└── knee  GROUP                y −1.9             [unchanged]
     ├── shin    Capsule(0.5, 1.3)  y −0.85       [unchanged]
     ├── kneeCap Sphere(0.5)        y 0.05        ⚠ RE-PARENT onto `shin` (fixes §1.6-1)
     └── ankle GROUP               y −1.70        ← NEW joint
          ├── foot  Capsule(0.26, 0.52) y −0.28 z 0.18   ← NEW capsule (the sole/instep)
          └── boot  Capsule(0.58, 0.7)  y −0.15 z 0.2    [MOVED under `ankle`]
               └── toe                             [unchanged]
```

The y offsets above are **GUESS** — derived by preserving today's world positions
(**MEASURED** on GALE: shoulder 6.18, upper 5.22, fore 3.56, fist 2.64; hip 2.76, thigh 1.89,
knee 1.01, shin 0.23, boot −0.69) and splitting the gaps at the geometric joint. They must be
re-derived numerically so that with all new joints at rotation 0 the rig is **bit-identical** to
today's — that is the only way to be sure nothing in `_animate` shifted.

### 2.3 New contracts

Convert the arm to the leg's pattern and keep both:

```
armL.userData = { upper, delt, elbow, fore, wrist, hand, fist }
legX.userData = { thigh, knee, shin, kneeCap, ankle, foot, boot }   // knee, thigh, shin, boot keys UNCHANGED
```

Contract B is purely **additive** — `thigh`/`knee`/`shin`/`boot` keep their meanings, so all six
leg readers (§1.2) keep working with no edit. Only `ragdoll.js` and `applyFrame` need to learn the
new keys.

Contract A **must break**, because inserting the elbow changes `children[1]`. Seven sites, all
small:

| site | change |
|---|---|
| `ragdoll.js:58-59` | `driven`: use `u.upper, u.fore, u.hand, u.fist` |
| `ragdoll.js:56` | `pivots`: add `u.elbow, u.wrist` per arm and `u.ankle` per leg |
| `ragdoll.js:227-229` | `cap(u.upper,'shL','elL'); cap(u.fore,'elL','haL'); cap(u.hand,'haL','fgL'); pin(u.fist,'fgL')` |
| `entity.js:1701` | `p.armR.userData.fist.material…` |
| `entity.js:1712-1713` | `p.armL/armR.userData.fist.material…` |
| `figure.js:98-101` | rewrite the arm loop on the leg's pattern (§2.4) |
| `systems2.js:119-131` | iterate `[u.upper, u.fore, u.hand]` explicitly instead of `arm.children` |

Recommend also exposing `parts.fistL` / `parts.fistR` shortcuts so the two `entity.js` glow sites
read as intent rather than as a path walk. **Do not** leave `children[0..2]` "working by luck" via
ordering — a Group at index 1 that quacks like a mesh is exactly how the duplicate-`Weather`-class
failure happens.

### 2.4 Not breaking `applyFrame` — and why the group is never scaled

`applyFrame` deliberately reshapes **meshes**, never `P.g` (`figure.js:86-89`). Two reasons, both
load-bearing:

1. **Ground markers.** `shadow`/`bandRing`/`tether`/`faceWedge`/`stateRing` are children of
   `groundRig`, itself a child of `g` (`figure.js:181-212`), positioned at **absolute world
   offsets** on the shared `GROUND_LAYER` ladder (`core/util.js:92`). Scaling `g` by 1.2 would make
   RAGE's contact shadow 3.6 u across instead of 3.0, push `faceWedge` to y 0.90, and break the
   `− pos.y + groundY` arithmetic `_animate` uses to pin them (`entity.js:1749, 1775, 1842, 1867`).
   The markers are a HUD in world space; a HUD must not scale with the thing it annotates.
2. **The ragdoll.** `mesh.local = mesh.world − o` (§1.4) holds **only** while `g` has unit scale.
   Scale `g` and every `_orient`/`pin` write would need dividing by that scale, and `GROUND_R`
   / `REST` would have to be scaled too.

So the new limbs obey the same discipline, mirroring `figure.js:104-106` exactly:

- **New joint GROUPS (`elbow`, `wrist`, `ankle`): scale `position.y` by `F.scale` ONLY. Never
  touch `group.scale`.** Scaling a group compounds into its children and would double-apply
  `bulk`/`S` down the chain — that is the trap the existing arm loop (`figure.js:100`) walks into
  the instant a group appears among `arm.children`.
- **New CAPSULES (`hand`, `foot`): the standard four multiplies** —
  `scale.x *= bulk; scale.z *= bulk; scale.y *= S; position.y *= S`.
- Because the whole chain's offsets are along Y and each local y is multiplied by the same `S`,
  the composed chain scales consistently. **Except `position.z`**, which `applyFrame` never
  scales: `boot.position.z = 0.2` and the new `foot.position.z` will not grow with the frame. For
  a foot — the one part where a z offset is anatomy, not decoration — that is worth fixing here
  (scale z offsets by `S` too) but it is a **behaviour change to existing boots** and should be
  called out rather than slipped in.

### 2.5 Not breaking BUILDS signature pieces

The BUILDS law (`figure.js:247-249`) is "every one mounts on a DRIVEN mesh so poses and the
ragdoll carry them for free." The plan preserves it by **never changing a decoration's parent**:

| piece | parent today | parent after | driven after? |
|---|---|---|---|
| helmet/crest/band/horns/hood/mane/visor/jaw/eyes | `head` (`figure.js:236-291`) | `head` | yes (`ragdoll.js:222`) |
| collar/wings/tank/hose/neck | `torso` (217-280) | `torso` | yes (219) |
| belt/coat | `pelvis` (230-284) | `pelvis` | yes (220-221) |
| delt/pauldron/spike | `upper` (299-307) | `upper` | yes |
| gaunt cyl+band, shield | `fore` (308, 318-321) | `fore` (now under `elbow`) | yes |
| gun ×3, blade, `buildWeapon()` group | `fist` (310-323) | `fist` (now under `wrist`) | yes |
| hipCap | `thigh` (336) | `thigh` | yes |
| **kneeCap** | **`knee` GROUP (340)** | **`shin`** | **yes — the fix** |
| toe | `boot` (343) | `boot` (now under `ankle`) | yes |

The only structural edit to a decoration is re-parenting `kneeCap` from the knee group onto `shin`,
which fixes §1.6-1. Everything else moves as a subtree with its driven parent, which is precisely
what the zeroed-pivot trick was designed to allow.

⚠ One real consequence: a weapon on the fist now hangs off **three** joints (shoulder → elbow →
wrist) instead of one. A 4.8 u spear (`figure.js:440-443`) will swing much further for the same
shoulder rotation. Melee reach is data (`data/martial.js`; `melee.js` reads the table, grep shows
melee.js touches no `parts`), so nothing breaks mechanically — but **the visual and the hitbox will
diverge more than they do now**, and the bow-draw pose (`entity.js:1672-1675`) and the prone-cruise
lead fist (`−2.95`, line 1661) are hand-tuned against a rigid arm and **will need re-tuning**.

### 2.6 Two things that get better for free

- **Held gear can finally mount on the hand.** `game.js:1096-1097` and `1127-1128` add the gear
  mesh to `f.obj` at a literal `(1.55, 4.6, 1.1)`, so a scavenged carbine floats beside the body
  and ignores every arm pose. With a real `hand` mesh, `equipFrom` should `hand.add(mesh)` — the
  same route BUILDS weapons already take (`figure.js:322-323`), which also makes it ragdoll-correct
  for free. (Out of scope, but it is the same one-line change.)
- **`_rimExtra` gets its first writer.** If the new capsules reuse the shared `suit`/`suit2`/
  `skinMat` materials (which they should — that is what carries hit flash `entity.js:1891-1893`,
  phase transparency `1707`, and the rim `figure.js:375`), nothing is needed. If a `hand` wants
  `skinMat` and a `foot` wants a `glow.clone()` like `boot` (`figure.js:341`), register the clone in
  `parts._rimExtra` so `setRim` (`figure.js:150-154`) reaches it. **Prefer shared materials** —
  material count is already 21.1 average (**MEASURED**) and every clone is one more program
  variant to keep in the cache (`customProgramCacheKey` at `figure.js:132` keys all rim materials
  to the single string `'wwa-rim'`, so shared materials cost nothing extra).

### 2.7 Animation work (the part that actually delivers the look)

Segmentation without animation is six more static offsets. The joints need drivers in `_animate`:

- **Elbow.** Today `armX.rotation.x` alone. Needs a two-bone solution: a bend proportional to the
  shoulder swing during the run cycle (opposite phase to the hip, `rc` at `entity.js:1610`), a
  deep bend on the guard pose (currently `armX.rotation.x → −1.9`, `1648` — a guard with a straight
  arm is the mannequin), a snap-straight on the jab/haymaker release (mirroring the kick's
  `knee → 0.1` at `1644`), and a coil on `meleeCharge` (1697-1700).
- **Wrist.** Small: follow-through lag on the strike, and a locked wrist while a two-handed weapon
  is held (`oneHand` is already authored on armory rows per CLAUDE.md).
- **Ankle.** Toe-off / heel-strike keyed to the same `sin(animT*12)` the footstep audio already
  reads (`entity.js:1352`) — this is the one that makes a run stop looking like sliding, and it is
  free of a new clock because the sine is shared.
- **`combatPose` gate.** All new joint writes must sit inside the existing precedence
  (`entity.js:1657-1658`: combat beats flight) or a guard will be overridden by a hover pose.

---

## 3. The ragdoll extension

### 3.1 New point masses and bones

**+4 particles, +4 rigid bones, +4 soft braces recommended.**

New `REST` entries (positions **GUESS**, to be derived from the rig — see §3.2):

| name | role | rough rest pos | invMass rationale |
|---|---|---|---|
| `fgL` / `fgR` | knuckles (end of the hand bone) | `(∓2.2, 2.45, 0.25)` | 1.5 — lightest, whips furthest |
| `toL` / `toR` | toe (end of the foot bone) | `(∓0.82, 0.35, 0.75)` | 1.3 |

Existing `elL/elR` become the elbow proper and `haL/haR` become the **wrist**; `ftL/ftR` become the
**ankle**. Names stay, meanings shift by one joint — worth renaming (`wrL`, `anL`) in the same
commit so the file does not lie, since all readers are inside `ragdoll.js`.

New rigid bones (`stiffness 1`): `haL–fgL`, `haR–fgR`, `ftL–toL`, `ftR–toR` → **24 bones**.

New soft braces (recommended, `stiffness ~0.3`): `elL–fgL`, `elR–fgR`, `kneeL–toL`, `kneeR–toR`
→ **28 constraints**. Rationale: `BONES` (`ragdoll.js:38-46`) contains **only equality distance
constraints — there are no angle limits and no min/max anywhere.** A hand or foot on a single
distance constraint can invert through the wrist/ankle to 180° and settle there, which reads as a
broken doll rather than a dead body. The existing rig already leans on exactly this trick: the
`chest–hiL/hiR 0.34` (line 44) and `head–shL/shR 0.28` (45) braces are there to stop the torso
arching and the neck folding flat. Same medicine, two new joints.

`GROUND_R` (`ragdoll.js:21`) needs entries for the new points or they fall through to
`DEFAULT_R = 0.5` (22). `0.5` is right for knuckles; a toe wants ~`0.35` so a foot lies flat
instead of resting on a ball.

### 3.2 The risk nobody has priced yet — `REST` does not scale with the frame

This is the biggest hazard in the whole plan and it is pre-existing.

`REST` is 15 hand-written absolute positions (`ragdoll.js:26-36`) used raw at
`ragdoll.js:72-74`. **Nothing multiplies them by `frameOf(def).scale`.** Meanwhile every capsule
IS frame-scaled (`figure.js:100, 106`) and `_orient` never rescales it (§1.4 C3). **MEASURED**:

| | REST bone | rig bone (GALE, S 0.92) | rig bone (RAGE, S 1.20) | capsule length (RAGE) |
|---|---|---|---|---|
| thigh (hip→knee) | 1.501 | 1.75 | 2.28 | 3.14 |
| shin (knee→ankle) | 1.011 | 1.70 | 2.22 | 2.76 |
| upper arm (sh→el) | 1.778 | ~2.0 | ~2.36 | 3.05 |
| forearm (el→wrist) | 1.809 | ~1.9 | ~2.26 | 2.90 |

So today RAGE's thigh **capsule** is 3.14 long spanning a **1.50** bone — a 2.1× overshoot, and the
overshoot varies with frame scale. It works because the pieces are few and they overlap into a
continuous sausage; that overlap is what makes the settled ragdoll read as "natural."

**With eight bones per limb pair instead of four, the same overshoot stops hiding.** Shorter bones
+ unchanged capsule lengths = a hand capsule sitting most of the way up the forearm, a foot inside
the shin. Two options:

- **(a) Derive `REST` per fighter from the built rig.** At `Ragdoll` construction, read the actual
  world offsets of the joint groups (they are all along Y and already frame-scaled) and build the
  particle set from those. This is correct, it fixes the frame mismatch permanently, and it makes
  "giants settle higher" a consequence rather than an artefact. ⚠ It **changes ragdoll feel for
  every fighter** and invalidates the verified numbers in CLAUDE.md ("giants settle higher than
  lean fighters, 3.84 vs 2.94") — those will move and must be re-measured, not asserted.
- **(b) Keep `REST` fixed and shorten the new capsules to match.** Cheaper, lower risk, but bakes
  the mismatch in deeper and the *new* segments will be the wrong length on any non-1.0 frame.

Recommend **(a)**, in its own commit, verified before any new capsule is added — so that if the
ragdoll feel changes you know which change did it.

### 3.3 NaN and instability with more constraints

The solver is a Gauss–Seidel verlet relaxation: 12 iterations (`ragdoll.js:18`), each pass walking
all bones in order (125-135) and then calling `_collide` (136). Adding constraints in this scheme
does **not** create NaN by itself — the only division is by `d = _dir.length() || 1e-4` (129),
which is already guarded. Real risks, in order:

1. **Over-constraint softening.** Gauss–Seidel with a fixed iteration count converges more slowly
   as constraints multiply; 28 constraints at `ITER 12` will be *softer* than 20 are today, so
   bones stretch visibly under a hard launch impulse (which is clamped to ±60 horizontal, `y ≤ 20`,
   at `ragdoll.js:81-82`). Mitigation: raise `ITER` for the limb constraints only, or accept the
   softness (it reads as flesh, not as a bug). ⚠ Do not raise `ITER` globally without measuring —
   see 3 below.
2. **Coincident particles.** A brace between two points that the solver drives to the same position
   makes `_dir` zero-length; the `|| 1e-4` guard turns it into a huge `diff` and the pair explodes
   apart rather than NaN-ing. With four new short bones (`ha→fg` ≈ 0.6 u) this becomes reachable.
   Mitigation: keep every new rest length ≥ ~0.5 u and check `_dir.lengthSq() < 1e-8` → skip.
3. **`_collide` is inside the iteration loop** (`ragdoll.js:136`) — so collision runs **12× per
   step**, over every particle, over every cover box (195-203) plus every interior wall (184-193).
   **Cost scales linearly in particle count**: 12 × 15 = 180 point-tests today → 12 × 19 = 228
   (**+27%**), each multiplied by the cover count (79 pieces on a generated Tokyo per CLAUDE.md →
   ~14,200 AABB tests per ragdoll per frame today, ~18,000 after). This — not draw calls — is the
   real cost of the ragdoll half of this work, and it is per simultaneous corpse.
4. **⚠ The sleep threshold is an absolute SUM, not a per-particle average.** `energy += vx²+vy²+vz²`
   accumulated over every particle (`ragdoll.js:121`), tested as `energy < 0.03` (139). With 19
   particles the same residual jitter reads **27% higher**, so bodies will settle later or never
   sleep — and a ragdoll that never sleeps keeps paying the cost in item 3 forever. **Must be
   normalised** (`energy / nParticles`, or scale the threshold by `19/15`). This is the single most
   likely way the extension silently regresses performance.
5. **Non-finite guard.** `entity.js:1362` catches NaN in `pos`, and `_animate`'s tether write is
   explicitly guarded (`entity.js:1798-1824` — the "validate what is WRITTEN, not what went in"
   lesson). The ragdoll has no such guard; a NaN in a particle would propagate into
   `mesh.position` and blank the frame with no throw. Worth adding one finite check per step.

### 3.4 What the existing verification actually was

CLAUDE.md ("THE BODY FRAME") records: *"Ragdoll verified at both frame extremes: no NaN, giants
settle higher than lean fighters (3.84 vs 2.94), and `restore()` puts the framed proportions back
exactly."* I could not find a committed test for this — `src/bench/` contains only
`benchmark.js`, `companions.mjs`, `orphans.mjs`, `orphans.txt`, and grep for `Ragdoll` across
`src/bench/` returns nothing. So those numbers were measured ad hoc in a session and **there is no
regression guard.** I reproduced the shape of it (`rag.mjs`): 400 steps on RAGE → **0 non-finite
transforms**, `asleep === true`, and `restore()` returning `kneeCap` to `[-0.90, 1.37, 0]` and
`boot` to `[-0.90, -0.90, 0.20]` — both exactly their pre-ragdoll values.

**Recommendation: land the harness first.** A `src/bench/limbs.mjs` that runs headlessly under node
(no browser needed — `figure.js` and `ragdoll.js` both import cleanly, proven above) is the cheap
insurance that turns "verified once" into "cannot regress."

---

## 4. Cost

**Meshes.** **MEASURED** today: 38–52 per fighter (avg 43.2), 47–62 Object3D nodes.
Phase A adds **0 meshes** (+2 Groups). Phase B adds **2** capsules (+2 Groups). Phase C adds **2**
(+2 Groups). Full plan: **+4 meshes, +6 Groups per fighter → 42–56 meshes** (avg ~47), a **+9%**
mesh increase. Node count +10.

**Draw calls.** Fighters are individual meshes, not instanced, so every one of those 4 new meshes
is a draw call — but 4 calls against a scene where a generated Tokyo carries 79 cover pieces, 4
merged road classes, an instanced grass mesh, 64 birds + 40 litter, 64 pedestrians and the fog
plane. With at most ~8 fighters live plus police, that is **+32 draw calls worst case**. Not
material. The relevant comparison: a single fighter already costs 38–52 calls, so the marginal
fighter is ~10× more expensive than this entire change.

**Shadow casters.** **MEASURED**: 9–10 `castShadow` meshes per fighter today (torso, pelvis, head,
`upper` ×2, `thigh` ×2, `shin` ×2, plus cape / katana blade / claws where present). Shadow-map
draws are a **second** pass through the 1536² map (`world.js:36-37, 90-96`). **Recommend the new
`hand`/`foot` capsules do NOT cast shadows** — they are small, they sit inside the silhouette
already cast by `fore`/`shin`, and `fore` and `fist` do not cast today either (`figure.js:300-303`).
Adding shadow casters is the one place this change could actually cost frame time.

**Materials.** **MEASURED**: 19–23 unique materials per fighter (avg 21.1) — the base 5
(`suit, suit2, glow, skin, armor`, `figure.js:376`) plus ~15 `glow.clone()` / one-off decoration
materials. **If the new capsules reuse the shared materials, material count does not move at all.**
If they clone (following `boot`'s `glow.clone()` at `figure.js:341`), it is +4 per fighter and
each clone must be registered in `parts._rimExtra` (`figure.js:153`) or it silently loses the rim.
**Reuse. Do not clone.**

**The light-count law is NOT affected.** That law (CLAUDE.md; `vfx.js` fixed pool of 14
`PointLight`s always visible) is about the *number of visible lights* baking into every material's
program cache key. This change adds no lights and changes no light's visibility. Program count is
also safe: `applyRim` sets `customProgramCacheKey = () => 'wwa-rim'` (`figure.js:132`), so all
rim-injected materials share one program variant regardless of how many meshes use them — as long
as the new meshes use materials that went through `applyRim` (`figure.js:375` covers
`suit, suit2, skinMat, armor`; note `glow` is **not** in that list).

**Ragdoll CPU.** The real cost, and it is per live corpse: +27% on the collision inner loop
(§3.3-3), which is 12 iterations × particles × cover boxes. Plus the sleep-threshold trap (§3.3-4)
which could turn a bounded cost into an unbounded one.

**Geometry.** +4 `CapsuleGeometry` per fighter, disposed by the existing
`this.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); … })` at `entity.js:357`. No new
dispose path needed.

---

## 5. Verification recipe (headless)

Two harnesses, because the two halves fail differently. Both run under node with no browser — I
proved `figure.js`, `ragdoll.js` and `data/characters.js` all import cleanly that way.

### 5.1 `src/bench/limbs.mjs` — structure, frame and ragdoll (node, no display)

Assert, over **all 52 heroes** (not one):

**A. Identity at rest — the migration is a no-op.** Snapshot every mesh's **world** position and
quaternion with today's code, then again after segmentation with all new joints at rotation 0.
Assert **worst-case delta < 1e-6** per mesh. This is the one assertion that proves the reparenting
did not move anything, and it is worth more than every other check combined.

**B. Contracts exist and are populated.** For every hero: `armX.userData` has all seven keys and
each is a live `Object3D`; `legX.userData` still has `thigh/knee/shin/boot` **plus** the new keys;
`parts.fistL/fistR` resolve to the same objects as `armX.userData.fist`. Assert `chips.length > 0`-style
**self-proof first**: `assert(ROSTER.length === 52)` before asserting anything about them (the
`[].every()` law — a suite that iterates an empty list reports green).

**C. `applyFrame` did not scale a joint group.** For every hero, every new joint group:
`group.scale.equals(1,1,1)` exactly. And for the frame extremes (GALE 0.92, RAGE 1.20) assert the
composed world chain is monotonic: shoulder.y > elbow.y > wrist.y > fist.y, hip.y > knee.y >
ankle.y > toe.y.

**D. The foot lands on the floor.** With the idle pose applied
(`hip.rotation.x = 0`, `knee.rotation.x = 0.14`), assert the **sole mesh's bounding-box min.y is
within ±0.15 of 0** for every hero. Today this reads **−1.61 (GALE) → −2.13 (RAGE)** — MEASURED,
so this assertion starts red and turning it green is the fix for §1.6-2.

**E. Mid-run.** Drive `_animate` through a real gait — set `vel` to walk speed, step `animT`
across a full cycle at `sin(animT*12)` extremes — and assert: (i) the elbow bend is non-zero and
**opposite in phase** to the shoulder swing; (ii) the ankle angle changes sign exactly twice per
cycle and its zero crossings coincide with the footstep sine (`entity.js:1352`) within one frame —
this is what stops footstep audio desyncing; (iii) no mesh's world y goes below `−0.2`.

**F. Mid-kick.** `strikeIdx = 2`, `poseStrike = 1` (`entity.js:1644`). Assert the kicking knee
straightens toward 0.1 **and** the new ankle points the toe (a kick with a floppy foot is the
mannequin in a different pose). Assert the kicking foot's world position is forward of the pelvis.

**G. Ragdoll.** For frame extremes and 3 mid heroes: construct `Ragdoll`, step 600 frames at 1/60,
then assert —
  - **0 non-finite** values across every mesh's position/quaternion/scale (my `rag.mjs` pattern);
  - `asleep === true` (this is the sleep-threshold regression guard, §3.3-4) and record the frame
    it slept on, comparing against a stored baseline;
  - **every mesh in the figure is within `bodyRadius` of at least one particle** — this is the
    generalised `kneeCap` guard (§1.6-1, corollary C2). Today it fails on `kneeCap`
    (**MEASURED** at world `[0, 0.05, 0]` while the shin was at `[-0.73, 0.50, -0.04]`), so it too
    starts red and going green is the fix;
  - no bone stretched beyond 1.35× its rest length at any point during the fall (the
    over-constraint softening guard, §3.3-1);
  - `driven.length` and `pivots.length` match the expected counts (18→22 driven, 6→12 pivots), so
    a new capsule cannot be added to the rig and forgotten in the ragdoll.
**H. `restore()` is exact.** Snapshot every mesh's local position/quaternion/**scale** before
`_ko()`; after `restore()` assert bitwise equality on all three. ⚠ Include **pivot scale** — this
assertion catches the §1.6-3 bug (`_pivotSnap` stores only `{v, p, r}`, MEASURED) and will fail
until `_pivotSnap` saves scale. Run it once with `setSize(f, 1.8)` applied first, which is the case
that actually breaks.

**I. Cost.** Assert mesh count per hero ≤ 58, materials ≤ 25, `castShadow` meshes ≤ 10 (i.e. the
new capsules did not quietly become shadow casters), and print the min/avg/max so the numbers in
CLAUDE.md can be updated with measurements rather than recollection.

### 5.2 In-page — the picture, because tests cannot see "sausage links"

The ring's own lesson: *"the screenshot caught what six green assertions could not."* Structure
assertions cannot see a hand capsule sitting halfway up a forearm.

- Freeze the sim per the documented recipe (`window.LSW = { game, hud, ROSTER }`; override
  `game.update = () => game.world.render()`), then pose and shoot.
- ⚠ **Borrow the news crew's POV camera** for a close perspective shot. `world.camera` is
  **orthographic** (`world.js:55`), and CLAUDE.md records that cloning
  `world.camera.constructor` with perspective args builds a degenerate frustum that renders into a
  six-pixel strip and "looks exactly like a broken shader."
- ⚠ **Clear scissor and viewport before posing** — the news camera leaves a 320×180 scissor rect on
  the renderer, and a manual `world.render()` outside the frame loop inherits it, returning a black
  frame with one lit corner.
- ⚠ Read the drawing buffer with `toDataURL` **in the same task as the render**; a DOM screenshot
  captures overlays sitting on the canvas.
- Shots that matter: idle from ~14 u (does the elbow read?), mid-stride at the sine extreme (do the
  feet plant?), guard pose (bent arms?), mid-haymaker, a settled ragdoll from close range, and the
  same frames on GALE (0.92) and RAGE (1.20) so the frame extremes are eyeballed, not assumed.

---

## 6. What I could not verify

1. **The whole premise: there is no third-person camera.** `world.js:55` is the only camera and it
   is orthographic. I cannot measure or screenshot the payoff, and I cannot confirm that a knee or
   an elbow is what actually reads badly up close — that judgement is currently unavailable to
   anyone, including the person who filed it. **Consider building the camera first**, even crudely,
   so the segmentation work has a picture to be judged against.
2. **The brief's "~68 deg" knee bend.** The code computes `kneeBase 0.14 + clamp(rc,0,1)*1.5*mv`
   (`entity.js:1615-1616`) where `rc` peaks at 0.7 while moving — so the peak is `0.14 + 1.05 ≈
   1.19 rad ≈ 68°`. That reconciles, but only for the run cycle; flight `trail` reaches 0.9 and
   hover reaches 1.35 rad (77°) (`entity.js:1619, 1623`). I did not step a live gait to confirm the
   peak is actually reached (my measurements set the pose by hand).
3. **All proposed y offsets in §2.2 are arithmetic on measured world positions, not tuned values.**
   They must be re-derived so assertion 5.1-A passes; I did not compute them to the precision that
   would require.
4. **Whether `REST` option (a) preserves ragdoll *feel*.** I proved a 400-step settle is finite and
   sleeps; I have no way to judge whether a per-fighter `REST` still looks like a body falling. That
   needs a human watching it.
5. **Ragdoll CPU numbers.** The +27% figure is arithmetic from the loop structure
   (`ragdoll.js:124-137`), not a profile. And per CLAUDE.md, CPU timing around `render()` measures
   submission, not GPU work, and a hidden/backgrounded pane early-outs of rendering entirely —
   so this must be measured in a foregrounded tab with real corpses on a generated city.
6. **Ground markers on a corpse (§1.6-7).** I reasoned it from `apply()` forcing `o.y = 0`
   (`ragdoll.js:212`) while `_animate` never runs on a corpse (`entity.js:1113`), leaving marker
   local y containing a stale `− pos.y` term. I did not render a corpse to confirm what it looks
   like, and I did not check whether `_vis` gating hides it anyway.
7. **Whether anything outside `src/` reads the rig contracts.** I grepped `src/` only. `electron/`,
   `docs/` and `src/tool/` were not swept for `children[0..2]` / `userData.thigh`.
8. **`spaceflight.js:618` scaling the group.** It hides `groundRig` (619) and never ragdolls, so it
   looks safe, but I did not run a space crossing with a segmented figure to confirm the new nested
   joints survive a `setScalar(1.5)` on `g`.
9. **`printpass.js` / vertex-AO interaction.** The print pass is a full-screen pass and the vertex
   AO is baked into `tower()` geometry, so neither should care about figure meshes. Not verified.
10. **Netplay.** `netplay.js` was not read. If a remote puppet's pose is serialised joint-by-joint,
    six new joints is a wire-format change. Grep showed no `parts.` reads there, which is weak
    evidence, not proof.
