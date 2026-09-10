# Arena combat, teleport and deflection

September 7, 2026. No map redesign, replacement of the BFP rear camera, saved-draft migration or overall quality score.

## Controls

- Double-tap movement on a teleport-equipped fighter: **A/A**, **D/D**, **W/W** or **S/S**. It follows the movement direction, never an automatically chosen enemy.
- **C / Mouse4–5** holds guard in Classic and ARENA. Deflect fighters such as VANGUARD and TITAN return eligible frontal shots toward their shooter. Ordinary block absorbs damage. Rear attacks and grabs remain threats.
- **Options → Control Scheme → ARENA** enables wheel-selected melee. **V** selects melee; **LMB** tap punches, hold charges a heavy; **RMB** grabs, then throws. In a clinch, tap LMB for a body blow or hold for a drive-down. Release attacks before wheel-switching back to powers. **G** retains contextual grab/use; RMB goes directly to combat grab.
- Classic remains default: V strike, G grab, C guard, X gadget. F flight, Space rise, Z descend and H fourth power are unchanged. Other layouts and pad controls remain available.

## Teleport degrees and custom characters

| ORIGIN choice | Reach | Ki | Base recovery | Invulnerability |
| --- | ---: | ---: | ---: | ---: |
| Snap Step | 12u | 6 | 0.7s | 0.18s |
| Blink | 22u | 8 | 1.0s | 0.30s |
| Rift Step | 36u | 14 | 1.5s | 0.30s |

Recovery uses the fighter's talent multiplier. Runtime ki costs are separate from ORIGIN's point-buy prices. Longer travel does not extend invulnerability beyond the medium tier.

MYSTWARD's Fold Step uses the short tier; RIFT's Side Door uses the long tier. Existing intermediate overrides remain, including KANO's 24u Instant Step. **New character / Edit power kit → Evade (2×tap)** offers all three, alongside **Guard → Deflect**. Visible descriptions explain the selected choice. Save, reload, portable packages and Play Test preserve them.

The runtime resolves a legal arrival before payment. Teleport can cross a wall but cannot materialize inside cover, interior walls/ceilings, elevated terrain or beyond the arena boundary. An occupied arrival shortens the step along the requested direction; no valid arrival means no payment/cooldown. Altitude and airborne state are preserved; flashes and particles occur at flight height. Incapacitated, hit-stopped and clinching fighters cannot evade. Offensive teleport/intercept remains a separate ability and no longer hijacks double-tap movement.

## Defense and input fixes

Deflection spends 0.04 guard meter per reflection, braces the body and breaks the stance when exhausted. It retains the one-bounce limit and transfers projectile ownership for return damage. Front/back uses arrival velocity: a fast rear shot crossing the body center within one frame cannot become a frontal deflection. Special sticky/delayed-arm payload handling and beam guard/clash rules are preserved.

A throw pressed late in a clinch body blow buffers for up to 0.18s, waits for recovery and fires once. It never adds hold time or survives a broken grab. Held triggers and unfinished melee prevent wheel/V remapping. Focus loss cancels held preparations/ordinary held beams and releases guard before pausing, without refunding spent energy, deleting fired remote shots or cancelling a committed punch. Resume does not inherit a stuck charge. Clinch hints use action names across control layouts.

## Military kits

- **BREACH**: proposed original shield breacher; seven-pellet shotgun, concussion launcher, shield check, entry charge, field dressing, demolition round and two flashbangs. Strength 4, frontal shield, lower speed.
- **RECON**: proposed original rifle scout; rapid blaster, charged sidearm, marksman shot, grenade, trauma patch, rocket and two short jump-jet burns. Strength 3, lighter armor.
- MERC's existing kit now has its missing held rifle/pistol meshes. New entries append to the roster, preserving old indices. Tactical presentation saves in Studio. These are procedural equipped figures, not commissioned military meshes or an ammunition/reload overhaul. Grounded physiology applies in the city; PowerWorld's existing all-roster flight rule still applies there.

The primary/alternate-fire distinction was informed by the [LucasArts Jedi Outcast manual](https://draketungsten.org/arcade/pcmanuals/Jedi_Outcast.pdf). The double-tap/clinch vocabulary also considers the [ESF community melee guide](https://forum.esforces.com/threads/need-help-on-melee-read.112866/), explicitly a community source. No copied assets/code or complete original-game parity is claimed.

## Close-combat view

The centered BFP boom stays **25.5u range / 9u view-up lift / 73.74° vertical FOV**. Close lock retains full authored lift and bounds parallax; there is no automatic shoulder orbit or target-distance zoom. The projected reticle still marks the actual target.

A localized dithered cutaway removes only foreground player fragments over the opponent's head-to-pelvis corridor. It does not expose enemies through walls, change hitboxes/shadows, clone materials per frame or add a render pass. It clears on target loss, hidden/dead targets, owner changes and inspection views, including source-body replacement.

**Studio → Camera → Opponent visibility cutaway**: 0–1, default 0.9; zero disables it. Legacy profiles without the field remain valid and are not rewritten on load. This is an original readability enhancement, not claimed BFP behavior.

## Verification and limits

All **13 serial commands** in `artifacts/arena-defense-verification/results.json` passed: arena defense, close camera, BFP camera, blocking, melee depth, strikes, poses, impacts, imported bodies, character packages, flight, full combat and build. No production code changed afterward.

- 59 focused CPU checks; 18 real double-tap cases at 30/60/120Hz; three saved creator tiers; nine live block/deflect/rear cases; nine military firearm cases; three mouse-clinch sequences; actual Options persistence, wheel and blur/resume.
- 18 rendered close-combat cases: light/heavy/guard × ground/air × procedural/male/female bodies. Target-contribution, head-framing and shader/error gates pass. The image-ablation metric is not an anatomy-area percentage or a quality score. Representative frames were visually inspected.
- Cutaway off/undo/save/reload, untouched legacy bytes, inspection reset, 390px layout and portable settings reaching the live game pass.
- **385/385 ability checks across 55 kits**, zero context-only cases; world **42/42**. Baseline eight-fighter 30-second soak: 533 hits / 20 KOs, no invalid states/errors.
- Additional mixed eight-bot soak with BREACH, RECON, MERC, RIFT, MYSTWARD, VANGUARD, SOL and KANO: 830 hits / 11 KOs over 30 simulated seconds, no invalid states/errors. Report: `artifacts/flight-review/arena-combat-soak.json`.

Start the dev server, then run `node tools/verify-arena-pass.mjs`; the mixed soak is `node tools/combat-soak.mjs --arena`. One browser/GPU lane, complete logs, no hidden retries. Bot sight/acquisition/finite-reaction checks pass; no bot-only stat or resource bonuses were added. This does not certify equal matchup win rates or an unscripted human play-feel verdict.

The existing large synchronous body-bank chunk still produces a build-size warning. Arbitrary mesh/animation upload, complete BFP/ESF parity, final bespoke character art and network certification remain outside this pass. A separate review agent was unavailable; the main agent performed local review and fixed the concrete defects found by live tests. The overall game objective remains unfinished.
