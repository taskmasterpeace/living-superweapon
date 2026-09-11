// POWERWORLD — bootstrap for the standalone page.
//
// The whole point of this file is how SMALL it is. PowerWorld is its own front door on the SAME
// engine: `boot()` is the identical function `index.html` calls, and everything that differs is
// declared in the profile below rather than forked.
//
// ⚠ Measured at the time of the split: the engine is 44,405 lines across 105 files, PowerWorld's
// own stage is 575, and everything else it needs is ~104 flag reads. A separate repo would have
// meant maintaining 43,700 duplicated lines to own 700.
import { boot, PROFILE_FULL } from './boot.js';
import { mountPWTitle } from './engine/pwTitle.js';

let door = null;

export const PROFILE_POWERWORLD = {
  ...PROFILE_FULL,
  id: 'powerworld',
  handle: 'PW',
  defaultMode: 'powerworld',
  // ⚠ ITS OWN PREFS KEY. Sharing `threshold_prefs_v1` would mean picking a fighter here silently
  // changed which hero the War World page opens on, and vice versa — two pages quietly writing one
  // another's state is exactly the class of bug a shared save key always becomes.
  prefsKey: 'powerworld_prefs_v1',
  // ⚠ NO THEATER. PowerWorld's stage HIDES the city and raises its own 900u rock arena, so building
  // a full city first — tiles, road graph, greenery, fog raster — is work thrown away one frame
  // later. This is the single biggest reason the standalone page is cheaper than the mode was.
  theater: false,
  // ⚠ NO CITY OPENING. All ten cold-opens are about a CITY (the registry query, the flyover, the
  // district readout, the police response ladder). Playing one before a fight in another dimension
  // would narrate a place the player is not going to.
  opening: false,
  // The War World how-to is the city game's manual; the door states this dimension's own rules.
  howto: false,
  // Every door that belongs to the city game is closed. What is left — options, how-to, rankings —
  // is reachable from PowerWorld's own top bar.
  doors: { circuit: false, firm: false, armory: false, forge: false, tutorial: false, proving: false, depart: false, net: false },
  openTitle: (ctx) => { if (!door) door = mountPWTitle(ctx); door.open(); },
  closeTitle: () => { if (door) door.close(); },
};

const PW = boot(PROFILE_POWERWORLD);
PW.door = () => door;          // headless seam: drive the real front door, not the internals
window.PW = PW;
// ⚠ `window.LSW` TOO, and deliberately. Every headless recipe, every bench file and every doc in
// this repo reaches for `LSW.game` — a page that renamed the seam would silently fail every test
// ever written against it. `PW` is the page's own name; `LSW` is the contract.
window.LSW = PW;
