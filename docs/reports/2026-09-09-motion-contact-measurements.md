# Motion-contact measurements — 2026-09-09

## Outcome and scope

There is usable source cadence, but **no ready-made universal native foot-contact event**. A loose rendered-vertex height gate produced one event per foot/cycle in the measured steady states; tighter gates missed feet, and the existing support AABB produced duplicate walking contacts. For a future shared cue adapter, use source-derived contact **windows**, qualified against final target support, and consume the existing signed ground phase. Neither fixed phases 0/.5 nor raw source touchdown markers alone describe the final target contacts.

This report is the only file created. No runtime, tests, assets, provider access, audio playback, dependencies, commits, or Nanite work changed. The animation-authoring skill informed source/target separation and final-volume measurement; verification-before-completion required the fresh focused regression below. These are geometric/cadence observations, not animation feel or audible synchronization approval.

## Method and provenance

- Actual local `loadSource` / `sampleSource` from `tools/lib/quaternius-source.mjs:14` / `:41`, with native Three AnimationMixer samples. Files are under `assets-src/quaternius/`. Source SHA-256 values matched the runtime bank: glTF `0ff075c7ad6855c5c2c37a171592ee8f0d6ab2f58259e2be77a9b63dd8027765`; bin `6e65377d81558333c4093dbb144a48fd19019343d82b1a3a7992a98ec0e0543c`.
- Source foot-volume subset: vertices with combined foot/toe bone weight >=.5, 105 vertices per side across `Mannequin_1` and `Mannequin_2`. After every sample, updated skeleton matrices and CPU-skinned those vertices into world space. Bind sole reference was y=.000461712; bind hip–knee–ankle length .829789437. This explicitly defined subset is not a general mesh-contact solver. L/R below are **engine slots**: source anatomical right maps to engine L (`quaternius-source.mjs:21`).
- Target: actual `Fighter` cloned from SOL, `frame.scale=1`, `model.body='procedural'` or `'superhero-male'`, default source locomotion, open sky, grounded, no cast/wounds, facing +Z, constant signed Z velocity. Called native `_animate(1/hz)` and refreshed world matrices, advancing its existing `animT`; observed/unwrapped `_groundMotion.phase`, never assigned it. This is prescribed native pose playback, not Game physics or player-input evidence.
- Measured final world-space minimum y of **all rendered boot vertices**, including both boot meshes (1,764 nonindexed vertices each per foot). Also measured the ordinary `Box3.setFromObject(boot)` used by support. Root/support stayed y=0. Source-skinned target was verified as real `parts.skin.id='superhero-male'`, Quaternius `Superhero_Male_FullBody.gltf`; results matched procedural boots exactly. This is expected: `hero-skin.js:141` cuts source feet below the cuff; `:166` keeps native boots, and `:99` binds source foot bones to those drivers.
- Main matrix: 3 takes × 2 directions × 30/60/120Hz = **18 source runs**, plus both target bodies = **36 native target runs**. Two complete cycles primed state, then events were counted over eight cycles. Source playback used elapsed time modulo actual duration, not rounded sample counts. Target phase direction was asserted positive forward / negative retreat. Pure-take velocities matched Studio's scale-normalized choices (`studio-preview.js:13`, `:273`). A preliminary default-SOL-scale 1.12 sweep was exploratory only; the tables below use the controlled scale-1 pure takes.
- Thresholds below are **measurement parameters, not approved production constants**. A contact latch entered at/below the low threshold and exited at/above the high threshold. Only subsequent entries counted; no event was invented at initialization. Heights are vertex minima, not heel/ankle joints.

| Take | Actual duration / baked frames | Speed / stride at scale 1 | Observed cycle rate | Two-foot cadence |
|---|---|---|---|---|
| `Walk_Loop` | 1.333333s / 81 | 7.5 / 10 | .75 cycles/s | 1.50 events/s |
| `Jog_Fwd_Loop` | .916667s / 56 | 16.363636 / 15 | 1.090909 cycles/s | 2.181818 events/s |
| `Sprint_Loop` | .666667s / 41 | 33 / 22 | 1.50 cycles/s | 3.00 events/s |

