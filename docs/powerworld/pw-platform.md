# POWERWORLD — PERFORMANCE AND PLATFORM BUDGET

Targets, in priority order: **Steam Deck**, **iPad**. Desktop is a bonus.
Every claim carries `file:line`. Guesses are marked **[GUESS]**. Hardware specs not derivable from
this repo are marked **[EXTERNAL]**.

---

## 0. READ THIS FIRST — four structural defects make any PowerWorld tuning meaningless until fixed

I did not go looking for bugs. These four fell out of reading the exact code you asked me to read,
and every one of them lands on a target platform. Tuning a quality ladder on top of them is tuning
a dial that isn't connected.

### 0.1 🔴 `_pixelCap` is a METHOD and the device ladder assigns a NUMBER over it — on iPad the adaptive tier is dead, on iPhone the game does not boot

`world.js:1936` declares it as a method:

```js
_pixelCap(pr) {
  const cap = Math.sqrt(2.6e6 / Math.max(1, innerWidth * innerHeight));
  return Math.min(pr, Math.max(0.55, cap));
}
```

`main.js:95` and `main.js:98` assign over it:

```js
game.world._pixelCap = Math.min(game.world._pixelCap || 2.6e6, 1.35e6);   // phone
game.world._pixelCap = Math.min(game.world._pixelCap || 2.6e6, 2.0e6);   // tablet
```

`game.world._pixelCap` is a function, so it is truthy, so `||` returns the function, so
`Math.min(fn, 1.35e6)` is **`NaN`**. Verified with a node repro of the exact expression:

```
result = NaN
after assign, typeof = number NaN
CALL THROWS: o._pixelCap is not a function
```

`_pixelCap` has been a method since `6c8614d` (checked: `git show 6c8614d:src/engine/world.js` line
694) — i.e. it was already a method when phone mode (`dc34bfc`) and tablet mode (`c75b9b8`) were
written. The property they were written against never existed.

Consequences, in order of severity:

- **iPhone / any short-edge ≤500 touch device: boot dies.** `main.js:96` calls `_applyQuality()`
  directly, which calls `this._pixelCap(...)` at `world.js:1942` → `TypeError`. That call chain is
  reached from the bare `applyPhoneMode()` at **module top level, `main.js:102`** — so everything
  after line 102 never runs: `UINav` (107), `Soundscape` (110), `Tutorial` (115), `Netplay` (117),
  the `enter`/`beginMatch` definitions, and **the rAF loop at `main.js:502`**. The guard at
  `main.js:96` is `_qTier > 1 && !qualityOverride`, and `_qTier` initialises to 2 (`world.js:41`)
  with `qualityOverride` null under the default `quality: 'auto'` (`settings.js:74`,
  `settings.js:174`) — so it fires on a fresh install.
- **iPad: the adaptive quality governor can never move.** `main.js:98` does not call
  `_applyQuality()`, so boot survives — but every *later* call throws: the governor at
  `world.js:1930-1931` and `resize()` at `world.js:1215`. The governor sits inside `render()` inside
  `game.update()` inside the frame try/catch (`main.js:476-498`), so the throw is swallowed and
  counted by `reportError` and **the tier is pinned at 2 forever**. The one mechanism that keeps a
  weak GPU playable is off on the platform that most needs it.
- **iPad: the intended 2.0 MP tablet cap does nothing**, so an iPad renders at the full 2.6 MP
  desktop budget (see §2.2 for what that costs in render-target memory).
- **iPad: every rotation throws an uncaught `TypeError`** out of the `resize` listener
  (`world.js:78` → `world.js:1215`). Lines 1208-1214 complete first, so the resize mostly works and
  only the pixel-ratio re-derivation is lost — which is why nobody noticed.

How this shipped green: on a desktop-sized window neither branch fires at boot, and the phone
screenshots (`lsw-phone-before.jpeg` / `lsw-phone-after.jpeg`) were reachable by *resizing*, where
the throw lands in an event listener and is discarded — and the body-class toggle at `main.js:91`
already happened one line earlier. **The HUD looked right and the pixel cap silently did nothing.**

### 0.2 🔴 The frame-time governor is calibrated for 60 Hz and inverts at 40 Hz — a Deck locked to 40 Hz pins itself to the potato tier

`world.js:1928-1932`:

```js
this._qCool -= 0.016;
if (this._qCool <= 0 && this.qualityOverride == null) {
  if (this._ema > 24 && this._qTier > 0) { this._qTier--; this._applyQuality(); this._qCool = 1.4; }
  else if (this._ema < 17.2 && this._qTier < 2) { this._qTier++; this._applyQuality(); this._qCool = 4; }
}
```

`_ema` is an EMA of the **presented** inter-render interval (`world.js:1915-1917`), and the loop is
rAF-driven (`main.js:474`, `main.js:500-502`), so on a vsync-locked display `_ema` converges to the
refresh interval **regardless of how much headroom there is**.

At a locked 40 Hz the interval is **25.0 ms**. `25 > 24` → drop a tier. At tier 1 the interval is
still 25 ms → drop again. Pinned at tier 0. Walking the cooldowns: `_qCool` starts at 2
(`world.js:41`), decremented 0.016/frame; at 40 fps that is 125 frames ≈ 3.1 s to the first check,
then 1.4/0.016 = 87 frames ≈ 2.2 s to the second. **~5.3 seconds after launch, a Deck at 40 Hz is
at quality tier 0 and cannot climb out**, because 17.2 ms is unreachable at 40 Hz. That means:

| what tier 0 does | where |
|---|---|
| pixel ratio 0.72 (−48% pixels) | `world.js:1942` |
| bloom pass disabled entirely | `world.js:1948` |
| shadow pass disabled | `world.js:1949` |
| wildlife 18 birds / 0 litter | `wildlife.js:137-138` |
| `FETCH_BUDGET[0] = 0` → ink and tilt-shift forced off | `settings.js:135-142` |

This is *exactly* the failure already documented one line away — `world.js:1931`'s own comment says
"13.5 was unreachable under 60Hz vsync — tiers only ever ratcheted DOWN." The same mistake, at the
next refresh rate down, and `docs/DESKTOP_AND_STEAM_DECK.md:180-181` actively tells the player to
lock 40 Hz. The advice and the code disagree.

Also worth noting: `_qCool -= 0.016` is a hardcoded per-frame decrement, not `dt`-based, so a
"1.4 s" cooldown is 2.2 s at 40 Hz and 0.7 s at 120 Hz (iPad Pro ProMotion).

**Fix shape:** the governor must know the target interval, not assume 16.7 ms. Drop when
`_ema > target * 1.35`, raise when `_ema < target * 1.05`, where `target` comes from a measured
median of the fastest observed intervals (or an explicit setting). Do not ship PowerWorld on top of
the current thresholds.

### 0.3 🟠 On the Steam Deck, quality tiers 2 and 1 render at the SAME resolution

`world.js:1942`: `pr = _pixelCap(t === 2 ? _maxPR : t === 1 ? Math.min(_maxPR, 1) : 0.72)`.
`_maxPR = Math.min(devicePixelRatio || 1, 2)` (`world.js:33`).

On the Deck **[GUESS: devicePixelRatio = 1 in the Electron fullscreen build under gamescope — not
verified on hardware]**, `_maxPR = 1`, so tier 2 gives `min(1, cap)` and tier 1 gives
`min(min(1,1), cap)` — **identical**. The 2.6 MP cap never binds either (1280×800 = 1.024 MP, so
`cap = sqrt(2.6e6/1.024e6) = 1.593`, well above 1). Tier 1 therefore differs from tier 2 only in
bloom *strength* (0.66 → 0.55, `world.js:1947`) and the wildlife trim.

So the Deck's three-position quality ladder is really a two-position switch, and the only resolution
step available is tier 0's 0.72 — which is bundled with losing bloom **and** shadows **and** ink at
the same instant. There is no graceful middle rung on the target platform. §4 fixes this by making
the ladder a pixel *budget* rather than a pixel *ratio*.

### 0.4 🟠 `body.deck` almost certainly never activates in the packaged build

`main.js:89-90`:

```js
const padIn = !!(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean));
const deck = !phone && !tablet && (/steam ?deck/i.test(navigator.userAgent) || (padIn && innerWidth === 1280 && innerHeight === 800));
```

