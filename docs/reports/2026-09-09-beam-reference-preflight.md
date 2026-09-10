# Beam reference preflight — 2026-09-09

Scope: the two user-supplied stills and current native BeamHose presentation/authoring. Only this report changed. No beam physics, camera, source/test/assets, audio implementation or browser capture changed.

## What the stills establish

Inspected originals:

- `C:/WINDOWS/TEMP/codex-clipboard-176d8b05-9c09-48f1-8b5c-1bc8a6593a9f.png`: restrained, thin white column; small character-side source; little surrounding glow. Menu partially covers the scene.
- `C:/WINDOWS/TEMP/codex-clipboard-8424dc52-aaa6-420a-a0d6-24145dd3ec86.png`: substantially broader blue-white stream, bright character-side flare and broad far-end splash/flare.

These support **two distinct visual identities**, not one universal beam look. They do not establish charge duration, pulse/flow cadence, travel speed, damage, knockback, release behavior or whether the far flare is a physical contact. Different view directions/exposure preclude a world-radius ratio from the screenshots. Neither image licenses copying the purple terrain/palette.

## Already present

| Native capability | Exact seam / consequence |
|---|---|
| Ray / hose / torrent anatomy | [visual.js:238](D:/lsw/src/data/visual.js:238) derives ray at radius ≤.8, torrent at ≥2.2, otherwise hose; explicit ability `build` wins. |
| Separate flow personality | [visual.js:252](D:/lsw/src/data/visual.js:252): steady, helix, kink, roil, crystal, sinuous, surge, churn. Explicit `temper` wins; material/spiral supply defaults. “Pressure” in the second still does not prove churn/ring motion. |
| Real two-layer beam | [projectiles.js:851](D:/lsw/src/engine/projectiles.js:851): swept core and sheath, tip, optional one instanced detail layer. `color` and `color2` enter native spawn. |
| Shared native entry | [Game.spawnBeamFor:3210](D:/lsw/src/engine/game.js:3210) resolves build/temper and preserves articulated emission, paid charge and existing gameplay values. |
| Native charge gathering | [abilities.js:45](D:/lsw/src/engine/abilities.js:45) and [charge-gather.js:6](D:/lsw/src/engine/charge-gather.js:6): bounded particles/ready ring on the actual preparation orb. Existing `effects.charge.intensity` changes gathering, not sustained-beam density/source flare. |
| Reached contact feedback | [projectiles.js:1616](D:/lsw/src/engine/projectiles.js:1616): accepted damage/metal contact emits at .18-second windows; [VFX.contact:318](D:/lsw/src/engine/vfx.js:318) supplies a small kernel, open streak fan and optional pressure rim. All accepted beam body contacts request pressure feedback; this is not selected by `temper='churn'`. |
| Actual Studio sequence | [studio-combat.js:396](D:/lsw/src/tool/studio-combat.js:396) calls native runSlot and updates the same projectile manager; it is not a separate preview beam. Current UI has slot, target motion/elevation/distance and charge-hold controls ([studio-main.js:29](D:/lsw/src/tool/studio-main.js:29)). |

The build table is already meaningfully different ([visual.js:263](D:/lsw/src/data/visual.js:263)):

| Build | Sheath opacity basis | Core radius fraction | Tip multiplier | Sheath flare |
|---|---:|---:|---:|---:|
| ray | .16 | .42 | .65 | 1.00 |
| hose | .42 | .62 | 1.00 | 1.06 |
| torrent | .50 | .70 | 1.45 | 1.18 |

Fresh native metadata probe confirms public examples: Optic Blast is radius .55/ray/steady; Heavy Beam is radius 2.6/torrent/steady with native charge/chargeWidth. These are **comparison witnesses**, not instructions to copy their emitter or physical widths to a different attack.

## Real gaps and constraints

1. **Studio does not expose those appearance axes.** Beam fields at [attack-tuning.js:102](D:/lsw/src/data/attack-tuning.js:102) include physical Width, speed, damage, power, cost and limited native flags, but no build, temper, color or color2. Fresh `setAttackOverride({}, def, 'lmb', {build:'ray'})` and corresponding temper/color/color2 probes all reject “unsupported fields.” The current [Effects schema:2](D:/lsw/src/data/effects-profile.js:2) has shield, charge and construct settings, no sustained beam/contact group. Global character palette is not a per-beam appearance editor.

