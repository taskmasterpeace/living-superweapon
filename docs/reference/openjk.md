# OpenJK — Jedi Outcast / Jedi Academy, read as source

Reference notes for two live pieces of WAR WORLD work: the **third-person shell** (`world.camChase`
/ `world.chase()` / `game.cameraDrive`) and **melee** (`melee.js`). Everything below is quoted from
the OpenJK tree (`https://github.com/JACoders/OpenJK`) at `depth=1` on 2026-07-27, cross-read
against a clone of id's own `Quake-III-Arena` release for the stock-vs-Raven calls.

**Three codebases live in this repo and they do not agree with each other.** Every claim below is
tagged with which one it came from:

| Path | Game | Notes |
|---|---|---|
| `codeJK2/` | **Jedi Outcast** (2002), single-player | first-person game with a third-person mode |
| `code/` | **Jedi Academy** (2003), single-player | third-person by default |
| `codemp/` | **Jedi Academy** multiplayer | the duelling scene; diverges from SP a lot |

---

## 0. THE LINEAGE — what "id Tech 3" actually buys you here

`docs/powerworld/pw-bfp-source.md` records that Bid For Power's flight was stock Quake III
`PM_Accelerate` / `PM_Friction` with two floats retuned. Jedi Outcast and Jedi Academy sit on the
**same engine**, which means a large fraction of what feels like "Jedi Knight movement" is in fact
"Quake III movement" and must not be credited to Raven. The stock-vs-Raven verdicts are in §4;
this section is the one structural fact that frames everything else.

**The single most useful artifact in the whole repo is that Raven left id's third-person camera in
the file, commented out, directly underneath their own replacement.** `code/cgame/cg_view.cpp:908`
opens a block comment containing verbatim stock Q3 `CG_OffsetThirdPersonView`, and it is byte-
comparable to `q3/code/cgame/cg_view.c`. So the delta is not inferred — it is sitting in the source.

```c
// code/cgame/cg_view.cpp:908  — Raven's commented-out copy of the STOCK Q3 camera
/*
#define	FOCUS_DISTANCE	512
static void CG_OffsetThirdPersonView( void ) {
	...
	VectorMA( cg.refdef.vieworg, FOCUS_DISTANCE, forward, focusPoint );
	...
	cg.refdefViewAngles[PITCH] = -180 / M_PI * atan2( focusPoint[2], focusDist );
	cg.refdefViewAngles[YAW] -= cg_thirdPersonAngle.value;
}
*/
```

| | stock Quake III | Raven (JK2/JA) |
|---|---|---|
| default range | **40** (`q3/code/cgame/cg_main.c:260`) | **80** (`code/cgame/cg_main.cpp:415`) |
| damping | **none** — ideal position computed and used every frame | exponential, two independent channels |
| collision | one trace, then a `view[2] += (1.0-frac)*32` fudge and a re-trace | two swept box traces, no fudge |
| aim | camera ray | character ray, crosshair projected (§1.6) |
| pitch model | `atan2` onto a fixed 512u focus point ahead of the player | angle derived from the damped target→eye vector |
| cvar protection | `CVAR_CHEAT` | `CVAR_ARCHIVE` — it is a supported feature, not a debug toy |

Stock Q3's camera is a debug view. Raven's is a product. **That is the whole distance between a
chase camera and a third-person game**, and it is about 250 lines.

---

## 1. THE THIRD-PERSON CAMERA

Implementation: `code/cgame/cg_view.cpp:312-898` (JA-SP), mirrored with small differences at
`codeJK2/cgame/cg_view.cpp` (JO-SP) and `codemp/cgame/cg_view.c:237-820` (JA-MP).

### 1.1 The cvars and their real defaults

`code/cgame/cg_main.cpp:414-425` (JA single-player):

```c
{ &cg_thirdPerson,            "cg_thirdPerson",            "1",   CVAR_SAVEGAME },
{ &cg_thirdPersonRange,       "cg_thirdPersonRange",       "80",  CVAR_ARCHIVE },
{ &cg_thirdPersonMaxRange,    "cg_thirdPersonMaxRange",    "150", 0 },
{ &cg_thirdPersonAngle,       "cg_thirdPersonAngle",       "0",   0 },
{ &cg_thirdPersonPitchOffset, "cg_thirdPersonPitchOffset", "0",   0 },
{ &cg_thirdPersonVertOffset,  "cg_thirdPersonVertOffset",  "16",  0},
{ &cg_thirdPersonCameraDamp,  "cg_thirdPersonCameraDamp",  "0.3", 0},
{ &cg_thirdPersonTargetDamp,  "cg_thirdPersonTargetDamp",  "0.5", 0},
{ &cg_thirdPersonHorzOffset,  "cg_thirdPersonHorzOffset",  "0",   0},
{ &cg_thirdPersonAlpha,       "cg_thirdPersonAlpha",       "1.0", CVAR_ARCHIVE },
{ &cg_thirdPersonAutoAlpha,   "cg_thirdPersonAutoAlpha",   "0",   0 },
```

**The Jedi Outcast table is identical except for one value**: `cg_thirdPerson` defaults to `"0"`
(`codeJK2/cgame/cg_main.cpp:396`). Jedi Outcast is a first-person game that has a third-person
mode; Jedi Academy is a third-person game. Same code, one character different.

⚠ **The camera was finished in 2002 and the sequel barely touched it.** Diffing
`CG_CalcIdealThirdPersonViewTarget` → `CG_OffsetThirdPersonView` between `codeJK2/` and `code/`
gives 330 vs 387 lines, and **every structural line is the same**: the two damped points, both
damp channels, the yaw stiffener, the crouch nudge, the two-trace chain, the collapse guard. All
57 added lines are special cases for creatures that grab you (Rancor, Wampa, Sand Creature) plus
the view-entity path. The only genuine changes to the model are the pitch divisor and the `Q_powf`
option (§1.3). **What Jedi Academy changed was not the camera — it was the default, and forcing
third person for melee (§1.7).**

MP registers the same names via a macro table, `codemp/cgame/cg_xcvar.h:141`:

```c
XCVAR_DEF( cg_thirdPersonRange, "80", NULL, CVAR_ARCHIVE )
```

⚠ **`cg_thirdPersonMaxRange` (150) is dead.** It is declared and registered in all three
codebases and I could find no read of it anywhere in the tree. The camera never clamps to it.

⚠ **The shoulder offset ships at 0.** `cg_thirdPersonHorzOffset` defaults to `0` everywhere, and
in JA-SP the code that applies it is prefixed `// Temp: just move the camera to the side a bit`
(`code/cgame/cg_view.cpp:881`). The over-the-shoulder camera every modern TPS uses is, in this
codebase, an unfinished feature that only vehicles actually drive (§1.7).

### 1.2 The geometry — target first, then eye

Raven's camera is built from **two damped points**, not one. This is the structural idea worth
taking: a look-at point and an eye position are damped *separately, at different rates*, and the
view angle is whatever vector connects them afterwards.

**The target** (`CG_CalcIdealThirdPersonViewTarget`, `code/cgame/cg_view.cpp:349`):

```c
VectorCopy(cg.refdef.vieworg, cameraFocusLoc);
// Add in the new viewheight
cameraFocusLoc[2] += cg.predicted_player_state.viewheight;
...
// Add in a vertical offset from the viewpoint, which puts the actual target above the head,
// regardless of angle.
VectorCopy( cameraFocusLoc, cameraIdealTarget );
cameraIdealTarget[2] += cg_thirdPersonVertOffset.value;      // +16
```

Note the commented-out alternative on the very next line, twice:

```c
//VectorMA(cameraFocusLoc, cg_thirdPersonVertOffset.value, cameraup, cameraIdealTarget);
```

They tried offsetting along the camera's own up vector and rejected it for a **world-Z** offset.
That is deliberate: a world-Z offset means looking up or down does not swing the framing.

**The eye** (`CG_CalcIdealThirdPersonViewLocation`, `code/cgame/cg_view.cpp:436`) is then simply
the target pushed backwards along the camera forward:

```c
VectorMA(cameraIdealTarget, -(cg_thirdPersonRange.value), camerafwd, cameraIdealLoc);
```

So: **range is measured from the look-at point, not from the character.** With the defaults the
eye sits 80u behind a point 16u above the player's eye height.

**Crouch gets a special case** — because, in Raven's own words, the head leaves the bounding box
(`code/cgame/cg_view.cpp:407-425`):

```c
// Now, if the player is crouching, do a little special tweak.  The problem is that the player's
// head is way out of his bbox.
if (cg.predicted_player_state.pm_flags & PMF_DUCKED)
{ // Nudge to focus location up a tad.
	VectorCopy(cameraFocusLoc, nudgepos);
	nudgepos[2]+=CAMERA_CROUCH_NUDGE;                        // 6
	CG_Trace(&trace, cameraFocusLoc, cameramins, cameramaxs, nudgepos, ..., MASK_CAMERACLIP);
	if (trace.fraction < 1.0) VectorCopy(trace.endpos, cameraFocusLoc);
	else                      VectorCopy(nudgepos,     cameraFocusLoc);
}
```

⚠ Even the 6-unit crouch nudge is **traced**, because nudging the focus point up can push it into
a ceiling. Nothing in this camera moves without asking the world first.

**Pitch is clamped to ±89°** at two sites (`cg_view.cpp:493` and `:832`) — never ±90, because at
exactly 90 the forward vector loses its horizontal component and `vectoangles` on the target→eye
difference becomes undefined.

### 1.3 Damping — two channels, different rates, frame-rate corrected

`cg_thirdPersonTargetDamp` **0.5** and `cg_thirdPersonCameraDamp` **0.3**. The look-at point
catches up nearly twice as fast as the eye. Both use the same exponential form
(`code/cgame/cg_view.cpp:559-570`):

```c
#define CAMERA_DAMP_INTERVAL	50           // cg_view.cpp:312

dampfactor = 1.0-cg_thirdPersonTargetDamp.value;   // exponent the amount LEFT, not the amount bled
dtime = (float)(cg.time-cameraLastFrame) * (1.0/cg_timescale.value) * (1.0/(float)CAMERA_DAMP_INTERVAL);

if ( cg_smoothCamera.integer ) ratio = powf ( dampfactor, dtime );
else                           ratio = Q_powf( dampfactor, dtime );

// This value is how much distance is "left" from the ideal.
VectorMA(cameraIdealTarget, -ratio, targetdiff, cameraCurTarget);
```

This is mathematically the same family as WWA's `damp()` in `src/core/util.js:8`
(`lerp(a, b, 1 - exp(-lambda*dt))`) — both are frame-rate-correct exponential decay. Raven's is
normalised so that a damp value is "fraction closed per 50ms" rather than a rate constant.

⚠ **`cg_timescale` is divided out.** Slow-motion does not make the camera lazy.

⚠ **The `Q_powf` branch is broken and this is why `cg_smoothCamera` exists.**
`shared/qcommon/q_math.c:429`:

```c
float Q_powf ( float x, int y )
{
	float r = x;
	for ( y--; y>0; y-- )
		r *= x;
	return r;
}
```

The exponent is an **`int`**. `dtime` at 60fps is `16.67/50 = 0.333`, which truncates to `0`; the
loop then runs zero times and the function returns `x`. So on the non-smooth path the damping
ratio is a **fixed per-frame constant at any frame rate above 25fps** — classic frame-rate-
dependent smoothing. `cg_smoothCamera` defaults to `"1"` (`code/cgame/cg_main.cpp:456`), i.e. the
correct path is on by default and the fast path is a legacy escape hatch.

**The yaw-rate stiffener is the single best idea in this camera** (`code/cgame/cg_view.cpp:843-860`):

```c
deltayaw = fabs(cameraFocusAngles[YAW] - cameraLastYaw);
if (deltayaw > 180.0f) deltayaw = fabs(deltayaw - 360.0f);   // normalize across the seam
cameraStiffFactor = deltayaw / (float)(cg.time-cameraLastFrame);
if      (cameraStiffFactor < 1.0) cameraStiffFactor = 0.0;
else if (cameraStiffFactor > 2.5) cameraStiffFactor = 0.75;
else                              cameraStiffFactor = (cameraStiffFactor-1.0f)*0.5f;   // 1..2 -> 0.0..0.5
```

applied at `:646`:

```c
// Now we also multiply in the stiff factor, so that faster yaw changes are stiffer.
if (cameraStiffFactor > 0.0f)
{	// ...how much of the remaining damp below 1 should be shaved off, i.e. approach 1 as stiffening increases.
	dampfactor += (1.0-dampfactor)*cameraStiffFactor;
}
```

**The faster you turn, the less the camera lags.** A slow look-around gets lazy, cinematic trailing;
a fast flick snaps. This is what stops a damped camera feeling like it is fighting the player, and
it costs one subtraction and a clamp. WWA's `chase()` has no equivalent.

**Pitch also reduces damping** (`code/cgame/cg_view.cpp:634-643`):

```c
// Note that the camera pitch has already been capped off to 89.
pitch = Q_fabs(cameraFocusAngles[PITCH]);
// The higher the pitch, the larger the factor, so as you look up, it damps a lot less.
pitch /= 115.0f;
dampfactor = (1.0-cg_thirdPersonCameraDamp.value)*(pitch*pitch);
dampfactor += cg_thirdPersonCameraDamp.value;
```

At pitch 0 the damp is exactly 0.3; at ±89 it is `0.3 + 0.7*(89/115)² = 0.72`. Looking straight up
or down swings the eye through a large arc for a small angular change, so the lag is removed
there — the same defect WWA's `chase()` handles with `ay = clamp(ay * 0.55, -0.82, 0.82)`.

⚠ **The divisor is a real JO→JA tuning change and it is worth knowing which way it went.** Jedi
Outcast divides by **89.0** (`codeJK2/cgame/cg_view.cpp:608`, `:622`) — the same number the pitch is
clamped to — so at full pitch the term is exactly `1.0`, `dampfactor` reaches `1.0`, and **damping
is switched off completely**. Jedi Academy divides by **115.0**, so at full pitch the factor is
`(89/115)² = 0.599` and the camera is still damped at 0.72. **JA softened a hard cut-off into a
curve that never quite reaches its limit** — the same instinct as never clamping pitch to exactly
90.

⚠ **And the `Q_powf` fast path is a JA regression, not a JO legacy.** Jedi Outcast calls `pow()`
(C double, correct) unconditionally at `codeJK2/cgame/cg_view.cpp:558` and `:650`, with a `double
pitch`. Jedi Academy is the build that added the `cg_smoothCamera` branch and the broken
integer-exponent alternative. The sequel added a cheaper, wronger option and defaulted it off.

**Two cases kill damping outright:**

```c
if ( CG_OnMovingPlat( &cg.snap->ps ) )
{//if moving on a plat, camera is *tight*
	dampfactor=1.0f;
}
```
(`code/cgame/cg_view.cpp:612`, and the same test at `:544` for the target). A damped camera on a
moving platform lags by the platform's velocity every frame and never catches up.

And `CG_ResetThirdPersonViewDamp()` (`:488`) hard-snaps everything, called when
`cameraLastFrame == 0 || cameraLastFrame > cg.time` (`:825`) — first frame, or time going backwards.

### 1.4 Collision — two swept box traces, every frame

```c
#define MASK_CAMERACLIP (MASK_SOLID)          // code/cgame/cg_view.cpp:35   (SP)
#define CAMERA_SIZE	4                         // code/cgame/cg_view.cpp:36
static vec3_t cameramins = { -CAMERA_SIZE, -CAMERA_SIZE, -CAMERA_SIZE };
static vec3_t cameramaxs = {  CAMERA_SIZE,  CAMERA_SIZE,  CAMERA_SIZE };
```

⚠ MP differs: `#define MASK_CAMERACLIP (MASK_SOLID|CONTENTS_PLAYERCLIP)`
(`codemp/cgame/cg_view.c:29`). MP lets level designers paint invisible camera blockers using the
existing playerclip brushes.

The camera is an **8×8×8 box, not a ray**, so it stops with clearance instead of touching the wall
and near-clipping through it. Two traces, in a chain, run every frame:

```c
// 1) first-person eye  ->  damped target      (cg_view.cpp:585)
CG_Trace(&trace, cameraFocusLoc, cameramins, cameramaxs, cameraCurTarget, ..., MASK_CAMERACLIP);
if (trace.fraction < 1.0) VectorCopy(trace.endpos, cameraCurTarget);

// 2) damped target     ->  damped eye         (cg_view.cpp:689)
CG_Trace( &trace, cameraCurTarget, cameramins, cameramaxs, cameraCurLoc, ..., MASK_CAMERACLIP);
if ( trace.fraction < 1.0f ) VectorCopy( trace.endpos, cameraCurLoc );
```

