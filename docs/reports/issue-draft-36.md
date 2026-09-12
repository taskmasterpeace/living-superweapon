## Outcome
Differentiate the speedster through readable motion trails and a close-range time bubble. Combat/movement prototype, not a global slow-motion effect.
## Proposed first tuning
Data-owned radius, duration, energy drain, cooldown and slowdown factor. Owner retains responsive movement. Use a capped slowdown, never complete input freeze. Start with hostile fighters and hostile projectiles inside the volume; allies stay unaffected. These are prototype recommendations to playtest, not final balance rulings.
## Implementation
Audit movement/action time ownership before changing clocks. Apply local scaling consistently to affected movement, attack windup/recovery and projectile travel. Keep camera, input sampling, HUD and audio scheduling on real time. Define crossing behavior, minimum speed and strongest-effect-only stacking. Preserve traveling beam hose semantics; explicitly test whether segment/tip crossings can be supported before enabling beam slowing. No permanent state after leaving, death, reset or owner removal.
## Presentation
Readable boundary, restrained lightning/afterimages close enough to see from the back-side camera; no purple. Speed tiers visibly differ. Pool effects and cap density for mobile. Bubble must have obvious active/ending states and escape counterplay.
## Acceptance
Compare identical outside/inside trials; dodge, melee approach and exit remain possible. Multiple bubbles cannot multiply slowdown indefinitely. Verify owner/ally policy, projectile boundary crossings, death cleanup and frame cost. Capture native before/after clips.
Related: #14 #16 #19 #30. Land basic approach, firing and movement correctness first.