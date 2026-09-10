// Resource accounting for native constructs. Presentation never owns this clock.
const MODES=new Set(['timed','upkeep','damage']);
const FORMS=new Set(['fist','hammer','wall','turret','tank']);
const resource=c=>c.policy?.mode==='upkeep'||c.policy?.mode==='damage';

function rate(def,key,fallback,min,max){
 const value=def[key];if(value===undefined)return fallback;
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
  throw new RangeError(`Invalid ${key}; expected ${min}–${max}`);
 return value;
}
export function resolveConstructPolicy(def={}){
 const mode=def.constructLifetime===undefined?'timed':def.constructLifetime;
 const form=def.construct===undefined?'fist':def.construct;
 if(!MODES.has(mode))throw new RangeError('Invalid construct lifetime mode');
 if(!FORMS.has(form))throw new RangeError('Invalid construct form');
 if(mode!=='timed'&&form!=='wall'&&form!=='tank')
  throw new RangeError('Resource constructs currently require a wall or tank');
 // Dormant authored rates remain validated even though only one policy executes.
 const upkeep=rate(def,'constructKiPerSec',12,.1,100);
 const damage=rate(def,'constructKiPerDamage',1,.01,10);
 return {mode,kiPerSec:mode==='upkeep'?upkeep:0,kiPerDamage:mode==='damage'?damage:0};
}
export function debitConstructKi(owner,amount){
 if(!Number.isFinite(amount)||amount<0)throw new RangeError('Invalid construct ki debit');
 if(owner.energyInfinite)return {spent:0,exhausted:false};
 if(!Number.isFinite(owner.ki))throw new RangeError('Invalid owner ki pool');
 const available=Math.max(0,owner.ki),spent=Math.min(available,amount);
 owner.ki=available-spent;
 // Repeated fractional steps can leave ~1e-14 ki at an exact budget boundary.
 // Retire that numerical dust; it must not buy a whole extra protected frame.
 if(owner.ki<1e-9)owner.ki=0;
 return {spent,exhausted:owner.ki===0};
}
export function retireOwnedConstructs(game,owner,reason,resourceOnly=false){
 let count=0;
 for(const c of game.constructs||[]){
  if(c.dead||c.owner!==owner||(resourceOnly&&!resource(c)))continue;
  c._dispose(game,reason);count++;
 }
 return count;
}
// Only the new controlled lifetime branch claims a stable ability-slot key.
// Legacy timed actions deliberately retain their existing KO/slot behavior.
export function constructForSlot(game,owner,slotState){
 const key=Object.keys(owner.slots||{}).find(key=>owner.slots[key]===slotState);
 if(key===undefined)return null;
 let found=null;
 for(const c of game.constructs||[]){
  if(c.dead||c.owner!==owner||c.slotKey!==key)continue;
  if(c.slotState!==slotState||c.def!==slotState.def)c._dispose(game,'slot-replaced');
  else if(!found){found=c;slotState.active=c;}
 }
 return found;
}
export function validConstructOwner(c,game){
 if(c.dead)return false;
 const owner=c.owner;
 if(!owner||owner._remove||owner._formDisposed||(Array.isArray(game.entities)&&!game.entities.includes(owner))){
  c._dispose(game,'owner-removed');return false;
 }
 if(c.slotKey!=null&&(owner.slots?.[c.slotKey]!==c.slotState||c.slotState.def!==c.def)){
  c._dispose(game,'slot-replaced');return false;
 }
 if(resource(c)&&!owner.alive){c._dispose(game,'owner-ko');return false;}
 return true;
}
export function exhaustConstructOwner(game,owner,current=null){
 let retired=retireOwnedConstructs(game,owner,'energy-depleted',true);
 // Direct native construction is allowed without an ability/list registration.
 // It still owns a collider and must retire that collider before returning false.
 if(current&&!current.dead){current._dispose(game,'energy-depleted');retired++;}
 if(retired>0)game.onDrained?.(owner);
}
export function settleConstructUpkeep(game,dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 const groups=new Map();
 for(const c of game.constructs||[]){
  if(!validConstructOwner(c,game))continue;
  const owner=c.owner;
  if(!resource(c))continue;
  let group=groups.get(owner);
  if(!group){group={cost:0,members:[]};groups.set(owner,group);}
  if(c.policy.mode==='upkeep'){
   const cost=c.policy.kiPerSec*dt;group.cost+=cost;group.members.push({construct:c,cost});
  }
 }
 for(const [owner,group] of groups){
  const debit=debitConstructKi(owner,group.cost);
  // A shared partial final tick is paid proportionally; iteration order cannot
  // select the surviving tank or overstate per-construct diagnostics.
  if(group.cost>0)for(const {construct,cost} of group.members)
   construct.kiSpent=(construct.kiSpent||0)+debit.spent*cost/group.cost;
  if(debit.exhausted)exhaustConstructOwner(game,owner);
 }
}
