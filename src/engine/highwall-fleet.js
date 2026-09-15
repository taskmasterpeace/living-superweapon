import {HIGHWALL_FLEET_PRESETS} from '../data/highwall-fleet.js';
import {initVehicleState,initAirborneVehicleState,driveActor} from './vehicle-pilot.js';

// Keep Game.spawnFleetVehicle as the asset/cache/rig owner. This seam only gives
// those actual actors scenario placement, dimensions and a valid initial state.
export function fleetSpawnReason(game,actor,{bounds=game._highwall?.layout?.bounds}={}){
 const {x,y,z}=actor.pos,r=actor.bodyRadius||6,h=actor.bodyHeight||0;
 if(![x,y,z,r,h].every(Number.isFinite))return 'Vehicle placement has invalid dimensions.';
 if(bounds&&(x-r<bounds.minX||x+r>bounds.maxX||z-r<bounds.minZ||z+r>bounds.maxZ))return 'Vehicle does not fit within the scenario boundary.';
 for(const c of game.world.cover||[]){
  if(c.hidden||c.hp<=0||c===actor.cover||y>(c.top??c.h??Infinity)+.1||y+h<(c.bottom??0)-.1)continue;
  const dx=Math.max(0,Math.abs(x-c.x)-(c.hx??c.r??0)),dz=Math.max(0,Math.abs(z-c.z)-(c.hz??c.r??0));
  if(dx*dx+dz*dz<(r+.25)**2)return 'Vehicle placement overlaps solid cover.';
 }
 for(const other of game._fleetActors||[])if(other!==actor&&!other.destroyed&&Math.abs(other.pos.y-y)<h+(other.bodyHeight||10)&&Math.hypot(other.pos.x-x,other.pos.z-z)<r+(other.bodyRadius||6)+2)return 'Vehicle placement overlaps another vehicle.';
 return null;
}
function discard(game,actor){actor.hull?.dispose();actor.wrapper?.removeFromParent();actor.wrapper?.traverse(o=>o.geometry?.dispose());const i=(game._fleetActors||[]).indexOf(actor);if(i>=0)game._fleetActors.splice(i,1);}
export async function spawnHighwallFleet(game,id,{position,yaw,scope=game._highwall}={}){
 const preset=HIGHWALL_FLEET_PRESETS.find(p=>p.id===id);if(!preset)throw Error(`Unsupported Highwall vehicle: ${id}`);
 if(scope&&!preset.highwall)throw Error('Use the separate flight proving ground for the jet. Highwall is not a jet runway.');
 const actor=await game.spawnFleetVehicle(id,position||preset);if(!actor)return null;
 if(scope&&game._highwall!==scope){discard(game,actor);return null;}
 const dimensions=game._fleetCat?.models.find(m=>m.id===id)?.dimensions;
 actor.bodyHeight=dimensions?dimensions.max[1]-dimensions.min[1]:actor.bodyRadius*2;
 actor.motion=actor.cls==='fixedwing'?initAirborneVehicleState(actor.env,yaw??preset.yaw):initVehicleState(actor.cls,yaw??preset.yaw);
 if(actor.cls==='fixedwing')actor.pos.y=(game.world.heightAt?.(actor.pos.x,actor.pos.z)||0)+(preset.altitude||160);
 actor.operation={driver:'player',aiCrew:false,mountedWeapons:false};
 const reason=fleetSpawnReason(game,actor);if(reason){discard(game,actor);throw Error(reason);}
 // Zero-input native update sets real model orientation/rig, not a second pilot.
 driveActor(actor,{},1/1000,game.world);
 return actor;
}