Two ways in, and both fail in the shipped Electron app:

1. The UA test wants Valve's *browser* token. `docs/DESKTOP_AND_STEAM_DECK.md:10-15` establishes the
   ship path is Electron loading `dist/index.html`; Electron's UA is Chrome/Electron and carries no
   Steam Deck token.
2. `navigator.getGamepads()` returns nothing until a button is pressed (Chromium gates it behind a
   user gesture), so `padIn` is false at boot. And `applyPhoneMode` re-runs on **`resize` only**
   (`main.js:103`) — `gamepadconnected` is listened to in `gamepad.js:27` but only sets a flag and
   does not re-run the ladder.

Result: `DECK_CSS` (`hud.styles.js:935-950` — the ~15% type-ramp bump for a 7-inch panel at arm's
length, plus 42 px focus targets for stick-driven menus) never applies on a Steam Deck.

Also: `main.js:100` sets `game.pad.preferGlyphs = true` and **nothing anywhere reads it** (grepped
all of `src/`) — a dead flag.

**Fix shape:** `window.LSW_DESKTOP.platform === 'linux'` is already exposed by
`electron/preload.cjs` and is unused by the ladder; that plus re-running `applyPhoneMode` from
`gamepadconnected` closes it.

---

## 1. What `docs/DESKTOP_AND_STEAM_DECK.md` already solves — do not re-plan any of this

| Solved | Where |
|---|---|
| **Packaging is real and one build.** Electron shell around the exact web `dist/`; nothing in `src/` knows the shell exists, so there is no desktop fork | `DESKTOP_AND_STEAM_DECK.md:10-15` |
| `vite.config.js` `base: './'` — absolute asset paths resolve against filesystem root under `file://` and boot to a black window | `DESKTOP_AND_STEAM_DECK.md:19-21` |
| `backgroundThrottling: false` — Electron throttles rAF in unfocused windows and the sim's dt clamp turns that into genuine slow motion | `DESKTOP_AND_STEAM_DECK.md:22-23`, `electron/main.cjs:56` |
| **A way out with no keyboard.** `⏻ Quit Game` in the pause menu, desktop only | `DESKTOP_AND_STEAM_DECK.md:24-26`; wired `hud.js:229`, `283`, `285` via `LSW_DESKTOP.quit` (`electron/preload.cjs`) |
| Build commands and the honest cross-build matrix — **Linux AppImage cannot be built on Windows**; ship the `tar.gz`, which also dodges FUSE | `DESKTOP_AND_STEAM_DECK.md:32-62` |
| The five-step Deck install (copy → extract → `chmod +x` → Add Non-Steam Game with the **All Files** filter → **Controller Layout = Gamepad**) | `DESKTOP_AND_STEAM_DECK.md:66-124` |
| **The full in-fight and in-menu controller map** | `DESKTOP_AND_STEAM_DECK.md:128-161` |
| SteamOS GPU flags: `no-sandbox`, `disable-setuid-sandbox`, `use-gl=angle`, `use-angle=gl`, `ignore-gpu-blocklist`, `enable-gpu-rasterization` | `electron/main.cjs:21-34` |
| SwiftShader detection + in-feed warning | `main.js:51-59`; documented `DESKTOP_AND_STEAM_DECK.md:183-188` |
| Renderer-crash recovery: `render-process-gone` → `win.reload()` (explicitly "GPU crash on a Deck under memory pressure") | `electron/main.cjs:74-78` |
| Geometric (not tab-order) menu focus for a grid of character cards | `DESKTOP_AND_STEAM_DECK.md:138-140`, `core/uinav.js` |
| The slow-motion symptom is explained to the player, with 40 Hz as the remedy | `DESKTOP_AND_STEAM_DECK.md:178-181` |

**PowerWorld needs nothing new from the packaging path.** The two amendments I would make are in
§6, and neither is a new build target.

---

## 2. HARD NUMBERS

### 2.1 Steam Deck

**[EXTERNAL — hardware spec, not derivable from this repo]**

| | LCD (2022) | OLED (2023) |
|---|---|---|
| Panel | 1280×800, 7" IPS | 1280×800, 7.4" HDR OLED |
| Refresh | 60 Hz max; slider **40–60 Hz** | 90 Hz max; slider **45–90 Hz** |
| CPU | Zen 2, 4C/8T, 2.4–3.5 GHz | same, 6 nm |
| GPU | RDNA 2, **8 CU**, 1.0–1.6 GHz → 512 shaders ≈ **1.6 TFLOPS** FP32 | same |
| Memory | 16 GB LPDDR5-5500, **unified**, ~88 GB/s shared CPU+GPU | LPDDR5-6400, ~102 GB/s |
| APU TDP | **4–15 W**, default 15 | same |

**Frame budget.** Reserve ~20% for gamescope's composite blit, Electron's compositor, audio, and the
documented cold GC pause.

| Target | Interval | Budget for our work |
|---|---|---|
| 90 Hz (OLED only) | 11.1 ms | **8.5 ms** |
| 60 Hz | 16.67 ms | **13.0 ms** |
| 45 Hz (OLED floor) | 22.2 ms | **18.5 ms** |
| **40 Hz (LCD floor — the recommended target)** | **25.0 ms** | **21.0 ms** |
| 30 Hz | 33.3 ms | 28 ms |
| **The hard wall** | **50.0 ms** | `game.js:3055` clamps sim `dt` at 0.05 — below 20 fps the game runs in literal slow motion by design of the clamp. Never let PowerWorld reach it. |

**Pixel budget today** (1280×800 = 1,024,000 CSS px, `_maxPR = 1` **[GUESS on DPR]**):

| Tier | pr, per `world.js:1942` | Shaded px | Notes |
|---|---|---|---|
| 2 | 1.00 | **1.024 MP** | bloom half-res @0.66, shadows on |
| 1 | 1.00 | **1.024 MP** | ← identical to tier 2 (§0.3) |
| 0 | 0.72 | **0.531 MP** | bloom off, shadows off, ink off |

**Post-chain memory traffic, computed from the code** — this is the number that decides whether a
15 W shared-bus part is fill-limited. Composer RT is `HalfFloatType, samples: 2` (`world.js:1192`) =
8 B/px; bloom at half res (`world.js:1195`).

At 1.024 MP: RenderPass writes 8.2 MB. Bloom's down/up chain over 5 mip pairs from 0.256 MP
≈ 11 MB of combined read+write. OutputPass 8.2 read + 8.2 write. PrintPass 8.2 read + 8.2 write
(plus 8 cached taps for ink). MSAA resolve ~8 MB. **Total ≈ 60–70 MB/frame.**

- at 60 Hz → **3.6–4.2 GB/s** against ~88 GB/s = **~4–5% of the bus**
- at 40 Hz → **2.4–2.8 GB/s** = ~3%

And the ink pass, priced the way `settings.js:100-109` prices it: 8 fetches/px × 1.024 MP × 60 fps =
**492 M fetches/s**. RDNA2 8 CU has 32 texture units at 1.6 GHz ≈ 51 Gtexel/s → ink is **~1% of
texture throughput**. The fog-of-war plane's 26 taps (`fog.js:52-54`) over, say, 40% of frame =
10.6 M fetches/frame — the same order.

**So: the arithmetic says the Deck is NOT fill-limited at 1280×800, and the post chain is not the
enemy.** The `FETCH_BUDGET` model (`settings.js:135`) is validated by this: ink can stay on at tier
2 on a Deck. The real Deck risks are (a) §0.2's governor inversion, (b) the shadow pass over a
perspective frustum (§3), (c) CPU submit on 4 Zen 2 cores at 15 W under Electron **and** gamescope.
**This is arithmetic, not measurement** — see §7.

### 2.2 iPad — the range to design for

**[EXTERNAL — device specs.]** Every current iPad is **DPR 2**, so `_maxPR = min(2, 2) = 2`
(`world.js:33`). Landscape CSS-point viewport (Safari subtracts a little for chrome):

