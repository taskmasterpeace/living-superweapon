// Retire effects by actor identity, never by team or by clearing a whole system.
export function retirePracticeActor(game,owner) {
 const actors=new Set([owner]);
 for(let changed=true;changed;){changed=false;for(const f of game.entities||[])if(f._dupeOf&&actors.has(f._dupeOf)&&!actors.has(f)){actors.add(f);changed=true;}}
 for(const actor of actors) {
  actor.state='ko'; // disable subsequent callbacks without issuing a gameplay KO/reward.
  for(const name of ['projectiles','minions','constructs']) {
   const list=name==='projectiles'?game.projectiles?.list:game[name];if(!list)continue;
   for(const item of [...list])if(item.caster===actor||item.owner===actor){item._dispose?.(game,'practice-reset');const i=list.indexOf(item);if(i>=0)list.splice(i,1);}
  }
  game.weather?.cancelCommand?.(actor);
  for(const field of [...(game.timeFields?.list||[])])if(field.src===actor){field.mesh?.removeFromParent();field.mesh?.geometry.dispose();field.mesh?.material.dispose();game.timeFields.list.splice(game.timeFields.list.indexOf(field),1);}
  const zones=game.gravityZones?.list;if(zones)for(let i=zones.length-1;i>=0;i--)if(zones[i].src===actor)zones.splice(i,1);
  for(const pair of [...(game.portals||[])])if(pair.owner===actor)game._closePair(pair);
  if(actor.grabbedBy)game.melee.release(actor.grabbedBy);if(actor.grabbing)game.melee.release(actor);
  for(const key of ['hardLock','lockTarget'])if(game[key]===actor)game[key]=null;
  actor._meleeTrial=null;actor.dispose();actor.obj.removeFromParent();const index=game.entities.indexOf(actor);if(index>=0)game.entities.splice(index,1);
 }
}
