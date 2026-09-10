# Motion Audio Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task **only after parent approval**. Steps use checkbox (`- [ ]`) syntax for tracking. This planning assignment authorizes no execution, delegation or commits. Later workers must follow the parent's explicit ownership assignments; this is a shared dirty checkout, not permission to revert other work.

**Goal:** Make bundled footsteps follow the existing source gait and final rendered soles, and give ordinary native jump departure/touchdown the same truthful, silence-safe local audio in gameplay and Studio.

**Architecture:** Bake small per-foot stance windows beside the existing locomotion samples, then observe the one signed phase already advanced by `animateGround`. A bounded per-Fighter adapter qualifies source windows against actual final boot geometry and routes committed native jump/landing facts to the existing AudioBus/StudioAudio facade. It never advances animation, changes roots/joints, creates another simulation clock, or owns an aircraft/flight sound system.

**Tech Stack:** Existing JavaScript, Node `node:test`, Three.js/Vite, local Quaternius source assets and generated JSON bank, existing MP3 SampleBank and StudioAudio. No dependencies, downloads or new recorded/generated media.

**Spec:** Both user attachments listed at `docs/COMPLETION_LEDGER.md:7–8`: `C:/Users/taskm/.codex/attachments/2bcce36c-a5d7-40eb-aeb3-62c0afa8c1e2/pasted-text.txt` and `C:/Users/taskm/.codex/attachments/24eebba6-00c6-44eb-98ed-27f16ec4a37d/pasted-text-1.txt`; accepted direction at ledger :67,72; `docs/reports/2026-09-09-motion-audio-preflight.md`; `docs/reports/2026-09-09-motion-contact-measurements.md`; `PRODUCT.md`; root `AGENTS.md`; `docs/STUDIO_AUDIO.md`. Read those reports, not an inferred generic animation/audio specification.

## Global constraints and review decisions

**Parent checkpoint, September 9:** Fully read and accepted as a later bounded implementation plan after Nanite Task 4 releases the shared files. Initial source extraction and final .10/.20-scale qualification constants may be evaluated, but must not be widened merely to force event counts. Blended interval/reversal behavior, exact hull cap and aggregate .5ms observer target remain discriminating measurement/review gates, not established results. The ordinary ballistic soft-touchdown gain is accepted as a tunable cue default; no physics change is authorized. This checkpoint does not start runtime work or approve audible/perceptual synchronization.

- Preserve independent movement/aim and the final ground → jump → ground/air bridge → directional/emitter/reaction pose order. No stride, pose, root correction, physics, combat balance, support correction or input changes to make a cue pass.
- “The engine is the product”: native Fighter and Studio use one observational adapter. Do not turn all pose-only Studio motion into full Fighter updates just to get sound. Native Studio Ground jump/melee, and any Task 4 nanite full-update branch, must not receive a second cue tick.
- Existing local `step.concrete`, `step.grass`, `land.soft`, `land.flesh`, `land.metal` and body-aware `audio.land` are sufficient. No AAI service is identified/connected by this work, no voice/cough framework, no new sounds or provider calls, and no generic engine/thruster bed for every flier. Existing afterburner/city/environment audio remains outside this slice.
- Source feet are mapped anatomical-right → engine `L`, anatomical-left → engine `R`; UI/anatomical labels must not silently reverse this contract. Procedural **body** with source locomotion is not procedural **locomotion** fallback.
- Positive simulation advancement is mandatory. Pause, `dt=0`, 90 seek-settle presentation calls and camera/resize redraw emit nothing and queue nothing. Scrub replay consumes observations silently through the existing muted facade; resuming never catches up missed sounds.
- Numerical contact tolerances below are **proposed engineering defaults for parent approval**, derived from the measurement report, not user-supplied values or proven perceptual thresholds. No blanket “motion complete” claim follows from passing tests.
- Coordinate after Nanite Task 4 releases `entity.js`/Studio files. Do not edit the concurrent contact, nanite, movement-bridge or audio implementation as unrelated cleanup. There is no clean baseline assumption: preserve existing dirty edits.

### Chosen approach and alternatives

