# Thermavari authoring checkpoint

Original procedural model in `src/engine/thermavari-character.js`, available as Thermavari Hunter in the creature workshop. It is 7.5 ft / 2.286 m at its highest point, with independent hip, knee, hock and foot pivots, clawed feet, orange visor/core/back cells, and named left/right wrist weapon sockets. The humanoid alien recipe is not replaced: these are different rigs.

Five original candidate studies: idle, walk, stalk, attack and hit reaction. These are not imported mocap or gameplay assignments. Browser front/side review confirmed the articulated silhouette and exposed floating support feet in the walk study. Walk is explicitly rejected pending foot planting. Armor detail, complete multi-angle motion acceptance, weapons, leap/spit creature and gameplay integration remain unfinished.

Creature workshop can export the recipe and an animated GLB containing geometry, pivots and clips. GLB root metadata states world units (0.19 metres per unit). Do not rescale again as if these were metre coordinates. Recipe files identify the separate `thermavari-pivots-v1` skeleton. Humanoid clips are not directly compatible.

Verification: actual model bounds at 7.5 ft, independent hock topology, both weapon sockets, finite multi-phase transforms, unchanged simulation root, and GLB export/reimport preserving all five animated clips and named joints. Both tests pass; production build passes. This verifies structure and transport, not final artistic or gameplay readiness.
