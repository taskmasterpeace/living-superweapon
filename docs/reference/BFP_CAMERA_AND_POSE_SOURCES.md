# BFP camera and pose reference pack

Checked September 5, 2026. Reference research only; no production tuning changed in this step.

## Provenance

- [BFP recreation](https://github.com/LegendaryGuard/BFP): source inspected at commit `ef6d50c454454c7e1c13e54ed17c1a213a3231f9`. The maintainer says the original source appears lost; this is a reconstruction with improvements and movement differences, not recovered original code.
- [Recovered documentation/config collection](https://github.com/LegendaryGuard/BFP-docs): inspected at commit `9075cebb73e3adadb46848f5e79cf552c324fc53`.
- The video frames below already exist in this repository. Their filenames identify video title and timestamp. Ultra BFP is a different version and must not be silently treated as the original release.
- [Additional BFP screenshot gallery](https://www.moddb.com/mods/bid-for-power/images) and [release screenshot](https://www.moddb.com/mods/bid-for-power/downloads/bid-for-power-v12-full-exe).

## Camera values from code, not screenshot guesses

| Parameter | Verified value | Meaning |
| --- | --- | --- |
| Third-person orbit angle | 0 degrees | Directly behind the view heading; this is not a fixed downward pitch |
| Camera range | 110 Quake units | Backward offset along the viewing basis |
| Height configuration | -60 Quake units | The camera applies the negative of this value: +60 along view-up |
| FOV default | 90 degrees horizontal | Not Three.js's vertical FOV |
| Fixed-third-person default | 1 in recreation | Recovered sample config uses 0; do not conflate defaults with a user's configuration |

Sources: [cvar defaults, lines 16 and 80–83](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_cvar.h#L80), [camera implementation, line 221 onward](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/cgame/cg_view.c#L221), and [recovered sample config](https://github.com/LegendaryGuard/BFP-docs/blob/9075cebb73e3adadb46848f5e79cf552c324fc53/cfgs/bfp.cfg#L60).

Derived conversion: vertical FOV = 2 atan(tan(horizontal FOV / 2) / aspect).
90 degrees horizontal gives approximately 58.72 degrees vertical at 16:9, or 73.74 at 4:3.
Our 58-degree base is already close at 16:9. Setting Three.js to 90 would widen the view dramatically.
Preserving the original 4:3 vertical framing on widescreen is a different choice from preserving
90-degree horizontal FOV; reference-video crops must be accounted for before comparing body size.

The recreation uses collision traces for the camera. It also targets +/-20 degrees of view roll
during boosted lateral flight, returning to zero otherwise: [PM_FlyTiltView](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/game/bg_pmove.c#L1066).
That is camera roll, not an elbow angle or the body's banking angle. Its fixed per-update increments
are not values to transplant into a variable-frame-rate Three.js loop.

Do not paste 110/-60 into our engine: coordinate conventions, body size, camera origin and model
scale differ. Match projection and on-screen composition after conversion. Code was inspected,
not copied into the game.

## Sample images and what they actually prove

### Camera controls and airborne attack — Ultra BFP, 1:26

![Ultra BFP camera menu and airborne attack](<D:/lsw/docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 1-26 screenshot.png>)

The camera menu exposes angle, height, range and FOV independently. The fighter is below the
reticle, with a visible bent-knee airborne stance. The sliders have no numeric readout in this
frame: this image cannot establish the exact selected camera values. Map palette is not a target.

### Rear airborne stance — Ultra BFP, 2:44

![Ultra BFP airborne silhouette](<D:/lsw/docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 2-44 screenshot.png>)

Separated legs, flexed knees, arms clear of the torso, and a readable waist/shoulder silhouette.
This still establishes a pose, not its speed or whether the player is currently accelerating.

### Downward aerial attack — BFP retrospective, 1:31

![BFP Piccolo downward aerial attack](<D:/lsw/docs/reference/DBZ's Forgotten Fan Classic - Bid for Power 1-31 screenshot.png>)

Rear-above framing leaves room between the fighter and the aim point. The bent legs and torso
remain readable while aiming down. This video frame is pillarboxed; compare the active image,
not its full 1280-pixel canvas. [Source video](https://www.youtube.com/watch?v=4BAwJyKkrpg&t=91s).

## Model and animation contract from recovered docs

The [original model-authoring document](https://github.com/LegendaryGuard/BFP-docs/blob/9075cebb73e3adadb46848f5e79cf552c324fc53/docs/customizing_models_%26_bfp_skin_config_file.md)
lists distinct forward/back flight torso clips and idle/forward/back flight leg clips, plus
separate charge, block, melee and attack preparation/release animation states. It requires
an eyes tag and supports named attack tags. Head, torso and legs can be replaced on transformation.

The [recreation's animation selection](https://github.com/LegendaryGuard/BFP/blob/ef6d50c454454c7e1c13e54ed17c1a213a3231f9/source/game/bg_pmove.c#L310)
selects forward/back flight from input and flight-idle otherwise. Clip selection is code;
actual joint poses are authored in model animation assets. Camera C code cannot supply those poses.

## Consequences for our next visual acceptance pass

1. Compare centered BFP framing with our shoulder offset using the same fighter, state and
   aspect ratio. The previous motion reel does not constitute this A/B comparison.
2. Compare character screen position and projected size through hover, forward travel,
   backward travel, braking, and downward attack. Don't tune distance from a rear boost frame alone.
3. Add explicit backward-flight and attack-ready silhouette targets. Our current speed-based
   procedural blend is not equivalent to BFP's authored state-specific clips.
4. Review front, both profiles and rear, plus transitions over time. Check rendered arm/torso
   clearance, leg separation, head direction, and actual attack socket alignment.
5. Keep map design excluded. Screenshot environments provide orientation only.

The animation-review skill influenced this pack by separating still-pose evidence from motion
evidence and by withholding acceptance until source and target sequences are compared.
