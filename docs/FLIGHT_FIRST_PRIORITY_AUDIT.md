# Power World — flight-first priority audit

Scope: pause glasses, accessory builders, eye customization, new worlds, fleet expansion and large animation catalogs. Preserve existing modular authoring work. Focus on making current flight/combat fun.

Current evidence: flight/controller and punches exist; grabbing/carrying/throwing have native regressions; swept thrown-body damage is wired; conscious and stunned air reactions differ; regional melee charge meter exists. 102 combined tests passed in the previous pass and 52 person-carry tests passed in the spam audit. These are historical checks, not fresh visual acceptance. Recorded take lacks confirmed contact and is rejected.

Status HUD: player-status.js emits Poisoned/Toxic gas/Burning/Acid damage-over-time badges, Bleeding with movement/clot hints, stun/stagger/frozen and other conditions. player-status-view.js renders icons, text, remaining seconds and one recovery hint. Infection has no player-status entry; modular infection appearance is not proof of live infection knowledge. Do not reveal latent infection automatically. Audit finding: stunT is already recovery-scaled in Fighter.applyStun but playerStatus divides by ccRecover again, understating the countdown. Flight HUD still hardcodes km/h.

Execution order:
1. Finish one repeatable Threat Room opponent loop: reachable target, grab/throw, actual damage readout, recovery, return. Keep KO/reset distinct from nonfatal get-up. Preserve results between attempts. Benefit: player can repeat and understand the mechanic; cost: temporarily defer more moves.
2. Complete flight approach -> punch or rear grab -> aimed throw -> terrain/body hit -> recovery using existing controller. Include miss, interruption and too-heavy cases. Benefit: proves core fantasy; cost: camera/contact/animation must agree.
3. Repair transition and contact failures revealed by that loop, particularly held victim motion, airborne stun and face-up/face-down recovery. Benefit: readable motion; cost: targeted animation work, not bulk clip acquisition.
4. Finish condition readability: actual remaining timers, poison/bleeding hints, and known-infection presentation only after identifying authoritative gameplay state. Benefit: understandable damage and control loss; cost: avoid exposing hidden information.
5. Surface existing Threat Room replay/animation tools through a small clear menu; do not build a separate large viewer before the loop works. Benefit: discoverability; cost: modest UI work.

Acceptance: a ready-to-start scenario, player-operated action, recorded damage result, visible recovery and a second attempt. No loading/selection footage in proof. No completion claim based solely on unit tests or a parked screenshot.
