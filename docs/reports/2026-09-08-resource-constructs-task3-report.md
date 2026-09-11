# Resource constructs — Task 3 native hit receivers

September 8, 2026. Implementation, focused automated verification and parent-owned native browser/image checks pass; independent spec/code-quality review approved. This report covers Task 3 only. Task 4 authoring/Studio work and the plan's larger construct follow-ons remain open.

## Scope and implementation

Changed only the named runtime seams in `src/engine/summons.js`, `game.js`, `projectiles.js`, `projectile-contact.js`, and `melee.js`, plus new `tools/construct-hit.test.mjs` and this report. No commits, staging, worktree manipulation, subagents, city redesign, balance/source-definition edits, or changes to the approved tank geometry/motion. Preserved all other shared edits.

- Resource walls receive a conservative world AABB around the actual rotated 22×14×3 solid, with bottom 0 and top 14. Legacy timed walls retain their original cylinder and do not acquire damage-backed behavior. All new tanks use their existing finite hull/turret envelope. No HP, fake Fighter fields, entity registration, skeleton, guard, status, XP, score or kill contract was added.
- The native proxy calls `Construct.receiveHit(amount,{src,pos,lane})`. It returns `{accepted,amount,kiSpent,destroyed}` and updates `hitCount`, `damageReceived`, and actual saturating `kiSpent`. `amount` is already route-scaled; the receiver does not reapply power. Resource validity/depletion is checked before a hit. Exhaustion removes all resource siblings immediately and reports DRAINED once.
- Hostile contacts are accepted using native `isFoe`. Self/null-source hits are non-billable. Friendly direct/beam/melee contacts still obstruct but do not debit. Other same-team splash is half-strength only with `friendlyFire`. Upkeep and timed tanks accept physical hits without a per-hit ki charge; infinite owners spend zero.
- Ballistic direct contact notifies the selected cover once before bounce/return/separation. Native `ballistic`, not visual `bullet` or a nominal `blast`, selects this lane. The early guided sweep retains its actual obstacle identity. Its existing immediate-impact branch is preserved, including the fact that guided early impacts do not use the ordinary delayed-arm branch.
- Explosive/remote/delayed payloads bill solely through native `areaDamage`. Each live proxy gets one closest-point-to-3D-box falloff. Snapshot iteration tolerates callbacks removing their own and sibling records. City `worldImpact` explicitly skips construct proxies; explicit `damageBlock` dispatches the construct callback before missing-HP checks; `shatterBlock` has a construct backstop. Real neighboring city damage and craters remain active. Null-source splash does not enter the source-dependent Fighter loop and still runs normal world effects.
- Finite-bottom box clipping expands the lower plane by the same explicit vertical padding as its upper plane. Missing bottom stays downward-unbounded. Ricochet selects/separates at a lower face only when the record opted into finite bottom; unmarked city behavior remains unchanged.
- Beam billing is `dps * caster.powerBuff * dt` only on a reached sustaining endpoint. Body/interior/clash cutoffs can discard a farther candidate. The side-effect-free manager clipping pass stores a reusable one-update candidate because clipping a long Float32 segment can leave a smaller subsequent endpoint query just outside its earlier ULP skin. Billing requires the same endpoint **and source-ordered arc**, and normal later cutoffs still win. This does not extend packets, use an aim ray, or change city cover's existing `dps * 2 * dt` branch. Candidate vectors are reused rather than allocated each frame.
- Swept melee competes the same active fist segment, 0.42 radius/vertical padding and authored reach against native Fighter candidates and the nearest obstacle. A nearer city/interior vetoes only the new construct candidate; ordinary legacy city-melee behavior is not broadened. A winning construct consumes the swing before its callback can dispose it; no humanoid resolver is called. The approved light/heavy object formula, attacker hitstop, one contact sound, combo/recovery, and form/teleport history rules are preserved.
- Native contact VFX use the supplied physical contact, including the pre-bounce point. No inferred center hit is generated when a caller supplies no position. Full construct beam feedback is limited to once per 0.08 simulation seconds per construct; damage and diagnostics remain per actual beam step. No new lights, audio-per-beam-frame or geometry sampling loop was added.

## RED/GREEN evidence

Initial `node --test tools/construct-hit.test.mjs`: **14 failing assertions**, all intended missing behavior: absent callback box, no direct/splash/beam/melee debit, no finite lower plane. No fixture/render errors caused those RED results.

The first receiver/direct/splash/beam/melee group plus existing focused regressions passed **98 tests**. Additional native tests exposed and then verified fixes for:

- Finite underside/start-inside ricochets previously selected the upward/top or side face; now reflect downward and separate below the finite box.
- Null-source splash previously dereferenced `caster.team`; it remains non-billable and safely preserves world effects.
- A zero-velocity, already-emitted curved hose clipped by the manager prepass retained tip `[30,7,28.3999900818]` but had no next-query contact, spending zero. The retained same-arc/endpoint candidate now bills exactly the reached receiver, not the spatially nearer later bend.
- A 0.5-second, 120-Hz sustained beam previously generated **60** full construct contact effects; the bounded presentation test now allows at most **7**, while all **60** damage steps still count and debit exactly 20 ki at conversion 2.