| Device | CSS landscape | CSS px | Native px at pr=2 | Device ladder rung |
|---|---|---|---|---|
| iPad mini (A17 Pro) | 1133×744 | 0.84 MP | 3.37 MP | TABLET (744 ≤ 1100) |
| iPad 10th/11th (A14/A16) | 1180×820 | 0.97 MP | 3.87 MP | TABLET |
| iPad Air 11" (M2/M3) | 1180×820 | 0.97 MP | 3.87 MP | TABLET |
| iPad Pro 11" (M4) | 1210×834 | 1.01 MP | 4.04 MP | TABLET |
| iPad Air 13" (M2/M3) | 1366×1024 | 1.40 MP | 5.59 MP | TABLET |
| iPad Pro 13" (M4) | 1376×1032 | 1.42 MP | 5.68 MP | TABLET (1032 ≤ 1100) |

Good news: the ladder's thresholds are right. `main.js:84-86` — no iPad falls into PHONE, every iPad
falls into TABLET, and the detection is honest (`main.js:82`: coarse pointer OR touch OR
`maxTouchPoints > 1`, never a UA sniff — correct for iPadOS masquerading as Mac, `main.js:80-81`).

**Design target: the base iPad (A14/A16, 4–5 GPU cores).** Let the M4 Pro coast.

**Safari/WebKit is the only real engine on iOS/iPadOS.** Chrome, Firefox and Edge on iPad are all
WKWebView; there is no second implementation to fall back to and no way to ship your own. **[EXTERNAL]**

**Frame budget.**

| Target | Interval | Budget |
|---|---|---|
| 120 Hz (ProMotion: Pro, Air M2+) | 8.33 ms | 6.5 ms — **do not target this**, see §5.5 |
| **60 Hz (the target)** | 16.67 ms | **12.5 ms** — Safari's compositor takes more than Electron's |
| 30 Hz (fallback) | 33.3 ms | 27 ms |
| Hard wall | 50.0 ms | `game.js:3055` |

**Pixel budget today** (with the §0.1 bug, so the 2.0 MP tablet cap is not applied and the tier is
frozen at 2):

| Device | Tier 2 actual | Tier 1 would be | Tier 0 would be |
|---|---|---|---|
| iPad 11" (0.97 MP CSS) | pr 1.64 → **2.60 MP** | pr 1.00 → 0.97 MP | pr 0.72 → 0.50 MP |
| iPad Pro 13" (1.42 MP CSS) | pr 1.35 → **2.60 MP** | pr 1.00 → 1.42 MP | pr 0.72 → 0.74 MP |

That 2.6 MP is where the render-target memory bites. Composer keeps two ping-pong targets plus the
multisampled primary (`samples: 2`, `world.js:1192`), plus bloom's 5 mip pairs:

- rt1 multisampled: 2.6 MP × 8 B × 2 samples ≈ **41.6 MB**
- rt2: 2.6 MP × 8 B ≈ **20.8 MB**
- bloom chain (half res, 5 mip pairs, 2 targets each) ≈ **25–30 MB**
- **Total ≈ 90–95 MB of GPU render-target memory**

Cutting tier 2 to a 1.6 MP budget takes that to **≈ 58 MB**; additionally dropping to `samples: 0`
on tablets takes it to **≈ 37 MB**. On a platform with a hard page memory ceiling and aggressive
context eviction — and **no `webglcontextlost` handler anywhere in `src/` or `index.html`** (§5.3) —
that is the difference between running and a permanently black canvas.

Asset weight is a non-issue: `public/audio` is 3.6 MB across 300 mp3s, `public/fonts` 88 KB across
4 woff2, and `public/` contains nothing else. **The iOS memory risk is entirely runtime.**

---

## 3. WHAT POWERWORLD MAKES MORE EXPENSIVE, AND WHAT IT MAKES CHEAPER

### 3.1 Cheaper — and here is what each is actually worth

| Dropped | Measured / derived cost | Where |
|---|---|---|
| **Fog of war** — the ground plane's fragment shader marches **26 taps per lit fragment** | rebuild is **0.026 ms** (CLAUDE.md:423); the **march** is the cost and is unmeasured. 26 fetches/px is **3.25× the ink pass's 8** and covers the whole ground plane. Per-pixel, this is the most expensive shader in the game. Switch already exists: `setFogEnabled(on)` | `fog.js:16, 52-54, 96`; `refreshFogBoxes` `fog.js:98` |
| **The news crew's second render pass** — a whole extra `PerspectiveCamera` scene traversal at 320×180, scissored into the corner, with **entities force-shown (no fog) so culling is defeated** | one extra full scene traversal + draw per capture frame, plus 2 extra Fighters and a van. Off switch already exists: `enabled = !!modeId && modeId !== 'training'` | `newscrew.js:19, 47, 165, 513-518` |
| **The directional shadow pass** — 1536² map, 220×220 ortho frustum that follows the camera | `PERFORMANCE.md:93-102` recorded **134 shadow casters** and named it "the single biggest GPU cost after the main pass… scales badly on weak GPUs" | `world.js:89-97`; per-mesh gating `world.js:426` (`castShadow = h >= 44`) |
| **Tower + canopy cutaway** (`updateOcclusion`) | **0.039 ms** (CLAUDE.md:679). Also does **lazy material clone + dispose per building, in the frame path** — real allocation churn | `world.js:1271-1300`; called `game.js:3168` |
| **Wildlife** — 64 birds + 40 litter, 2 instanced draws | **0.047 ms/tick = 0.9% of a frame** (`THE_MAP_MAKER.md:618-619`, CLAUDE.md:449-450) | `wildlife.js:18, 200`; ticked from `world.js:1914` |
| **Pedestrians** — 30 agents (**not 64**; `pedestrians.js:8` says `COUNT = 30` while CLAUDE.md and the comment at `pedestrians.js:247` both still say 64 — stale docs), 2 instanced draws | unmeasured, small | `pedestrians.js:8, 37-38`; ticked `game.js:3115` |
| **Police** — up to `2 + 2·level` officers | not a system cost — each is a **full Fighter**, so it is the per-fighter cost (~40 draw calls, 45–60 meshes) multiplied | ticked `game.js:3116`; frame counts CLAUDE.md body-frame section |
| **City tiles, road graph, junction paint, interiors, trees, grass, lamps, cars, crack overlays** | the density budget is `min(64, round(N²·0.82)+4)` → **Tokyo 79 cover pieces, an 8×8 override 99** (CLAUDE.md:428-429), each destructible with a **transparent crack overlay mesh** (`PERFORMANCE.md:115-121` flagged 16 of those as 16 wasted draws on the flagship — at 79–99 buildings it is 79–99). Grass is one instanced draw of 2400 blades | `world.js:970-978`; `PERFORMANCE.md:115-121` |
| **The terrain heightfield** — a 112×112 subdivided plane with `computeVertexNormals` on big hits | gated to big hits only, ~**0.39 ms/frame** when live (CLAUDE.md destructible-environment section); recompute deferred to one per frame `world.js:1907` | |

### 3.2 More expensive — and the first one decides the whole question

**1. 🔴 The perspective frustum. This is the fact that determines whether PowerWorld is cheaper.**

Today's camera is **orthographic** (`world.js:55-57`) with `frustum = 78` vertical half-height
(`world.js:50`). At 16:10 that is a **box** of fixed cross-section ≈ 250 × 156 world units —
**≈ 39,000 u² of ground, independent of distance.** Everything past it is trivially culled, and the
cost is constant no matter where you point it.

A third-person perspective camera at 60° FOV with a far plane at 1200 u sweeps a truncated pyramid
whose cross-section grows **linearly with distance**: at 1200 u the vertical extent is
`2 · 1200 · tan(30°) = 1386 u` and the horizontal ≈ 2218 u → **≈ 3.07 M u² at the far plane**. That
is roughly **two orders of magnitude** more world in frustum. Everything the ortho box was silently
culling is now submitted.

Two direct consequences:

- **The shadow camera is invalidated.** `d = 110` (`world.js:93-95`) is a 220×220 box sized for a
  250×156 view. A directional shadow over a 1000 u+ perspective view needs either a much larger
  frustum — and `PERFORMANCE.md:96-98` already calls 440×440 at 2048² "simultaneously **expensive
  and low-res**" at ~4.7 u/texel — or **cascaded shadow maps, which do not exist in this codebase**.
  **Recommendation: PowerWorld ships with NO directional shadow at any tier** and relies on the
  contact-shadow discs that already exist per fighter (`parts.shadow`, driven every frame, sinks and
  fades with altitude — CLAUDE.md models section). That is not a compromise; it is the correct
  answer for a flight camera, and it is a genuine saving no city fight can take.
