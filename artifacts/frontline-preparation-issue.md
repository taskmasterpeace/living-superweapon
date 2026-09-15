A clean headless browser on the current combat-release-review dev server remained in frontline preparation beyond180seconds. The capture was rejected as HUD/gameplay proof. Training mode loaded and provided the actual HUD screenshot instead.

Evidence: artifacts/inventory-concept-2026-09-14/current-game-hud.json and the concept verification artifacts. The fallback image is explicitly training mode, not frontline. Reproduce through the normal character selection → Enter with squad flow and inspect PW.game.pwStage.frontlineReady and PW.game._frontlinePreparing. Diagnose the preparation stage/network/asset error rather than extending the timeout indefinitely.

Acceptance: normal entry reaches a controllable ready scenario with a useful visible loading state; record elapsed preparation and any missing asset errors on a fresh profile. No native aerial gameplay video should be called verified from a loading screen.
