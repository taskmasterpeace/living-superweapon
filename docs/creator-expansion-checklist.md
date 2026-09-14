# Creator expansion — repeatable module contract

All additions use the existing faceted body and UAL skeleton. No native flight controls or combat timing changed. Artist-authored animation remains the intended combat pipeline.

## Completed request checklist

- Breach shield: corrected palm mount, upright/outward face and rear grip brackets; round, kite and riot styles verified. Armored machine frame and replaceable right-hand cannon prop. Cannon is presentation, not a new live attack.
- Emblems: existing upload preserved; size .4–1.8; front/back/both plus cape and either shoe. Cape overlay follows the bounded cape bend approximately. Named placement, not arbitrary drag-and-drop.
- Female chest: adjustable low-poly bust contour 0–1, default .45 on female anatomy; hidden beneath coat/vest. Not a soft-body simulation.
- Hair: long, mullet, parted, rainbow; improved slicked/braided back coverage. Sol uses mullet; Kamaria long hair; Nova parted blonde. Forward baseball cap added beside backwards cap.
- Ironclad: contrasting center panel. Crucible: short-sleeve hoodie and denim. Feral: longer taper on single bone claw. Ripclaw: slate/coral hoodie and denim. Rage: heavy frame, muscle 1.3, size 1.25. Nightfall: thin connected mask, no cape. Stefanos: business shirt/lapels and dark trousers; previous pinstripe uniform transferred to Abeo. Mustaches on selected candidates.
- Belts: plain, utility, sash, double; individually selectable.
- Footwear: boots, shoes with secondary-color side strip, sandals with visible skin and straps. Shoes/boots have separate region color controls; shoe emblems use named targets.
- Auras: body/fists/head; always/flight/attack preview triggers. Emissive material region and intensity controls; absolute black switch for #000000 surfaces. No bloom pass required. Runtime attack-trigger state wiring is still separate.
- Tattoos: transparent PNG/WebP upload with shared normalization; face, back/sides/top of head, whole head, chest, left/right upper arm. Eight saved layers plus current preview. Bars sample loads from public/patterns/warden-bars.png. Four/five flat head surfaces are not seamless UV wrapping; inspect edge and eye placement.
- Region colors: torso, arms, forearms, legs, calves, waist, boots, shoes, shoulders, gauntlets, cape, coat, belt, vest, backpack.

## Add a reusable part

1. Use recipe fields with fixed enums/numeric limits in modular-costume.js. Preserve old saved values. Put named character choices in hero-signature-recipes.js; don't change powers to match a cosmetic prop.
2. Author a rigid part in modular-signature-parts.js or tailoring/images modules. Coordinates are meters: Y up, front -Z, roughly 1.83m base body. Mount through canonical inverse bind matrices. Never compute bind placement from the current animated pose or mutate joints.
3. Add editor control, sync, change listener, validation and export roundtrip together. For replacing a hand, glove or belt, hide the native slot explicitly. Do not add physics for hair/cloth by default.
4. Inspect idle, attack and flight from front/back; run relevant tests, regenerate recipe/image captures, rebuild roster review. Screenshots are candidates, not automatic approval of animations.

## Verification

Shield orientation tests sample authored idle phases and verify grip/outward normal. Image placement tests verify binding, caching and disposal. Creator browser test covers new enum controls, layered tattoos/export, Rage size reset, glow/fist aura. Signature tests cover all 56 recipes and unchanged bones. Production build checked. Dedicated axe/dual-katana animations remain outstanding from prior work; this pass does not claim to finish those.
