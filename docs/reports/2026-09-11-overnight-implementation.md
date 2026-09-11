# Overnight implementation record

Working checkout: `D:/lsw/.worktrees/sarge-authoring-integration`, based on 59d8c79. Root remains 814d322 until reconciliation. User-authorized scope and 10:30 AM America/New_York review target: [tracker](../gameplay/TRACKER.md). No deployment or push.

## Recovery evidence

Restoring known local authoring fixtures reduced the integration comparison from the historical 67 failures to 26; the root comparison independently had 29 failures. Missing port-5180 prerequisites accounted for nine integration browser failures. Browser tests now accept `LSW_TEST_URL`; current integration server is port 5182.

Repaired inherited spine recovery snap (including a newly exposed 120 Hz release), animation-only finite-ammo fixtures, visible shield fixture, native speech/construct fixtures and stale terrain source expectations. Source-bank mismatch was only CRLF; a narrow LF attribute preserves byte reproducibility. Authored-body shoulder geometry uses render-layer zero; its geometry test now bypasses render-layer filtering without removing the frozen-deformation failure check.

Cape candidate was rejected and restored byte-for-byte: three inherited shipping cloth failures remain. No relaxed cloth assertions. Parked experimental tests also remain failing and are recorded separately. Full acceptance is pending a stable combined revision and broad test/build pass.

## Implemented, awaiting native acceptance

- Alt head look preserves controller heading and firing ray; bounded yaw/pitch and smooth return. Initial 202 tests pass; independent review requested pointer-lock-loss and offscreen-bearing fixes.
- Energy-first PowerWorld guard: first-pass cost is one energy per admitted damage, with existing strong shield efficiency. Only unpaid damage reaches HP. Meter pressure and explicit heavy guard crush create openings; grabs/rear attacks remain counters. Review caught grounded-mode charging and pressure regeneration, now covered and fixed. Legacy city rules remain separate.
- Tab melee restores both previously selected attacks; F3 opens the PowerWorld roster. Held triggers, active clinch, reload and throws prevent remapping. Native controller test proves LMB starts a punch rather than a power.
- Physical movement gears and person carry are active implementation tasks; do not interpret their partial test results as final acceptance.

## Visual and donor evidence

Native free-practice desert viewed at `http://127.0.0.1:5182/powerworld.html`: SARGE, front-line close camera, daylight, clear weather. Outpost, parked aircraft and saved field footage are present. Screenshot in the active conversation records the baseline. No fresh dream-loop score or representative combat performance result yet.

Earth donor audit at `D:/git/ShootEM`, revision 8e0fba7c: prioritize explicit gun anchors, shoulder/hand fitting, per-joint merging and source-rig recognition. Its live soldier is procedural; staged legacy GLBs and the Apache draft are not current gameplay-ready replacements. No AK74 asset identified in examined donor source. Preserve provenance, coordinate/scale/socket contracts and deterministic recipes when adapting assets.

Detailed worker evidence is preserved in `D:/lsw/.superpowers/sdd/2026-09-11-gameplay-consolidation/`; raw recovery logs and fixture manifest are in `D:/lsw/artifacts/gameplay-recovery-2026-09-11/`. These locations contain evidence, not a second competing gameplay plan.

## Native encounter round (09:50–10:00 UTC)

Outbreak is reachable from the real front door. Four grounded actors approached and damaged SARGE; Tab visibly selected Melee and Grab / Throw. The unattended player reached KO/OVERRUN. F3 returned to the roster; this does not establish result-screen retry acceptance. No browser console errors recorded. Capture: `D:/lsw/artifacts/gameplay-recovery-2026-09-11/outbreak-native.png`.

The capture exposed superhero hair and an emissive chest insignia on zombies. Added reusable model.hair (cropped/none) and model.emblem=false options, applied to zombies/security. Updated art needs a fresh capture; the saved frame records the failed first appearance. Thirteen encounter checks pass, including native AI/melee damage and Fighter → Game.onHit → police heat for funded guard hits.

Guard energy is authorable per attack family through def.guardEnergy and explicit defaults in src/data/guard-energy.js. Defaults remain one energy per admitted HP with strong shield efficiency. Fifteen guard checks pass, including authored beam efficiency and unpaid overflow.

Restarted stopped integration Vite on 5182 (session 36706). Browser error-page recovery required fresh tab 2. Root remains unreconciled; full combined acceptance remains pending.

## 10:55 UTC follow-up

Authoring workflows are consolidated in [AUTHORING_PIPELINES.md](../gameplay/AUTHORING_PIPELINES.md). Latest candidate details supersede earlier partial-status paragraphs: movement/form migration300 checks, carry228, beam residue168, storm123, recovery lifecycle46, weighted palm start133. Counts overlap and are not additive. Military NPCs now attach the existing Earth-derived Kuchler package plus separately sourced PowerWorld helmet/carrier (33 checks). Generic dropped-rifle appearance remains a separate visual gap.

Native rain-plus-TEMPEST cast/expiry preserved ambient rain. One-player visible weather capture recorded186.1FPS/p958.4ms/worst12.5ms at900×912quality2; earlier sparring sample retained a275ms worst hitch. Both are scoped diagnostic evidence. Round3 suite ran during active changes and yielded3699/3638/61; weighted hand readiness fixed subsequently, cloth still unresolved. The skin-envelope candidate cost too much and failed extended contact tests; restored runtime awaits a better repair. Source recovery snapshot is saved; no commit or root fast-forward yet.
