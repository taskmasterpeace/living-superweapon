# Gameplay recovery audit — September 11, 2026

Scope: repository documents, current source, recent accessible conversations, local saved conversation records, related worktrees and open GitHub issues. This is a source/status audit. No new runtime tests, visual acceptance, merge or deployment were performed. The user explicitly selected **audit and gameplay plan first**.

Read the [consolidated gameplay design](../GAMEPLAY.md) and [delivery roadmap](../superpowers/plans/2026-09-11-gameplay-consolidation.md).

**Same-day follow-up:** the creator added desert preservation, police-to-military escalation, finishing-hit recovery space and aimed spinning throws. The [reference review](2026-09-11-melee-esf-reference-review.md) records the three supplied clips, existing police/throw code and focused decompilation of the downloaded ESF server library. Continuing decisions/status are in the [tracker](../gameplay/TRACKER.md). This follow-up does not change the unverified runtime/merge status below.

## 1. The missing work was found

| Location | Observed revision | What it contains |
|---|---|---|
| `D:/lsw`, `codex/construct-effects-pass` | `814d322` | Older working checkout; existing portrait HUD, weather/body work, combat engine and session footage. |
| `D:/lsw/.worktrees/sarge-authoring-integration`, `codex/sarge-authoring-integration` | `59d8c79` | Newer power repairs/curation, Impact design bible, supplied design answers, solo-loop spec, archive storage and Newsroom UI candidate. |
| `D:/lsw/.worktrees/enterable-building-pilot`, `codex/enterable-building-pilot` | `862f65a` | Research-lab asset/manifest/collision delivery and integration notes; not proof of integration into the playable mission. |
| `D:/powerworld-authoring`, `codex/authoring-pipeline` | `3224fe7` | Separate authoring worktree; inventoried for continuity, not fully audited here. |
| `D:/lsw/.worktrees/living-superweapon-registry` | `ca6f2ee` | Separate registry/proving-range worktree; inventoried, not accepted as integrated gameplay. |

The integration branch differs from `814d322` across **351 files**. It is not a small missing stylesheet. Its [merge checkpoint](../../.worktrees/sarge-authoring-integration/docs/reports/2026-09-11-merge-checkpoint.md) records a requested merge withheld after a broad run: **3,472 tests, 3,405 pass, 67 fail**. Build passed. Failures include absent local fixtures/stale browser port and substantive assertions such as contact/cloth/order checks. They were not all classified as environmental.

That report says Newsroom was interrupted before final review/polish. The newer branch is saved; it was not merged back to the current root. This can explain an older locally served UI, but this audit did not inspect the user's live tab or establish which deployed build they were viewing. Do not promise that opening a different port alone solves the remaining defects.

Tracked edits already present in the integration worktree's reference-usage report and SARGE plan were left alone. Existing untracked media and PRODUCT.md were preserved. No branch, asset, commit or issue was deleted or modified.

## 2. Evidence recovered from conversations

- **Analyze Bid For Power gaps**, task `01a073e0-b8fc-71b1-b8bc-9158cc97214c`: app retrieval returned older blocking/melee turns. A bounded read of the recent tail of its saved local JSONL recovered September 11 user messages that were absent from that retrieval page. This was not an exhaustive reread of the 3.79 GB conversation.
- **Game Modes Design**, conversation `6aa3174c-25ec-83e9-870f-79d289ba7fd7`: recovered the creator's clone/blood/vehicles/scientist/escalation request and the other AI's proposal. The attached proposal is preserved as source material, not treated as approved rules.
- **Can you see power world?**, task `01a08a8d-e5ef-7470-8596-efd0ad532e14`: only project/visibility checks, not the missing implementation.

Relevant September 11 UTC message times in the saved task:

| Time | Recovered creator direction |
|---|---|
| 03:45 | Research outpost; lab/yard/roof; breakable walls, doors and selected floors. |
| 03:57–04:11 | Accumulating clips over months, manageable Newsroom, hero TV; inventory; categories; KNIGHTFALL shock gadget; soldier turrets; Black woman weather controller; animated infected; visible selected attacks. |
| 05:35 | Shift first/second/third held gears; remove redundant Tempered-style power-up; SOL/VEGA favorites; hold weak kits; WEBLINE repair; near-death movement lock. |
| 05:56 | Energy-backed sustained blocking, liked third-person city police pursuit, CHAINFIRE/TEMPEST, soldier jetpack, downward DECIBEL sonic idea. |
| 06:01 | First loop includes VEGA, soldiers, gadget hero and weather controller; bottom-middle selected LMB/RMB attacks. |
| 06:04–06:14 | Close the concrete power-audit failures; continue. |
| 06:33–06:38 | Reusable archive → inventory/gadgets → TEMPEST → outbreak direction; designer discretion. |
| 08:07 | Commit and merge request; subsequent checkpoint explains why merge did not proceed. |

