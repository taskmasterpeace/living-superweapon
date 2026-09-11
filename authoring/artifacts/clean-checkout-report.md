# Clean-checkout verification — `codex/authoring-pipeline`

**Machine**: `aplineswift`, Windows 11 Pro 10.0.26200, Node v25.8.0, npm 11.11.0, git with the Windows
default `core.autocrlf=true` (global). **Date**: 2026-09-10 (20:05 UTC).
**Branch head cloned**: `fe1a14b4bc8c9a5c7aa66d24ea92191d2c017f18`
("Document authoring workflow, compatibility, performance, limitations and integration handoff").
**Clone left in place**: `D:/pw-clean-check` (HEAD `fe1a14b4bc8c9a5c7aa66d24ea92191d2c017f18`).

Nothing under `D:/lsw` or `D:/powerworld-authoring` was modified. Ports 5180/5181 were not used.

## Verdict

Following `docs/authoring/README.md` "Clean checkout" **exactly as written, on a default Windows git**,
four of the five pipeline steps go red — `validate` 7/11 FAIL, `reproduce` NOT REPRODUCIBLE (11/11
DIFF), `npm test` 32/33 — for one reason the docs never mention: the repository has **no
`.gitattributes`**, so `core.autocrlf=true` rewrites every committed LF text file (recipes, `model.js`,
JSON outputs, fixture manifests) to CRLF at checkout, and every hash the pipeline records is a hash of
bytes.

A **control clone with `core.autocrlf=false`** (scratchpad only, not part of the deliverable) fixes
`build`/`validate` (11/11 valid) and `npm test` (33/33) — but `reproduce` **still** fails, for two
further reasons that are baked into the committed artifacts themselves (see D2, D3). As committed, the
README's line "clean rebuild must match the committed hashes" is not achievable on **any** clean clone.

## Commands run, exit codes, key output

All from `D:/pw-clean-check` unless noted. Logs were captured in full; the lines below are the tails.

| # | command | exit | key lines |
| --- | --- | --- | --- |
| 1 | `git clone --branch codex/authoring-pipeline D:/lsw D:/pw-clean-check` | 0 | 2079 files; `git status` clean; HEAD `fe1a14b4…` |
| 2 | `npm ci` (root) | 0 | `added 426 packages in 35s` (deprecation warnings only) |
| 3 | `cd authoring && npm ci` | 0 | `added 26 packages in 26s` |
| 4 | copy pinned sources (see "Sources" below) + `sha256sum -c` | 0 | 5/5 `OK` |
| 5 | `node authoring/bin/authoring.js baseline` | 0 | `body: 2 samples, max triangles 15060, max bytes 2052305, max draw calls 3` · `equipment: 4 … 4256 … 342056 … 6` · `prop: 12 … 54234 … 2536024 … 25` · `motion: 4 … 0 … 136024 … 0` |
| 6 | `node authoring/bin/authoring.js build` | 0 | all 11 recipes: `build <id> via <adapter>@1 (cache …)` … `unchanged: <id> v1 already holds this content` · **`11 built/unchanged, 0 failed`** |
| 7 | `node authoring/bin/authoring.js validate` | **1** | `FAIL` body.hero-heavy / body.hero-lean / body.hero-standard-female / body.hero-standard (`[hash] $.outputs[0].sha256: hash mismatch for body.json` + `[outputs] … size mismatch`) · `FAIL` motion.cmu-walk-02 / motion.hero-ual / motion.hero-ual2 (same two codes on `pose-bank.json`) · `PASS` creature.field-hound, equipment.carbine, equipment.sidearm, prop.ammo-crate · **`11 packages, FAILURES`** |
| 8 | `node authoring/bin/authoring.js reproduce` | **1** | `DIFF` for all 11 (e.g. `DIFF motion.hero-ual@1 98f34ac7110a vs committed 6c9c14457c29`, `DIFF equipment.carbine@1 547a601ad979 vs committed 81f6869cc836`) · **`NOT REPRODUCIBLE`** |
| 9 | `cd authoring && npm test` | **1** | `ℹ tests 33 · pass 32 · fail 1` — `✖ fixtures are the committed output of make-fixtures (regeneration is deterministic)`; the assertion diff is the on-disk manifest with `\r\n` vs the regenerated one with `\n` |
| 10 | `npm run dev -- --host 127.0.0.1 --port 5182 --strictPort` (background) | — | served; `GET /authoring/viewer/index.html` → 200 after 1s |
| 11 | `PW_AUTHORING_URL=http://127.0.0.1:5182 node authoring/test/browser/viewer.check.mjs clean-checkout` | **1** | `AssertionError [ERR_ASSERTION]: the authoring branch uses its own dev server on 5181` — `'5182' !== '5181'` at `viewer.check.mjs:8:8` (refused before opening a browser) |
| 12 | same script with **only line 8 (the port assert) deleted**, run from a temp copy inside `authoring/test/browser/` (removed afterwards) | 0 | `{"count":11,"state":"11 packages · catalog HAS FAILURES",…,"fixtures":[9 entries]}` · **`PASS viewer rendered 11 packages → authoring/artifacts/clean-checkout.jpg`** (140 KB, screenshot inspected: catalog, 3D body, budgets table render; the four body packages show `INVALID`) |
| 13 | stop the 5182 server (`taskkill /F /T /PID 57100`) | 0 | nothing listening on 5182 afterwards; 5180 and 5181 listeners untouched |

