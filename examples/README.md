# COMET — original BFP-style sample kit

This is an importable example of the actual editor/runtime features, not a shipped roster change,
an original BFP character, or a claim of complete BFP parity. Balance is an authored starting point.

Generate the portable file with `node tools/export-comet-example.mjs`, then import
`artifacts/examples/comet.character.json` in Character Studio. Import always creates a separate
editable character. No existing character or browser storage is overwritten by the generator.

COMET retains the reference-calibrated rear camera, martial arms-back flight family and world-space
motion trails. Its costume/palette/poses, flight response, camera and attacks can all be edited.

| Input | Authored behavior |
|---|---|
| LMB hold → release → second press | Charge, launch a steerable traveling beam, detonate its actual tip |
| RMB hold | Rapid energy volley |
| Q → second press | Missile separates into four homing children |
| E hold → release → second press | Charge a growing orb, then remotely burst it |
| H | Existing Power Surge buff (data slot `f`) |
| R hold → release → second press | Slower, expensive ultimate beam and tip detonation |
| F / Space / Ctrl / Shift | Flight toggle / rise / descend / burst movement |

Use Studio's Attacks preview to inspect the actual projectile lifecycle and contact. The sample
references the local power catalog; it does not contain executable plugins, external models or sounds.
