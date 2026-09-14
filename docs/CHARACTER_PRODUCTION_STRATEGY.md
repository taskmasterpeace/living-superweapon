# Character production completion strategy

## Current review tools
- /character-foundation.html?recipe=scientist: long fitted sleeves, open coat, lapels, badge/pen and knee-length split tails. Clip review includes stand, walk and sprint. Tails follow thighs; waist panels cover the torso/hip transition. No cloth simulation. Extreme muscular fits and all combat poses are not certified.
- /roster-review/index.html: 55 canonical characters, 110 archived front/rear photos, 379 powers including power-ups. Separate base-speed and strength ranks, ties shared, never an invented overall combat rank. Declared speed excludes flight tiers, boosts and travel abilities. JELANI currently leads base speed; RAGE leads strength. Missing elemental damage tags are shown as missing rather than guessed from colors/names.
- Design directions save locally by stable character ID and export as JSON. Browser profiles are separate; export before moving computers. Existing Excel review edits remain untouched.
- Vegas has a genuine workshop after candidate; others await implementation and user review. These are candidate appearance comparisons, not proof of gameplay migration.

## Clothing standard
1. Repeating textile: square seamless 256×256 preferred for simple stripes/veins, 512×512 for detailed ornament. Left/right and top/bottom edges must match. Upload currently normalizes large files to at most 512 pixels; it cannot turn an arbitrary photograph into a seamless tile. The Pattern size control changes repetition, not the underlying garment dimensions.
2. Positioned artwork: front/back insignia uses a transparent image and its dedicated surface. Pockets, lapels and badges must not repeat across sleeves. Scientist lapels/badge are modular geometry. A general garment UV atlas/template editor remains future work.
3. Shape: coats, helmets, gloves and boots are geometry modules. A fabric image changes surface color, not clothing shape. Keep attachments at named body sockets and fit them across supported proportions.

Cheap examples now present: red/cream horizontal stripes and business pinstripes (256×256 cached generated textures). Scientist coat is white with separate dark shirt/trousers, unaffected by fabric patterns. A full business jacket is a future shape module, not falsely represented by pinstripe paint.

AI textile prompt template: 'Create a flat seamless repeating textile tile, square 512×512. [colors and motif]. Orthographic flat graphic, even color, no lighting, shadows, folds, garment mockup, text or logo. All opposite edges must tile seamlessly. Angular low-poly game art vocabulary.' For simple patterns prefer deterministic generated textures; for unique fabric use one generated image shared by matching outfits. No per-character AI calls at runtime.

Textures add GPU memory/sampling, not polygons. A 256 RGBA texture is about 0.25 MiB before mipmaps; 512 is 1 MiB. Mipmaps add roughly one third. File compression is not GPU residency. Reuse pattern textures; avoid unique large images for every crowd member. Current recipe-color/scale cache can grow and needs an eviction budget before large randomized crowds. Transparency/extra layers and many separate meshes can be costlier than one opaque fabric map. Do not claim a measured FPS gain without a crowd test.

## Completion gates (in order)
1. User reviews roster: desired identity, silhouette, hair, outfit, colors, emblem, equipment, sprint, flight, infected variant, archetype and balance intent. Preserve canonical IDs and before photos.
2. Build a reference set: scientist, Vegas, soldier, female mercenary, heavy, infected. Prove all common motions and supported body sizes. Approve visual language before mass generation.
3. Wardrobe coverage: five capes, fitted shirt/jacket/coat, helmet/mask families, glove variants, belt and backpack sockets, holstered hip/back weapons. Fixed fitting/exclusion rules and recipes, not custom rigs per character.
4. Animation state coverage: healthy idle/walk/sprint/jump/land/aim/reload; light/heavy/guard/grab/throw/hit/knockdown/get-up; controlled flight/knockback/falling/KO; infected idle/walk/sprint/attack/stagger/kneel-to-feed/feed/stand-up/death. Quadrupeds and digitigrades have distinct skeleton families and tests.
5. Source animation acceptance: existing zombie idle/walk/scratch, new authored sprint derivative, and Fixing_Kneeling are available. Kneeling repair is NOT an approved feeding animation. Author feeding reach/mouth/head motion and entry/exit next; it should be interruptible. Live feeding decisions were explicitly deferred by the user. Arms-down infected flight stays intact.
6. Replace approved roster appearances in small batches with before/after and gameplay checks. Review speedster sprint, flight hand poses and hoverboard separately. Deck 52, Thermavari/digitigrade alien and automaton redesign remain awaiting source/style acceptance; don't import the unfinished fleet package.
7. Run playable soldier boxing then aerial duels using the same full-rig pipeline; mark contacts, recovery, AI assignments and damage rules. Add new martial arts only after the baseline works.
8. Powers presentation library: damage-family beam/projectile shapes, impacts, auras and sound. Match actual damage tags; arrows should remain arrows, not recolored generic balls.
9. Seeded generation: choose anatomy -> compatible frame/proportions -> wardrobe modules -> bounded color palette/pattern -> hair/face -> sockets -> animation profile -> infection overlay. Validate each rule, save seed + recipe version, cap draw calls/textures and capture a contact sheet. Random generation never changes named heroes' approved designs.

Complete means: replayable build, validated assets/recipes, reviewed moving fit, playable action states, AI use, rollback and repeatable evidence. No single workshop screenshot proves all nine gates.
