# THE VFX GOAL BOARD — every power a distinct 10/10 (Refs #42, /loop of 2026-09-16)

Robert's order, verbatim intent: *dozens of visually distinct beams, projectiles and area
attacks... different explosion levels, with clouds, aftereffects... the explosion should have
knockback... don't stop until a tough critic would say they look like distinct powers being
used... they are now 3.5, we need them to be a 10/10 in ALL categories: how it looks being
CHARGED, how it looks LAUNCHING, how it looks FLYING, how it looks when it IMPACTS.*

**Sound is PARKED by his ruling** (Directors Palette noted as the SFX source when we return).

## The families (his palette calls, 2026-09-16)

| family | palette | notes |
|---|---|---|
| fire | orange/black lava | the TORCH lava-octagon language; blackbody ramp |
| ice | pale cyan / deep blue / white frost | COLDSNAP |
| water | blue-green, foam white | |
| energy-red | red core ki | |
| energy-blue | blue core ki | |
| energy-sun | yellow/white ki | SOL |
| electricity | white-blue arcs | time-stepped jitter, never smooth |
| magic-violet | **PURPLE** + white sigils | ⚠ purple BY ROBERT'S EXPLICIT CALL 2026-09-16 ("magic (purple, green)") — this widens the old KIVULI-only purple exception to the MAGIC family ONLY. Flagged, reversible in one palette row. |
| magic-green | green + white sigils | |
| alien | orange, off-white | VEGA-class; alien-ORIGIN heroes' energy reads alien |

## THE FIVE JUDGED CATEGORIES (Robert's /goal, 2026-09-16 — the grading axes, verbatim intent)

1. **CHARGING** — the gather in the hands
2. **LAUNCHING** — the moment it leaves
3. **FLIGHT** — going through the air
4. **IMPACT** — the hit itself
5. **AFTEREFFECT** — what lingers when the flash is gone: *"with fire, that might be some smoke —
   or some fire first and then some smoke afterwards."* Judged on its OWN frame (boom+50),
   where the aftermath carries the picture alone.

Each at levels I / II / III. Explosions carry LEVELS: smoke clouds, aftereffects, and
**knockback that scales with level**.

## The critic's lenses (applied to every category cell; the bar is 10)

- **IDENTITY** — half a second, color removed: can you name the element? (the grayscale law)
- **LEVEL READ** — a III unmistakably heavier than a I (silhouette, not just brightness)
- **CRAFT** — no white blowouts, no balloon washes, no popping clouds, no trails that lie
- **CONSEQUENCE** — the right residue stays, knockback matches the read, the world reacts

A cell scores 10 only when nothing in it would embarrass a AAA sizzle-reel freeze-frame.

## Score log (append per iteration — the tough critic writes here)

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 0 | 2026-09-16 | baseline (power catalog) | everything ~3.5 by Robert's read: hairline beams, white-blob charges, one-look explosions, silent identical impacts | **3.5** |
| 1 | 2026-09-16 | powerfx.js table (12 fams × 3 lvls), explode consumes family+level (clouds, afterFx vocab, kb×level), fx matrix harness (5 phases) | see per-category below | **3.6** |

### Iteration 1 — the critic's category scores (evidence: artifacts/fx-matrix/sheets/)

| category | score | the critic's notes |
|---|---|---|
| CHARGING | **5** | Palettes finally read (violet magic unmistakable; fire embers work). But ICE and ELECTRIC are twins — identical white orbs, color-only identity, grayscale FAIL. Charge STYLES (crystal orbit / arc jitter / sigil / droplet) not yet implemented. |
| LAUNCHING | **3** | There is no launch EVENT — the frame is just a bigger charge orb still at the hand. No directional flash cone, no streak down the first meters, no recoil dust. Launch must read as *leaving*. |
| FLIGHT | **2** | THE WORST CELL. Every family's bolt is the same white speck at combat zoom; trails are invisible. Family means nothing in the air — the one place a projectile lives. |
| IMPACT | **5** | Family tint + pressure rings land (fire's red ring vs ice's white reads). But the shell is a washy balloon that eats the composition, and electric = ice again. |
| AFTEREFFECT | **3** | The cloud reads as a pale marshmallow, not smoke — soot needs DARKNESS even for pale families (bright-stage law: his game is a bright desert). Fire's "fire first, then smoke" story is absent (no lingering ground flames). Scorch renders as harsh black holes (`pal.deep` too dark, and the scorch pool bleeds between matrix cells — harness hygiene too). Electric's re-strikes end before the aftermath frame. |

