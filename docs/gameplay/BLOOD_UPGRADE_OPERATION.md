# Blood-to-upgrade operation — creator decision

2026-09-12. Supersedes the pending operation choice in PLAYABLE_INTEGRATION_NEXT_PLAN.md and issue #33.

## Locked by creator

The primary playable operation is fight -> collect blood -> return to the lab -> get upgraded -> fight again. Escort/ambush are later operation variants, not the first completion target. Replacement soldiers/clones are finite; exhausting them must matter to defeat. This is a design decision, not a claim that this operation is already implemented.

## Recommended first complete run (proposed, not yet approved numbers)

1. Prepare at the lab. Show current fighter, live allies, soldier replacements and LSW replacements separately. Choose legal gear; explain blood collection in a short practice encounter.
2. Fight a marked encounter and secure a usable blood sample through the actual sample interaction. Do not award samples for unrelated hits or process the same sample twice.
3. Return the sample to the visible lab intake. Show sample source, condition and research earned. Choose one of a few character-compatible upgrades and show its before/after effect. Preserve Soldier/LSW equipment rules and the separate movement-tier controls; research is not a return to level-up powers in the weapon bar.
4. Leave to fight a stronger or tactically different encounter. Repeat the research loop for two upgrade milestones in the initial short run.
5. Win by defeating a clearly marked final encounter unlocked by those milestones and returning to the lab for debrief. Every objective names the current step. Killing random enemies or collecting blood indefinitely is not itself a finite win condition.

The two milestones/final encounter structure is a recommendation; the creator has only locked the core loop and finite replacement premise. Tune duration after native playtest.

## Replacement and defeat proposal

- A live fighter and a reserve are different things. Spending the last reserve should not instantly kill the last fighter.
- Spend exactly one eligible replacement when a replacement is successfully admitted. Define queued fabrication explicitly; prevent duplicate charge on retries and prevent free respawn.
- Soldier and LSW stocks remain separately displayed and cannot silently substitute for each other. Existing setup reserves currently describe lost allies; audit player respawn too before claiming they enforce the loss condition.
- Do not replenish reserves merely because the lab upgraded the player. Blood research and replacement lives are separate resources for this slice. Reserve purchases or earned lives would be an explicit later balancing rule.
- LOCKED defeat: no player-controlled fighter remains alive AND no eligible replacement remains. Creator confirmed this in the clickable interview. Surviving AI-only allies do not postpone defeat.
- While waiting for a valid replacement, show the cost, remaining stock and spawn state. Stock zero means LAST LIFE while still alive; defeat occurs only at the selected terminal condition.
- The lab should be a reliable processing/recovery hub in the first slice. Base destruction is not an extra unapproved defeat condition.

## Blood and upgrade safeguards

Show carried sample and its condition without covering combat. At the stationary intake, use a full research screen. Freshness can influence yield, but the short first run should not punish learning with hidden timers. Do not advance degradation while paused or inside blocking menus. A dropped/lost sample must be recoverable or replaceable through another encounter; avoid unwinnable dead ends.

State flow: preparing -> field encounter -> sample secured -> lab processing -> upgrade choice -> field encounter -> final encounter -> return/debrief. Defeat may interrupt according to the reserve rule. Each processed sample/reward is recorded once; death/retry and save/reload must not duplicate upgrades, consume extra stock or reset exhausted reserves accidentally.

## Evidence required

Native start-to-win capture, death with reserves, last-life warning, defeat with no valid replacement, rejected spawn retry without double spending, sample drop/recovery/expiry, no duplicate research on repeated interaction, consecutive run and save/reload. UI shows the same counts that the replacement owner uses. No forced outcomes or injected inventory in the acceptance run.