**The order matters and is the whole trick.** The target is validated against the player's actual
eye *first*, and the eye is then traced from the *already-corrected* target. So the camera can
never be pulled to a position whose look-at point is itself inside geometry — which is the failure
that makes naive chase cameras spin when you back into a corner.

⚠ **When the wall is close, the camera simply stops at the trace endpoint. There is no push-out,
no lerp, no "swing around the obstacle".** Raven explicitly removed the stock Q3 fudge —
`view[2] += (1.0 - trace.fraction) * 32;` exists in id's version and not in Raven's. Note also
that because the collision result is written into `cameraCurLoc` (the *damped* value), the next
frame damps *from the corrected position*, so the recovery when you step away from the wall is
smooth for free. The damping and the collision are the same state.

Raven left the cost note in the source, twice (`code/cgame/cg_view.cpp:592` and `:719`):

```c
// Note that previously there was an upper limit to the number of physics traces that are done
// through the world for the sake of camera collision, since it wasn't calced per frame.  Now it
// is calculated every frame. This has the benefit that the camera is a lot smoother now (before
// it lerped between tested points), however two full volume traces each frame is a bit scary to
// think about.
```

They previously amortised the traces across frames and lerped between results; **that read as
worse**, and they took the per-frame cost.

⚠ **A known unfixed bug, in a comment** (`code/cgame/cg_view.cpp:699`): `//FIXME: when the trace
hits movers, it gets very very jaggy... ?` — with a dead attempt at a fix left below it. A camera
resting against a moving door judders, because the trace endpoint moves with the door but the
damping does not know the door is moving.

### 1.5 The final angle, and the degenerate case

```c
// code/cgame/cg_view.cpp:872
VectorSubtract(cameraCurTarget, cameraCurLoc, diff);
float dist = VectorNormalize(diff);
if ( dist < 1.0f )
{//must be hitting something, need some value to calc angles, so use cam forward
	VectorCopy( camerafwd, diff );
}
vectoangles(diff, cg.refdefViewAngles);
```

