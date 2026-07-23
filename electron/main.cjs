// WAR WORLD: ASCENDANTS — the desktop shell.
//
// This is deliberately thin. The game is untouched: Electron loads the SAME built files Vite
// produces for the web, from disk, in a fullscreen window with no browser furniture. Nothing in
// src/ knows this file exists, which is the point — the web build and the desktop build can never
// drift apart.
//
// Design rules for this file:
//  · The window opens FULLSCREEN with no menu and no chrome. There is no "browser" to see.
//  · backgroundThrottling MUST be off. Electron throttles rAF in unfocused/occluded windows, and
//    this game's sim clamps dt at 0.05 — a throttled tab runs in slow motion by design of the
//    clamp. On a handheld that reads as the game breaking.
//  · No Node in the renderer. contextIsolation on, nodeIntegration off. The game is web code and
//    stays web code; the only bridge is the tiny preload API below.
//  · Controller-only means there must be a way OUT without a keyboard — see the quit IPC.

const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');

// Steam Deck / SteamOS ships a sandbox that can refuse to start under some Proton/Flatpak setups,
// and gamescope composites us anyway. Disabling it here is what makes the Deck launch reliable.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
  // Force a GPU path that works under gamescope on SteamOS.
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'gl');
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
}
// The game is GPU-bound; never let Chromium fall back to software WebGL silently. (The game itself
// warns in-feed when it detects SwiftShader — this makes that case rarer.)
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('disable-frame-rate-limit');   // let the adaptive quality tier decide

let win = null;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    width, height,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0d0f14',        // matches the game's --ink so there is no white flash
    show: false,                       // reveal only once the first frame is ready
    title: 'WAR WORLD: ASCENDANTS',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,                  // preload needs require(); the renderer still has no Node
      backgroundThrottling: false,     // ⚠ see header — throttling makes the sim run in slow motion
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { win.show(); win.focus(); });

  // A game window should never spawn a browser tab. Anything trying to open a URL goes to the
  // user's real browser instead, and in-window navigation away from the game is refused outright.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // If the renderer dies (GPU crash on a Deck under memory pressure), say so instead of leaving a
  // black rectangle the player has to force-quit.
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[LSW] renderer gone:', details.reason);
    if (details.reason !== 'clean-exit') win.reload();
  });

  win.on('closed', () => { win = null; });
}

// ---- the tiny bridge -------------------------------------------------------------------------
// CONTROLLER-ONLY MEANS THERE MUST BE A WAY OUT. With no keyboard there is no Alt+F4 and no
// window close button (we are fullscreen and frameless-ish), so the game's own pause menu calls
// this to quit. Without it, a Steam Deck player is trapped in the app.
ipcMain.on('lsw:quit', () => app.quit());
ipcMain.on('lsw:toggle-fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.handle('lsw:platform', () => ({ desktop: true, platform: process.platform, version: app.getVersion() }));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
