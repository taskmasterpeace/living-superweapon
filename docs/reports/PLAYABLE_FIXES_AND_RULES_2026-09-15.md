# War World: Ascendants — knockback, inventory and character rules

This is the entry point for the September 15 player report. Branch: `codex/playable-integration`; local test build: `http://127.0.0.1:5193/`. These changes are in this checkout. They are not a claim that every earlier animation, vehicle or Unreal asset request is finished.

## What caused the character/camera problem

Two different owners were acting on the same presentation. The powered flight pose admitted stunned/launched bodies through an exclusive-pose rule. That could put a steep flight rotation underneath the airborne limp/flail pose. Falling reactions now suppress that powered-flight layer. Raised-platform support also counts as grounded, preventing an airborne reaction while standing on a block.

Near a wall, the collision-safe camera moved sideways but retained its old parallel look direction. That could leave the body outside the frame and resemble first person. A recovery framing correction now keeps the body visible, seeks a collision-clear camera position when crowded, then hands the recovered viewing direction back to ordinary mouse aim when the reaction ends. This one-time handoff prevents the camera from remaining locked toward the actor after recovery; it does not change launch distance or damage. This is a bounded recovery correction, not a replacement for every camera mode or corner case.

Evidence: `tools/knockback-pose-wall.test.mjs`; `tools/knockback-wall-review-browser.mjs`; `artifacts/knockback-wall-review/result.json` and before/impact/stunned/recover/standing screenshots. The browser sequence uses the real current modular character, damage/update/camera paths and a controlled wall fixture after training setup. It is not a complete native-entry Threat Lab acceptance test or a new planted get-up animation. Existing get-up polish remains issue #24.

## Inventory now implemented

Press **I** during play. The backpack is a draggable side window that leaves the world visible. Escape or I closes it. The key event is consumed so it does not also open the title menu. Combat input is captured while the panel is open; this does not promise that enemies or the whole world pause.

| Feature | Current behavior |
|---|---|
| Soldier storage | 6 × 4 cells |
| Living-superweapon storage | 4 × 2 cells; existing two-gadget limit remains |
| Weapon access | Soldiers and authored weapon specialists; an explicit character capability can override eligibility |
| Item placement | Drag cells, or select an item then an empty cell; dimensions are storage footprint, not invented kilograms |
| Weapon swaps | Held and stored weapons retain depleted magazine/reserve ammo and cooldown; full bags reject acquisition without destroying existing gear |
| Hand display | Left/right occupancy comes from the shared action hand-mask contract |
| Stow/draw | Hides or restores the equipped weapon and releases/restores its grip claims; active actions block unsafe swaps |
| Power conflict | A drawn weapon blocks powers that need the same hand(s). Stow it before a conflicting two-hand beam. Eye-origin powers do not automatically occupy the hands |
| Game device | A 2 × 1 inventory item opens a **Coming soon** screen |
| Weight | Unknown mass is labeled unknown; this pass does not fabricate equipment mass values |

Inventory layout is attached to the current actor/life; persistent saves and vehicle trunk transfer are not finished here. The device is a panel preview, not yet a physical pull-out animation or camera swing. Bike rules can explicitly grant a free right hand to a one-handed pistol; that capability check does not mean mounted pistol controls/animation are already wired.

Verification includes production Game swaps and real keyboard/panel interaction after controlled training setup: `tools/inventory-game.test.mjs`, `tools/equipment-policy.test.mjs`, `tools/inventory-panel-review-browser.mjs`. Screenshots/results are under `artifacts/inventory-current-review/`.

## What the numbers and statuses mean

The seven public names are **Fighting, Agility, Strength, Resilience, Intelligence, Perception, Mental**. Might/Vigor/Awareness/Resolve are older labels; abbreviated internal save/code keys remain for compatibility.

The eight damage types are **Physical, Ballistic, Energy, Fire, Cold, Toxic, Acid, Magic**. Damage type and status are separate: an Energy hit does not automatically shock; Fire damage does not automatically guarantee a lingering burn. Armor piercing is penetration behavior, not a ninth damage type.

| Term | Plain meaning |
|---|---|
| Guard / blocking | An active defensive action with a guard resource. It is not the same thing as armor or a wearable shield's HP. |
| Guard break | The defense failed/depleted; active guarding ends and stagger accompanies it. |
| Stagger | A short action/movement interruption. Guard break can cause it, but other hits can too. It is not a permanent lost block. |
| Stun | A stronger temporary interruption: cancels guard, charge, grabs and powered flight; an airborne victim falls. |
| Hitstop | A very short impact pause to make a strike readable, rather than another long stun/debuff. |
| Blinded | Temporarily blocks fresh AI sight. The bot can retain an aging last-known position. Flying away does not itself apply blindness. |
| Shock | Electrical control effect that keeps the short stagger interruption active and suppresses flight during its duration. “Pins stagger” describes a timer, not physically pinning someone to a wall. |
| Cooldown | Time before an action can be used again. “Coolness” is not a confirmed stat/status in this audit. |
| Reloading / charging / firing | Action timelines with their own interruption rules, not interchangeable status debuffs. |
| Phase / invulnerability | Separate defensive flags; neither is simply another name for blocking. |

