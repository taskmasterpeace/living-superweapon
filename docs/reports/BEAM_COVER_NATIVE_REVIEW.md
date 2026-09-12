# Native cover-damage acceptance remains open

Runtime `1ba4f85`; normal VEGAS practice, mouse aim and right-trigger charge/stop. The added `--cover` capture mode selects existing nearby cover through read-only telemetry and observes `damageBlock` without changing its arguments or result. It must see actual HP loss to pass.

`beam-cover-isolated-candidate` and `beam-cover-strafe-candidate` both fail that requirement. The selected cover is at[-105,55], HP900. The visible beam instead stops on the building's near wall, around Z28 and Y10.5, and `damageBlock` receives no calls. The first screenshot was inspected: the bright contact is on the building facade. Both captures have zero runtime/resource errors and stable source. The strafe attempt moves the player normally before shooting; it still contacts the facade. A separate clear-side attempt has no eligible target and fails before firing.

These records establish visible beam blocking, not destructible-cover damage. Next inspect whether this facade is intentionally separate from the selected HP-bearing cover and whether interior contact should route to an owning destructible piece. Do not change collision ownership or weaken the assertion merely to pass the capture. Controlled beam-cover tests remain distinct evidence.

Actual mix listening page: primary checkout `artifacts/marketing/combat-pass-2026-09-12/audio-review.html`. Its three verified local sources are punches, funded guard/break and beam charge/stop. No listening approval is claimed. Draft PR27 is mergeable, but has no reported GitHub checks; mergeability is not test acceptance.
