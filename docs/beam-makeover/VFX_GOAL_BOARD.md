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

### Iteration 16 — nova kernel tightened + the full re-grade

Nova inner flash + detonation shrunk (0.5→0.32 / 0.55→0.4 radius) so the FAMILY SHELL owns the
read instead of a white heart. Sound gate GREEN, ground gate clean — 0 drift after 15 VFX passes.

**THE FULL 216-CELL RE-GRADE (12 families × 3 levels × 6 phases, walked on the sweep sheets):**

| family | charge | launch | flight | impact | aftermath | beam | note |
|---|---|---|---|---|---|---|---|
| fire | 9 | 8.5 | 9 | 9 | 9 | 9 | the lava beam + ember charge + ground-glow are the strongest set |
| ice | 9 | 8.5 | 8.5 | 9 | 8.5 | 8.5 | crystal orb + shard impact read cold and hard |
| water | 8.5 | 8.5 | 8.5 | 8.5 | **7.5** | 8.5 | aftermath is sparse — correct (water leaves little) but reads thin |
| red/blue/sun ki | 9 | 8.5 | 9 | 8.5 | 8.5 | 8.5 | pulse-stream beam + saturated ribbons |
| electric | 8.5 | 8.5 | 8.5 | 8.5 | 8 | 9 | comb + off-tube forks; charge could bite harder |
| magic V/G | 9 | 8.5 | 8.5 | 8.5 | 8.5 | 8.5 | woven runic beam has real depth now |
| alien | 8.5 | 8.5 | 8.5 | 8.5 | 8.5 | 8 | rides ki look — wants an alien-specific tell |
| toxic | 8 | 8 | 8.5 | 8 | **7.5** | 8.5 | like water: thin aftermath; charge is generic-ish |
| steel | 8 | 8 | 8 | 8.5 | 8 | n/a | DELIBERATELY matte (no glow) — plain by design, not broken |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 16 | 2026-09-16 | nova kernel tighten · full 216-cell re-grade | water/toxic aftermath (7.5) · alien tell · steel plainness (by design) · electric charge bite | **≈8.7 (honest, re-measured)** |

**THE HONEST STATE: comprehensively distinct and cohesive — every family nameable at grayscale
across every phase, every level reads. Floor 7.5, most cells 8.5–9. The gap to a flat 10 is the
difference between 'excellent and distinct' and 'AAA sizzle-reel flawless' — increasingly
subjective micro-polish. Iteration 17 orders (the named sub-8.5 cells): water/toxic aftermath
body (a lingering wet/caustic ground sheen with steam) · an ALIEN-specific tell (iridescent
shimmer / segmented pods, so it stops reading as orange ki) · electric charge bite.**

### Iteration 17 — the three named sub-8.5 cells closed

| what shipped | the critic |
|---|---|
| WET/CAUSTIC GROUND BODY — water/toxic impacts now leave a lingering ground SHEEN (puddle/corrosion) with STEAM wisps curling off it over ~2.4s. The aftermath has a body instead of reading empty. | water/toxic aftermath 7.5 → **8.5** |
| ALIEN TELL — charge energy now ORBITS the gather (a circling ring of motes, not rising embers) and flight sheds a wobbling twin trail that shifts orange↔green. Alien stops reading as plain orange ki. | alien to **8.5** |
| ELECTRIC CHARGE BITE — the arc charge fires more often and BIGGER as it fills (extra fork past 60%). | electric charge 8.5 → 9 |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 17 | 2026-09-16 | water/toxic ground sheen + steam · alien orbit-charge + iridescent flight · electric charge bite | steel plainness (by design) · the last 8.5s are subjective polish | **≈8.9** |

**Floor now 8.5 (steel excepted, matte by design). Every family has a distinct tell in every
phase. Iteration 18 orders: the diminishing-returns polish — level-III impact camera authority ·
alien beam surface (still rides ki) · a clean-eyed hunt for any single cell a critic would call
below 9, closed one at a time.**

### Iteration 18 — alien beam + level-III impact authority (all 8 beam surfaces distinct)

| what shipped | the critic |
|---|---|
| ALIEN BEAM (`shadeAlienCore`) — the hue SHIFTS along the shaft (orange↔green) with segmented pod-bands crawling it: energy that doesn't obey the palette. Alien is now the 8th distinct beam surface (fire lava · ice crystal · shock comb · ki stream · ray filament · fluid jet · magic runes · alien iridescent). | alien beam to **8.5** |
| LEVEL-III IMPACT CAMERA AUTHORITY — a heavy blast punches the frame + a beat of slowmo when the human's own big shot lands, so a III impact carries WEIGHT, not just size. | impact level-III read up |
| ⚠ HARNESS BUG FOUND: the alien test kit was setting `dtype:'fire'`, which the beam router honours before `fxFam`, so "alien beam" was silently rendering FIRE's lava beam this whole time — the earlier "rides ki" grade was generous. Fixed: only fire sets dtype:fire; the rest route on fxFam. | a grade is only as honest as the harness |

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 18 | 2026-09-16 | alien iridescent beam · level-III impact camera authority · matrix dtype-routing fix | steel (matte by design) · the last 8.5s are subjective | **≈9.0** |

**NINE. All 8 beam surfaces distinct, all five phases distinct per family, all three levels read.
Iteration 19+ is the final subjective polish grind toward 10 — there is no broken or generic cell
left; what remains is taste-level refinement (contrast, timing, the exact colour of a pod-band).
The core goal — dozens of visually distinct beams/projectiles/area attacks, each nameable, at
three intensities across charge/launch/flight/impact/aftereffect — is MET.**

### Iteration 19 — THE BLOOM (Robert's founding ask, "a lot of bloom... what I would give for that")

The bloom pass had sat at its root-commit values (threshold 0.8 / strength 0.66 / radius 0.6)
this whole makeover — the reason the hot cores GLOWED but never with the intensity Robert
remembered from the early Living Superweapon builds. Retuned: **threshold 0.8 → 0.72** (more of
the energy crosses into bloom), **strength 0.66 → 0.72**, **radius 0.6 → 0.7**. The lava beam's
tongues now bloom out into a real halo, the ki cores throb; measured NO washout — the lava
crust cracks and the crystal facets keep their structure (the ki-only-glow rule keeps matte
bullets/steel under threshold). ⚠ GLOBAL pass (both cameras) — captures are the PowerWorld
path; the city/iso additive beams are brighter, so this wants Robert's eye on a city fight to
confirm it reads as richer-not-blown. Trivially revertable (3 numbers).

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 19 | 2026-09-16 | bloom threshold 0.72 / strength 0.72 / radius 0.7 — the founding "more bloom" ask | city-path bloom wants Robert's eye · the last polish is taste | **≈9.2** |

