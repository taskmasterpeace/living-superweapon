# Next slice: explicit attack interception

Status: implemented and verified. This document retains the pre-implementation design findings below; current contracts, review closure and evidence are in `docs/BFP_PARITY_LEDGER.md` (Interception checkpoint) and `.superpowers/sdd/2026-09-06-interception-implementation/progress.md`. Maps and shipped character definitions were preserved.

The runtime reviewer found no projectile/projectile or beam/projectile pair resolver. Existing
beam/beam struggles are the only attack-pair interaction. The creator ruling remains authoritative:
only sufficiently powerful beams eat ballistic bullets, based on invested energy. Generic priority
must not silently grant that property to every beam. `dtype` is not a force/piercing beam class.

## Runtime design constraints

1. Ordinary shot priority is opt-in on both participants. Off is distinct from priority zero.
   Higher priority survives; ties retire both. Same-team shots do not interact. Current owner/team
   after deflection governs eligibility. Keep catalog defaults unchanged.
2. Beam ballistic interception is a separate authored capability and threshold. Use actual traveled
   stream geometry, never its future maximum reach. Define the energy quantity explicitly rather
   than mislabeling `clashPower()` (a might/buff/remaining-ki proxy) as accumulated energy.
3. Contact resolution must precede fighter damage. The current manager updates objects sequentially
   in reverse list order; a post-update pair pass would retire a shot after it already caused damage.
   Extract preparation/commit boundaries for participating shots, then resolve synchronized earliest
   contact events. Intersecting swept paths alone is insufficient: both objects must meet at the
   same time. Preserve natural world, shield, thrown-prop and fighter collision precedence.
4. Earlier cover/interior/ground/dome/prop contact bounds the candidate interval. A shot cannot
   neutralize another through an obstruction it already hit. Determine this before pair resolution,
   not with order-dependent rollback of damage or environmental side effects.
5. Neutralization uses idempotent disposal plus one small contact cue. It must not call `detonate()`
   and accidentally split a remote parent. Preserve remote-reference invalidation and pooled lights.
   Explicitly decide split-child inheritance so splitting does not multiply defensive priority.

## Required RED tests before runtime implementation

- Authored priority matrix: higher/lower/tie, off, allies, bounds, source identity and package round trip.
- Swept relative-time contacts: fast opposing shots, reversed manager order, altitude misses and
  paths crossing at different times. Test 30/60/120 Hz and authored maximum speeds.
- Collision precedence: a nearer wall/dome/thrown prop defeats a later pair event; neutralized shots
  never deal fighter damage afterward; earlier legitimate fighter hits are not retroactively removed.
- Beam capability: same actual beam/bullet contact only absorbs above the explicit threshold;
  low-energy/interrupted/unconfigured beams and future untraveled reach do not intercept.
- Ownership/lifecycle: deflection, remote second press after neutralization, single light return,
  dead-object pruning and deliberate split-child inheritance. Existing beam struggle suite stays green.

## Integration and release gates

Expose only fields actually consumed by production in the existing Attacks inspector. Show one real
opposing-shot preview with actual runtime contacts and truthful measured telemetry; no parallel mock
simulation. Preserve portable packages and source-identity reconciliation. Run independent runtime
review, serial browser/real-input checks, visual readability review, broad combat and production build.

Hooks: `src/engine/projectiles.js` manager/update/disposal; `beam-contact.js` traveled capsule math;
`projectile-contact.js` existing obstacle sweep; `src/data/attack-tuning.js` bounded authoring schema.
No new netcode, external services, map work or source catalog changes are needed for this slice.
