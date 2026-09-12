# Native evade review

Candidate runtime: `e8ccf98806e6278361a3d6a028fb8ee8ba918e40`. Source digest `d2e2b4b1f663694a9439fe488c23cb1e5af19ff15558276d928abe0172d58be7` remained unchanged during recording.

Normal SOL/WEBLINE sparring, target focus, D + Z evade inputs. The driver now approaches within 28 units before waiting for an enemy startup, rather than stopping at targeting range. Production gameplay was unchanged.

At 1.956–2.4189s SOL activates evade during WEBLINE's active strike and retains 126 HP. At 7.0651–7.5322s SOL activates evade during WEBLINE's startup and retains 58.59781 HP. In both windows SOL moves away and the opponent's strike state finishes. The 4.8254s attempt does not activate evade and loses health; it is not counted as successful. This is observed avoidance, not proof of a counterfactual guaranteed hit without dodging.

Evidence in the primary checkout: `artifacts/marketing/combat-pass-2026-09-12/ai-defense-dodge-isolated-candidate/` contains video, actual master audio, actor telemetry, source manifests and derived `evade-audit.json`. Zero runtime errors. Inspected `evade-66.png` shows both characters and readable separation from the rear-side camera. Audio is recorded but has not been auditioned.

This supplies a native evade example for #14; it does not close roster-wide balance, animation contact or audio review.
