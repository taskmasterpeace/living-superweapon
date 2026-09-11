DONE
Commit: HEAD task commit (exact hash in handoff; a commit cannot embed its own hash)
RED: `node --no-experimental-webstorage --test tools/news-archive.test.mjs` failed ERR_MODULE_NOT_FOUND for news-archive-adapter.js; browser witness failed loading missing core module.
RED follow-up: real IndexedDB browser test exposed favorite loss on idempotent overwrite (`Archived clip not found: a` after retention); fixed by preserving stored favorite state.
GREEN: archive + recorder focused suite: 49/49 pass (`node --no-experimental-webstorage --test tools/news-archive.test.mjs tools/newscrew.test.mjs tools/news-capture.test.mjs tools/frontline-news.test.mjs`).
GREEN browser: 10/10 real Chromium IndexedDB checks pass at `http://127.0.0.1:5182/powerworld.html`; isolated timestamped DB, no production DB deletion.
GREEN build: `npm run build` exit 0; `git diff --check` exit 0.
Methods: list/get/put/update/remove/stats/setBudget/exportClip/importBackup/close; adapter singleton persist/load/release and snapshot ownership.
Limits: 360 frames, 24 MiB decoded media, bounded JSON backup, WebP/JPEG/PNG only, 120-char titles, 250 MiB default archive.
Retention: metadata/media one transaction; oldest ordinary eviction; favorites never auto-evicted; failed insertion aborts atomically.
Recorder: per-reset match ID, stable clip ID/timestamp, merged actor/target hero union, async saving/error state; legacy live reel remains bounded.
Concern: build retains pre-existing Vite large-chunk/dynamic-import warnings; no new build error.
Report: `.superpowers/sdd/2026-09-11-career-archive/task-1-report.md`
