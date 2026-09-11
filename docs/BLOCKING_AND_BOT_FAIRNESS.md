# Blocking, bot reactions and defensive poses

Scope: combat and the existing Character Studio. No map changes or roster stat equalization.

## Player controls and counters

Hold **C / Mouse4–5** to block on the standard layout; **L1** on a controller. Pilot layout keeps its existing **X** guard binding. In PowerWorld, held block no longer silently becomes a defenseless energy-charge stance when enemies are distant. Existing passive/guard regeneration remains; city charging behavior is unchanged.

Hitstop does not drop a held block. Frozen, stunned, sleeping, downed, hanging, grabbed or occupied fighters cannot raise it. Frontal light strikes deal chip damage and punish the attacker. Rear hits still bypass an ordinary frontal guard, grabs defeat guard, and committed power punches crush it. Existing shield deflection and energy-costing 360° barriers retain their rules.

Lethal chip now follows the same KO/Second Wind path as direct damage and credits the attacker. The old guarded early return could leave a fighter alive at zero HP; holding block is no longer a way around defeat. The player's first-life Second Wind is preserved, not granted to bots.

## Defensive body language

The production procedural rig now braces around the pelvis, tips the torso into resistance, tucks the head and bends the elbows. Ordinary fist guards keep elbows below the shoulders; shield guards lead with one arm; barrier guards extend an open palm with the other arm protecting the torso. Airborne blocks keep a long trailing leg and a bent counterbalancing knee. Block impact increases the brace, and releasing guard returns to locomotion. Weapons keep their occupied grips and authoritative hand sockets.

These are original procedural poses, not imported animation clips. The arm solver adds an optional elbow direction; other combat and flight callers retain their existing default. Root displacement remains owned by physics.

The guard brace enters the existing torso carrier before its angular-rate limit and hip compensation. It therefore transitions smoothly from steep beam attacks instead of snapping an extra lean on after recovery. The 36-case interruption regression compares to ordinary held guard, retains the 12 rad/s speed ceiling and checks hip anchoring/pose ownership. A separate review checked 600-frame holds without accumulated drift.

## Fair bots

- Actual firing direction now shares the bot's finite horizontal and vertical turn rate; the aim point no longer snaps ahead of the body.
- A newly seen or switched target earns a reaction window before close melee or a fresh aimed attack.
- Reaction delay is `max(0.2, 0.4 / difficulty)` seconds, with supported difficulty clamped to 0.5–2. Acquisition adds the existing random variation. Offensive decision intervals are less relentless.
- Visible shots are observed at sight range. Responses become eligible as an approaching shot gets close, after observation time—not on the first threatening frame.
- Each continuously observed projectile/beam gets one defensive decision, instead of repeated per-frame dodge rolls. Projectile selection checks 3D trajectory and prioritizes arrival time; an overhead miss is not an incoming hit.
- A bot that chooses to block a beam maintains that decision while the same beam stays visible. Losing visibility or changing threats ends that commitment.

No extra health, damage, energy or movement speed was granted to bots. Powerful roster members remain powerful; this is a reaction/aim fairness pass, not proof of equal matchup win rates.

## Studio

**Motion → Melee sequence → Block incoming punch / Receive guard-breaking heavy** runs actual input choreography through Fighter and MeleeSystem. KANO supplies the light punch; SOL supplies the power punch because KANO's derived martial style does not include one. The selected character is the defender. Measurements explicitly show **damage received**, actual guard meter, and blocked-chip / crush events. Replays are silent scripted fixtures, not AI balance tests, and do not modify the saved character.

Impeccable/frontend-design kept these controls inside the existing transport and preserved the draft/save workflow. An independent finish review found no material UI issues.

## Verification

`npm run test:blocking` covers 18 CPU behavior/pose tests, 18 live keyboard-to-contact paths at 30/60/120 Hz (including lethal chip and Second Wind), two deterministic defensive Studio sequences and front/side/rear inspections for SOL, VANGUARD, AURUM and armed SARGE. Mutual lethal ripostes resolve each KO only once. The CPU sequence checks preserve limb lengths, keep hands outside the face and verify recovery; these do not substitute for the rendered inspection.

Evidence: `artifacts/blocking/live-results.json`, `studio-results.json`, and the per-character PNGs. Adjacent regression gates: `test:melee-depth`, `test:impacts`, `test:poses`, `test:combat`, and the production build.

Verified this pass: the blocking suite and production build pass; the adjacent melee-depth, impact, pose and full-roster combat regressions also passed. Eight-bot 30-second simulations completed without invalid states or runtime errors. Additional model/limb/head/shoulder tests passed. Remote-detonation AI tests now establish target acquisition through real intent updates rather than seeding only an obsolete internal boolean; all six pass. These gates establish behavior and regression coverage, not a subjective quality rating or equal matchup win rates.
