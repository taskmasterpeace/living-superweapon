# PowerWorld UI direction — review concepts
Date: 2026-09-10. Impact C is APPROVED by the creator and documented in root DESIGN.md. A/B remain comparison history. This documentation does not claim runtime UI implementation.

## C — Impact (approved bible)
Image: impact-c.png. Velocity's calm edge HUD plus truthful comic hit families, KO, actual status labels and speaker-anchored talk/yell. Root DESIGN.md is the binding written contract. Centered BFP camera remains protected; no replacement character or map art is implied.

## A — Field guide
Image: field-guide-a.png.
More framed, equipment-oriented presentation. Compact portrait meters, selected attack rows, explicit state examples and a Studio continuation.

## B — Velocity (historical exploration)
Image: velocity-b.png.
Less backing panel area; thin status rails, shape-distinct powers, edge threat indicators, contextual speed/altitude, two primary actions and a compact utility group. Same semantic language for soldier ammunition and hero energy.
- Protect targets and the flight path; no permanent target line.
- Fixed, compact mobile top meters; comfortable separate touch targets. Actual hit areas must be tested, not inferred from this raster.
- Desktop placement and size are user configurable outside combat input.
- Show READY, CHARGING, COOLDOWN and UNAVAILABLE with shape/text/progress as well as color.
- State-specific controls: soldier weapon/ammunition/stance; hero ability/energy/boost.
- Keep inventory, extended commands and detailed power descriptions behind deliberate interaction.
- Maintain Studio's existing focused library / live stage / inspector layout; combat minimalism does not mean removing useful editor labels.

## Shared incumbent identity
Source: src/styles/tokens.css, src/engine/hud.styles.js, src/tool/DESIGN.md.
Warm charcoal / ink surfaces; bone text; gold interaction; coral health/danger; cyan energy; gold guard. No purple interface. Rajdhani-like display headings, Inter/system readable controls, tabular values.
Illustration colors and generated text are not a replacement for production CSS tokens.

## Illustration limitations — not approved assets or evidence
These are generated UI concepts, not gameplay captures. Rendered character appearances, buildings, aircraft, equipment, numbers and incidental slogans are illustrative, not new art commitments or feature claims. Do not import franchise-like aircraft or soldier silhouettes from B. Retain original roster and clone identity.
Camera framing in the pictures is not a numeric specification: preserve the separately tested BFP chase camera and full-body visibility; the B hero is still too large to copy literally. Beam collisions must stop at the actual hit surface regardless of illustration artifacts.
The mockups are not evidence of validated font sizing, contrast, safe areas, input behavior or touch target dimensions. These require native implementation testing.
The creator selected Impact C. A/B suggestions are superseded wherever they conflict with the approved root DESIGN.md.

## Production acceptance after selection
- One shared semantic icon set across gameplay, touch, loadout and Studio.
- Distinct narrow beam, charged shot, impact, melee, shield, grenade, web and weapon silhouettes at native size.
- Mobile: no vertical letter wrapping, no accidental camera input while menus are active, clear thumbs, safe-area padding.
- Desktop: readable against bright sand and dark storms; save/reset HUD adjustments.
- Reduced-motion option; threat/guard/drained indicators do not depend on color alone.
- Capture native screenshots at desktop and portrait/landscape mobile sizes, then verify in motion.

## Generation provenance
Built-in image generation tool, two alternatives; A had one fidelity correction. Exact prompts are in generation-prompts.md. Originals retained in the Codex generated-images directory.
