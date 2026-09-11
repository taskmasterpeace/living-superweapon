# Live performance capture

In a running match, open **>_** (or backtick), enter `perf`, then close the console
and play normally for eight seconds. Reopen it to read the result.

The report records actual visible-frame FPS, p95/worst frame time, the WebGL GPU
backend, canvas resolution, quality tier, and CPU timings for game/render/HUD/news.
Slow frames are not clamped: a real250ms cadence reports4FPS. Hidden-tab intervals
are counted separately. No graphics settings, actor states or AI are changed.
Temporary timing wrappers restore the exact original methods when finished.

CPU sections overlap (game includes rendering/news); do not add them together.
Render submission timing is not GPU elapsed time. Browser background throttling,
software WebGL, competing tabs and startup compilation need separate diagnosis.
Repeat in the browser/session where the problem happens, not only a test browser.

The full local JSON appears in browser developer-console output under
`[POWERWORLD performance]` and in `game.dev.lastPerformance` for local diagnostics.
Nothing is uploaded. The command loads its diagnostic module only on demand.