**The view angle is not the player's view angle.** It is derived from the two damped points, which
is why the camera can trail and still look at the right thing. And the collapse case — target and
eye squeezed to the same point by a wall — is handled explicitly by falling back to the
undamped forward. (WWA's `chase()` has the analogous guard for a target directly overhead.)

The shoulder offset is applied **after** the angles are computed, in view space
(`code/cgame/cg_view.cpp:881-887`):

```c
// Temp: just move the camera to the side a bit
if ( cg_thirdPersonHorzOffset.value != 0.0f )
{
	AnglesToAxis( cg.refdefViewAngles, cg.refdef.viewaxis );
	VectorMA( cameraCurLoc, cg_thirdPersonHorzOffset.value, cg.refdef.viewaxis[1], cameraCurLoc );
}
```

⚠ **This offset is not traced.** The two collision traces ran against the un-offset position; the
sideways shove happens afterwards and can therefore put the camera inside a wall. It ships at 0,
so it never bites in the retail game, and that is almost certainly why it was left as "Temp".

### 1.6 Aiming with an off-centre camera — the important part

This is the problem WWA's chase camera currently has, and Raven solved it explicitly.

**The naive approach — trace from the camera — is in the source, labelled `//old way`.** The
replacement is labelled `//100% accurate`. `code/cgame/cg_draw.cpp:3036-3080`:

```c
if ( cg_dynamicCrosshair.integer )
{//100% accurate
	vec3_t d_f, d_rt, d_up;
	...
	else if ( cg.snap->ps.weapon == WP_NONE || cg.snap->ps.weapon == WP_SABER || ... )
	{
		VectorCopy( g_entities[0].client->renderInfo.eyePoint, start );
		AngleVectors( cg_entities[0].lerpAngles, d_f, d_rt, d_up );
	}
	else
	{
		AngleVectors( cg_entities[0].lerpAngles, d_f, d_rt, d_up );
		CalcMuzzlePoint( &g_entities[0], d_f, d_rt, d_up, start , 0 );
	}
	VectorMA( start, 4096, d_f, end );//was 8192
}
else
{//old way
	VectorCopy( cg.refdef.vieworg, start );
	VectorMA( start, 131072, cg.refdef.viewaxis[0], end );//was 8192
}
gi.trace( &trace, start, vec3_origin, vec3_origin, end, ignoreEnt,
          MASK_OPAQUE|CONTENTS_TERRAIN|CONTENTS_SHOTCLIP|CONTENTS_BODY|CONTENTS_ITEM, G2_NOCOLLIDE, 10 );
...
//draw crosshair at endpoint
CG_DrawCrosshair( trace.endpos );
```

`cg_dynamicCrosshair` defaults to **`"1"`** in both JO and JA (`code/cgame/cg_main.cpp:371`,
`codeJK2/cgame/cg_main.cpp:356`).

**The rule, stated plainly:**

1. The aim ray starts at the **character** — `renderInfo.eyePoint` for saber/melee, or the actual
   per-weapon `CalcMuzzlePoint` for guns — and runs along the **character's** `lerpAngles`.
   The camera's position and the camera's forward are not involved at all.
2. That ray is traced against the world.
3. **The crosshair is drawn at the world-space hit point, projected to screen.**
   `code/cgame/cg_draw.cpp:2739`:

```c
if ( worldPoint && VectorLength( worldPoint ) )
{
	if ( !CG_WorldCoordToScreenCoordFloat( worldPoint, &x, &y ) )
	{//off screen, don't draw it
		cgi_R_SetColor( NULL );
		return;
	}
	x -= 320;//????
	y -= 240;//????
}
else
{
	x = cg_crosshairX.integer;
	y = cg_crosshairY.integer;
}
```

**So the crosshair is not at screen centre. It moves.** It sits wherever the shot will actually
land. This is the inverse of the usual modern solution (trace from the camera, then bend the
character's shot toward that point) and it has one decisive property: **the weapon never lies**.
Nothing is ever bent, so there is no angle at which the projectile visibly leaves the muzzle in a
direction other than the one the character is facing.

⚠ **The per-weapon muzzle is real geometry, not a single point.** `CalcMuzzlePoint`
(`code/game/g_weapon.cpp:449`) is a `switch` over the weapon with hand-authored offsets:

```c
case WP_BRYAR_PISTOL:
case WP_BLASTER_PISTOL:
	muzzlePoint[2] += ent->client->ps.viewheight;   //By eyes
	muzzlePoint[2] -= 16;
	VectorMA( muzzlePoint, 28, forwardVec, muzzlePoint );
	VectorMA( muzzlePoint,  6, vrightVec, muzzlePoint );
	break;
...
case WP_BLASTER:
	muzzlePoint[2] += ent->client->ps.viewheight;
	muzzlePoint[2] -= 1;
	if ( ent->s.number == 0 )
		VectorMA( muzzlePoint, 12, forwardVec, muzzlePoint ); // player, don't set this any lower otherwise
	                                                          // the projectile will impact immediately when
	                                                          // your back is to a wall
	else
		VectorMA( muzzlePoint, 2, forwardVec, muzzlePoint );  // NPC, don't set too far forwardVec otherwise
	                                                          // the projectile can go through doors
```

Because the crosshair is drawn at the traced endpoint of *that exact ray*, the offset muzzle is
self-correcting: a pistol firing 6u to the right of centre still puts its crosshair on what it will
hit. The cost is that the crosshair sits at a different screen position for every weapon.

⚠ **There is a caching hazard here worth noting**: `CalcMuzzlePoint` returns a *cached* muzzle if
one was computed within two frames (`code/game/g_weapon.cpp:457`), so the crosshair trace and the
shot can share a muzzle rather than recomputing — deliberate, and the reason the crosshair matches
the shot exactly rather than approximately.

⚠ **The trace is a ray, not a box** (`vec3_origin` mins/maxs), and starts solid-safe:

```c
if ( trace.startsolid || trace.allsolid )
{
	// trace should not be allowed to pick up anything if it started solid.  I tried actually moving
	// the trace start back, which also worked, but the dynamic cursor drawing caused it to render
	// around the clip of the gun when I pushed the blaster all the way into a wall.  It looked
	// quite horrible...
	trace.entityNum = ENTITYNUM_NONE;
}
```

**Multiplayer has the same problem on the server and solves it differently — badly, and it says
so.** `G_EstimateCamPos` (`codemp/game/g_weapon.c:3967`) is a *server-side re-derivation of the
client's camera*, because for vehicle weapons the shot genuinely has to originate at the camera:

```c
void G_EstimateCamPos( vec3_t viewAngles, vec3_t cameraFocusLoc, float viewheight, float thirdPersonRange,
                       float thirdPersonHorzOffset, float vertOffset, float pitchOffset,
                       int ignoreEntNum, vec3_t camPos )
{
	int   MASK_CAMERACLIP = (MASK_SOLID|CONTENTS_PLAYERCLIP);
	float CAMERA_SIZE = 4;
	...
	//NOTE: on cgame, this uses the thirdpersontargetdamp value, we ignore that here
	VectorCopy( cameraIdealTarget, cameraCurTarget );
	trap->Trace( &trace, cameraFocusLoc, cameramins, cameramaxs, cameraCurTarget, ... );
	...
	//NOTE: on cgame, this uses the thirdpersoncameradamp value, we ignore that here
	VectorCopy( cameraIdealLoc, cameraCurLoc );
	trap->Trace(&trace, cameraCurTarget, cameramins, cameramaxs, cameraCurLoc, ... );
```

⚠ **It duplicates the constants as locals and openly drops both damping channels.** The server's
camera is the *undamped ideal*; the client's is the damped actual. They disagree by exactly the
lag. This is the price of ever making a shot depend on camera position in a networked game, and it
is a strong argument for JKA's own single-player answer: **originate at the character, and move the
crosshair instead.**

### 1.7 When the camera changes — and it changes a lot

**Melee vs ranged is binary, and it is the melee that moves the camera, not the reverse.**

JA-SP (`code/cgame/cg_view.cpp:2090`):

```c
cg.renderingThirdPerson = (qboolean)(
	cg_thirdPerson.integer
	|| (cg.snap->ps.stats[STAT_HEALTH] <= 0)
	|| (cg.snap->ps.eFlags&EF_HELD_BY_SAND_CREATURE)
	|| ((g_entities[0].client&&g_entities[0].client->NPC_class==CLASS_ATST)
	|| (cg.snap->ps.weapon == WP_SABER || cg.snap->ps.weapon == WP_MELEE) ));

if ( cg.zoomMode )
{	// zoomed characters should never do third person stuff??
	cg.renderingThirdPerson = qfalse;
}
```

JA-MP is stricter (`codemp/cgame/cg_view.c:2572-2605`) — third person is forced for saber, melee,
grapple moves, `HANDEXTEND_KNOCKDOWN`, `fallingToDeath`, any vehicle, and any knockdown; and forced
*off* for zoom and for spectators.

⚠ **Jedi Outcast does neither** (`codeJK2/cgame/cg_view.cpp:1901`) — its list is only
`cg_thirdPerson || dead || ATST`. You could fight the entire game with a lightsaber in first
person. Forcing third person for melee is a **Jedi Academy** decision.

**And the influence runs the other way too: the camera changes what the SWING DOES.** `g_saberAutoAim`
defaults to `"1"` (`code/game/g_main.cpp:669`) and picks *which attack animation plays* from the
enemy's position rather than from your input — `PM_AttackForEnemyPos`
(`code/game/bg_panimate.cpp`) takes the dot product against your facing, the distance, and the
height difference:

```cpp
	float dot = DotProduct( enemyDir, faceFwd );
	if ( dot > 0 )
	{//enemy is in front
		...
		if ( (pm->ps->clientNum < MAX_CLIENTS || PM_ControlledByPlayer())
			&& dot > 0.65f
			&& enemyDist <= 64 && pm->gent->enemy->client
			&& (enemyZDiff <= 20 || PM_InKnockDownOnGround( ... ) || PM_CrouchAnim( ... ) ) )
		{//swing down at them
			return LS_A_T2B;
		}
```

⚠ **AND THE ACROBATIC MOVES ONLY EXIST IN THIRD PERSON.** `cg.renderingThirdPerson && !cg.zoomMode`
gates **four** separate move selections in `code/game/bg_panimate.cpp`, and every one of them is a
flip or a spin:

| line | move |
|---|---|
| `:2366` | flip-over attack (`PM_SaberFlipOverAttackMove`) |
| `:2447` | higher-level back spin-attacks (`LS_A_BACK_CR` / `LS_A_BACK`) |
| `:3651` | flip-over attack, second site — comment: `//player in third person, not zoomed in` |
| `:3757` | backflip attack (`PM_SaberBackflipAttackMove`) |

```cpp
			if ( ((pm->ps->clientNum < MAX_CLIENTS||PM_ControlledByPlayer()) && cg.renderingThirdPerson && !cg.zoomMode) )//player in third person, not zoomed in
			{//player in thirdperson, not zoomed in
				//flip-over attack logic
				if ( !noSpecials && PM_CheckFlipOverAttackMove( qfalse ) )
				{//flip over-forward down-attack
					return PM_SaberFlipOverAttackMove();
```

**Switch to first person and you lose moves from your moveset** — not because they would break, but
because a somersault you cannot see is not worth having. The camera is not a presentation layer
here; it is an input to the combat system.

⚠ Note the exact shape of the rule, which is the complement of §1.6: **aim comes from the character
so the camera can never corrupt where a shot goes — but MOVE SELECTION is explicitly allowed to
know what the player can see.** Presentation may decide what is *offered*; it may never decide
where a hit *lands*.

**Force Speed rewrites the camera, and it is the clearest "a power owns the frame" example here.**
Both range and FOV move, with asymmetric ease-in/ease-out. `code/cgame/cg_view.cpp:466`:

```c
if ( cg.renderingThirdPerson && (cg.snap->ps.forcePowersActive&(1<<FP_SPEED)) && player->client->ps.forcePowerDuration[FP_SPEED] )
{
	float timeLeft = player->client->ps.forcePowerDuration[FP_SPEED] - cg.time;
	float length   = FORCE_SPEED_DURATION*forceSpeedValue[player->client->ps.forcePowerLevel[FP_SPEED]];
	float amt      = forceSpeedRangeMod[player->client->ps.forcePowerLevel[FP_SPEED]];
	if ( timeLeft < 500 )              VectorMA(cameraIdealLoc, (timeLeft)/500*amt,        camerafwd, cameraIdealLoc);
	else if ( length - timeLeft < 1000 ) VectorMA(cameraIdealLoc, (length - timeLeft)/1000*amt, camerafwd, cameraIdealLoc);
	else                               VectorMA(cameraIdealLoc, amt,                       camerafwd, cameraIdealLoc);
}
```

`CG_ForceSpeedFOV()` (`code/cgame/cg_view.cpp`, called from `CG_CalcFov` at `:1388`) has the
identical three-branch envelope on FOV. The tables (`code/game/wp_saber.cpp:265-287`):

```c
float forceSpeedValue[NUM_FORCE_POWER_LEVELS]    = { 1.0f, 0.75f, 0.5f, 0.25f };   // time dilation
float forceSpeedRangeMod[NUM_FORCE_POWER_LEVELS] = { 0.0f, 30.0f, 45.0f, 60.0f };  // camera pulls BACK
float forceSpeedFOVMod[NUM_FORCE_POWER_LEVELS]   = { 0.0f, 20.0f, 30.0f, 40.0f };  // and FOV WIDENS
```

At level 3 the camera pulls back **60 units** (75% further than the 80u default) *and* the FOV
widens **40°** off a base of `cg_fov 80`. Ease in over 1000ms, hold, ease out over 500ms — **the
ramp out is twice as fast as the ramp in**, so the power feels like it snaps off.

⚠ **MP dropped this entirely.** `grep FP_SPEED codemp/cgame/cg_view.c` returns nothing; MP's
`CG_CalcIdealThirdPersonViewLocation` (`codemp/cgame/cg_view.c:353`) handles only vehicles and the
Rancor. The single most cinematic camera behaviour in the game is single-player only.

**The animation drives the camera.** This is the pattern I would most want to steal. During a
backstab or a wall-flip the camera pulls back up to **120 units** on a triangle envelope keyed to
the animation's *own* elapsed time (`codeJK2/game/g_active.cpp:1409-1423`):

```c
float animLength  = PM_AnimLength( ent->client->clientInfo.animFileIndex, ent->client->ps.torsoAnim );
float elapsedTime = (float)(animLength-ent->client->ps.legsAnimTimer);
float backDist = 0;
if ( elapsedTime < animLength/2.0f )   backDist = (elapsedTime/animLength)*120.0f;              // starting anim
else                                  backDist = ((animLength-elapsedTime)/animLength)*120.0f; // ending anim
cg.overrides.active |= CG_OVERRIDE_3RD_PERSON_RNG;
cg.overrides.thirdPersonRange = cg_thirdPersonRange.value+backDist;
```

and the same envelope drives a **view dip of −120** during a flip (`codeJK2/game/bg_pangles.cpp:283-296`):

```c
float viewDip = 0;
if ( elapsedTime < animLength/2.0f ) viewDip = (elapsedTime/animLength)*-120.0f;
else                                 viewDip = ((animLength-elapsedTime)/animLength)*-120.0f;
cg.overrides.active |= CG_OVERRIDE_3RD_PERSON_VOF;
cg.overrides.thirdPersonVertOffset = cg_thirdPersonVertOffset.value+viewDip;
```

The envelope is not a timer the camera owns — it is read from the animation's remaining frames, so
it cannot desynchronise from the move, and it works at any animation speed.

**The same mechanism gives one move a full 360° camera orbit.** `G_CamCircleForLegsAnim`
(`code/game/g_active.cpp:2217`) is six lines and orbits the camera all the way around the character
across the length of whatever animation is playing:

```c
float animLength  = PM_AnimLength( ent->client->clientInfo.animFileIndex, ent->client->ps.legsAnim );
float elapsedTime = (float)(animLength-ent->client->ps.legsAnimTimer);
float angle = (elapsedTime/animLength)*360.0f;
cg.overrides.active |= CG_OVERRIDE_3RD_PERSON_ANG;
cg.overrides.thirdPersonAngle = cg_thirdPersonAngle.value+angle;
```

**And Force Drain gets a three-phase camera move that matches its three-phase animation**
(`code/game/g_active.cpp:2841-2862`) — swing out to 90° over the grab-start, *hold* at 90° for the
whole drain, swing back over the release:

```c
float forceDrainAngle = 90.0f;
if ( ...torsoAnim == BOTH_FORCE_DRAIN_GRAB_START )
{//starting drain
	float angle = (elapsedTime/animLength)*forceDrainAngle;
	cg.overrides.thirdPersonAngle = cg_thirdPersonAngle.value+angle;
}
else if ( ...torsoAnim == BOTH_FORCE_DRAIN_GRAB_HOLD )
{//draining
	cg.overrides.thirdPersonAngle = cg_thirdPersonAngle.value+forceDrainAngle;
}
else if ( ...torsoAnim == BOTH_FORCE_DRAIN_GRAB_END )
{//ending drain
	float angle = forceDrainAngle-((elapsedTime/animLength)*forceDrainAngle);
	cg.overrides.thirdPersonAngle = cg_thirdPersonAngle.value+angle;
}
```

⚠ **Every one of these is gated on the mover being the player** (`ent->s.number < MAX_CLIENTS ||
G_ControlledByPlayer(ent)`) — an NPC doing the identical move moves no camera. The camera is part
of the *move's presentation to its owner*, not part of the move.

**The override channel** is a struct of "someone else is driving" values with a flag word
(`code/cgame/cg_local.h:297-302`):

```c
float thirdPersonRange;        //how far to be from them
float thirdPersonAngle;        //what angle to look at them from
float thirdPersonVertOffset;   //how high to be above them
float thirdPersonPitchOffset;  //what offset pitch to apply the the camera view
float thirdPersonCameraDamp;   //how tightly to move the camera pos behind the player
float thirdPersonAlpha;        //how tightly to move the camera pos behind the player   <-- copy-paste comment
```

Every read site is `if (cg.overrides.active & CG_OVERRIDE_3RD_PERSON_xxx) use override; else use cvar;`.
This is exactly WWA's `mapCam` idea, but **per-parameter rather than all-or-nothing** — a script
can take the range and leave the damping alone.

**Vehicles declare their camera as data.** `codemp/game/bg_vehicles.h:276-282`:

```c
qboolean cameraOverride;    //whether or not to use all of the following 3rd person camera override values
float    cameraRange;       //how far back the camera should be - normal is 80
float    cameraVertOffset;  //how high over the vehicle origin the camera should be - normal is 16
float    cameraHorzOffset;  //how far to left/right (negative/positive) of of the vehicle origin - normal is 0
float    cameraPitchOffset; //a modifier on the camera's pitch (up/down angle) to the vehicle - normal is 0
float    cameraAlpha;       //fade out the vehicle to this alpha (0.1-1.0f) if it's in the way of the crosshair
```

parsed from a text file by a keyword→offset table (`codemp/game/bg_vehicleLoad.c:544`):

```c
{"cameraRange", VFOFS(cameraRange), VF_FLOAT},   //how far back the camera should be - normal is 80
```

**A vehicle is a data row that includes its own camera.** Fighters additionally get a whole
separate camera function, `CG_OffsetFighterView` (`codemp/cgame/cg_view.c:1070`), because a
banking spacecraft needs the offsets applied in the *vehicle's* axes, not the view's:

```c
AngleVectors( cg.refdef.viewangles, vehFwd, vehRight, vehUp );
...
VectorMA( cg.refdef.vieworg, horzOffset, vehRight, camOrg );
VectorMA( camOrg,            vertOffset, vehUp,    camOrg );
CG_Trace(&trace, cg.refdef.vieworg, cameramins, cameramaxs, camOrg, cg.snap->ps.clientNum, MASK_CAMERACLIP);
```

⚠ Note that here the offset **is** traced — the thing §1.5 said the on-foot horizontal offset
forgets to do. The vehicle path is the finished version of that idea.

**Player fade-out when the camera is close.** `cg_thirdPersonAlpha` / `cg_thirdPersonAutoAlpha`
(`code/game/g_active.cpp:5323-5350`) ramps the player model's alpha down to 0.5 in 0.025 steps and
back up in 0.1 steps — a slow fade out, a fast fade in. It ships **off** (`cg_thirdPersonAutoAlpha`
default `"0"`), and the transparency-instead-of-cutaway approach is one of the more dated choices
here (§5).

---

## 2. SABER / MELEE COMBAT

### 2.1 There is no style table — and Jedi Outcast has no styles at all

⚠ **`bgSaberStyleData`, `saberStyleData`, `StanceDamage` — none of these exist.** Full-tree greps
return zero. A style's properties are scattered across **five unrelated mechanisms** (below). The
only style-keyed table in the codebase is a name→enum string table for parsing `.sab` files
(`code/game/wp_saberLoad.cpp:338`).

⚠ **Jedi Outcast has no `SS_*` enum whatsoever** (`SS_DUAL|SS_STAFF|SS_MEDIUM` across `codeJK2/`:
zero hits). In JO a "style" is literally a `forcePowerLevels_t` value — `FORCE_LEVEL_1/2/3` =
fast/medium/strong, with 4 = Desann and 5 = Tavion as NPC-only extras
(`codeJK2/game/wp_saber.h:89`). Jedi Academy introduced the named enum
(`codemp/game/bg_public.h:1548`), and **the values collide with the force levels on purpose** —
`SS_FAST == FORCE_LEVEL_1`, `SS_MEDIUM == FORCE_LEVEL_2`, `SS_STRONG == FORCE_LEVEL_3` — so code
switches on them interchangeably.

**The style's "strength" is derived from the ANIMATION CURRENTLY PLAYING, not from the style
setting** (`code/game/bg_panimate.cpp:550`, `PM_PowerLevelForSaberAnim`):

```cpp
	if ( anim >= BOTH_A1_T__B_ && anim <= BOTH_D1_B____ ) { ... return FORCE_LEVEL_1; }
	if ( anim >= BOTH_A2_T__B_ && anim <= BOTH_D2_B____ ) { return FORCE_LEVEL_2; }
	if ( anim >= BOTH_A3_T__B_ && anim <= BOTH_D3_B____ ) { return FORCE_LEVEL_3; }
	if ( anim >= BOTH_A4_T__B_ && anim <= BOTH_D4_B____ ) {//desann
		return FORCE_LEVEL_4; }
	if ( anim >= BOTH_A5_T__B_ && anim <= BOTH_D5_B____ ) {//tavion
		return FORCE_LEVEL_2; }
```

Fast 1 · Medium 2 · Strong 3 · Desann 4 · **Tavion 2 · Dual 2 · Staff 2**. The same function gives
the parry rating (Strong/Desann 3, Tavion/Staff/Dual/Medium 2, Fast 1) — ⚠ **but only in JA
single-player.** JO flattens it to a constant with a FIXME (`codeJK2/game/bg_panimate.cpp:474`:
`return FORCE_LEVEL_1;//FIXME: saberAnimLevel?`), and **MP flattens it too**
(`G_PowerLevelForSaberAnim`, `w_saber.c:3015`). In two of the three builds **your style does not
affect your parry strength at all.**

The five places a style actually matters:

| mechanism | where |
|---|---|
| power level (derived from anim range) | `bg_panimate.cpp:550` |
| **swing-speed tolerance** (MP only) | `w_saber.c:137` |
| transition anim speed ×1.5 / ×0.75 | `bg_panimate.c:2713` |
| movement penalty while attacking (MP only) | `bg_pmove.c:8416` |
| which kata the special fires | `bg_saber.c:3322` |

⚠ **Style only scales TRANSITION animation speed, never the attack animations** — those are
different anim sets (A1_/A2_/A3_) with lengths baked into `animation.cfg`, which is not in the
repo (§6):

```c
		if ( saberAnimLevel == FORCE_LEVEL_1 ) { *animSpeed *= 1.5f; }
		else if ( saberAnimLevel == FORCE_LEVEL_3 ) { *animSpeed *= 0.75f; }
```

⚠ **A fourth dead table**: `saberAnimSpeedMod[] = {0.0f, 0.75f, 1.0f, 2.0f}`
(`code/game/wp_saber.cpp:331`) — its only consumer is a `PM_SaberStartTransAnim` overload that is
**entirely inside a `/* */` block** in JA-SP and whose JO call site is commented out.

**Movement penalty per style, MP only** (`codemp/game/bg_pmove.c:8416`) — attacking while backing
up costs Fast ×0.75, Medium/Dual/Staff ×0.60, **Strong ×0.45**; spinning costs Strong ×0.3, others
×0.5. ⚠ **JA-SP has no style-based movement penalty at all.**

⚠ **Ordinary swings cost ZERO force in all three builds.** Only the specials cost, via three
constants (`codemp/game/bg_saber.c:2053`): `SABER_ALT_ATTACK_POWER 50`, `..._LR 10`, `..._FB 25`.
⚠ In MP the kata's 50 is drained from **`FP_GRIP`** — a different power's pool
(`BG_ForcePowerDrain(pm->ps, FP_GRIP, SABER_ALT_ATTACK_POWER)`), the same slot-squatting seen in §3.

### 2.2 Hit detection — a swept blade sampled as a GRID of short traces

**The mechanism, precisely: per-frame ghoul2 bone matrices give the blade's base and direction;
last frame's blade and this frame's blade bound a swept quad; that quad is sampled as a grid of
short traces — one per 8 units of blade length, per angular sub-step of at most ~33°.** It is not
hitscan, not a capsule sweep, and not one trace.

Blade position comes from the bolt matrix, and the bolt index *is* the blade index
(`codemp/game/w_saber.c:8884`):

```c
	trap->G2API_GetBoltMatrix(self->ghoul2, rSaberNum+1, rBladeNum, &boltMatrix, properAngles, properOrigin, level.time, NULL, self->modelScale);
	BG_GiveMeVectorFromMatrix(&boltMatrix, ORIGIN, self->client->saber[rSaberNum].blade[rBladeNum].muzzlePoint);
	BG_GiveMeVectorFromMatrix(&boltMatrix, NEGATIVE_Y, self->client->saber[rSaberNum].blade[rBladeNum].muzzleDir);
	VectorMA( boltOrigin, ...lengthMax, ...muzzleDir, end );
```

Last frame's is stashed one iteration earlier (`:8836`) and recorded at frame end as
`trail.base` / `trail.tip` with a 100ms staleness guard (`:9068`). `MAX_SABERS 2`, `MAX_BLADES 8`,
default `lengthMax 32`, default `radius SABER_RADIUS_STANDARD 3.0f`.

**The angular sub-stepping** (`codemp/game/w_saber.c:5251`, `:5324`):

```c
#define MAX_SABER_SWING_INC 0.33f
	...
		curDirFrac = DotProduct( md1, md2 );
	//NOTE: if saber spun at least 180 degrees since last damage trace, this is not reliable...!
	if ( fabs(curDirFrac) < 1.0f - MAX_SABER_SWING_INC )
	{//the saber blade spun more than 33 degrees since the last damage trace
		curDirFrac = dirInc = 1.0f/((1.0f - curDirFrac)/MAX_SABER_SWING_INC);
	}
```

**The along-blade stepping** (`:5364`, `stepsize = 8`):

```c
			// Move up the blade in intervals of stepsize
			for ( step = stepsize; step <= ...lengthMax; step += stepsize )
			{
				VectorMA( curBase1, step, curMD1, bladePointOld );
				VectorMA( curBase2, step, curMD2, bladePointNew );
				if ( step+stepsize >= ...lengthMax ) { extrapolate = qfalse; }
				CheckSaberDamage( self, saberNum, bladeNum, bladePointOld, bladePointNew, qfalse, clipmask, extrapolate );
```

Each trace runs from *last frame's point at that blade offset* to *this frame's point at the same
offset* — a grid across the swept quad, not a rasterisation of it. **Trace count per blade per
frame**: 1 base + `ceil((1 − dot) / 0.33)` angular chunks × 4 along-blade. A slow swing = 5 traces;
a 90° swing = 9.

⚠ **JA-SP declares `stepsize = 8` and then increments by 12** (`code/game/wp_saber.cpp:5002`,
`step+=12`), so a 32u blade gets traces at 8 and 20 only — **2 mid-blade traces** plus separate
base and tip traces that the MP port commented out.

**The blade is extrapolated 16 units forward**, and Raven says why (`code/game/wp_saber.cpp:2458`):

```cpp
	if ( extrapolate )
	{
		//NOTE: since we can no longer use the predicted point, extrapolate the trace some.
		//		this may allow saber hits that aren't actually hits, but it doesn't look too bad
		VectorMA( end2, SABER_EXTRAPOLATE_DIST, diff, end2 );
	}
```

`SABER_EXTRAPOLATE_DIST 16.0f`. The last segment before the tip disables it.

⚠ **The trace box depends on WHO is swinging, in single-player** (`code/game/wp_saber.cpp:2487`):
the player, their allies, Shadowtroopers, Tavion and Desann get a **±2 box**; ordinary Reborn get a
**zero-width line**. In MP the box is `±(saberBoxSize*3)` normally but `±2` under
`d_saberSPStyleDamage`, and **point traces when `weaponTime <= 0`** — an idle blade is a line, a
swinging blade is a box.

Any trace that hits a client is re-run against the ghoul2 mesh per-polygon
(`G_G2TraceCollide`, `w_saber.c:2315` → `trap->G2API_CollisionDetect`).

⚠ **Saber-vs-saber is a TRIANGLE-TRIANGLE intersection, not a trace** (`w_saber.c:2943`) — each
swept quad becomes two triangles, four `tri_tri_intersect` calls per blade pair:

```c
	if ( tri_tri_intersect( saberBase1, saberTip1, saberBaseNext1, saberBase2, saberTip2, saberBaseNext2 ) ) return qtrue;
	if ( tri_tri_intersect( saberBase1, saberTip1, saberBaseNext1, saberBase2, saberTip2, saberTipNext2  ) ) return qtrue;
	if ( tri_tri_intersect( saberBase1, saberTip1, saberTipNext1,  saberBase2, saberTip2, saberBaseNext2 ) ) return qtrue;
	if ( tri_tri_intersect( saberBase1, saberTip1, saberTipNext1,  saberBase2, saberTip2, saberTipNext2  ) ) return qtrue;
```

⚠ **Two MP paths exist and the legacy one is still in the file.** `d_saberSPStyleDamage` defaults
`"1"` (`codemp/game/g_xcvar.h:60`) so **the swept SP-style path is what runs**; the
`d_saberInterpolate` branch (`w_saber.c:8907-9050`) is the 1.02-era system that re-traces up to 4
times with growing `trDif` (8, 16, 24, 32) and fabricates a midpoint blade.

### 2.3 THE SWING SPEED IS MEASURED — MP's best idea

`G_SaberAttackPower` (`codemp/game/w_saber.c:137`) has **no SP equivalent** and is the single most
interesting MP-only mechanic. Base power is `style*2 + 1` — then **+1 for every `toleranceAmt`
units the blade base physically travelled since the last frame**:

```c
			switch (ent->client->ps.fd.saberAnimLevel)
			{
			case SS_STRONG: toleranceAmt = 8;  break;
			case SS_MEDIUM: toleranceAmt = 16; break;
			case SS_FAST:   toleranceAmt = 24; break;
			default:        toleranceAmt = 16; break;   //dual, staff, etc.
			}
			VectorSubtract(ent->client->lastSaberBase_Always, ent->client->olderSaberBase, vSub);
			swingDist = (int)VectorLength(vSub);
			while (swingDist > 0)
			{ //I would like to do something more clever. But I suppose this works, at least for now.
				baseLevel++;
				swingDist -= toleranceAmt;
			}
```

Base attacking power: Fast 3, Medium 5, Strong 7. **Strong gains a point every 8 units of hand
travel; Fast needs 24** — and the comment says exactly why: *"We want different tolerance levels
... Otherwise fast would have more advantage than it should since the animations are all much
faster."* Clamped 1–16; ×0.3 with a broken arm; ×2 for the lone Power Duel fighter; ×3 for the
attacker in Siege.

**This is momentum melee, measured from the weapon's actual motion rather than from the fighter's
velocity** — WWA's `momentumMult` reads `|vel|` of the *body*; this reads how far the *hand* moved.

### 2.4 Blocking — geometric, not a dice roll

⚠ **There is no block-chance roll.** `WP_SaberBlockCheck`, `PM_SaberBlockForQuad`,
`WP_SaberBlockBolt`, `saberDeflect` — all zero hits tree-wide. The base decision is geometry.

Each move declares a block type (`codemp/qcommon/q_shared.h:326`):

```c
typedef enum {
	BLK_NO,
	BLK_TIGHT,		// Block only attacks and shots around the saber itself, a bbox of around 12x12x12
	BLK_WIDE		// Block all attacks in an area around the player in a rough arc of 180 degrees
} saberBlockType_t;
```

⚠ **In SP, `BLK_WIDE` literally inflates the saber ENTITY to the player's bounding box**
(`code/game/wp_saber.cpp:7984`) — `VectorAdd( self->mins, sabermins, saberent->mins )` with
`{-8,-8,-8}/{8,8,8}` — and `g_saberAutoBlocking` defaults **on**
(`code/game/g_main.cpp:662`). Blade-distance gate: `SABER_COLLISION_DIST 6`, plus
`6 + g_spskill*4` → **12 / 16 / 20 units on skill 0 / 1 / 2**.

**MP's `blockFactor` is a view-cone dot threshold, not a percentage** (`w_saber.c:9416`):

```c
	if (...forcePowerLevel[FP_SABER_DEFENSE] == FORCE_LEVEL_3) { blockFactor = 0.3f; }
	else if (... == FORCE_LEVEL_2) { blockFactor = 0.6f; }
	else if (... == FORCE_LEVEL_1) { blockFactor = 0.9f; }
	else { //for now we just don't get to autoblock with no def
		return 0; }
	if (thrownSaber) { blockFactor -= 0.25f; }
	if (attackStr)   { blockFactor -= 0.25f; }   //blocking a saber, not a projectile.
	if (!InFront( point, ...ps.origin, ...ps.viewangles, blockFactor )) return 0;
```

Against a saber: level 3 blocks within ≈±87°, level 2 ≈±69.5°, level 1 ≈±49.5°, **level 0 cannot
auto-block at all**. ⚠ **Defence buys you ARC, not probability** — and the old 1.02 percentage
system survives commented out directly above with Raven's verdict on it:
*"(as you can see, it was STUPID.. for the most part)"*.

**The block QUADRANT is a pure facing + height test** (`code/game/wp_saber.cpp:7288`) — `rightdot`
against the view's right vector, `zdiff` against the eye point; bands at `zdiff > -5` (upper),
`> -22` (middle), else low; side split at `|rightdot| > 0.3` / `0.1`.

**Parry recovery is the real defence stat** (`code/game/wp_saber.cpp:323`):

```cpp
int parryDebounce[NUM_FORCE_POWER_LEVELS] = { 500, 300, 150, 50 };
```

⚠ **JO's level-0 entry is `1000000`** (`codeJK2/game/wp_saber.cpp:248`) — a sentinel meaning "you
literally cannot parry". JA turned it into a real 500ms. That one number is the difference between
a locked door and a bad option.

**Breaking a parry is where the dice finally appear** (`code/game/wp_saber.cpp:5344`):

```cpp
						else if ( !activeDefense
							|| (entPowerLevel > FORCE_LEVEL_2 && hitOwnerPowerLevel < entPowerLevel)
							|| (!deflected && Q_irand( 0, Q_max(0, PM_PowerLevelForSaberAnim( &ent->client->ps, saberNum ) - hitOwner->client->ps.forcePowerLevel[FP_SABER_DEFENSE]) ) > 0 ) )
						{//broke their parry altogether
```

Medium (power 2) vs defence 0 → `Q_irand(0,2) > 0` = **2/3 break**; vs defence 1 → **1/2**; vs
defence 2+ → never by this clause. **A successful deflection suppresses the test entirely.**

MP replaces this with an explicit advantage scalar (`w_saber.c:5030`):

```c
	attackAdv = (attackStr+attackBonus+...FP_SABER_OFFENSE) - (defendStr+...FP_SABER_OFFENSE);
	if ( attackAdv > 1 ) { ... BLOCKED_BOUNCE_MOVE; }        //I won, he should knockaway
	else if ( attackAdv > 0 ) { ... BLOCKED_ATK_BOUNCE; }    //I won, he should bounce
	else if ( attackAdv < 1 ) { ... BLOCKED_BOUNCE_MOVE; }   //I lost, I get knocked away
	else if ( attackAdv < 0 ) { ... BLOCKED_ATK_BOUNCE; }    //I lost, I bounce off
```

⚠ **The last two branches are dead code** — `attackAdv < 1` already swallows `< 0` and the `else`.

**Blaster deflection is a completely separate path, and SP aims it at a HEAD.**
`code/game/g_missile.cpp:163`:

```cpp
		if ( enemy )
		{
			vec3_t	bullseye;
			CalcEntitySpot( enemy, SPOT_HEAD, bullseye );
			bullseye[0] += Q_irand( -4, 4 );
			bullseye[2] += Q_irand( -16, 4 );
			VectorSubtract( bullseye, missile->currentOrigin, bounce_dir );
```

at 100% for defence 3, 25% for defence 2, 0% for defence 1 — toward the current enemy 75% of the
time, otherwise `Jedi_FindEnemyInCone`. Reflect chance itself: **JA-SP level 3 = 10/11 ≈ 91%, level
2 = 75%, level 1 = 50%**, plus a Force Speed bonus (`g_missile.cpp:822`). ⚠ **JO has both levels 2
and 3 at a flat 75% and no Speed bonus.**

⚠ **MP has no head-targeting at all** — it aims at the shooter's **origin** and, in
`G_DeflectMissile`, adds **±1.0 per component** of spray (`codemp/game/g_missile.c:113`), where
the `DotProduct` scale is a no-op because `forward` and `missile_dir` are the same vector. Level 1
in MP does not deflect at all — the bolt just dies.

⚠ **It is never a mirror about a blade normal in any build.**

### 2.5 Combos — an 8-quadrant graph, and a chain rule that reads geometry

The move table (`codemp/game/bg_public.h:1486`):

```c
typedef struct saberMoveData_s {
	char *name;
	int animToUse;
	int	startQuad;
	int	endQuad;
	unsigned animSetFlags;
	int blendTime;
	int blocking;
	saberMoveName_t chain_idle;			// What move to call if the attack button is not pressed at the end of this anim
	saberMoveName_t chain_attack;		// What move to call if the attack button (and nothing else) is pressed
	qboolean trailLength;
} saberMoveData_t;
```

**118 rows in JO · 162 in JA-SP · 162 in JA-MP.** Example rows (`bg_saber.c:148`):

```c
	// name			anim(do all styles?)startQ	endQ	setanimflag		blend,	blocking	chain_idle		chain_attack	trailLen
	{"Ready",		BOTH_STAND2,		Q_R,	Q_R,	AFLAG_IDLE,		350,	BLK_WIDE,	LS_READY,		LS_S_R2L,		0	},
	{"TL2BR Att",	BOTH_A1_TL_BR,		Q_TL,	Q_BR,	AFLAG_ACTIVE,	100,	BLK_TIGHT,	LS_R_TL2BR,		LS_R_TL2BR,		200	},
	{"BR2R Trans",	BOTH_T1_BR__R,		Q_BR,	Q_R,	AFLAG_ACTIVE,	100,	BLK_NO,		LS_R_L2R,		LS_A_R2L,		150	},
	{"Bounce BR",	BOTH_B1_BR___,		Q_BR,	Q_BR,	AFLAG_ACTIVE,	100,	BLK_NO,		LS_R_TL2BR,		LS_T1_BR_TR,	150	},
```

⚠ **Every attack's `chain_idle` and `chain_attack` both point at the RETURN**, so an uninterrupted
swing recovers by itself; chaining is not expressed in those fields at all. ⚠ **Every transition
and every bounce is `BLK_NO`** — *moving between guards is exactly when you cannot block.* That is
the whole risk model of saber combat in one column.

**Eight quadrants** (`Q_BR, Q_R, Q_TR, Q_T, Q_TL, Q_L, Q_BL, Q_B`) with two 8×8 tables:
`transitionMove[8][8]` (`bg_saber.c:383`) picks the joining animation, and
`saberMoveTransitionAngle[8][8]` (`:722`) gives the **angle between two moves** —

```c
//		Q_BR,Q_BR,	Q_BR,Q_R,	Q_BR,Q_TR,	Q_BR,Q_T,	Q_BR,Q_TL,	Q_BR,Q_L,	Q_BR,Q_BL,	Q_BR,Q_B,
	{	0,			45,			90,			135,		180,		215,		270,		45			},
```

**`PM_SaberKataDone` is the whole commitment system** (`bg_saber.c:747`), and for Strong stance it
reads that angle:

```c
		else if ( pm->ps->saberAttackChainCount > 0 )
		{
			int chainAngle = PM_SaberAttackChainAngle( curmove, newmove );
			if ( chainAngle < 135 || chainAngle > 215 )
			{//if trying to chain to a move that doesn't continue the momentum
				return qtrue;
			}
			else if ( chainAngle == 180 )
			{//continues the momentum perfectly, allow it to chain 66% of the time
				if ( pm->ps->saberAttackChainCount > 1 ) { return qtrue; }
			}
			else
			{//would continue the movement somewhat, 50% chance of continuing
				if ( pm->ps->saberAttackChainCount > 2 ) { return qtrue; }
			}
		}
```

**A Strong chain that does not roughly REVERSE the blade's direction is refused outright.** You are
not chaining moves, you are conserving angular momentum — and a perfect reversal (180°) is allowed
*fewer* repeats than a partial one, because it is the strongest option.

Fast/Medium get a simpler limiter (`chainTolerance` 5 for Fast, 3 otherwise; Medium also
`> PM_irand_timesync(2,5)`). ⚠ **JO has no fast-stance limiter at all** — fast chains indefinitely
(`codeJK2/game/bg_panimate.cpp:1044`); the tolerance block is a JA addition. Desann, Tavion, Dual
and Staff chain infinitely by explicit early-out, two of them marked `//TEMP: for now`.

JA-SP layers Force Rage on top: raged = infinite chaining, rage-recovery = **one swing only**
(`code/game/bg_panimate.cpp:1944`), plus a per-`.sab` `maxChain` (`-1` = infinite, `0` = default).

**The commitment rule itself is one line** (`bg_saber.c:3127`, and again at `:926` and `:3147`):

```c
					pm->ps->weaponTime = pm->ps->torsoTimer;
```

**You cannot act until the current animation finishes. There is no cancel window and no recovery
frames as a separate concept** — recovery *is* the remainder of the animation. The bounce move
after a blocked swing is chosen from the attack's **startQuad**
(`PM_SaberBounceForAttack`, `bg_panimate.cpp:1791`); a *broken* parry goes to the `LS_V1_*` set
instead (`BG_BrokenParryForAttack`, `bg_panimate.c:711`).

### 2.6 Damage scales with how far the blade travelled

**SP** (`code/game/wp_saber.cpp:4750`): `baseDamage = 2.5f * (float)entPowerLevel` — **Fast 2.5 ·
Medium 5.0 · Strong 7.5 · Desann 10.0** — then scaled by blade radius, +5/level if raged, ×0.5 if
recovering, and finally:

```cpp
				//multiply the damage by the total distance of the swipe
				VectorSubtract( end2, start, dir );
				float len = VectorNormalize( dir );
				...
					if ( len > 1 ) { dmg *= len; }
```

with `trFrac = (1.0f - tr.fraction)`, accumulated per victim (max `MAX_SABER_VICTIMS 16`).

**Effective SP formula: `2.5 × powerLevel × traceLength × (1 − tr.fraction)`, summed over every
trace that frame.** ⚠ **A blade that is barely moving does almost nothing regardless of style** —
and idle/transition contact is a deliberate `baseDamage = 0.1f` with the comment *"I have to do
*some* damage in transitions or else you feel like a total gimp"*.

⚠ **Against a non-saber-user SP damage is clamped to [25, 100]**, so all that arithmetic collapses
for ordinary enemies; against a saber user the cap is `33 × baseDamage` with hit-location scaling
(`damageModifier[]`, `g_combat.cpp:5284`: head **2.0**, arm 0.5, hand/foot 0.25, leg 0.75).

**MP path A** (the default) is the same shape with different constants
(`w_saber.c:4088`): `fDmg = 2.5f * attackStr`, **doubled outside duel/siege**
(*"in faster-paced games, sabers do more damage"*), then
`dmg = ceil( fDmg*traceLength*(1.0f-tr.fraction)*0.1f*0.33f )`.

**MP path B** (`d_saberSPStyleDamage 0`, the 1.02-era system) is flat per-style peaks instead:
**Fast 35 · Medium 60 · Strong ramps 2→120 · Dual/Staff ramp 2→70 · Dual kata 90 · Strong DFA ramps
2→180**, where the ramp is a function of position *within the attack animation*
(`G_GetAttackDamage`, `w_saber.c:2231`) and explicitly corrects for the per-style animation speed
factor first.

Idle contact: `SABER_NONATTACK_DAMAGE 1`, debounced by `g_saberDmgDelay_Idle` **350ms**, while
attack wounds have **no debounce** (`g_saberDmgDelay_Wound "0"`).

### 2.7 Knockback

**MP is stock Quake III with one branch spliced in and no numbers changed.**
`codemp/game/g_combat.c:4635` against `q3/code/game/g_combat.c:897`: `mass = 200`, the 200 clamp,
`g_knockback` default 1000, and the `t = knockback * 2; clamp(50, 200)` pm_time block are all
byte-identical id code. Raven added only the `MOD_SABER` scale branch and an extra condition on the
pm_time gate. ⚠ **There is no vertical component — the impulse is a pure `VectorScale` of the
normalized direction, exactly like Q3.**

**SP extracted the block into `G_ApplyKnockback` and then rewrote it**
(`code/game/g_combat.cpp:5154`):

```cpp
	//--- TEMP TEST
	if ( newDir[2] <= 0.0f )
	{
		newDir[2] += (( 0.0f - newDir[2] ) * 1.2f );
	}
	knockback *= 2.0f;
	if ( knockback > 120 ) { knockback = 120; }
	//--- TEMP TEST
	...
	if ( g_gravity->value > 0 )
	{
		VectorScale( newDir, g_knockback->value * (float)knockback / mass * 0.8, kvel );
		kvel[2] = newDir[2] * ( g_knockback->value * (float)knockback ) / ( mass * 1.5 ) + 20;
	}
```

Four real changes: the ceiling is **120, not 200** (so anything ≥60 damage saturates), a **downward
hit is reflected upward** (`+0.2 × |z|`), horizontal is ×0.8, and there is a **vertical term that
does not exist in Q3 at all** (`+20`). `mass` also reads `physicsBounce` when set.

⚠ **MP sabers deliver ZERO knockback by default** — `g_saberDmgVelocityScale` defaults `"0"`
(`codemp/game/g_xcvar.h:142`) and the per-saber `knockbackScale` also defaults to 0.
⚠ **JO's saber does none at all, hard-coded** (`codeJK2/game/wp_saber.cpp:886`):

```cpp
						dFlags |= DAMAGE_NO_KNOCKBACK;//okay, let's try no knockback whatsoever...
```

JA-SP sets the same flag and then *un-sets* it if the `.sab` declares a `knockbackScale` — the
data-driven escape hatch again.

⚠ **The two SP helpers disagree with each other**: `G_Throw` uses `* 1.5` on the vertical while
`G_ApplyKnockback` uses `/ (mass * 1.5) + 20` — a factor of ~2.25 plus a constant apart, in the
same file family. And `G_Throw`'s `push` is never clamped, so `G_Throw(..., 250)` produces roughly
twice the horizontal impulse any damage hit can.

---

## 3. FORCE POWERS

**Read this section for the structure, not the numbers. The structure is a warning, not a model.**

### 3.1 The verdict first

**Raven expresses "a power" as: an enum member, plus a row in ~15 flat numeric arrays, plus one
hand-written C function, plus a `case` in each of four-to-eight separate `switch (forcePower)`
statements scattered across client, server, shared movement code, the netcode delta table, the
scripting bridge and the UI.**

There is no power struct. No `forcePowerDef_t`. Nothing in the codebase ever holds "a force power"
as a value you can pass around, iterate or author in a file. The tabular data is exclusively
**scalars indexed by `[power]` or `[level]`**, and every one of those tables is read from inside
hand-written per-power C.

The codebase says so about itself. `code/game/wp_saber.cpp:6669`:

```cpp
	switch ( self->client->ps.forcePowerLevel[FP_SABERTHROW] )
	{//FIXME: make a table?
	default:
	case FORCE_LEVEL_1:
		saber->s.apos.trDelta[1] = 600;
```

…and seventeen lines later in the same function the sibling value *is* a table
(`wp_saber.cpp:6686`). That is the architecture in miniature: **numbers migrated into arrays
opportunistically; behaviour never did.**

Volume: `codemp/game/w_force.c` is **5,618 lines with 80 `case FP_` labels**;
`code/game/wp_saber.cpp` is 14,452 lines with 67. The data is maybe **8% of the system by volume
and 0% of its behaviour.**

⚠ **Three of the tables are dead** — defined, externed, and read by nothing:
- `forceSpeedLevels[4]` (`codemp/game/bg_pmove.c:81`) — so **Force Speed's multiplier does not
  scale with level in MP at all**; `bg_pmove.c:8388` is a flat `ps->speed *= 1.7f;`. Level buys
  duration only.
- `forcePushPullRadius[4]` (`codemp/game/w_force.c:2904`) — the live value is a local literal
  `int radius = 1024;` and the table's own comment (`//rwwFIXMEFIXME: ... Currently it's only being
  used by jedi AI`) is wrong; nothing reads it.
- `forcePowerMinRank[4][18]` (`codemp/game/w_force.c:62`) — 87 lines of rank gating, one grep hit.

⚠ **`forcePowersKnown` / `forcePowersActive` are plain `int` bitfields**
(`codemp/qcommon/q_shared.h:968`, transmitted as `{ PSF(fd.forcePowersKnown), 32 }` in
`msg.cpp:1356`). **The hard ceiling on force powers in this engine is 32.**

⚠ **The generic per-power state arrays are so undersupplied that powers squat in each other's
slots** (`codemp/game/w_force.c:4208`):

```c
		if (self->client->ps.fd.forcePowerDebounce[FP_PULL] < level.time)
		{ //This is sort of not ideal. Using the debounce value reserved for pull for this because pull doesn't need it.
```

`forcedata_t` carries four generic arrays and then **eleven bespoke named scalars** —
`forceGripEntityNum`, `forceDrainEntNum`, `forceRageRecoveryTime`, `forceMindtrickTargetIndex`
1 through 4, and so on. Every one is a power that outgrew the generic model.

**Cost to add one new power, counted rather than estimated: 15–20 files, ~10 mandatory, and 100%
of the behaviour is new C.** New enum member (which renumbers everything after it and breaks every
saved config string), a second parallel `GENCMD_FORCE_*` enum, four table rows, netfield entries,
a `case` in `IN_UseGivenForce`, in the GENCMD switch, in `WP_ForcePowerStart`, `...Run`, `...Stop`,
`WP_DoSpecificPower`, the allow-lists in `ForcePowerUsableOn` / `WP_ForcePowerUsable` /
`WP_AbsorbConversion`, the buy menu, the HUD, and the bot's hand-written if-chain.

**WWA's `abilities.js` is already structurally ahead of this**, and that is the finding. `TYPES` is
a registry of behaviour functions keyed by type name, with the numbers living on the character's
`def` row — so a new *character* is data, and only a genuinely new *kind* of power is code. Jedi
Academy has no such split: every power is a kind. §7 says what to take anyway.

### 3.2 The two cost tables

**(a) Force-point cost per use.** `codemp/game/bg_pmove.c:89-175`,
`forcePowerNeeded[level][power]`; the level-0 row is all `999`. Level 1 excerpt:

```c
		65,//FP_HEAL,//instant //was 25, but that was way too little
		10,//FP_LEVITATION,//hold/duration
		50,//FP_SPEED,//duration
		20,//FP_PUSH,//hold/duration
		20,//FP_PULL,//hold/duration
		20,//FP_TELEPATHY,//instant
		30,//FP_GRIP,//hold/duration
		1,//FP_LIGHTNING,//hold/duration
```

Heal falls 65 → 60 → 50 with level; **Grip is the only power that gets more expensive at max rank**
(30 → 30 → 60). ⚠ The SP table has **no level axis at all** (`code/game/wp_saber.cpp:195`), and JO's
is byte-identical to JA's first 11 rows including the `- FIXME: 30?` comment.

**(b) Character-build points, MP only.** `codemp/game/bg_misc.c:177`,
`bgForcePowerCost[power][level]` — the point-buy currency:

```c
	{	0,	2,	4,	6	},	// Heal			// FP_HEAL
	{	0,	0,	2,	6	},	// Jump			//FP_LEVITATION
	{	0,	1,	3,	6	},	// Push			//FP_PUSH
	{	0,	2,	5,	8	},	// Lightning	//FP_LIGHTNING
	{	0,	4,	6,	8	},	// Dark Rage	//FP_RAGE
```

against a mastery budget of `{0, 5, 10, 20, 30, 50, 75, 100}` (`bg_misc.c:165`).

**This is the one genuinely data-driven part of the system, and it is worth noting how cheap it
is**: a player's entire loadout is **a string of ASCII digits, one character per power**, parsed at
`bg_misc.c:479` and costed at `:527` (`usedPoints += bgForcePowerCost[i][countDown];`).

**Regeneration** is 1 point per `g_forceRegenTime` (default `"200"`ms = 5/sec,
`codemp/game/g_xcvar.h:103`), gated on using nothing at all:

```c
	if ( (!self->client->ps.fd.forcePowersActive || self->client->ps.fd.forcePowersActive == (1 << FP_DRAIN)) &&
			!self->client->ps.saberInFlight && ... )
```

⚠ **The clearest single JO→JA improvement is here.** The function bodies are byte-identical; the
*callers* are not. JO hardcodes the interval (`codeJK2/game/wp_saber.cpp:8394`,
`level.time + 100`); JA reads it per-entity from the NPC file
(`code/game/wp_saber.cpp:14372`, `ps.forcePowerRegenRate` / `forcePowerRegenAmount`, authored via
`forceRegenRate` / `forceRegenAmount` keys that do not exist in JO). Same code, made data.

`FORCE_POWER_MAX 100` is `#define`d **three separate times** in three headers.

### 3.3 Cost is charged three different ways, all hand-coded

**Once at activation** — the only generic drain call, with two hard-coded exceptions by power id
(`codemp/game/w_force.c:1077`):

```c
	else if ((int)forcePower != FP_GRIP && (int)forcePower != FP_DRAIN)
	{ //grip and drain drain as damage is done
		BG_ForcePowerDrain( &self->client->ps, forcePower, overrideAmt );
	}
```

**Per tick while held**, each with its own hand-written interval inside `WP_ForcePowerRun`:

| Power | Rate | Site |
|---|---|---|
| Lightning | table value (1) / **50ms** | `w_force.c:4314` |
| Drain | **5** / 50ms | `w_force.c:2166` — `//used to be 1, but this did, too, anger the God of Balance.` |
| Grip | **1** / 100ms | `w_force.c:4208` (in Pull's debounce slot) |
| Protect | 1 / 300ms | `w_force.c:4341` |
| Absorb | 1 / 600ms | `w_force.c:4353` |
| Rage | **2 HEALTH** / 150–450ms by level | `w_force.c:4234` |

**Proportional to effect** — Force Jump, special-cased inside the drain function itself
(`codemp/game/bg_saber.c:76`), a six-rung staircase on vertical velocity divided by jump level:

```c
	if (forcePower == FP_LEVITATION)
	{ //special case
		if (ps->velocity[2] > 250)      { jumpDrain = 20; }
		else if (ps->velocity[2] > 200) { jumpDrain = 16; }
		...
			jumpDrain /= ps->fd.forcePowerLevel[FP_LEVITATION];
```

**A jump you barely need costs almost nothing; a maximum leap costs 20.** That is the best cost
idea in the system — *pay for the effect you actually got*, not for pressing the button.

### 3.4 Per-power shape — trace, volume, or cone

The pattern worth extracting: **level does not scale a number, it changes the QUERY**.

| Power | L1 | L2 | L3 |
|---|---|---|---|
| **Push/Pull** | trace, 512u, one target | box + **60°** arc | box + **180°** arc, + knockdown |
| **Mind trick** | trace, 256u, one target | box 512u + **180°** | box **1024u + 360°** (no facing at all) |
| **Lightning** | traceline 2048u | traceline | **radius arc** 300u, dot > 0.5, LOS-checked |
| **Drain** | traceline | traceline | radius arc 512u |
| **Grip** | no lift, 5s cap | lift, 20 dmg squeeze | drag to 128u in front, 40 dmg squeeze |

Push/pull knockback (`w_force.c:3341`, `:3390`, `:3536`) — base is linear in level, the **victim's
own push/pull level subtracts**, then distance falls off:

```c
	pushPower = 256*modPowerLevel;                       // 256 / 512 / 768
	...
	int powerDif = (modPowerLevel - otherPushPower);
	if (powerDif >= 3)      { pushPowerMod -= pushPowerMod*0.2; }
	else if (powerDif == 2) { pushPowerMod -= pushPowerMod*0.4; }
	else if (powerDif == 1) { pushPowerMod -= pushPowerMod*0.8; }
	...
	pushPowerMod -= (dirLen*0.7);
	if (pushPowerMod < 16) { pushPowerMod = 16; }
```

⚠ **Push and Pull are one function with a `qboolean pull`** (`ForceThrow`, `w_force.c:2914`); the
only difference is the direction subtraction (`:3441` vs `:3475`) plus a pull-only disarm roll
whose chance *is* the level (3/7/10 in 10). Two powers, one implementation, one flag — the same
economy WWA gets from a `def` row.

⚠ **Force Jump is the one power that is table-driven end to end** (`bg_pmove.c:177`, and the tables
are **identical across JO, JA-SP and JA-MP**):

```c
float forceJumpHeight[NUM_FORCE_POWER_LEVELS]   = { 32, 96, 192, 384 };
float forceJumpStrength[NUM_FORCE_POWER_LEVELS] = { JUMP_VELOCITY, 420, 590, 840 };   // JUMP_VELOCITY 225
```

…and the same table also reduces fall damage (`bg_pmove.c:3924`). One table, three consequences.

⚠ **Absorb is the only power that reads another power's cost**, via a hard-coded allow-list called
*by the attacking power's own code* (`w_force.c:791`):

```c
	if (atPower != FP_LIGHTNING && atPower != FP_DRAIN && atPower != FP_GRIP &&
		atPower != FP_PUSH && atPower != FP_PULL)
	{ //Only these powers can be absorbed
		return -1;
	}
	//let the attacker absorb an amount of force used in this attack based on his level of absorb
	addTot = (atForceSpent/3)*attacked->client->ps.fd.forcePowerLevel[FP_ABSORB];
```

**Adding a new dark power that Absorb should counter means editing this list.** That is the exact
failure mode the WWA damage-type work exists to prevent (a resistance must be derived, not listed).

⚠ **Rage is the only debuff-after-buff**, and it is hand-wired in three separate places: costs
2 **health** per tick, then a 10-second `forceRageRecoveryTime` during which
`ps->speed *= 0.75f` (`bg_pmove.c:8396`) and regen runs at half rate.

⚠ **Heal's over-time implementation is dead code in MP.** `ForceHeal` never calls
`WP_ForcePowerStart`, so the bit is never set and the `WP_ForcePowerRun` case at `w_force.c:4141`
never executes; MP heal is three instant branches (`+25 / +10 / +5`) with the comment
`//This was 50, but that angered the Balance God.` The over-time version is live in SP only.

### 3.5 Dark vs light gates ACCESS, not cost

`codemp/game/bg_misc.c:222`, `forcePowerDarkLight[]` — `FORCE_LIGHTSIDE` on heal/telepathy/protect/
absorb/team-heal, `FORCE_DARKSIDE` on grip/lightning/rage/drain/team-force, `0` (both) on
jump/speed/push/pull/sight and all three saber skills.

Checked exactly **once**, at loadout validation (`bg_misc.c:495`):

```c
		if (final_Powers[i] && forcePowerDarkLight[i] && forcePowerDarkLight[i] != final_Side)
		{
			final_Powers[i] = 0;
			//This is only likely to happen with g_forceBasedTeams. Let it slide.
		}
```

You cannot buy a cross-side power at all; there is **no price penalty anywhere**. ⚠ JA SP has this
table; **JO SP does not have it at all** (zero grep hits in `codeJK2/`).

### 3.6 The two things here that are actually well-built

**`WP_ForcePowerAvailable`** (`code/game/wp_saber.cpp:12797`) — the only pure table read in the
system, and every activation path in both games funnels through it:

```cpp
	int	drain = overrideAmt?overrideAmt:forcePowerNeeded[forcePower];
	if ( !drain ) { return qtrue; }
	if ( self->client->ps.forcePower < drain ) { return qfalse; }
```

That is the shape of a real choke point — and it is the *only* one. ⚠ The MP version
(`w_force.c:620`) has already accreted hard-coded exceptions for `FP_LEVITATION`, `FP_DRAIN` and
`FP_LIGHTNING`, which is a choke point decaying in real time.

**`saber[N].forceRestrictions`** — a per-weapon bitmask indexed by power, read generically
(`code/game/wp_saber.cpp:12931`):

```cpp
				if ( (self->client->ps.saber[0].forceRestrictions&(1<<forcePower)) )
				{//this power is verboten when using this saber
					return qfalse;
				}
```

**A `.sab` text file can forbid any power without touching code.** This is the single place in
~30,000 lines of force-power source where content authors got real control over behaviour — and it
sits *directly beside* two verbatim-duplicated hard-coded switches doing the same job for
`g_saberRestrictForce` (`wp_saber.cpp:12914` and `:12941`, the same six powers listed twice).

### 3.7 Three enums, three orderings, one `-D`

⚠ `NUM_FORCE_POWERS` is **11, 16 or 18** depending on build. JO SP has no `qcommon/` of its own —
it compiles `code/qcommon/q_shared.h` with `JK2_MODE` set (`codeJK2/game/CMakeLists.txt:24`), and
the five JA powers sit behind `#ifndef JK2_MODE`. Every `[NUM_FORCE_POWERS]` array silently changes
length with it.

⚠ **The orderings genuinely diverge**: MP index 8 is `FP_RAGE`, SP index 8 is `FP_SABERTHROW`;
`FP_SABER_OFFENSE` and `FP_SABER_DEFENSE` are swapped between them; MP has `FP_TEAM_HEAL` /
`FP_TEAM_FORCE` which SP does not have at all. And index arithmetic is performed **across** these
enums — `code/game/Q3_Interface.cpp:9428` does
`Q3_SetForcePowerLevel( entID, (toSet-SET_FORCE_HEAL_LEVEL), int_data )`, coupling the ICARUS
scripting enum's ordering to `forcePowers_t`'s ordering by subtraction.

⚠ Levels 4 and 5 exist only as `#define FORCE_LEVEL_4 (FORCE_LEVEL_3+1)` past the end of every
`[NUM_FORCE_POWER_LEVELS]` array, and SP NPCs can be authored up to level 5
(`code/game/NPC_stats.cpp:3572`) — **which indexes those arrays out of bounds.**

⚠ And the risk of the table approach when the tables are parallel rather than keyed —
`code/game/wp_saber.cpp:13912`, Rage borrowing Speed's table one rung down with no comment:

```cpp
			speed = forceSpeedValue[self->client->ps.forcePowerLevel[FP_RAGE]-1];
```

**JA added five powers to a shipped game and the architecture did not move an inch** — five enum
members behind an `#ifndef`, five table rows, five `case`s on each of three switches. It scaled by
copy-paste, and it scaled *successfully*, at a fixed cost of roughly a dozen files per power.

---

## 4. MOVEMENT — stock Quake III vs Raven

### 4.1 The constant block — the BFP-shaped comparison, and the answer is split

The block survived *as a block*, which makes the diff exact.

**Jedi Academy MULTIPLAYER changed exactly one value.** `q3/code/game/bg_pmove.c:33-47` against
`codemp/game/bg_pmove.c:62-77`:

```c
// STOCK Q3                                  // JA MULTIPLAYER
float pm_stopspeed         = 100.0f;         float pm_stopspeed         = 100.0f;
float pm_duckScale         = 0.25f;          float pm_duckScale         = 0.50f;   // ← ONLY DIFFERENCE
float pm_swimScale         = 0.50f;          float pm_swimScale         = 0.50f;
float pm_wadeScale         = 0.70f;          float pm_wadeScale         = 0.70f;
                                             float pm_vehicleaccelerate = 36.0f;   // ← new
float pm_accelerate        = 10.0f;          float pm_accelerate        = 10.0f;
float pm_airaccelerate     = 1.0f;           float pm_airaccelerate     = 1.0f;
float pm_wateraccelerate   = 4.0f;           float pm_wateraccelerate   = 4.0f;
float pm_flyaccelerate     = 8.0f;           float pm_flyaccelerate     = 8.0f;
float pm_friction          = 6.0f;           float pm_friction          = 6.0f;
float pm_waterfriction     = 1.0f;           float pm_waterfriction     = 1.0f;
float pm_flightfriction    = 3.0f;           float pm_flightfriction    = 3.0f;    // ← DEAD, see §4.5
float pm_spectatorfriction = 5.0f;           float pm_spectatorfriction = 5.0f;
```

**SINGLE-PLAYER is the opposite, and this is the direct BFP parallel.** `codeJK2/game/bg_pmove.cpp:108-123`
(Jedi Outcast) and `code/game/bg_pmove.cpp:161-178` (JA-SP) are identical to each other and *do*
retune id:

```c
const float pm_accelerate       = 12.0f;    //  10.0f   CHANGED
const float pm_airaccelerate    = 4.0f;     //  1.0f    CHANGED — 4×
const float pm_duckScale        = 0.50f;    //  0.25f   CHANGED
      float pm_ladderScale      = 0.7f;     //  (absent) NEW
const float pm_frictionModifier = 3.0f;     //  Used for "careful" mode (when pressing use)
const float pm_airDecelRate     = 1.35f;    //  Used for air decelleration away from current movement velocity
```

`pm_wadeScale` and `pm_spectatorfriction` were **deleted** in SP.

⚠ `pm_airDecelRate` is the one genuine behaviour change rather than a retune —
`code/game/bg_pmove.cpp:2959`:

```c
	if ( ( DotProduct (pm->ps->velocity, wishdir) ) < 0.0f )
	{//Encourage deceleration away from the current velocity
		wishspeed *= pm_airDecelRate;
	}
```

**Air acceleration 1 → 4, plus a further ×1.35 when you steer against your own velocity.** That is
mid-air authority, and stock Q3 has neither line. **This is precisely the BFP move — the feel of
single-player Jedi Knight movement is substantially two retuned floats plus one extra line in
`PM_AirMove`.** Multiplayer, which is where the duelling scene lives, did *not* take it.

`JUMP_VELOCITY` was lowered and id's number left in the comment, and the define promoted from the
private header to the public one:

```
q3/code/game/bg_local.h:29          #define JUMP_VELOCITY 270
codemp/game/bg_public.h:62          #define JUMP_VELOCITY 225//270
code/game/bg_public.h:70            #define JUMP_VELOCITY 225    // 270
```

Base speed is the same cvar on the same code path with a different default — `g_speed` **320**
(`q3/code/game/g_main.c:142`) vs **250** (`codemp/game/g_xcvar.h:159`), both read as
`client->ps.speed = g_speed.value;`. `STEPSIZE` 18 and `MIN_WALK_NORMAL` 0.7f are unchanged.

### 4.2 The stock core — what is genuinely id's

| function | Q3 lines | OpenJK MP | verdict |
|---|---|---|---|
| `PM_ClipVelocity` | 18 | 35 | **stock body**, `OVERCLIP 1.001f` unchanged, two Raven brackets |
| `PM_FlyMove` | 33 | 39 | **stock + 2 changes** (§4.5) |
| `PM_SlideMove` | 188 | 227 | **stock solver** + wall-run hook |
| `PM_Accelerate` | 38 | 54 | **both of id's branches kept** (below) |
| `PM_WalkMove` | 125 | 188 | stock body + roll clamp + vehicle branch |
| `PM_Friction` | 59 | 124 | **stock block**, demoted into an `else` |
| `PM_StepSlideMove` | 93 | 211 | stock + fixes |
| `PM_AirMove` | 58 | 230 | stock tail, new head |
| **`PM_CheckJump`** | **35** | **988** | **28× — effectively new** |

**`PM_Friction`**: id's ground-friction block (`q3:196-204`) is present character-for-character at
`codemp/game/bg_pmove.c:1042-1050`, just moved inside `else if ( pm_flying != FLY_NORMAL && pm_flying != FLY_VEHICLE )`.
`control = speed < pm_stopspeed ? pm_stopspeed : speed; drop += control*pm_friction*pml.frametime;`
is unchanged.

**`PM_Accelerate` is the most interesting thing in the core.** id ships a compile-time choice
(`q3/code/game/bg_pmove.c:240-277`): `#if 1` "q2 style", `#else` "proper way (avoids strafe jump
maxspeed bug), but feels bad". **Raven kept both bodies and turned the `#if` into a runtime
gametype test** (`codemp/game/bg_pmove.c:1104-1154`):

```c
	if (pm->gametype != GT_SIEGE || pm->ps->m_iVehicleNum
		|| pm->ps->clientNum >= MAX_CLIENTS || pm->ps->pm_type != PM_NORMAL)
	{ //standard method, allows "bunnyhopping" and whatnot
	    ... id's q2-style branch, verbatim ...
	}
	else
	{ //use the proper way for siege
	    ... id's #else block, byte-for-byte ...
	}
```

**Default JKA multiplayer runs id's q2-style accelerate with strafe-jumping intact** — Raven's own
comment says "allows bunnyhopping and whatnot" — **and Siege alone runs the branch id disabled.**
Jedi Outcast took the simpler route and deleted the `#else` outright
(`codeJK2/game/bg_pmove.cpp:351`).

⚠ **Raven's `PM_AirMove` calls `PM_CheckJump`; id's never does.** `q3:710` (inside `PM_WalkMove`) is
the only call site in stock; Raven added a second at `codemp/game/bg_pmove.c:3058`. **That one line
is what makes force jump, wall runs and wall grabs reachable while airborne** — the whole
acrobatic vocabulary hangs off it.

Only six stock `PM_*` symbols were deleted (`PM_GrappleMove`, `PM_InvulnerabilityMove`,
`PM_CheckStuck`, and three anim helpers). 48 stock symbols → 117 in OpenJK MP, 42 shared.

### 4.3 THE ANIMATION IS THE MOVEMENT STATE MACHINE

This is the architectural fact under everything in this section, and it is the thing most worth
understanding before copying any of it.

**id's collision solver asks the animation system for permission.** `PM_SlideMove` gained one hook,
`PM_GroundSlideOkay` (`codemp/game/bg_slidemove.c:575`):

```c
qboolean PM_GroundSlideOkay( float zNormal )
{
	if ( zNormal > 0 )
	{
		if ( pm->ps->velocity[2] > 0 )
		{
			if ( pm->ps->legsAnim == BOTH_WALL_RUN_RIGHT
				|| pm->ps->legsAnim == BOTH_WALL_RUN_LEFT
				|| ...
				|| BG_InReboundJump( pm->ps->legsAnim ))
			{
				return qfalse;
			}
```

**Whether you slide off a surface is decided by which animation is playing.** The rest of the
diff against `q3/code/game/bg_slidemove.c:45-232` is small — a `PMF_STUCK_TO_WALL` bypass, flattening
the normal during a wall run, and a fixed "tripple" typo.

**Rolls are the same idea taken further: the animation overwrites your input.** `PM_TryRoll`
(`codemp/game/bg_pmove.c:3567`) **returns an animation number and never touches `velocity[]`** —
it only traces to check there is room. The movement then comes from `BG_CmdForRoll`
(`:8216`), called unconditionally every frame, which *rewrites the usercmd*:

```c
	switch ( (anim) )
	{
	case BOTH_ROLL_F:
		pCmd->forwardmove = 127;
		pCmd->rightmove = 0;
		break;
	case BOTH_ROLL_B:
		pCmd->forwardmove = -127;
	...
	pCmd->upmove = 0;
```

and the *speed* is a function of the animation's remaining milliseconds (`:8489`):

```c
			if (ps->legsTimer > 800) { ps->speed = ps->legsTimer/1.5; }
			else                     { ps->speed = ps->legsTimer/5.0; }
```

Trigger is **crouch while running fast**, not a dedicated button (`:5321`, requires
`VectorLengthSquared(velocity) >= 40000`, i.e. 200 u/s), plus a crouch-on-landing variant that
absorbs impact with `delta /= 3`.

⚠ **A roll has NO invulnerability and no damage reduction.** Verified by grepping `BG_InRollAnim`,
`BG_InRoll`, `PMF_ROLLING` and `PM_RollingAnim` across `g_combat.c`, `g_active.c`, `w_saber.c` and
`NPC_reactions.c` — no damage path reads any of them. What a roll actually buys: a **crouch-height
hitbox** (`:4491`, `pm->maxs[2] = pm->ps->crouchheight` while keeping a standing viewheight),
immunity to saber-lock (`w_saber.c:1542`), and no pain-flinch (`NPC_reactions.c:295` —
*"strong attacks, rolls, knockdowns, flips and spins cannot be interrupted by pain"*; the damage
still lands in full). **The dodge is positional, not a mercy window.**

### 4.4 Wall run, wall grab, wall jump — and which game added which

⚠ **These are not all Jedi Academy additions.** Jedi Outcast has the horizontal wall run; it lives
in `codeJK2/game/bg_pangles.cpp:111` (`PM_AdjustAngleForWallRun`), with `BOTH_WALL_RUN_LEFT` in
JO's anim enum at `codeJK2/game/anims.h:1039`.

| | JO (`codeJK2`) | JA (`code`/`codemp`) |
|---|---|---|
| horizontal wall run | ✅ | ✅ |
| spinning flip | ✅ | ✅ |
| **running UP a wall** | ❌ | ✅ `code/game/bg_pangles.cpp:840` |
| **wall jump** | ❌ | ✅ `:967` + `G_ForceWallJumpStrength` |
| **wall GRAB (`PMF_STUCK_TO_WALL`)** | ❌ **0 hits repo-wide** | ✅ `codemp/game/bg_public.h:480` |
| long jump / grapple / BF kick / stab down | ❌ | ✅ |

**Wall RUN is Jedi Outcast. Wall GRAB, wall JUMP and running UP a wall are Jedi Academy.**

The architecture is two layers: `PM_CheckJump` **starts** a wall move (force gates, initiating
trace, velocity push); the `PM_Adjust*` family **sustains** one already running and gates purely on
which animation is playing.

**The surface tests, verified directly:**

```c
// HORIZONTAL WALL RUN — codemp/game/bg_pmove.c:1341-1354
			dist = 128;                                    // 128u sideways trace
		pm->trace( &trace, ps->origin, mins, maxs, traceTo, ps->clientNum, MASK_PLAYERSOLID );
		if ( trace.fraction < 1.0f
			&& (trace.plane.normal[2] >= 0.0f && trace.plane.normal[2] <= 0.4f) )
```
```c
// WALL GRAB — codemp/game/bg_pmove.c:1645-1649
	if ( ps->legsTimer > 100 && trace.fraction < 1.0f &&
		fabs(trace.plane.normal[2]) <= 0.2f/*MAX_WALL_GRAB_SLOPE*/ )
	{//still a vertical wall there
```

A **run** needs `0.0 ≤ normal[2] ≤ 0.4`; a **grab** needs `|normal[2]| ≤ 0.2`, with `fabs` so
overhangs qualify. ⚠ The named constants exist only in the SP tree
(`code/game/wp_saber.h:141` `MAX_WALL_RUN_Z_NORMAL 0.4f//was 0.0f`, `:145` `MAX_WALL_GRAB_SLOPE 0.2f`);
MP inlines the literals and keeps the names as comments.

**Force gates, three tiers, all on `FP_LEVITATION`**: wall run/flip needs level > 1 (`:2149`),
run-up-wall needs > 2 (`:2501`), wall grab/jump needs > 2 (`:2578`). An outer gate at `:2086` also
requires **saber or melee equipped**. Wall jump strength is derived, not authored
(`codemp/game/bg_pmove.c:1571`):

```c
#define	JUMP_OFF_WALL_SPEED	200.0f
//nice...
static float BG_ForceWallJumpStrength( void ) { return (forceJumpStrength[FORCE_LEVEL_3]/2.5f); }
```

= 336 up, 200 out, 10 force power, and **500ms of no air control** after (`:1702`). The
anti-infinite-climb rule (`:2581`) caps total climb above `forceJumpZStart` at
`forceJumpHeightMax[FORCE_LEVEL_3] - 168` = 250u.

**Force jump is a modification of `PM_CheckJump`, but only barely** — about 20 of id's 35 lines
survive, at the two ends, with ~960 new lines between them; id's function became the fall-through
case. `#define METROID_JUMP 1` (`:1233`) makes the charge **hold-in-air**, not hold-on-ground, and
the height scales *down* as you approach your level's ceiling (`:2027`). The old ground-charge
(`FORCE_JUMP_CHARGE_TIME 6400`) survives with the comment *"I guess this is unused now"*.

⚠ **Your force-jump level is literally a fall-damage stat** (`:3910`, inside `PM_CrashLand`): land
at or above where you started and damage is capped at 8; otherwise
`delta_send -= (dmgLess*0.3)` where `dmgLess = forceJumpHeight[level] - dropDistance`. Stock
`PM_CrashLand` has no force concept at all.

⚠ **How long a wall run lasts, in milliseconds, is not determinable from source** — see §6.

**Acrobatics are a hard-coded if-chain on the movement side** (`PM_CheckJump`, `:2149-2194`,
branching on `cmd.rightmove`/`cmd.forwardmove` to pick `vertPush` and an anim), and a **table on the
saber side** (`saberMoveData[]`, `bg_saber.c:148` — arials, cartwheels, butterflies are saber moves,
not pmove moves). The one data-driven gate on the movement side is per-saber `.sab` flags read into
four locals at `:2094` (`allowWallRuns`, `allowWallFlips`, `allowFlips`, `allowWallGrabs`) from
`SFL_NO_WALL_RUNS (1<<13)` — **a text file can forbid a character's acrobatics.**

### 4.5 Flight — the BFP question, answered

**There is a genuine free-flight pmove in JKA MP and it is stock `PM_FlyMove` with two changes.**
`q3:560-592` against `codemp/game/bg_pmove.c:2990-3028` — same locals, same `PM_Friction()`, same
`PM_CmdScale()`, same `PM_Accelerate(wishdir, wishspeed, pm_flyaccelerate)`, same
`PM_StepSlideMove(qfalse)`. The two deltas:

```c
	if ( pm->ps->pm_type == PM_SPECTATOR && pm->cmd.buttons & BUTTON_ALT_ATTACK) {
		//turbo boost
		scale *= 10;                                        // ← ADDED
	}
	...
	if ( !scale ) {
		wishvel[0] = 0;
		wishvel[1] = 0;
		wishvel[2] = pm->ps->speed * (pm->cmd.upmove/127.0f);   // ← CHANGED (id: 0)
```

Even id's now-false doc comment *"Only with the flight powerup"* survives at `:2987` — **there is
no `PW_FLIGHT` in `codemp` at all.**

⚠ **`pm_flightfriction` is declared and never used in JKA multiplayer.** Defined at
`codemp/game/bg_pmove.c:76`, externed at `bg_local.h:72`, and its only consumers in the whole tree
are the *single-player* codebases, which repurposed it as the spectator friction (SP deleted
`pm_spectatorfriction`) — `code/game/bg_pmove.cpp:708` and `codeJK2/game/bg_pmove.cpp:327`:

```c
	// apply flying friction
	if ( pm->ps->pm_type == PM_SPECTATOR )
	{
		drop += speed*pm_flightfriction*pml.frametime;
	}
```

**MP orphaned `pm_flightfriction` and kept `pm_spectatorfriction`; SP did the exact reverse.**

**Can a player fly? Effectively no.** `PM_FLOAT` routes to `PM_FlyMove` (`:11034`) but is only ever
set by being **force-gripped** (`w_force.c:3903`), and the enum says so:
`PM_FLOAT, // float with no gravity in general direction of velocity (intended for gripping)`.
The other route, `FLY_NORMAL`, is hard-gated against players (`:463`):

```c
	if (pm->ps->clientNum < MAX_CLIENTS)
	{ //we know that real players aren't vehs
		pm_flying = FLY_NONE;
		return;
	}
```

and its trigger flag is NPC-only by declaration (`bg_public.h:686`:
`#define EF2_FLYING (1<<4) // Flying FIXME: only used on NPCs`).

**The BFP verdict: Jedi Knight had the same lever Bid For Power pulled and did not pull it.** The
fly code is present and essentially untouched from id, `pm_flyaccelerate` still at 8.0 and
`pm_flightfriction` still at 3.0 — but in multiplayer one of those two floats is wired to nothing
and the pmove type is reserved for being thrown around by someone else's Force Grip. Vehicles get a
fork of it (`PM_FlyVehicleMove`, `:2893` — recognisably `PM_FlyMove` copied, same `// normal
slowdown` comment).

**Force Speed is not a pmove change at all.** MP is one multiply (`bg_pmove.c:8388`):

```c
	if (ps->fd.forcePowersActive & (1 << FP_SPEED)) { ps->speed *= 1.7f; }
	else if (ps->fd.forcePowersActive & (1 << FP_RAGE)) { ps->speed *= 1.3f; }
```

⚠ **This is structurally the same mechanic as stock Q3's Haste** (`q3/code/game/g_active.c:851`:
`if ( client->ps.powerups[PW_HASTE] ) { client->ps.speed *= 1.3; }`) — same idea, different number,
different trigger. `pml.msec` is derived identically in both, so **force speed does not touch
pmove's clock in MP**.

⚠ **Single-player implements it completely differently: it sets the engine's `timescale` cvar and
slows down the world** (`code/game/wp_saber.cpp:13471`, `gi.cvar_set("timescale", ...)` off
`forceSpeedValue[] = {1.0, 0.75, 0.5, 0.25}`), then compensates the player back out of their own
slow-motion for weapon refire (`bg_pmove.cpp:14026`). There is a variable literally called
`MatrixMode`, and Raven's own FIXME concedes *"because the timescale scales down (not instant),
this doesn't end up being exactly right"*.

### 4.6 What does not exist, and the pmove type count

Grepped case-insensitively across `codemp/game/`: **crouch slide 0 hits** (`crouchslide`,
`crouch_slide`, `slideT`), **ledge grab 0 hits** (`BOTH_HANG`, `LEDGE`, `PM_CheckLedge`),
**dash 0 hits** (`PM_CheckDash`, `BOTH_DASH`, `dashT`).

⚠ Do not mistake `PM_SlideMove` / `PM_StepSlideMove` for a crouch slide — those are id's collision
solver. The nearest thing to a ledge grab is the wall grab, which hugs a vertical face, not a ledge.

The **jetpack** (JA-MP only) has no move function of its own — it falls through to id's
`PM_WalkMove`/`PM_AirMove` with three modifiers: gravity ×0.1 near the ground and ×0.25 above
(`:10712`), `wishvel` ×0.8 coasting / ×2.0 thrusting (`:3200`), plus a raw velocity add and a hover
floor at `JETPACK_HOVER_HEIGHT 64`.

**`pmtype_t`**: stock Q3 **7** → Jedi Outcast **6** → JA-SP **6** → JA-MP **9**. Both SP builds
*removed* `PM_SPINTERMISSION`; JA-MP added `PM_JETPACK` and `PM_FLOAT` — ⚠ inserted **after
`PM_NORMAL`**, which renumbers every subsequent value and is therefore a network-protocol change,
not a cosmetic one.

---

## 5. WHAT IT DOES THAT A MODERN GAME WOULD NOT

**The client reads server memory directly, and that is why single-player and multiplayer diverge.**
In JA single-player, `cg_view.cpp` and `cg_draw.cpp` dereference `g_entities[...]` **62 times**
between them (31 each); the MP versions of the same two files do it **zero** times. The SP camera
reads `player->client->ps.forcePowerDuration[FP_SPEED]`, the SP crosshair reads
`g_entities[0].client->renderInfo.eyePoint`. This is only possible because SP builds game and cgame
into one address space. Everything the SP camera does that MP's does not — the Force Speed
pull-back and FOV widen, the animation-driven pull-back, the `cg.overrides` channel written by
game code into client state — is downstream of that one architectural fact. A modern engine would
have made this a replicated component and got both.

**`Q_powf` takes an `int` exponent** (`shared/qcommon/q_math.c:429`), so the non-`cg_smoothCamera`
damping path returns `x` unchanged at any frame rate above 25fps — frame-rate-dependent smoothing
shipped as the fast path, with the correct `powf` path added later behind a cvar that defaults on.

**Everything is laid out in a fixed 640×480 virtual screen**, including the projected crosshair,
with magic numbers the author could not explain (`code/cgame/cg_draw.cpp:2743`):

```c
x -= 320;//????
y -= 240;//????
...
cgi_R_DrawStretchPic( x + cg.refdef.x + 0.5 * (640 - w), y + cg.refdef.y + 0.5 * (480 - h), ... );
```

**Occluding geometry is handled by fading the *player*, not the geometry.** `cg_thirdPersonAlpha` /
`cg_thirdPersonAutoAlpha` (`code/game/g_active.cpp:5323`) ramp the *character* translucent rather
than cutting away the wall — and it ships off. A modern game (and WWA already, in
`world.updateOcclusion`) fades the occluder instead. Vehicles do get `cameraAlpha` "fade out the
vehicle to this alpha if it's in the way of the crosshair", which is the same inverted instinct.

**Two full swept-box traces every frame, and they knew it was expensive** — "*however two full
volume traces each frame is a bit scary to think about*" (`code/cgame/cg_view.cpp:595`, repeated at
`:721`). The previous version amortised traces across frames and lerped; they reverted it because
it looked worse. On 2002 hardware this was a real budget decision; today it is free, which means
there is now no excuse for a chase camera that does not collide.

**Dead and half-finished controls ship in the retail cvar table.** `cg_thirdPersonMaxRange` (150)
is registered in all three codebases and never read anywhere in the tree. `cg_thirdPersonHorzOffset`
— the over-the-shoulder offset — is applied under the comment `// Temp: just move the camera to the
side a bit`, is **not** run through the collision traces, and defaults to 0. The `thirdPersonAlpha`
field in `cg_local.h` carries a copy-pasted comment describing camera damping.

**Known bugs are documented in comments rather than fixed**: `//FIXME: when the trace hits movers,
it gets very very jaggy... ?` (`code/cgame/cg_view.cpp:699`) with a dead attempted fix left in
place below it; `//FIXME: predict enemy position?` in the melee auto-aim.

**Superseded systems are kept in the file rather than deleted**, which is how a codebase ends up
with two of everything. The entire 1.02-era percentage-based block system sits commented out above
its replacement (`w_saber.c:9348`) with the note *"(as you can see, it was STUPID.. for the most
part)"*; both saber hit-detection systems are live behind a cvar; both saber damage models are live
behind a cvar; id's rejected `PM_Accelerate` branch is live behind a gametype test; and stock Q3's
whole third-person camera sits commented out under Raven's.

