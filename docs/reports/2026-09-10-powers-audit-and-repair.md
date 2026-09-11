# Powers audit and repair — 2026-09-10

> Updated 2026-09-11: the five activation rows below are historical, not still unresolved. All five native-input/no-input comparisons activate correctly. A newly exposed curated-kit HUD transition crash was reproduced and fixed. See [activation closure](2026-09-11-power-activation-closure.md). After the [second curation batch](2026-09-11-power-curation-batch-two.md), fresh full-roster verification passes 379/379 current slots. Repetition/feel review is NOT complete: 22 exact-definition groups and 24 within-character overlap candidates remain after six default removals; all six remain authoring alternatives.

## Outcome

Audited **55 checked-in characters, 385 slots and 26 handler types**. Found **22 groups of identical mechanical definitions** after excluding names/colors/presentation profiles, and **30 same-kit family overlap candidates**. Static roster validation found no missing handlers/required-field violations. This does **not** establish that every power works in play.

Restored authored damage types through volley and charged-projectile creation, and through projectile splash. No roster entries, saved characters, bindings or assets were deleted. No visual redesign, speed tuning or deployment is claimed in this pass.

## Answers received

Read the download requested by the user: **41 answers, nine blanks**. [Readable decisions](2026-09-10-user-design-answers.md) and [preserved export](../design/exports/2026-09-10-user-design-decisions.json). Export statuses remain Draft. Their infantry/objective priorities inform the curation below.

## Confirmed bug fixed: element was lost between authoring and damage

| Path | Before | Now |
| --- | --- | --- |
| RIME Shard Volley | Authored cold; spawned Projectile.dtype was null | Cold reaches projectile |
| TORCH Ember Storm / SOL Heat Flurry | Authored fire; spawned dtype was null | Fire reaches projectile |
| RIME Absolute Zero | Charged projectile discarded cold | Cold retained on release |
| SPECTER Solar Nova | Charged projectile discarded fire | Fire retained on release |
| Projectile explosion | areaDamage called without dtype | Splash retains projectile dtype |

Regression tests use production runSlot, Projectile, Game.areaDamage and Fighter.takeDamage. Before the fix, seven of eight new cases failed; a fire/cold-immune target still lost **24 HP** to matching splash. After the fix those targets lose zero, while ordinary targets and untyped control explosions still take damage. Ordinary SOL Solar Flare already forwarded its type and remains a passing control.

This restores resistance semantics. It does not invent burn/freeze/status effects for every elemental hit. Those require their own authored payload and counterplay.

## Why previous all-powers results were not trustworthy

1. The old sweep marked an **unimplemented power as passing** because its fighter moved 6.2 units. Fixed: missing handler/metadata cannot produce passing evidence; positional drift no longer proves a projectile fired, and movement-only evidence requires observed execution.
2. Direct startMode left the title open. Animation-timed soldier throws correctly pause while that menu is open. The new isolated browser audit uses native LSW.enter, which closes it. All four previously flagged soldier throws then produced activation evidence.
3. The combined world/abilities benchmark is order/environment sensitive. Its first run had 11 world-check failures and five dash failures. Five originally flagged dashes passed a focused isolated retest. Do not label those as five diagnosed game bugs.

Latest full native-entry activation sweep: **380/385 passed the activation criteria; five unresolved rows**. Deliberately missing handler correctly rejected even with 6.5u incidental movement; no browser page errors. This is accelerated simulation with rendering disabled, **not** visual approval, damage-balance certification, animation acceptance or an energy-economy test (the bench tops up energy).

| Unresolved row | Observed result | Next diagnostic |
| --- | --- | --- |
| RIME / Ice Skate | Paid, 1.0u movement | Flat-ground input replay, inspect collisions and residual slide state |
| VOLT / Blink | Paid, 3.6u movement | Same, compare with no-input control |
| WARDEN / Slide | Paid, 3.6u movement | Same |
| TORCH / Jet Dash | Paid, 5.8u movement; passed isolated earlier | Remove order/terrain dependence before judging distance |
| VOLT / Lightning Flurry | No cost, no damage, 1.5u settling | Inspect target acquisition/LOS/height at 34u; repeat via native input |

