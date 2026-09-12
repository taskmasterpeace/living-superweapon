// Campaign allegiance is independent of character class and mission assignment.
export function validateSquad(config, roster) {
  const {side, companions = [], p1, soldiers=0, soldierReserves=2, lswReserves=2} = config;
  for(const n of [soldierReserves,lswReserves])if(!Number.isInteger(n)||n<0||n>12)throw Error('Choose 0–12 reserves per class.');
  if (!['soldier','lsw'].includes(side)) throw Error('Choose a side.');
  if (!roster.some(d => d.id === p1)) throw Error('Choose a character.');
  const limit = side === 'soldier' ? 1 : 5;
  if (!Array.isArray(companions) || companions.length > limit) throw Error(`This side supports ${limit} LSW companion${limit===1?'':'s'}.`);
  if(!Number.isInteger(soldiers)||soldiers<0||soldiers>5||1+soldiers+companions.length>6)throw Error('This operation supports six total squad members, including you.');
  if (new Set(companions).size !== companions.length || companions.includes(p1)) throw Error('Each squad member must be unique.');
  for (const id of companions) {
    const def = roster.find(d => d.id === id);
    if (!def || def.archetype === 'soldier') throw Error('Recruit a Living Superweapon.');
  }
  const assignment=config.assignment||'escort';
  if(!['escort','ambush'].includes(assignment))throw Error('Choose escort or ambush.');
  return {side,p1,assignment,soldiers,soldierReserves,lswReserves,companions:[...companions]};
}