- **`FogExp2` is your draw-distance limiter and it is nearly free.** Density is 0.00055
  (`world.js:45`), tuned for a 250 u view. At 1000 u, `exp(-0.00055 · 1000) = 0.577` → 42% fogged.
  At 2000 u → 0.333. So raising the density for PowerWorld hides a near far-plane naturally instead
  of popping geometry in. Good news: the existing knob does the job.

**2. 🟠 The frame becomes SKY, so PowerWorld is fill-bound where the city was geometry-bound.**

The sky dome is a `BackSide` shader at `renderOrder -1` (CLAUDE.md environment section) — one draw
call, but full-screen overdraw. In the iso view the sky is a sliver at the top of frame; in a flight
view it is most of the frame. That single cheap draw becomes a full-screen fragment pass, and bloom
and the print pass both then run over a frame that is 70% sky.

**This flips which knob matters: pixel ratio and the post chain, not draw calls.**

**3. 🟠 Bloom blows out over a bright sky.** `UnrealBloomPass(res, strength 0.66, radius 0.6,
threshold 0.8)` (`world.js:1195`). Its *cost* is fixed (half-res, resolution-independent of content)
but a sky-filling frame with a sun and afterburner wakes puts far more of the frame above the 0.8
threshold than a dark city street. **You cannot carry the city's `broadcast` preset (`settings.js:80,
122-123`) into PowerWorld unchanged** — that is an art call with a perf tail, because more bloom
means more of the print pass's ink threshold being crossed too.

**4. 🟠 The adaptive governor is a lagging controller and flight changes load faster than it
settles.** `_ema = _ema * 0.9 + d * 0.1` (`world.js:1917`) is a ~10-frame time constant, then a 1.4 s
downshift cooldown / 4 s upshift (`world.js:1930-1931`). **A dive into a dense volume will blow
frames for ~1.5–2 s before the tier moves** — and in a flight game a dive is the normal case, not
the exception.

**5. 🟠 PowerWorld inherits the particle bug in full.** `max = 6000` (`particles3d.js:29-30`);
`this.n` is a high-water mark that never shrinks (`particles3d.js:60`); the report field is
`bufferFloatsUploadedPerFrame: P.max * 8` = **48,000 floats every frame regardless of live count**
(`benchmark.js:114`, diagnosed `PERFORMANCE.md:71-80`). Bandwidth-wise this is nothing (192 KB/frame
= 11.5 MB/s on the Deck's 88 GB/s bus); the cost is the **CPU loop over 6000 mostly-dead slots** and
the driver-side buffer orphan on `needsUpdate`. A beam-heavy flight fight is precisely what pushes
`n` to `max`.

**6. 🟡 PowerWorld inherits every unconditional system tick.** `game.js:3108-3139` calls
`updateItems`, `updatePortals`, `updateSmoke`, `updateSingularity`, `updateSpikes`, `updateFires`,
`checkRingOut`, `updateDecoys`, `weather.update`, `timeFields.update`, `gravityZones.update`,
`updateDomes`, `updateReshaped`, `updatePsyche`, `updateDrops` — every frame, city or not, because
they live in `game.update` and not in the mode. Most early-out. Not worth chasing, but it is why
"PowerWorld drops the city" does not mean "PowerWorld drops the update loop."

### 3.3 NET IT OUT — verify or refute "PowerWorld is cheaper than a city fight"

**Verdict: PARTLY VERIFIED. PowerWorld is meaningfully cheaper on CPU, on the shadow pass, and on
per-pixel ground shading. It is NOT automatically cheaper on the main pass, because the perspective
frustum and a sky-filling frame give back what the city gave up. It is still a big deal for the
Deck — but only if the win is spent deliberately.**

The reasoning, from the recorded numbers:

**CPU: real but not decisive.** Summing what is measured — wildlife 0.047 ms + occlusion 0.039 ms +
fog raster 0.026 ms ≈ **0.11 ms**, plus peds (30 agents) and the police/news Fighters. Against a
recorded **p50 4.2 ms with real rendering** for a 3-minute AI-vs-AI rumble
(`COMBAT_MANUAL.md:1347`, CLAUDE.md:2211), that is single-digit percent. The dominant CPU costs on
record are the **sim loop itself** (`PERFORMANCE.md:37`: update p50 0.5 ms / p95 9.8 ms) and the
particle buffer — and PowerWorld keeps both.

**Draw calls: the city was never the problem, the FIGHTERS are.** `PERFORMANCE.md:107` is explicit:
of 497 draw calls on an 11-fighter flagship rumble, "**11 fighters ≈ 440 of the 497**", because
"every figure part is its own unshared geometry" (`PERFORMANCE.md:104-113`). So dropping the whole
city buys you **~57 draw calls on the flagship**. The lever for PowerWorld is therefore **fewer
simultaneous fighters**, or landing `PERFORMANCE.md` item 4 (share the standard part geometries /
merge static detail meshes) — not the absence of buildings.

**GPU: the wins are ranked, and they are the right kind.** In order:
1. **the fog-of-war march** (26 fetches/px over the whole ground plane) — off, free, no gameplay cost
   in a dimension with no fog-of-war design;
2. **the news crew's second scene render** — off by mode id, already;
3. **the directional shadow pass** — off, replaced by the contact discs that already ship.

Those three are exactly the items `PERFORMANCE.md` ranked 🟠-High-GPU and could not remove from a
city fight. **PowerWorld can remove all three by construction, and that IS the big deal for the
Deck.** What it must not do is spend the saving on a 60° FOV, a 2000 u far plane, and 8 fighters at
tier 2.

---

## 4. THE POWERWORLD QUALITY LADDER

Two structural changes first, because the current ladder cannot express this:

1. **Express tiers as a PIXEL BUDGET, not a pixel ratio.** `_pixelCap` (`world.js:1936`) already has
   the right shape — a target pixel count, with `pr` derived from the real viewport — it just needs
   to be **per-tier instead of one global 2.6e6**, and it needs to stop being a method that a
   caller assigns a number over (§0.1). A pixel budget gives monotonic resolution steps on every
   device and fixes §0.3's collapsed Deck rungs for free.
2. **Decouple "resolution tier" from "which effects are on."** Today tier 0 simultaneously drops
   pixels, bloom, shadows, wildlife and ink (`world.js:1942-1950`). PowerWorld wants shadows off at
   *every* tier and pixels stepped independently.

### 4.1 Proposed tiers — Steam Deck (1280×800, 1.024 MP CSS)

| | **T2 — FIELD** | **T1 — STREET** | **T0 — SURVIVE** |
|---|---|---|---|
| Pixel budget | **1.00 MP** (pr 1.00) | **0.72 MP** (pr 0.84) | **0.47 MP** (pr 0.68) |
| Existing knob | `_applyQuality` → `renderer.setPixelRatio` **and** `composer.setPixelRatio` — `world.js:1943-1945`. ⚠ Both, always: the comment there records that the composer caches its construction-time ratio and tiers "never actually shrank the scene pass" until it did | same | same |
| Bloom | half-res, strength 0.66 | half-res, strength 0.50 | **off** (`bloom.enabled = false`) |
| Existing knob | `world.js:1946-1948` | | |
| Directional shadow | **OFF at all three tiers** — contact discs only | OFF | OFF |
| Existing knob | `sun.castShadow` — currently `t > 0`, `world.js:1949` | | |
| `FETCH_BUDGET` | **8** (ink on — §2.1 prices it at ~1% of Deck texture throughput) | **8** | **0** |
| Existing knob | `FETCH_BUDGET = [0, 8, 16]`, `settings.js:135`; spent by `budgetLook`, `settings.js:136-143` | | Tilt-shift is correctly the first to go, `settings.js:140` |
| Look preset | `field` (fetch 0) or `broadcast` (fetch 8) | `street` | `off` |
| Existing knob | `LOOK_PRESETS`, `settings.js:115-129` | | |
| Fog-of-war plane | **OFF at all tiers** | OFF | OFF |
| Existing knob | `setFogEnabled(false)` — `fog.js:96` | | |
| Draw distance (far plane) | 1400 u | 1100 u | 800 u |
| `FogExp2` density | 0.0009 (→ 45% fogged at 850 u) | 0.0012 | 0.0016 |
| Existing knob | `scene.fog` — `world.js:45` | | |
| Particles `max` | 4000 | 2500 | 1200 |
| Existing knob | **NEW** — `particles3d.js:29` `max` is constructor-only today. Needs a runtime setter; see `PERFORMANCE.md:71-80` for the shrink-`n` fix that should land with it |
| Wildlife | plan-declared off (see below) | off | off |
| MSAA | `samples: 2` | `samples: 0` | `samples: 0` |
| Existing knob | `world.js:1192` — **construction-only today**, changing it needs a new RT |
| Live fighters | **6** | 5 | 4 |
| Live beams | 4 | 3 | 2 |
| Live projectiles | 120 | 80 | 50 |

### 4.2 Proposed tiers — iPad (pixel budget, derived pr per device)

| | **T2** | **T1** | **T0** |
|---|---|---|---|
| Pixel budget | **1.60 MP** | **1.00 MP** | **0.55 MP** |
| → iPad 11" (0.97 MP CSS) | pr 1.29 | pr 1.02 | pr 0.75 |
| → iPad Pro 13" (1.42 MP CSS) | pr 1.06 | pr 0.84 | pr 0.62 |
| → iPad mini (0.84 MP CSS) | pr 1.38 | pr 1.09 | pr 0.81 |
| MSAA | **`samples: 0` at all tiers** — buys back ~20 MB of RT (§2.2) on the platform with the memory ceiling; a tile-based GPU resolves cheaply but the RT allocation is the risk, not the resolve | 0 | 0 |
| Everything else | as the Deck column | | |
| Refresh | **cap presentation at 60** even on ProMotion (§5.5) | | |

The 1.60 MP T2 figure is chosen so render-target memory lands ≈ 58 MB (or ≈ 37 MB with
`samples: 0`) rather than the ≈ 90–95 MB the current uncapped 2.6 MP produces.

### 4.3 The fighter / beam / projectile budget — reasoning and confidence

**These are proposals, not measurements. [GUESS] on the target hardware.** The reasoning:

- The bench harness's heavy scene is **8 fighters** (`benchmark.js:17`) and produced **497 draw
  calls, 116k triangles, 570 scene meshes, 412 geometries** on the flagship
  (`PERFORMANCE.md:44-46`), of which **~440 calls were the 11 fighters** (`PERFORMANCE.md:107`).
  That is ~40 draw calls per fighter.
- The Deck's 4-core Zen 2 at 15 W under Electron **and** gamescope is where draw-call submission gets
  expensive, and it is shared with the sim. 6 fighters ≈ 240 draw calls of figure work plus the
  PowerWorld environment — comfortable; 8 ≈ 320 plus post is where I would expect the 21 ms budget
  to start being interesting.
- Shader programs plateau at **50** across six matches (CLAUDE.md:2213), which is the light-count law
  holding (`world.js` pooled-light discipline; the 14-light fixed pool). **PowerWorld must not break
  it** — never toggle a light's `.visible` or change the scene light count at runtime.

**If you land `PERFORMANCE.md` item 4 (shared figure geometries / merged static detail), every one of
these fighter numbers goes up.** That is the single highest-leverage perf work for PowerWorld and it
is already written as a ticket.

### 4.4 The free win PowerWorld should take on day one

`plan.biosphere === false` / `plan.atmosphere === false` already switch off greenery, wildlife and
litter by construction (`wildlife.js:139-141`; `_buildGreenery` returns early at `world.js:987`).
**Declaring the PowerWorld dimension airless/lifeless gets you the whole vacuum-world law for free,
exactly the way the Moon does** — no new gating code, and `_applyCounts` (`wildlife.js:134-142`)
already correctly arbitrates between the world's opinion and the quality tier's, which is the bug
its own comment records having fixed.

---

## 5. THE iPAD-SPECIFIC PROBLEMS

### 5.1 🔴 Touch cannot express fly + aim + lock + charge + punch simultaneously — and the fix is not a bigger button grid

The layer is `src/core/touch.js` (141 lines): **2 floating thumb zones** (left = move → `pad.lx/ly`,
right = aim → `pad.rx/ry`; `touch.js:40-41, 72-73, 106-109, 118`) and **12 action buttons**
(`touch.js:15-21`: `lmb ● · rmb ◆ · r R · q Q · e E · f H · strike ✊ · guard 🛡 · grab ✋ · dash » ·
fly ▲ · descend ▼`) plus `start ⏸ / select ☰` (`touch.js:23`).

What already works, and works properly:

- **HOLD/CHARGE is real, not tap-only.** `pointerdown` → `cur[id] = true`, `pointerup` → false
  (`touch.js:56-57`), and `apply()` preserves `p.prev` from the previous frame (`touch.js:130-139`)
  so `pressed()`/`released()`/`down()` (`gamepad.js:54-57`) all resolve. Concretely
  `game.js:2825-2826` gives tap-jab vs hold-HAYMAKER on ✊.
- **Aim is genuinely independent of move** — true twin-stick, consumed at `game.js:2735-2738`.
- **Analog magnitude is preserved** (46 px radius, normalised; `touch.js:111-118`).
- `Touch.identifier` is used correctly (captured `touch.js:71`, matched `touch.js:83-85, 90-93`).

The problem is physical, and PowerWorld makes it acute: **both thumbs are already on sticks, so any
button press means lifting a thumb off a stick.** In an isometric brawler you can afford that beat.
In flight combat you cannot — and right now lifting the aim thumb is actively destructive:

> **The aim snaps to the top-left corner of the screen.** When `pad.aiming` goes false,
> `game.js:2739-2741` falls back to `pickTarget(p)` and then to
> `world.screenToGround(m.clientX, m.clientY, …)`. `Input` has **zero touch handlers**
> (`input.js:12-50` is mouse+key only), so `m.clientX/clientY` never leave their initialiser of
> `0,0` (`input.js:7`). Release the aim thumb with no enemy in range and you aim at `(0,0)`.

Actions with **no touch affordance at all**:

| Action | Evidence |
|---|---|
| **Flight MODE toggle** — `p.toggleFlight()` is `KeyF` only (`game.js:2861`). ▲/▼ give held rise/descend (`game.js:2818-2819`) so flight is *reachable*, but the persistent mode PowerWorld is built on is not togglable | `game.js:2861` |
| **Item / gadget** — `game.js:2840-2843` reads `KM.item`, a keycode (`settings.js:11, 18, 25, 40`); `'item'` is absent from `MAP` (`gamepad.js:7-19`). Both the carried item and the `_gear` held-weapon slot are unreachable | |
| **Evade (double-tap move)** — `game.js:2807-2816` iterates `TAP_DIRS` (`game.js:35`), all keyboard codes. The `»` button is **dash**, a different thing (`game.js:2852`) | |
| **Hero swap** — `main.js:470` polls `pad.pressed('swap')` but `'swap'` is absent from `BTNS` (`touch.js:15-21`) | |
| **Hands / weapon slots 1–4** — `main.js:430-433`, keyboard only. And `PHONE_CSS` deliberately **keeps the hands row visible** (`hud.styles.js:900-901`) — the player sees state they cannot change | |
| **Clear hard lock** — acquire works (`game.js:2746`), clear is `KeyT` (`game.js:2747`). A touch player can lock on and never unlock | |
| **Cruise** — Shift only (`game.js:2820`) | |

**Two live bugs in the same file, both worse in PowerWorld:**

- `touch.js:134-137` assigns `p.prev`, `p.cur`, `p.lx..ry` **wholesale**, discarding the physical
  gamepad state built one line earlier at `gamepad.js:47`. **Pair a controller to an iPad and it
  stops working the moment a match starts** (`main.js:164`). iPad + DualSense is a real PowerWorld
  configuration.
- `touch.js:138` sets `p.active = true` **unconditionally**, even with zero input, which forces the
  pad branch at `game.js:2735`/`2778` permanently and kills the mouse-aim path on *any*
  coarse-pointer device — including a touchscreen laptop.

Also stale: `touch.js:6-7` advertises "auto-fire primary on tap" for the right stick and nothing in
the file ever sets `cur.lmb`.

**Design implication for PowerWorld, stated plainly.** Do not solve this by adding buttons. Solve it
by making the flight dimension need fewer *simultaneous* fingers:

1. **Flight is a STATE, not a held button** — in PowerWorld you are always flying, so ▲/▼ become
   pure altitude and the toggle stops being needed at all.
2. **Latch the aim.** Keep the last good aim direction when the thumb lifts, instead of the
   `(0,0)` fallback. One change at `game.js:2739-2741`, and it is a bug fix on every platform.
3. **Charge on the aim thumb.** A press-and-hold *inside* the aim zone should charge the selected
   power while still steering — that puts charge + aim on one finger, which is the only way
   charge + fly + aim coexists on two thumbs.
4. **Lock-on as a toggle, on-screen**, since `KeyT` (`game.js:2747`) has no pad or touch binding at
   all.

### 5.2 🔴 `viewport-fit=cover` is missing, so all 13 `env(safe-area-inset-*)` calls resolve to `0px`

`index.html:5` verbatim:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

`env(safe-area-inset-*)` is used at `index.html:78, 86, 88` and `hud.styles.js:712, 726, 740 (×2),
767, 770, 771, 773, 776, 900` — **thirteen call sites, all resolving to zero**, because iOS only
extends the layout viewport under the notch/home indicator when `viewport-fit=cover` is present. The
touch pad, the system buttons, the radar, the player panel, the hands row and the fixed ENTER bar all
sit at the raw hardware edge. One token.

(Secondary: `maximum-scale=1, user-scalable=no` has been ignored by iOS Safari since iOS 10, so it
buys no zoom suppression either — and there is no `gesturestart` handler anywhere, so pinch-zoom on
the canvas is live.)

### 5.3 🔴 No `webglcontextlost` handler anywhere

Grepped all of `src/` and `index.html`: no `webglcontextlost`, no `webglcontextrestored`. iOS drops
WebGL contexts on memory pressure and on backgrounding. With no listener the canvas goes black
permanently, and because the default action of `webglcontextlost` is never `preventDefault`ed,
restore can never fire even if WebKit offers it.

Note the asymmetry: **the desktop build already has this recovery** —
`electron/main.cjs:74-78` handles `render-process-gone` with `win.reload()`, and its own comment
names "GPU crash on a Deck under memory pressure." The browser build, which is the iPad build, has
no equivalent.

This is why §4.2's smaller render-target budget matters: it is the difference between an eviction
being unlikely and being routine.

### 5.4 🔴 No `visibilitychange` / `document.hidden` handling

Grepped all of `src/` and `index.html`: no `visibilitychange`, `document.hidden`, `pagehide` or
`pageshow`. The only pause hook is `addEventListener('blur', …)` at `main.js:358-360` plus a key
clear at `input.js:49`.

On iOS, app-switching, an incoming call and screen-lock do not reliably fire `blur` —
`visibilitychange` is the event that does. Two consequences: no auto-pause, and **the AudioContext
is left interrupted with nothing to re-`resume()` on return** (iOS suspends it and it stays
suspended). Note that this interacts with the throttling law the desktop shell already respects:
`backgroundThrottling: false` (`electron/main.cjs:56`) exists precisely because a throttled rAF plus
the `dt` clamp at `game.js:3055` reads as slow motion. Safari throttles background tabs to ~1 Hz and
you cannot turn that off — so the iPad **must** pause on `visibilitychange`, not merely tolerate it.

### 5.5 🟠 ProMotion: 120 Hz is a trap you cannot opt out of declaratively

iPad Pro and Air M2+ are 120 Hz, and Safari drives rAF at 120 Hz on them. `_ema` converges to
**8.33 ms**, which is `< 17.2` (`world.js:1931`), so the governor **ratchets up to tier 2 and stays
there** — asking a tablet to render 120 frames of 2.6 MP with the full post chain. And with §0.1's
bug the governor cannot come back down.

There is no way to ask Safari for 60 Hz. You have to skip every other rAF yourself. §4.2 makes that
explicit: **target 60, present at 60, cap it in the loop** (`main.js:474-501`). Halving presentation
rate is worth more than every quality dial combined on that device.

### 5.6 What is actually fine on iPad — say so, and don't re-solve it

- **Audio unlock is correct.** `new (window.AudioContext || window.webkitAudioContext)()`
  (`audio.js:59`) — right prefix; `resume()` guarded on `state === 'suspended'` (`audio.js:88`);
  bound to **`pointerdown`** and `keydown`, both `{once: true}` (`main.js:362-364`). `pointerdown`
  fires for touch on iOS 13+, so this is a genuine user-gesture unlock, not a click-only path.
  (One latent risk: `touch.js:56` calls `stopPropagation()` on every button `pointerdown`, which
  would starve the window-level unlock if a touch button were ever the first gesture. Today the pad
  only exists inside a match, reached by a tap on the title screen, so it cannot be first.)
- **The device ladder's thresholds are right** and the detection is honest — coarse pointer + touch
  points, never a UA sniff (`main.js:80-82`). Every current iPad lands on TABLET.
- **Asset weight is a non-issue** — 3.7 MB total in `public/` (300 mp3s + 4 woff2). Nothing to
  stream, nothing to budget. (Two housekeeping notes: `index.html:8-9` loads **Rajdhani from Google
  Fonts over the network** while the four comic faces are self-hosted — a render-blocking third-party
  request on cellular, and inconsistent; and confirm the deploy excludes `release/` and `release2/`,
  which contain 188 MB Electron binaries.)
- **The orientation gate exists** — markup `hud.js:208`, styles `hud.styles.js:784-792`, activation
  `hud.styles.js:793-796` (pure CSS, `@media (orientation: portrait)` on `body.phone.playing` /
  `body.tablet.playing`). Two caveats: the comment at `hud.styles.js:780-782` says "NO ORIENTATION
  GATE… Landscape is a suggestion, not a requirement" eleven lines above the hard gate that
  contradicts it; and `#touch` goes `display:none !important` while `touch.js`'s own `enabled` flag
  is independent, so rotating mid-drag can latch a stick held (`touch.js:121-126`).

