# Signature model pass — 2026-09-13

## Deliverable and review
The shared workshop contains 55 named roster candidates plus a standard Deck 52 mercenary, and a seed-based mercenary generator. /roster-review/index.html shows original views beside actual candidate captures, retains base-stat rankings/power evidence, and links to each candidate editor and recipe. Source data: src/data/hero-signature-recipes.js. No canonical names, stats, powers or faction simulation have been rewritten by these visual recipes.

Explicit user directions are recorded for SOL, VEGAS, AEGIS, APEX, AURUM, BREACH, CHAINFIRE, CIRCUIT, CRUCIBLE (foundry), COLDSNAP, DUNE, DECIBEL, FERAL, GALE, JAWAH MATU (jawah), KANO, KING STEFANOS, KNIGHTFALL, MAJESTY, OLYMPUS, KRAKEN, MERC, KIVULI, MOSES, MYSTWARD, ONYX, SANDRA and WEBLINE. Others preserve their canonical palette/role as candidate baselines. These are reviewed working directions, not a claim every character's final art is approved.

## Shared implementation
- Lab-coat shoulder yokes bridge front and back over the shirt. Long and short variants use an authored morph, with scientist badge/pen removed in the short variant.
- Cape shapes: full, short, split hem, one-shoulder and pointed. Existing four horizontal vertex rows support the bounded cape bend. No cloth solver.
- Backwards cap, hood, speed helmet, armored visor, lower mask, skull mask, beard; thin paired wrist emitters and two curved claws per hand.
- Angelic and armored wings have bounded flight flapping; tentacles sway for presentation. Neither changes collision, attack reach or flight simulation.
- Metallic material treatment and translucent skin; cloth color can be overridden by region, and fabric repetition can be restricted to torso, arms or legs.
- Tattoo image upload for left/right upper arm or chest, plus removal. It is a single transparent attached plane using polygon offset, not a full mesh-wrapping decal editor. Coverage/extreme-body fitting needs visual review; covered tattoos can be hidden by clothing.
- Sword, axe, bat, spear and round/kite/riot shield previews. Golden lasso is a coiled carried prop only. Existing grips and authored motions are retained; dedicated weapon-contact animation is separate.
- Shared geometric signature emblems and Deck 52 back mark. Export preserves recipe choices, source ID, generation seed/version and uploaded images.
- The existing opt-in faceted runtime renderer now applies matching signature recipes/accessories. This does NOT force all legacy gameplay characters onto the new body. Full live-roster migration remains an explicit integration gate.

## Repeatable production
1. Edit a named recipe, retaining stable rosterId. Use candidate default colors only where the user gave no new direction.
2. Extend the Blender build for deforming clothing. Preserve source bones/rest matrices/actions. Coat shortening must operate on the authored tail vertices, not a parent-transformed world axis.
3. Rigid signature parts mount using skeleton inverse-bind matrices, never the actor's current animated pose. Authoring positions use Y-up and positive Z for the back; mount converts that Z convention to the GLB frame. Hand-local grip pieces use their existing hand basis instead.
4. Rebuild Blender asset and motion bank with tools/verify-character-pipeline.mjs --rebuild. Source and output arguments are explicit in that script.
5. Run tools/signature-parts.test.mjs and tools/signature-editor.test.mjs; record tools/signature-motion-review.mjs. For source/state/flight regressions retain the existing modular/flight/profile suites.
6. Run tools/capture-signature-roster.mjs then tools/build-ranked-roster-review.mjs. SIGNATURE_ONLY may list comma-separated recipe IDs for targeted visual recapture. Ordinary review notes remain in browser storage and should be exported by the user; generation does not replace those notes or the existing Excel workbook.
7. Approve motion fit, then enable the corresponding live body/profile and run the combat scenario. A finite-transform assertion or still image does not certify weapon contacts or cloth fit across every animation.

## Acceptance still outstanding
Models are NOT yet a finished production roster. Unspecified character identities need visual approval; shoulders, gear and clothes need more pose/size extremes. Helmets/claws/wings are low-poly candidate modules, not finalized character-specific sculpting. Crowd draw-call/texture budgets need profiling; new accessories add separate meshes/materials. No blanket no-clipping or final-optimization claim.

Live systems still needed: lasso attack/rope behavior; spear/axe/claw/tentacle contact motions; wing-specific hitboxes/reactions and AI assignments; tattoo wrapping/placement controls beyond the three mounts; carried hip/back weapon inventory sockets; distinct digitigrade alien and quadruped combat motions; infected feeding and entry/exit; full named-roster migration; dedicated shooting dive and full melee/aerial combat acceptance; beams/projectile presentation library. The previous roadmap remains tracked in #56.

MOSES APIO's current Atlas Protocol uses symbiont/tendril powers. KIVULI currently owns the gas-controller kit. Purple appearance is provided without silently swapping their abilities or names. COLDSNAP surfing requires a separate board/movement asset. Deck 52 standard-mercenary styling is available; a complete hireable unit/behavior/economy package is not implemented here.

## Three next paths
1. Recommended: integrate a small approved model set into playable soldier boxing and aerial duels. Benefit: validates movement, hit timing, equipment and model changes where they matter. Cost of postponing: more attractive previews without proof the fight feels right.
2. Finish specialist character art/animation (alien, dogs, feeding, wings/claws/tentacles and attachment fit). Benefit: roster identity and creature completeness. Cost of postponing: these specialists remain prototypes; doing it first delays the common combat proof.
3. SANDRA and the ring mission loop. Benefit: distinctive voiced/private threat information and a playable goal. Cost of postponing: signature narrative feature waits; doing it first can leave melee integration unresolved.
