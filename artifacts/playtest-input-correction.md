
## Evidence correction — input fallback (2026-09-13)

Audit found guard-drill-browser still called performAction without the configured scheme for guard, heavy and grab release. Earlier gamepad-guard/touch-guard runs, 05-32-31 controller heavy and 05-31-57 touch release therefore did NOT prove those actions used their advertised device. The touch grab acquisition did use touch, but release used keyboard. Retain the older artifacts for diagnosis; supersede the input-coverage claims above.

Fixed all combat dispatches to use the configured adapter. Acceptance now requires a nonempty action history where every action uses the requested scheme, succeeds and releases; result.json includes that history.

Replacement native-input evidence (all passed with zero browser errors):
- artifacts/playtest/2026-09-13T05-34-40.555Z-melee-guard-crush: controller strike charged to 0.70012; GUARD BROKEN, 13.1214 guard energy spent, zero health loss.
- artifacts/playtest/2026-09-13T05-35-13.719Z-melee-grab-guard: both grab and release use touch; reciprocal hold and intentional release in 0.2627 simulation seconds.
- artifacts/playtest/2026-09-13T05-35-51.702Z-touch-guard: actual touch Block through contact.
- artifacts/playtest/2026-09-13T05-36-41.503Z-gamepad-guard: actual controller guard through contact.

Each includes a silent clip, screenshots, action log and observed state. This corrects test wiring, not gameplay balance. Physical devices and movement/multitouch remain unverified. Movement adapter expansion was deferred this turn to repair this evidence defect first.