The final new file contains **89 native checks**, using real Construct/Fighter/Projectile/BeamHose/MeleeSystem routes. Only Canvas2D impact texture generation is replaced with a Three texture in the headless fixture; native contact geometry, VFX, damage, particles and disposal remain live. Tests do not replace `receiveHit`, `areaDamage`, the melee resolvers or Fighter damage with fabricated outcomes.

Numerical examples checked:

- Ballistic damage 10 at power 1/2 spends 20/40 ki even with nonzero native `blast` and visual `bullet` enabled.
- Ordinary non-ballistic impact centered in the box spends 16/32 ki, not direct-plus-splash. A swept center 0.1 outside the face spends 15.904 at power 1, preserving native falloff.
- Native remote centered detonation spends 16 once; ordinary armed contact spends zero until the real fuse; intercepted armed payload spends zero.
- Native guided and actual split-parent children stop at real cover at 30/60/120 Hz and each apply only their own splash/direct lane.
- A reached dps-20 beam with conversion 2 spends 10 during an additional 0.25 seconds of contact; travel, pure clipping, pending/zero-time emission and released sustain do not debit.
- Shared pool 15 accepts a 10-ki hit, then 5 remaining ki; immediate sibling disposal prevents later charges and cannot skip another owner's splash receiver.
- Real light/heavy object fixtures deal 8/27 pre-conversion once. Native Fighter-versus-construct ordering works in both entity orders, and a wall's reachable surface can be hit even when its center is outside authored reach.

## Exact final verification

```powershell
node --test tools/construct-hit.test.mjs tools/projectile-contact.test.mjs tools/beam-cover-contact.test.mjs tools/beam-body-contact.test.mjs tools/beam-clash-contact.test.mjs tools/moving-melee.test.mjs tools/construct-policy.test.mjs tools/construct-tank.test.mjs tools/construct-surface.test.mjs tools/construct-studio.test.mjs tools/attack-interception.test.mjs tools/remote-detonation.test.mjs tools/split-projectile.test.mjs tools/studio-audio.test.mjs
```

Result: **330 passed, 0 failed**, exit 0, 2.53 seconds. This includes the approved lifetime/tank cases and existing beam travel/body/clash, projectile interception/remote/split, moving melee and audio regressions.

```powershell
npm run build
```

Result: exit 0; **274 modules**, 7.33 seconds. Existing Vite large-chunk warning remains.

## Browser/review handoff and remaining limits

Runtime stable checkpoint sent to parent after the complete focused gate. Parent owns and ran `tools/construct-hit-browser.mjs`; worker did not run or modify it. Saved results and images: `artifacts/construct-hit/`.

- Native ballistic damage 10, conversion 2: owner energy **100 → 80**, one accepted contact, owner HP unchanged at 125.
- Native explosive impact invokes the existing ground-clamped splash at `[-300,0.2,-68]`, damage 8 and radius 6. Closest-box falloff is 0.95, so it spends **15.2 ki**, leaving **84.8**, exactly once. This is deliberately not rounded to the centered-fixture 16-ki result.
- A pose-launched SOL beam takes **48 simulated frames** to first contact. Energy stays at 100 before arrival. Following the first hit, **15 additional frames at 60 Hz** spend exactly **10 ki** at dps 20 and conversion 2. Owner HP remains 125.
- Release followed by 40 more simulated frames produces **no additional energy loss or accepted contacts**.
- A final 10-damage hit against a 15-ki pool spends only 15, reaches zero, and immediately detaches the actual wall and removes its cover.
- **Zero console/page errors.** Parent inspected ballistic, explosive, beam-contact and depleted images: contact terminates at the panel, feedback is local, and the depleted panel is absent.

These are scripted native runtime inputs and labeled inspection-camera images, not gameplay input-feel or Studio authoring evidence. The beam uses the genuine native ability/pose-launch route; ballistic/explosive probes use native projectiles with an explicit fixture damage/radius.

Independent scoped spec/code-quality review approved without a concrete defect. **69 selected tests freshly passed**, plus native concurrent-beam exhaustion probes at 30/60/120 Hz: an already-small shared pool retired both resource siblings once, issued one DRAINED warning, and did not skip another owner's receiver. This was an independent focused subset, not a claim that the reviewer reran all 330 tests.

Task 4 catalog/profile authoring and Studio resource rehearsal are not included. The existing Studio facade is used only as a test scaffold; production Studio UI has not gained new controls or promised export support here. Moving fist/hammer/existing turret resource volumes, explicit AI construct targeting, body-slam/throw/environmental receiver damage, legacy non-swept cone-melee receiver coverage and externally inserted obstacle recovery remain separate follow-ons. This is not a claim that all constructs or all weapon clipping are complete.
