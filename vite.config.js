import { defineConfig } from 'vite';

// ⚠ `base: './'` IS LOAD-BEARING FOR THE DESKTOP BUILD.
// Vite defaults to '/', which emits absolute asset paths like /assets/index-abc.js. Those resolve
// against the filesystem ROOT under file://, so the packaged Electron app boots to a blank black
// window with no error in the game itself. Relative paths work in both the browser dev server and
// the packaged app, so this is safe for web too — do not "tidy" it back to '/'.
export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: false },
  build: {
    outDir: 'dist',
    // The desktop build ships the whole game offline; a bigger single chunk beats a waterfall of
    // requests over file://, where there is no HTTP caching to win back.
    chunkSizeWarningLimit: 2500,
  },
});