Choose source stance windows plus final sole qualification. Raw markers alone were observed to lead final walking contact by approximately 175–200ms; the native support AABB can double-count walking. A new fixed-rate oscillator would ignore stride/speed/reverse playback. A geometry-only low/high latch worked for the measured steady pure takes at .10/.20 units but is too sensitive to become the whole event authority. No alternative is an excuse to alter animation support.

Initial proposal: offline 240Hz source sampling, foot/toe combined skin weight ≥.5, source stance thresholds .01/.04 of bind leg length; runtime final-sole enter/release .10/.20 × rig scale relative to actual support. The first gate must verify these against the existing seam-treated target bank, blends and body extremes; if they fail, stop the numeric gate and return measurements to parent. Do not widen an envelope until every frame qualifies. Source extraction stores one connected stance interval per foot/cycle; forward enters its start, retreat its end.

## Ownership and interfaces

| File | Exact responsibility |
|---|---|
| Create `tools/lib/locomotion-contact-source.mjs` | Offline source-foot vertex sampling and deterministic circular stance-window extraction; no runtime Three objects or audio. |
| Modify `tools/lib/quaternius-source.mjs`, `tools/ingest-locomotion.mjs` | Add contact metadata to `bakeLocomotion` output; preserve every existing pose sample, duration, raw endpoint, seam correction, source hash and side mapping. |
| Generated `src/data/locomotion-bank.json` | Add versioned contact metadata only via the approved existing ingest; no hand-entered phase markers or sample edits. |
| Modify `src/engine/ground-motion.js` | Expose the exact already-consumed phase delta and existing walk/jog/sprint weights as read-only observation data. Do not add a clock or alter phase arithmetic. |
| Create `src/engine/motion-audio.js` | Bounded source-window/sole observer, cue dispatch and reset; no pose writes, engine update, storage, timers or playback mixer. |
| Modify `src/engine/entity.js` | Replace legacy authored footstep dispatch with one final-pose observer call; forward accepted jump/landing facts; reset observation state on lifecycle boundaries. Keep non-audio physics/impact statements untouched. |
| Modify `src/tool/studio-preview.js`, `src/tool/studio-combat.js` | Feed the same observer once from pose-only paths using simulation dt, reset after seek settling, and explicitly avoid full-update double ticks. Re-read final Nanite Task 4 call order first. |
| Create `tools/locomotion-contact-source.test.mjs`, `tools/motion-audio.test.mjs`, `tools/motion-audio-studio.test.mjs`, `tools/motion-audio-browser.mjs` | Source/observer/native/Studio regressions and later actual audio + moving capture. |
| Create `docs/reports/2026-09-09-motion-audio-bridge-report.md`; modify `docs/STUDIO_AUDIO.md` after evidence | Exact coverage, settings, source/frame/audio measurements, exclusions and remaining feel gates. |

No `core/audio.js`, `core/samples.js`, `figure.js`, `hero-skin.js`, `authored-pose.js`, `jump-motion.js`, profile/package, map, input, camera or nanite changes are preauthorized. The named core sample families are already in `HOT_SET`; only request a further file if a discriminating RED demonstrates an actual gap.

Proposed contracts (all names used below are defined here):

```js
// Offline, added by bakeLocomotion; no idle contact interval.
bank.contacts = {
  version: 1,
  method: { hz: 240, skinWeight: .5, low: .01, high: .04 },
  // Same provenance identity as bank.source.sha256 and bank.source.basis.
  clips: { walk: {L:{start,width}, R:{start,width}}, jog: {L:{start,width},R:{start,width}},
           sprint: {L:{start,width},R:{start,width}} }
}; // start in [0,1), width in (0,1); start+width may cross 1.

// Produced inside animateGround, not advanced by audio.
f._groundMotion.contactSample = {
  serial, phaseBefore, phase, phaseDelta, weights: [walkWeight,jogWeight,sprintWeight], scale
}; // serial identifies a produced pose sample; it is not elapsed time.

// motion-audio.js exports; state is f._motionAudio, bounded to two feet.
resetMotionAudio(fighter); // drop baselines/pending facts, idempotent; no emitted cue
queueMotionContact(fighter, fact);
// fact = {kind:'jump'|'land', power, body, supportY, surface:'ground'|'cover'}
// native physics only, current positive update; replace/coalesce landing candidate,
// at most one departure + one landing fact, copied values, never a growing queue.
observeMotionAudio(fighter, game, {
  dt, advanced, supported, supportY, landingThisStep: false
}); // returns up to two copied cue records for this call; no persistent event queue
// cue record = {kind:'step'|'jump'|'land', side:'L'|'R'|null, phase:number|null,
//               pos:{x,y,z}, supportY:number, power?:number}
// Consumed once after final pose; at most one step per foot/window.
```

