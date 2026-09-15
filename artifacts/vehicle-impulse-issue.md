The shared impact pass now measures relative normal speed and consistent fighter mass for body/hull contact, and prevents repeated hull damage. Vehicles still use kinematic hull blocking, so a flyer cannot physically shove or tumble a jet/car. This is the next missing part of the creator's ramming fantasy.

Add an explicit vehicle response adapter that accepts contact impulse, updates the actual controller velocity and contact transform, and keeps visible hull/collision agreement. Preserve ordinary low-speed boarding, aircraft minimum-speed rules, damage attribution, one impact owner, and occupied seats. Do not add a second arcade damage path or broadly refactor all fleet controllers.

Acceptance: deterministic head-on, same-direction and glancing cases at30/60/120Hz; light/heavy aircraft and road vehicle masses; guarded vs unprepared flyer; punch/throw ownership; actual native-input current-model flyer-versus-moving-hull demonstration. Destruction expansion is outside this issue.
