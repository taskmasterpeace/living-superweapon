# Remote attack runtime report

## Implemented

- Explicit `remoteDetonate` opt-in for beam, projectile and charge. Existing catalog defaults,
  ordinary held-beam release, camera and maps are unchanged.
- Actual second pressed input detonates the owned live projectile/tip, before any new launch-cost
  denial. Cooldown/empty ki do not swallow that control. One damage/disposal event; no replacement
  shot on the same press. Deflection revokes the original slot's authority.
- Beam detonation radius/damage are authored, charge-scaled and portable. Unset defaults follow
  beam width/DPS; explicit values freeze those defaults independently, including original values.
- Remote sustain ends on freeze/grab/stun/stagger before spending/emitting. Existing packets fade
  through the normal traveling-stream implementation and cannot regain remote control on recovery.
- AI emits the same second-press intent only after sight/acquisition and proximity of actual shot
  to visible target. It does not reselect a live remote shot as a fresh launch, interrupt a clash,
  or abandon an unrelated held charge action.
- Charge entry now pays once before preparation, separately from building energy. Release cannot
  overdraw ki; tiny unformed shots refund only entry, not charge energy already used.
- Dead projectile manager entries are pruned before update. Teardown clears remote references.

## Verification and review

- Initial remote object RED: 3 missing detonation/pruning methods; GREEN 3.
- Input RED: 8 missing lifecycle/input/forwarding cases; GREEN 8.
- AI RED: 4 missing intent cases, existing sight safety passed; fixes green.
- Metadata RED: 2 missing field/default contracts; GREEN, then derived-default stripping RED fixed.
- Independent runtime review found continued emission through interruption and abandoned unrelated
  AI charge; added 5 RED cases, fixed both. Scoped re-review: both ADDRESSED, PASS, 33 focused checks.
- Root combined runtime/data/package verification: 52/52 before separate shell-material tests.
- Real browser mouse → Input → controlPlayer → runSlot → traveling beam: hold charge, release launch,
  leave released while beam travels, zero-ki second press detonates, no page errors. Initial fixture
  failed because page RAF cleared real input edges while only update was paused; fixture now owns
  update and endFrame together. No production input workaround was made.
- `tools/remote-playtest-browser.mjs` owns this browser check and writes `artifacts/remote-playtest/`.
- Studio attack authoring browser passed before follow-up UI correctness/finish fixes; those are
  tracked separately, not implied finished by this runtime report.

## Production shell follow-up

The remote burst now requests an edge-weighted energy shell while normal impacts retain their
existing material. MeshBasicMaterial shader injection preserves color/opacity animation and the
current light/effect pool. Explicit radius zero does not invent a fallback explosion. Separate
read-only review PASS: installed Three r169 shader contract is sound; actual effect cleanup restored
the scene baseline and all 14 pooled lights. Multi-age final visual/console validation is still required.

## Not a full parity claim

Remote activation is an editable opt-in, not a global rewrite of every existing hero. Splitting,
projectile interaction priority, power-level unlock/visual transformation tracks, BFP-specific mode
rules and separate network validation remain open in the parity ledger. Tests establish named
contracts, not subjective flight/combat approval.
