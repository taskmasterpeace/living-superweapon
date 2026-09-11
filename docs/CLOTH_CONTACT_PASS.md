# Cloth contact and wake-up — bounded repair, still WIP

**Superseded verification:** see [the compatible-contact follow-up](CLOTH_COMPATIBILITY_PASS.md)
for current runtime, stronger combined tests, rejected coupled experiment,
captured motion and CPU measurements. The counts below are historical.

The complete independent-superhero-combat objective remains active. This pass
does not certify the game/editor, BFP feel, character art or the general cloth
solver. Only shared production `src/engine/ragdoll-cape.js` changed at runtime;
gameplay camera, maps, movement, kits and saved character profiles were untouched.

## Reproduced and corrected

The original cloth suite first reproduced four failures: injected resting-contact
velocity, flutter becoming the material's rest dimensions, continued 60 Hz uploads,
and failure to settle in its 120 Hz fixture. The changes are:

- A contact translates both Verlet positions coherently, removes only inward
  normal velocity, and preserves sliding/outward motion. Local box normals use
  inverse-transpose transformation. A small outward face bias prevents exact
  boundary contact from being mistaken for a second embedded union contact.
- Captured KO shape and exact restoration remain separate from the undeformed
  garment metric. Link lengths use `cape.userData.rest`, not temporary flight folds.
- A bounded contact-only tail reduces residual shared-vertex intersections after
  structural relaxation. It does not reapply stretch forces. **This is only a
  partial mitigation, not a convergent general contact solution**; see below.
- Sleeping cloth checks non-attachment body transforms, deforming envelopes,
  cover count/shape and terrain height at its vertices. Limb movement, added cover
  and excavated support wake it even when the shoulder row is stationary.
  Unchanged sleepers do not solve or upload geometry. Matrix comparison ignores
  measured `3.33e-16` recomposition residue rather than repeatedly waking on it.

Two isolated transformed-contact tests went red then green. Four real landed-cape
wake tests went red then green. The previous 16 tests plus those six initially
passed 22/22, but that was **not sufficient acceptance evidence**.

## Review found missed frames and cyclic contacts

The prior triangle checks sampled every sixth frame. They now inspect every
rendered frame; vertex checks likewise no longer skip frames. No thresholds were
relaxed. Two retained `.5`-random launch fixtures now expose actual torso crossings:
normal frame134/face323 and tall/broad frame130/face117.

Independent read-only review sampled 18 seed/scale/rate/cover fixtures and found
five with actual torso crossings. Retained new regressions use the real flight
warm-up and an LCG scoped solely to the Ragdoll constructor:

- Stock SOL seed31, 60 Hz: every-frame test first finds face36 at frame127.
  Review's later frame129/face72 edge crosses the actual torso by .003684 units.
- Short/broad SOL seed99, 30 Hz, raised platform: every-frame test first finds
  face303 at frame65. The following frame's face204 also crosses the torso.
- Stock seed31 at120Hz: the body sleeps, but the cloth is still active after15s
  (and remains active in the separate16s CPU run).

The cause is competing head/torso exits, not an impossible sewn attachment.
Review verified clean entry and pins. A torso correction clears a shared edge;
a rotated-head correction then moves its vertex back through that torso. The
nearest head face can switch on later passes. Extra contact-only iterations are
non-monotonic: they clear, reopen different faces and recur through60 extra passes.
Raising the12-pass tail cap is therefore rejected as a general repair.

Next solver work must resolve compatible contacts across overlapping bodies and
shared cloth vertices, instead of repeatedly selecting unrelated nearest faces.
Cloth self-contact, the visible collapsed folds and full equipment collision also
remain open. Do not claim these failures are fixed by the new wake-up behavior.

## Fresh verification

- `npm run test:ragdoll-cloth`: **25 tests,20 pass,5 fail**, exit1,7.41s.
  Four failures are triangle/core crossings; one is the seed31/120Hz sleeper.
- Broad73-file Node regression: **875 tests,870 pass,5 fail**, exit1,21.81s.
  These are exactly the five cloth failures above. This supersedes the preceding
  866/862/four-failure snapshot, not a claim that the entire suite is green.
- `npm run test:ragdoll-handoff`: **64/64 pass**,7.23s, including preserved core,
  neck, limb, equipment-handoff, collar and final-contact behavior.
- Studio-profile suite: **18/18 pass**, 28.00s, including unchanged saved-profile
  flight joints across every shipped hero. Independent narrow wake-up review
  passes four tests plus nine additional lifecycle checks: unchanged sleepers,
  identical cover replacement, removed/moved/resized cover, local head movement,
  changing bounds and accumulated subthreshold movement.
- `npm run build`: exit0; Vite5.4.21,257 modules,5.36s. Existing large-chunk
  warning remains; Studio-profile bundle4,941.42kB /1,757.21kB gzip.

The named cloth command now includes the new contact, wake and adversarial files;
the harder failures are not hidden in an optional diagnostic.

## Visible and motion evidence

Matched actual Studio captures: `artifacts/cloth-landing/before/` and
`artifacts/cloth-landing/reviewed-wip/`. Each contains481 states across16 simulated
seconds, seven phase screenshots, `results.json`, and `cloth-landing.webm`.
Browser errors are empty. The main agent inspected handoff, fall/contact and
terminal frames. This is the real procedural SOL flight pose and production
ragdoll/cloth, not a newly imported animation clip.

For this particular Studio trajectory, first cloth sleep moves from12.867s to
6.967s. Both versions sleep by16s; the before video must not be presented as proof
of never settling. The terminal upload version drops from970 to617. Matching
body chest coordinates confirm no skeleton-trajectory change in that capture.

The latest close-ups still show angular folded-over cape triangles and dark
self-overlap artifacts; the corpse presentation remains stiff/propped in places.
This is **reviewed work-in-progress**, not an approved beauty shot. Footage is
silent, stepped, and uses an inspection camera: it proves neither real-time FPS
nor the player's BFP camera/control feel.

## Measured cost, not a performance claim

`node tools/cloth-cpu.mjs` records production cloth-update CPU cost in
`artifacts/cloth-landing/cloth-cpu.json`. Node25.8.0, Intel i9-14900KF; no GPU,
renderer, full skeleton or live-combat timing is included.

At60Hz, active update means are1.715ms for constant `.5` and1.360ms for seed31;
p95 values are3.032ms and1.966ms. The bad seed31/120Hz case averages2.481ms per
update, p953.684ms, and never sleeps during the16s run. Typical sleeping checks
average .002–.008ms across the matrix. Several active capes could therefore be
expensive; no target-hardware gameplay budget is certified.

## Research and skill influence

[NVIDIA's cloth guide](https://nvidiagameworks.github.io/PhysX/3.3/PhysXGuide/Manual/Cloth.html)
and [Small Steps in Physics Simulation](https://matthias-research.github.io/pages/publications/smallsteps.pdf)
informed the distinction between material/pose state, contact stabilization and
repeated relaxation. This is conceptual research, not imported PhysX source or a
new physics dependency.

Game Studio's multi-phase captures and the animation-authoring acceptance matrix
kept this pass tied to production handoff, contact and terminal motion. Their
evidence gate prevented the initial22/22 result being labelled complete. The
animation skill's TypeScript/PoseLab paths are absent here; this remains the
actual JavaScript/Vite runtime, with no invented TS/Vitest acceptance.
