export function blockedJabAudio(audio,attackerKind,defender,pos){
 if(attackerKind==='fist'&&defender.body==='flesh'&&defender.def.guardType!=='barrier'){
  if(!audio.soundLibrary?.native?.('physical-jab-block',{pos,gain:.65}))audio.impact(.45,pos);
 }else audio.zap(520,pos);
}
