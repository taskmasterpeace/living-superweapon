DONE
Commits: initial `92d9f4b`; review-fix commit is HEAD (exact hash in handoff).
Initial RED: missing archive modules failed Node/browser imports; favorite overwrite later failed with `Archived clip not found: a`.
Initial GREEN: 49/49 focused Node and 10/10 real Chromium IndexedDB checks; build and diff-check clean.
Review RED: 2 actual-encoder tests failed `encoder.ownFrames is not a function`; malformed PNG reached post-decode rejection.
Review GREEN: 51/51 focused Node and 15/15 Chromium IndexedDB checks at `http://127.0.0.1:5182/powerworld.html`.
Ownership fix: encoder token claims copy Blobs before `onReady` trim or actual `archiveFieldFootage` replacement revokes live frames.
Validation fix: PNG/JPEG/WebP headers and <=2048 dimensions/4M pixels checked before image decode; malformed/truncated headers fail closed.
Metadata fix: finite fps 1-60, bounded IDs/heroes/shots/text, rename/favorite preserved on retry; blocked late-open connections close.
Deletion witness removes the surviving record and proves both `list()` and `get()` are empty.
Limits: 360 frames, 24 MiB media, bounded JSON/base64 backup, 120-char titles, 250 MiB default budget.
Concern: build has pre-existing Vite large-chunk/dynamic-import warnings only.
Report: `.superpowers/sdd/2026-09-11-career-archive/task-1-report.md`
