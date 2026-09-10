# Remote energy burst readability

## Evidence and scope

The actual remote-detontation Studio screenshot at `artifacts/attack-authoring/studio-desktop.png`
shows a broad uniform pale shell covering the measurement target. The user explicitly requires
seeing what is being attacked and powerful energy presentation. Improve the production remote
energy shell, shared by the game and Studio; do not hide VFX only in the editor, alter the camera,
change attack damage/radius, or change conventional ballistic/fire explosions.

## Implementation

- Keep the short detonation kernel, expansion, particles, light pool and pressure ring.
- Remote energy shells use an edge-weighted transparent material: a readable expanding rim with
  a nearly clear center instead of a uniform filled disk. Preserve color and time opacity from
  the existing explosion lifecycle; no extra draw calls, lights, screen blur or camera shake.
- Production remote beam and projectile detonation request that material; ordinary impact
  explosions retain their current look. Damage remains at actual projectile/tip position.
- Validate shader injection against installed Three.js basic shader, compile/render in browser,
  inspect normal and large authored burst screenshots at multiple ages, and rerun remote lifecycle
  and Studio contact tests. A still alone cannot prove feel; capture the expansion sequence.

## Split-impact follow-up

The final split-contact capture exposed four overlapping filled impact shells hiding the target.
Use the same production edge-weighted material for split-child impacts (including natural contact),
without changing their damage, radius, timing, particles, light budget, or ordinary unsplit impacts.
The new regression first failed on the missing shell flag; it also checks four explosions and all
five parent/child lights returned. Verify the actual Studio contact capture after the correction.