`git status` in `D:/pw-clean-check` after the README sequence: tracked files modified —
`public/authored-assets/catalog.json` (real content change: `"ok": true → false`, per-package
`errors: 0 → 2`, written by `validate`), `authoring/baseline/production-baseline.json` and ten
`authoring/fixtures/**/manifest.json` (rewritten LF by `baseline`/`npm test`; line-ending-only).
Untracked: `assets-src/**` (the five copied sources), `authoring/artifacts/clean-checkout.jpg`.

### Control run (scratchpad `pw-lf-control`, `git -c core.autocrlf=false clone …`, same sources, same steps)

| step | exit | key lines |
| --- | --- | --- |
| root `npm ci` / `authoring npm ci` | 0 / 0 | 426 / 26 packages |
| `baseline` | 0 | identical except `motion: … max bytes 136023` (committed file says **136024**) |
| `build` | 0 | `11 built/unchanged, 0 failed` (all "unchanged") |
| `validate` | 0 | `PASS` ×11 · **`11 packages, all valid`** |
| `reproduce` | **1** | `DIFF` body ×4, `DIFF` motion ×3, `SAME` creature/carbine/sidearm/ammo-crate · `NOT REPRODUCIBLE` |
| `npm test` | 0 | **`ℹ tests 33 · pass 33 · fail 0`** |
| `git checkout -- authoring/baseline/production-baseline.json` then `reproduce` again | **1** | motion ×3 flip to `SAME`; **only the four `body.*` packages still `DIFF`** (`body.hero-standard@1 b29800c70e83 vs committed a697ae0b8a28`) · `NOT REPRODUCIBLE` |

## Sources — what SOURCES.md says vs what exists

Recipes hash exactly these external inputs (from `authoring/recipes/**/recipe.json` `sources`):

| file | needed by | in `D:/lsw/assets-src/`? | in `D:/powerworld-authoring/assets-src/`? | SHA-256 vs SOURCES.md |
| --- | --- | --- | --- | --- |
| `assets-src/quaternius/AnimationLibrary_Godot_Standard.gltf` | motion.hero-ual | yes | yes | match |
| `assets-src/quaternius/AnimationLibrary_Godot_Standard.bin` | motion.hero-ual | yes | yes | match |
| `assets-src/quaternius/library-2/UAL2_Standard.glb` | motion.hero-ual2 | yes | yes | match |
| `assets-src/cmu/02.asf` | motion.cmu-walk-02 | **NO** (`assets-src/cmu` does not exist) | yes (untracked) | match |
| `assets-src/cmu/02_01.amc` | motion.cmu-walk-02 | **NO** | yes (untracked) | match |
| `assets-src/quaternius/base-characters/PROVENANCE.md` | body.* ×4 | committed (tracked) | committed | not listed (see D3) |

