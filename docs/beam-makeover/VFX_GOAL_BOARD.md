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