`advanced` captures actual native/Studio simulation eligibility **before** a partial hitstop timer is decremented. The ground sample serial prevents accidental duplicate observation of the same produced ground pose; consumed physics facts are cleared once, independently of whether a ground channel exists during a jump. No additional caller clock/serial is needed. Repeated zero sampling must not mutate baseline history. The adapter stores last source/rig/sample/direction, a per-foot armed/consumed/released window latch and copied physics facts; it does not hold an unbounded event history or mutable shared temporary vector.

## Task 1 — Deterministic source stance metadata, pose bank unchanged

**Own:** new offline extractor/test plus the two ingest seams and generated locomotion bank. Do not touch runtime audio/pose files yet.

**Consumes:** `loadSource`, `sampleSource`, `bakeLocomotion` (`tools/lib/quaternius-source.mjs:14,41,50`), actual source files and the measurement report. **Produces:** `bank.contacts` above, preserving bank version/pose frames and source SHA-256.

- [ ] Write `tools/locomotion-contact-source.test.mjs` against actual local source, with assertions that fail because `bank.contacts` is currently absent:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import shipped from '../src/data/locomotion-bank.json' with {type:'json'};
import {loadSource,bakeLocomotion} from './lib/quaternius-source.mjs';
test('real source adds stance windows without changing any pose sample', async()=>{
  const bank=bakeLocomotion(await loadSource());
  assert.equal(bank.contacts?.version,1);
  assert.deepEqual(bank.clips,shipped.clips);
  assert.deepEqual(bank.source,shipped.source);
  for(const key of ['walk','jog','sprint'])for(const side of ['L','R']){
    const w=bank.contacts.clips[key][side];
    assert.ok(Number.isFinite(w.start)&&w.start>=0&&w.start<1);
    assert.ok(Number.isFinite(w.width)&&w.width>0&&w.width<1);
  }
});
```

- [ ] Run `node --test tools/locomotion-contact-source.test.mjs`; record the intended missing-metadata RED, not an asset/import failure.
- [ ] Implement `deriveLocomotionContacts(source, clips)` in the new offline file. Collect the source meshes' foot/toe weighted vertices once from the actual skeleton bone identities returned by `loadSource`. Sample `A_TPose` to measure bind floor and hip–knee–ankle length; for each locomotion take sample actual AnimationMixer output at 240Hz through a complete loop, updating skeleton matrices before CPU skinning. Heights are minimum selected vertex y relative to bind floor, normalized by leg length, not ankle position.
- [ ] For each foot, form circular runs below the .04 high threshold containing at least one .01 low sample. Select the stance component containing the global sole minimum; merge only internal short near-floor chatter already bounded by that same high threshold. If multiple separated viable stance components remain, throw with take/side/heights instead of silently guessing a marker. Refine start/end crossings by linear interpolation between adjacent sampled heights; normalize interval start and wrapped width. Store both edges so reverse entry is not the forward marker replayed backward. Preserve provenance and extraction parameters; use deterministic tie breaks by smallest normalized start.
- [ ] Add tests for synthetic wraparound/chatter/ambiguous intervals and mirrored L/R input arrays, plus real raw-source forward/reverse qualification. Exercise the final existing four-frame seam-treated runtime samples, not just raw source: use actual Fighter target playback and show each extracted window contains a final-sole qualifying opportunity in each direction. Do not rewrite `rawEndpoint`, frame[44], or seam samples to force this assertion.
- [ ] Run the new test plus `node --test tools/locomotion-source.test.mjs tools/ground-motion.test.mjs`. Only after GREEN run `node tools/ingest-locomotion.mjs`; prove the generated diff is metadata-only by comparing `clips`, `source`, and `version` before/after. Source hashes must stay the documented `0ff075…7765` glTF / `6e6537…f3c` bin. If extraction needs different constants, submit measured alternative to parent before publishing them.

Review gate: reproducible source windows, both edges retained, no motion change. This is not audible synchronization approval.

## Task 2 — One signed phase, final-sole observer, no motion writes

**Own:** `src/engine/ground-motion.js`, new `src/engine/motion-audio.js`, new `tools/motion-audio.test.mjs`. **Consumes:** Task 1 contact intervals and final native boot meshes. **Produces:** observation/dispatch/reset APIs above; native call sites wait for Task 3.

- [ ] Build real Fighter fixtures like `tools/ground-motion.test.mjs`: SOL/SARGE, open sky, `GAIT.GROUNDED`, actual source locomotion, source bodies procedural/male/female. Capture position, velocity and all final body/leg/arm/head transforms before/after each observer call. First RED should be the missing observer or missing contact sample—not a rewritten animation expectation.
- [ ] Expose source observation in `animateGround` around its existing :51–57 calculation. Keep the original wrapped phase update; record its exact signed delta and the blend weights already used by the pose:

```js
const weights=[(1-jog)*(1-sprint),jog*(1-sprint),sprint];
// Capture these beside the existing phase update; do not call a new phase updater.
// phaseDelta is zero on hitstop and equals the precise existing signed increment otherwise.
s.contactSample={serial:(s.contactSample?.serial??0)+1,phaseBefore,phase:s.phase,phaseDelta,weights,scale};
```

Increment the bounded sample identity only when a positive pose sample is produced. Disabled/zero-weight source ownership is an explicit ineligible observation; it is never permission to replay stale phase or fall back to generic steps during a strike.

- [ ] Cache actual boot/toe convex support vertices by geometry identity, using Three's already-installed `ConvexHull` addon or an exact equivalent. Compute in geometry-local space once; the minimum of transformed hull vertices equals the actual mesh-vertex minimum under its current affine matrix. Include the child toe's independent matrix. Do not use AABB corners as sole samples. Proposed cap: at most 256 hull vertices per native boot/toe mesh, two meshes per foot; fail closed with a diagnostic for unsupported geometry instead of scanning a new arbitrary skin each frame. Validate the cap against the real geometry before adopting it. Geometry references are per rig/cache, weakly held where shared, and reset on form replacement.
- [ ] Implement one merged per-foot cyclic interval: align the three starts onto the same circular branch (nearest equivalent to walk start), blend starts and widths using the exact source pose weights, then wrap the result. Never dispatch all three takes or reset on the dominant take label changing. A candidate is armed by the **signed phase traversing** its entry edge (start forward, end reverse), not by a blend boundary moving over a stationary phase. Use the prior sample's blended entry to detect that traversal, then freeze the armed interval until consumed/expired. It emits only when final sole height is ≤ .10×scale above real support. It cannot rearm until it has left that stance interval and the sole has risen ≥ .20×scale; expire unqualified windows silently. This retains one event per foot/stride rather than source-marker plus geometry-marker doubles.
- [ ] On initial/reacquired ownership, source/rig change, direction reversal, zero speed, invalid phase or an observed phase jump ≥.5 cycle, prime silently and clear pending windows. Do not synthesize a missed event or burst across skipped cycles. Ordinary continuous frames use the exact signed delta, not shortest wrapped difference alone. Reversal is expected to skip an ambiguous transition contact rather than double it; normal cadence must resume on the next qualified stride.
- [ ] Eligibility requires positive actual advancement, alive, physically supported, source leg channel applied with proposed weight ≥.5, and real travel. Exclude flight/glide/jump/settle, hitstop, freeze, hanging, grabs, downed/launch/slide/evade/full-body exclusive owners and leg wounds. Ranged overlays may retain source gait; use source ownership, not a blanket “attacking” exclusion. `onFoot` alone is insufficient because it includes .12s coyote air (`entity.js:2002–2008`). Support height is actual cover/root support when `onBlock`, otherwise cached terrain height, never unconditional y=0.
- [ ] Preserve a separately labeled procedural-locomotion/city fallback using the **existing** rendered procedural `animT*12` phase/sign and legacy >8 speed threshold, moved to this observer with the same ground/owner/positive-step gates. Do not introduce another oscillator. Never use that fallback merely because an authored channel is temporarily suppressed by Guard/strike/hitstop. Source-driven standard walk at 7.5 must now sound; procedural fallback is not claimed source-derived.
- [ ] Route each qualified step to existing `game.audio.sample(rural?'step.grass':'step.concrete',{pos:copiedSolePoint,gain:Math.min(1,.45+speed/70)})`. Use final contact foot position and existing gain formula, not source bone world units or root origin. If a cold/missing sample returns false, consume the event; do not queue/retry it per frame. No new mixer or asset family.
- [ ] Add the exact discriminating tests:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {GAIT} from '../src/core/util.js';
import {observeMotionAudio} from '../src/engine/motion-audio.js';
for(const hz of [30,60,120])for(const direction of [1,-1])
for(const [speed,stride] of [[7.5,10],[15/(11/12),15],[33,22]]){
  test(`qualified cadence ${speed} / ${direction} / ${hz}`,()=>{
    const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.frame={scale:1};
    const f=new Fighter(def),g={world:{heightAt:()=>0,plan:{}},audio:{sample:()=>true}};
    Object.assign(f,{_openSky:true,gait:GAIT.GROUNDED,flying:false,animT:0});
    f.pos.set(0,0,0);f.vel.set(0,0,direction*speed);
    const cues=[],cycleSeconds=stride/speed;
    try{
      for(let i=1;i<=Math.floor(10*cycleSeconds*hz);i++){
        f.animT+=1/hz;f._animate(1/hz);f.obj.updateMatrixWorld(true);
        const events=observeMotionAudio(f,g,{dt:1/hz,advanced:true,supported:true,supportY:0});
        if(i/hz>2*cycleSeconds)cues.push(...events.filter(e=>e.kind==='step'));
      }
      for(const side of ['L','R'])assert.equal(cues.filter(e=>e.side===side).length,8);
      assert.ok(cues.every(e=>e.pos.y-e.supportY<=.10+1e-5));
    }finally{f.dispose();}
  });
}
// Same serial observed twice => no second event. dt=0 => identical state and zero calls.
// Lift only the rendered soles while phase advances => zero events (not root correction).
// Change aim while holding travel => unchanged source phase and no extra cue.
```