**Dead branches ship.** `attackAdv < 1` already swallows `attackAdv < 0` and the `else`, so two of
the four saber block outcomes (`codemp/game/w_saber.c:5030`) are unreachable. `Q_powf(x, y)` with
any `y < 2` returns `x`. `forceSpeedLevels`, `forcePushPullRadius`, `forcePowerMinRank`,
`saberAnimSpeedMod` and `cg_thirdPersonMaxRange` are all defined and read by nothing.

**Two helpers for the same job that disagree numerically.** SP's `G_Throw` scales the vertical by
`* 1.5` while SP's `G_ApplyKnockback` divides by `(mass * 1.5)` and adds 20 — a factor of ~2.25
plus a constant, in the same file family, both called "knockback".

**The code talks to itself.** `//YES!  This is very very bad... but it works!  James made me do it.
Really, he did.  Blame James.` above the crosshair trace (`code/cgame/cg_draw.cpp:3081`); `// sort of
a nasty hack in order to get this to work. Don't tell Ensiform, or I'll have to kill him. --eez`
(`code/cgame/cg_view.cpp:373`). Charming, and a reminder that these numbers were tuned by feel and
shipped, not derived.

---

---

## 6. WHAT I COULD NOT FIND

1. **All frame timings, and therefore every duration expressed in animation frames.** OpenJK is
   source only — **no game assets are in the repository** (`find` for `animation.cfg`, `*.pk3`,
   `*.sab`, `*.veh`, `*.npc` returns nothing; the top level is `code/ codeJK2/ codemp/ shared/
   lib/ tools/ ui/ cmake/ scripts/ docs/`). `animation_t` is `{firstFrame, numFrames, frameLerp,
   loopFrames}` parsed from `animation.cfg` by `BG_ParseAnimationFile`, and that file ships inside
   the retail `.pk3`s. **Anything keyed to `legsTimer` or `PM_AnimLength` therefore has no
   absolute number available** — including saber swing/recovery windows, and the animation-driven
   camera envelopes in §1.7, where I can quote the *shape* (`elapsedTime/animLength`) and the
   *amplitude* (120 units, −120, 90°, 360°) but not the duration.

