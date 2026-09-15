# Highwall presentation correction — 2026-09-15

Later correction: see [the fortification and sight checkpoint](HIGHWALL_FORTIFICATION_CHECKPOINT.md) for the new module family, removal of the short Highwall sight radius, camera-only Alt orbit and demonstrated elevated stair routing. The text below records the earlier asset-restoration checkpoint.

This is an integration checkpoint, **not final visual acceptance of the game**. The earlier checkpoint proved useful mechanics while presenting unfinished equipment and environment art. Feature expansion is paused; existing scenarios, doors, navigation, cameras, saves and faction rules are retained.

## Entry and recovered content

Start at `http://127.0.0.1:5193/`. The deployment hub exposes Highwall, the original Frontline desert, the existing vehicle proving-ground desert, Threat Room and the preserved city game. It links to current character, creature, construct, motion and asset tools. See `docs/reports/UNIFIED_ENTRY_RESTORATION_2026-09-15.md` for exact destinations and loading evidence.

The source collection in `D:/lsw/public` contained the supposedly missing models. 1,560 missing package files were restored without replacing the five currently integrated vehicle versions. The complete catalog contains 157 model variants: 93 fleet, 7 character constructs, 51 equipment/ordnance and 6 facilities. These are model entries, not 157 fully functioning gameplay units. Catalog classifications no longer turn dogs or robot bodies into vehicles.

## Corrected presentation boundaries

- Current faceted soldiers no longer receive the legacy clone armor over their own modular outfit. One shared outfit recipe fits both hero and agile body frames. Wearable inventory ownership/transfer UI remains separate from recipe compatibility.
- Actual weapon package grip/support contacts drive the current modular palms through locomotion and reload. Authored weapon loading promises are excluded from logical inventory saves, preserving asset identity, ammunition and cooldown when loot transfers A→B.
- Default rifleman/patrol soldiers now use restored `prop.reference-weapon-rifle-m16@4`; sidearm operators use `prop.reference-weapon-pistol-1@5`. Heavy operators retain `equipment.kuchler-rifle@2`. The earlier carbine/sidearm placeholder defaults were replaced. The pinned adapter retains original geometry and maps actual source grip/muzzle sockets. Source package artwork approval remains a separate review, not something inferred from successful loading. Restored M16/pistol sources are single batched meshes: ammunition reloads correctly, but articulated magazine/bolt presentation is unfinished.
- Approved cold audio events no longer fall through to synthesized beeps. Highwall prepares sample buffers during loading. Missing reload recordings are silent and explicitly listed; no rejected `sfx-gaps` set was wired.
- Eligible grounded soldiers use the shipped `modular-hero.glb` `Death01` collapse, then a supported settled pose. Airborne/high-force deaths retain native physics. A supported authored corpse can fall when support disappears. General corpse grabbing and impact-driven wake are unsupported. This is one authored take, not the full purchased death library or directional coverage.
- Highwall XP grants are disabled at the shared progression boundary, so repeatable damage trials cannot unexpectedly change the tested character's tier. LSW corpse persistence until reset remains intact.

## Environment and visibility

`src/data/highwall-modules.js` defines the wall/pier/tower palette and dimensions. `src/data/highwall.js` places those modules and scenario landmarks. No player-facing editor was added. Existing 30-foot walls now have thicker sections, wide caps, inset panels, plinths, piers and perimeter watchtower forms. Spawn pads became small ground corner marks. The dropped-equipment marker no longer appears as a made-up crate over a corpse.

Rendering, physical collision, exact weapon/actor sight and ground navigation still derive from the same authored solid placements. A rebuild refreshes the existing fog occupancy data; gate movement refreshes it alongside collision/navigation. Decorative surfaces stay within module collision bounds. Walkers stop at walls; flyers can cross above them; the armored lane remains connected.

Highwall now enables character-owned visibility. Near allies and bright attackers do not bypass walls; the orbit camera does not rotate the character's vision. Hidden actors are concealed immediately. Combat captions and loot markers respect character sight. Bots choose targets through their own LOS/cone rather than the player's rendering visibility. The existing fog shader now considers occluder height and character eye height.

**Limit:** static world shading is still an approximate ground fog treatment, not full volumetric concealment of every environmental surface or effect. The layout and kit require further visual review against the supplied compound reference. Do not claim the entire map knowledge problem is finished merely because hidden actors pass their test.

## Evidence and remaining gates

- `artifacts/highwall/presentation/visibility.json`: production browser, explicit near-wall fixture, overhead orbit still concealed, genuine over-wall sight restored, native reset/W movement, no engine or page errors.
- `artifacts/highwall-soldier/`: 27 current-body equip/move/fire/reload/pistol-fire frames, reusable wearable A/B screenshots and exact package/source caveats. Both restored guns consume actual ammunition; rifle reload refills actual rounds. All three gun types transfer through casualty loot to another soldier with ammo/cooldown preserved.
- `artifacts/highwall-death/`: authored collapse and stable five-second body. Persistence was explicitly enabled and visibility disabled for the diagnostic camera. Fatal damage was invoked through the native damage method without a source actor. This proves pose/handoff behavior, not a complete live firefight or visibility test; normal biological cleanup policy was not changed.
- `artifacts/highwall-audio/native-footsteps-fire-reload.webm`: actual gameplay master-bus recording, not sample audition. `docs/AUDIO_PRESENTATION_ACCEPTANCE.md` lists event→files→actor and listening status. Non-silent captured output does not establish subjective audio acceptance.
- `artifacts/entry-hub/`: native link/asset/scale evidence. Isolated native runs reached actual ready states for Frontline desert, vehicle proving ground, Threat Room and combined-arms Highwall, with zero page errors. Frontline desert was verified in the preceding run; the final run rechecked the other three destinations. The training shortcut's missing squad-side argument was fixed. Thumbnails are real ready-state screenshots. A separate native city check reached running duel mode; editor/studio links were navigated; this does not claim those editors underwent a full functional audit.

The combined focused integration suite passed **62 tests** after the restored weapon adapters, XP gate and loot marker changes. The later sign-support/readability adjustment passed its 11 layout/native-contact checks. Production build passed; its existing large-chunk warning remains. Three extreme-aim native support-contact tests were reproduced failing on unchanged `dd155d4`; they are an existing unresolved issue, not accepted behavior.

Highest-value remaining gates: finish runtime source-motion coverage (especially restored firearm reload actions and directional deaths), review the sound mix by listening, and finish spatial presentation against the reference. Elevated AI navigation, general cover use, AI vehicle crews, damage-capable AA, containment and population limits remain separate unfinished integrations. No editor, new faction simulation or fake AA damage zone was introduced.