### 5.7 WebKit limitations worth knowing, and which of them actually apply here

| Limitation | Applies? |
|---|---|
| **No WebGL2 compute shaders** | **Irrelevant** — WebGL2 has no compute shaders on *any* platform, and nothing in this engine uses GPGPU. Not a WebKit issue. |
| **No `EXT_disjoint_timer_query_webgl2`** | **Applies, and it matters.** This is the project's own GPU-timing method (`settings.js:100-105`). You cannot use it on an iPad. See §7. |
| Page memory ceiling + aggressive WebGL context eviction | **Applies** — §2.2, §5.3 |
| Background tab throttled to ~1 Hz, not disableable | **Applies** — §5.4 |
| `100vh` is the *largest* viewport, so the canvas overflows by the toolbar height | **Applies.** `#game{width:100vw;height:100vh}` at `index.html:28` — **the render canvas itself** — with no `dvh`/`svh`/`lvh` anywhere and no JS `--vh` shim. Also `hud.styles.js:616, 739, 843`, `overlays.css:99`, `creatorUI.js:33`, `hqglobe.js:49`. The bottom band that overflows is exactly where `.tpad` (`index.html:86`) and the fixed `.startbtn` (`hud.styles.js:726`) live. |
| `devicePixelRatio` can change (Split View, Stage Manager) | **Applies.** Exactly one read repo-wide — `world.js:33` in the constructor — never re-read on resize or rotation. |
| No `touch-action` on the canvas | **Applies.** `touch-action:none` is set on `#touch .tzone` / `.tbtn` (`index.html:79, 89`) but **`#game` (`index.html:28`) and `body` have none**; rubber-band is held off only by `html,body{overflow:hidden}` (`index.html:22`), and `overscroll-behavior:contain` appears solely on `#title` (`index.html:39`). |