The current message adds highest-priority shoulder-limited Alt look, reinforces speed/power-up, proposes Tab melee stance, requests multi-contact punches with defensive opportunities, zero-HP-chip paid block, beam ground residue and ambient-preserving TEMPEST weather. These newer statements supersede incompatible earlier proposals.

## 3. Feature status: root versus newer work

| Area | Evidence and current status | Required closure |
|---|---|---|
| Alt independent look | No Alt look route found in inspected input/game/world owners in either checkout. Existing chase/shoulder options are different. | Separate view/aim/travel; shoulder limits; honest aim marker; cleanup and real-input proof. |
| Three speed gears | Both inspected paths retain Shift-held cruise. Newer flight audit identifies 1.5× cruise, optional short afterburner and desired-speed cap; no requested staged controller. | Physical stage profiles, universal gesture, legacy binding migration, MAX UI, collision/braking tests. |
| XP/forms | `grantXp`, `levelUp`, unlocks/forms and buff slots still exist. | Clarify universal power-up versus movement output; retire redundant buttons without deleting useful authored data. |
| Portrait HUD | September 10 addendum reports it implemented in root, including current-form portrait and contextual speed. | Latest bottom-center selected attacks, gear state and final native layout acceptance; not a complete missing HUD rewrite. |
| News archive | New branch has `src/core/news-archive.js`, adapter, storage commits `92d9f4b` → `12856ee` → `ff24706`; checkpoint reports real highlight persisted/replayed after reload. | Recover/integrate existing work; finish UI review, schema/ownership tests and native management flow. |
| Newsroom style | `src/styles/newsroom.css` declares a separate `--nr-*` primitive palette, despite DESIGN.md requiring shared tokens. Fonts already include Inter/Rajdhani. | Alias/reuse shared primitives and compare actual UI; avoid claiming typography is entirely absent. |
| Power activation | Latest second curation batch records **55 heroes, 379/379 equipped checks, zero recorded runtime faults**. Earlier 382-count/five-failure report is superseded for activation. | Not evidence that every power is useful, visible, balanced or correctly defended. |
| Power duplication | Latest reported static count: **22 identical definition groups; 24 same-kit overlap candidates**, down from 30 → 27 → 24. | Curate tactical roles, retain alternatives. Shared cross-hero handlers are not automatically bugs. |
| Melee | Buffered combos, heavy strikes, grab/body blows/throws and authored motion have existing work. | Separate contact timing, defensive gaps, moving air entry and clear finisher; Tab stance unresolved. |
| Guard | Newer `entity.js` still applies HP chip (12% strike, beam default 22%, other families differ) and drains independent guard meter. | Replace with tested energy-first interception/overflow policy, consistent with different defense types. |
| Near-death freeze | New checkpoint includes default Second Wind repair; old report describes forced hp=1 rally suppression. | Integrate and reproduce native damage sequences; do not claim all possible stun-lock sources fixed. |
| Beam contact | Native reports show successful thin/wide beam paths, plus startup/lifecycle failures. Source has surface/body sparks and contact lighting. | Continuous terrain-aware burn trail is not established; reproduce lifecycle and grounded sustained-contact outcomes. |
| TEMPEST | Global `Weather.command` overwrites ambient targets/source; new seam report explicitly says unsuitable for local storm. | Local owned composition, slot overlay, overlapping storms and teardown. |
| Cloning/genome | `FrontlineEncounter` has four hostile clones, case pickup/extraction; HUD says research not implemented. | Formal mission end, ownership, lab/research/clone budget, recovery/denial economy in subsequent slice. |
| Inventory | New branch contains armory/loadout and approved owned-inventory plan; checkpoint marks advanced ownership unimplemented. | Item identity/quantities, stash/bag, equip/drop/recover, persistence and mission cargo. |
| Interiors | Separate lab delivery has open ground-floor collision projection; stairs/hatch/selected floors require extensions. | Main-game integration of mesh, collision, LOS, navigation, breach state and camera. |
| Audio | Library/replacement infrastructure exists; September 10 snapshot: 79 cues, 66 preview-only, 11 replacement, 2 loops. | Current cue coverage audit, standalone workshop, heard/captured runtime start/stop; do not reuse historical counts as fresh measurements. |
| Performance | Existing reports retain cold-frame/mixed-workload limitations. | Comparable foreground workload including recording/weather/impacts and repeated restart. |

The power counts are report evidence from the integration worktree, not a fresh run this turn. The cited [second batch](../../.worktrees/sarge-authoring-integration/docs/reports/2026-09-11-power-curation-batch-two.md) supersedes the [activation closure](../../.worktrees/sarge-authoring-integration/docs/reports/2026-09-11-power-activation-closure.md) only where it gives newer counts. Detailed unresolved per-slot acceptance in the pilot matrix remains relevant.

## 4. Open GitHub issues checked

Live `gh issue list` reads on September 11 found five open issues on `living-superweapon` and two on `powerworld`. Bodies were retrieved. No issues were closed, commented on or edited.

