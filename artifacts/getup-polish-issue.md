The current nonlethal thrown-impact path now has a separate prone-to-standing recovery with native action lock and return of control. It is separate from near-death second wind and does not move the physics root.

Visual review of the current Sol/Kano native demonstration shows the rise is too rigid: the body lifts too much as one piece. Keep it a candidate until a planted recovery is reviewed.

Local evidence: D:/lsw/.worktrees/combat-release-review/artifacts/live-capture/current-model-aerial-grab-throw.mp4. Full reproduction and metadata are documented in docs/AERIAL_GRAB_DEMONSTRATION_2026-09-14.md on codex/playable-integration. This media is local, not uploaded to GitHub.

Acceptance:
- Choose a source get-up take visually (existing lay-to-idle/ninja land sources can be compared) and retain provenance.
- Plant hands/knees/feet while rising; inspect current modular body from front/side/back at quarter phases.
- Cover face-up and face-down impact choices without adding animation-owned launch distance or moving collision roots.
- Preserve freeze/stun/sleep/hitstop interruption and defeated-stays-down behavior.
- Re-run native throw → impact damage → get-up → control-return proof and record an action-only clip.

Current native sequence and timing tests pass; visual polish remains open. Do not spend the entire broader combat pass polishing this in isolation.