### 5.8 The three device CSS blocks, for reference

All three are template strings concatenated into **one** `<style>` at `hud.js:172`
(`CSS + CODEX_MOBILE + PHONE_CSS + TABLET_CSS + DECK_CSS`), so cascade order at equal specificity is
DECK > TABLET > PHONE. All scoped by **body class**, not media query — toggled `main.js:91-93`.

- **`PHONE_CSS` — `hud.styles.js:876-910`**, scoped `body.phone`.
  Hides: hint, radar, kit chips, PiP, city plate, feed lines 3+, the player panel's rank/label rows,
  the slots row, hands highlight, hand note. Moves/resizes: mode bar to top, feed to 38vw micro,
  player panel to a compact top-left strip, hands to top-right at 0.8×, foe bar to top, charge bar
  up to 44vh, announce 0.72×.
- **`TABLET_CSS` — `hud.styles.js:913-932`**, scoped `body.tablet`.
  Hides: hint, slots row, feed lines 4+. Resizes: hands +10% and lifted to 180 px, radar 0.82×,
  player panel to 190 px, kit to 150 px at 0.92×, **touch buttons ×1.18, sticks ×1.15**, thumb zones
  inset 24 px, menu buttons ≥42 px.
- **`DECK_CSS` — `hud.styles.js:935-950`**, scoped `body.deck` for lines 940-943 only.
  No hiding. Type ramp +~15% wholesale via token override (`--t-micro:10px … --t-lg:17px`), menu
  buttons ≥42 px, hint ≤320 px, 3 px focus outline offset. ⚠ **Lines 947-949 (`.slot .sfx`) carry no
  `body.deck` prefix and therefore apply on every platform** — DECK_CSS is not deck-only.

