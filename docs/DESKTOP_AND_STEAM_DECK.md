# PLAYING LIVING SUPERWEAPON ON DESKTOP AND STEAM DECK

The game now ships as a real desktop application. No browser, no dev server, no terminal, no
mouse, no keyboard. You launch it and you're in the game.

---

## WHAT THIS IS (and what it deliberately is not)

The desktop build is an **Electron shell around the exact same files the web build produces.**
`electron/main.cjs` opens a fullscreen window and loads `dist/index.html` off disk. That's it.

**Nothing in `src/` knows the shell exists.** The game is still web code, still runs in a browser,
still deploys to Vercel. There is no desktop fork to keep in sync — the web build and the desktop
build are the same build. That was the constraint: preserve the game, don't rewrite it.

Three things had to change to make it real, and they're worth knowing about:

1. **`vite.config.js` sets `base: './'`.** Vite defaults to absolute asset paths (`/assets/…`),
   which resolve against the *filesystem root* under `file://`. Without this the packaged app boots
   to a black window with no error. Do not "tidy" this back.
2. **`backgroundThrottling` is off.** Electron throttles animation frames in unfocused windows, and
   this game's simulation clamps its timestep — a throttled window runs in genuine slow motion.
3. **There is a Quit button.** With no keyboard there is no Alt+F4, and fullscreen has no close
   button. The pause menu grows a **⏻ Quit Game** row on desktop only. Without it a Steam Deck
   player is trapped in the app.

---

## BUILDING IT

```bash
npm install
npm run desktop:win      # Windows: portable .exe + an installer
npm run desktop:linux    # Linux / Steam Deck: AppImage + tar.gz
npm run desktop:all      # both
```

Output lands in `release/`.

```bash
npm run desktop          # build and run it locally, without packaging
```

**Note on cross-building — measured, not assumed.** Building the Windows `.exe` on Windows works
with no extra setup (75 MB portable, verified launching). Building the **Linux AppImage from
Windows FAILS** at the final packaging step: the AppImage tool needs a Linux host. What *does*
build cleanly on Windows is `release/linux-unpacked/` — the complete Linux application directory,
including the `living-superweapon` binary. Tar that up and it runs on the Deck.

So the honest state today:

| target | built on Windows? | file |
|---|---|---|
| Windows portable `.exe` | **yes, verified** | `LivingSuperweapon-…-win-x64.exe` (75 MB) |
| Windows installer | **yes** | NSIS `.exe` |
| Linux unpacked dir | **yes** | `release/linux-unpacked/` (281 MB) |
| Linux `.tar.gz` | **yes** | `LivingSuperweapon-…-linux-x64.tar.gz` (110 MB) |
| Linux AppImage | **no — needs a Linux host** | build from WSL, a Linux box, or the Deck |

Use the **tar.gz** path on the Deck below. It's one extra step (extract) and avoids AppImage's FUSE
dependency entirely, which is arguably more reliable anyway.

---

## PLAYING IT ON YOUR STEAM DECK

### Step 1 — get the file onto the Deck

Copy `LivingSuperweapon-0.1.0-linux-x64.tar.gz` from `release/` to the Deck. Any of:

- a USB stick or microSD card
- `scp` over your network (the Deck runs SSH once you enable it)
- upload it somewhere and download it in Desktop Mode's browser

Put it somewhere permanent — `/home/deck/Games/LivingSuperweapon/` is a good habit. **Do not leave
it in `~/Downloads`**; you'll clear that folder one day and break your library entry.

### Step 2 — extract it and make it executable

Press the **STEAM** button → **Power** → **Switch to Desktop**.

Open **Konsole** and run:

```bash
mkdir -p ~/Games/LivingSuperweapon
tar -xzf ~/Downloads/LivingSuperweapon-0.1.0-linux-x64.tar.gz -C ~/Games/LivingSuperweapon
chmod +x ~/Games/LivingSuperweapon/linux-unpacked/living-superweapon
~/Games/LivingSuperweapon/linux-unpacked/living-superweapon
```

**That last line should launch the game.** Confirm it runs in Desktop Mode before going further —
if it doesn't launch here it won't launch from Steam either, and it's far easier to read the error
at this stage.

