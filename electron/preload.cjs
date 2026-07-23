// The ONLY bridge between the desktop shell and the game.
//
// Deliberately four calls. The game is web code and must keep running unchanged in a browser, so
// everything here is optional: src/ checks `window.LSW_DESKTOP` before using any of it and falls
// back to normal web behaviour when it is absent.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('LSW_DESKTOP', {
  isDesktop: true,
  platform: process.platform,                                  // 'win32' | 'linux' | 'darwin'
  quit: () => ipcRenderer.send('lsw:quit'),                    // the controller's way out
  toggleFullscreen: () => ipcRenderer.send('lsw:toggle-fullscreen'),
  info: () => ipcRenderer.invoke('lsw:platform'),
});