Extend these real fixtures, never mock their returned counts. Include full-vertex min comparisons at start/quarter/half/three-quarter/wrap and both profiles: cached hull minimum error ≤1e-5×scale, exact transform arrays unchanged by observation. Sweep scale .65/1/1.5, allowed body bulk extremes, both skin families, ranged independent aim, strafes, smooth 8→14→20→32 speed blends, stopping/reversal and ownership transitions. Pure-take count expectations above are measured facts; blended count/timing must be derived from the actual qualified merged windows, with no duplicate foot/window and no multi-take burst.

- [ ] Run `node --test tools/locomotion-contact-source.test.mjs tools/motion-audio.test.mjs tools/ground-motion.test.mjs tools/ground-air-handoff.test.mjs tools/jump-motion.test.mjs tools/directional-pose.test.mjs`. Require actual intended RED→GREEN and parent review of blend/reversal timing before native rollout. Do not widen source/final tolerances just to meet count assertions.

## Task 3 — Native final-pose dispatch and ordinary jump touchdown

**Own:** bounded motion-audio call sites/lifecycle in `entity.js`, adapter physics facts in `motion-audio.js`, corresponding `tools/motion-audio.test.mjs`. **Consumes:** Task 2 observer. **Produces:** real gameplay footsteps plus one accepted departure and one ordinary jump touchdown, preserving existing hard-impact mechanics.

