Implemented in the current `codex/playable-integration` worktree:
- .20s attached anticipation; release-time aim sampling and existing physical launch/damage.
- Repeated input cannot reset windup; hitstop pauses it; incapacitation, invalid pairs and victim-side release cancel cleanly.
- Both arms extend toward committed release direction then recover within .30s; no visual root travel or limb scaling.
- Review caught torso overlay accumulation under repeated render/hitstop. Baseline restore before native pose evaluation and on cancellation fixes windup and recovery drift, with production-frame regressions.

112 focused integration tests and production build pass. Actual in-app Threat Room `demo prepare grab` / `demo play` / `demo status` completed using current modular models: attached anticipation1.07s, release1.27s, terrain impact1.43s, control return2.63s;48.0 total sequence damage (not isolated impact damage). Evidence `artifacts/paired-throw-native-smoke-2026-09-14.txt` and `artifacts/paired-throw-audio-integration-tests.txt`.

Keep open for close visual acceptance of brief throw poses across directions and sizes. No video was recorded per user request. A real paired resistance/choke animation is separately tracked in #19; no purchased source has been imported or accepted.
