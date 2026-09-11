# Career Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Accumulate real gameplay highlights across reloads and manage them from a reusable Newsroom, with selected-hero playback.
**Architecture:** Blob-safe IndexedDB archive separate from equipment ownership. Recorder tags and saves finalized clips; bounded live ownership is retained until writes resolve. Newsroom and selection consume metadata and one disposable playback clip at a time.
**Tech Stack:** Existing vanilla JavaScript / Three.js / Vite; native IndexedDB; existing Playwright; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-09-11-reusable-player-systems-design.md`, sections 1, 2, 4 and 6. Inventory/storm/outbreak remain subsequent independently testable subprojects, not canceled features.

## Global Constraints

- Work only in `D:/lsw/.worktrees/sarge-authoring-integration`; runtime `http://127.0.0.1:5182/powerworld.html`.
- Preserve `DESIGN.md` / Impact C, centered BFP third person, all 55 heroes, current city/desert and existing custom profiles.
- Keep the live capture caps at 9 clips / 360 frames / 24 MiB. Default archive budget 250 MiB. Favorites never auto-evict.
- Archive footage is silent (`audio: false`); do not label it audio-enabled. No fake personal history.
- Persist Blobs, not live object URLs. An export is a backup, not a mislabeled video.
- No aircraft expansion, push, deployment or unrelated edits. Clean commit messages without coauthor lines.

### Task 1: Durable archive and recorder adapter

**Files:** Create `src/core/news-archive.js`, `src/engine/news-archive-adapter.js`, `tools/news-archive-browser.mjs`, `tools/news-archive.test.mjs`. Modify `src/engine/newscrew.js` and `src/engine/field-footage.js`. Do not edit HUD, boot or inventory files in this task.

**Interfaces:**

```js
// core factory; injectable indexedDB allows browser tests, not a fake production store
createNewsArchive({indexedDB=globalThis.indexedDB, dbName='powerworld-news-v1'}={})
// async methods
archive.list({heroId='', favoritesOnly=false, event='', limit=100, offset=0}={}) // metadata only, newest first
archive.get(id) // stored metadata + Blob[] frames; null if absent
archive.put(clip) // valid complete metadata + Blob[]; idempotent ID; throws informative errors
archive.update(id,{title,favorite})
archive.remove(id)
archive.stats() // {bytes,count,favorites,budgetBytes}
archive.setBudget(bytes) // validated; does not erase favorites
archive.exportClip(id) // Blob backup with a versioned manifest and frames
archive.importBackup(blob) // validates version/content/limits before transaction
archive.close()
// engine adapter; later UI shares its singleton
getNewsArchive()
persistNewsClip(clip, encoder) // flush, convert owned URLs to Blobs, never mutates/revokes live frames
loadArchivedClip(id) // transient URLs, release() revokes exactly once
```

Metadata includes id, matchId, createdAt, title, tag, heroIds, favorite, fps, priority, width/height, slow window and byte count; default `audio:false`. Preserve existing playback metadata. Use index/cursor iteration for metadata-only paged reads; don't deserialize all frame Blobs just to show a list. Keep metadata/media in separate object stores in one DB transaction.

Recorder: assign one new match ID on reset; every new recording gets stable clip ID and timestamp. Union `actor.def.id`/`target.def.id` across merged highlights; no guessing tags from current selection. On finalize, archive asynchronously after encoder flush; mark write state/error for UI. Persistence must begin with an immutable snapshot of resolved Blob references before trim/reset revokes URLs. Own the admitted write inputs independently of live reset; do not retain unlimited old reels on error. Preserve archiveFieldFootage's legacy bounded in-memory presentation while auto-save operates independently.

