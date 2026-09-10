# Directional teleport and arena combat pass

Scope: continue the approved BFP/ESF-inspired controls, combat readability, military kits and custom-character tools. No map changes. Preserve classic controls as the default and the BFP rear camera framing.

Design: double-tap movement invokes the character's evade in that direction. Teleport must not silently select an offensive intercept. Offer Snap Step (12u / 6 ki / 0.7s), Blink (22u / 8 ki / 1s), and Rift Step (36u / 14 ki / 1.5s); talent recovery multipliers still apply. Long travel does not buy longer invulnerability than medium. Preserve altitude; reject occupied destinations before paying. RIFT gets the long portal-specialist step, MYSTWARD the short defensive step; other existing ranges remain intentional overrides.

Guard remains the strike/guard/grab trifecta. Deflect is an authored guard type: frontal ordinary bullets, bolts and arrows return to their caster, spend meter, brace the body, and cannot bounce indefinitely. Explosive/sticky special payload handling and beams retain their existing rules. No automatic perfect parry, aim cheat or bot-only discount.

Implementation and verification:

- [x] Reproduce wrong-direction teleport, altitude FX and exhausted-meter reflection with failing tests.
- [x] Implement legal directional destinations and shared teleport tier data.
- [x] Expose tier choices and guard explanations in ORIGIN; accept portable packages.
- [x] Add optional ARENA mouse melee selection, safe wheel switching, clinch recovery input buffer and focus-release cleanup.
- [x] Add original BREACH/RECON military kits and restore MERC's missing held firearms.
- [x] Exercise real double-tap controls at 30/60/120Hz and saved editor recipes.
- [x] Check production renders, camera matrix, control changes and live firearm/deflect combat.
- [x] Run the serial regression gates and build. Record observed limits without a quality score.

Results: `docs/ARENA_DEFENSE_PASS.md`, 13 passing serial gates and an additional mixed eight-bot soak. No production changes followed verification.
