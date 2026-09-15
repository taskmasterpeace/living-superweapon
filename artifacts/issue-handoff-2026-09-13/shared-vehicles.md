## Problem and current checkpoint
Squad transport implements its own boarding, seat occupancy, Z switching, return route and exit cleanup. Future aircraft/cars should not copy those rules. Z already cycles the squad transport's six passenger seats plus prototype pilot station, swapping occupants without ejecting anyone (local f0d9d69). Manual aircraft control is NOT implemented by sitting in that seat.

## Proposed shared solution
- Define a versioned vehicle manifest: stable vehicle/seat IDs, seat role (driver/pilot/gunner/passenger), local actor anchor/yaw, supported body envelope, animation family, permitted actions, entrance/exit anchors, door/ramp prerequisite, capacity and collision references.
- Implement one seat/boarding controller consumed by existing vehicle adapters. It owns admission, boarding reservation, occupancy, change-seat transaction, disembark search and cleanup. Vehicle adapters own physics and role-specific driving/weapon intent, never a duplicate occupancy map.
- Z emits changeSeat only while aboard. Cycle in manifest order; an occupied seat swaps occupants atomically. Reject invalid/dead/destroyed transitions; never duplicate, drop or strand either actor. Preserve unrelated on-foot bindings. Controller and touch expose the same action through their adapters.
- Boarding routes use authored approach -> doorway/ramp -> cabin -> seat anchors. Followers reserve distinct seats and use the same admission rules as humans. Surface navigation must account for the real jeep/hull and doorway clearance; do not disable vehicle or teammate collision to make a test pass.
- Central safe-exit query checks ground/slope, water, actor envelope, hull/door state and nearby bodies. If none exists, remain seated with a readable reason. Apply the same checks at every vehicle orientation.
- A role transfer changes control authority in one transaction. Pilot role can remain automatic-route-only until handling is delivered; UI must state this. Passenger input must not leak into powers, prone or steering.
- Release reservations/occupancy/role authority once on exit, KO, vehicle destruction, form change or reset. Keep friendly-carry ownership separate and reject incompatible simultaneous ownership.
- Add manifest validation to the authoring pipeline: seat names unique, anchors finite/in bounds, capacity consistent, entrances usable by declared body types. Reuse authored chairs, not per-vehicle bespoke animation rigs.

## Migration and completion
1. Extract behavior from squad-transport.js while preserving its verified Z behavior.
2. Migrate one existing ground vehicle as a second consumer. This is the proof of reuse; merely renaming the transport controller is insufficient.
3. Test two vehicles with the same scenarios: full/occupied seats, oversized body, moving exit denial, blocked exit, death, swap while moving, destruction/reset and repeated reboarding.
4. Use a focused shared harness for failures; only one integrated route after meaningful changes.

Related: #10 cockpit/art, #11 transport acceptance, #26 ground handling, #24 collision, #5 touch. Keep these issues' remaining gates; this issue owns the shared implementation.

Creator's parked-jeep report remains a distinct repro, not a proven scientist problem. The recorded sample -> lab -> upgrade -> fight route passed locally in b50340b after initial staging, but that does not certify every parking layout or a universal system.
