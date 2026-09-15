The current downward person throw looks like a drop. Confirmed code cause: MeleeSystem._throw invokes beginPersonThrowPose and immediately releases/sets velocity. person-throw-pose.js only blends the held arms away over .3 seconds; there is no attached anticipation or committed release marker.

Implement ordinary ground and hover throws before spin-sling: anticipation/load while receiver remains attached, release on an explicit marker, readable directional follow-through, then control return. Aim, contact sockets and physics velocity must agree. Do not add travel through visual root rotation. Stun/KO before release breaks the attempt consistently; no duplicate release or damage. Preserve actual swept impact damage and player-selected direction.

Acceptance: front/rear holds, downward/forward aim, small/large receiver, moving versus hovering holder, interruption before/after release, hit-stop, and release matching the trajectory preview. Use new UAL2 OverhandThrow only as a possible holder reference; it is not a paired victim/choke clip. Existing directional partner issue #19 remains separate; ground pickup contact is #21.

No video required for the next implementation pass; native tests and in-tool motion/contact review are required. Keep spin and larger wrestling library deferred.
