import {Vector3} from 'three';

// Deterministic, terrain-aware authoring/runtime seam shared by local encounters.
// Returns a full-body clear footprint; never substitutes a wall top for ground.
export function encounterGround(world,origin,index=0,occupied=[],radius=48){
 const limit=(world.ARENA||1800)-20,ground=(x,z)=>world.heightAt?.(x,z)??0;
 for(let attempt=0;attempt<144;attempt++){
  const angle=index*2.39996323+attempt*Math.PI/12,r=radius+Math.floor(attempt/24)*10;
  const x=Math.max(-limit,Math.min(limit,origin.x+Math.cos(angle)*r)),z=Math.max(-limit,Math.min(limit,origin.z+Math.sin(angle)*r)),y=ground(x,z);
  if(!Number.isFinite(y)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<9))continue;
  if((world.cover||[]).some(c=>Math.abs(x-c.x)<(c.hx??c.r??0)+4&&Math.abs(z-c.z)<(c.hz??c.r??0)+4&&(c.top??c.h??Infinity)>y))continue;
  if([[3,0],[-3,0],[0,3],[0,-3]].some(([dx,dz])=>Math.abs(ground(x+dx,z+dz)-y)>2.5))continue;
  return new Vector3(x,y,z);
 }
 const error=new Error('No clear encounter spawn near this terrain position');error.code='ENCOUNTER_NO_SPAWN';throw error;
}
