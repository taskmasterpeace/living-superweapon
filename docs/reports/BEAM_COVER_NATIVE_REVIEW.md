# Native cover-damage review — corrected observer

**Correction:** The initial callback-only assertion was invalid. Sustained beams directly decrement the reached cover's HP, call `setBlockCracks`, then invoke `shatterBlock` at zero. They do not call `Game.damageBlock`. The facade is the selected command-building cover, not evidence of a separate intervening interior wall. Historical failed captures below must not be cited as a gameplay damage defect.

The corrected `beam-cover-hp-observed-candidate` capture observes actual HP at the existing crack-update callback and records the beam's reached contact identity. Normal VEGAS practice and keyboard strafe/mouse aim; no gameplay mutation. Source revision3f7c8a2, stable throughout; zero runtime and resource errors. Both shots report `contactKind: cover`, target[-105,55]. The first admitted HP change is900→899.015736; final HP across both shots is301.143026. Short charge0.3086 has radius1.85427; long charge1.0135 has radius2.59299. This is sustained-cover damage, not equal-duration character-damage balancing.

Inspected `travel-1150.png` shows the beam ending visibly on the command facade. Video, actual mix audio and provenance are retained beside result.json. All50 beam-charge-range, beam-cover-contact and beam-contact-feedback checks pass. No production fix was needed. Audio listening remains unapproved.

## Historical failed observer attempts

Runtime `1ba4f85`; normal VEGAS practice, mouse aim and right-trigger charge/stop. The added `--cover` capture mode selects existing nearby cover through read-only telemetry and observes `damageBlock` without changing its arguments or result. It must see actual HP loss to pass.

`beam-cover-isolated-candidate` and `beam-cover-strafe-candidate` both fail that requirement. The selected cover is at[-105,55], HP900. The visible beam instead stops on the building's near wall, around Z28 and Y10.5, and `damageBlock` receives no calls. The first screenshot was inspected: the bright contact is on the building facade. Both captures have zero runtime/resource errors and stable source. The strafe attempt moves the player normally before shooting; it still contacts the facade. A separate clear-side attempt has no eligible target and fails before firing.

These records establish visible beam blocking, not destructible-cover damage. Next inspect whether this facade is intentionally separate from the selected HP-bearing cover and whether interior contact should route to an owning destructible piece. Do not change collision ownership or weaken the assertion merely to pass the capture. Controlled beam-cover tests remain distinct evidence.

Actual mix listening page: primary checkout `artifacts/marketing/combat-pass-2026-09-12/audio-review.html`. Its three verified local sources are punches, funded guard/break and beam charge/stop. No listening approval is claimed. Draft PR27 is mergeable, but has no reported GitHub checks; mergeability is not test acceptance.