2. **How long a wall run lasts in milliseconds.** There is no `wallRunTime` anywhere in OpenJK
   (0 hits repo-wide). The timer is `ps->legsTimer`, initialised from the animation's own length at
   `codemp/game/bg_panimate.c:2860` (`numFrames × |frameLerp|`) — see (1). All the source contains
   are thresholds *relative* to that unknown: `legsTimer > 500` to keep running (`bg_pmove.c:1327`,
   `:1397`), `> 200` for the vertical run's push (`:1527`), `> 100` to stay stuck to a wall
   (`:1646`), and a run→flip window of `400 < legsTimer < animLen − 400` (`:2336`).

3. **The net effect of single-player Force Speed on player locomotion.** SP sets the engine's
   global `timescale` cvar (`code/game/wp_saber.cpp:13471`) rather than touching `ps->speed`.
   Verified: SP's `FP_SPEED` never multiplies `ps->speed` in `bg_pmove.cpp`, and SP's pmove derives
   its frametime the same way stock Q3 does, so there is no in-pmove compensation. The compensation
   that *does* exist (`bg_pmove.cpp:14026`) is explicitly for **weapon refire**, not movement.
   Working out how locomotion actually nets out under a global timescale needs engine-side code
   outside `game/` that was not audited. Raven's own FIXME concedes the mechanism is imprecise.

