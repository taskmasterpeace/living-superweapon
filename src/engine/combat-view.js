import {hasCity} from '../data/modes.js';

// View identity never grants flight, changes damage rules, or removes a city.
export function combatView(game) {
 if(!game)return 'legacy';
 if(game.mapCam)return 'override';
 if((game.humans?.length??0)>1)return 'shared';
 if(!game.player)return 'legacy';
 // PowerWorld retains its camera through KO; input ownership still requires life.
 if(!game.player.alive&&game.modeId!=='powerworld')return 'legacy';
 return hasCity(game.modeId)||game.ms?.chaseCam?'bfp':'legacy';
}

export function combatLookActive(game) {
 return combatView(game)==='bfp'&&!!game.player?.alive&&!!game.running&&!game.matchOver&&!game.hud?.titleOpen&&!game.combatOverlayOpen;
}
