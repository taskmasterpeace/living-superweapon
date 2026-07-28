// WAR WORLD: ASCENDANTS — bootstrap.
//
// ⚠ THE BODY OF THIS FILE MOVED TO `boot.js` (2026-07-27) so PowerWorld could have its own front
// door without forking the engine. It was a MOVE, not a copy — there is exactly one boot, and this
// page is the FULL profile of it. If you are looking for the theater, the career desk, the frame
// loop or the keyboard map, they are in `boot.js` and they are shared.
import { boot, PROFILE_FULL } from './boot.js';

window.LSW = boot(PROFILE_FULL);
