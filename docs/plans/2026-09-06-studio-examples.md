# Playable authoring examples

User direction: implement the remaining combat/editor work and add meaningful features; no map work. This bounded addition makes the existing authoring systems discoverable without asking users to copy test fixtures.

## Contract

- Studio offers an explicit Example characters dialog: COMET (remote/split attack authoring) and HELION (three transformation stages, power unlocks, distinct flight languages).
- Each choice creates a new local copy through the existing validated character-package importer. Never auto-install, overwrite a fighter, mutate the shipped roster source, or write before the user's choice. Explain local storage and export backup.
- Resolve unsaved drafts with the existing Save/Discard/Cancel guard. Async loading canceled by closing the dialog must not install anything, even if the shared dialog is reopened. Storage failure leaves the dialog open with an actionable error and no partial roster entry.
- HELION is an original modular character, not licensed art: arms-back base, one-fist / two-fist / repulsor forms at levels 4/7/10. Unlock Q at 4 and R at 7. Uses existing powers, camera defaults, safe presentation schema and production form swap. Example tuning is not a balance claim.
- Dialog follows the warm charcoal/amber Studio shell, bounded phone layout, keyboard focus, clear per-example Create local copy actions. No redesign of the stage or camera.

## Evidence

1. RED pure HELION package validation/import independence, gates/form selection, calibrated camera, and repeatable factory with no storage side effects.
2. Implement the pure example factory and lazy example dialog; preserve all existing authoring paths.
3. Browser: cancel/no write, dirty-draft guard, create both examples, fresh IDs on repeated creation, failure/retry, delayed-import cancellation, save/reload/export, preview forms and actual gated attacks, desktop/mobile bounds and screenshots.
4. Independent review, build and focused editor regression. No claim that adding examples completes BFP parity.

Status: implemented. Factory tests pass, including repeatable data, independent IDs, production gates/form selection and default camera. Browser passes dirty-draft cancellation, delayed-module cancel/reopen, storage quota/retry, three independent copies, actual form and locked/live attack preview, export/reload and 390px dialog bounds. Desktop/mobile and form captures in `artifacts/examples/` were visually inspected. Independent review found no actionable defects. Production build passes 217 modules, with both example factories in separate lazy chunks.