2. **The rear-view adapter partly homogenizes the native table.** [projectiles.js:869](D:/lsw/src/engine/projectiles.js:869) applies the same open-sky color/density shader and axial opacity fade to every build. [Line 1465](D:/lsw/src/engine/projectiles.js:1465) floors ray sheath opacity to .34 rather than its table's .16. All builds share advancing shader strands/pulses ([beam-surface.js:52](D:/lsw/src/engine/beam-surface.js:52)); “steady” means no extra instanced details, not literally motionless surface shading.

   Importantly, **white data cannot currently make a neutral white body through this adapter**. [beam-surface.js:28](D:/lsw/src/engine/beam-surface.js:28) forces saturation ≥.8; final body/edge/heat derive from primary color and overwrite diffuse RGB ([line 65](D:/lsw/src/engine/beam-surface.js:65)), so color2 alone cannot restore the first reference's white column. A fresh CPU call to the real material helper with `#ffffff` produced linear body RGB **(.72,.08,.08)** and white heat (1.5,1.5,1.5). This is shader-uniform evidence, not a rendered-pixel claim.

3. **Source and impact breadth are intentionally restrained globally.** The source opening is .12 of its local radius before growing with traveled arc ([projectiles.js:999](D:/lsw/src/engine/projectiles.js:999)); charged preparation orb core/glow scales are .27/.85 ([abilities.js:56](D:/lsw/src/engine/abilities.js:56)). Preparation is killed on release—it must not be retained as a fake sustained source. Sustained source currently uses the nozzle plus bounded particles ([projectiles.js:1669](D:/lsw/src/engine/projectiles.js:1669)), not an independently authorable flare.

   At body contact the tube compresses to receiver bounds and tip becomes a shallow cap ([projectiles.js:1004](D:/lsw/src/engine/projectiles.js:1004), [1473](D:/lsw/src/engine/projectiles.js:1473)); the pressure rim is capped and lasts .2s ([vfx.js:352](D:/lsw/src/engine/vfx.js:352)). No existing per-beam knob recreates a broad source/contact splash independently. Raising physical radius, DPS or power to force that image would also alter gameplay and is not an appearance-only solution.

## Minimum existing-data-first path (proposal, not implemented)

1. **Keep both identities.** Use existing ray/steady and torrent/steady as first comparison candidates. Do not add helix/churn/pulses based on stills. Preserve each actual attack's emitter, radius, charge-to-scale, damage, payment, speed, reach, steer and contact rules.
2. **Expose existing appearance data before adding a new beam renderer:** validated sparse build/temper controls, and per-attack color/color2 if palette authoring is approved, through the current attack schema/materialization/save/reset/import path. No new simulation clock or fake preview. Source identity must remain the genuine recipe basis.
3. **Acknowledge the data-only ceiling.** If native A/B still misses the references, add only bounded render-side choices to the existing beam presentation: neutral-color preservation/restraint for the narrow identity; optional source/contact radiance and spread for the broad identity. Keep legacy appearance defaults and axial readability bounds. An added source flare would belong to the beam group/muzzle and its lifetime—not a retained charge orb. Reuse native reached contact events for any splash; never trigger it before the traveling tip reaches a real receiver. Do not globally increase bloom or make every beam the second image.

Any future presentation object must remain bounded and follow [BeamHose._dispose:1686](D:/lsw/src/engine/projectiles.js:1686): per-beam geometry/material cleanup, pooled light return, existing beam voice stop. The current 44-packet path and render-only BeamCurve must remain independent of appearance fields. Release still travels/fades; it must not become hitscan.

## Small evidence gate

Later implementation should use identical native attack state/camera/exposure for narrow/broad A/B, with separate free-flight and real-contact moments, side and rear views, and restrained/bright source comparisons. Verify grayscale silhouette as well as color; inspect the actual receiver and hand, not just bloom. Existing CPU regression commands to preserve:

```powershell
node --test tools/attack-tuning.test.mjs tools/beam-bend.test.mjs tools/beam-startup.test.mjs tools/beam-contact-feedback.test.mjs
```

Also retain existing beam body/cover/clash tests and GPU density/surface checks for the implementation's actual scope. **Those suites/browser checks were not rerun for this read-only preflight**; fresh evidence here is source inspection, the original stills, public metadata/validation probes and real shader-helper uniforms. No visual match or gameplay feel approval is claimed.

Charge/blast/impact audio descriptors are parent-owned and intentionally not duplicated here. This report neither infers sound from silent stills nor requests new providers, assets or voices.

Skill used: Three.js runtime review, separating native simulation from material/geometry appearance and requiring actual rendered evidence before a visual-match claim.

