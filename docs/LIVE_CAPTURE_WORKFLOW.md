# Live action capture and animation efficiency

## Commands
In the Threat Room console:
- `trial stationary` or `trial airborne`: starts a native lesson and places the player six units behind its origin, facing the target. This is a setup shortcut, not evidence of a natural approach.
- `trial review`: opens the existing pose review.
- `record 6`: records six seconds of the live game canvas, with terrain/effects, excluding HTML HUD and menus. Silent WebM plus initial/final HP and scenario metadata. Range 1–30 seconds.

The development-only local capture endpoint stores clips under `artifacts/live-capture/` with generated names. It accepts same-origin localhost POSTs, limits size to 32 MB, and does not accept a destination filename. Browser download remains available in production. A video preview opens on completion.

## Current acceptance
Production build and two recorder lifecycle tests pass. The browser reported completion of 12-second and 6-second diagnostic recordings before local archival was added. Their downloads were not located and complete motion playback was not verified. Visible attempts did not establish a successful hold/release/impact. After the Vite configuration restart, the browser showed a blank page; local archival and preview remain unverified. No successful proof video is delivered by this checkpoint.

## More efficient animation production
1. One rig contract per anatomy family; humanoid clips share retargeting, while quadrupeds and digitigrade aliens retain their own rigs.
2. Review a compact set of base movement and action clips before multiplying styles. Use clear live/candidate/rejected labels.
3. Apply hand/weapon/partner contact after body animation. Reuse grip profiles by weapon family, not by every individual item.
4. Store reach, contact, release and control-return markers separately from clip duration. Easy/effort/struggle must differ in body mechanics, not just playback speed.
5. Pair each accepted move with a saved scenario and short evidence clip. Include interruption, smallest/largest body, grounded/airborne and held-weapon cases where relevant.

AI can draft clips, metadata and variants; it cannot make contact or transitions correct merely by generating more animation files. Prioritize native scenario playback and observable results before expanding the library.