- [ ] Add a real native short-jump RED using the existing `tools/jump-motion.test.mjs` world/Fighter fixture: press/release rise, call full update at 30/60/120Hz, observe actual land callbacks. Current code emits `land(.5)` at departure but no ordinary touchdown below the −30 hard-impact threshold. Assert root apex, velocity and landing frame against a no-audio-control fixture so audio cannot change physics.
- [ ] Replace the old physics footstep block (`entity.js:1878–1893`) with the sole final-pose observer, leaving no second authored sine dispatch. Call after `_animate` has finished directional/emitter/hit/skin processing (:2614–2624), from the positive native update path—not inside `_animate`, which Studio uses for zero/settle presentation. Capture hitstop eligibility before its early-return timer decrement (:1550); a .001 hitstop on a 1/60 step freezes observation for that entire frame. Early-return KO/frozen paths retire/prime state, never emit footsteps.
- [ ] Record accepted native jump departure at the existing grounded rise branch (:1651–1655), preserving power .5 and body identity. Gate only cue recording by positive dt; do not change the legacy zero-dt physics/input branch as an unrelated movement fix. Replace its immediate `audio.land` call with a copied current-update fact. An accepted departure arms one ordinary ballistic jump episode; entering powered flight/glide, teleport/rebind, KO or disposal ends that episode without a fake landing sound.
- [ ] At actual floor/cover support commits (:1897–1919,:1958–1963), record the pre-clamp downward impact and the selected support; at final footing (:2002–2008) commit **one** arrival fact only when a real air→support transition occurred, not every gravity/clamp frame and not coyote support. Queue the existing hard-ground landing power `Math.min(2.2,-impact/38)` once with its existing non-KO predicate; leave `_landT`, crouch recovery, `_slam`, damage, knockback and their separate sounds unchanged. For the newly covered ordinary ballistic episode, use the same material-aware `audio.land` with proposed `Math.max(.25,Math.min(1,-impact/38))`. Do not add a second soft cue when the hard cue already won. Cover-top ordinary jump arrival uses its actual impact/top, not an arena-floor test; final support selection wins if multiple candidates exist in one large step.
- [ ] Dispatch physics facts once at the final observation boundary; a landing frame consumes/resets footfall windows so landing plus two planted feet does not make three arrival cues. Preserve the final pose/physics position of that contact by copying values. End the ballistic episode after touchdown; repeated resting frames, standing on a roof and silent seek cannot retrigger it. Initial actor spawn/rest primes without an arrival. Existing flight takeoff zaps, afterburner and environmental wind are not duplicated or repurposed as a generic flying loop.
- [ ] Reset the bounded observation/fact state on `Fighter.applyForm` rig rebind, `_ko`, respawn and `dispose`, including direct `_physics` test paths. Form changes do not mean takeoff/contact. Teleport/discontinuous support changes prime rather than interpreting displaced feet as steps; no timer-driven catch-up after hitstop, freeze or thaw.
- [ ] Add native tests for: exactly one jump departure and one below-threshold touchdown; hard landing exactly one existing land cue with identical recovery/slam results; real cover-top arrival; hovering/powered takeoff/landing ownership does not create footsteps or a stale ballistic soft cue; two successive jumps; repeated zero-dt and partial-hitstop; freeze/launch/slide/hang/KO; form/respawn/dispose; grass/concrete positions; native 8-Fighter isolation. No test may set “landing animation time” to cause an audio event.

