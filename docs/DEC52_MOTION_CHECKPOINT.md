# Dec-52 motion library checkpoint

The family viewer now consumes src/engine/dec52-motion-library.js rather than maintaining its own all-purpose sine pose. Rat and hound have idle, walk, run, bite, jump articulation, sniff and flight articulation clips. Remote mech has idle, walk, run, jump and flight articulation. Cloud uses existing formation visualization and does not advertise unsupported skeletal motion.

Export motion library downloads Three.js clips with family, source, loop and candidate metadata. Locomotion is in place; jump does not translate the simulation entity. Physics and damage remain separate. These are procedural authored candidates, not imported mocap or gameplay-approved gaits.

Tests on actual rat, hound and mech GLBs verify target joint existence, finite transforms, unchanged joint positions, loop closure and diagonal front/rear alternation. Foot planting, body/armor clearance, bite contact and gameplay integration remain to review. Do not call the whole Dec-52 task complete based on these checks.
