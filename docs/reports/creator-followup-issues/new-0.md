Outcome: characters have identifiable energy expression in our current art style, not a universal charging shell. Existing base is docs/AURA_READABILITY_PASS.md and the native aura shader.

Families: energy streams, smoke, frost crystals/mist, wind ribbons/feathers, electrical arcs and arcane seals. Feathers only for fitting identities; not everyone emits particles at idle. Recipe has stable ID, attachment/body region, palette/emissive channels, idle/charge/boost/attack/drained/KO states, fade rules, density/size/trail, audio events, bounds and quality tiers. Optional emblem emission shares state events.

Use pooled sprites/meshes, distance and screen-size LOD, global particle/transparency budgets and strict cleanup. Keep opponent attack telegraphs and character silhouette readable. Studio supports dark/day backgrounds, pause/scrub state, preview on all supported frames, assignment/save/revert. Register a recipe once and discover it automatically in catalogs.

Acceptance: VEGAS gold energy, VOLT electrical wake and RIME frost visibly distinct; bubble stays a separate gameplay field. No phantom aura after KO/reset or hidden ongoing audio. Profile consistent simultaneous characters on desktop and landscape mobile. Combat VFX never silently changes damage. Depends on #23 #35; not part of the current Threat Room UI checkpoint.