These numbers describe this run, not stable performance/balance measurements. The original 11 world-bench failures remain untriaged; this pass does not close them.

## Curation: fewer repeated decisions, not merely fewer rows

A power earns a separate equipped slot when it changes **delivery, target choice, commitment, counterplay or team utility**. Larger numbers and another color alone are not enough. Preserve shared engine handlers; they are the authoring pipeline, not the source of repetitive kits. Preserve archived/custom options when changing default loadouts.

| Priority | Kit / overlap | Recommended action | Acceptance criterion |
| --- | --- | --- | --- |
| 1 | WEBLINE Spider Flurry / Maximum Spider | Keep one rush in the default kit; reserve the other as an upgrade/alternate, not another repeated combo button | Short hit-and-run punish versus a genuinely different signature interaction; no second same-job rush |
| 1 | WEBLINE Web Darts | Currently generic explosive volley with no web restraint payload. Rework as a distinct ranged web-control tool; do not advertise it as working web entanglement | Visible traveling web, bounded restraint/slow, clear break/escape condition, boss/hero resistance, cleanup |
| 2 | APEX Wave Cannon / Perfect Wave | Strong same-job candidate: both air/physical charged beams. Consolidate default beam, or make the signature require a different commitment and counter | A player can explain when to choose each without saying “more damage” |
| 2 | VEGA Violet Lance / Final Arc; TITAN Twin Cannon / Annihilator Array | Review as paired-beam candidates, not exact duplicates. VEGA already differs in derived dtype; TITAN differs numerically but uses the same beam family | Explicitly authored damage semantics, distinct firing commitment and purpose; visible tell |
| 2 | VANGUARD Invincible / Unbreakable | Both buff + invulnerability; latter also heals. Consolidate or separate short defensive timing from committed recovery | No interchangeable immunity buttons, readable vulnerable windows |
| 2 | MOSES Regenerative Bond / FULL BOND | Both timed damage multiplier + heal | One recovery action; signature must add a different decision rather than another heal/multiplier |
| 3 | MERC Charged Pistol / Heavy Pistol plus rifle/shotgun | Heavy Pistol is a loadout-alternative candidate, not necessarily another simultaneously equipped action | Rifle sustains, shotgun punishes close range, charged shot commits; grenade and blink retain separate jobs |
| Keep | AURUM fist/hammer/wall/turret | Keep shape/role distinctions; evaluate each outcome separately | Grab/slam, direct attack, blocking cover and sentry are not one job |
| Keep | TEMPEST push / cold cones | Keep displacement versus cold buildup if their gameplay proves distinct | Target visibly moves or accumulates authored cold, respectively |
| Keep | Shared rolls, jumps, baseline punches | Shared inputs are useful; avoid giving every character a bespoke button for the same navigation need | Character movement identity remains in tuning, animation and constraints |

54 dash slots and 51 buff slots account for 105/385 entries (27%). That is a concentration warning, **not** an instruction to remove universal movement. Review repetitive buffs and duplicate attack-wheel choices first.

## Exact mechanical-definition groups

Comparison excludes only top-level name, color, color2, vis, vprofile and sfx, after boot-style dtype derivation. Every other authored field remains part of the signature. Identical definitions across different characters can still have different outcomes because of character strength, talents, emitter anatomy and resistances. Therefore these are shared-template candidates, not automatic deletion authority.

