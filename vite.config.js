import {playtestIdentityPlugin} from './tools/playtest/identity.mjs';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// ⚠ `base: './'` IS LOAD-BEARING FOR THE DESKTOP BUILD.
// Vite defaults to '/', which emits absolute asset paths like /assets/index-abc.js. Those resolve
// against the filesystem ROOT under file://, so the packaged Electron app boots to a blank black
// window with no error in the game itself. Relative paths work in both the browser dev server and
// the packaged app, so this is safe for web too — do not "tidy" it back to '/'.
export default defineConfig({
  base: './',
  plugins: [playtestIdentityPlugin()],
  server: { port: 5180, strictPort: false },
  build: {
    outDir: 'dist',
    // The desktop build ships the whole game offline; a bigger single chunk beats a waterfall of
    // requests over file://, where there is no HTTP caching to win back.
    chunkSizeWarningLimit: 2500,
    // THREE entries: the game, ATLAS — the standalone city-generator tool — and POWERWORLD.
    // ⚠ POWERWORLD IS A PAGE, NOT A REPO, AND THAT WAS A MEASURED DECISION (2026-07-27). The engine
    // is 44,405 lines across 105 files; PowerWorld's own stage is 575 and everything else it needs
    // is ~104 flag reads. Forking would have meant maintaining 43,700 duplicated lines to own 700,
    // and every melee fix, damage type, hero and sample-bank entry would have had to land twice.
    // A third input costs three lines and gives it its own build target, its own front door and its
    // own identity — on one engine. See src/boot.js.
    rollupOptions: {
      input: {
        // ⚠ THE POWERWORLD FORK: `/` (index.html) IS PowerWorld here — this repo's front door is
        // the chase-camera game, not the isometric city one. The city game is preserved, buildable,
        // one click away at `/citygame.html`; both are the same engine. (In the ASCENDANTS repo the
        // roles are reversed: index = city, powerworld.html = the second door.)
        main: fileURLToPath(new URL('./index.html', import.meta.url)),        // = PowerWorld
        citygame: fileURLToPath(new URL('./citygame.html', import.meta.url)), // the ASCENDANTS city game
        atlas: fileURLToPath(new URL('./atlas.html', import.meta.url)),
        powerworld: fileURLToPath(new URL('./powerworld.html', import.meta.url)),
        studio: fileURLToPath(new URL('./studio.html', import.meta.url)),
        characterFoundation: fileURLToPath(new URL('./character-foundation.html', import.meta.url)),
        creatureFoundation: fileURLToPath(new URL('./creature-foundation.html', import.meta.url)),
        soundLibrary: fileURLToPath(new URL('./sound-library.html', import.meta.url)),
        animationLibrary: fileURLToPath(new URL('./animation-library.html', import.meta.url)),
        gadgetLibrary: fileURLToPath(new URL('./gadget-library.html', import.meta.url)),
        designDecisions: fileURLToPath(new URL('./design-decisions.html', import.meta.url)),
      },
    },
  },
});

