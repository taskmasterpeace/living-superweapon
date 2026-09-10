---
name: PowerWorld / Impact
description: Compact tactical HUD with truthful comic-book combat and speaker-linked dialogue.
colors:
  ink: "#0a0b10"
  text: "#e8e2d6"
  gold: "#ffd24a"
  danger: "#ff5a4a"
  energy: "#7fe6ff"
typography:
  display:
    fontFamily: "Rajdhani, Inter, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 400
---

# PowerWorld / Impact — UI/UX Bible

## Overview
**Approved by the creator on September 10, 2026. Binding direction for gameplay UI, menus, Studio, combat lettering and dialogue.**
Creative north star: **Comic impact. Tactical clarity.**
The world and fight remain dominant. Interface is calm between events; expressive comic lettering makes important contact and character speech unmistakable. Grounded military and superhuman action share one interface language.

Approved visual reference: [Impact C](docs/design/ui-direction/impact-c.png).
Previous A/B sheets are exploration history, not competing defaults. A's organized editor approach is retained through the existing [Studio contract](src/tool/DESIGN.md).
This bible governs design intent, NOT a claim that the implementation already meets it.

**Authority:** user decisions > this bible and its scoped Studio contract > conceptual image detail. Generated text, background buildings, exact face/costume, aircraft and illustrated numbers do not authorize new art or functionality. Existing original assets remain. Centered BFP chase-camera calibration remains authoritative over the image's perspective.

## Colors
Use the shared incumbent token source src/styles/tokens.css. Frontmatter lists reference primitives; do not create an unrelated parallel theme.
Gold identifies selected controls, active readiness and guard. Cyan identifies energy. Coral identifies health loss/danger; the current HP meter remains coral. Bone/white supplies legible text and neutral silhouettes.
Surface chrome is warm charcoal; thin borders separate controls without framing every readout.
Per-hero VFX may retain approved identity colors. No purple UI; Kivuli's existing character-only exception is not a UI theme.
**The Meaning Rule:** color never works alone: also use an icon, explicit state or shape.

## Typography
Rajdhani-style condensed display for chapter labels and special moments; Inter/system fallback for controls and readable values; tabular numerals for amounts and timers.
Comic impacts use purposeful hand-lettered shapes with dark/light keylines. Quiet meter text stays straight and crisp.
Keep ordinary labels horizontal. Never shrink until a word becomes a column of letters. Show a short selected-ability label; put full descriptions in deliberate menus.
Do not use concept raster microtext as a font-size specification. Verify at actual device size.

## Layout
**The Fight-Clear Rule:** protect target, reticle, flight corridor and player silhouette before adding panels.
- Centered rear BFP is default. Shoulder is an explicit option, not an incidental redesign. Camera collision stays enabled.
- Desktop: compact portrait/vital cluster; player-adjustable position and size through HUD settings; small objective and contextual notices at edges.
- Two selected attacks are primary. A small utility row supports melee/guard/grab or the active role. Avoid a permanent wall of all powers.
- Flight speed/boost/altitude only when useful; soldier ammo/reload/stance replace irrelevant hero information.
- Mobile: compact vital cluster locked at top within safe area; movement left, primary/secondary and utility touch targets right. Proposed minimum touch target 48 CSS px; test physically, do not scale desktop controls down.
- Optional map/radar and detailed inventory stay user-controlled. Do not hide directional threats behind a menu.
- Menus release/suppress gameplay triggers and camera input, then restore deliberately on exit.
- Studio keeps library / dominant live stage / inspector / transport, stacking inspector below stage on narrow screens.
- News playback and detailed loadouts belong in selection/pause surfaces, not a permanent center overlay.

## Elevation & Depth
Small dark backing scrims provide contrast over sunlight, sand, night and lightning. Avoid expensive broad blur as a requirement for readability.
Halftone and ink texture belong inside brief comic events, not as a permanent grain layer on the playfield.
UI glow is restrained. Bloom is for world energy/impact, never a substitute for text contrast.
Strong motion is reserved for meaningful changes. Reduced motion retains text, outline and state while removing bounce, shake and repeated flash.

