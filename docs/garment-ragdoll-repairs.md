# Garment controls and ragdoll repairs

Cape selector had no change listener. It now applies each morph and enables the cape when a shape is selected. Collar options classic, low and three flared rectangles work the same way.

Short skirt now includes front/back center coverage and an internal waist lining. Lab coats hide the full-width base torso and use a narrower inner shirt to prevent torso surfaces poking through. Shared recipe choices remain exportable.

Ragdoll now bounds hip flexion/crossing and trunk collapse/twist, corrects downward ground velocity handling, and evaluates rest after contact/constraint corrections. A final joint pass preserves bounds after contact relaxation. Targeted impact/settling tests and existing ragdoll regressions pass; creator settled-pose check confirms finite transforms and asleep state.

Deck52 official emblem was not located in the bounded project/worktree asset search. Current white 52 is a generated placeholder, not a claim to be the approved logo. Await its file path; no unfinished fleet work imported.
