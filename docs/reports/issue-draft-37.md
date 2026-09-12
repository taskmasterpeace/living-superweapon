## Problem
PowerWorld cameraDrive exits when combat input becomes inactive; after KO this freezes orientation as well as position, so the ragdoll leaves view.
## Intended behavior
Keep camera at its death position and keep the existing lens. Pivot toward the current ragdoll chest while it flies/falls. Restore ordinary chase ownership when the player is alive. Do not override menus, map cameras, shared-screen play or inactive matches.
## Candidate
Added orientation-only death-camera helper in codex/playable-integration with focused tests for moving ragdoll, fixed position/FOV and ownership exclusions. This is a candidate implementation; native visual acceptance remains required.
## Acceptance
Native launched KO shows the body through the visible part of its trajectory without translating camera; verify respawn, menu, repeated KO and terrain occlusion. Record a short gameplay clip. Do not confuse KO with recoverable airborne flailing (#20).
Related: #16 #20 #34.