```js
const calls=[]; game.audio.land=(power,body,pos)=>calls.push({power,body,pos:{...pos}});
// With the real short-jump fixture, move through physics until support returns.
assert.equal(calls.length,2); // existing .5 departure + actual ordinary touchdown
assert.equal(calls[0].power,.5);
assert.ok(calls[1].power>=.25&&calls[1].power<=1);
const saved=JSON.stringify(calls); fighter.update(0,game);
assert.equal(JSON.stringify(calls),saved);
```

- [ ] Run `node --test tools/motion-audio.test.mjs tools/jump-motion.test.mjs tools/ground-motion.test.mjs tools/ground-air-handoff.test.mjs tools/audio-spatial.test.mjs tools/audio-listener.test.mjs`. Review native sound facts and movement equality before Studio integration.

## Task 4 — Studio parity without duplicate full-update clocks

**Own:** motion-only additions in `studio-preview.js`, relevant pose-only `studio-combat.js` path, new `tools/motion-audio-studio.test.mjs`. Wait for the Nanite owner to release these files and inspect its final dispatch branch; do not overwrite it. **Consumes:** native observer/physics facts and existing StudioAudio. **Produces:** same native contact cues during opt-in playback, silent deterministic reconstruction.

- [ ] Write failing real `StudioPreview.prototype` tests using the no-WebGL shell in `tools/jump-motion.test.mjs:184` / `tools/resource-construct-studio.test.mjs`; enable a StudioAudio fake backend that counts `sample`/`land` and uses the production facade. Show current walk/jog/sprint silence; retain a control proving Ground jump already has a native departure.
- [ ] Call `observeMotionAudio` after the existing pose-only final `_animate`/matrix update (`studio-preview.js:280`) using `simDt = settling ? 0 : dt`. Apply the same addition after final poses in generic pose-only combat for grounded moving shooters/targets, once per actor. Feed real world support and the existing signed ground sample; do not import source arrays into Studio, override phase, call full Fighter.update, or create a RAF/audio clock.
- [ ] Ground jump (`studio-preview.js:250–257`) and melee (`studio-melee.js:55–59`) already call full Fighter.update: add **no** observer there. The final nanite branch may also do so; dispatch by actual caller ownership, not a list of assumed state names. Add instrumentation asserting one observed native sample/cue per full update in each path.
- [ ] `_seek` resets observation state even when pure flight reuses the Fighter, and primes after the 90 pose-settle calls and any existing ground-phase reset, immediately before silent replay. During replay the observer consumes source windows normally while StudioAudio is scrub-muted. Final `step(0)` and views/resize do not alter the observer or play audio. Respect pause/mute/dispose and the completed Task 4 transient playback rate if present; scale elapsed simulation once through that transport, never create another rate control or saved physics field.
- [ ] Add parity tests for native-vs-Studio qualified cadence/side order over the same source motion, native Ground jump two-cue count with no duplicate, melee/no footstep strike owners, and native nanite full-update observer ownership. Run all 90 actual settling calls, seek backward/forward, repeated seek/step(0), pause then resume, mute then unmute, 0.25× equal simulation-time events, hero/form/source change, reset/dispose. Snapshot profiles before/after: no contact windows, phase, sample index, sound state or new audio settings become character overrides.
- [ ] Sound facade remains unchanged: it already wraps `sample` and `land`, preloads these HOT_SET families, and suppresses historical events. Assert cold/failed samples do not block authoring or replay later. Do not broaden this task into AudioBus watchdog/afterburner lifetime repairs.

