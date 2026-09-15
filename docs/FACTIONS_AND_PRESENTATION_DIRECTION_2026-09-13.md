# Factions, intelligence and presentation — creator direction, September 13

Status: proposed faction names and integration contract, not a shipped hiring system. Preserve the immediate hand/wrist repair priority. No changes to another worker's vehicles or handling.

## Correct vehicle source
The creator-approved style/reference is the white angular Attack helicopter in the fleet editor, NOT assets-src/frontline-attack-helicopter/attack-helicopter-preview.png. Resolve model ID and version from public/reference-fleet/catalog.json and the editor loader. An existing preview filename does not establish current approval. Catalog calls these model candidates; runtime integration remains separate.

## Starter factions (working names, editable)
- Threshold Directorate: organized containment and defense. Subfactions: Line Command (Soldiers), Recovery Bureau (samples/rescue/research), Air Service (pilots/transport). Contracts: guards, recovery specialists, aircrew.
- Free Ascendants: independent LSW coalition. Subfactions: Vanguard Circle (combat), Wayfarers (mobility/rescue), Custodians (portal/base defense). Contracts: eligible named LSW companions.
- Blackglass Consortium: industrial/private-security interests. Subfactions: Security Division, Fabrication Division, Acquisition Division. Contracts: mercenary security, technicians, equipment recovery.
- Free Companies: independent mercenary network. Subfactions: Dust Runners (scouts/convoy crews), Iron Company (heavy defense), Lantern Company (medics/recovery). Contracts can serve multiple factions subject to relation rules.
- Civilian organizations remain separate noncombatant affiliations: Field Press and local residents. Do not treat them as enemy combat factions.

Faction is allegiance; subfaction is organization; combat class, threat rank, movement, material, skills and equipment permission stay independent. Never let joining a faction grant guns to prohibited classes.

## Hiring v1
Contract board lists portrait, class, role, threat, actual comparative stats, equipment, price, availability and remaining deployment duration. Buy one operation contract initially; record employer separately from home faction. Respect existing squad and reserve limits (Soldier-side one LSW companion, LSW-side configured cap). No hidden additional reserve lives. Recruits join existing squad intent/deployment systems. Dismissal/death/respawn/operation end have explicit ownership cleanup. Prices and faction names are tuning proposals; do not invent a currency sink before auditing existing resources.

## Ring and knowledge presentation
Sandra's Its Voice gets readable private thought/voice captions near the character/action, not tiny edge text. Examples: 'Stronger than you. Do not let them grab you.' 'Behind you.' 'They are searching for you.' Derive these from authored knowledge access and actual relative grapple/strength state; explain confidence. Her enhanced awareness may reveal threats behind her, but it must be an explicit ability permission, not a leak through ordinary dialogue. Bind future voice cue IDs now; debounce, prioritize danger, captions and cooldowns. Thought, speech and shouting have distinct shapes. Expose player-owned stats freely in roster/loadout; enemy hidden data requires scanner/ring/telepathy.

## Cameras and civilians
Optional angled comic panel for high-value punches, grabs, body blows and throws. Frequency Off/Rare/Normal, one short panel, no input/camera ownership theft, performance limit, suppress in critical visibility situations. Camera recipes can also export stills/highlights through existing bounded recording pipeline; cameras need not all render continuously.
Death camera retains death anchor, pivots toward body, adds modest bounded zoom; prevent clipping/losing body. Reporter framing favors attacker and victim when feasible; preserve current feel.
Reporters are physical noncombatants. Harm matters through explicit civilian incident/reputation/event recording, never rewarded as normal combat scoring. Recover/respawn at the press van after an authored delay; avoid loops that mint witnesses/rewards and clean up camera ownership. Pedestrians share noncombatant policy. Distinguish consequences from automatic operation loss, which remains undecided.

## Separate base-builder work handoff
Audit D:/git/ShootEM ATLAS BasePlan compiler, typed rooms, facility footprints, frontage/egress, furnishing and validation. Prototype one PowerWorld site: connected grid sectors containing warehouse, research lab, cloning room, printer and hangar/portal access. Match PowerWorld character/door/vehicle scale explicitly; donor units are not assumed compatible. Deliver one editable plan, native collision/navigation evidence, versioned asset manifest and integration guide. Do not implement globe simulation, city conquest or change combat/vehicle handling. Use an isolated codex/base-builder-pilot branch/worktree if this is assigned to another task. This document does not create that task.

Links: #49 visual teaching/content roadmap; #14 hands/combat; #31 scanner; #37 death camera; #23 character hub. Keep these as extensions rather than conflicting parallel systems.

## Superseding creator ruling
Ascendants (LSWs) versus Military are the two initial factions. Deck 52 is a hireable mercenary subfaction available to either; replace the invented Directorate/Blackglass/etc. names above. Preserve real-world national origins within an alternate dimension. Employment may purchase bots, crew, LSWs or Soldiers, with cost informed by the existing LeFevre threat scale plus role/equipment; do not equate rank alone with price. Deck 52 explicitly supports flying gun users, via narrow authored capability exceptions. Do not import its unfinished models, gun standards or behavior packages yet.
Its Voice is high-priority item-linked information presentation with adjustable verbosity/off and cooldowns. Add shared event hooks for future optional mercenary banter, thought/speech/shouting and voice, not lines on every action. Super-jump can have an enabled/disabled preference so ordinary jump remains available. Ascendant Threat Room portal arrival should be farther from Military structures, beside their transport, after layout verification. These are planned changes, not delivered behavior.