These rates were unchanged by retreat or sampling rate. They are not today's audio rate: native steps still use the unrelated `sin(animT*12)` sign at `entity.js:1882`, approximately 3.82 opportunities/s, and require speed >8.

## Source observations

Candidate source latch: low=.01 / high=.04 **of bind leg length**, relative to the bind sole floor. It counted **8 entries per foot over 8 cycles in all 18 runs**. Listed phases are the first sampled entry at 120Hz, not interpolated exact impacts; 1 is the loop seam/0.

| Take | Forward L / R | Reverse L / R | Source sole height range, L / R, divided by leg length |
|---|---|---|---|
| Walk | .46875 / .97500 | .14375 / .64375 | −.01027… .10427 / −.03236… .11392 |
| Jog | .55455 / .01818 | .69091 / .18182 | −.02990… .36301 / −.02551… .35951 |
| Sprint | .60000 / 1.00000 | .73750 / .23750 | −.05130… .25224 / −.07140… .36753 |

The raw source's negative heights and small near-floor excursions make equality-to-floor unsafe. With a tighter .005/.01 latch, Jog R counted **16**, not 8, in both directions at 120Hz; 30/60Hz happened to miss that extra excursion. Even the .01/.04 candidate's forward Jog R entry varied .01818–.07273 at 30Hz (about **50ms**) versus .01818 at 60/120Hz. Offline extraction with deterministic sampling and interval cleanup is preferable to rediscovering these source crossings at render rate.

Reverse enters from the other edge of the stance interval; it is not the forward touchdown phase played backwards. Sprint's observed source entries are also asymmetrical, not half a cycle apart.

## Final target observations

At 120Hz, settled target sole minima were Walk .02500/.02500, Jog .04846/.04827, Sprint .07411/.03227 units (L/R). Maximum sampled heights were .59600/.64118, 1.61417/1.50721, and 1.21419/1.69118 respectively. Both bodies gave identical values.

| Detector | Result over eight cycles, both directions and bodies |
|---|---|
| Vertex low=.04, high=.08 | Walk 8/8; Jog **0/0**; Sprint **0/8**, at every Hz. |
| Vertex low=.06, high=.12 | Walk and Jog 8/8; Sprint **0/8**, at every Hz. |
| Vertex low=.10, high=.20 | **8/8 in all 36 runs.** Useful bounded candidate, not a universal contact definition. |
| Existing support AABB low=.04, high=.08 | Walking duplicates: at 60Hz **16/16** per eight cycles, both directions/bodies. At 120Hz some seam-boundary windows counted 17; do not interpret this as extra real steps. |

The AABB minimum lay up to **.08410 units below the actual boot vertex minimum**. `authored-pose.js:61`–`:63` intentionally translates the body using the *lowest AABB* plus .025 and capped source lift. Consequently its support correction is not a per-foot collision/contact signal. This measurement is not a request to change that animation support code.

Final-vertex .10/.20 candidate entry phases (L/R), identical for both bodies:

| Take | Hz | Forward | Reverse |
|---|---:|---|---|
| Walk | 30 | .60000 / .10000 | .97500 / .55000 |
| Walk | 60 | .60000 / .10000 | .98750 / .55000 |
| Walk | 120 | .60000 / .09375 | .99375 / .55625 |
| Jog | 30 | .56364–.58182 / .03636–.05455 | .65455–.67273 / .16364–.18182 |
| Jog | 60 | .56364 / .03636 | .67273 / .18182 |
| Jog | 120 | .55455 / .03636 | .67273 / .18182 |
| Sprint | 30 | .60000 / .05000 | .70000 / .20000 |
| Sprint | 60 | .60000 / .05000 | .72500 / .20000 |
| Sprint | 120 | .60000 / .03750 | .72500 / .20000 |

In this matrix candidate target entries varied by at most **25ms** across rates. This does not prove exact physical touchdown or equal spacing. For example, forward Walk L reaches this target gate .13125 cycle (~175ms) after the candidate source entry; reverse Walk L differs by .15 cycle (~200ms along reverse playback). Thus blind raw-source marker dispatch would visibly precede the measured target near-floor entry. Raising/lowering a gate also shifts timing substantially, especially during the walking stance.

## Smallest bounded future seam — proposal only