4. **`MAX_TRACE_DIST`** — named in the brief; no such symbol exists in a force context anywhere in
   the repo (the only match is `FX_MAX_TRACE_DIST` in the effects scheduler, unrelated). Push/pull
   uses a bare local `int radius = 1024;`; lightning and drain use a bare `2048`.

5. **Whether `cg_thirdPersonMaxRange` was ever wired.** It is declared, externed and registered at
   150 in both JO and JA and read by **nothing** in the tree (verified: 6 hits, all
   declaration/registration). I could not find a version of the camera that used it.

6. **Why the JA pitch-damping divisor is 115.** The value is the pitch clamp (89) plus 26, with no
   comment and no derivation in the source. JO used 89 exactly, which makes its intent obvious
   (normalise to the clamp); 115 is a hand-tuned magic number.

7. **Bot/NPC use of the third-person camera parameters.** `forcePushPullRadius`'s own comment claims
   it is "only being used by jedi AI", and it is read by nothing at all in `codemp/`. I could not
   determine whether the MP jedi AI ever used per-level push ranges, or whether the comment is a
   leftover from a version that did.

8. **`cg.overrides` lifetime rules.** Game code sets `cg.overrides.active |= CG_OVERRIDE_*` each
   frame a condition holds and clears it in an `else` branch (`codeJK2/game/g_active.cpp:1447`),
   but I did not find a central reset, so whether a scripted override can leak past the event that
   set it is unresolved. In MP this cannot happen at all, because MP has no `cg.overrides` — the
   whole channel depends on SP's shared address space (§5).

