# Highwall terminal housing correction

The live surveillance console, archived-video console and audio appliance now share `buildHighwallTerminal()` in `src/engine/highwall-interactables.js`.

- Mount origin: bottom center; operator faces the +Z side.
- Envelope: 8 wide × 10 high × 5.2 deep world units (1.52 × 1.90 × 0.99 m at the game's 0.19 m/unit scale).
- Screen: 6.4 × 3.6 units, exactly 16:9, center 7.25 units above the mount. The image sits behind the solid bezel lips and belongs to the housing group.
- Construction: ivory service cabinet, dark reinforced plinth/cheeks/cap, inset red identification strip, keyboard shelf. Speaker replaces the screen with a grille using the same envelope.
- Asset audit: the restored facility catalog contains gear/aircraft/vehicle printers, cloning vat, warehouse and airstrip. None is a suitable standalone console. This housing is newly authored reusable geometry; it is not presented as a purchased model.

`terminal-family.png` is an isolated renderer capture. Its left screen shows the real surveillance render target looking at the red diagnostic landmark. It does not prove a native bunker approach. `result.json` verifies the live map, housing parent, mounting data and restoration of character-sight rendering after the surveillance pass.

Verification:

```text
node --test tools/highwall-terminal.test.mjs tools/highwall-interactables.test.mjs
7 passed
node tools/highwall-terminal-browser.mjs
No page errors; actual live render target connected; sight uniform restored.
node tools/highwall-devices-browser.mjs
Media play/pause/stop/volume/Escape, live target, cameras and disposal passed.
```

Existing device inspectors and audio remain in use. The terminal builder does not register world collision; bunker/module placement owns its traversability. Native placement inside the raised bunker and walking up its stairs are separate integration evidence. Subjective sound listening is not certified by these probes.