The binary you point Steam at is:
`/home/deck/Games/LivingSuperweapon/linux-unpacked/living-superweapon`

### Step 3 — add it to Steam

Still in Desktop Mode, open **Steam** → bottom-left **Add a Game** → **Add a Non-Steam Game** →
**Browse**.

Set the file-type filter to **All Files** — the picker hides non-`.desktop` entries by default and
this is where most people get stuck. Navigate to
`/home/deck/Games/LivingSuperweapon/linux-unpacked/living-superweapon`, select it, then
**Add Selected Programs**.

### Step 4 — set the controller layout

Right-click the new entry → **Properties** → **Controller** → set **Controller Layout** to
**Gamepad**.

This is the important step. The Deck defaults a non-Steam game to a desktop/mouse layout, which
makes the sticks move a cursor instead of driving your character. Setting it to Gamepad makes the
Deck present itself as a standard controller, which is exactly what the game's gamepad code
expects.

### Step 5 — play

Switch back to Gaming Mode (desktop shortcut: **Return to Gaming Mode**). Your entry is under
**Library → Non-Steam**. Launch it.

The game opens fullscreen and you drive everything from the pad.

---

## THE CONTROLLER MAP

### In the menus

| | |
|---|---|
| **D-pad / left stick** | move the gold focus ring |
| **A** | confirm |
| **B** | back / close a panel |

The focus ring is geometric, not a tab order — pressing right moves to the thing that is actually
to the right, which is what you want on a grid of character cards.

### In a fight

| | |
|---|---|
| **Left stick** | move |
| **Right stick** | aim |
| **R2 / L2** | primary / secondary power |
| **Square** | strike (tap = jab, hold = HAYMAKER) |
| **Circle** | grab · hoist a car · throw it |
| **L1** | guard (hold) |
| **R1** | dash |
| **Cross** | flight on / rise |
| **L3** | descend while flying |
| **Triangle** | ULTIMATE |
| **D-pad** | your remaining abilities · swap character |
| **Start** | pause |
| **Select** | roster |

### Quitting without a keyboard

**Start** → **⏻ Quit Game**. That row only appears in the desktop build.

---

## TROUBLESHOOTING ON THE DECK

**It launches to a black window.** Almost always the asset-path problem — confirm `vite.config.js`
still has `base: './'` and rebuild. A black window with the game's own audio playing means the page
loaded but WebGL failed; see below.

**The sticks move a mouse cursor instead of my character.** Controller Layout is still on the
desktop preset. Properties → Controller → **Gamepad**.

**It won't start from Steam but works in Desktop Mode.** Usually the folder moved or the binary
lost its executable bit. Re-check both. Also confirm Steam's "Start In" field points at the
`linux-unpacked` directory — the app looks for its resources relative to itself.

**The game runs in slow motion.** The simulation deliberately clamps its timestep, so a low frame
rate reads as slow motion rather than stutter. That's the GPU, not a bug. Drop Render Quality in
Options, or cap the Deck's refresh rate to 40 Hz in the Quick Access menu — this game is far more
pleasant locked at 40 than fluctuating around 60.

**It warns about software rendering.** The game detects SwiftShader and says so in the feed. The
shell already forces an ANGLE/GL path and disables the sandbox on Linux specifically because
SteamOS composites through gamescope; if you still see this, check that the Deck isn't running the
binary through a Flatpak runtime.

**Performance in general.** The renderer has three adaptive quality tiers and drops one when frame
time slips, so it degrades gracefully rather than falling over. You can lock a tier in
**Options → Render Quality** if you'd rather have consistency than peak fidelity.

---

## WINDOWS

`LivingSuperweapon-…-win-x64.exe` in `release/` is **portable** — put it anywhere and double-click.
The NSIS build is a normal installer if you'd rather have a Start-menu entry.

Windows will show an "unknown publisher" warning, because the executable isn't code-signed. Signing
requires a paid certificate; until there's a reason to buy one, click **More info → Run anyway**.

Plug in any standard controller and the same map applies. Keyboard and mouse still work exactly as
they always have — the desktop build adds controller support, it doesn't take anything away.
