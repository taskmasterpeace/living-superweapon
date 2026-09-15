Power World still emits legacy synthesized/arcade-like audio on specific paths even after the bundled audio package is imported.

Confirmed remaining paths:
- `src/engine/melee.js`: an ordinary blocked jab explicitly calls `g.audio.zap(520, imp)`, which selects the energy-zap bank/square oscillator fallback. A physical guard needs its own semantically correct foley assignment, preserving authored overrides.
- `src/core/audio.js`: `impact` uses sine/square oscillators if the real punch sample is not decoded. Audit loading/prewarm rather than silently claiming every event is recorded.
- Remaining `hit.soft` / `land.flesh` tails and aircraft/hover loops require audition/source confirmation. Reload/dry-trigger sourcing is already tracked in #18; ambient decisions in #16.

This pass redirects direct punch.medium/heavy paths to the selected real CC0 recordings and removes unsheathing sounds from random blade swings. It does not claim a full listening review.

Acceptance: replay physical blocked/unblocked punches after a cold load and warm load; show selected cue/source in diagnostics; no accidental electrical zap for ordinary physical guards; preserve explicit Sound Library choices and output silence/mute rules. Retain extra audio assets for later authoring rather than deleting them.
