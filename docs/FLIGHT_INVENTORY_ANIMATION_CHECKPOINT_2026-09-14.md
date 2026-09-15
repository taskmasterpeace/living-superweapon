# Flight, inventory and animation purchase checkpoint

Workspace: `D:/lsw/.worktrees/combat-release-review`, branch `codex/playable-integration`.

## What changed

- Character Studio's existing **Form & costume → Flight language** selector now offers arms at sides, two fists forward, two open hands forward, one fist forward, and fists near shoulders. These are authored joint targets, not newly purchased motion capture. They reuse the existing profile save/export path. Cruise overrides apply to forward flight and boost; combat, carrying and occupied hands retain priority.
- Animation Library source clips and editable studies now have useful family filters: unarmed combat; weapon actions; grabs/carries/throws; reactions/recovery; flight; movement/traversal; infected/creatures. Classification does not grant gameplay moves or approve their quality.
- A presentation contract covers all 37 registry items (14 firearms, 7 melee, 16 gear): stable IDs, icon IDs, proposed footprints and equipment roles. All icon artwork is honestly marked missing. It does not change equipment permissions or implement an inventory grid.
- Two inventory concepts and their exact generation prompts are saved below. These are generated design illustrations, not screenshots of working inventory or actual character model exports.

## Inventory direction

Use the compact **Field Kit** for Living Superweapons. Separate signature weapons, action bindings and two gadget slots. Being weapon-based should expose the character's assigned weapons without granting every hero an unrestricted rifle backpack.

Use the **Loadout Board** plus backpack for Soldiers. Primary weapon, sidearm and melee storage must be distinct from the two action inputs. Small/long item footprints describe storage size; mass determines carrying effort. Strength should not create unlimited backpack volume. Backpack capacities and example numbers in these images are illustrative, not balance decisions.

- [Field Kit concept](concepts/inventory-field-kit-2026-09-14.png)
- [Loadout Board concept](concepts/inventory-loadout-board-2026-09-14.png)
- [Exact image prompts](concepts/inventory-prompts-2026-09-14.json)
- [Inventory brief](INVENTORY_CONCEPT_BRIEF_2026-09-14.md)
- [Item presentation contract](INVENTORY_PRESENTATION_CONTRACT_2026-09-14.md)

## What happened to the purchased libraries

The full Universal Animation Library sources are preserved under `assets-src/modular-character/source/full-library-2026-09-14/ual1/UAL1.glb` and `ual2/UAL2.glb`. The inventory found 120 UAL1 takes and 134 UAL2 takes, with a shared A-pose name: 253 unique source names. Source preservation is not completed retargeting or gameplay integration.

The current mapped preview bank contains **33 source clips and one derived infected sprint**, not all 253 takes. Animation Library exposes these 34 bank entries, 30 editable studies and 13 existing authored entries: **77 preview entries**. They overlap in purpose and must not be advertised as 77 finished gameplay moves. Mapped source clips currently use a modular Vegas reference body; those entries do not yet support arbitrary roster appearance selection. No additional source clips were imported in this checkpoint.

Source motions are Quaternius; studies and cruise joint targets are authored in code. The infected sprint derivative preserves source leg/root motion while changing upper-body motion. Source names, timings and review labels remain visible in the library.

## Purchase recommendation

See [the creator-linked shortlist](ANIMATION_PURCHASE_SHORTLIST_2026-09-14.md). First inspect **Raise Knockdown & Get-Up** and **Raise Silent Grab & Hostage**. Recoverable falls and synchronized holder/victim tracks fill the most useful gaps. Next is a complete boxing style. A suplex pack adds finishers but does not replace sustained holding, release or getting up.

The Realistic Knockdown pack is a strong directional-fall candidate; its listing does not establish get-up coverage. Spear is a useful later weapon-specific family. Motorcycle idle can be authored against the actual bike's seat/handlebar/footpeg contacts; buying the pack is mainly worthwhile for its transitions and riding actions. Defer wall crawling until its surface-following controller is scoped. A wall-run or ledge-climb clip alone does not implement crawling.

Pack content and preview links were researched; full showcase videos were not visually reviewed. Prices in the shortlist retain currency/tier uncertainty. No purchase was made.

## Flight collision direction

Keep accidental collision separate from a deliberate ram. Use closing velocity into the contact, target/attacker effective mass, impact resistance and blocking to calculate impulse and damage. Strength gates lift/grip and deliberate bracing; speed still matters independently. A glancing scrape should differ from a head-on impact. Existing movement tracks velocity, but its collision paths are not yet a unified mass-and-relative-speed model. This checkpoint does not implement that model or claim plane/body collisions are proven.

## Next playable work

1. Choose a recoverable knockdown and a paired shoulder/rear hold from existing sources or one licensed pack; preserve both actors' contact and release timing.
2. Prove ground and flying pickup → hold → windup → aimed release → collision damage → get-up with current models. Reuse a supported carry torso while animating free limbs; do not let animation alter the collision body's path.
3. Map a compact melee style to three heavy-charge regions and weapon/hand ownership. Review blocks, hits and control-return times alongside attacks.
4. Implement the chosen inventory layout from canonical item data, then produce the actual 37 icons. Do not mistake the concept boards or manifest for completed UI/art.

## Verification and limits

- 49 focused tests passed: cruise styles/profile roundtrips, occupied hands and combat priority, delayed modular loading, flight families, ranged travel and held-character contacts. Evidence: `artifacts/flight-inventory-final-tests.txt`.
- Production build passed, with the existing large-chunk warning. Evidence: `artifacts/flight-inventory-final-build.txt`.
- Browser inspection found and fixed a real async-loading bug: the modular flight adapter captured a flying parent's orientation as its bind calibration and doubled the torso pitch after a Studio rebuild. A real-GLB regression failed before the fix and passed afterward. Fresh Studio inspection confirmed forward-flight preset changes keep the torso and cape aligned.
- Browser inspected open-hand forward, two-fist, shoulder-fist and arms-at-sides poses; all five styles have programmatic coverage. This is not an end-to-end gameplay acceptance claim for every hero, weapon or collision.
- Animation Library loaded 77 entries; its infected filter selected four entries and opened Zombie_Scratch on the current modular reference body. Existing review labels were retained.
- The broader pre-existing suites are not all green: [issue #28](https://github.com/taskmasterpeace/living-superweapon/issues/28) tracks an obsolete bow geometry assertion and actual bow/thigh clipping; [issue #29](https://github.com/taskmasterpeace/living-superweapon/issues/29) tracks two shipped palettes rejected by Studio's purple restriction. A separate browser test also targeted inactive port 5180; the current server is 5185. These failures are not hidden by the focused pass.
- No permanent hero profile changes, purchase, bulk retarget, inventory UI implementation, finished icon artwork, collision-system rewrite or new gameplay video is claimed by this checkpoint.