I copied the three quaternius files from `D:/lsw/assets-src/` and — because `D:/lsw` has no `cmu/`
directory — the two CMU files from the untracked copy in `D:/powerworld-authoring/assets-src/cmu/`
(hashes verified against SOURCES.md before use; no network fetch was performed). The base-character
`Superhero_*_FullBody.gltf/.bin` files are **not** build inputs (only the committed `PROVENANCE.md`
is hashed; the bodies come from the committed `src/data/hero-body-bank.json`), so they were not
copied; their hashes in `D:/lsw` do match `PROVENANCE.md`'s table.

## Discrepancies between the docs and reality

**D1 — The clean-checkout recipe fails on a default Windows git (CRLF), and neither doc mentions it.**
No `.gitattributes` exists (`git check-attr -a` reports nothing). With `core.autocrlf=true`
(the Git-for-Windows default) every committed LF text file is checked out as CRLF, and the pipeline
hashes bytes:
- `public/authored-assets/motion.hero-ual/v1/pose-bank.json`: git blob = `4827467b…`, 588,648 bytes
  (exactly what the manifest records); checked-out file = `7c254a42…`, 588,649 bytes.
  `body.hero-standard/v1/body.json`: 2,555 → 2,772 bytes.
- `authoring/recipes/equipment/carbine/recipe.json` and `model.js`: git blobs `5847c705…` /
  `c90af105…` equal the manifest's recorded recipe/source hashes; the checked-out CRLF copies hash to
  `a8064d39…` / `35e1e60f…`. So even the three GLB-output packages that pass `validate` come out
  `DIFF` under `reproduce`.
- `authoring/fixtures/valid/fixture.motion/v1/manifest.json` is checked out CRLF, which is the one
  failing test (`fixtures are the committed output of make-fixtures`).
This is the whole of the red run in the faithful clone; the control clone proves it.

**D2 — `baseline` as the first step breaks `reproduce` even on an LF checkout.** The committed
`authoring/baseline/production-baseline.json` records `src/data/*-bank.json` sizes one byte larger
than an LF checkout measures (`136024` vs `136023`, `130277` vs `130276`; `bytesPerFrame` shifts) —
i.e. it was measured on a CRLF working tree. Budget limits derive from it, budgets are inside the
`packageHash`, so re-running `baseline` (README step 4) re-keys the three motion packages. Restoring
the committed baseline flips them to `SAME`. The README does not say the committed baseline is the
reference, or that re-measuring it changes package identity.

**D3 — The four `body.*` packages cannot reproduce on any clean clone.** Their committed manifests
record `assets-src/quaternius/base-characters/PROVENANCE.md` as `f786e54d…` — the **CRLF** hash —
while git stores that file as LF (`150636a2…`). Every other recorded source/recipe hash is the LF
(blob) hash. Only a working tree with CRLF `PROVENANCE.md` **and** LF recipes (the author's own
mixed worktree) satisfies both, so `reproduce` is red for bodies on both the CRLF and the LF clone.
The outputs themselves are byte-identical (`build` reports "unchanged"); only the recorded input hash
differs. SOURCES.md also does not list `PROVENANCE.md` as a hashed build input at all.

**D4 — "copy the files from `D:/lsw/assets-src/`" is wrong for CMU.** SOURCES.md L7–8 and README L17
both point at `D:/lsw/assets-src/`; `D:/lsw/assets-src/cmu/` does not exist. The pair lives only in
the branch worktree `D:/powerworld-authoring/assets-src/cmu/` (untracked) or at the `curl` URLs.
Neither doc gives the reader a single consolidated list of the five files to copy and a ready
`sha256sum -c` block; the reader assembles it from three tables. Copying "assets-src/ from D:/lsw"
literally would also drag in unrelated aircraft/frontline/blend content.

