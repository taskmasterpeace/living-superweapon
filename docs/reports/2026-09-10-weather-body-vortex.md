# Weather body response and bounded vortex checkpoint

Status: implemented and verified as a development checkpoint, **not weather visual acceptance or completion of the game goal**. Aircraft expansion remains deferred. The authoring branch has not been merged.

## Implemented behavior

- The existing Fighter physics/collision path now integrates body wind before sweeping movement. Grounded soldiers are no longer excluded, and movement input does not clamp wind-driven velocity back to walking speed.
- Gameplay pressure is proportional to wind-speed squared × exposed area / mass / resistance. Strength increases resistance and footing; crouching, prone positioning, guard and upwind solid cover help. These are gameplay tunings, not meteorological simulation parameters.
- The source of wind is static ambient pressure for control loss and relative air velocity for acceleration. This avoids alternating ownership as the character accelerates toward the wind.
- Ordinary soldiers suffer impact-speed-based falls without requiring an enemy launch timer. Default formula: `max(0, impactSpeed² - 56²) × 0.035`. Normal jump and combat-leap landings remain below that threshold. Launch and fall damage take the larger penalty at one contact, not both added together.
- Existing heroes retain ordinary-fall immunity unless explicitly authored otherwise. Combat slams remain damaging. Ordinary falls do not excavate the oversized combat crater.
- Fixed a real falling-control bug: unpowered airborne movement previously applied the powered-flight 3-D speed cap, silently cancelling gravity and therefore fall injury. Only powered flight now owns that vertical clamp.
- Tornado selection creates one cloud-gated, finite vortex in front of the initial player position, not one that follows them. Four seconds of warning precede force; rotating inflow/lift, upper outflow and fade-out use one analytic field. Wind does not directly subtract health. Geometry contacts and landings use normal damage.
- Hurricane selection creates a broader rotating wind region with a lower-force central eye and stronger surrounding wind, without tornado updraft. This is a regional wind prototype, not a complete hurricane weather simulation.
- Vortex presentation uses a shader-deformed funnel plus 240 GPU-driven dust motes, no simulated debris bodies. Geometry/object counts are bounded; large screen coverage can still increase fill-rate cost.
- The sound harness has a replaceable `weather-vortex` sustain cue and generation brief. One owned spatial synthesized loop follows warning/active intensity and stops on expiry, weather change or reset. Rain and thunder remain separately owned.
- Studio → Flight → Wind and landing resilience exposes mass, wind resistance, safe landing speed and fall damage scale. Legacy profiles remain accepted; saves/exports validate bounded finite values. Settings reach the actual Fighter definition.

## Evidence

### Automated regression checks

98 tests passed in the latest combined weather, daylight, sound, fighter-contact, vehicle-contact, prone and Studio-profile suites. Includes 30/120 Hz wind displacement, shelter direction/destruction, force cleanup, beam wind exemption, unpowered falling under movement input, single-contact damage, native Fighter tornado lift/release/fall, and existing pose preservation across all shipped heroes. Added regressions cover crosswind versus self-powered wall collision, real downwind wall injury, stopping wind attribution, low authored fall thresholds, unchanged low-speed combat landing tuning and Size Change mass scaling.

```powershell
node --test tools/weather-body.test.mjs tools/weather-vortex.test.mjs tools/weather-lightning.test.mjs tools/weather-rain.test.mjs tools/daylight-presets.test.mjs tools/sound-library.test.mjs tools/sound-library-spatial.test.mjs tools/fighter-body-contact.test.mjs tools/vehicle-launch-contact.test.mjs tools/prone-presentation.test.mjs tools/studio-profile.test.mjs
npm run build
```

Build passed, 375 modules. Existing ~8.53 MB shared-bundle warning remains.

### Native browser routes

`node tools/weather-vortex-browser.mjs`: native Sarge → Tornado → Practice, W movement and Z prone. No actor/camera/weather overrides. The storm redirected the walking path sideways; one actual synthesized vortex loop was active. Zero browser errors. Weather choices fit a 390×844 viewport with minimum 44 px button heights and no document overflow.

- Results: `artifacts/weather-vortex/results.json`
- Passing recording: `artifacts/weather-vortex/page@a6b20f14c3c9222ed327804d23f58506.webm`
- Native still: `artifacts/weather-vortex/tornado-approach.png`

`node tools/weather-authoring-browser.mjs`: edit Studio values through numeric controls → Save local → reload → Play Test → Hurricane/Night/Practice. Runtime contained exactly `{massKg:120, windResistance:1.25, fallSafeSpeed:60, fallDamageScale:0.75}`. Native W input remained subject to wind. Zero page errors; one actual synthesized vortex loop active.