Also load-bearing on a phone and firing *before* PHONE_CSS: the `@media (max-width: 900px)` block at
**`hud.styles.js:708-779`**, which is where the safe-area padding, `touch-action:pan-y`, the fixed
ENTER bar and `#hud .slots{display:none}` (772) actually live. Plus `CODEX_MOBILE`
(`hud.styles.js:863-873`, `@media (max-width: 640px)`).

**CLAUDE.md's stated caps — verified as INTENT, refuted as EFFECT.** Phone 1.35 MP (`main.js:95`)
and tablet 2.0 MP (`main.js:98`) are the written intent; per §0.1 neither takes effect.

---

## 6. THE STEAM DECK SPECIFICS

### 6.1 40 Hz vs 60 Hz — make 40 the first-class target, and fix the governor

`docs/DESKTOP_AND_STEAM_DECK.md:178-181` already tells the player 40 Hz is "far more pleasant… than
fluctuating around 60," and that is the right call for a 15 W part where the CPU and GPU share both
power and a ~88 GB/s bus. At 40 Hz you halve submission rate, halve post-chain bandwidth, and the
25 ms budget is genuinely comfortable for the numbers in §2.1.

**But the code punishes exactly that choice** (§0.2): a locked 40 Hz drives `_ema` to 25 ms, trips
`_ema > 24` (`world.js:1930`) twice, and pins quality tier 0 — bloom off, shadows off, pr 0.72, ink
off — about 5.3 seconds after launch, with no path back because 17.2 ms is unreachable at 40 Hz.
The player chose smoothness and got the potato renderer. **Fix the governor before shipping
PowerWorld**, or the flagship dimension launches on the recommended setting looking its worst.

Recommended PowerWorld defaults on the Deck:
- **LCD: 40 Hz refresh + 40 fps cap**, tier 2 per §4.1. 21 ms of budget.
- **OLED: 45 Hz.** (90 Hz is available and is the wrong trade at 15 W.)
- **60 Hz as an opt-in**, gated to tier 1 (0.72 MP) by default.

### 6.2 TDP

**[EXTERNAL]** The APU slider is 4–15 W and it splits between CPU and GPU. §2.1's arithmetic says
the Deck is not fill-limited at 1280×800 (post chain ≈ 4–5% of bandwidth, ink ≈ 1% of texture
throughput), so the pressure lands on the **4-core CPU** — draw-call submission plus the sim plus
Electron plus gamescope. That inverts the usual advice: on the Deck, PowerWorld's lever is **fewer
fighters and fewer draw calls per fighter**, not lower resolution. Which is exactly what
`PERFORMANCE.md:104-113` item 4 is a ticket for.

One shell flag to reconsider: `electron/main.cjs:35` sets `disable-frame-rate-limit`, commented "let
the adaptive quality tier decide." With a 40 Hz target that fights you — the app renders as fast as
it can, gamescope drops frames, and frame *pacing* gets worse than letting vsync gate it. On the
Deck, pacing beats throughput.

### 6.3 The controller layout — what exists and what PowerWorld adds

`docs/DESKTOP_AND_STEAM_DECK.md:142-158` is complete for the current game and needs no rework. What
PowerWorld will want and the map does not have:

| Need | Current state |
|---|---|
| **Clear hard lock** | `KeyT` only (`game.js:2747`) — no pad binding, no touch binding. A pad player can lock and never unlock. |
| **Hands / weapon slots 1–4** | Line 156 gives the D-pad to "remaining abilities · swap character". CLAUDE.md's own THE HANDS note already flags this: *"the pad D-pad binding is already mapped to Q/E/F and hero swap — a real conflict, written in THE_HANDS.md."* PowerWorld will make it worse, not better. |
| **Camera recenter / look-behind** | Does not exist — there is no camera the player can turn today (fixed isometric, `world.js:52`). A third-person flight camera needs at least a recenter. |
| **`body.deck` styling** | Does not activate in the packaged build (§0.4). |

### 6.4 Does the packaged build path need anything new for PowerWorld?

**No.** The one-build discipline (`DESKTOP_AND_STEAM_DECK.md:10-15`), `base: './'`,
`backgroundThrottling: false`, the quit IPC, the SteamOS GL flags and the AppImage-from-Windows
limitation are all unchanged by a new dimension. Two amendments, neither a build target:

1. Add a reliable Deck signal to `applyPhoneMode` — `window.LSW_DESKTOP.platform === 'linux'` is
   already exposed (`electron/preload.cjs`) and unused — and re-run the ladder from
   `gamepadconnected` (`gamepad.js:27`). §0.4.
2. Reconsider `disable-frame-rate-limit` (`electron/main.cjs:35`) against a 40 Hz target. §6.2.

---

## 7. THE MEASUREMENT PLAN

### 7.1 The traps this project has already paid for — do not re-pay them

| Trap | Where it is written down |
|---|---|
| **CPU timing around `render()` measures SUBMISSION, not GPU work.** It once reported tilt-shift as *faster* than everything off | `PERFORMANCE.md:18-20`; `benchmark.js:69-71` stubs render for exactly this reason (`benchmark.js:72`) |
| **`readPixels` does force a flush but costs ~3 ms of round trip**, which buries a 0.05 ms signal completely | CLAUDE.md, THE LOOK LADDER |
| **`EXT_disjoint_timer_query_webgl2` is the right tool, and at 1280×720 on a 4090 every effect came back NEGATIVE** — below the noise floor. It had to be re-run at 3840×2160 so fragment cost dominates | `settings.js:100-105` |
| **A hidden / backgrounded pane early-outs and reports nonsense**: `renderer.info.render.calls === 1`, `_ema` reads ~98 ms because rAF throttles to ~10 fps. That is a compositor artefact, not the pipeline | CLAUDE.md, "Rendering & performance" + the ATLAS v1 note. Only SIM timing is meaningful there |
| **`renderer.info` after `composer.render()` reflects only the final output quad (1 call).** The workaround is `info.autoReset = false` + one direct `renderer.render(scene, camera)` | `benchmark.js:94-100` |
| **Two spikes are real and are NOT defects**: the first frame of a match costs ~47 ms (86 geometries + 4 programs) and one cold-run frame costs ~90 ms while allocating nothing (a GC pause). Report them, don't chase them | `COMBAT_MANUAL.md:1352-1356` |
| **If you test a gated route, drive the GATE.** LOW ORBIT was measured by *setting* the altitude and shipped unreachable because the deck servo pinned the player 71 u below the trigger | CLAUDE.md, LOW ORBIT TRAVEL |
| **Assert the INVARIANT, not the value**, when a per-frame system rewrites what you wrote | CLAUDE.md, THE DIRECTION TRIANGLE (four wrong test versions) |
| **A vacuous pass can go green.** `[].every()` is `true` — prove the harness sees something before asserting anything about it | CLAUDE.md, THE SLOT SAYS WHAT IT IS |

### 7.2 The trap that is NEW for these two platforms

**On the Steam Deck, 1280×800 IS the target resolution — so the `settings.js:100-105` noise floor
applies at the very resolution you care about, and you cannot rank the post chain there.** That
splits the work into two different questions on two different rigs:

- **"Which effect costs more?"** → desktop, 3840×2160, `EXT_disjoint_timer_query_webgl2`. Ranking
  only. This is the method `settings.js` already documents.