**D5 — `viewer.check.mjs` refuses any port other than 5181 and README does not say so.** Line 8:
`assert.equal(new URL(base).port,'5181',…)` — `PW_AUTHORING_URL` is read (line 7) but any other
port is rejected before Playwright starts. README's "Look at it" block never mentions
`PW_AUTHORING_URL` or the fixed port. Script defect: an env var that exists to point the check at a
server, and a check that forbids pointing it anywhere else. With the assert removed the check passes
(11 packages, 9 fixtures, screenshot).

**D6 — SOURCES.md "None of these files is committed" is not quite true**, and "keeps licensed
binaries under the untracked `assets-src/` tree" describes no mechanism: there is no `.gitignore`
rule for `assets-src/`; `LICENSE.txt`, `base-characters/PROVENANCE.md` and `T_Eye_Brown.png` under
`assets-src/quaternius/` are tracked; the rest are simply not added. README L24 "Licensed source
motion and bodies are not committed" — the bodies effectively are (`src/data/hero-body-bank.json`).

**D7 — Steps write to tracked files, which the README does not say.** `baseline` overwrites
`authoring/baseline/production-baseline.json`; `validate` rewrites `public/authored-assets/catalog.json`
(in the faithful run it flipped the committed `"ok": true` to `false`); `npm test` regenerates the
fixture manifests. A reader who follows the README ends with a dirty tree on every machine.

**D8 — Base-character glTF/bin not called out as non-inputs.** SOURCES.md L33–37 send the reader to
`PROVENANCE.md` but never state that only that markdown file is hashed and the 1.7 MB of glTF/bin is
not needed for the build. Not a blocker; caused a detour.

**D9 — Playwright browser install unverified.** README does not mention `npx playwright install
chromium`; the browser check worked here only because Chromium builds were already present in
`%LOCALAPPDATA%\ms-playwright` from other work. A truly fresh machine would need that step or fail.

**D10 — README numbers that were correct**: "(11 packages)" — yes; "33 tests" — yes (33 on both
clones); package/adapter table matches the built catalog.

## Proposed doc edits (docs only; the repo-level fixes are named but were not made)

1. **README.md L13–23** — replace the clone line
   > `git clone <repo> powerworld && cd powerworld && git checkout codex/authoring-pipeline`
   with `git -c core.autocrlf=false clone <repo> powerworld && cd powerworld && git config core.autocrlf false && git checkout codex/authoring-pipeline`, and add one sentence before the block: *"The pipeline hashes bytes; check out with LF line endings (or the recorded hashes will not match)."* Better: add a `.gitattributes` (`* text=auto eol=lf` or `-text` on `authoring/**`, `public/authored-assets/**`, `assets-src/quaternius/base-characters/PROVENANCE.md`) so the doc needs no warning — that is a repo edit, out of scope here.
2. **README.md L18** — the line
   > `node authoring/bin/authoring.js baseline     # measure production assets → budget limits`
   should not be in the clean-checkout sequence, or its comment must say the committed baseline is the reference: *"# only when production assets change; re-measuring changes budget limits and therefore every packageHash — leave the committed file alone for a reproduce check."* (And the committed baseline should be re-measured on an LF tree — repo edit.)
3. **README.md L21** — the comment
   > `# clean rebuild must match the committed hashes`
   is currently false on any clean clone until the four `body.*` manifests are rebuilt with the LF `PROVENANCE.md` hash (repo edit). Until then, say so: *"# as committed, the body packages record a CRLF source hash and report DIFF on a clean clone — see LIMITATIONS.md."*
4. **README.md L17** — replace
   > `# licensed sources: see SOURCES.md (copy assets-src/ from D:/lsw, or fetch the pinned files)`
   with *"# licensed sources: five files, listed with hashes in SOURCES.md § Checklist (quaternius ×3 from D:/lsw/assets-src/, cmu ×2 from D:/powerworld-authoring/assets-src/ or the curl lines)"*.
