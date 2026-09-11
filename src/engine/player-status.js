import {unitsPerSecondToKmh} from '../core/world-units.js';
import {movementProfile} from '../data/movement-gears.js';
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const resource=(value,max)=>{max=Math.max(1,finite(max,1));value=Math.max(0,Math.min(max,finite(value)));return {value:Math.ceil(value),max:Math.ceil(max),ratio:value/max};};

// Presentation only: guard is normalized by the simulation, never an armor pool.
export function playerStatus(p){
 const hp=resource(p.hp,p.maxHp),energy={...resource(p.ki,p.maxKi),infinite:!!p.energyInfinite},guard=resource(finite(p.guardMeter)*100,100),effects=[];
 const add=(id,label,glyph,t)=>{if(t>0)effects.push({id,label,glyph,remaining:Math.ceil(t)});};
 add('power',p.buffName||'Power boost','power',p.buffT);
 add('frozen','Frozen','defense',p.frozenT);
 add('stun','Stunned','threat',p.stunT);
 add('chill','Slowed','agility',p._chill);
 add('drained','Drained','energy',p.drainedT);
 add('speed',`Speed +${Math.round(((p.sprintMult||1)-1)*100)}%`,'mobility',p.sprintT);
 for(const d of p._dots||[])add('dot-'+d.kind,d.kind||'Damage over time','threat',d.t);
 if(p.phase)effects.push({id:'phase',label:'Intangible',glyph:'person',remaining:null});
 if(p.guarding)effects.push({id:'guard',label:'Blocking',glyph:'defense',remaining:null});
 if(p._shieldHp>0)effects.push({id:'shield',label:`Equipment shield: ${Math.ceil(p._shieldHp)}`,glyph:'defense',remaining:null});
 const speed=Math.round(unitsPerSecondToKmh(Math.hypot(p.vel?.x||0,p.vel?.y||0,p.vel?.z||0))),profile=movementProfile(p),gear=p.movementGear?.gear||0;
 const maxAir=Math.max(1,unitsPerSecondToKmh((p.def?.speed||1)*profile.air[profile.maxGear-1]));
 return {name:p.name||p.def?.name||'PLAYER',level:Math.max(1,finite(p.level,1)),form:p.formName||'BASE',hp,energy,guard,
  critical:hp.ratio<.28,guardBroken:p.guardBreakT>0||(p.guardMeter<=.001&&p.staggerT>0),effects,
  flight:p.flying?{speed,ratio:Math.min(1,speed/maxAir),label:gear?`FLIGHT · GEAR ${['','I','II','III'][gear]}`:'FLIGHT'}:null};
}
