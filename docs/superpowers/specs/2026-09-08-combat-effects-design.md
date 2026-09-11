# Combat effects and particle constructs

Approved direction: September 8 user approval of the repository-reference effects plan. Hologram particles are for Green Lantern-style constructs; not armor nanites in this pass.

## Scope

Improve existing beam contact, guard surfaces, charge staging, and fist/hammer/wall/turret constructs. Use shared production objects in Studio. Preserve traveling hose collision, damage, guard chip, deflection rules, input, camera, and charge timing. Visual effects never award protection or damage. No cape edits, map changes, dependency/framework migration, remote code or asset imports.

Constructs assemble as surface-attached particles into readable solid energy geometry. Existing construct operations remain authoritative during assembly (the forming solid remains perceptible, no invisible cover). Particle budgets are finite; construction and destruction release all resources. Green comes from existing construct colors; other custom colors remain supported.

Shield ripple location follows the actual contact, not a screen-center flash. Generic body-blocking and deflection remain distinct from full-sphere barriers. Charge details stay attached to existing emitter sockets and use simulation time. Beam feedback only occurs for accepted contact and retains target readability.

Studio exposes portable, validated visual parameters and construct rehearsals. Existing profiles without those fields load unchanged. Test lifecycle, bounds, independence, real combat wiring, save/export, and rendering from gameplay and inspection cameras.

## Future direction, not current implementation

The user's September 8 direction supersedes the July design exclusion of vehicles: military response escalates with player actions/threat; tanks, fixed-wing aircraft, and helicopters have distinct movement and eventually player control. Future inhibitors, alien factions, and human-zombie infection/hordes are desired. Spitting zombies use finite range and ballistic travel; flight remains a valid escape instead of granting every zombie anti-air. Threat/rules, vehicle simulation, infection, and effects are separate systems. This pass supplies reusable charge, shield, construct and impact presentation only.

## Acceptance

- Contact ripples and pressure spray are attached to real impacts; no hit effect on misses.
- Formation completes into a stable silhouette and follows moving/rotating construct objects.
- No camera/control/balance changes; no cape work.
- Studio save/export applies presentation to gameplay and supports construct previews.
- Focused tests, production build, visual captures, and a multi-effect lifecycle check pass; subjective AAA quality is not inferred from test counts.
