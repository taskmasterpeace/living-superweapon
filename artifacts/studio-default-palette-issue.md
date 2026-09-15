The existing Studio profile suite rejects the shipped defaults for mystward and moses: "Purple is reserved for KIVULI. Choose another hue." This blocks saving an untouched profile for those heroes.

Reproduce with node --import ./tools/helpers/character-css-loader.mjs --test --test-name-pattern="all shipped frame and color defaults" tools/studio-profile.test.mjs.

Resolve the mismatch between shipped palettes and the color restriction without silently changing unrelated player drafts. Add regression coverage for saving each shipped profile. Observed during the cruise-style checkpoint; src/tool/studio-profile.js and these roster colors were not changed in that checkpoint.

Separate test environment note: the full suite's browser check defaults to port5180; current dev server is5185. Set LSW_TEST_URL accordingly. A failed connection is not a profile regression.
