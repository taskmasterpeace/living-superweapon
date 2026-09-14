const cues={flesh:'bullet-hit-flesh',metal:'bullet-hit-metal',stone:'bullet-hit-stone'};
// Consume the resolved native damage result; blocked, immune and energy-body
// contacts must not sound like a bullet penetrating flesh.
export function ballisticContactAudio(game,projectile,target,dealt){
 if(!projectile.ballistic||!(dealt>0))return false;
 const cue=cues[target.body];if(!cue)return false;
 return game.audio?.soundLibrary?.native?.(cue,{pos:projectile.pos})||false;
}