| Issue | Disposition in the gameplay plan |
|---|---|
| [LSW #4 — per-part geometry/draw calls](https://github.com/taskmasterpeace/living-superweapon/issues/4) | Performance backlog. Re-profile modern authored figures before applying July-era counts. |
| [LSW #11 — performance epic](https://github.com/taskmasterpeace/living-superweapon/issues/11) | Tracking is stale relative to later work. Reconcile item-by-item with current measurement; do not infer all boxes remain unimplemented. |
| [LSW #12 — PowerWorld AAA epic](https://github.com/taskmasterpeace/living-superweapon/issues/12) | Broad acceptance umbrella. Replace “already has engine” reasoning with native camera/movement/combat/UI proof. |
| [LSW #14 — blind self-tests](https://github.com/taskmasterpeace/living-superweapon/issues/14) | Tests must detect known-bad behavior after respawn/setup. Power activation's inert-handler test does not close unrelated movement/transition/impact harness defects. |
| [LSW #15 — ATLAS terrain merge](https://github.com/taskmasterpeace/living-superweapon/issues/15) | Older broad terrain proposal. Test actual lab pad/route seams now; full ATLAS migration is not a dependency of the short recovery mission. |
| [PowerWorld #1 — mouse-look/aim](https://github.com/taskmasterpeace/powerworld/issues/1) | Open July issue with native pointer-lock reproduction requirement. Modern camera tests are not automatic closure. Alt must work on top of verified pointer-lock input. |
| [PowerWorld #3 — TRENCH hold/rework](https://github.com/taskmasterpeace/powerworld/issues/3) | Preserve card/identity/authoring; restrict public use and random AI until water-specialist rework is accepted. |

Latest blockers such as speed gears, energy-first guard and local TEMPEST are currently documented requirements even without separate GitHub issues. Absence from the issue board does not mean completion.

## 5. The questionnaire was mostly answered

Recovered [41-answer record](../gameplay/sources/2026-09-10-user-design-answers.md) and [original structured export](../gameplay/sources/2026-09-10-user-design-decisions.json) preserve existing answers. Do not repeat the 50-question interview.

Unanswered in that export: q32 neutral factions, q33 separate police/local military, q42 signature suppression, q43 eye shot, q44 resources, q45 researched countermeasures, q46 power interactions, q47 defection, q48 personhood/ownership.

Several are partially grounded elsewhere: q33 has existing city police but no settled war-faction relation; q43 has a later headshot request but no settled super-eye exception; q44 already has energy/cooldown/ammo/charges, now revised guard demand; q46 has existing beam clash/deflection and other interactions. Preserve these facts instead of treating them as unanswered from scratch. Remaining lore/sensor/war rules need not block the short operation.

## 6. Conflicts resolved or explicitly retained

1. July “everything except vehicles” and empty PowerWorld fiction are superseded by current vehicles, clone-war direction and liked city gameplay. Do not erase historical rulings; date their scope.
2. Old flight expertise and XP tier completion do not establish selectable speed gears. Use distinct names in the final doc.
3. Earlier first/second/third Shift sequence and latest double-hold power-up overlap. The master supplies a proposed reconciliation; exact stationary/moving form advancement remains reviewable.
4. Tab is already menu and previously considered squad command. Melee stance remains a proposal until command ownership is resolved.
5. Impact bible says coral HP; later supplied portrait HUD says green HP. Preserve the scoped newer instruction pending final HUD review; do not create another site-wide palette.
6. First operation's 5–8-minute target and future war's 30-minute target are different scopes, not a contradiction.
7. Attached GODFALL/8×8 km/250-reserve values and renamed scientist are outside proposals. Creator already chose a small research outpost; do not silently replace that with a huge new map or invented canon.
8. The older solo spec deferred weather/gadgets; the later explicit showcase request includes them. They are required for the promised role breadth, after reusable equipment/status foundations.

## 7. Source map and audit limits

Primary newer references: integration `DESIGN.md`; `2026-09-11-powerworld-v1-playable-loop.md`; `2026-09-11-reusable-player-systems-design.md`; owned-inventory/career-archive plans; full-roster inventory; selection-flight audit; power-activation and second-curation reports; gadget/storm seams; merge checkpoint. Read older root DESIGN_DECISIONS, BACKLOG, DECISIONS_REMAINING, POWERWORLD, MULTIVERSE, COMPLETION_LEDGER and September 10 status/weather reports as dated context.

Code inspection targeted input/game/world, entity guard/speed/progression, Weather.command, beam contact, player status, FrontlineEncounter, archive/Newsroom and shared style ownership. Other worktrees, all animations, all 55 characters' native behavior and every historical report were not exhaustively verified.

Durable source copies are explained in [sources README](../gameplay/sources/README.md). This audit saves the plan in the root workspace so finding the next decision does not depend on remembering a worktree or chat. Existing implementation remains where it was found.
