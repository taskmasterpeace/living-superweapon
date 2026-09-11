# Combat HUD density and status ownership

September 6, 2026. Desktop PowerWorld presentation follow-up. The prior flight
capture showed a tall meter panel, a mood badge covering the kit, and substantial
lower-left fight-area obstruction. This pass changes HUD layout, not camera
motion, maps, powers, damage, flight physics, roster data or editor schemas.

## Evidence and spatial direction

The primary visual task is following the opponent and the attack. Health,
energy and guard support that task; character role prose belongs in the existing
case file rather than occupying the meter panel throughout a fight. Tier and XP
remain visible. Mood and kit state remain present, grouped with the meters.

Baseline real-HUD fixtures measured normal meter heights of 224–247px across
SOL, STEFANOS and SANDRA at 800, 1280 and 1920px viewport widths. Inactive DRAINED
and Overdrive spans used opacity alone, so their text still wrapped and consumed
space. The mood badge used a fixed 250px bottom offset and overlapped kit content.
Its content dirty-check also prevented unchanged mood from returning after a menu.

Impeccable's layout guidance informed one warm-neutral status backing, compact
labeled meter rows and content-driven flow. Existing tier-dependent width growth,
energy warning wording and per-hero kit data remain intact. City and touch layouts
retain their original ownership and styling.

## Implementation

- Desktop-only CSS reduces normal meter height to 144px without removing the
  health/energy/guard labels, level, tier or XP. Inactive warnings use display:none;
  active warnings expand naturally without truncating their text.
- The status dock supplies one warm backing. Kit/mood/meter children no longer
  render three competing boxes. Existing colors carry health, energy and mood.
- Mood follows the desktop status dock, returning to document.body for city or
  touch layouts. Visibility and ownership update independently of content dirtiness.
- Comic speech/SFX placement reserves the whole status dock, including mood.
  Independent review identified this integration gap; a real placement regression
  failed in all nine cases before the occupancy correction.
- Real repeated HUD updates exposed a pre-existing TITAN bug: the infinite-energy
  branch removed `on` every frame but restored it only when the identity key changed.
  `∞ CORE` now remains active; only its text/color use the dirty key.
- The broader camera suite exposed an underestimated comic SFX animation envelope.
  A 413px reservation contained a burst that actually reached 456px during its
  easing overshoot, crossing the moving player for three frames. Bounds now cover
  the authored burst, +/-8-degree rotation, pop overshoot, ink and exit translation.
  The motion fixture pins rotation for a deterministic regression, checks that SFX
  remain visible, and exercises real short-lived exit animation in both directions.
  A deliberately conservative first bound suppressed too much lettering (45/120
  frames visible). Phase-specific 1.30 pop / 1.25 exit bounds retain 119/120 visible
  frames with no body overlap; each signed exit fixture paints 11 checked samples.

## Verification and limitations

`npm run test:hud` runs the new density regression and the existing clarity suite.
It covers nine density fixtures, active alert containment, no inactive text space,
mood/menu recovery, city/tablet ownership, comic placement, actual DRAINED/Overdrive/
infinite states, 18 tier/layout/targeting fixtures and city restoration.

The baseline failed the intended checks; the completed HUD suite passes. Vite
build passes with 204 modules. The scoped layout detector reports no findings;
that is a mechanical check, not a visual-quality rating. Independent review
approved the final occupancy and infinite-state corrections.

Final `npm run test:camera` also passes after the SFX correction: static/live
camera and safe-area checks, 44 vertical locks, 72 translating vertical fights,
30 fly-by cases, 42 transitions, 18 lane cases, 318 free-aim clearances, and the
complete comic projection/24-state/120-frame/exit checks. These are bounded
regressions, not a substitute for subjective combat playtesting.

Artifacts:

- `artifacts/flight-review/hud-density/before.json` and `after.json` contain the
  density measurements; before/after PNGs cover all three viewport widths.
- `artifacts/flight-review/hud-density/combat.mp4` is a six-second 1280×720/20fps
  production-input beam fight with a scripted moving opponent and scripted speech.
  It records 549.25 damage and no page errors. The capture predates only the
  TITAN-specific indicator fix and corrected SFX bounds; its KANO layout, speech
  and combat path are unchanged. The short-lived SFX bounds have separate animated
  browser regression evidence.

The overall game is not complete or rated 10/10. This recovers HUD space and
fixes state bugs; it does not prove high-speed camera comfort, imported-model
quality, complete effect art direction, or editor readiness. Large charge/beam
silhouettes and target legibility remain visible areas for further criticism.
