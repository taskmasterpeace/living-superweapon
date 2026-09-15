HIGHWALL currently has shared ground A* routing around authored solid boxes, radius/height clearance, door invalidation and native movement/sight/projectile tests. Player stairs work. It does not have multi-level AI route planning onto the observation platform, general tactical cover use, or a designated observable-target squad command.

Implement these through shared AI/navigation interfaces, preserving legitimate sight/hearing/memory. No waypoint teleport or map-specific damage scripts.

Acceptance: soldier ascends and descends the platform; route rejects insufficient clearance; editing placement invalidates routes; squad reaches distinct commanded positions; designated target requires observation and search after contact loss. Profile default mixed combat and 16/32/64 stress presets before claiming population support.
