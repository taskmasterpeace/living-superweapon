# Soldiers, vehicles and power review — 2026-09-09

## September 10 precision-rifle update

Choose **RECON → 3 → hold RMB to aim → LMB to shoot → R to reload**. C crouches and Z toggles prone. Source sight is 4× with five rounds and 30 reserve. Studio → Attacks → q edits **Projectile lifetime** and **Sight magnification**, saved into gameplay. Holding RMB on a scoped primary owns the sight; RMB-wheel still selects secondary without firing it. Switch to a non-scoped primary to fire that secondary normally. Native standing/crouched/prone distant shots and phased reload placeholders are verified at wide and portrait resolutions. One scoped attack is not a nine-gun inventory; gamepad scope parity remains open. See `.dream-loop/2026-09-10-precision-rifle.md`.

## September 10 controls update — supersedes historical bindings below

PowerWorld soldiers now use **held Shift sprint**, **E interaction/boarding**, and **1–6 direct selection of their existing attack slots**. Wheel selects primary; RMB + wheel selects secondary. Selection does not fire or switch characters. C crouch, Z prone, R reload, G grenade, Q gadget and V melee remain. Tab is still roster, not the planned squad-command interface. Nine distinct firearms/loadout switching are not implemented by this selection change.

**Scout:** E or J enters/exits, W/S throttle/reverse, A/D steering, Space brake. **Aircraft:** E or J boards from on foot; E stays right rudder while piloting, J uses the existing safe-exit check. Native/temporary flyers remain subject to vehicle eligibility restrictions. Studio → Flight → Soldier sprint saves the ground-speed multiplier. Native wide/portrait sprint, selection and scout routes pass; aircraft E separation has integration-test coverage. Details and remaining limitations: `.dream-loop/2026-09-10-soldier-controls-and-boarding.md`.

## September 10 stance update

In the current third-person soldier controls: **C held crouches; Z toggles prone; WASD crawls; Z stands again**. C or jump also exits prone. Rifle firing and R reload remain available while prone. The body, camera anchor, ordinary-shot/beam hurt shape and swept wall footprint follow the low stance. Studio → Attack sequence → Fighter motion offers **Prone · supported rifle** and **Prone · crawl and return**, including the reload rehearsal. See `.dream-loop/2026-09-10-prone-ground-contact.md` for verified scope and remaining clearance limitations. The older notes below are historical, not current certification of vehicle/flight state.

## Playing soldiers

Open `/powerworld.html`, choose MERC, SARGE, BREACH or RECON, then enter. They use the same third-person mouse-look and WASD controls. These are playable roster soldiers; the four clone recovery defenders remain AI-only. PowerWorld still grants its roster open-sky flight; a separate strictly grounded clone-player mode is not shipped.

- MERC: LMB rifle, E thermal grenade, double-tap a direction for Combat Blink (16u, 6 energy, .9s cooldown). Shift retains his dash.
- SARGE: default RMB frag grenade, LMB service carbine.
- Wheel selects the primary attack. Hold RMB while scrolling to select the secondary. The HUD names the selected attacks.
- Scout: approach on foot; J enter/exit, W/S throttle/reverse, A/D steering, Space brake. Existing third-person mouse-look remains active. Mounted gunner is automatic, not mouse-fired. Hull collision is conservative; no suspension, seat animation, ramming damage or aircraft piloting yet.
- In open-sky flight, double-tap evasions preserve forward travel. Ground slide/leap/sprint evade profiles use a brief air impulse instead of their ground behavior; this is not an authored barrel-roll animation.

## Power harness

Open Character / Power Harness from selection (Studio). Select any fighter, then Attacks to inspect its named slots. Choose Motion → Attack sequence and Preview attack for supported real-runtime rehearsals. Fighter motion supports ground-forward and air-forward/side travel; target motion/elevation and optional sound expose impact/aim behavior. Melee sequence separately covers strikes and blocking. Sound Library lets you audition placeholders and replace cues.

The harness lists all roster slots, but automatic attack rehearsal only supports beam, projectile, volley, charge, rifle, construct and melee families (plus supported nanite sources). Unsupported slots must be tested through Play Test; the UI identifies unsupported tuning. Do not claim every power has automated visual acceptance.

## Recommended cuts — not applied without review

Source audit: 55 roster characters; 55 dash slots, 51 buffs, 42 projectiles, 41 melee slots, 36 cones, 25 beams and 25 charges. Shared implementation is not itself duplication; duplicated combat decisions are.

1. Make dash/evade universal movement controls rather than a competing selectable attack slot. Keep character-specific cost, range, effects and animation.
2. Review generic damage/heal buffs first. Keep a buff only when it creates a distinct tactical state; replace generic stat boosts with traits where appropriate.
3. Give each kit one dependable ranged attack, one meaningfully different secondary, one signature power and one utility. Keep extra powers in the editor, not necessarily the default combat wheel.
4. MERC's heavy pistol overlaps his charged pistol and rifle. Candidate to move to optional loadout; preserve grenade and teleport as decisions the guns cannot replace.
5. Separate soldier identities: MERC mobile blink skirmisher; SARGE heavy support; BREACH close-range shield pressure; RECON precision/scouting. Avoid giving all four interchangeable explosives and guns at every range.

## Movement and reactions still to build/review

KNIGHTFALL already has Grapnel Line on data slot `f` (keyboard H); VOLT already has super-speed; existing teleport/phase characters remain. Neither fact proves a polished traversal experience. Web swinging needs anchor selection, rope constraint, reel/release, momentum conservation, camera and wall-contact tests. Recoverable living ragdoll needs a temporary physics owner, damage/status continuity, timed get-up, safe interruption and input return; do not reuse KO/resurrection as a shortcut.

Still pending: improved rifle asset hand fitting, remaining extreme-pose/body self-contact, living ragdoll reactions, web swinging, more expressive nonlethal beam reactions, armed jet and pilotable aircraft. Helicopter disable currently hides the model with an explosion, not a falling wreck.