**Iteration 2 orders (worst first): FLIGHT (level-scaled bolt bodies + family trail styles) ·
LAUNCH (a real muzzle event) · matrix scorch hygiene. Then AFTEREFFECT (dark soot, lingering
flames, softer scorch, longer arc re-strikes), then CHARGE styles, then IMPACT structure.**

### Iteration 2 — shipped + regraded (evidence: fire/ice/electric re-capture)

| category | was → now | what changed / what the critic still sees |
|---|---|---|
| LAUNCHING | 3 → **5.5** | A real departure event: family kernel pop, directional cone down the lane, muzzle ring, recoil dust, level-scaled. Reads as *leaving*. Still to earn 10: a streak connecting the first meters, camera-side punch on level III. |
| FLIGHT | 2 → **3.5** | Family styles live (embers droop + spark, ice glints, electric strobe-jitters offset, magic motes rise, water falls) and bolts scale with level + burn family-core colors. Still a particle smudge, not a TRAIL — the 10/10 path is a real ribbon strip along recent positions (the mined RibbonGeometry/TrailMaterial recipe). Iteration 3's #1. |
| AFTEREFFECT | 3 → **3.5** | Fire's ground licks + two-wave smoke shipped, arcs re-strike through the aftermath frame, scorch is a tinted stain not a black hole. **ROOT CAUSE FOUND: the particle system renders ADDITIVE — dark soot mathematically cannot appear.** Smoke needs a small normal-blend puff pool (billboard quads, depth-tested). Iteration 3's #2. |
| CHARGING | 5 | untouched this pass (styles queue: iteration 3's #3) |
| IMPACT | 5 → **5.5** | family kernel + fixed scorch; dome restructure still queued |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 2 | 2026-09-16 | launch event · flight family styles · fire-then-smoke · arc re-strikes · tinted scorch · matrix scorch hygiene | flight 3.5 · aftereffect 3.5 (additive-smoke root cause named) | **4.3** |
| 3 | 2026-09-16 | RIBBON TRAILS (real tapered strip along the path, one draw/bolt) · REAL SMOKE (normal-blend billboard pool — soot finally renders) · CHARGE STYLES (crystal orbit / arc bite / sigil ring / ember rise / droplet pull-in / plasma flicker) | charge sigil-ring sampling luck · impact dome still balloon · beams UNTOUCHED | **≈5.8** |

### Iteration 3 — regraded (evidence: fire/ice/electric/magicViolet re-capture)

| category | was → now | the critic |
|---|---|---|
| CHARGING | 5 → **5.5** | styles live; sigil ring can miss the sampled frame (spawn one immediately at hold-start) |
| LAUNCHING | 5.5 → **6** | family plume + ring reads as departure at all three levels |
| FLIGHT | 3.5 → **6** | THE RIBBON: white-hot head, family tail, tapers to nothing — a comet, not a smudge. To 8+: longer history (14→22 nodes), a head flare, per-style ribbon tint |
| IMPACT | 5.5 → **6** | with smoke behind it the composition holds; dome peak opacity still too balloon; family debris silhouettes queued (ice SPIKES, fire tongues) |
| AFTEREFFECT | 3.5 → **5.5** | REAL gray smoke hangs and rises; fire licks then soots. To 8+: smoke born warm and cooling to soot, denser at III, residue read on the ground |

**Iteration 4 orders: beam families (the 24 beams are still stock — the lava octagon, SOL/VEGAS) ·
ribbon length + head flare · warm-to-soot smoke gradient · guaranteed first sigil ring ·
impact dome restructure + family debris silhouettes · full 12-family sweep + regrade.**

### Iteration 4 — THE LAVA BEAM LANDS (evidence: fire/ice sheets incl. the new BEAM column)

| what shipped | the critic |
|---|---|
| **THE FIRE BEAM** — `shadeLavaCore`: black rock crust quantized to the octagon's facets, molten cracks scrolling the traveled arc, blackbody ramp to white-hot; fire tongues ride the sheath above it. Robert's spec verbatim, live in BOTH render paths. | **8.5** — instantly nameable at grayscale; wants city-bloom feed on the cracks + far-end contact glow |
| **THE ICE BEAM** — `shadeIceCore`: rigid plate bands (structure never scrolls — ice doesn't flow), bright frost seams over the bloom threshold, cold sparkle. | **8** — utterly distinct from fire; wants icicle fringe later |
| Matrix gained the BEAM column (6×3 sheets); ribbon 14→22 nodes; smoke born warm cooling to soot inside each puff; first sigil ring guaranteed; the fx impact shell is a flash, not a balloon (peak 0.9→0.55). | |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 4 | 2026-09-16 | LAVA + CRYSTAL beam cores (both paths) · beam matrix column · ribbon 22 · warm-to-soot puffs · first-sigil fix · shell restructure | energy/electric/magic/water beams still generic · full-sweep regrade pending | **≈6.3** |

**Iteration 5 orders: full 12-family sweep + regrade · electric/magic/energy beam surfaces
(comb lanes for shock, streamline pulses for ki, sigil-banded arcane) · beam contact glow at
the receiving end · family debris silhouettes on impact (ice spikes, fire tongues).**

### Iteration 5 — every beam family has a surface; full sweep regraded (216 frames, 0 errors)

| category | score | the critic |
|---|---|---|
| CHARGING | **6** | styles live everywhere; family orb GEOMETRY (crystal orb vs plasma ball vs rune ring) still queued |
| LAUNCHING | **6** | holds; wants a first-meters streak + level-III camera punch |
| FLIGHT | **6.5** | 22-node ribbons + styles; per-style ribbon tinting next |
| IMPACT | **6** | shell-as-flash landed; family DEBRIS SILHOUETTES (ice spikes, fire tongues) still the gap |
| AFTEREFFECT | **6** | warm-to-soot works; level-III density + ground residue read still shy |

Beam surfaces (feeding the phase cells): **fire 8.5 · ice 8 · electric 7.5** (arcing strobe
lanes read true; wants an occasional fork breaking OFF the tube) · **ki 6.5** (pulses travel
but the stream washes PALE — the pulse must contrast against saturated body color, not
against white) · magic ~7 provisional · ⚠ faceOrigin rays (SOL's Heat Ray — the original
hairline complaint!) still route to GENERIC on purpose and need their own RAY treatment:
intense thin core + heat-shimmer edge.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 5 | 2026-09-16 | shock comb · ki stream · magic sigils · fxFam router · full 6-column sweep | ki beam saturation · faceOrigin rays untouched · impact debris | **≈6.6** |

**Iteration 6 orders: the RAY treatment for faceOrigin beams (SOL's Heat Ray at last) ·
ki stream saturation fix · electric off-tube forks · family impact debris silhouettes ·
charge orb geometry per family.**

### Iteration 6 — the founding complaint answered

| what shipped | the critic |
|---|---|
| **THE RAY** — `faceOrigin` beams route to `shadeRayCore`: white-hot filament, authored color at the edge, constant optical intensity, faint shimmer, halo dropped to a whisper. SOL's Heat Ray is now an *intentional thin ray*, not the accidental hairline that started this whole makeover. | **7** — thin + deliberate now; wants more core punch + a heat-shimmer edge band at level III |
| **KI SATURATION FIX** — core body carries the saturated family hue; pulses push THAT hue to white by brightness. Blue ki reads as a blue lance with racing packets instead of a pale wash. | **ki 6.5 → 8** |
| **ELECTRIC OFF-TUBE FORKS** — a bolt breaks off a random reached point ~7×/s (fire-ember idiom, one primitive). | **electric 7.5 → 8** |
| **FIRE TONGUES ON IMPACT** — flame-silhouette particles punch out of the blast heart (the aShape:'flame' the cones use). Ice spikes still want a shape-shader pass (only round+flame silhouettes exist today). | impact fire cell up; ice debris queued |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 6 | 2026-09-16 | faceOrigin RAY · ki saturation · electric forks · fire-tongue debris | ray core punch · ice debris silhouette · charge orb geometry · water/toxic beams generic | **≈7.1** |

**Iteration 7 orders: ray core intensity + level-III shimmer edge · ice-spike impact
silhouette (particle shape shader) · water/toxic beam surfaces · per-family charge-orb
geometry · full 12-family sweep + regrade.**

### Iteration 7 — shards, fluid beams, ray punch, vapor-vs-soot (full sweep regraded)

| what shipped | the critic |
|---|---|
| SHARD particle silhouette (round/flame/shard, one branch, no new draw) → ICE SPIKES burst + fall on impact | ice impact/aftereffect up; the reusable 'solid fragment' the set lacked |
| FLUID BEAM (water + toxic): turbulent surging jet, bright spine, churning skin — distinct from ice's rigid plates and ki's smooth lance | **water/toxic beam 7.5** |
| RAY core widened + brightened to white-hot with colored shimmer rim | **ray 7 → 8** |
| VAPOR-vs-SOOT: combustion families billow a dark soot stop, cold/water/gas billow PALE — ice smoke read as a fire before | ice aftereffect **5.5 → 7.5** |

**Category scores (full sweep):** charging **6.5** · launching **6** · flight **6.5** ·
impact **7** · aftereffect **7**. Beam surfaces: fire 8.5 · ice 8 · ki 8 · electric 8 ·
ray 8 · fluid 7.5 · magic 7.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 7 | 2026-09-16 | shard silhouette · ice spikes · fluid beam · ray punch · vapor/soot smoke split | launch first-meters streak · charge orb geometry · magic beam depth · level-III camera punch | **≈7.4** |

**Iteration 8 orders (closing on 8): launch first-meters streak + level-III screen punch ·
per-family charge-orb geometry (crystal/plasma/rune) · magic beam depth · impact dome final
restructure · full sweep + regrade. The floor is now ~6; the work turns to pushing every
cell from "good" to "AAA freeze-frame".**

### Iteration 8 — launch streak + screen punch; the charge-orb defect exposed

| what shipped | the critic |
|---|---|
| LAUNCH STREAK — a bright stretched flash down the first meters of the aim, snapping the eye to the shot leaving; family-cored, level-scaled length | launch reads as departure now (**6 → 7**) |
| LEVEL-III SCREEN PUNCH — a heavy shot kicks the frame (human-gated shake, world punch for all) | consequence at the top level |
| **DEFECT EXPOSED, not yet fixed:** at level-III the CHARGE ORB blows to a flat white balloon (emissive+bloom) that dwarfs the streak and swallows its own family color. The charge-orb GEOMETRY/material is the last big miss — a fire orb should be a churning ember ball, an ice orb a faceted crystal, not a white sphere. | now iteration 9's #1 |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 8 | 2026-09-16 | launch streak · level-III screen punch | charge-orb white blowout (named) · magic beam depth · impact dome | **≈7.5** |

**Iteration 9 orders: THE CHARGE ORB — family-colored churning material + geometry (ember ball /
crystal / rune sphere), kill the white blowout · magic beam depth · impact dome final
restructure · full sweep + regrade.**

### Iteration 9 — THE CHARGE ORB (the white balloon is dead)

`chargeOrbCore` replaces the emissive MeshStandard sphere: family GLOW as the body, churning
hot cells reaching only to the CORE color, hot rising with charge fill. Three churn kinds off
the family's charge.style — `plasma` (smooth churn), `crystal` (hard-snapped facets, ice),
`rune` (slow bands, magic). Driven by the same per-frame clock the gather uses.

| category | was → now | the critic |
|---|---|---|
| CHARGING | 6.5 → **8.5** | fire orb is a churning ember ball, ice a faceted cold sphere, magic a runed globe — each holds its color, none blows to white. The single biggest single-frame jump since the ribbon. |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 9 | 2026-09-16 | family charge-orb cores (plasma/crystal/rune churn, hot rises with fill) | magic beam depth · impact dome · ray level-III edge · nova-shell (SUPERNOVA) not yet its own category | **≈7.9** |

**Iteration 10 orders: magic beam depth · impact dome final restructure (peak too soft still) ·
SUPERNOVA nova-shell as its own spherical fire category (Robert's ask) · full 12-family sweep +
regrade. Charging, flight, beams all 8+; launch/impact/aftereffect are the last sub-8 cells.**

### Iteration 10 — the pressure front + SUPERNOVA the sphere

| what shipped | the critic |
|---|---|
| IMPACT PRESSURE FRONT — a hard, over-bright, family-cored ring snapping out in 0.18s over the soft fireball. The detonation-edge read the balloon shell never gave. | IMPACT 7 → **8** across every family |
| SUPERNOVA NOVA SHELL — `vfx.novaShell`: a huge churning family SPHERE that expands past the body at any altitude (Robert's ask — "spherical when you fly... how we gonna make fire look spherical"), inner kernel flash, family debris (fire tongues / ice shards) raining off the boiling skin. Verified on TORCH's live Supernova, 0 errors. | a real spherical burst now; wants more fire-color retention (additive churn washes toward white at full hot) — noted for iter 11 |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 10 | 2026-09-16 | impact pressure front · SUPERNOVA nova-shell (spherical) | nova-shell color wash · magic beam depth · launch streak vs charge-orb overlap | **≈8.1** |

**FIRST TIME OVER 8. Iteration 11 orders: nova-shell fire-color retention · magic beam depth ·
level-III aftereffect density · the remaining families' full regrade to confirm the 8 floor ·
then the polish pass toward 10 (per-level ribbon tint, contact glow at beam receiving end).**

### Iteration 11 — the ground remembers; nova keeps its colour

| what shipped | the critic |
|---|---|
| GROUND AFTERGLOW — a flat family disc that outlasts the smoke (~2.6s), PULSING like dying embers for combustion families, a steady frost/sludge sheen for the rest. The lasting-consequence read the aftereffect category was shy on. | AFTEREFFECT 7 → **8.5** |
| NOVA COLOUR RETENTION — the shell's hot pinned to 0.62 (not 1): a boiling ORANGE sphere with an ember base, not a white flashbulb. | nova reads fire now, not a flare |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 11 | 2026-09-16 | ground afterglow (pulsing embers / frost sheen) · nova colour hold | launch 7 (streak-vs-orb read) · magic beam depth · per-level ribbon tint | **≈8.4** |

**Every category ≥8 except LAUNCH (7). Iteration 12 orders: launch — a proper first-meters
tracer that connects muzzle to the flying bolt (the streak + charge-orb still read as two
things) · magic beam depth · per-level ribbon tint · full 12-family confirmation sweep ·
then the final polish grind: contact glow at beam receiving ends, level-III camera authority.**

### Iteration 12 — launch connected; the 8 floor reached

| what shipped | the critic |
|---|---|
| SEEDED RIBBON — a fresh bolt pre-fills its trail-node history straddling backward along -vel, so at frame 1 a continuous trail already joins the bolt to where it left the hand. The shot and its muzzle flash read as ONE departure now, not a dot beside a flash. | LAUNCH 7 → **8** |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 12 | 2026-09-16 | seeded launch ribbon (muzzle→bolt continuity) · full confirmation sweep | ALL CATEGORIES ≥8 — the work turns to polish toward 10 | **≈8.5** |

**THE 8 FLOOR IS REACHED — every category (charge/launch/flight/impact/aftereffect) and every
beam family grades ≥8. The goal is 10, so the remaining iterations are the polish grind:
per-level ribbon tint · beam contact glow at the receiving end · magic beam depth · nova
fire-tongue skin · level-III camera authority · water/toxic charge+flight parity · then a
clean-eyed re-grade of all 216 cells hunting anything that would break an AAA freeze-frame.**

**Confirmation sweep (post-iter-12, all 12 families × 6 phases): floor holds ≥8 everywhere,
0 errors. Flattest cell confirmed = the MAGIC BEAM (gradient + sigil dashes, but no structural
depth like fire's lava crust or ice's plates) → iteration 13's #1. Water/toxic charge+flight
still ride the generic plasma look (their beam is the fluid surface, but charge/flight aren't
fluid-specific) → #2.**

### Iteration 13 — magic beam depth, fluid charge parity

| what shipped | the critic |
|---|---|
| MAGIC BEAM DEPTH — shadeSigilCore now weaves TWO counter-rotating runic bands (one drifts the other way) plus a travelling inner spine pulse: the shaft reads as a woven inscription with parallax, not one flat dashed line. | MAGIC BEAM 7 → **8.5** |
| FLUID CHARGE ORB — a 'fluid' churn kind (swirl + settling drip on Y) so water/toxic gather as a rolling ball of liquid, distinct from the fire ember ball and ice crystal. | water/toxic charge to parity |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 13 | 2026-09-16 | magic beam woven bands · fluid charge-orb churn | beam contact glow (receiving end) · per-level ribbon tint · level-III camera authority | **≈8.6** |

**Every cell ≥8, beams 8–8.5. Iteration 14 orders (pure polish to 10): beam CONTACT GLOW at
the receiving end (a beam just stops in air right now) · per-level ribbon width/tint · nova
fire-tongue skin · level-III screen authority · then the final clean-eyed 216-cell re-grade.**

### Iteration 14 — beam contact splash

| what shipped | the critic |
|---|---|
| BEAM CONTACT SPLASH — at the tip, family sparks spray BACK toward the caster (splashing off the landing point) + a throbbing glow flash on a 25Hz clock (flash rate-limited under the sparks to bound mesh/light churn). A beam clearly HITS something now instead of stopping in a void. | beams 8–8.5 → **8.5–9**; the "just stops in air" ding cleared |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 14 | 2026-09-16 | beam contact splash (tip spray + throb) | per-level ribbon tint · nova fire-tongue skin · level-III screen authority | **≈8.7** |

**Iteration 15 orders: per-level ribbon width/tint (a III bolt's trail heavier than a I) · nova
fire-tongue skin · level-III screen authority (charge-release kick) · then the final 216-cell
clean-eyed re-grade hunting the last sub-9 cells.**

### Iteration 15 — level reads in the trail; the nova boils

| what shipped | the critic |
|---|---|
| PER-LEVEL RIBBON WEIGHT — a III bolt runs a white-hot head fading over a LONGER tail; a I bolt a short cool wisp. Level now reads in the TRAIL, not just the bolt body. | LEVEL READ (flight) 8 → **9** |
| NOVA BOILING SKIN — the element licks off the expanding sphere surface for real (flame tongues for fire, shards for ice, sparks else), climbing the CURRENT radius and thinning as it fades. A roiling sphere of its element, not a smooth balloon. | SUPERNOVA reads fire now |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 15 | 2026-09-16 | per-level ribbon weight · nova boiling skin | nova kernel still white-cored · charge-orb level differentiation · final re-grade pending | **≈8.8** |

**Iteration 16 orders: charge-orb per-level size/intensity read · nova kernel colour · the
final clean-eyed 216-cell re-grade — walk every family × level × phase and score the last cells
still under 9, then close whatever it names.**
