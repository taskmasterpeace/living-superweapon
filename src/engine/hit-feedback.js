const absorbedTotal=o=>Object.values(o?.absorbed||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
const hpLabel=o=>o.healthLost>0?` · ${Number(o.healthLost.toFixed(1))} HP`:'';

// Pure semantic selection. It only names evidence recorded by damage resolution.
export function selectHitFeedback(outcome){
  if(!outcome)return {id:'legacy',word:'',label:'',priority:0};
  if(outcome.knockedOut)return {id:'ko',word:'K.O.!',label:'K.O.',priority:100};
  if(outcome.guard==='broken')return {id:'guard-broken',word:'CRACK!',label:'GUARD BROKEN',priority:90};
  if(outcome.deflected)return {id:'deflect',word:'DEFLECT!',label:'DEFLECT',priority:80};
  if(outcome.statusesAdded?.includes('frozen'))return {id:'frozen',word:'KRIK-KRAK!',label:'FROZEN',priority:75};
  if(outcome.statusesAdded?.includes('bleeding'))return {id:'bleeding',word:'SHKKT!',label:'BLEEDING',priority:70};
  if(outcome.statusesAdded?.includes('burning'))return {id:'burning',word:'FWOOSH!',label:'BURNING',priority:70};
  if(outcome.guard==='blocked')return {id:'block',word:'BLOCK!',label:`BLOCK${hpLabel(outcome)}`,priority:60};
  if((outcome.absorbed?.plate||0)+(outcome.absorbed?.armor||0)>0)
    return {id:'armor-hit',word:(absorbedTotal(outcome)>=8?'CLANG!':'TINK!'),label:`ARMOR HIT${hpLabel(outcome)}`,priority:50};
  if((outcome.absorbed?.shield||0)+(outcome.absorbed?.nanite||0)>0)
    return {id:'shield-hit',word:'SHNK!',label:`SHIELD HIT${hpLabel(outcome)}`,priority:50};
  if(outcome.healthLost<=0)return {id:'contact',word:'',label:'CONTACT',priority:10};
  if(outcome.dtype==='physical')return {id:'body-hit',word:outcome.healthLost>=18?'WHAM!':'THUD!',label:`BODY HIT${hpLabel(outcome)}`,priority:30};
  if(outcome.dtype==='ballistic'||outcome.attackClass==='bullet')return {id:'ballistic-hit',word:'BLAM!',label:`HIT${hpLabel(outcome)}`,priority:25};
  return {id:'hit',word:'WHUMP!',label:`HIT${hpLabel(outcome)}`,priority:20};
}
