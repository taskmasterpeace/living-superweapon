# Nanite Studio reel resource diagnostic — 2026-09-09

## Verdict

The saved evidence does **not identify either 404 URL**. No missing native audio asset was found: all 266 distinct files in the current 72-family sample manifest exist and are nonempty in both `public/audio/` and the existing `dist/audio/`, including all 174 files in the 44-family preload set. Do not call these errors favicon failures, missing cannon audio, or the cause of the later Chromium crash.

Scope: bounded read-only inspection of the three saved runs, current recorder, native resource-loading code, and local assets. No browser/GPU launch, HTTP requests, build, runtime/harness edits, or camera changes. Only this report was written.

## Saved evidence

| Run directory under `artifacts/` | Saved result |
| --- | --- |
| `nanite-studio-reel` | Warmup and recording each completed 8 simulated seconds. Recording: 8.2004 wall seconds, audio peak 0.349597, two native launches, one contact, zero retained sustained audio handles. Two identical generic console messages: `Failed to load resource: the server responded with a status of 404 (Not Found)`. |
| `nanite-studio-reel-retry` | Same completed functional/audio sequence. Recording: 8.1984 wall seconds, audio peak 0.393383, two launches, one contact, zero retained handles. Same two generic 404 messages. |
| `nanite-studio-reel-final` | Only `faviconRequests: []` and `errors: ["Chromium page crash"]`; ready screenshot exists, but no completed warmup/recording result or video. No identified HTTP failure is saved. |

The first two JSON files contain no resource URL, request type, timestamp, console location, sample-bank warning, or failed-file list. They also lack the `faviconRequests` field now initialized by `tools/nanite-studio-reel.mjs:19`. The current harness records HTTP response URLs at line 15, but that does not retrospectively supply URLs for the older results. Its console listener at line 14 retains only text. Its later favicon route fulfills matching requests with 204; the final empty list establishes no intercepted request, not the origin of earlier errors.

## Native path and asset checks

- Sound enable calls `prepareSamples()` in `src/tool/studio-audio.js:6`, preloading `HOT_SET` and awaiting its pending loads. `src/core/samples.js:160` fetches `audio/<manifest filename>.mp3`, relative to the root-level `studio.html`, then decodes it. Failure stores a null buffer and warns `[samples] missing <filename>` at line 164. The reel does not save warning-level console entries or inspect those null buffers; audible output alone therefore cannot prove every load succeeded.
- Cannon preparation uses native `audio.charge()` → `engine.charge`; validated launch uses `audio.kiRelease()` → `ki.release`. Other native impact/reaction recordings use the same bank. There is no separate nanite URL loader in the inspected path. All manifest variants, not merely a selected random variant, passed the local existence/nonempty check.
- Both reference PNGs loaded by the hidden Studio reference section (`src/tool/studio-main.js:23–24`) exist at their exact paths under `docs/reference/`, including spaces and `[DOWNLOAD]`. The eye texture loaded at `src/engine/hero-skin.js:16` also exists. Their three corresponding emitted PNG assets exist in the current `dist/assets/`. No external font/stylesheet URL was found in `studio.css`.
- There is no local `favicon.ico` at the root, `public/`, or `dist/`, and `studio.html` declares no icon. This makes an automatic icon request a possible missing resource **only if an actual request is observed**. Neither earlier result records such a request, so it is not a diagnosed explanation for the two errors.

Local checks used Node imports of `MANIFEST`/`HOT_SET`, `existsSync`/`statSync` against every resulting MP3 path, selective `JSON.parse` summaries of the saved results, and scoped `rg`/file reads. Existing build outputs were inspected, not regenerated. Current disk presence does not prove historical server responses or successful decoding.

## Specific next diagnostic

On the next separately authorized short run, capture resource provenance **before navigation**, without fulfilling/ignoring any URL: console text **and `message.location()`**, HTTP error response URL/status/request type, request failures, and CDP `Log.entryAdded` plus `Network.requestWillBeSent`/`responseReceived` (URL and initiator). Persist each error immediately on the Node side so a later target crash cannot erase it. Record the actual base URL and phase (boot, import, sound enable, playback), then snapshot null entries from `STUDIO.preview.sound.backend._bank.buf` after sound preparation.

A boot/import/sound-enable/one-loop resource trace is sufficient; another broad GPU/stress batch is not needed to identify a 404. Match the first concrete failing URL to its local path before proposing any fix. Keep the crash as a separate unresolved reliability observation unless new evidence connects it.

## Parent provenance capture — identified, not yet fixed

The short trace was run with `LSW_NANITE_RESOURCE_TRACE=1`, using the untouched native Studio RAF and no recording stream, at `http://127.0.0.1:5189`. The harness now incrementally persists phase-tagged console location and CDP request/response/log records to `artifacts/nanite-resource-trace/resource-events.jsonl`.

It reproduced exactly two console404s. Both are now conclusively identified as **`http://127.0.0.1:5189/favicon.ico`**, once during boot (request17440.178) and once during playback (17440.354). Both CDP responses are404, typeOther, and the console locations name the same URL. Neither automatic icon response reached the page-level response listener, explaining why the earlier listener did not add URLs. No request was fulfilled or ignored by this trace.

Native sound preparation and final sample-bank checks have no failed entries. The native rehearsal passed7s with two launches/contact before the harness correctly failed its zero-error assertion. No browser crash occurred. This establishes the current404 cause, not the cause of the separate prior crash, and does not prove every historical server response.

`index.html` already declares a self-contained gold-lightning SVG favicon; `studio.html` declares no icon. The smallest proposed fix is to reuse that existing app icon in the Studio head, avoiding another requested resource or a new design. No production fix has been applied at this checkpoint. Re-run the same **unfiltered** trace afterwards; removing a test error filter is not a runtime asset fix.