```js
preview.seek(0); // executes the real 90 settle calls
assert.deepEqual(backendCalls,[]);
for(let i=1;i<=120;i++){ preview.time=i/60; preview.step(1/60,false,false); }
assert.ok(backendCalls.some(c=>c.name==='sample')); // source Walk speed 7.5 is audible
const count=backendCalls.length;
preview.playing=false; preview.seek(1); preview.step(0,false,false);
assert.equal(backendCalls.length,count);
// Repeat with Ground jump: exactly one native departure and one physical arrival.
```

- [ ] Run `node --test tools/motion-audio-studio.test.mjs tools/motion-audio.test.mjs tools/studio-audio.test.mjs tools/jump-motion.test.mjs tools/resource-construct-studio.test.mjs tools/studio-inspection.test.mjs`. Add the final nanite Studio regression filename once that task publishes it; do not claim its provisional tests were reviewed here. Run `npm run build` after the scoped suite. This checkout uses Node tests/Vite, not the animation skill's absent TypeScript/Vitest scripts.

## Task 5 — Moving contact and audible acceptance, no inflated completion claim

**Own:** new `tools/motion-audio-browser.mjs`, subsequent evidence report and scoped `docs/STUDIO_AUDIO.md` update. **Consumes:** Tasks 1–4, existing foreground browser and capture tools. No new media purchase/generation is part of implementation.

