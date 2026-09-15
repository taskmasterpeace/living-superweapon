# Flight and combat implementation decisions

These decisions implement the creator's September 14 request. The supplied collision essay is design input, not an instruction to import every proposed feature. New worlds, structural destruction, cover shooting and a broad wrestling library are deferred. Numerical tuning is provisional until playtested.

## Build order and completion evidence

1. Convert a small useful set from the six locally staged purchased packs. Preserve source provenance, both participants, rest-frame mapping and source timing. Add it to the existing Animation Library and current modular renderer; do not create another animation editor. Label converted, runtime-assigned and visually accepted separately.
2. Use existing grab/carry/throw state clocks and final hand contact. Motion never teleports the collision body or guarantees an attack connects. Holds must show receiver movement; interruption, release and get-up keep authoritative existing state ownership.
3. Resolve moving-body impacts from relative normal velocity, mass, tolerance and explicit powered commitment. Reuse current swept collision and damage receivers. One owner applies damage per contact; throws and committed strikes retain their own damage paths.
4. Produce a compact inventory concept and camera-mode contract. Keep most of the game visible. Inventory changes do not silently move the player, alter the camera or grant equipment.
5. Export a reproducible workbook with the full asset intake, selected motion roles, character stats and decisions. Unknown biography fields remain clearly unconfirmed instead of fabricating canon.

## Four physical capabilities

Mass is physical weight and does not increase merely because Strength increases. Strength controls deliberate lifting, grip and applied force. Resilience contributes to impact tolerance, independently of impulse/displacement. Movement power controls drive and airborne load; it does not grant invulnerability. Closing speed is the difference between both velocities projected onto the contact normal, not the sum of speedometer readings.

Ordinary low-speed contact separates without damage. A severe accidental collision can hurt an unprepared flyer. Guard is a deliberate brace only when facing the contact; attacks use their committed contact window. Stunned characters cannot brace. Same-team ordinary body traffic should remain forgiving; hostile shots striking a held teammate retain the separate existing friendly-fire rule. Contact never becomes a grab automatically. A catch still requires Grab.

## Animation language and editing

Action identifiers distinguish action, equipment, hand ownership, movement context, participant role and phase. Examples: carry/person/shoulder/holder/loop; grab/person/aerial/receiver/contact; firearm/pistol/dual/ground/fire; blade/sword/dual/ground/attack. A broad family is a filter, not permission to equip every weapon.

Use the existing five cruise silhouettes: arms at sides, both fists forward, both palms forward, one fist forward, bent elbows/fists near shoulders. Keep hover, cruise and landing as separate choices. The incoming Indie-us pack supplies additional motion only after exported source files arrive; screenshots are references, not usable animation data. Existing procedural flight remains available during intake. Hard landing, moving landing and recovery must not become interchangeable cosmetic overrides.

Three heavy-charge regions remain. Ground sweeps require a suitable fighting style and ground contact; they are not aerial kicks. Agility influences eligibility and recovery of authored traversal; it does not automatically grant flips to every character or extend hit range. Side firing dives require launch, aim, collision, landing and get-up, so a previewed roll is never labeled a finished Max Payne dive.

## Equipment choices

Nightfall (runtime ID knightfall) is the first dual-sword candidate. Keep his current live kit until the dual-sword source and both hand contacts are reviewed; do not imply that two visible blades create two validated attacks.

The magical spear is a proposed signature-weapon loadout for a spear specialist, not a global ability. Design: matte black shaft, angular crimson emissive head with a distinct split/barbed silhouette. Aim and throw; bounded steering while outbound; embed on solid impact; press the same ability to recall. One physical spear exists per owner. Recall fails cleanly when the owner is unavailable, and hand occupancy gates the catch. A normal spear uses ballistic flight and retrieval. Recall does not teleport through walls, produce duplicate items, or repeatedly damage one overlapping target. Assign the specialist identity after the current roster's canon review; the demo loadout may be tested independently.

Dual pistols can start with authored aim/recoil poses using existing arm aiming. Separate muzzle origins and hand ownership are mandatory; reload, ammo and equip rules must be real before describing this as finished akimbo gameplay. Side aiming belongs to upper-body aim, not a whole-body clip that ignores the aim target.

## Inventory and camera modes

Backpack opens as a compact window, with grid footprint and mass shown separately. A two-handed weapon occupies one stored item footprint but both equipped hands. A carried person/car is a world-held object, not backpack contents. Show a persistent compact equipped item summary when the window closes.

Player, vehicle, workstation, square handheld and widescreen handheld are explicit camera/input modes. The first inventory pass is a mock-up; physical screens later fill roughly 75–80% of the viewport with a clear exit action. Vehicle entry requires a valid seat and transfers controls; exiting restores the character camera and checks safe placement. Damage/interruption must exit device focus. Do not build this as a camera teleport with controls still affecting both actors.

HUD language: heart = health, bolt = general energy, shield = defense. Tooltips and accessibility labels retain the actual resource name. Armor mitigation and Guard's consumable defense meter are different rules even if they share a visual family. Commands and weapon selection are separate radial menus. Do not reuse Z until its current descent binding is resolved.

## Identity and dialogue

Preserve existing names and canonical data. Real name, age, heritage/species, hometown, nationality, voice direction and pronouns are separate fields, with source and approval state. Human heritage must not be inferred from skin color. Proposed names must carry the existing [PROPOSED] marker.

Use confirmed event outcomes: successful grab, severe launch, confirmed elimination, ally in danger, low energy, objective completed. No speech on every bullet, beam tick or missed button press. Reuse SoundLibrary's existing SpeechGate: global 8-second spacing, per-speaker 10–30 seconds (18 default), per-line 45 seconds, category 12 seconds, three-second event expiry, no immediate repeat. Urgent combat information wins over taunts; suppress speech while incapacitated or in device focus. Candidate text is not a voice recording. Use original approved recordings when supplied; no runtime network voice generation is required.

## Incoming assets

Continue the current Three.js game. The user's World War Ascendance Unreal project is an asset export staging project. Do not interfere with its installation. Add newly exported FBX files through the same intake manifest and retarget converter. Re-run intake when files arrive; do not claim all owned Fab entries are downloaded or available in a browser-compatible format.
