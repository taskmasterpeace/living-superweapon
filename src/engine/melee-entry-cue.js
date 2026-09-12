import {meleeEntryTarget} from './melee-entry-target.js';
import {meleeApproach} from '../data/melee-approaches.js';
// A reach cue, not a lock or guaranteed hit. Native acquisition remains authoritative.
export function meleeEntryCue(game){
 const f=game.player;
 if(game.modeId!=='powerworld'||!f||!game.running||game.matchOver||!game.melee.canAct(f)||f.sleepT>0||f.downedT>0||f._mount||f._scoutVehicle||f._aircraftVehicle||f._passengerTransport||f._carry||f.grabbing||f.grabState||f.mstate||f.guarding||f.meleeCharge>0||(f.strikeCd>0&&f.comboWin<=0))return null;
 const profile=meleeApproach(f.def,f.airborne),target=meleeEntryTarget(game,f,profile.range);
 if(!target)return null;
 return {target,family:profile.family,range:profile.range};
}

// Sequence position describes the attempted strike, not a promised successful hit.
export function meleeSequenceCue(game){
 const f=game.player;if(game.modeId!=='powerworld'||!game.running||game.matchOver||!f?.alive||f.mKind!=='light'||!f.mstate||f.sleepT>0||f.downedT>0||f.staggerT>0||f.stunT>0||f.frozenT>0)return null;
 const result=f._meleeBlocked?'BLOCKED':f.strikeHit?.size?'CONTACT':f.mstate==='recover'?'MISS':f.mstate==='startup'?'WIND-UP':'ACTIVE';
 return 'STRIKE '+(f.strikeIdx+1)+'/3 · '+result;
}