9. **Any saber move's actual duration, and therefore all "recovery frames".** Commitment is
   `weaponTime = torsoTimer` — the remainder of the animation — so every recovery window is a frame
   count in `animation.cfg`. Same root cause as (1). What the source *does* give: `blendTime` per
   move (100ms for attacks, 350 for idles), `SABER_BLOCK_DUR 150`, and
   `parryDebounce[] = {500, 300, 150, 50}`.

10. **The named block functions the brief asked about do not exist.** Zero hits tree-wide for
    `WP_SaberBlockCheck`, `PM_SaberBlockForQuad`, `WP_SaberBlockBolt`, `WP_ForcePowerDeflect`,
    `saberDeflect`, `bgSaberStyleData`, `saberStyleData`, `StanceDamage`. I looked for a block-chance
    roll and there is not one — the decision is geometric (§2.4). `saberBlockTime` exists only in
    `codemp/`; SP uses `saberBlockingTime` and `forcePowerDebounce[FP_SABER_DEFENSE]` instead.

11. **Whether MP's `d_saberInterpolate` path was ever the shipped default.** Both hit-detection
    systems are present; this repo's cvar defaults select the swept SP-style one. I could not
    establish which was live in the retail 1.01/1.02/1.03/1.04 builds — the cvar defaults in OpenJK
    are the *community* build's, and OpenJK is a maintained fork, not a snapshot of the release.

12. **Whether `dirInc` in the saber sweep is applied correctly.** `curDirFrac = dirInc = 1.0f/(...)`
    assigns the same value to both, which is the sub-step count reciprocal — plausible, but the
    loop's use of the two is intricate enough that I would not state the exact number of angular
    sub-steps for a given swing as fact.

13. **Verification by running the games.** Everything here is read from source. No claim above was
    confirmed by playing, and none of the tuning values were measured in a live build.

---

## 7. WHAT WAR WORLD / ASCENDANTS SHOULD STEAL

Ordered by payoff. Every item names the file it lands in.

### 7.1 THE AIM BUG — `game.js:2986-2989`. Fix this first.

The current PowerWorld aim:

```js
else if (p._openSky) {
  const cf = _v.set(0, 0, 0); this.world.camera.getWorldDirection(cf);
  a3.set(p.pos.x + cf.x * 120, p.pos.y + 5 + cf.y * 120, p.pos.z + cf.z * 120);
}
```

**This takes the CAMERA'S direction and applies it from the PLAYER'S position.** Those are two
*parallel* rays from two different origins, and parallel rays never converge. `world.chase()` puts
the eye at `px * off` to the side (`off = d * 0.17`) and `d * 0.30` above the subject
(`world.js:2297-2298`) — so at a 40u chase distance the camera is **6.8u lateral and 12u up** from
the firing origin. The crosshair is a screen-centre CSS reticle, i.e. it marks the *camera's* ray.
The shot travels along a ray parallel to it, from a point 6.8u away.

