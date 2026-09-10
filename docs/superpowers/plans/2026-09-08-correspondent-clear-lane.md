# Correspondent stand-up to impact framing

The native browser replay works, but its `impact-crash.png` shows the reporter's back
covering the fight. The reporter starts a stand-up directly between the shoulder
camera and the combat midpoint, then takes roughly a second to walk aside. The
impact insert only lasts 0.3 seconds, so the camera is zooming into that obstruction.

Bounded repair: stage the physical reporter to the side of the principal sightlines
during stand-ups, using their current projected body envelopes at reporter depth.
The stand-up camera still faces and frames the reporter. On an event the lens pans
to action; nobody disappears, teleports or changes the player camera. Opening and
subsequent stand-ups share this mark; subsequent movement still uses normal speeds,
terrain and cover push-out. No changes to damage, recording or replay timing.

1. Reproduce blocked action rays using the native NewsCrew update and actual reporter
   mesh, at 30/60/120 Hz and several horizontal fight spreads.
2. Add one shared reporter-mark helper and use it for opening/stand-up/rest marks.
3. Run news/report/profile tests and the existing correspondent browser pass; inspect
   opening, impact and attacker images. General building occlusion or a fight running
   through the crew remains a separate problem; don't hide it in test claims.