- [ ] Before browser work, read browser-control and game-playtest skills. Discover/reuse the current Vite server; do not start duplicates. Reuse the existing AudioContext capture approach in `tools/studio-audio-browser.mjs` and the native motion setup in `tools/ballistic-jump-browser.mjs`, but capture these actual new cues, not an old combat recording.
- [ ] Record at least two complete cycles/wraps for walk/jog/sprint forward and retreat; lateral travel with fixed independent aim, acceleration/blends, stop/reverse, takeoff/apex/ordinary touchdown and roof touchdown. Show procedural/male/female bodies, both profiles/front/rear, native boots/support and moving armed upper body. Source identity is the exact local Quaternius take/hash, not inferred from silhouette. Include quarter phases and continuous playback; stills alone cannot approve timing.
- [ ] Measure event phase, side, actual sole/support gap, merged source window, source weights and waveform onset alongside frames. Pure steady cadence should match the measured 1.50/2.181818/3.00 contacts/s matrix; frame-rate/contact timing requires fresh 30/60/120 Hz evidence, including blend and mirrored-side fixtures. Proposed pure-take event-time tolerance is one 30 Hz simulation frame relative to the qualified target event, not relative to raw source touchdown. Report actual deviations instead of labeling a callback count “in sync.”
- [ ] Exercise opt-in Sound, pause, scrub, resume, mute, reset, hero swap and close; capture actual output and analyser silence after pause/scrub. No autoplay, delayed burst, doubled jump, wrong-foot panning, persistent pool growth or orphan motion voices. This slice creates only one-shots, so there should be no new loop handles at all. Existing local random variant selection may differ across runs; cadence/contact is deterministic, a byte-identical audio waveform is not promised.
- [ ] Measure warmed CPU overhead with 8 moving native Fighters and both full frame/observer time. Proposed observer budget: ≤.5 ms/frame aggregate on the documented RTX 4090 host, no per-frame vertex-skin scan and fixed two-foot state per Fighter. Report cold hull-cache build separately; no “zero cost” claim from a renderer-only timing. If the hull cap/budget fails, return measured geometry/perf to parent; do not replace exact sole support with the known-bad AABB.
- [ ] Run the focused suites from Tasks 1–4 plus `npm run build`; write command/result counts, hardware/browser, source/body IDs, actual event/audio/frame evidence, sample cold-cache limits, and remaining perceptual issues into the new report. Preserve current movement/contact/aim invariants and record any unrelated dirty failures without reverting them.
- [ ] Parent reviews actual listening/moving evidence before ledger status. Keep these open unless separately accepted: blend/reversal feel, foot sliding/support defects, surfaces beyond current terrain/cover policy, generic flight sound design, powered takeoff/afterburner refinement, bespoke voices/coughs and the unidentified AAI service. This slice closes local footsteps/jump/landing parity only; it is not all sound effects, all motion, all characters or “AAA feel” completion.

## Planning self-review and handoff

Coverage: Task 1 source-derived stance windows/provenance; Task 2 signed source phase, blending/reverse and final soles; Task 3 native contact/lifecycle and ordinary jump landing; Task 4 local Studio parity/positive clocks; Task 5 frame-rate, moving/audio and resource evidence. Existing independent aim, pose banks/root/support and native jump/slam physics are immutable regression oracles. Contact constants, hull cap/performance target, blended-window algorithm and ordinary touchdown gain are explicit proposals for parent review, not user rulings.

Skills used: `writing-plans` supplies task ownership, named APIs and RED→GREEN review gates; its normal commit/execution suggestions are overridden by this planning-only assignment. `warworld-animation-authoring` and its acceptance matrix require actual final armed motion/contact evidence; its different TypeScript-era paths remain absent here, so native Node/Vite fixtures are the explicit adaptation. This is a bounded follow-on plan to already accepted direction, not authorization to execute while Nanite implementation owns the shared files. Parent approval is the next action; no runtime/tests/media or commits were performed while preparing this plan.