- **"Does it fit the budget?"** → on the Deck, at 1280×800, measure **total presented frame interval
  only**. Do not try to attribute it.

**On iPad there is no timer query at all** (§5.7), so measure **rAF timestamp deltas and nothing
else**, plus Safari Web Inspector's timeline over USB from a tethered Mac. Any per-effect attribution
on iPad is not available; accept it and say so rather than inventing a number.

### 7.3 What to measure, concretely

**A. A PowerWorld bench scenario.** `benchmark.js` is city-specific — `HEAVY_ROSTER`
(`benchmark.js:17`) into `game.startMode('rumble', …)` (`benchmark.js:43`). PowerWorld needs its own
deterministic scene in the same harness, and it must **drive the gate**: actually fly the camera
along a route, do not write positions. Keep the harness's own structure — it is right: snapshot and
restore the mutated state (`benchmark.js:35-38`), warm up with real rendering before measuring
(`benchmark.js:66`), then phase 1 with render stubbed and phase 2 as a render-submit micro-bench
(`benchmark.js:68-91`).

**B. Per platform, per tier, report:**

| Metric | How | Why |
|---|---|---|
| Presented frame interval p50 / p95 / **p99** / count over 25 ms and over 50 ms | rAF timestamp deltas | 50 ms is the `game.js:3055` slow-motion wall. p99 is what the player feels |
| `update` ms p50 / p95 | `benchmark.js:79-83` | separates sim from GPU |
| `hud` ms | `benchmark.js:81-83` | scales badly on weak hardware — `PERFORMANCE.md:132-138` |
| draw calls / triangles / scene meshes / shadow casters / transparents | `benchmark.js:96-102`, with the `autoReset` workaround | PowerWorld's frustum question (§3.2) shows up here first |
| geometries / textures / **programs** | `benchmark.js:113` | programs must plateau (CLAUDE.md:2213 says 50). A climbing count is the light-count law breaking |
| particles `peakN` vs `live` | `benchmark.js:114` | proves whether §3.2 item 5 was fixed |
| heap growth over the measured window | `benchmark.js:115` | Chrome only; `--enable-precise-memory-info` (`PERFORMANCE.md:30`) |
| **`_qTier` over time** | `world.js:1941` | **new, and non-negotiable.** §0.2 and §0.1 are both invisible unless you log which tier you were actually in. A benchmark that does not record the tier is not reproducible |
| **effective pixel ratio and shaded pixel count** | `renderer.getPixelRatio()` — `benchmark.js:116` already reports it | §0.3's collapsed rungs are invisible without it |

**C. Four specific regression assertions PowerWorld should ship with:**

1. **`_pixelCap` is still a function** after `applyPhoneMode()` runs in all three device modes. One
   line, and it catches §0.1 forever. Drive it through `window.LSW_phone()` (`main.js:104`).
2. **The governor reaches tier 2 at a simulated 40 Hz.** Feed synthetic 25 ms intervals and assert
   the tier does not ratchet down. §0.2.
3. **Tiers 2 / 1 / 0 produce three distinct shaded pixel counts** at 1280×800. §0.3.
4. **Programs plateau across six consecutive PowerWorld matches** — the light-count law.

**D. Where to measure what:**

| Rig | Question |
|---|---|
| Desktop, 3840×2160, timer query | Rank the post chain. Nothing else. |
| Desktop foregrounded, windowed to 1280×800 | Cheap proxy for the Deck's *pixel* load. Not for its CPU. |
| **Steam Deck, packaged Electron build, Gaming Mode, at 40 Hz and at 60 Hz** | Total frame interval + `_qTier` over time. Nothing here is substitutable — gamescope, 4 Zen 2 cores at 15 W, and the Electron compositor are all in the loop and none of them exist on a desktop. |
| **iPad (base model), Safari, landscape, tethered to Safari Web Inspector** | rAF interval + Web Inspector timeline. Also: rotate, background and foreground the app, and confirm the context survives. |
| Never | A hidden or backgrounded browser pane, for anything that includes `render()`. |

---

## 8. WHAT I COULD NOT VERIFY

**Not run on hardware.** Everything in this document is from reading the source, the docs, and
arithmetic. **No number here was measured on a Steam Deck or an iPad.** In particular:

1. **The §0.1 crash was verified by reading + a node repro of the exact expression, not by booting
   the game on a phone or an iPad.** The reasoning chain is short and I am confident in it, but the
   observable symptom (a dead iPhone title screen; a frozen quality tier on iPad) is inferred.
2. **`devicePixelRatio` on the Steam Deck in the packaged Electron build under gamescope.** I assumed
   1. Every Deck pixel-budget figure in §2.1 and the §0.3 collapsed-tier finding depend on it. If
   gamescope reports a fractional DPR, tier 2 and tier 1 may already differ. **Check this first —
   one `console.log`.**
3. **All Steam Deck and iPad hardware specs** (CU count, TFLOPS, memory bandwidth, TDP range,
   refresh sliders, iPad CSS viewport sizes and GPU core counts) are external knowledge, not
   derivable from this repo. The CSS-point viewports in §2.2 are especially worth confirming against
   real `innerWidth`/`innerHeight` on device, since Safari subtracts chrome.
4. **Whether `body.deck` actually fails to activate on a real Deck** (§0.4). The Electron UA and the
   gamepad-gating behaviour are both external. The code path is unambiguous; the environment is not.
5. **All fighter / beam / projectile live budgets in §4.3.** Proposals reasoned from
   `PERFORMANCE.md:107` and `CLAUDE.md:2211-2213`. Nothing has been measured at any of these counts
   on either target.
6. **My memory-traffic and texture-throughput arithmetic in §2.1.** Load-bearing for the conclusion
   "the Deck is not fill-limited at 1280×800," and it is arithmetic over the RT formats in
   `world.js:1192, 1195` — not a profile. It ignores compression, cache hits, tile-based
   optimisations and gamescope's own composite. Treat the *conclusion* as a hypothesis to test, not
   a result.
7. **The composer render-target memory figures in §2.2** are estimated from three.js's allocation
   pattern (two ping-pong targets + a multisampled primary + `UnrealBloomPass`'s 5 mip pairs). I did
   not read three.js's source to confirm the exact target count, and I did not instrument
   `renderer.info.memory` on an iPad.
8. **The perspective-frustum area comparison in §3.2** uses an assumed 60° FOV and a 1200 u far
   plane. **PowerWorld has no camera yet** — `grep -rn "POWERWORLD\|powerworld\|PowerWorld"` over the
   whole repo returns **nothing**, so every PowerWorld-specific number is a design proposal against
   a dimension that does not exist in the code. The three `PerspectiveCamera` precedents that do
   exist are `newscrew.js:47` (FOV 34, far 1100), `hqglobe.js:137` (42, far 40000) and
   `spaceflight.js:84` (52, far 60000).
9. **Which of the `PERFORMANCE.md` backlog items have since landed.** That document is dated
   2026-07-23 and its closing line says "Nothing here is implemented yet." Some have clearly landed
   (shadow map is 1536² not 2048², `world.js:90`; `castShadow` is gated to `h >= 44`, `world.js:426`;
   programs plateau at 50 vs the recorded 112). **I did not audit the particle fix (item 1) or the
   shared-figure-geometry fix (item 4)** — `particles3d.js:60` still shows the high-water `n` that
   never shrinks, so item 1 looks open, but I did not confirm item 4 either way. Both are load-bearing
   for §3.3 and §4.3.
10. **Whether `wildlife.enabled` is true in every mode** (`wildlife.js:201`). I read the
    `plan.biosphere` / `plan.atmosphere` gating (`wildlife.js:139-141`) and the tier trim
    (`wildlife.js:137-138`) but did not trace every writer of `enabled`.
11. **The exact CPU cost of pedestrians and police.** Neither has a standalone measurement anywhere
    in the docs. I reasoned about them structurally (30 instanced agents; police as full Fighters)
    rather than quoting a number.
12. **The fog-of-war march's actual cost.** I priced it in *fetches per pixel* (26, `fog.js:52-54`)
    against ink's 8 (`settings.js:108`) because that is this project's own predictor, but the march
    has never been timed and I do not know what fraction of a PowerWorld frame the fog plane would
    even cover. It is my top-ranked GPU win and it is the least measured claim in §3.1.
