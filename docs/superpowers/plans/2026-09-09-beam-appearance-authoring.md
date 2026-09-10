# Beam appearance authoring implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. One implementation owner, RED/GREEN checkpoints, then independent review. Preserve the shared dirty checkout; no commits, staging or worktree copy.

**Goal:** Make the existing narrow/pressure beam identities authorable in Studio and preserve genuinely neutral white beams without changing combat physics.

**Architecture:** Extend the incumbent sparse attack override schema with the existing build, temper and primary-color fields. Fix achromatic handling in the existing rear-view beam material; keep the native renderer, packet path and reached-contact implementation. Both Studio and the game consume the same materialized ability.

**Tech Stack:** Native JavaScript, Three.js0.169, node:test, installed Playwright and Vite. No dependencies.

**Spec:** User's September9 narrow-white/blue-white-pressure references, `docs/reports/2026-09-09-beam-reference-preflight.md`, `docs/COMPLETION_LEDGER.md`, `PRODUCT.md` and `AGENTS.md`.

## Global Constraints

- Camera correction and its independent review retain priority. This plan is prepared, not implemented or verified.
- Beams remain finite traveling hoses: preserve radius, speed, reach, steer, DPS, charge scaling, payment, contact winner, guard, clash and release lifetime.
- No new simulation, audio or particle clock; no global bloom/exposure change, replacement renderer, map redesign or cape work.
- No purple except KIVULI. New per-attack color authoring must not bypass existing profile validation.
- Preserve source identity, original reset basis, immutable sparse edits and atomic failed imports.
- The references are still images, not evidence of pulse rate, damage or sound. Initial comparisons use steady flow; no invented churn inferred from the word pressure.
- This slice exposes existing anatomy and repairs neutral hue. Additional source/contact flare authoring is explicitly outside this plan, pending the native visual comparison. Do not call this full reference matching.
- Primary color is in scope. Existing secondary color remains preserved from the recipe, not exposed with an inaccurate promise that it independently controls the rear core.
- City beam launch/pose currently remains `_openSky`-gated, independently of the new city camera. Do not change that authoritative readiness boundary here. Compare real city and existing open-sky rendering honestly; no camera-dependent damage/payment or false city animation-parity claim.

## Task1: Native appearance data, neutral material and portable Studio controls

**Files:**
- Modify `src/data/attack-tuning.js`: three beam-only presentation fields and hex validation; derived build/temper defaults from existing visual functions; explicit choices stay pinned.
- Modify `src/tool/studio-main.js`: render color affordance in existing Attack tuning, accessible label/error, unchanged transaction/Undo/save path.
- Modify `src/tool/studio-profile.js`: apply incumbent KIVULI-only purple rule to validated authored attack colors as well as character palette.
- Modify `src/engine/beam-surface.js`: achromatic-preserving palette helper used by existing surface shader.
- Modify `src/engine/projectiles.js`: reuse that helper for rear sheath color; honor build-specific restrained sheath density without changing physical radius or axial readability bounds.
- Create `tools/beam-appearance.test.mjs` and `tools/beam-appearance-browser.mjs`.
- Extend `tools/attack-tuning.test.mjs` only where existing integration fixtures are the right home for package/reset tests.
- Create `docs/reports/2026-09-09-beam-appearance-report.md` with measured results and explicit visual limits.

**Interfaces:**
- Keep public `setAttackOverride(attacks, def, slot, patch)`, `attackFields`, `applyAttackOverrides`, `applyProfile`, package import/export unchanged.
- Beam fields: `build` enum from `BEAM_BUILDS`, `temper` enum from `BEAM_TEMPERS`, `color` kind `color` requiring six-digit `#RRGGBB`. Use labels **Stream shape**, **Flow pattern**, **Stream color**.
- `sourceValue` derives absent build/temper with `beamBuildOf(source)` / `beamTemperOf(source)` and absent color with native `#8fe3ff`. Choosing a derived build/temper explicitly must pin it even if Width/material later changes; resetting the slot restores original implicit derivation.
- Export `beamSurfacePalette(color)` from `beam-surface.js`, returning private Three.Color values `{body, edge, heat, sheath}`. A neutral input must have equal RGB channels in all four; saturated input retains the existing body/heat policy. No global material mutation.
- New shader helper does not consume or modify ability gameplay data. Existing `shadeBeamSurface(material,color)` signature/returned time uniform stays unchanged.

- [ ] Add intended REDs against public schema/material paths, not a copied validator:

