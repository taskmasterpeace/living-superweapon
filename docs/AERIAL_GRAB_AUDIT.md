# Aerial grab and impact audit

Target experience: curve behind an airborne attacker, capture them, choose a throw direction, and throw them into terrain. Grabs remain the priority. Two-person rescue is excluded.

## Verified in current code and targeted tests

- Rear capture uses the victim's facing; capturing during their melee recovery also grants back-grab advantage. It extends the struggle window and prevents the ordinary front-grab escape opportunity.
- Lift admission checks capacity. Failing that check preserves the existing clinch rather than silently lifting an impossible load.
- A transported hostile victim follows the actual held actor. Throw release uses three-dimensional aim, including downward aim, and does not teleport the victim.
- New rear aerial capture → lift → downward release tests pass at 30/60/120 Hz. Existing carry tests cover terrain impact, credited wall impact, clearance, interruption and identity cleanup.
- Stun cancels flight. Stagger is a shorter interruption/recovery lock. Neither is merely an animation label. Same-frame holder incapacitation now cancels a deferred clinch punch before damage.
- Energy/head impacts add a small damped head turn beyond the upper-body tilt. Maximum extra angle is .12 radians. Frozen/held and busy action poses retain ownership; continuous beam pressure does not generate repeated head snaps. Head/cowl transforms restore on the next pose evaluation, and simulation position is unchanged.

## Not yet proven or finished

- The complete high-speed curved approach through player camera/input, acquisition timing and capture at flight speed has not been playtested end to end. The new rear-capture test starts at arrival within reach; it is not evidence for that approach.
- Front/side/rear/neck candidate clip library is not fully assigned to live grab actions. Paired body contact and victim reactions still require visual review (issue #19).
- Extra head motion has a real-rig regression but no completed multi-angle moving-combat visual acceptance yet.
- Dedicated kicks/lunges and broader martial-arts moves remain integration work. Existing playable melee phases are documented in COMBAT_MOTION_REFERENCE.md.

Next live audit: use an airborne firing target, approach from front/side/rear at several flight speeds, capture, aim downward while holding, release into sloped terrain, then repeat with holder and victim interrupted. Record camera input, capture eligibility, actual contact, visible poses, release velocity and one credited impact. Do not call this scenario complete based only on isolated pose tests.