1. **Extract minimal source contact windows offline**, adjacent to `bakeLocomotion` / `bakePoseBank` (`quaternius-source.mjs:50`, `:84`–`:113`), using actual source foot/toe geometry or validated sole landmarks. Normalize against the measured bind floor/leg length; collapse near-floor chatter into one stance interval per foot/cycle; retain source hash, side mapping and extraction tolerance. Preserve wraparound intervals and both entry/exit edges. Validate against the final four-frame seam treatment (`:114`–`:129`), not only the raw clip. `tools/ingest-locomotion.mjs:3` is the existing bank writer; it was **not run** here. Runtime bank currently has only global support lift in frame[44], no per-foot contact metadata.
2. **Consume the phase already advanced at `ground-motion.js:53`.** The existing stride and speed/body-scale blend at `:51`–`:55` remain authoritative. Use source stance windows to arm each foot once, then qualify against its final rendered near-support envelope before cueing; expire unfulfilled windows without inventing a touchdown. Geometry-only detection was sufficient for this pure steady-state matrix, but the threshold sensitivity prevents treating it as a universal event source. Raw source windows constrain duplicates; they do not by themselves approve final cue timing. A blended state needs one verified merged per-foot envelope using those same blend weights—not events from all three takes or a reset whenever the dominant take label changes. Unmeasured blends need explicit eligibility until verified.
3. **Observe only after the final pose**, following the normal native `_animate` path (`entity.js:1554`; final skin update `:2621`) and Studio's pose-only `_animate` (`studio-preview.js:280`). Do not scan thousands of skinned vertices per Fighter/frame in production: derive/cache a small conservative boot-sole envelope from the real geometry per rig, validated against these full-vertex probes. Keep source window state, consumed epoch and final-support qualification bounded per foot. Never add a phase oscillator or move roots/joints to manufacture a cue.
4. **Eligibility is native ownership plus positive simulation advancement.** Ground channel applied/weighted, alive, supported by the current floor/cover, real travel; no flight/jump, hitstop, freeze, hanging, grab, downed/launch/slide or other exclusive leg owner (`ground-motion.js:37`, `directional-pose.js:17`). Capture hitstop eligibility before the native early-return timer decrement (`entity.js:1546`); merely checking the timer afterward can misclassify a partial-hitstop frame. Zero-dt, pause and muted settle/scrub do not create crossings; silently re-prime on source/rig/form/reset/reacquisition and retire on KO/disposal. Reverse direction changes require re-priming or explicit edge ownership, not replaying the previous marker. Use actual support height, not arena y=0 on roofs. Studio Ground jump already calls full `Fighter.update` (`studio-preview.js:256`): no second emitter there.

No raw number in these tables should be installed as a universal hardcoded marker. The next implementation needs RED/GREEN tests for source-window extraction, seam/reverse crossings, final-volume qualification and blend/ownership boundaries before audible acceptance.

## Reproduction, verification and limits

Ephemeral probes were supplied through PowerShell here-strings to `node --input-type=module`; no probe files were saved. Reproduce with the fixtures above: loop at dt=1/30, 1/60, 1/120 through >10 source cycles; discard the first two; sample minima after `sampleSource` + skeleton update or native `_animate` + world update; run the specified two-threshold latch over observed phases in cycles [2,10). Source subset selection uses the mapped foot/toe bone indices and summed skin weights, not node names inferred from visible left/right. Target minima visit both visible boot meshes and transform every geometry position by its world matrix. Record the AABB separately, never substitute it for vertex minima. Dispose every target afterward.

Fresh regression command from `D:/lsw`:

```powershell
node --test tools/locomotion-source.test.mjs tools/ground-motion.test.mjs
```

**9/9 passed**, including actual source ingest, native ground articulation/support, 30/60/120Hz phase/hitstop, priority and form restoration. No build or broad suite was run for this report.

Not measured/approved: blended acceleration, strafing turns/reversal transitions, ranged/guard overlays, extreme body proportions, all source body variants, sloped/moving/cover support, native Game input, procedural-*locomotion* fallback, actual audible timing/mixing, or player gait feel. Procedural **body** here still uses the actual source locomotion channel. The earlier motion-audio preflight retains the transport/lifetime proposal and AAI availability boundary; this work uses local assets only and neither implements nor listens to audio.
