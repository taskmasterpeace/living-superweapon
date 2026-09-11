# Gadget and storm reuse audit

Read-only integration audit supporting the approved reusable-player-systems design. These are implementation seams and risks, not completed mechanics. Inventory remains ahead of these features in the release order.

## KNIGHTFALL: real contact, recoverable grounding

Use ordinary `spawnProjectile` and the existing projectile obstruction, nanite interception, deflection and `takeDamage` path. Accept the status only from the resolved contact outcome; launching a projectile must not immediately ground its target. Preserve deflected caster/team ownership and source attribution.

Current `Fighter.addShock` is not a safe direct substitute: it starts immunity on application, pins stagger while active, and its shock fields are not all cleared by the current KO reset. Introduce a small shared grounding lifecycle with source, remaining duration, post-recovery immunity and a disposable visual tether. Resistance/ccRecover reduce the duration; gravity and current fall/impact physics handle the fall. Apply loss of flight once, not forever. Do not automatically enable flight on recovery. Canonical held-attack cancellation remains in abilities.js.

Required tests: hit/miss/cover contact; frontal guard and reflected ownership; recoverable airborne fall; bounded refresh; immunity beginning after recovery; KO/cleanse/respawn/disposal/match-reset cleanup. This module must not invent another damage or collision system.

## TEMPEST: local volume, not a renamed global preset

Reuse `Weather` in systems.js, `WeatherLightning` warning/return-stroke/light leasing, `weatherSurface` roof queries, RainField shelter clipping, and weather-body's strength/mass/guard/prone response. Existing `Weather.command` overwrites global ambient targets and source, so it is unsuitable for a localized hero storm.

Add a bounded local-volume collection with owner, center/radius, build/active/dissipating phases and explicit cleanup. Samples compose with ambient weather; rain intensity needs a local mask rather than camera-wide rain. Wind preparation currently gates on global wind, so it must account for local field samples. Keep caps per owner and for the scene. Clouds build before rain; lightning uses a warning before damage and cancellable pooled lighting. Hail uses ordinary projectile collision/damage. Do not create a second weather controller, impulse system or fall-damage path.

Storm Command needs a reversible slot overlay. Cancel affected held actions before switching; snapshot and restore exact original slot state and selected attacks. Never mutate shared character definitions. HUD currently renders defaults from `p.def.abilities`, so mode presentation must explicitly consume effective slots rather than pretend the default kit changed permanently. KO, form change, actor disposal and `clearTransients` are backstops.

Required tests: ambient state unchanged outside the volume; clouds-before-rain and bounded lifecycle; roof-correct warning/strike; cancellation during warning causes no damage; exposed/sheltered/guarding/prone/strong wind responses; depletion/interruption/KO/form/reset restore original kit and release all volume, audio and light handles; repeated activation cannot exceed caps.

## Existing source owners

- Delivery/counterplay: src/engine/projectiles.js, abilities.js, entity.js.
- Weather authority: src/engine/systems.js.
- Reusable presentation/terrain: weather-lightning.js, rain-field.js, storm-clouds.js.
- Wind/physical response: weather-body.js, weather-vortex.js.
- Effective slots and cleanup: abilities.js, hud.js, entity.js, game.js.

Source audit performed by inventory_seams; runtime acceptance remains pending. Keep this separate from the completed archive storage work.
