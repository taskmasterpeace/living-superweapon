# Flight and Character Studio Implementation Plan

> Execute in this session with bounded subagent implementation and independent review. Preserve all existing user edits; no commits, publishing, dependencies, or map redesign required.

**Goal:** A reference-grounded playable flight/combat pass and a functioning offline presentation editor.
**Architecture:** Shared data profiles drive production motion, camera, rig and editor preview. The editor owns draft/history/persistence; the game owns simulation. ORIGIN remains the kit editor.
**Stack:** Existing Three.js 0.169, Vite 5.4, vanilla JS/CSS, node:test, Playwright.
**Spec:** This document's contracts plus `docs/reference/BFP_CAMERA_AND_POSE_SOURCES.md` and user instructions.

## Global constraints

No map layout or geometry changes. Do not edit `src/data/characters.js` (existing user changes).
No instant beams; no collision-position animation offsets; preserve ragdoll/weapon sockets.
Warm dark/gold UI, no purple except KIVULI. No service or deployment changes.
Persistence is explicitly local browser storage with JSON import/export, not a silent source rewrite.
Keep source-reference constants distinguished from values adapted to this engine.

## Task 1: Shared flight presentation — worker

Files owned: `src/data/flight-tuning.js`, `src/engine/flight-pose.js`, `src/engine/flight-motion.js`,
targeted camera changes in `src/engine/world.js`, `tools/flight-presentation.test.mjs`.

Export plain constants `CAMERA_DEFAULTS`, `MOTION_DEFAULTS`, `POSE_DEFAULTS` from flight-tuning.js.
Camera fields: fov (vertical degrees), range, height, shoulder, boostFov, boostRange.
Motion fields: acceleration, braking, boostAcceleration (response per second).
Pose states: hover, forward, backward, brake, boost. Each has numeric radian fields:
armLx, armRx, armLz, armRz, elbowL, elbowR, hipL, hipR, kneeL, kneeR, headPitch.
Consumers overlay `f.def.model.camera`, `.motion`, `.poses[state]` without mutating defaults.
Body backward flight must stay upright/guarded instead of head-first backwards. Forward boost
must retain the readable character silhouette. Flight tiers outside PowerWorld retain their rules.

- [x] Write tests demonstrating backward inverted pose and missing configurable response/pose.
- [x] Implement state-based pose targets with smooth transitions and shared configurable response.
- [x] Implement centered BFP-informed free camera, configurable per hero; preserve locked combat/collision.
- [x] Run new tests and existing flight-feel/live checks; report remaining reference gaps explicitly.

## Task 2: Profile store and runtime integration — root

Create `src/tool/studio-profile.js` with `profileFromDef(def)`, `validateProfile(profile)`,
`applyProfile(def,profile)`, `loadProfile(id,storage)`, `saveProfile(profile,storage)`,
`removeProfile(id,storage)`, `installProfiles(roster,storage)` and `DraftHistory`.
Version-1 profile: `{version:1,heroId,model:{costume,flightStyle,hairColor},frame,colors,poses,camera,motion}`.
Full frame keys: scale,bulk,broad,head,neck,stance. Reject nonfinite/out-of-range values, unknown IDs
on installation, prototype keys and purple colour choices for non-KIVULI profiles. Never edit powers.
Storage key `lsw.studio.profiles.v1`. Corrupt storage raises a recoverable error, never silently overwritten.
Draft history supports bounded undo/redo, dirty/saved state and redoing after save.

- [x] Write node tests for serialization/validation, per-hero isolation, undo/redo and storage failures.
- [x] Implement pure profiles and safe explicit storage operations.
- [x] Install validated profiles after custom roster installation in boot; fresh matches use them.

## Task 3: Studio editor — root

Create studio.html, src/tool/studio-main.js, studio-preview.js, studio.css; add Vite input and game links.
Operate layout: compact roster left, large real Three.js model viewport center, inspector right,
motion transport below. Match existing warm dark/gold identity; bright neutral studio lighting.
Tabs: Model (costume/frame/colors), Pose (state/joints), Camera (lens/framing), Flight (response).
Use real `Fighter._animate` and `world.chase` behavior through shared production functions; never
a separate imitation of the rig. Preview states plus forward/back/brake cycle, scrub, play/pause,
orbit/front/side/rear/game camera, reference image tray, visible current values and save state.
Save local, undo/redo, reset confirmed in dialog, JSON import/export and Play Test link. Saving
persists; Play Test opens PowerWorld with hero selected. ORIGIN remains reachable for power kits.

- [x] Browser test missing studio route/workflow first.
- [x] Build viewport and controls, clean dispose on hero/model replacement, resize and error fallback.
- [x] Add keyboard-accessible editing, dialogs, honest storage errors and unsaved navigation guard.
- [x] Test edit→undo→redo→save→reload→game, import/export rejection, reset and responsive layout.

## Task 4: Release verification and usability review

- [x] Full ability sweep with contextual exceptions listed, representative multi-fighter soak.
- [x] Build; flight tests; editor tests; real editor screenshots at desktop and narrow widths.
- [x] Independent code/UI review, fix material findings and re-run affected checks.
- [x] Document controls, local storage scope, export workflow and remaining unverified release areas.

## Progress / decisions

User explicitly directed continuous implementation. Existing dirty workspace is retained to preserve
the playable prior pass and user roster edits; no automatic commits or branches. Complete in this plan
means the defined flight/editor release slice, not a claim that every future game roadmap item is shipped.

Completed evidence and usage: `docs/CHARACTER_STUDIO.md`. Added actual ORIGIN → Studio → PowerWorld
authoring roundtrip; 102 catalog descriptions checked. User roster text edits remain untouched.