5. **README.md L34** — after
   > `node authoring/test/browser/viewer.check.mjs      # catalog + fixture board, screenshot`
   add *"# reads PW_AUTHORING_URL but requires port 5181"* — or, preferably, delete line 8 of `viewer.check.mjs` so the env var actually works (script edit).
6. **SOURCES.md L4–8** — replace
   > "None of these files is committed; the repository convention (already used by `tools/lib/quaternius-source.mjs` and `tools/lib/hero-body-source.mjs`) keeps licensed binaries under the untracked `assets-src/` tree. A build whose source is absent fails naming the file. On another machine, copy the files from `D:/lsw/assets-src/` or fetch them from the pinned mirrors below."
   with a **Checklist** section listing exactly the five build inputs, where each lives on this machine (`D:/lsw/assets-src/quaternius/…`; `D:/powerworld-authoring/assets-src/cmu/…` — not in `D:/lsw`), and a paste-ready `sha256sum -c` block. State that `assets-src/` is not git-ignored, and that `LICENSE.txt`, `PROVENANCE.md`, `T_Eye_Brown.png` are tracked.
7. **SOURCES.md L33–37 (base characters)** — add: *"Only the committed `PROVENANCE.md` is a build input (the body packages hash it); the glTF/bin files are not required to build. Its recorded hash is of the LF file as stored by git."*
8. **README.md "Clean checkout"** — add a line that the sequence writes to three tracked paths (`authoring/baseline/production-baseline.json`, `public/authored-assets/catalog.json`, `authoring/fixtures/**/manifest.json`) so a dirty `git status` afterwards is expected, and add `npx playwright install chromium` before the browser checks.

## Leftovers

- `D:/pw-clean-check` — the faithful clone, left in place as requested, HEAD
  `fe1a14b4bc8c9a5c7aa66d24ea92191d2c017f18`; contains the untracked sources, the modified tracked files
  listed above, and `authoring/artifacts/clean-checkout.jpg`.
- `C:\WINDOWS\TEMP\claude\D--lsw\8b506ba9-3966-4132-b7dd-87c7315cb54a\scratchpad\pw-lf-control` — the
  LF control clone (same HEAD); disposable.
- No servers left running.

---

## Re-verification after the fixes (commit 5f075f1, same clone, default `core.autocrlf=true`)

The findings above (all on `fe1a14b`) were fixed in `5f075f1`: `authoring/.gitattributes` and
`public/authored-assets/.gitattributes` (`* -text`), LF-normalised hashing of text sources in
`authoring/lib/build.js`, an LF-normalised baseline measurement, the five-file source checklist
in `docs/authoring/SOURCES.md` (CMU files are in `D:/powerworld-authoring/assets-src/cmu/`, not
`D:/lsw`), `baseline` removed from the clean-checkout sequence, and `viewer.check.mjs` accepting
any non-5180 `127.0.0.1` port.

Re-run in `D:/pw-clean-check` after `git fetch && git reset --hard FETCH_HEAD && git rm -r --cached . && git reset --hard HEAD`
(forces the new attributes to apply) and copying the two CMU files:

| step | result |
| --- | --- |
| `git ls-files --eol` | `authoring/lib/build.js` and `public/authored-assets/.../pose-bank.json` checked out **LF** (`attr/-text`); `src/data/locomotion-bank.json` still CRLF (outside this branch's folders, and no longer affects any hash) |
| `node authoring/bin/authoring.js validate` | `11 packages, all valid` |
| `node authoring/bin/authoring.js reproduce` | `REPRODUCIBLE: 11 packages rebuilt from committed recipes and pinned sources with identical hashes` |
| `cd authoring && npm test` | `tests 35 · pass 35 · fail 0` |
| `node authoring/bin/authoring.js baseline` (optional re-derive) | identical to the committed baseline; `git status` shows only the untracked sources |

Verified 2026-09-10 on the same Windows 11 / Node 25.8 machine as the audit above.