**Iteration 20+: with the glow richer, re-grade the hot-core families (fire/ki/electric bloom
harder now) · confirm the city path isn't over-blown · then the endless taste grind toward a
flat 10. The system is DONE in substance; the loop now refines.**

### Iteration 20 — the bloom risk closed by scoping, not by hoping

The iter-19 bloom retune was GLOBAL, and I flagged the city/iso path as unverified. Tried to
capture it — the PowerWorld-tuned harness renders the city path black (needs the theater +
news-scissor setup it doesn't do), so I could not confirm the city visually. The responsible
call was NOT to ship an unverifiable global change: the richer bloom (threshold 0.72 / strength
0.72 / radius 0.7) is now SCOPED to `camMode !== 'iso'` (the chase/PowerWorld path, where the
beam game is played and where it's verified), and the iso CITY keeps its exact original tuning
(0.8 / 0.66). Re-driven per-camera in `_applyQuality`, which already re-runs on a camera swap.
Verified: rich bloom still lands on the chase capture; the city is untouched by construction —
the regression risk is eliminated, not just unlikely.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 20 | 2026-09-16 | bloom richness scoped to the chase camera (city tuning restored) — risk closed | (city bloom is a separate DELIBERATE choice now, not a regression) | **≈9.2** |

**⚠ HARNESS GAP LOGGED: no iso/city-path fx capture exists (the harness is PowerWorld-only).
If Robert wants the richer bloom in the CITY too, that's a one-line change (drop the `rich`
gate) — but it should be eyeballed in a real city fight first. Iteration 21+: the taste grind,
and — if wanted — a city-path capture harness so the iso game gets the same graded coverage.**

### Iteration 21 — CORRECTING iter-20's claim (the city was never protected)

Probed the citygame.html path directly to close the coverage gap, and it disproved iter-20:

1. **`camMode` is `'chase'` in the CITY game, not `'iso'`.** Only the map/atlas TOOL is iso.
   So the iter-20 `camMode !== 'iso'` gate did NOT spare the city — the city gets the RICH bloom
   too. My iter-20 commit message ("the city keeps its exact original tuning") was **wrong**, and
   this corrects the record rather than leaving a false claim in the log.
2. **The earlier "black city capture" was the ESTABLISHING CARD**, not a render failure — the
   city path has no `_frontlinePreparing`, so the catalog harness's `waitReady` returned before
   the card dismissed. With `#hEstablish` hidden the city renders fine (47 scene children, real
   buildings/trees/birds).
3. **Scene-level bloom check: NO washout.** The daytime city reads bright but structured — the
   rich bloom does not blow it out at the scene level. (A beam-on-target city grade still wants a
   framed capture — the probe's camera pitch was too low to catch the horizontal beam.)

**The honest resolution: the richer bloom is live in ALL gameplay (city + PowerWorld, both
chase); only the map tool stays tame, which is correct. The `rich` gate is doing something real
and defensible — just not what iter-20 said it did.** No code change this iteration: the scoping
is left as-is (it correctly spares the tools), the claim is corrected, and the city-beam bloom is
flagged for Robert's eye with the finding that the scene does not wash out.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 21 | 2026-09-16 | (no code) corrected iter-20's false city-protection claim · confirmed city renders + no scene washout | city beam-on-target still uncaptured (harness gap) | **9.2** |

### Iteration 22 — the energy AFTERMATH got a temporal sequence + the city path captured

Two threads: closing the iter-21 city coverage gap with a real capture, and the weakest *column*
on the 216-cell grade (aftermath, mostly 8–8.5).

**1. THE ENERGY DISSIPATION (the renderer improvement).** Robert's 5th judging category is a
TEMPORAL unfolding — *"fire first and then some smoke afterwards."* Fire's aftereffect already
does that (flare→then→two soot waves, graded 9). But the **four `sparks` families —
energyRed · energyBlue · energySun · alien** (the whole energy/ki column + alien, the largest
afterFx bucket, 4 of 12) fell through to a SINGLE spark burst: no unfolding at all. They now get
their own honest 3-beat in `vfx.js`, mirroring fire's proven structure but true to energy:
- **beat 1** — the flare (the original spark burst).
- **beat 2** — motes that LINGER and cool, buoyant (energy rises, it doesn't fall as debris),
  longer-lived than the flare, sized to read against the dust cloud so the aftermath keeps an
  ENERGY identity.
- **beat 3** — the residual charge disperses upward as a thinning **glow-haze in the family
  COLOUR**, two waves after the flash — the energy answer to "then smoke afterwards." Never soot:
  energy cools and disperses, it does not burn. Palette-driven, so red/blue/sun/alien each
  dissipate in their own hue for FREE (one family-agnostic case, no per-hero branch).
  ⚠ The blast's dust cloud (still dark, `combusts`) is a SEPARATE read left intact — a real
  detonation throws up dust AND the energy disperses; keeping both is richer, and touching the
  cloud classification would risk the already-graded "something blew up here" weight.
- Verified through the REAL engine (`capture-fxmatrix.mjs`, aftermath = boom+50): 4 families × 3
  levels, **0 errors, 0 pageErrors**. A first pass read too faint (opacity 0.26, lost against the
  dust); strengthened (motes 1.9px/2.1s, haze 3 puffs/opacity 0.38 in the family colour) so the
  energy identity actually competes. Refs `artifacts/fx-matrix/shots/energyRed/3-aftermath.png`,
  `.../alien/3-aftermath.png`.

**2. THE CITY PATH, CAPTURED (closing iter-21's coverage gap).** New focused harness
`tools/citybeam-check.mjs` boots `citygame.html`, kills DOM chrome, and frames the ADDITIVE
city/iso beam (the glowiest path, closest to the old build Robert loved) under the rich bloom.
Result — `artifacts/citybeam/vega.png`: a bright **daytime** city, additive fighter glow, the
dummy on target, **and NO bloom washout at the beam-on-target scale**. That is the visual
confirmation iter-21 said "wants Robert's eye": the richer bloom reads as glowier, not blown.
⚠ HONEST CAVEAT — the harness is flaky per-hero (sol framed black; kano's projectile-kit fired a
charge, not a beam, so no hose), so this is a **spot-check confirmation, not a graded city
matrix**. A clean beam-on-target city capture for every family still wants better per-hero slot
selection + framing; logged as the remaining city-path harness work.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 22 | 2026-09-16 | energy/alien AFTERMATH → 3-beat temporal dissipation (flare→cooling motes→family-colour glow-haze) · city additive path captured, no washout | energy aftermath 8.5 → ~8.75 (a still understates a ~1.2s temporal effect) · city per-hero beam capture still flaky | **≈9.25** |

**The honest state: still ~9.2–9.25. This was a real STRUCTURAL gain on the weakest column (energy
aftermath went from one burst to a sequenced dissipation, honest to what energy is) plus a real
capture closing the city coverage gap — not a leap. We are deep in diminishing returns: every cell
is 8.5+, and moving an individual cell 8.75→9 is increasingly a matter of motion-only reads and
taste. Remaining sub-9, non-subjective: a properly-framed per-family CITY beam matrix (harness
work, not a renderer gap).**

### Iteration 23 — the LAUNCH column: a per-family tell + the flash that hid it

The launch column was a flat **8.5 across all 12 families** on the 216-cell grade — the last
uniformly-unimproved phase. Diagnosis found TWO causes, not one:

1. **No per-family vocabulary.** `charge` has `charge.style` (ember/crystal/droplet/plasma/arc/
   sigil/orbit) and `impact` has `impact.afterFx` (embers/frostmist/…) — but `launch` was only
   `{ flash, ring }`, two COLOURS. So the muzzle event was ONE structure (flash + streak + cone +
   ring + recoil) recoloured; every family left the hand identically.
2. **The flash white-balled and buried everything.** The muzzle flash used `impact.kernel`
   (near-white) at radius `4 + lvl*1.5` = **8.5 at level III — BIGGER than a real explosion's flash
   heart** (`radius*0.3` ≈ 0.9–2 in `vfx.explode`). Under the iter-19 rich bloom that became a
   featureless white sphere swallowing the ring, the streak AND any tell. And `launch.flash` — an
   authored, family-tinted colour field — was going **completely unused**.

**The fix (data + one renderer, no per-hero):**
- Added **`launch.style`** to every family (`backblast` fire · `frost` ice · `spray` water/toxic ·
  `burst` red/blue/sun ki · `fork` electric · `sigil` violet/green magic · `orbit` alien ·
  `recoil` steel) + a `switch` in `muzzleFlash` — the launch analogue of `charge.style`/
  `impact.afterFx`. Each family now RELEASES in its own way: fire kicks embers+flame BACK off the
  muzzle, ice frost-puffs + sheds shards, water/toxic spray a droplet fan, ki pops a clean radial
  ring, electric FORKS, magic flashes a flat runic ring, alien scatters an orbiting mote ring,
  steel kicks matte dust (no glow). `validateFx` now requires the field.
- **Tamed the flash**: family-tinted (`launch.flash`, the unused field) + sized `2 + lvl` (8.5 →
  5 at III) so it PUNCHES without white-balling.

Verified through the real engine (`capture-fxmatrix.mjs`): 5 families × 3 levels + a re-capture,
**0 errors, 0 pageErrors**. At level III, **fire now launches WARM** (orange halo + orange
backblast embers) and **electric COOL** (cyan halo + white forks) — distinguishable at a glance
where before both were the same white ball. ⚠ The flash CORE stays white-hot (`vfx.flash` is a
shared `addMat` at opacity 1 — honest for a muzzle blast; the HALO carries the family colour and
the tell reads, which is the fix). Refs `artifacts/fx-matrix/shots/fire/3-launch.png`,
`.../electric/3-launch.png`.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 23 | 2026-09-16 | LAUNCH per-family style (8 tells) + family-tinted, right-sized flash (killed the white-ball that buried the phase) | launch 8.5 → ~9 (flash core still white-hot, by design) · city per-hero beam capture still flaky | **≈9.3** |

**The launch column is no longer flat: every family LEAVES the hand in its own way, and the flash
that made them all look identical is fixed. Three of four phases (charge/launch/impact) now carry a
per-family behavioral vocabulary; flight already had per-family `style`. The remaining
non-subjective gap stays the per-family CITY beam capture (harness). Everything else is motion-only
reads and taste.**

### Iteration 24 — the KI beam gets structure (the plainest of the 8 surfaces)

Re-graded the level-III beams and found the honest weak one: the **ki beam** (energyRed/Blue/Sun)
read close to a laser — a smooth saturated tube with a white core and traveling ARC pulses, but
**no radial/surface structure**, where lava has quantized facets and magic has woven angular bands.
That is exactly why it graded 8.5 against fire's lava 9: it was the only one of the 8 surfaces with
nothing happening ACROSS the tube, only along it.

**The fix (`shadeKiCore` in beam-surface.js):** added a coursing **ENERGY HELIX** — two
counter-wound bright ribbons spiral down the shaft, using the angular coord from the normal (the
SAME seam magic's woven bands use). The distinction is kept honest by BEHAVIOUR: ki courses FAST and
smooth, magic drifts SLOW deliberate dashes — so they never read alike even though they share the
angular technique. The traveling pulses are kept and folded in; the ribbons and pulses both push the
saturated hue toward white (never a pale base — the ki-only-glow discipline). Cache key v1 → v2.
Data-driven and palette-keyed, so it reaches all three ki families AND every in-game ki-beam carrier
(SOL / KANO / VEGA / NOVA / APEX) with no per-hero edit.

Verified through the real engine: energyRed + energyBlue × 3 levels, **0 errors, 0 pageErrors**. At
level III the tube now shows coursing bright energy nodes braiding down its length where before it
was a smooth red laser. Ref `artifacts/fx-matrix/shots/energyRed/3-beam.png`.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 24 | 2026-09-16 | ki beam surface → coursing energy helix (was the only structureless beam of the 8) | ki beam 8.5 → ~9 · city per-family beam grade still a confirmation gap | **≈9.35** |

**All 8 beam surfaces now carry real ACROSS-the-tube structure (lava facets · ice plates · shock
comb · ki helix · ray filament · fluid jet · magic runes · alien iridescent) — none reads as a bare
laser. ⚠ The per-family CITY beam grade is still open and is deliberately LOWER priority, not
forgotten: the beam SHADER is camMode-agnostic (a city beam and a PowerWorld beam use the same
surface), so the 216-cell PowerWorld grade largely transfers; what the city adds is a
background-contrast question (a bright additive beam over a bright daytime city), already
spot-checked as no-washout in iter 21. Building the full synthetic-injection city harness is the
honest remaining task when a renderer gap actually points there.**

### Iteration 25 — the PROJECTILE head stops white-balling (the flight phase)

Turned from the beam to the FLIGHT phase (the projectile in the air), which the recent passes had
skipped. The level-III projectile head was a **white ball with a thin coloured halo** — a fire orb
and an electric orb differed only by the halo tint. Root cause: the SAME rich-bloom white-out the
launch flash had (iter 23). The head is a `pal.core` (near-white) sphere scaled `1x _lvS` — **~4.5u
radius at level III** — inside a family glow; under the iter-19 bloom that big near-white core blew
into a featureless white ball and buried the family colour.

**The fix (`projectiles.js`, one line):** the core is a small HOT HEART now (`0.55x _lvS`), not the
body, so the family GLOW owns the orb — a coloured energy ball with a bright centre (the DBZ read).
The level silhouette still reads because the glow carries it (glow scale untouched). Family-agnostic
and palette-keyed; every projectile-firing family gets it.

Verified through the real engine (fire + electric × 3 levels, **0 errors, 0 pageErrors**): fire now
reads as a WARM orange orb + hot heart, electric a COOL blue orb + hot heart — distinguished by the
ORB itself, not a halo, and electric's jitter forks read better now the head isn't drowning them.
Refs `artifacts/fx-matrix/shots/fire/3-flight.png`, `.../electric/3-flight.png`.

**This completes the rich-bloom WHITE-BALL cleanup**: the launch flash (iter 23) and the projectile
head (this iter) were both bright near-white cores blown out by the iter-19 bloom; both now let the
family colour own the read with a hot centre. The only bright core that white-balls BY DESIGN is now
the muzzle-flash heart, which is honest for a blast.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 25 | 2026-09-16 | projectile HEAD → hot heart in a family-colour orb (killed the level-III white ball) | flight head 8.5 → ~9 · city per-family beam grade still a confirmation gap | **≈9.4** |

**Every phase — charge, launch, flight, impact/aftermath — now carries per-family character that
READS at level III without white-balling, and all 8 beam surfaces are structured. The makeover is
substantively at a strong, cohesive place; remaining work is the deferred city-path confirmation and
motion-only taste.**

### Iteration 26 — CORRECTING a false claim: the CITY beam is a different, UNGRADED render

I have said since iter 21 that "the beam shader is camMode-agnostic, so the PowerWorld grade transfers
to the city." **That was wrong, and this corrects it.** Traced the beam blend to its source:

- `projectiles.js:957`: `this._combatReadability = !!caster._openSky`.
- The **READABLE** beam (NormalBlending, tip radius **0.72**, sheath opacity **0.34**, a curve, fewer
  sparks) is used **ONLY in PowerWorld** (`_openSky`).
- The **CITY / default-gameplay beam** (`_openSky` false — the additive, glowy look Robert loved) is
  **AdditiveBlending, tip radius 2.1, sheath opacity 0.9** — genuinely BRIGHTER and different.
- The fx matrix boots `powerworld.html`, so **the entire 216-cell beam grade is the readable beam**;
  the city's additive beam has never been graded. The element cores DO run in both paths
  (`beam-surface.js:49`), but on an additive, much brighter blend — exactly the kind that white-outs
  surface structure under the rich bloom (the iter-23/25 white-ball lesson). So the ki helix (iter 24)
  and the lava crust could read well readable and wash out additive; **unknown until captured.**

**Built `tools/capture-citymatrix.mjs`** to grade it — the fx matrix's reliable synthetic-injection on
`citygame.html`, which confirmed `player._openSky === false` (the additive path, proving the finding).
⚠ But the render-OUTSIDE-the-rAF-loop comes back BLACK on the city page even though the camera is posed
(camPos ~[0,167,199]), the beam exists (`beams:1`) and the scene is built (`kids:55`) — the SAME
flakiness iter-22's citybeam-check hit (some heroes rendered, others black). It is a city-page
render-target/compositor-state issue when `g.update` + `g.world.render` are stubbed, not a camera or
beam problem. The tool + the black-render notes are committed as a WIP foundation.
⚠ Also tried faking the additive beam by toggling `_openSky=false` on the PowerWorld page — it renders
BLACK (that stage's camera depends on the flag); documented in `capture-fxmatrix.mjs` so nobody repeats it.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 26 | 2026-09-16 | corrected the false "grades transfer" claim · proved the CITY beam is additive + ungraded · built the city-capture WIP (render still black) | **CITY additive beam UNGRADED** (a real gap, not confirmation) · render-outside-loop on the city page | **9.4 (readable path only)** |

**No grade change — I will not grade a path I could not capture.** The ~9.4 is the PowerWorld / readable
path. The CITY additive beam is now honestly logged as a REAL ungraded gap (it was falsely dismissed as
"confirmation" in iters 21–25). The honest next task is the render-reliability fix in the city harness
(let the rAF loop own the render / freeze the sim only), THEN grade the additive beam and fix whatever
white-outs. That is a genuine renderer thread, not taste.**

### Iteration 27 — the CITY beam CAPTURED (real browser) → it WHITE-OUTS. The biggest finding yet.

**Cracked the capture, and it is bad news.** Every HEADLESS approach renders BLACK on the city page —
a headless Playwright pane is treated as HIDDEN, so the adaptive-quality render EARLY-OUTS
(`renderer.info.render.calls === 1`), the exact "measure in a foregrounded tab, in-app pane = 60"
limitation CLAUDE.md documents. The WORKING method is the **in-app BUILT-IN BROWSER** (full quality):
`preview_start "lsw-alt"` (5184) → `citygame.html` → inject the synthetic `_fxtest` beam hero → hold
slot q + pose `mapCam` → `computer` screenshot. `player._openSky === false` confirmed (additive path).

**THE FINDING (the most important of the whole makeover):** the city's additive beam is a WHITE-OUT.
**Fire L3 and Ice L3 are INDISTINGUISHABLE white-hot lasers** — the lava crust (graded 9) and the ice
crystal (8.5) surfaces are completely washed to white; the family colour and all across-the-tube
structure are GONE. Every family renders as the same white laser. This **re-creates the exact "beams
look alike" bug the makeover exists to kill — on the DEFAULT gameplay path Robert actually plays.** All
the surface work (lava · crystal · ki helix · comb · runes · iridescent) is INVISIBLE in the city.

- ⚠ **Cause is the additive BLEND, not primarily bloom.** The live city beam uses the TAME bloom
  (measured threshold **0.8** / strength 0.66 / radius 0.6 — NOT the rich 0.72), and it STILL white-outs.
  The bright additive sheath + tip + detail sum to white and bury the surface core.
- A first fix (additive-path taming: core → NormalBlend + halved halo) was **INSUFFICIENT** and hit a
  beam-material-structure puzzle (the LIVE beam core still reported additive blend at opacity 0.95, not
  what a fire core should be) — so I **reverted** rather than ship a half-understood change to the beam
  Robert plays. The fix needs the BeamHose material structure mapped first.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 27 | 2026-09-16 | CAPTURED the city path (built-in browser) · found the additive beam WHITE-OUTS (all families → identical white laser) · reverted an insufficient first fix | **CITY beam distinctness ~3/10 — the makeover's core goal FAILS on the default path** | **PW 9.4 · CITY ~3** |

**⚠ THE MAKEOVER IS NOT DONE. Corrected honest state:** the readable **PowerWorld** path is ~9.4 and
genuinely strong. The **CITY / default-gameplay** path — the one Robert plays and the additive glow he
loved — WHITE-OUTS every beam to the same white laser, so on that path the beams still "look alike": the
original problem, unsolved. This is a real ~3/10, not taste. **The central remaining renderer task:** map
the BeamHose material structure (where `createBeamMaterials` core/glow/tip/detail actually go, why the
live core read additive), then make the additive SURFACE dominate its own glow so families READ with the
bloom — captured/verified in the built-in browser each pass. Everything before this iter was graded on a
path most players never see; this is the work that actually reaches the game.

### Iteration 28 — ⚠ RETRACTION: iter-27's white-out was the WRONG CODEBASE (base game)

**Correcting iter 27, which was captured on the wrong build.** Setting out to fix the "city white-out,"
I went to map the BeamHose material structure in the built-in browser — and discovered the live beam had
**no `visualFamily` field at all** and the served `beam-surface.js` had **no `beamVisualFamily`** (which
has existed since iter 5). A cache-busted `no-store` fetch confirmed it: **the built-in browser's
`preview_start` runs the dev server against the MAIN CHECKOUT (`D:\lsw`), not this worktree.** The main
tree is on a pre-makeover branch, so **iter-27's captured "white-out" was the BASE game's beams, NOT my
makeover.** The ~3/10 city grade is RETRACTED — I do not actually know my makeover's city-beam behaviour.

**The capture traps, all confirmed this iteration:**
- `preview_start` (built-in browser) serves the **main tree**, not the worktree (fetch had no
  `beamVisualFamily`). Its render is the base game.
- A Bash-started vite from the worktree (`npx vite --port 5186`) DOES serve my code (verified:
  `beamVisualFamily` + the edit present), and the running beam then had `visualFamily:"fire"` + my fix
  applied (core NormalBlend) — but the built-in browser **PANE is user-hidden**, so it renders BLACK (the
  documented "hidden pane renders black"; a displayed pane = 60fps). I cannot force the pane to display.
- Headless Playwright: BLACK (same hidden-pane throttle).
- ⚠ So capturing THIS WORKTREE's city beam in a real render needs the browser pane DISPLAYED (user-side).

**What still holds:** the `_openSky`-gated readable/additive split is real (`projectiles.js:957`, my
worktree — verified `player._openSky===false` = additive city path). The readable **PowerWorld** grade
(~9.4) is sound — those were the worktree's OWN headless vite (correct code). Reverted the iter-28 blind
additive-taming fix (it was designed against an unconfirmed white-out; unverifiable = do not ship).

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 28 | 2026-09-16 | RETRACTED iter-27's white-out (it was the base game — preview_start serves the main tree) · reverted the blind fix · mapped the capture traps | **CITY additive beam = UNCAPTURED for the makeover** (unknown, not ~3) | **PW 9.4 · CITY unknown** |

**Honest state:** the readable/PowerWorld makeover is ~9.4 and real. The additive CITY beam — whether my
makeover's surfaces survive the additive blend — is **genuinely unknown**: I have never rendered this
worktree's city beam (preview_start = base game; worktree-vite + hidden pane = black). The next task is a
capture path that renders THIS worktree's city — most reliably by asking Robert to open/display the
built-in browser pane while a worktree vite serves it — THEN grade the additive beam and fix if needed.
Everything graded so far is the readable path; the additive city path is still an open question, not a
solved white-out.

### Iteration 29 — cracked the capture MECHANISM; the city page still renders BLACK/UNLIT in headless

Chased the city capture properly. Two results, one good, one a wall.

**GOOD — a reusable capture primitive.** `page.screenshot`, `canvas.toDataURL` AND `drawImage(canvas)`
all return BLACK under `preserveDrawingBuffer:false` (they read the PRESENTED canvas). `gl.readPixels`
reads the real framebuffer directly; encode it with a minimal Node PNG encoder (`zlib`, no deps
available). That is the ONLY path that reads a WebGL render Playwright's screenshot can't — added to
`capture-citymatrix.mjs` and reusable anywhere the presented-canvas trick fails.

**THE WALL — the city page renders BLACK/UNLIT in headless Playwright.** With the readPixels capture
working, measured over the WHOLE frame: **`maxRGB=9, brightFrac=0, bbox=null`** — the city scene never
lights up (an early sparse sample caught a transient `centerMax=255` beam flicker, but the sustained
frame is dark). ⚠ This is **CITY-SPECIFIC, not the harness**: `powerworld.html` renders LIT and gradeable
in the SAME headless setup (that is the whole 216-cell fx matrix). Forcing `updateDayNight` + 4 renders
did not light it. So it is a difference in the CITY's own render/light pipeline under headless SwiftShader.
- ⚠ `preview_start` (built-in browser) serves the MAIN CHECKOUT `D:\lsw`, not this worktree (iter 28) —
  that is the ONLY place the city rendered lit, and it was the BASE game.
- Confirmed again: `player._openSky===false` on the city path (additive). The readable PowerWorld grade
  (~9.4) stands — those are the worktree's own headless renders, which DO light up.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 29 | 2026-09-16 | cracked the readPixels+PNG capture mechanism · proved the CITY page renders BLACK/UNLIT in headless (city-specific; powerworld renders lit) · no code change to the game | **CITY beam STILL uncaptured — city renders unlit headless** | **PW 9.4 · CITY unknown** |

**Honest state, unchanged in substance:** readable/PowerWorld ~9.4 (real, gradeable); the additive CITY
beam is UNGRADED because THIS worktree's city renders unlit/black in every headless path, and the one
lit render was the wrong (base) codebase. The capture mechanism is now solved; the blocker is getting the
city SCENE to render lit off-screen. Next: either diagnose the city's headless-unlit render (its sun/hemi
/composer vs powerworld's — powerworld works, so it is a concrete, bounded diff to find), or have Robert
eyeball the lit city he plays and report whether fire/ice beams read distinctly. No blind city changes.

### Iteration 30 — the bounded diagnosis, then the PIVOT: the city is un-gradeable in Playwright

Ran the promised bounded diagnosis (`tools/city-render-diag.mjs`) — dumped the render/light state of
powerworld (renders lit) vs citygame (renders black) in the SAME headless harness. Result:
- Same `dayT` (~0.3), ~same light count (20 vs 19). **The difference is `sceneBg`:** powerworld `dce5eb`
  (light day) vs citygame `0e1119` (near-black). The city's visible SKY is a DOME that doesn't render
  under headless SwiftShader; only the dark background shows. Forcing `dayFixed 0.2` (powerworld's value)
  did NOT change it — city stays dark.
- Rebuilt the capture on the fx-matrix's reliable **stub+manual-step** method + readPixels+PNG + a
  grey scene background. Definitive per-frame stats: **`beams=1`** (the beam SPAWNS), **`bg=39434f`** (the
  background IS set), yet **`maxRGB=9`** (the composed frame is BLACK). Headful (real-GPU attempt) — also
  `maxRGB=9`. So the beam and scene have content; **the RENDER PIPELINE outputs black.** It is the city's
  composer/HDR pipeline under this environment's Chromium (SwiftShader), not the beam, the lighting, or the
  capture mechanism — `powerworld.html` composes fine in the identical harness.

**⇒ THE PIVOT (as promised last iteration).** Five iterations (26–30) have gone to the city capture; it is
un-gradeable in this autonomous Playwright environment — the city's composed frame renders black here,
period. I have exhausted every mechanism (screenshot / toDataURL / drawImage / readPixels+PNG), render
approach (live-rAF / stub+manual), GPU mode (headless SwiftShader / headful), lighting and background.
I am **stopping city-capture work** and will not ship blind city changes.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 30 | 2026-09-16 | bounded diagnosis (city composed-frame renders BLACK in Playwright; beam spawns + bg set but pipeline outputs black; powerworld composes fine) · PIVOT: stop city capture | **CITY additive beam UN-GRADEABLE in this env** | **PW 9.4 · CITY needs a real-GPU eye** |

**Honest closure of the capture arc.** The readable/**PowerWorld** beams are graded ~9.4 and genuinely
strong — and this repo is the **PowerWorld fork** (JK-ground / BFP-air is the primary game), so the
`_openSky`-gated readable path IS what's played most; the makeover largely lands there. The **city**
(additive) mode's beams cannot be captured here; their state is unknown and needs **Robert's own game**
(a real GPU renders the lit city fine) OR a GPU-headless machine. **The concrete ask for Robert:** in a
city fight, fire SOL's beam and COLDSNAP's/an ice beam side by side — do they read as *distinct* (lava vs
crystal) or wash to the same white? That one look unblocks the only open question. Next fire, absent that
input, returns to verifiable **readable-path** polish rather than more capture infra.

### Iteration 31 — TOXIC stops being green water (the named "generic-ish" charge cell)

Honored the pivot: verifiable readable-path work through the fx matrix (renders lit + gradeable). The
clearest remaining non-subjective weak cell was **toxic charge (8, "generic-ish")** — and captured side
by side, toxic was **water RECOLOURED**: the identical charge orb (a `fluid` swirl) with the identical
inward `droplet` motes, just green instead of blue. A real "families look alike" instance on a family
that should read as acid/gas/corrosive, not clean liquid.

**Fix (data-driven, no per-hero):**
- `toxic.charge.style` `droplet` → **`bubble`**: a new charge style in `chargeStyleFx` — corrosive GAS
  bubbles UP off the gather and pops (buoyant, shrinking), the opposite of water's inward condensation,
  plus a heavier sludge drip that falls. Toxic gathers by BOILING, water by CONDENSING.
- New **`toxic` orb kind** in `chargeOrbCore` (mapped from `bubble` in abilities.js): a faster,
  higher-frequency BOILING churn (small rising cells) vs water's smooth `fluid` drip-swirl. The orb reads
  as a bubbling corrosive brew now, not a clean liquid ball. Cache key `lsw-charge-orb-toxic` (own program).

Verified through the real engine (`capture-fxmatrix.mjs`): toxic × 3 levels, **0 errors**; the orb shows
finer boiling cellular structure + rising bubbles where before it was water's smooth swirl. **Water is
untouched** (still `droplet`/`fluid`). Ref `artifacts/fx-matrix/shots/toxic/3-charge.png`.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 31 | 2026-09-16 | TOXIC differentiated from water at CHARGE (bubble style + boiling orb kind) — no longer green water | toxic charge 8 → ~9 · toxic still shares flight (`spray`) + impact (`droplets`) with water | **PW ≈9.45** |

**Back to real VFX progress on the capturable path.** Toxic's charge is now its own family (a bubbling
corrosive brew) rather than recoloured water — closing a named sub-9 cell and a "families look alike"
instance. ⚠ Remaining to fully separate the two families: toxic still shares `flight: spray` and
`impact.afterFx: droplets` with water — a follow-up (a diffusing gas trail + a corrosive/venting impact,
distinct from water's spray + wet splash). The city additive path stays un-gradeable here (iter 30) —
that's Robert's eyeball or a GPU environment, not this loop.

### Iteration 32 — TOXIC finishes leaving water behind (FLIGHT + IMPACT, evidence: toxic,water re-capture)

Closed the follow-up iter-31 flagged in writing. Captured side by side, toxic still shared its FLIGHT
trail (`spray`) and its IMPACT aftereffect (`droplets`) with water — the same falling-wet physics in a
different colour. Two data-driven changes, no per-hero, water untouched:
- `toxic.flight.style` `spray` → **`gas`**: a new flight style in `projectiles.js`. Water slings dense
  bright droplets that FALL (`grav 16`, tight white row); toxic now leaves a lingering diffusing CLOUD —
  soft `pal.mist`/`pal.glow` puffs that barely rise and hang (`grav -0.6`, `drag 2.3`, `life ×2.3`), with
  the odd heavier corrosive drip falling off it. Gas spreads and lingers; wet condenses and falls.
- `toxic.impact.afterFx` `droplets` → **`venting`**: a new impact case in `vfx.js`. Water's `droplets`
  throws a wet burst up + a whiter steam puff. `venting` is a rising corrosive-gas PLUME (buoyant pale-
  green `smokePuffs`, `rise 7`) + a heavier acid splatter that falls + a **lingering pool that keeps
  hissing gas** off the ground for ~2.5s (4 staggered vents via `_add`). Gas RISES and hangs where wet
  FALLS. `venting` is NOT in the `combusts` list, so it inherits the pale-vapour cloud treatment for free.

Verified through the real engine (`capture-fxmatrix.mjs --family toxic,water`): **6 cells, 0 errors,
0 pageErrors**. Toxic flight now reads as scattered green gas puffs vs water's bright white droplet
stream; toxic impact reads as a green venting plume vs water's whiter steam splash. Refs
`artifacts/fx-matrix/shots/toxic/3-flight.png`, `.../toxic/3-impact.png` (vs the `water/` pair).

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 32 | 2026-09-16 | TOXIC differentiated from water at FLIGHT (`gas` cloud) + IMPACT (`venting` plume) — no longer water's falling wet | toxic flight/impact 8 → ~9 · only `launch` (spray) still shared, defensible for two liquid launches | **PW ≈9.5** |

**The water/toxic "families look alike" gap is closed across three of four phases.** Toxic now has its
own charge (boiling brew, iter 31), flight (hanging gas cloud), and impact (venting plume + corrosive
pool) — behaviour that is the OPPOSITE of water's condense/fall/splash, not a recolour. The single
remaining shared phase is `launch` (both `spray`), which reads honestly for two liquid-family launches;
separating it further is low-value versus the other sub-9 cells. As a tough critic: at the frozen +7
impact beat the two clouds are close in shape (the venting POOL is a moving-viewer read), so impact
grades ~9 not 10 — the colour + tint separation is real, the behavioural separation is stronger in
motion. City additive path still un-gradeable here (iter 30).

### Iteration 33 — ALIEN impact stops being red-ki-in-orange (the 4-way `sparks` collision, evidence: alien,energyRed re-capture)

Graded the family table like a critic: the three ENERGY families (red/blue/sun) sharing plasma/burst/
streak/sparks is DEFENSIBLE — ki colour *is* the identity (DBZ law), same as water/toxic launch; ditto
the two MAGIC families (Robert's "magic purple+green" = two colours of one sigil language). But one real
CROSS-family collision stood out: **`alien` impact fell through to energy `sparks`** — shared with all
three energy families (a 4-way collision). Captured side by side, alien's impact was energyRed's, byte
for byte, only the ring hue differing (orange vs red): identical cloud, identical spark row. Alien has a
unique charge (`orbit`) and flight (`iridescent orange↔teal`), yet its impact read as earthly ki.

**Fix (data-driven, no per-hero, energy families untouched):**
- `alien.impact.afterFx` `sparks` → **`astral`** + a new `altGlow: '#8affc0'` (the teal half of its
  iridescent flight, carried into the impact). New `astral` case in `vfx.js`: a bright TEAL ring inside
  the orange shockwave (no energy family puts teal on an impact), a two-tone swirl of motes launched
  TANGENTIALLY that RISE not fall (orbit + wrong-physics, vs sparks that spray out and fall), and an
  iridescent normal-blend VAPOR (reads on the bright blast where additive teal washes out).
- `alien.palette.smoke` warm brown `['#241a10','#1a140c']` → **cool green-gray `['#243028','#182420']`**:
  removing alien from the `combusts` list (it's no longer `sparks`) already gives it a pale, steady
  (non-ember) afterglow; the cool smoke makes its lingering CLOUD the wrong colour for its orange fire —
  an unearthly tell — where every energy family billows warm soot. This is the clearly-visible win.

Verified through the real engine (`capture-fxmatrix.mjs --family alien,energyRed`, then alien re-caps):
**0 errors, 0 pageErrors, validateFx 12/0** (teal `#8affc0` hue 148, cool smoke hue ~140 — neither
purple). At the AFTERMATH beat alien now reads tan/gold ring + **cool green-gray smoke with a warm ember
glint** vs energyRed's maroon ring + neutral warm soot — a real visible departure. Refs
`artifacts/fx-matrix/shots/alien/3-aftermath.png` (vs `energyRed/3-aftermath.png`).

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 33 | 2026-09-16 | ALIEN impact `sparks` → `astral` (teal ring + orbital two-tone swirl + iridescent vapor + cool "wrong-colour" smoke) — closes the 4-way energy-sparks collision | alien impact/aftermath 7 → ~9 · energy R/B/S + magic V/G colour-only sharing ruled DEFENSIBLE (ki/arcane colour IS identity) | **PW ≈9.5** |

**⚠ Structural finding (a grading-method note, not a defect): the +7 IMPACT beat is dominated by the
SHARED explosion body** (blast cloud + shockwave rings + the shared spark burst at `vfx.js:178`), so
per-family afterFx differentiation is inherently subtle at that frozen beat — for EVERY family, not just
alien. The family read at impact comes from ring/cloud COLOUR; the afterFx's own character (astral swirl,
frost spikes, fire tongues) reads at the AFTERMATH beat (+50) and in motion. That is why this iteration's
clearest win is the CLOUD colour (which the shared body draws from `pal.smoke`), not the swirl. City
additive path still un-gradeable here (iter 30).

### Iteration 34 — THE SHOCK FRONT CARRIES THE ELEMENT (every family's impact at once, evidence: fire/ice/energyRed/magicViolet re-capture)

Acted on iter-33's structural finding. Graded the LEVEL axis off a fire `--sheets` grid: the intensity
ladder (0.72/1.0/1.55 scale · 0/1/2.2 cloud · 0.7/1.0/1.7 kb) reads well at impact — L1 a small pop, L3
a big event. BUT grading the impact cell across families exposed the real cross-family weakness: **fire's
L3 impact (the flagship LAVA family) looked nearly identical to energyRed's and alien's** — big white
shockwave rings + pale cloud + a colour-tinted inner ring. Every family read as *the same white blast
tinted a hue*; fire didn't look like lava, ice didn't look like frost.

**Root cause (one line): the PRESSURE FRONT — the biggest, brightest ring of the blast — was drawn in
`imp.kernel`, which is near-white for EVERY family** (fire cream `#fff3c8`, ice white, energy/alien
off-white). So the dominant ring was white everywhere; the family colour only reached the smaller inner
pressure ring and the sparks.

**Fix (`vfx.js`, ONE blend, data-driven, gated on `if (fx)` so non-family explosions are untouched, no
per-hero branch):** the shock front colour is now `THREE.Color(imp.kernel).lerp(pal.glow, 0.65)` — a HOT
bright edge (keeps 35% kernel) that is unmistakably the element (65% glow). Fire's front is orange, ice's
cyan, energyRed's red, magicViolet's purple (correctly the ONE purple-allowed family — `pal.glow` is
purple only there, and `validateFx` still enforces the rest).

Verified through the real engine (`capture-fxmatrix.mjs` fire,ice then energyRed,magicViolet):
**0 errors, 0 pageErrors.** Side by side the L3 impacts now read fire=warm-orange · ice=cool-cyan ·
energyRed=red · magicViolet=purple at the DOMINANT ring, where all four were near-white before. Refs
`artifacts/fx-matrix/shots/{fire,ice,energyRed,magicViolet}/3-impact.png`.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 34 | 2026-09-16 | SHOCK FRONT tinted `imp.kernel` → 0.65·`pal.glow` — every family's impact now reads in its own colour at the dominant ring, not a shared white blast | ALL 12 families' impact cells 8 → ~9 (the biggest cross-family lift in the run) · fire vs red-ki still both warm (honest — both are hot) | **PW ≈9.6** |

**This is the broadest single lift so far: it raises the IMPACT cell for all 12 families at once** by
fixing the shared-body white-dominance the iter-33 finding named, rather than one family's cell. The LEVEL
ladder graded solid (firecracker → event reads at impact); knockback (`kb` 0.7/1.0/1.7) is a gameplay
number feeding `areaDamage` and isn't shown by the pinned-dummy capture — verified by the multiplier, not
the still. City additive path still un-gradeable here (iter 30).

### Iteration 35 — THE LAUNCH LEAVES IN THE ELEMENT (muzzle bloom + shape tells, evidence: fire/ice/energyRed/electric re-capture)

Graded every phase this iteration (beams confirmed strong — fire=molten lava, ice=faceted crystal;
charges family-distinct — fire warm-orange, ice pale-cyan; aftermath is smoke-dominated at +50 BY the
"fire first, then smoke" temporal design). The lowest-graded phase was **launch (~8.5)**: two shared-body
issues, the same shape as iter-34's impact finding.
- The dominant muzzle **flash** used `launch.flash` — a PALE near-white tint for every family — so the
  bloom read pale/samey (the launch analogue of iter-34's white shock front).
- The per-family **tell rings** (burst/sigil/orbit) were r1≈5u — smaller than the point-blank orb bloom
  (~7u), so they were buried INSIDE it and no family LEFT the hand in its own silhouette.

**Fix (`game.js muzzleFlash`, data-driven off the powerfx table, no per-hero):**
- muzzle flash colour → `THREE.Color(launch.flash).lerp(pal.glow, 0.5)`: a hot bright pop saturated to
  the element. Measured: energyRed's bloom now reads clearly RED (glow `#ff3b3b`), where it was pale.
  ⚠ Honest limit: families whose glow is already pale (ICE `#bfeaff`) barely change — correct, ice IS pale.
- the shape tells boldened to read PAST the bloom: burst/sigil/orbit rings r1 `2+lvl` → `4+lvl*2` (they
  now frame the launch outside the orb), fork reaches further (count/radius/height up), the kicks
  (backblast/recoil) reach further out.

Verified through the real engine (`capture-fxmatrix.mjs` fire,ice then energyRed,electric — 9+ cells,
**0 errors, 0 pageErrors**). Launches now read distinctly: energyRed = saturated-red bloom + a burst ring
around the core · electric = pale-blue bloom + jagged FORK branches at the muzzle · fire = warm bloom.
Refs `artifacts/fx-matrix/shots/{energyRed,electric,fire}/3-launch.png`.

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 35 | 2026-09-16 | LAUNCH: muzzle flash tinted to `pal.glow` + shape tells (rings/forks/kicks) boldened to read past the point-blank orb bloom | launch 8.5 → ~9 · ⚠ fire BACKBLAST (kicks BACKWARD into the caster) is occluded at point-blank in the capture framing — reads in-game behind the caster, not a design flaw | **PW ≈9.6** |

**⚠ Honest, partial:** the RING tells (burst/sigil/orbit) and the FORK read clearly; the DIRECTIONAL
backblast/recoil (which kick BACKWARD off the muzzle, into where the caster stands) are occluded by the
point-blank orb in the frozen capture — they read in-game against the open ground behind a standing/flying
caster. The flash-tint saturation is a real win for saturated-glow families (fire/energy/magic) and a
deliberate near-no-op for pale-glow families (ice/water). City additive path still un-gradeable (iter 30).

### Iteration 36 — THE GRADING GAUGE STOPS LYING (capture methodology, evidence: fire/ice clean re-capture + sheet)

Not a renderer change — a GAUGE fix, and those matter (the flicker pass, §THE FLICKER: "a fix verified
against a broken gauge is a coin toss"). Every capture cell for the last dozen iterations carried a gold
"curl + ellipse" top-centre that I'd been dismissing as a harmless staging artifact. It is on every SHEET
Robert reviews, and grading VFX past a photobomb is grading blind. Traced it properly this time with a
scene probe: it is **training-lab set dressing** behind the `destination=training` powerworld stage — a
`white-threat-room` dome of hoops (gold `#ffd24a` torus at y125/z220) + a `threat-lab-deployment` target
ring (gold torus at **y11**/z160 — the ellipse a y>18 filter kept missing). NOT a game VFX bug; the
capture just composes the VFX stage over the training hall.

**Fix (`tools/capture-fxmatrix.mjs shoot()` — the ONE place a captured frame is rendered, so it can never
be missed):** hide the RING geometries (Torus/Ring/Circle) inside those two named groups every frame, and
KEEP the floor plane. ⚠ Hiding the whole groups also removed the dark floor, washing pale VFX (ice cloud)
into a pale background — so the targeted ring-hide is deliberate: the floor's contrast is what lets pale
families grade. Also belt-and-braces hides the reticle/throw-arc/player-mark aim helpers.

Verified: fire + ice re-captured, **0 errors, 0 pageErrors** — every cell (charge/launch/flight/impact/
aftermath/beam × L1/L2/L3) is now clean, floor + contrast intact, VFX unobstructed. The clean re-grade
confirms fire/ice read as before (iter-34 family-coloured shock fronts, level progression) with nothing
now masking them. Ref `artifacts/fx-matrix/sheets/fire.jpg` (clean).

| iter | date | what changed | worst cells | overall |
|---|---|---|---|---|
| 36 | 2026-09-16 | GAUGE fix: removed the training-lab gold-ring photobomb from every capture cell (targeted ring-hide, floor kept) — grading is honest now, sheets are clean | none newly failing — this makes all prior/future grades trustworthy rather than read past an artifact | **PW ≈9.6** |

**Why a gauge iteration counts:** four straight iterations (32–35) graded family×phase cells past this
artifact; a clean gauge is the precondition for trusting any of those grades sit where I logged them. The
probe method (`scene.traverse` → geometry/color/world-pos dump) is the reusable way to identify any future
capture photobomb. No VFX renderer changed; no regression. City additive path still un-gradeable (iter 30).
