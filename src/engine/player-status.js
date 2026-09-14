import {unitsPerSecondToKmh} from '../core/world-units.js';
import {movementProfile} from '../data/movement-gears.js';
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const resource=(value,max)=>{max=Math.max(1,finite(max,1));value=Math.max(0,Math.min(max,finite(value)));return {value:Math.ceil(value),max:Math.ceil(max),ratio:value/max};};

// Presentation only: guard is normalized by the simulation, never an armor pool.
export function playerStatus(p){
 const hp=resource(p.hp,p.maxHp),energy={...resource(p.ki,p.maxKi),infinite:!!p.energyInfinite},guard=resource(finite(p.guardMeter)*100,100),effects=[];
 const add=(id,label,glyph,t)=>{if(t>0)effects.push({id,label,glyph,remaining:Math.ceil(t)});};
 const condition=(id,label,glyph,t,hint,precision=1)=>{if(t>0)effects.push({id,label,glyph,remaining:Math.ceil(t*precision)/precision,hint,harmful:true});};
 const recovery=p.sheet?.ccRecover||1;
 condition('guard-break','Guard broken','defense',p.guardBreakT/recovery,'Guard unavailable · create distance',10);
 if(!(p.guardBreakT>0||p.sleepT>0||p.shockT>0||p.stunT>0||p.frozenT>0))condition('stagger','Staggered','threat',p.staggerT/recovery,'Recover before attacking');
 condition('sleep','Asleep','person',p.sleepT,'Damage wakes you');
 condition('shock','Shocked','energy',p.shockT,'Actions disabled');
 condition('blind','Blinded','awareness',p.blindT,'Leave smoke · lock unavailable');
 condition('corrosion','Corroded','defense',p._corrode,'Armor weakened · avoid gunfire');
 if(p._bleed>0)effects.push({id:'bleeding',label:'Bleeding',glyph:'threat',remaining:null,harmful:true,
  hint:Math.hypot(p.vel?.x||0,p.vel?.z||0)>8?'Stop moving to clot':`Clotting · ${Math.max(1,Math.ceil(4-(p._bleedStill||0)))}s still`});
 if(p.frost>0&&!(p.frozenT>0))effects.push({id:'frost',label:`Frost ${Math.round(p.frost*100)}%`,glyph:'defense',remaining:null,harmful:true,hint:'Leave cold to prevent freezing'});
 add('power',p.buffName||'Power boost','power',p.buffT);
 condition('frozen','Frozen','defense',p.frozenT/recovery,'Heavy hits shatter ice');
 condition('stun','Stunned','threat',p.stunT,'Actions disabled · recover before attacking');
 add('chill','Slowed','agility',p._chill);
 add('drained','Drained','energy',p.drainedT);
 add('speed',`Speed +${Math.round(((p.sprintMult||1)-1)*100)}%`,'mobility',p.sprintT);
 for(const d of p._dots||[])condition('dot-'+d.kind,({burn:'Burning',poison:'Poisoned',gas:'Toxic gas',acid:'Acid'})[d.kind]||d.kind||'Damage over time','threat',d.t,'Taking damage over time');
 if(p.phase)effects.push({id:'phase',label:'Intangible',glyph:'person',remaining:null});
 if(p.guarding)effects.push({id:'guard',label:'Blocking',glyph:'defense',remaining:null});
 if(p._shieldHp>0)effects.push({id:'shield',label:`Equipment shield: ${Math.ceil(p._shieldHp)}`,glyph:'defense',remaining:null});
 const speed=Math.round(unitsPerSecondToKmh(Math.hypot(p.vel?.x||0,p.vel?.y||0,p.vel?.z||0))),profile=movementProfile(p),gear=p.movementGear?.gear||0;
 const maxAir=Math.max(1,unitsPerSecondToKmh((p.def?.speed||1)*profile.air[profile.maxGear-1]));
 return {name:p.name||p.def?.name||'PLAYER',level:Math.max(1,finite(p.level,1)),form:p.formName||'BASE',hp,energy,guard,
  critical:hp.ratio<.28,guardBroken:p.guardBreakT>0||(p.guardMeter<=.001&&p.staggerT>0),effects,
  flight:p.flying?{speed,ratio:Math.min(1,speed/maxAir),label:gear?`FLIGHT · GEAR ${['','I','II','III'][gear]}`:'FLIGHT'}:null};
}