A staggered actor is briefly interrupted; do not teach players that they can perform a normal attack through that window. The longer status interactions, state fields and sources are in `CHARACTER_RULES_AND_PERSONALITY_2026-09-15.md`.

## Personality confirmation

All **55 roster characters** receive derived personality behavior. There are **eight combat AI styles**, **20 personality definitions**, and **eight personality presets currently used**. No roster character presently has an explicit personality field. So eight describes the used personality subset as well as the separate combat-style count; it is not the total defined personality catalog.

Personality changes target preference and emotional drive weights. These are not just character labels. However, this was a data/constructor audit, not a proof that all 55 bots behave distinctly in every fight. Every assignment is saved in `character-rules-personality-2026-09-15.json`. A per-bot sight-selection caveat is recorded in the detailed report.

## Readability, logs and existing UI design

Hit feedback now identifies **YOU** or the affected actor, limits impact-card count, throttles repeated cards and reduces unrelated actors' visual prominence. The main hit path avoids duplicating the same number in both presentation systems. Vehicle control prompts use larger, clearer two-line text.

The existing UI direction is **Impact C**, with design history in `DESIGN.md` and `docs/design/ui-direction/README.md`. That confirms a design exists; it does not establish that an unidentified other AI delivered a finished replacement armor HUD. Guard, armor reduction and shield HP must stay semantically distinct.

Practice already records actual results at `window.LSW.game.ms?.threatLab?.meleeTrial.records` (bounded to 100 records). Its `.openReview()` opens the existing event/pose review; `.recording.events` is separately bounded. This is useful practice telemetry, not a persistent log of every fight. The asset entry-point report documents the sources.

## Fire and frost: honest status

Fire/energy presentation code has been differentiated and shader/runtime tests pass. **Fire visual acceptance is still failed:** the cone resembles separate flame icons, and Flame Jet remains too much like a thin yellow energy hose. Follow-up: https://github.com/taskmasterpeace/living-superweapon/issues/37.

The existing cold path includes Rime, crystal details and chill/frost behavior. I cannot identify the specific older external frost shader you remember from this attachment. The supplied file is an old Three.js noise/polar/bloom example, not evidence that that frost source was merged. See `2026-09-15-fire-energy-visual-checkpoint.md` for technical tests, images and official shader references.

## Asset organization and the next build

Use `ASSET_ENTRY_POINTS_2026-09-15.md`: it maps the actual registries and viewers for 14 firearms, seven melee weapons, 16 gear items, five integrated fleet models, the wolf/husky sources and separate creature recipes. A resized wolf preview must not be presented as the finished organic alien dog.

1. **Finish the current-model punch → knockback → fall → planted get-up sequence.** Benefit: resolves the central combat feel. Cost: contact and transition cleanup matters more than adding many clips; existing issue #24 tracks the get-up gap.
2. **Give fire a visually accepted continuous flame shape.** Benefit: damage families read differently. Cost: art iteration and a bounded GPU budget; issue #37 holds the failed review.
3. **Extend this inventory into trunk transfer and authored wearable slots.** Use an explicit slot such as head/ear/wrist/finger, effect metadata, and optional model attachment. A tiny ring can have a recognizable inventory icon without a constant HUD label; only show a HUD indicator while its effect matters. Benefit: reuse one equipment system. Cost: attachment fit and persistent storage still need work.
4. **Add the physical device/camera transition, then a photographer role.** Reuse existing footage/event systems before building a social-feed simulation. Define who owns the camera and what happens when the player is hit. Benefit: strong presentation and reusable proof capture. Cost: these are additional mechanics, not supplied by the Coming soon screen.

No new character faces, clothing, media feeds or world expansions are being claimed in this checkpoint. The immediate value is stable recovery, usable equipment controls, clearer hit ownership and an honest map of existing content.

## Validation for this checkpoint

- Production build passes. Existing large-bundle warnings remain.
- 232 distinct focused tests pass across the 133-test equipment/feedback/fire set and 102-test camera/recovery/Game-inventory set (three camera regressions occur in both sets).
- Current-model controlled browser checks pass for wall-hit recovery and inventory interactions, with no page errors. The inventory check covers stow/draw, ammo-preserving equip, moving the panel, device preview, smaller LSW storage, and Escape returning to gameplay instead of opening the title.
- Independent review caught a recovery camera ownership bug before completion; its final regression proves normal aim and mouse control return after stun.
- No full Threat Lab/native-menu, multiplayer, every-character animation, or complete fire art acceptance is claimed.
