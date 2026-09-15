The hero-hover regression still searches for TorusGeometry, but the shipped bow in src/engine/figure.js now uses a curved TubeGeometry. Consequently tools/hero-hover.test.mjs:41 fails with 0 !== 1 before checking contact.

Replacing that finder locally with the actual weapon-bow TubeGeometry revealed thigh penetration (106 sampled surface points in one tested frame/bulk). The diagnostic finder change was reverted to avoid mixing unrelated weapon work into the cruising-style checkpoint.

Reproduce: node --import ./tools/helpers/character-css-loader.mjs --test tools/hero-hover.test.mjs

Next: update the test to the actual curved bow limb, then fix bow-specific grip/clearance across its three tested bulk sizes. Do not change default unarmed hover poses to hide weapon clipping. Verify ground and flight aim/attachment contact before closing.