Retention: transaction adds a valid new clip and evicts oldest ordinary entries only if required; idempotent retries cannot double count. When favorites fill space, reject new automatic save without losing prior records. All write races serialize through IndexedDB transactions, including budget changes and favorite edits. Database open/upgrade failure rejects visibly; don't cache a rejected promise permanently. Titles are plain text capped 120 chars. Imported backups must be bounded before full decoding (max 24 MiB encoded frames per clip, at most 360 frames, supported WebP/JPEG/PNG MIME); no remote URLs/scripts or decompression bombs. Export/import single-clip backup first; multi-clip UI may export sequentially. Use a documented versioned JSON Blob with base64 only at the export boundary, not in database; cap file size before reading. Validate actual decoded media dimensions where supported.

- [ ] Write failing tests proving persistence after close/reopen, exact hero filter, overwrite/idempotence, favorite-safe eviction, atomic failed insertion, rename/delete, invalid import and buffer ownership through reset.

```js
const a=createNewsArchive({dbName:'archive-test'});
await a.put({id:'a',matchId:'m1',createdAt:1,title:'SOL saves the case',heroIds:['sol'],tag:'ko',fps:12,width:1,height:1,frames:[validImageBlob]});
await a.update('a',{favorite:true}); a.close();
const b=createNewsArchive({dbName:'archive-test'});
assert.equal((await b.list({heroId:'sol'}))[0].favorite,true);
assert.equal((await b.list({heroId:'vega'})).length,0);
```

- [ ] Run `node --no-experimental-webstorage --test tools/news-archive.test.mjs` and `node tools/news-archive-browser.mjs`; record failures before implementation.
- [ ] Implement core/adapter and recorder metadata hook. Test real IndexedDB through Playwright on intended origin. Use isolated DB name; no deletion of user production DB.
- [ ] Run focused new tests plus `node --no-experimental-webstorage --test tools/newscrew.test.mjs tools/news-capture.test.mjs tools/frontline-news.test.mjs`.
- [ ] Commit only owned files. Report red/green output, exact methods and limits, remaining concerns.

### Task 2: Newsroom UI and selection integration

**Files:** Create `src/engine/newsroom-ui.js`, `src/styles/newsroom.css`, `tools/newsroom-browser.mjs`. Modify selection/footage UI module discovered through `collectFootage` call sites, `src/engine/hud.js` only where needed for navigation, `src/boot.js` for one shared open/close route. Consume Task 1 adapter, never duplicate persistence.

**Interfaces:** `NewsroomUI({archive,onClose,roster}).show({heroId}={})`, `.hide()`, `.destroy()`. One reusable modal/full-screen page-level surface opened from title and pause/field footage; same archive for all entry points. `loadArchivedClip(id)` supplies one active decoded clip; release on selection/close. Preserve existing transport/still-save behaviors.

UI follows Impact C: title “NEWSROOM”, total count and storage use, hero and event filters, favorite toggle, paged clip list, dominant TV, selected title/date/participants, play/pause/scrub/next, rename, favorite, confirmed delete, export backup and import. Empty/error/loading states truthful. Export/import one clip per backup documented; existing still export remains. Sequential autoplay advances rather than looping only the selected item forever. “All footage” versus exact hero view is clear. A user action can enable automatic saving if storage unavailable. Use textContent/escaping for titles, never interpolated untrusted markup. Close cancels async selection with generation token and stops RAF/object URLs. Confirm delete via accessible dialog. Avoid deleting next clip from stale selection.

Selection TV uses current selected hero and archived metadata, changing asynchronously without stale results replacing a new selection. Fall back to current session clip only when it actually matches that hero; unknown general footage isn't presented as theirs. Preserve one decoding/render owner. First launch empty message. Menu input gate remains active throughout text entry/import/delete; close restores deliberate prior pause/title state. Landscape/portrait touch targets >=48 CSS px.

- [ ] Add failing browser test using isolated browser context and staged **real valid clip bytes** (label seed as setup, not captured gameplay): open from title, favorite/rename, reload, filter heroes, backup download/import, cancel/confirm delete, close input isolation.