## Shapes
Quiet UI uses the incumbent rounded geometry and precise thin strokes. Impact silhouettes are intentionally expressive and semantic:
- compact metallic spikes for absorbed armor impact;
- weighty irregular burst for blunt body impact;
- broken-shield crack for guard break;
- strong outlined K.O./DOWN for confirmed defeat;
- rounded speech for talk; jagged speech for yell; appropriate distinctive radio treatment.
Use coherent native SVG/canvas/CSS shapes; never crop generated concept words into production controls.

## Components

### Combat outcomes
| Actual resolved result | Presentation |
| --- | --- |
| Plate/armor absorbs a hit | TINK / CLANG + shield/plate cue, ARMOR HIT |
| Partial armor and HP damage | Absorbed amount and actual HP loss distinguished |
| Shieldpack/nanite absorbs | SHIELD HIT; not automatically BLOCK |
| Active guard intercepts | BLOCK |
| Projectile truly reflects | DEFLECT |
| Blunt body contact | THUD / WHAM, scaled to actual event |
| Guard meter breaks | CRACK + broken-shield cue, GUARD BROKEN |
| Authoritative knockout/down | K.O. / DOWN |
| Actual new bleed/burn/chill/freeze state | Corresponding labeled status icon |

**The Truth Rule:** presentation consumes resolved outcomes. Never infer armor from clothing, bleed from every bullet, burning from fire damage alone, or knockout from a big damage number.
Small vocabulary variation within one outcome family is permitted; random semantic meaning is not.
Throttle repeated hits per target/family; prioritize guard break/deflect/KO. Place lettering beside contact without covering the target. Keep automatic fire readable at distance.
Damage numbers show actual health lost, not raw incoming damage. Armor absorption has its own label/shape.

### Ability and weapon controls
One silhouette per mechanic shared between HUD, loadout and Studio: parallel rays beam, orb charge, burst impact, fist melee, shield guard, recognizable firearm, grenade and web/net.
READY, CHARGING, COOLDOWN and UNAVAILABLE have distinct progress/text/outline treatments. Do not rely on tint alone.
Same visual grammar supports firearm ammunition and hero power/energy. Existing controls remain unless explicitly revised; do not copy invented key bindings from concept art.

### Dialogue and shouts
Bubble tail tracks the animated speaker's mouth/head. Talk is rounded; yell is jagged. Speaker identity remains obvious while camera and actor move.
Visibility/distance rules apply before placement. Do not reveal hidden enemies. An offscreen permitted radio/shout uses labeled directional caption rather than a screen-spanning tail.
Cooldowns apply per speaker/category/line, with global concurrency and priority control. Drop stale chatter; never replay a backlog after combat.
Text and recorded audio should use the same admitted event and real clip duration; Sound Library audition intentionally bypasses gameplay gating.
Close talk versus wider-range shout must be tuned against measured world scale, not arbitrary real-world distance claims.

### Studio, settings and loadouts
Show saved/unsaved/loading/fallback/error state honestly. Selection is not issuance: a loadout must reach the native equipped weapon before saying equipped.
Preserve local draft and undo/save/import/export behavior. Visible retry must work while preview is paused.
Expose camera presets/reset to players while keeping Studio's per-character authoring separate from player overrides.
Sound cues describe charge, release, sustain, impact, interruption and recovery as separate replaceable events.

## Do's and Don'ts
- Do compare native gameplay frames and motion recordings against this reference, at matched device sizes.
- Do test bright desert, dark storm, fast movement, repeated bullets, beam contact and multiple nearby speakers.
- Do preserve compact mobile HUD and centered third-person framing.
- Do keep original character/world art unless separately approved.
- Don't turn the game into a dashboard, remove its comic identity, or spam every bullet with giant lettering.
- Don't confuse ballistic damage, armor penetration and projectile continuation.
- Don't infer speech, contact, audio, performance or controls from a still screenshot.
- Don't call a visual score a complete gameplay verdict.

Implementation and release gates: [playable-slice spec](docs/superpowers/specs/2026-09-10-impact-playable-slice.md), [7pm plan](docs/superpowers/plans/2026-09-10-impact-playable-slice.md).
External production: [audio handoff](docs/handoffs/2026-09-10-audio-production.md), [building pilot](docs/handoffs/2026-09-10-building-pilot.md).

