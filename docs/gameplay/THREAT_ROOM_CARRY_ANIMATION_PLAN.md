# Threat Room, deployment and reusable combat authoring

2026-09-12 creator correction. This supersedes the proposed two-upgrade/final-encounter structure. Design plan, not implemented gameplay.

## Simple playable experience

LSW side starts together in an other-dimensional Threat Room. The player can move and try actions there. No mandatory tutorial speech, checklist or staged explanation. When ready, walk through the portal into the gameplay world, at a staging point far from the combat area. Teammates follow through the existing readiness/deployment system; avoid spawning them directly in combat.

Travel from that point by flight, boarding the jet/transport, or being carried by a flying teammate. Grounded LSWs must have usable transport options too. The transport should be visible and reachable from the arrival point, with real passenger seats and clear boarding interaction. Do not interpret this requirement as proof that every current vehicle already supports LSW passengers correctly.

Then: fight -> get blood -> return to the lab -> upgrade -> fight again. Preserve that loop without imposing two research milestones or a final boss. The LSW Threat Room is the other-dimensional home/staging space; the exact lab return placement/portal connection should be tested in a simple layout. Soldier spawning remains its existing separate cloning/deployment path, pending any later creator change.

Confirmed defeat is unchanged: no player-controlled fighter alive and no eligible replacement remaining. No new victory checklist is imposed. A finite victory condition can be decided after the repeatable loop is fun; do not let undefined victory prevent a playable repeatable session.

## Carry, drop and airborne rescue

Creator wants E/contextual grabbing of teammates as well as other people, flying with them, letting go and catching a falling person again. Friendly carry is transport/rescue, not a hostile clinch. Friendly damage remains disabled.

Implementation recommendation: reuse the person-carry owner/attachment/release path, but provide separate friendly admission and damage policy. Do not just remove isFoe from hostile grab selection: enemy grab attacks, thorns, struggle, execution and impact damage must not leak into friendly transport. Give a carried teammate a release control; never trap them indefinitely. Keep enemy grab escape and strength rules.

Catch a falling person through the same contextual action with a bounded acquisition range, valid line of sight, carry capacity and swept relative-motion contact. Catch transfers motion into carry and clears the victim's pending fall-impact state without teleporting through terrain. No guaranteed catch from arbitrary distance. Prevent dual holders and clean up on death, portal transition, vehicle boarding and reset. Catching and landing must not both apply the same impact.

Dropping starts an airborne state with visible reaction: arms flail/tumble during uncontrolled falling, then blend back to controllable flight/falling when recovery permits. A conscious flyer can recover once stun/control restrictions end; no need to wait for ground contact. This is distinct from permanent KO ragdoll. Reuse #20.

Falling damage is a new proposal, not yet a locked universal rule. Recommend measuring landing impact velocity and using character durability/landing capability, not a fixed height rule for every hero. Ordinary controlled superhero landing is distinct from forced impact. Any proposed friendly drop damage must preserve the creator's no-friendly-damage rule rather than introducing indirect team damage. For the first carry prototype, friendly dropping/catching should be non-damaging until that policy is explicitly settled.

## Repeatable authoring — same principle as audio

Build on existing src/data/martial.js, melee-approaches.js, strike-bank.json and heavy-strike-bank.json; shared animation import/retargeting and native MeleeSystem remain authoritative.

A reusable move entry should have: stable ID, label/category, source clip/procedural recipe, compatible rig, stance/airborne support, windup/contact/recovery markers, allowed approach/root displacement, reach, preferred hand or weapon socket, and references to impact/guard/miss audio/VFX events. Store gameplay balance in the existing attack profile rather than inventing a second damage authority inside clips.

An Animation Library should let us browse jabs, hooks, uppercuts, kicks, heavies, grabs, carries, throws and falling/recovery; preview, scrub, adjust timing and assign moves to compatible character profiles. Show missing clip, incompatible rig, missing contact marker and unassigned audio separately. Play real hit/block/miss examples through the native combat path. A nice preview alone is not a functioning attack.

