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
requestAnimationFrame(async()=>{
  const destination=new URLSearchParams(location.search).get('destination');
  if(new URLSearchParams(location.search).has('highwall')){
    door?.close();PW.hud.hideSelect?.();
    const {launchHighwall}=await import('./engine/highwall.js');
    document.getElementById('warworld-boot-loading')?.remove();
    await launchHighwall(PW.game,new URLSearchParams(location.search).get('scenario')||'corridor');
  }else if(destination==='gallery'){
    // DEEP LINK to the Beam Gallery — powerworld.html?destination=gallery[&hero=vega]. Boots straight
    // into the proving stand (every beam x mode, no fight); the title button does the same enter().
    door?.close();PW.hud.hideSelect?.();
    const hero=new URLSearchParams(location.search).get('hero')||'sol';
    try{ PW.enter({mode:'powerworld',p1:hero,encounter:'gallery',cameraPreset:'character',daylight:'day',weatherPreset:'clear'}); }
    catch(error){console.error('Beam gallery failed',error);}
    document.getElementById('warworld-boot-loading')?.remove();
  }else if(['desert','vehicle-sim','training'].includes(destination)){
    door?.close();PW.hud.hideSelect?.();
    const loading=document.getElementById('warworld-boot-loading');
    const status=loading?.querySelector('p');if(status)status.textContent='Loading '+({desert:'Frontline desert','vehicle-sim':'Vehicle proving ground',training:'Threat Room'}[destination]);
    try{
      PW.enter({mode:'powerworld',p1:'sarge',p2:'sol',twoPlayer:false,encounter:destination==='training'?'threatLab':'practice',cameraPreset:'frontline',daylight:'day',weatherPreset:'clear',...(destination==='training'?{squad:{side:'soldier',companions:[],soldiers:0,soldierReserves:2,lswReserves:2}}:{})});
      await PW.game.pwStage?.frontlineLoading;
      const preparation=PW.game.pwStage?.preparation;
      if(preparation?.promise&&!(await preparation.promise))throw Error(preparation.error||'Battlefield preparation did not complete.');
      if(destination==='vehicle-sim')await PW.game.deployVehicleSim(new URLSearchParams(location.search).get('vehicle')||'motorcycle');
      loading?.remove();
    }catch(error){console.error('Hub destination failed',error);if(status)status.textContent=`Unable to open destination: ${error.message}`;}
  }else document.getElementById('warworld-boot-loading')?.remove();
});
const hubLink=document.createElement('a');hubLink.href='./index.html';hubLink.textContent='← Deployment hub';hubLink.id='world-hub-link';hubLink.style.cssText='position:fixed;left:14px;bottom:14px;z-index:25;padding:8px 12px;border:1px solid #827651;border-radius:10px;background:#252e2ded;color:#ead69a;text-decoration:none;font:12px Inter,system-ui,sans-serif';hubLink.onpointerenter=()=>hubLink.style.background='#48503c';hubLink.onpointerleave=()=>hubLink.style.background='#252e2ded';document.body.append(hubLink);