```js
await page.getByRole('button',{name:'Newsroom',exact:true}).click();
await page.getByRole('button',{name:'Favorite clip',exact:true}).click();
await page.reload();
await page.getByRole('button',{name:'Newsroom',exact:true}).click();
await expect(page.getByRole('button',{name:'Unfavorite clip',exact:true})).toBeVisible();
```

- [ ] Implement UI and its existing-game routes, then run browser test at desktop 1440×900 and mobile 844×390 / 390×844. Capture and inspect PNGs and errors/overflow.
- [ ] Verify native gameplay capture → menu → archived clip → reload → playback; staged direct recorder event is separately labeled if deterministic setup needed. Do not claim audio proof from silent WebM.
- [ ] Commit only owned files with report and artifacts paths.

### Task 3: Full-roster identity and favorite selection

**Files:** Create `src/data/hero-roles.js`, `src/engine/roster-portraits.js`, `tools/hero-roles.test.mjs`, `tools/hero-selection-browser.mjs`; modify existing roster-selection presentation module and its browser test without rewriting character abilities.

**Interfaces:** `heroIdentity(def)` returns `{primary,secondary,movement,strengths}` from explicit curated role overrides plus actual def capabilities; unknown/custom definitions fall back to `def.role` and real capabilities. `loadFavoriteHeroes(storage=localStorage)` / `saveFavoriteHeroes(ids,storage)` use a separate versioned key, validate strings and tolerate storage failure visibly. Default favorites `['vega','sol','chainfire','tempest']`; user can unstar all, and empty saved list must not restore defaults.

Use exact spec section 4 role table. “Aerial Ace” is a role; actual movement badge shows current supported flight/ground/grapnel, not promised Mach speed. All 55 and custom entries remain accessible through full roster. Add editable favorite marker/filter and readable primary/secondary role to existing selection, linked to matching archive TV. No new character model or power modifications in this task.

Face grid: consume the live `ctx.ROSTER`, which boot has already installed custom definitions and Studio profiles into. Render accessible card shells immediately and lazily queue base-form portraits via existing `portraitOf(def)` in player-status-portrait.js; it already uses one shared offscreen renderer. Do not create 55 renderers or synchronously bake every portrait in one frame. A small bounded portrait cache must key by stable presentation content, including model/profile/color/asset references, not ID alone. A changed definition on reopen must produce a new portrait; unknown/custom profiles must not be excluded by a shipped-ID whitelist. Keep the singleton live preview through the public `hud.showSelect` route (already used by the YOU tab); add a discoverable “View character” action rather than calling private preview methods or embedding a second live renderer. Mark grid portraits as base form rather than implying an unimplemented progression-form preview.

The richer live selector currently snapshots cards once in `_selBuild`; refresh it when the live roster IDs/presentation fingerprint change so newly authored characters are available. Keep selected hero stable through filtering, with an explicit message when a filter hides it. Selection labels and facts use actual derived heroStats/kitFacts/liftCapacityOf data. UI should explain the two routes rather than imply the face grid itself is the large live preview.

- [ ] Write red tests for override/fallback, no mutation, empty favorites persistence and all 55 valid identities.

```js
assert.equal(heroIdentity(ROSTER.find(d=>d.id==='knightfall')).primary,'Gadget Specialist');
assert.equal(heroIdentity(ROSTER.find(d=>d.id==='vanguard')).primary,'Aerial Ace');
saveFavoriteHeroes([],storage); assert.deepEqual(loadFavoriteHeroes(storage),[]);
```

- [ ] Implement role data and selection bindings; run tests and capture native favorite/filter/hero-switch/reload behavior.
- [ ] Verify face cards lazy-load using one portrait renderer, a changed appearance invalidates its cached face, and a new custom hero appears after reopening both selection routes. Inspect narrow-screen card hit targets and no overflow.
- [ ] Run `npm run build`, related roster/selection/archive tests, and full activation regression. Review full diff and run dream-loop scoped visual comparison; no final visual score without screenshot review.
- [ ] Commit and record passed/failed/unverified gates. Proceed to the separate inventory plan, retaining unmet full-vision requirements.