Characters share move families, with bounded speed/reach/approach differences. Do not hand-author a unique punch set for every character. Start with one light punch, one heavy strike and one carry/fall/recovery family as pipeline proof, then add variants through the same import/validate/assign/test/export steps.

Worker handoff should name the existing schema, owned content files, expected export format, required native tests and a short example. Audio worker remains on its existing audio-only branch; animation content can later use a separate branch with the same boundaries. Do not redirect the active sound worker into gameplay or animation changes.

## Revised implementation order — combat and movement first

1. Close camera/input blockers (#29/#37), then prove the core exchange: approach -> strike/combo -> block or dodge -> grab -> terrain throw (#14). Use shared animations and character settings, not bespoke sets.
2. Build the Animation Library around existing content (#35), alongside these combat changes. Include search, filters, preview/scrubbing, timing markers, assignments, variant/revert tools and validation. Link it from the character hub; native attack profiles remain the balance authority.
3. Tune fast firing and finite traveling beams (#15/#30). Projectiles inherit shooter movement, then receive per-attack speed tuning. Make damage/range/charge differences measurable in Threat Room trials (#6).
4. Establish distinct movement families (#19/#32): agile pounce, heavy bound, anchored grapple/pull, flight and speedster trails. Prototype the bounded speed bubble (#36) after basic movement and projectile correctness.
5. Connect friendly carry/catch (#34) and recoverable airborne reaction (#20), then the other-dimensional Threat Room portal -> remote arrival -> transport -> fight/blood/lab/upgrade loop (#33). The Threat Room test area can be introduced earlier as the combat test harness; full mission structure must not displace combat work.
6. Expand vehicles, map assets, destruction and audio through the proven pipelines. Keep the active audio worker independent. Capture short native clips at meaningful milestones and distinguish staged previews from gameplay evidence.

## Current checkpoint

Animation Library #35 and speedster bubble #36 are scoped work, not implemented features. Death camera #37 has an orientation-only candidate and focused automated tests; native visual acceptance is still required. The camera stays at the death location and targets the ragdoll chest without changing FOV. No claim that the full combat/movement pass is complete.

## Danger Room clarification — 2026-09-12

The creator means an in-world encounter simulator, not merely a training station or a research upgrade screen. In the other-dimensional staging space, choose a threat (a character, soldier group, or authored encounter), preview the actual chosen threats, then enter the room and fight them. Reconfigure and repeat. Existing melee drills are presets within this experience, not its whole identity. The battlefield blood/research lab is a separate purpose even if navigation connects them.

Implementation sequence:
1. A versioned scenario definition references real character/gadget/prop registries: stable ID, label, enemy composition and count, team, behavior preset, spawn markers and practice resource policy. No duplicate copies of character stats.
2. Preparing/preview/active/review/reset states owned by one encounter controller. Preview actors cannot attack or spend reserves. Entering starts native AI, combat and physics. Only scenario-owned actors, props and effects are removed/reset; unrelated squad and campaign resources are preserved.
3. Choose and inspect threats from the existing roster with class and LeFevre classification. Show exact composition before entry. Initially use existing content; new registered threats become selectable without adding individual UI buttons.
4. Native fight supports player-controlled experimentation and optional teaching presets. Multi-angle review is available afterward; cinematic contact cuts are optional review/experiment mode, never mandatory cuts that obscure normal combat.
5. Replay the same scenario from its saved definition, record outcome/events and short native footage, and test two consecutive runs plus cancel/reset/KO cleanup. Connect this room to the staging portal after its encounter lifecycle works.

Animation pipeline status: runtime banks/importers and reusable procedural families exist; the standalone browse/preview/scrub/edit/assign/validate/export library remains unfinished under #35. Its first deliverable must inventory current content and reconcile source counts, then prove one shared punch variant through edit, native hit/block/miss, assignment and revert. Preview and gameplay must use the same entry. Keep damage/energy/reach in existing attack profiles. Do not require unique animation sets per hero.
