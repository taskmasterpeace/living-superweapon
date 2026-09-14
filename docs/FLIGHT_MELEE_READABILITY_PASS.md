# Power World flight and melee readability pass

Implemented: airborne boot ribbons begin 3 game units behind boots and have an approximately 32-unit maximum trail; ground dust and runner trails unchanged. Stunned airborne bodies now use the limp layer, conscious launches retain flailing. Physics remains authoritative. Regional melee HUD shares release selection with gameplay, merges identical adjacent choices and shows clinch Body blow/Finisher. Existing balance is unchanged, including two-tier power threshold .18. Shared typography uses Inter body, Rajdhani headings, monospace technical data. Specialty comic fonts remain separate.

Verification: 102 combined tests passed (flight wake, surface wake, lost control, melee meter, person carry, fighter body contact). Build passed; existing bundle size warning. Browser entered actual Threat Room airborne trial and screenshot inspected. This is framing evidence only, not full flight/contact/landing visual acceptance; no accepted action video recorded.

Still required: moving camera approval of ribbons and sand wake; complete aerial approach/punch/grab/throw/impact/recovery proof; held victim pose review across sizes; face-up and face-down get-up transitions. Repeated grab currently throws or arms throw. A choke needs a separate deliberate command and contest/escape/interruption design; not implemented. New worlds/teleport destinations and large wrestling library remain deferred.

Research basis: Epic documents animation montage sections/layers, motion warping to align an action with a world target, and pose warping to adapt shared motion. These inform reusable phases and contact adaptation here; this Three.js game does not use Unreal plugins. Sources:
- https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-warping-in-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/animation-montage-in-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/pose-warping-in-unreal-engine

Type rules: Inter for readable body instructions and ordinary controls; Rajdhani for titles/character names; mono only for diagnostics and technical tables. Use shared font tokens, avoid new per-panel families. This is provisional, not a final brand wordmark decision.
