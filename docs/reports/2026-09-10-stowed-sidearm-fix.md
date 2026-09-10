# Stowed sidearm ownership correction

Goal remains active. Previous goal turn made progress with close beam/form-continuity fixes. This turn delivered the creator-requested separate-worktree authoring brief and resumed the existing combat backlog.

## Evidence and change

The disjoint-hand regression initially failed before reaching live off-hand recovery. Soldier equipment hides a pistol until a shot publishes its pose interval. Hand-conflict admission happens earlier and selected the visible right-hand rifle as fallback, so a held rifle prevented the left-hand pistol from starting.

Two first-trigger tests exercise actual Fighter, ability admission, equipment and projectile creation in both input orders. Rifle-first failed before the change; pistol-first already passed. Semantic hand claims now explicitly allow the loadout-managed stowed matching weapon; ordinary emission still requires visible equipment, and arbitrary hidden/replaced weapons remain excluded.

Once the pistol actually fired, the existing recovery test exposed a second issue: after release/form replacement, recovery selected the visible rifle rather than the new rig's stowed pistol. Recovery now uses the same explicit stowed-attachment lookup. The original recovery assertion was retained and now passes, including new-hand/socket identity and aim alignment.

## Verification and limits

- 110 tests passed across disjoint hands, firearm emission, firearm ammunition, armed weapon fit and progression rig. Existing undefined-color warnings appear in progression fixtures; this is not a warning-free full-project claim.
- Production build passed, 369 modules, with the existing large shared-chunk warning. Whitespace check passed.
- No new native-input browser capture of the sidearm fix in this turn; fixture results prove admission/emission and pose recovery, not complete live combat feel.
- Latest changes are local, not deployed. Point-blank flying beam launch, full sound coverage and nine-gun inventory remain open. Body-zone gameplay is a researched proposal, not an implemented system. Authoring branch setup is supplied as directions, not executed.
