---
description: Add a power without repeating one that already exists (checks visual collisions first)
---
Use the `wwa-power-design` skill to add: $ARGUMENTS

Order of operations, do not skip:
1. `node scripts/visual-collisions.mjs --type <the type you intend to use>` — show me the report.
2. Check whether it already exists uncarried (`wwa-orphan-audit`). If it does, give it a carrier
   and stop — say so plainly rather than building a second one.
3. Pick an engine type from the 26 that exist. If none fits, say why out loud before inventing one.
4. Author at least FOUR of the seven visual traits so it differs from everything existing on four.
   `material` first — it derives the damage type, the beam temper and the visual family.
5. Re-run the checker and show me that the new power is not in an identical-profile group.
6. Hand to `wwa-ship-mechanic` for carriers, counter, manual and headless tests.

Then tell me the five readability tests it passes and any it does not.