```js
const def={id:'cx_beam_appearance',abilities:{lmb:{type:'beam',name:'Probe',
  radius:1.6,dps:60,tipSpeed:150,maxLen:120,kiPerSec:22,color:'#ff8a3d'}}};
const patch={build:'ray',temper:'steady',color:'#ffffff'};
const overrides=setAttackOverride({},def,'lmb',patch);
const output=applyAttackOverrides(def,overrides);
assert.deepEqual(attackOverridesFromDef(output).lmb.values,patch);
for(const key of ['radius','dps','tipSpeed','maxLen','kiPerSec'])
  assert.equal(output.abilities.lmb[key],def.abilities.lmb[key]);
for(const bad of ['#fff','red','#zzzzzz',123,null])
  assert.throws(()=>setAttackOverride({},def,'lmb',{color:bad}));
```

  Also test invalid enums, unsupported non-beam fields, derived-default pinning after radius edits, reset, original source identity, source immutability and package roundtrip. Use existing profile/package fixtures, including failed purple import leaves live fighter/history/storage unchanged and KIVULI retains its exact exception.

- [ ] Add native palette RED by capturing the existing material's `onBeforeCompile` uniforms with `#ffffff`; prove current red-channel bias before implementing helper. Then assert helper output channels agree within1e-8 for white and neutral gray; blue/orange still remain chromatic. Verify material program cache keys do not diverge per color, time remains the existing uniform and no additional draw layer is introduced.

- [ ] Run `node --test tools/beam-appearance.test.mjs tools/attack-tuning.test.mjs`; record failures with their real cause before source changes.

- [ ] Add the schema fields using existing `BEAM_BUILDS`/`BEAM_TEMPERS`, not duplicated render tables. Add `field.kind==='color'` validation before the numeric fallback. Render a labeled color input in `attackInspector`; dispatch its raw hex string through the existing `data-attack-key` change transaction. Keep range/enum/boolean behavior unchanged. Add concise help: appearance only; physical Width remains a separate gameplay field.

- [ ] Implement neutral saturation handling without recoloring saturated roster beams. Use `saturation=Math.min(1,hue.s/.15)*Math.max(.8,hue.s)`: zero at neutral, continuous through the low-saturation interval and identical to incumbent saturation at/above.15. Preserve current body lightness.4, edge multiplier.55, sheath lightness capped.12 and heat whitening/1.5 multiplier. Test s=0, .075, .15 and saturated source colors. Both core and sheath must use the same policy; fixing the core while leaving the sheath red does not qualify. Retain all axial fade, depth, fog and compositor behavior.

- [ ] Check the rear ray sheath floor against `BUILD_LOOK.ray.sheath`. Restore distinct build density through existing table data, not a second hardcoded style switch. Render-side change only; verify identical path nodes, traveled tip and hit record for ray/hose/torrent variants with otherwise identical attack state.

- [ ] GREEN regression gate:

```powershell
node --test tools/beam-appearance.test.mjs tools/attack-tuning.test.mjs tools/studio-profile.test.mjs tools/character-package.test.mjs tools/beam-bend.test.mjs tools/beam-startup.test.mjs tools/beam-body-contact.test.mjs tools/beam-cover-contact.test.mjs tools/beam-clash-contact.test.mjs tools/beam-contact-feedback.test.mjs
npm run build
```

- [ ] Real Studio UI gate: create/import a genuine custom beam recipe; change all three appearance fields through controls; inspect actual native preview; Undo/Redo, Reset, Save local, reload, export/import through actual dialogs. Invalid color/purple import must fail atomically. Record errors without favicon/network interceptions. Capture medium desktop and390px inspector usability, not only DOM values.

- [ ] Native visual gate at fixed1600×900 camera/exposure: same genuine attack, two appearance variants (ray/steady/white and torrent/steady/blue-white recipe), each before contact and at actual body/cover contact, rear and side views. Show the source hand, receiver and beam together; no posing screenshots alone as motion evidence. Capture a short actual RAF sequence with steering/release; log unchanged radius/DPS/cost/packet travel and finite tip arrival. Do not hide cover, replace damage or increase bloom for the comparison.

- [ ] Review screenshots in color and grayscale and record which reference characteristics remain absent. Explicitly distinguish rendered breadth from physical Width. If neither native style visibly differs enough, report that rather than changing gameplay to force a visual result.

- [ ] Freeze source, provide scoped diff/evidence to independent reviewer, close confirmed defects, rerun focused gates, then update the completion ledger. No commit in this shared dirty checkout.

## Self-review / bounded completion

This plan covers existing per-beam shape/flow/color authoring, achromatic color correctness, portable editing and same-physics rendered comparison. It does not claim new source flares, all beam audio, general animation/impact feel, military/infection work, universal target visibility or the entire user brief. The separate city-camera task remains the immediate delivery gate.
