# Power World: grabs, shot interception and collapse

## Implemented: held teammate shot interception
Projectile sweep, projectile overlap and beam contact/damage now admit a living teammate held by a living enemy. The hold must be reciprocal (`victim.grabbedBy === holder` and `holder.grabbing === victim`). Friendly shots remain excluded after release or holder death. AI hostility, homing selection, chain attacks and general area damage are unchanged.

The actual intersected receiver uses normal damage handling. Damage is not copied to the holder. Existing non-piercing collision ordering decides which body stops the shot; piercing attacks retain their existing behavior. This does not yet change generous cylinder body volumes into exact animated limb collision.

Player teaching text: **Held enemies can be hit by their teammates: bodies intercept shots.** This is appended to the existing grab controls.

Verification: a production swept-contact regression failed before the change and passes after it. Beam contact also verifies that the held teammate stops the beam before the holder, without becoming an AI foe. 51 contact/projectile tests and production build pass. Full live visual capture remains pending.

## Approved direction: collapse (not implemented by this checkpoint)
A building breaking is not an automatic occupant kill. Model these separately:
1. Blast: existing blast damage/occlusion rules apply at the explosion.
2. Support: remove only the destroyed floor collision. An occupant without support falls through native movement; a character able to fly can recover when their control state allows it.
3. Debris: a small bounded set of meaningful roof/floor chunks should have swept collision and impact damage. Dust and small fragments remain cosmetic. No invisible damage from cosmetic rubble.
4. Landing: surviving characters land, may become knocked down, then recover from face-up/face-down poses. Knocked-out characters do not play a normal get-up.
5. Blockage: large settled rubble may become cover. Do not add indefinite burial or suffocation without a readable escape mechanic.

Suggested player messages: FLOOR COLLAPSED; FALLING DEBRIS; KNOCKED DOWN; RECOVERING. Show each only when that event actually occurs. Explain damage through the existing hit-outcome presentation.

Current city `shatterBlock` creates cosmetic chunks and removes cover; it is not a structural support simulation. Do not present its animation as a working two-story collapse system. The first structural test should be one two-story training structure with independently breakable supports, floor and roof, not map-wide destruction.

## Still required
Fast rear aerial grab and spin throw capture; swept thrown-person impacts; distinct conscious flail versus stunned tumble; face-up/down recovery; grip strength/one-versus-two-hand rules; three effort lift studies; playable structural training scene and debris budget. Existing numerical grab tests do not prove these visual/gameplay sequences.