- Results: `artifacts/weather-authoring/results.json`
- Recording: `artifacts/weather-authoring/page@a6e96c5e2d99127e2e1a581dca49bc84.webm`
- Editor still: `artifacts/weather-authoring/studio-resilience.png`
- Native still and ordered frames: `hurricane-native.png`, `sequence.jpg` in that folder.

Post-review rerun passed the same native Studio route with zero errors and one active vortex voice. Latest recording: `artifacts/weather-authoring/page@b98ab5d707b335681368dc19e1b289ea.webm`; reviewed ordered frames: `artifacts/weather-authoring/review-fixes-sequence.jpg`. The cloud-covered night scene and sideways transport are visible; no claim of convincing wind-bracing animation.

Recordings have no captured audio track. Active sound handles prove triggering and ownership, not listening/mix approval or a user-selected vortex recording replacement.

### Performance scope

Foreground Chromium, NVIDIA RTX 4090 through ANGLE/D3D11, viewport 1364×768, renderer DPR 1, adaptive quality tier 2. Native Hurricane Practice after walking, **one Fighter**, 600 RAF intervals: median 4.2 ms, p95 4.4 ms, p99 8.4 ms, no intervals over 33 ms. This is RAF cadence, not isolated GPU timing, mobile performance, 4K performance or crowded-combat certification.

Latest post-review sample at the same reported viewport/GPU/quality: median 8.3 ms, p95 12.5 ms, p99 12.6 ms, one interval over 33 ms. Both runs are retained; this variation prevents treating the earlier fast sample as a guaranteed budget.

## Failures retained and addressed

- Initial native tornado approach had repeated microscopic skirt-updraft hops; ground collision repeatedly cancelled horizontal travel. Lift now needs to overcome gravity before releasing a supported body. The passing rerun shows continuous lateral transport. Failed recording retained as `artifacts/weather-vortex/page@5d6c7bac8321948b7d9da1a9bf86990b.webm`.
- The first sound assertion incorrectly searched a 40-event rolling log long after cue start. Verification now inspects the active owned loop; no production sound workaround was introduced.
- Initial added Studio test used an unqualified import name; corrected before measuring the expected unsupported-profile-field failure, then implementing the profile field.
- Fall tests originally omitted movement control. Adding that path exposed the vertical velocity clamp; the new regression now covers it.
- Independent code review found rain crosswind enabling self-powered wall damage, low authored fall thresholds discarded by contact admission, and saved base mass skipping dynamic size scaling. All three reproduced and fixed. Wind collision damage now uses its surviving velocity contribution along the actual collision axis, not the mere presence of wind.
- Additional tests caught arbitrary wind-attribution decay losing real wall injury, stale attribution after a stop, and a collateral change to low-speed combat landings. Fixed by tracking native drag and actual surviving momentum, clearing it on stops/respawn, and preserving the separate combat landing threshold. The independent reviewer cleared the original three issues; its final threshold note is now covered by the passing 98-test run.

## Remaining acceptance gaps

- Funnel and cloud visuals remain below the supplied Unreal storm reference. No independent visual score or 10/10 claim. Current funnel is a textured surface, not volumetric billowing cloud.
- Hurricane rain/cloud coverage and projectile wind remain global, while body wind is regional. A calm wind eye is implemented; a spatially calm sky/rain eye is not.
- Native tornado approach proves redirection, not a full player-input path into the core followed by recorded lift/ejection/fall. That full sequence is currently a native-physics integration test, not a completed gameplay recording.
- Dedicated bracing, involuntary tumble and wind-recovery animations remain needed; current presentation can look like a walking body sliding in strong wind. Live ragdoll wind integration is not added.
- Terrain itself is not a wind-shadow occluder; intact cover/interior proxies supply shelter. The debris skirt is centered on one terrain height, not fully terrain-conforming.
- Prone Q/E rolls and crouched Q/E lean remain outstanding from the earlier request.
- Crowded combat/4K/mobile GPU performance, final audio mix and final balance remain unverified.
- No production deploy in this checkpoint. The full original beam/infantry/flight/editor goal remains active.

## Authoring integration next

The separate `codex/authoring-pipeline` branch at `fe1a14b` was inspected. Its 33 node tests passed and changes remain under `authoring/`, `public/authored-assets/`, `docs/authoring/`. It is a pipeline foundation, not shipped gameplay integration or final art. Preserve the existing prone carrier: its source prone example is supine. First integration target is one soldier using packaged motion/equipment through current carriers, with fallback banks, timed sound events and live combat verification. Do not replace the whole runtime or merge unfinished art straight into production.
