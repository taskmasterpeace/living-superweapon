Shared character/animation pipeline update:

Implemented: reusable wardrobe recipes and compatibility rules; female anatomy; boxing gloves, wristbands, shoes and belt variants; braid/scalp and eyepatch strap repairs; original gilt fabric pattern and image upload; reusable infection surface treatments and three GPT Image concept directions; preserved healthy native flight with a studio-only arms-down infected overlay; bat/axe/sword/offhand-shield previews. Optional 29-clip full-skeleton motion bank now connects Character Foundation and Animation Library, preserving wrist/hand tracks. Roster review covers 55 characters and 352 ability slots, with before images and an edit-preserving workbook exporter.

Verification: 48 focused tests pass; browser review has no page errors; production build passes with bundle-size warnings. Visible example presets measure 1026–1852 triangles; crowd/GPU performance is not yet established.

Remaining acceptance work:
- Assign approved full-rig clips to live gameplay and AI, with contact/recovery/interrupt markers; existing previews do not establish hit rules.
- Dedicated bat/axe/two-hand combat clips and shield contact/prop-fit review.
- Real side-shooting dive animation for one gun, dual guns and shotgun. Proposed input: Sprint + lateral movement + Jump, consumed once; prevent unintended takeoff.
- Living roll/get-up vs knockback, uncontrolled falling and KO transitions; KO must not auto-get-up.
- Live infected appearance/animation state selection; user approval of concept direction.
- Per-character approved after designs, native complete recipe persistence, wardrobe fit extremes and more hair/clothes.
- Digitigrade/creature support-motion proof and paired dog pounce/contact/recovery.
- Crowd draw-call/texture budget, optional AO and additional garment fitting.

Repeatable handoff: docs/CHARACTER_CONTENT_AUTHORING.md, docs/ANIMATION_INTEGRATION_AUDIT.md, tools/verify-character-pipeline.mjs. No unrelated fleet integration or wholesale roster replacement performed.
