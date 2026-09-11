# Studio fighter isolation

2026-09-07. Existing combat Front view could show the opponent directly over the selected character. The new **Isolate fighter** checkbox is an explicit inspection option in Orbit/Front/Side/Rear; full encounters remain the default.

`StudioPreview.setIsolated()` only changes target mesh visibility and inspection framing, then renders. It does not seek, advance time, rebuild the rig, change guard/damage/contact values, or write profile/storage data. Hidden partners still attack and receive real production contacts. Selecting Game camera clears isolation and restores the partner. Leaving combat disables and clears the choice. Profile/form rebuilds synchronize the UI and frame the currently active body size.

The framing fix also covers full beam/projectile/melee encounters on narrow screens. Previously, non-melee inspection used a fixed 75-unit distance: a 60-unit encounter could clip both bodies on mobile. All non-Game combat views now fit both bodies, including after paused resize and after unchecking isolation. Orbit retains its user zoom ratio. Gameplay camera constants and chase implementation are unchanged.

## Evidence

- `tools/studio-inspection.test.mjs`: eight CPU projection cases using real rendered body bounds, transformation scales 1.5→0.65 and 0.65→1.5, combat distance 12/60, and wide/narrow aspects. The old beam/attack camera failed the narrow full-body assertions.
- `tools/studio-isolation-browser.mjs`: actual selected-torso ray visibility fails before isolation and succeeds afterward; pose/root/time/profile/guard/contact state is unchanged by toggling. Scripted combat outcomes are identical while the opponent is visible or hidden. Real checkbox, Game camera restore, draft rebuild, both form-scale directions, desktop/mobile and paused 60-unit beam/attack resize are exercised.
- `artifacts/studio-isolation/`: before, desktop, mobile and JSON measurements. These use the actual user-facing editor control, not an image-composited or manually hidden substitute.
- Final regression ledger: `artifacts/hero-hover/verification/results.json` (only completed exit-0 entries establish a passing gate).

Final refresh completed: all 14 named commands exit 0, including full Studio, 12 responsive view layouts, progression/forms, blocking, strikes/poses, flight/languages, gameplay camera, portable character workflows, 53-kit combat and build. The 30-second eight-fighter soak recorded 822 hits / 20 KOs with no invalid states or errors. These counts are observations, not balance ratings.

The Impeccable/front-end polish workflow retained the existing authoring shell and added clear visibility/simulation wording. Independent review caught the form-scale and responsive full-encounter edge cases. Inspection is not a claim of complete BFP camera/feel parity, AI balance or finished character art.
