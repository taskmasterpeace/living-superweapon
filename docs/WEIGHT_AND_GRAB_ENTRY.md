# Weight and grab entry

Attribute display names: Fighting, Agility, Strength, Resilience, Intelligence, Perception, Mental Fortitude. Internal saved-data keys stay unchanged.

A character can have explicit `weightLb`. The actual bodyWeight function uses that weight for lifting checks. Existing characters retain an estimated body weight when no value is assigned. Props already have physical weights internally; overweight feedback now converts those and lifting capacity to pounds. Person lift rejection also shows weight and capacity.

The player-facing rule is weight <= lifting capacity. Internal rank is a capacity lookup, not another number the player needs to compare. Resistance to a hostile grab is separate from whether its body can be lifted.

Grab startup now advances at most 1.5 world units along the initial aim (horizontal when grounded, 3D when airborne). Environment sweep stops it at cover; a conservative nearby-body clearance limits overlap. It does not home after the target turns or dodges. Distance and startup duration are currently fixed, not scaled by attributes.

54 focused tests pass, including a missed grab moving forward, thin-wall stopping, existing person carrying and explicit weight. Production build passes. Animated hand contact, stronger reach/victim poses, throw-impact sweeps and recovery transitions still need their separate visual/gameplay acceptance. No new proof video is claimed.
