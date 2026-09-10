import * as THREE from 'three';
import {coverBoxEntry,terrainEntry} from './projectile-contact.js';

export function clearRush(slot){slot.combo=0;slot.timer=0;slot.foe=null;}
export function rushInterrupted(f){
 return !f.alive||f._formDisposed||f.noPowers||f.staggerT>0||f.stunT>0||f.frozenT>0||f.downedT>0||f.sleepT>0||
  !!(f.grabbedBy||f.grabbing||f.guarding||f._grapple||f.hanging||f._scoutVehicle||f._aircraftVehicle);
}
// Runs before status early-returns: thawing or leaving a vehicle must not
// resurrect an old paid combo. Ordinary self-hitstop pauses instead of cancels.
export function cancelInterruptedRush(f){
 if(rushInterrupted(f))for(const slot of Object.values(f.slots))if(slot.def.type==='rush'&&slot.combo>0)clearRush(slot);
}
function solids(world){
 const boxes=(world.cover||[]).filter(c=>!c.destroyed&&!(c.hp<=0)).map(c=>({...c,hx:c.hx??c.r,hz:c.hz??c.r}));
 for(const room of world.interiors||[])for(const wall of room.walls||[])boxes.push({...wall,top:room.top});
 return boxes;
}
function clearSight(a,b,world){
 const from=a.center(new THREE.Vector3()),to=b.center(new THREE.Vector3());
 return terrainEntry(world,from,to,.05)>=1&&solids(world).every(c=>coverBoxEntry(from,to,c,.05)>=1);
}
export function rushTargetValid(c,f,def,g){
 return !!f&&f.alive&&!f._formDisposed&&!f.phase&&!(f.invuln>0)&&!(f._vis<.4)&&g.isFoe(c,f)&&
  (!f.grabbedBy||f.grabbedBy===c)&&g.entities.includes(f)&&c.pos.distanceTo(f.pos)<=(def.range||70)&&clearSight(c,f,g.world);
}
export function findRushTarget(c,def,g){
 let best=null,distance=Infinity;
 for(const f of g.entities||[]){if(!rushTargetValid(c,f,def,g))continue;const d=c.pos.distanceToSquared(f.pos);
  if(d<distance&&rushLanding(c,f,def.hits||6,g)){best=f;distance=d;}
 }return best;
}
// The existing flurry alternates short left/right contact approaches. Keep
// that rhythm, but validate a full body corridor and destination BEFORE moving.
export function rushLanding(c,f,beat,g){
 const world=g.world,scale=c.sizeScale||1,r=Math.max(c.radius||2.2,2.8*scale),halfHeight=6*scale;
 const aim=c.aim.clone().setY(0);if(aim.lengthSq()<1e-8)return null;aim.normalize();
 const from=c.pos.clone().add(new THREE.Vector3(0,halfHeight,0)),boxes=solids(world),bound=(world.ARENA??240)-r;
 for(const side of [beat%2===0?1:-1,beat%2===0?-1:1]){
  const p=new THREE.Vector3(f.pos.x-aim.x*6-aim.z*side*6,f.pos.y,f.pos.z-aim.z*6+aim.x*side*6);
  if(Math.abs(p.x)>bound||Math.abs(p.z)>bound)continue;
  const to=p.clone().add(new THREE.Vector3(0,halfHeight,0));
  if(p.y<(world.heightAt?.(p.x,p.z)??0)-.02||terrainEntry(world,from,to,halfHeight-.02)<1)continue;
  if(boxes.some(box=>coverBoxEntry(from,to,box,r,halfHeight)<1))continue;
  if((g.entities||[]).some(other=>other!==c&&other.alive&&Math.abs(other.pos.y-p.y)<halfHeight*2&&
    Math.hypot(other.pos.x-p.x,other.pos.z-p.z)<r+(other.radius||2.2)))continue;
  return p;
 }
 return null;
}
