export function createPowerUpState(def){return def.powerUp?.ability?.type==='buff'?{def:def.powerUp.ability,sourceSlot:def.powerUp.sourceSlot,cd:0,activeT:0,charging:false,chargeT:0,active:null,sustainT:0}:null;}
export function advancePowerUp(f,dt){const s=f.powerUp;if(!s)return;s.cd=Math.max(0,s.cd-dt);s.activeT=Math.max(0,Math.min(f.buffT||0,s.activeT-dt));}
export function retirePowerUp(f){if(f.powerUp)f.powerUp.activeT=0;}
export function powerUpStatus(f){
 const s=f?.powerUp;if(!s)return {kind:'unsupported',label:'NO AUTHORED FORM'};
 if(s.activeT>0)return {kind:'active',label:`${s.def.name} · ACTIVE ${Math.ceil(s.activeT)}s`};
 if(s.cd>0)return {kind:'cooldown',label:`${s.def.name} · ${Math.ceil(s.cd)}s COOLDOWN`};
 if(f.ki<(s.def.cost||0))return {kind:'energy',label:`${s.def.name} · NEED ${s.def.cost} ENERGY`};
 return {kind:'ready',label:`${s.def.name} · READY`};
}
