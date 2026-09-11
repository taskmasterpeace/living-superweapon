# Creator reference: storm lighting and body roll

Source supplied by creator: `C:/Users/taskm/OneDrive/Documents/ShareX/Screenshots/2026-09/comet_s3Xxu9d8Rs.mp4`.
Inspected 10 September 2026: 17.6 seconds, 1364x636, 30fps. No audio stream was reported by ffprobe; no thunder timing is inferred from this file.
Extraction evidence: `artifacts/storm-reference-review/`. Three 2fps contact sheets span the clip, two 12fps sheets cover 5.5–9.5s, and a 15fps roll sheet covers 9.1–10.4s. Full-size lightning frame at 8.3s.

## What the clip actually shows

- Dark, layered cloud ceiling with large soft billows and lighter edges; not a flat gray tint or isolated fair-weather clouds.
- Muted blue-green/gray night environment. Terrain silhouettes remain visible, but the character often becomes almost black between flashes. Match the atmosphere while retaining more combat readability in PowerWorld.
- Around 6s, 8.2–8.5s, 11s and 14s: brief cold-white illumination changes on terrain and the character, plus bright cloud regions. The bright near strike pulses repeatedly, rather than maintaining a beam-like sustain.
- At 8.3s the nearest strike is heavily bloomed and its core is clipped white. Fine bolt branches cannot be reliably reconstructed from that saturated frame. Use a crisp irregular core and restrained branches as an implementation design, not as a claim about invisible details in the footage.
- Around 9.2–9.9s: a compact lateral body rotation with tucked limbs and return to upright while the camera remains broadly level. This is a useful dodge-roll silhouette/timing reference. It does not demonstrate prone rolling or crouched leaning; those are separate creator requests.

## Accepted behavior and work order

1. Visible cloud banks whenever the rain preset is active, with a dense ceiling for storm/night. Animate the cloud layer; couple cloud cover to key light and environment exposure. Existing rain height/roof clipping stays intact. Current gray veil alone does not meet this target.
2. Lightning: cloud-to-surface path, short multi-pulse discharge, local ground/character illumination and cloud flash. Separate ambient distant lightning from warned damaging strikes. Correct terrain/roof endpoint, finite warning/strike lifecycle, source ownership, delayed thunder and reset-safe audio. No constantly white screen; respect reduced-flash settings.
3. Soldier stance controls: Q/E roll left/right while prone; hold Q/E lean left/right while crouched; standing Q gadget and E interaction remain available. Consume stance inputs so gadgets, interactions and kit slots do not fire too. Q+E neutral; blocked/KO/grab states cancel. Ground roll keeps low bounds, moves through existing collision, has recovery/cooldown and never rotates the camera. Lean must move the relevant aim/muzzle/upper-body hit representation and stop at cover—not permit shooting through walls. Verify mirrored animation, terrain clearance and recovery.
4. Tornado: localized moving funnel, visible debris base, warned finite influence radius, capped pull/lift/debris and an escape route. Prove one lifecycle and teardown before allowing multiple funnels. Do not implement it as a world-wide invisible force.
5. Hurricane: sustained regional wind/rain/squalls with shelter and a calmer eye/region transition. Distinct from a larger tornado. Wind changes flight handling and ordinary projectile drift within bounded control limits; energy beams retain their existing wind exemption. No aircraft expansion in this pass.

All new sound phases need the replaceable sound harness. The storm/night reference, hurricanes and contextual soldier actions expand the active requirements; none is claimed complete by the earlier daylight/rain tests.
