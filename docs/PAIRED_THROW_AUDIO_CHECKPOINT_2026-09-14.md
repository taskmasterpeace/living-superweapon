# Power World: paired motion and audio checkpoint

Workspace: `D:/lsw/.worktrees/combat-release-review` · branch: `codex/playable-integration`.

## What changed

- Ordinary hostile person throws now keep the victim attached for a .20-second windup. The release samples current aim and uses the existing launch, collision and damage rules. Repeated input cannot reset anticipation; hitstop pauses it, while incapacitation or broken pairing cancels it. Friendly setdown stays immediate.
- Post-release arms extend along the committed throw direction, then recover within .30 seconds. The overlay changes joints, not physical actor roots or limb lengths. This is a bounded procedural transition, not a newly imported wrestling performance.
- The native aerial demonstration distinguishes attached anticipation from actual release. `demo status` reports the phase, outcome, damage and event times in the Threat Room console. `demo prepare grab`, then `demo play`, runs the existing scenario without recording.
- Sandra's Twin Pistols now select the real bundled pistol recording. Ordinary flesh/fist blocked jabs use the selected physical punch recording rather than calling the energy zap. Author-selected Sound Library recordings remain authoritative; unused audio stays in the library.
- The heavy melee meter remains capped at three ordinary release regions. No additional meter regions were added.

## Missing animations: smallest useful next purchase/review

See [the source report](MISSING_PAIRED_ANIMATION_SOURCES_2026-09-14.md). Raise Creation's Silent Grab & Hostage is the best documented match for rear grab plus victim struggle. Its FBX pairs are listed explicitly. Grab & Throw Takedown is a second option for lifts/slams; RamsterZ Wrestler Finishers V2 is a later expansion.

No paid source was bought, downloaded, retargeted or approved in this checkpoint. A sustained neck choke with hand-prying resistance remains unverified. Import and accept one complete pair before buying breadth. Existing solo pickup/throw takes can help anticipation and recovery, but cannot prove paired contact.

## Sandra and future speech

The current roster defines Twin Pistols, Suppressed SMG, The Ring Sees (reveal buff), Pistol Whip, Tracker Round (sleep payload), Slip the Frame (dash), Clean Extraction (rush) and an Extraction Beacon. Her ring is sentient in the lore; this does not mean a speaking ring is implemented. Clean Extraction's label/lore also does not establish nonlethal damage behavior.

The audio code already provides a voice bus, recording bindings and SpeechGate cooldown/context checks. Dialogue entries explicitly remain preview-only unrecorded candidates; synthesized markers do not speak their lines. Next speech work should bind one approved recorded line to one real event, then verify speaker priority, interruption and repetition before expanding. No narrator, speech service or new Sandra aura was assumed from the ambiguous wording.

## Remaining work, kept focused

- [#19](https://github.com/taskmasterpeace/living-superweapon/issues/19): accepted paired rear hold/resistance and directional victim animations; source findings added.
- [#26](https://github.com/taskmasterpeace/living-superweapon/issues/26): person-throw visual acceptance across directions/body sizes and moving flight. Timing/contact tests alone do not close visual review.
- [#21](https://github.com/taskmasterpeace/living-superweapon/issues/21): low pickup support and payload hand placement. Large vehicle handling is not newly completed here.
- [#25](https://github.com/taskmasterpeace/living-superweapon/issues/25): remaining cold-load audio fallbacks and native listening review; two concrete routing fixes are implemented.
- [#27](https://github.com/taskmasterpeace/living-superweapon/issues/27): obtain/verify a suppressed-SMG recording for Sandra and assign its explicit voice key.

The full audio branch was already merged locally by `687c888`; missing routing is separate from that merge. Nothing in this checkpoint claims every combat sound is recorded or listening-approved. No new video was made, per the current request.

## Verification

- 112 focused integration tests pass, covering current modular release direction, native grab/throw/impact/recovery and airborne stun at 30/60/120 Hz, hitstop and cancellation, friendly carry, audio routing/import preservation and the three-region meter.
- Review found accumulating torso rotation during frozen windup frames. Fixed with a baseline restored before native animation evaluation and on cancellation/release. Repeated-frame production tests now cover windup, recovery and unchanged native yaw damping.
- Production build passes; the existing large-bundle warning remains.
- In-app native Threat Room smoke test completed with visible current modular actors: anticipation 1.07s, release 1.27s, terrain impact 1.43s, recovery/control return 2.63s. Total sequence health loss was 48.0 (not impact-only damage). `artifacts/paired-throw-native-smoke-2026-09-14.txt` preserves the observed console result. This confirms native completion, not frame-by-frame visual acceptance of every pose.
- Logs: `artifacts/paired-throw-audio-integration-tests.txt`, `artifacts/paired-throw-audio-build.txt`. Tests do not substitute for complete visual approval or native audio listening.