- `kano.f` (Ascend) / `stormcall.f` (Wrath of the Sky)
- `vega.shift` (Burst Dash) / `tempest.shift` (Tailwind)
- `aurum.e` (Sentry) / `bulwark.e` (Watchtower)
- `aurum.shift` (Will Surge) / `kraken.shift` (Surge)
- `nova.shift` (Sun Step) / `pyre.shift` (Flare Dash)
- `rime.shift` (Ice Skate) / `trench.shift` (Current Ride)
- `warden.q` (Singularity) / `graven.rmb` (Event Well)
- `warden.r` (Collapse) / `olympus.r` (JUDGMENT BOLT)
- `apex.e` (Afterimage) / `marshal.e` (Mind Skip)
- `specter.shift` (Phase Step) / `kamaria.shift` (Slip Veil)
- `kraken.f` (Deep Hunger) / `foundry.f` (Tempered)
- `sarge.shift` (Combat Roll) / `merc.shift` (Combat Roll)
- `kivuli.rmb` (Solid Smoke) / `mystward.rmb` (Seraphim Shield) / `dune.rmb` (Sand Rampart)
- `kivuli.q` (Gas Form) / `marshal.q` (Ghost Body) / `kamaria.rmb` (Untouchable)
- `ironclad.e` (Flare Vent) / `foundry.e` (Forge Vent)
- `ironclad.f` (Overpower) / `marshal.f` (Resolve of the Dead)
- `ironclad.shift` (Vector Thrust) / `stormcall.shift` (Bolt Dash) / `graven.shift` (Slingshot)
- `stormcall.q` (Godblast) / `olympus.q` (Thunderbolt)
- `onyx.f` (Kinetic Release) / `jawah.f` (Stored Decibels)
- `tempest.f` (Eye of the Storm) / `graven.f` (Zero-G Field)
- `decibel.shift` (Staccato Step) / `jawah.shift` (Hush)
- `coldsnap.f` (Cold Read) / `talon.f` (Flow State)

Full inventory, definitions for overlap candidates and validation output: [machine-readable audit](2026-09-10-power-roster-audit.json). Scope excludes browser-local Studio/custom overrides; a player-customized kit needs a separate saved-profile audit.

## Web status

The focused production-fixture web suite passes **16/16**: snare travels from the wrist, acquires a valid target, pulls/releases it, credits impact, respects blockers and cleans up after interruption. Zip requires a valid world anchor, rejects missing/invalid anchors, does not pass through its wall and cancels safely. **Zip is not free pendulum swinging.** Passing these tests does not certify its subjective feel or the generic Web Darts volley.

## Verification and reproduction

- Focused damage, audit, charge, volley, interception, split-projectile and web suites: **111/111 passed**.
- Separate throwable action suite: **11/11 passed**.
- Production build succeeded; existing large-chunk and GLTFLoader static/dynamic import warnings remain.
- Full browser activation audit intentionally exits nonzero while unresolved rows remain. Inspect its JSON rather than equating exit zero with game completeness.

```powershell
node tools/power-roster-audit.mjs
node --test tools/power-damage-type.test.mjs tools/ability-evidence.test.mjs tools/power-roster-audit.test.mjs
node --test tools/web-snare.test.mjs tools/web-zip.test.mjs tools/throwable-action.test.mjs
$env:LSW_BASE_URL='http://127.0.0.1:5182'
node tools/power-audit-browser.mjs --all
npm run build
```

Browser output: `artifacts/power-audit/activation-results.json`. Original combined benchmark: `artifacts/flight-review/combat-checks.json`. Both are generated local evidence, not approved showcase footage.

## Next implementation order

1. Reproduce the five unresolved activation rows with native input and neutral-control comparisons; fix confirmed causes, not thresholds to make tests green.
2. Curate WEBLINE first: snare / traversal / one rush / genuine web-control shot. Preserve removed default choices as authoring alternatives.
3. Curate APEX and VANGUARD as the beam and defense pilot kits before applying the rule across 55 characters.
4. Make each retained power prove its intended effect against unguarded, guarding, resistant and obstructed targets; test interruption, depletion, KO, form changes and cleanup.
5. Review short actual gameplay captures and only then mark a power's feel/readability accepted. Aircraft expansion remains outside this pass.