**The miss is a constant 6.8u in world units at every range** — which means the angular error gets
*worse* the closer the target is. This is exactly the failure JKA labels `//old way`.

Two valid fixes; JKA takes the first, and WWA should take the second:

- **(A) JKA's — the weapon never lies.** Trace from the character along the character's own aim,
  then project the hit point to screen and draw the crosshair *there*
  (`cg_draw.cpp:3036` + `CG_WorldCoordToScreenCoordFloat`). Nothing is ever bent. Cost: the
  crosshair moves, which fights a lock-on game where the reticle is a targeting affordance.
- **(B) Convergent — keep the reticle centred, aim at what's under it.** Raycast from the *camera*
  through screen centre, take the first hit (falling back to a point at max range), and set `a3` to
  **that world point** rather than to a direction. The shot from the player then converges on the
  same point the crosshair marks.

**(B) is a few lines and WWA already has the primitive** — `world.screenToGround` (`world.js:1444`)
already builds a camera ray via `_ray.setFromCamera(_ndc, this.camera)`; it just intersects a
ground plane instead of the world. The honest version intersects cover/interiors, or simply uses a
fixed focus distance, which is enough to remove the parallax.

⚠ **Whichever you pick, the rule is the one JKA states in a comment: decide whether the shot comes
from the character or the camera, and make the crosshair agree.** Today WWA has the crosshair on
one and the shot on the other.

### 7.2 THE CAMERA DOES NOT COLLIDE — `world.js chase()`, and the primitive already exists

`chase()` ends at `world.js:2310` by writing `c.position.set(...)` straight from the damped
`camPos`. **Nothing tests the world.** In PowerWorld's open desert that is survivable; the moment
the third-person shell is pointed at a city — which is the entire point of the shell — the camera
will spend its life inside buildings.

**`world._segBox3(x0,y0,z0, x1,y1,z1, c)` (`world.js:1429`) is already the right function and is
already being called on the exact camera→player segment** by `updateOcclusion` (`world.js:1354`).
It computes `tmin` by the slab method and then throws it away:

```js
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
    return tmin > 0.02 && tmin < 0.98;
```

Return `tmin` instead of a boolean and it is a trace. Then, following JKA:

1. **Inflate the box, don't cast a ray.** JKA uses `CAMERA_SIZE 4` on a ~64u-tall player; at WWA's
   1u ≈ 0.19m that is roughly 2–3u. Add it to `c.hx`/`c.hz`/`top` so the camera stops with clearance
   instead of touching the wall and near-clipping through it.
2. **Two traces, in JKA's order** (`cg_view.cpp:585` then `:689`): player eye → damped look-point
   first, then corrected look-point → damped eye. Doing it in that order is what stops the camera
   being pulled to a spot whose *look-at* is inside geometry — the failure that makes naive chase
   cameras spin in corners.
3. **Write the result back into `camPos`, not into a separate variable.** Because JKA stores the
   clipped position in the damped value, the next frame damps *from* the corrected point and the
   recovery when you step off the wall is smooth for free. One state, not two.
4. **Do the shoulder offset before the trace, not after.** JKA gets this wrong on foot
   (`cg_view.cpp:881`, `// Temp:`) and right in vehicles (`codemp/cgame/cg_view.c:1103`).
   WWA's `off = d * 0.17` is applied inside the eye calculation already, so it is on the right side
   of the line — keep it there.

Also worth taking: `MASK_CAMERACLIP` in MP is `MASK_SOLID|CONTENTS_PLAYERCLIP`. The camera should
respect a *separate* blocker set, so a designer can stop the camera without stopping a fighter.

### 7.3 THE YAW-RATE STIFFENER — ~6 lines into `chase()`

`chase()` damps at fixed rates (`8/6/8` on the eye, `9/7/9` on the look point). JKA makes the
damping a **function of how fast you are turning** (`cg_view.cpp:843` + `:646`): below 1°/ms no
stiffening, above 2.5°/ms shave 75% of the remaining lag, linear between.

**Slow look-around stays cinematic; a fast flick snaps.** This is the single cheapest thing in the
whole reference and it is the difference between a damped camera that feels smooth and one that
feels like it is fighting you. WWA's `damp(a, b, lambda, dt)` takes `lambda` directly, so this is
`lambda * (1 + stiff * K)` with `stiff` derived from the frame's yaw delta — no new machinery.

⚠ Normalise the yaw delta across the ±180 seam (`if (deltayaw > 180) deltayaw = fabs(deltayaw-360)`).
WWA already learned this one in `pickTarget`'s shortest-path damping; the same trap.

⚠ And take the **kill switches** with it: JKA drops damping to zero on a moving platform
(`cg_view.cpp:544`, `:612`) and hard-snaps on a time discontinuity (`:825`). WWA's equivalents are
a fighter riding anything that moves, and `clearTransients` / a mode change / the end of a
cinematic. A damped camera with no snap path is a camera that will one day be seen flying across
the map.

### 7.4 A POWER OWNS THE FRAME — `runSlot` in `game.js:42` is the hook

This is the most transferable *idea* in the whole reference, and WWA has all the parts.

JKA drives the camera from three separate places, all of them declarative:

- **Force Speed** pulls the camera back and widens the FOV, off two parallel level-indexed tables
  (`forceSpeedRangeMod` 30/45/60, `forceSpeedFOVMod` 20/30/40), with a **1000ms ease in and a
  500ms ease out — the ramp out is twice as fast**, so the power snaps off.
- **The animation drives it.** `backDist` and `viewDip` are triangle envelopes computed from the
  animation's *own* `animLength` and remaining `legsAnimTimer`, so they cannot desynchronise from
  the move and work at any playback speed. Force Drain gets a three-phase move matching its
  three-phase animation (swing to 90°, *hold*, swing back). `G_CamCircleForLegsAnim` orbits a full
  360° in six lines.
- **The vehicle declares its camera as data** — `cameraRange` / `cameraVertOffset` /
  `cameraHorzOffset` / `cameraPitchOffset` / `cameraAlpha` parsed from a text file by a
  keyword→offset table (`bg_vehicleLoad.c:544`).

**What WWA should build**: an optional `camera: { range, vert, horz, pitch, damp }` block that a
`def`, an ability row, or a `MODE_IMPL` entry can declare, plus a per-parameter override channel —
JKA's `cg.overrides` with its `CG_OVERRIDE_3RD_PERSON_*` flag word, which is WWA's `mapCam` idea
except **per-parameter rather than all-or-nothing**, so a power can take the range and leave the
damping alone. `chase()` reads override-else-default per field, exactly as `cg_view.cpp` does.

Then: the haymaker pulls the camera in over its charge and releases it on the hit; an ultimate
takes a 90° swing and holds it for the duration; a transformation gets the 360°. Today
`world.chase()` has one behaviour and no way for any of the 400 ability slots to say anything
about the frame.

⚠ **Gate it on the mover being the player**, as JKA does at every site (`ent->s.number <
MAX_CLIENTS || G_ControlledByPlayer(ent)`). A camera flourish belongs to the move's *owner*; an AI
doing the same move must move no camera.

⚠ **And do not let it rotate the movement basis.** JKA's camera can orbit a full 360° while
movement stays keyed to `pm->ps->viewangles` (`bg_pmove.c` builds `pml.forward`/`pml.right` from
the player's view, never from the camera — unchanged from `q3/code/game/bg_pmove.c:1914`). A
camera flourish that inverts the controls is a bug, and the separation is what prevents it.

### 7.5 THE SHELL MAY CHANGE THE MOVESET — and this is the rule for the whole shell

Jedi Academy gates **four** acrobatic saber moves on `cg.renderingThirdPerson && !cg.zoomMode`
(`bg_panimate.cpp:2366`, `:2447`, `:3651`, `:3757`) — flip-over attacks, back spins, the backflip
attack. Switch to first person and they leave your moveset, because a somersault you cannot see is
not worth having.

**This is the design rule the WWA camera/controls shell most needs, and it has two halves that must
not be confused:**

- **Presentation MAY decide what is offered.** A move that only reads from a particular camera can
  be gated on that camera. WWA already has the machinery — `_openSky` is exactly this kind of flag
  (manual §46: one flag, four rules), and the shell should be free to add or remove moves the same
  way. The isometric city and a third-person shell do not have to expose the same trifecta.
- **Presentation MAY NEVER decide where a hit lands.** Aim originates at the character in JKA
  precisely so the camera cannot corrupt it (§1.6). WWA currently violates the second half in
  PowerWorld (§7.1) while not yet using the first half at all.

⚠ And keep the split visible in the code, or it rots: JKA's version is four copies of the same
compound conditional inlined at four call sites, which is how a rule like this drifts. One
predicate — `shellAllows(f, 'acrobatic')` — read at each site.

### 7.6 MELEE — four things, and the first is the one Robert will feel

**(a) THE SWING IS MEASURED, NOT ASSUMED.** `G_SaberAttackPower` (`w_saber.c:137`) adds power per
unit the **blade base physically travelled since last frame**, with a per-stance tolerance — Strong
gains a point every 8 units of hand travel, Fast needs 24. WWA's `momentumMult` (`melee.js:14`)
reads `|vel|` of the **body**, stamped before the lunge. Those are different quantities: a fighter
standing still and throwing a fast hook has body velocity ~0 and enormous hand velocity.

WWA already has the data — `_animate` drives the arm meshes every frame, so a fist's world position
is available. Storing last frame's fist position per fighter and using the delta would make a
*committed swing* stronger than a *drifting* one, which is what the feel pass was reaching for.
⚠ And take the **per-style tolerance** with it, or the fastest attack wins twice: the whole reason
Raven scales it is *"Otherwise fast would have more advantage than it should since the animations
are all much faster."* WWA's jab/cross/power already have different frame data in
`data/martial.js`; the tolerance belongs in the same table.

**(b) A CHAIN MUST CONSERVE MOMENTUM.** `PM_SaberKataDone` (`bg_saber.c:788`) refuses a Strong-stance
chain outright when `chainAngle < 135 || chainAngle > 215` — the next swing must roughly *reverse*
the blade's direction — and allows a perfect 180° reversal **fewer** repeats than a partial one,
because it is the strongest option. The angle comes from `saberMoveTransitionAngle[8][8]` over eight
quadrants.

This is a real answer to "what makes a combo a combo" that is neither a fixed string nor a free-for-
all, and WWA's `melee.js` has no chain concept at all beyond `strikeCd`. The quadrant table is the
cheap version: give each strike a start and end direction, and let the follow-up be gated on the
angle between them.

**(c) TRANSITIONS ARE WHEN YOU CANNOT BLOCK.** Every transition and bounce row in `saberMoveData[]`
is `BLK_NO` while attacks are `BLK_TIGHT` and idle is `BLK_WIDE`. **Guard state is a property of the
move you are in, declared per-row** — not a separate button-driven flag. WWA's `guarding` is a
boolean the player holds; the trifecta would gain a lot from `melee.js` reading a per-strike
`blocking` field so that *committing* genuinely opens you up, rather than the guard simply being
unavailable because you pressed something else.

⚠ **And commitment is `weaponTime = torsoTimer`** — you cannot act until the animation ends, full
stop. There is no cancel window and **recovery frames do not exist as a separate concept**;
recovery *is* the remainder of the animation. That is simpler than what WWA does with `strikeCd`
and `hitstop` and worth considering as a model, because it cannot desynchronise from the pose.

**(d) DEFENCE BUYS ARC, NOT PROBABILITY.** MP's `blockFactor` (`w_saber.c:9416`) is a **dot-product
threshold**: level 3 blocks within ≈±87°, level 2 ≈±69.5°, level 1 ≈±49.5°, level 0 not at all —
and a thrown saber or a real blade each cost you 0.25 of it. Raven's own comment on the percentage
system they replaced: *"(as you can see, it was STUPID.. for the most part)"*.

WWA's `_front(foe, atk)` (`melee.js:164`) already computes exactly this dot product and compares it
to a **hard-coded `-0.15`**. Making that number come from the sheet — a defensive attribute, a
talent, `guardType` — converts a boolean into a readable, upgradeable stat, with no new machinery
and no randomness. **That is the single cheapest melee upgrade in this document.**

⚠ **What NOT to take from the saber**: the damage model (`2.5 × powerLevel × traceLength ×
(1 − tr.fraction)` summed over a grid of traces) is beautiful and then **clamped to [25, 100]
against anything that is not a saber user**, which throws all of it away for most enemies. And the
knockback helpers openly contradict each other (`G_Throw`'s `* 1.5` vs `G_ApplyKnockback`'s
`/ (mass * 1.5) + 20`). WWA's single `takeDamage` choke point is the better structure; don't trade
it for this.

### 7.7 FOV AND RANGE ARE ONE GESTURE

`chase()` already rides FOV on speed (`_chaseFov = 58 + k * 16`) and distance on speed
(`want = ... + k * 16`). JKA does the same thing but ties both to an **event** rather than a
continuous quantity, and uses an **asymmetric envelope** — slow in, fast out. Steal the asymmetry:
a power that ramps its frame in over ~1s and snaps back in ~0.5s reads as *ending*, where a
symmetric ease reads as drifting. WWA's `damp()` cannot express that (it is symmetric by
construction), so this wants an explicit envelope value, as JKA has.

### 7.8 PAY FOR THE EFFECT, NOT FOR THE BUTTON

`BG_ForcePowerDrain`'s force-jump case (`bg_saber.c:76`) charges by the **vertical velocity you
actually got**, divided by your jump level — a small hop is nearly free, a maximum leap costs 20.

WWA's ability costs are flat `cost` values on the `def` row paid at `pay()`. For anything with a
continuous magnitude — a charged blast, a flight burst, `nova` (which already feeds the whole tank)
— charging the *delivered* magnitude rather than the press is strictly better design and matches
the energy-clarity law already in the manual. It also solves tap-spam for free.

### 7.9 LEVEL SHOULD CHANGE THE QUERY, NOT SCALE A NUMBER

The best-designed thing in the force system: rank does not multiply damage, it changes **what shape
the power is**. Mind trick at L1 is a 256u trace at one target; at L3 it is a 1024u sphere with
**no facing requirement at all**. Lightning is a traceline until L3, when it becomes a 300u arc
with a `dot > 0.5` cone and a per-target LOS check. Push at L1 hits one traced target; at L3 it is
a 180° box query that also knocks down.

WWA's `TYPES` registry already dispatches on a type function with a `def` row, so this is
expressible today: let `def` carry the query shape (`trace` / `cone` / `radius`) and let the
creator's point-buy move a power *up that ladder* rather than up a damage number. That is a much
more interesting purchase than +15% damage, and `abilities.js` needs no new machinery for it.

⚠ Also steal **push/pull as one implementation with a flag** (`ForceThrow(self, qboolean pull)` —
the only difference is which way the subtraction goes, `w_force.c:3441` vs `:3475`).

### 7.10 WHAT TO REFUSE

**Do not copy the force-power architecture.** WWA is already ahead of it and should stay there.
Jedi Academy has no power struct, no power table, and 15–20 files to touch per new power; three of
its tables are dead; two powers squat in each other's state slots; its absorb rule is a hard-coded
allow-list of five power ids — precisely the pattern the WWA damage-type work exists to prevent.
`abilities.js`'s split (behaviour = a `TYPES` function, numbers = a `def` row) means a new
*character* is data and only a new *kind* of power is code. Jedi Academy cannot say that.

**Do the two things it got right anyway**, because WWA has one and not the other:
- **One choke point that every activation funnels through.** `WP_ForcePowerAvailable`
  (`wp_saber.cpp:12797`) is a pure table read and every path goes through it. WWA has this —
  `runSlot` — and should keep it as clean as JKA's SP version rather than as the MP version, which
  has already accreted three hard-coded power-id exceptions.
- **`saber[N].forceRestrictions`** — a per-weapon bitmask indexed by power, read generically, so a
  text file can forbid any power with no code change. WWA's nearest equivalent is `_disarmT` and
  `noPowers`, both single booleans. A per-item/per-state restriction *mask* over ability ids is the
  generalisation, and it is the one place in 30,000 lines of Raven force code where content authors
  got real control.

**Do not copy the transparency-based occlusion fix** (`cg_thirdPersonAlpha` fades the *player*).
WWA's `updateOcclusion` already fades the *occluder*, which is correct and is the modern answer.

**Do not copy `cg_thirdPersonMaxRange`** — a registered, documented, never-read cvar in two shipped
games. If `chase()` grows a dial, something must read it.
