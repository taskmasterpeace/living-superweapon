// Selection facts follow declared movement capabilities, not names or threat rank.
export function characterIdentityView(def){
 const soldier=def.archetype==='soldier',tier=def.flightTier??3,abilities=Object.values(def.abilities||{});
 const movement=[];
 if(tier>0)movement.push(tier>=3?'Flight':tier===2?'Levitation':'Limited flight');
 if(def.momentumGlide)movement.push('Momentum glide');
 else if(def.glider)movement.push('Glide');
 if(def.traversalLeap)movement.push('Charged leap');
 if(abilities.some(a=>a.type==='grapple'))movement.push('Grapple');
 if(!movement.length)movement.push(def.evade?.kind==='leap'?'Combat leap':'Ground');
 return {classLabel:soldier?'Soldier':'LSW',movement:movement.join(' / '),shortMovement:movement[0]};
}
