import {canReceiveShot} from './shot-contact-eligibility.js';
import * as THREE from 'three';
import {sweepSplitObstacle} from './projectile-contact.js';
import {naniteContact} from './nanite-forearms.js';
import {proneBoxTime,proneSurface} from './prone-pose.js';

const point=new THREE.Vector3(),center=new THREE.Vector3(),obstacle={};
const isolated={cover:[],interiors:[]},room={walls:[]},isolatedHit={},empty=[];

function contactDirection(beam,index,fighter,dx,dy,dz,length2,out){
  // Absorbed packets bunch at the same body surface. Their tiny Float32
  // endpoint differences (pose drift plus Float32 rounding) are not a new flow direction: normalizing that
  // jitter could turn a forward shove backward. Use THIS packet's recorded
  // travel, never the caster's current aim. Real curved segments keep their
  // local path tangent, and helpers without packet velocities still work.
  if(beam._absorbed?.[index]===fighter&&beam._absorbed[index-1]===fighter&&beam.pvel){
    const b=index*3,x=beam.pvel[b],y=beam.pvel[b+1],z=beam.pvel[b+2];
    const speed2=x*x+y*y+z*z;
    if(Number.isFinite(speed2)&&speed2>1e-12)return out.set(x,y,z).multiplyScalar(1/Math.sqrt(speed2));
  }
  return out.set(dx,dy,dz).multiplyScalar(1/Math.sqrt(length2));
}

// Each existing obstacle is convex, so its shadow from the body center covers
// one contiguous interval of this segment. Advance beyond only the blocker we
// actually found, then query the whole world again. Bisecting world visibility
// itself would skip an exposed gap between two different obstacle shadows.
function exposedEntry(world,ax,ay,az,dx,dy,dz,enter,leave){
  let t=enter,remaining=-1;
  point.set(ax+dx*t,ay+dy*t,az+dz*t);
  while(sweepSplitObstacle(world,point,center,0,obstacle,false)){
    if(remaining<0){
      remaining=world.cover?.length||0;
      for(const r of world.interiors||empty)remaining+=r.walls.length;
    }
    if(remaining--<=0)return Infinity;
    isolated.cover.length=0;isolated.interiors.length=0;
    if(obstacle.kind==='cover')isolated.cover[0]=obstacle.target;
    else{
      isolated.interiors[0]=room;room.walls[0]=obstacle.target;
      let found=false;
      for(const r of world.interiors||empty){
        if(!r.walls.includes(obstacle.target))continue;
        room.x=r.x;room.z=r.z;room.hx=r.hx;room.hz=r.hz;room.top=r.top;
        if(sweepSplitObstacle(isolated,point,center,0,isolatedHit,false)){found=true;break;}
      }
      if(!found)return Infinity;
    }
    point.set(ax+dx*leave,ay+dy*leave,az+dz*leave);
    if(sweepSplitObstacle(isolated,point,center,0,isolatedHit,false))return Infinity;
    let lo=t,hi=leave;
    for(let step=0;step<24;step++){
      const mid=(lo+hi)*.5;point.set(ax+dx*mid,ay+dy*mid,az+dz*mid);
      if(sweepSplitObstacle(isolated,point,center,0,isolatedHit,false))lo=mid;
      else hi=mid;
    }
    t=hi;point.set(ax+dx*t,ay+dy*t,az+dz*t);
  }
  return t;
}

// The caller supplies {point, direction, surface} Vector3s and owns their reuse.
// index is the END knot of the first contacting source-ordered segment; t is
// within that segment. point never leaves the already-traveled polyline. surface
// is the nearest physical body-sphere point, NOT a replacement packet position:
// the compatibility envelope may touch before energy reaches that surface.
// surfaceStop keeps that expanded lateral footprint but waits for the near
// physical sphere entry (or closest approach on a lateral graze). It never
// extends a short traveled segment to a future contact plane.
// Cover must have clipped the input path first. This extra LOS check prevents
// body padding from reaching sideways/forward through a thin wall at that tip.
// No damage, lifecycle, packets or fighter transforms are changed here.
export function beamBodyContact(beam,game,out,padding=1,surfaceStop=false){
  out.fighter=null;out.naniteContact=null;out.index=-1;out.t=Infinity;
  const path=beam.path;
  for(let i=1;i<beam.pn;i++){
    const a=(i-1)*3,b=i*3,ax=path[a],ay=path[a+1],az=path[a+2];
    const dx=path[b]-ax,dy=path[b+1]-ay,dz=path[b+2]-az,length2=dx*dx+dy*dy+dz*dz;
    if(length2<1e-12)continue; // Pending duplicate knots have traveled nowhere.
    for(const fighter of game.entities){
      // Banishment removes the body from this world; hurt invulnerability and
      // possession's abandoned (_inert) body do not remove physical solidity.
      if(!fighter.alive||fighter.phase||fighter._banished||!canReceiveShot(game,beam.caster,fighter))continue;
      const local={},from=new THREE.Vector3(ax,ay,az),to=new THREE.Vector3(path[b],path[b+1],path[b+2]);
      if(!beam.pierceFighters&&naniteContact(fighter,from,to,beam.radius,local,null,true)){
        if(local.t<out.t&&!sweepSplitObstacle(game.world,from,local.naniteContact.point,0,obstacle,false)){
          out.fighter=fighter;out.naniteContact=local.naniteContact;out.index=i;out.t=local.t;out.point.copy(from).lerp(to,local.t);out.surface.copy(local.naniteContact.point);contactDirection(beam,i,fighter,dx,dy,dz,length2,out.direction);
        }
        continue;
      }
      if(local.deferBody)continue;
      if(fighter._pronePose?.weight){
        const t=proneBoxTime(fighter,from,to,beam.radius);
        if(t<out.t){
          point.copy(from).lerp(to,t);proneSurface(fighter,point,center);
          if(!sweepSplitObstacle(game.world,point,center,0,obstacle,false)){
            out.fighter=fighter;out.index=i;out.t=t;out.point.copy(point);out.surface.copy(center);contactDirection(beam,i,fighter,dx,dy,dz,length2,out.direction);
          }
        }
        continue;
      }
      const cx=fighter.pos.x,cy=fighter.pos.y+5.2-(fighter._crouchPose?.drop||0),cz=fighter.pos.z;
      const x=ax-cx,y=ay-cy,z=az-cz,r=beam.radius+fighter.radius+padding;
      const c=x*x+y*y+z*z-r*r,along=x*dx+y*dy+z*dz;
      const disc=along*along-length2*c;
      if(disc<0)continue;
      const root=Math.sqrt(disc),leave=Math.min(1,(-along+root)/length2);
      let t=c<=0?0:(-along-root)/length2;
      if(surfaceStop){
        const perpendicular2=Math.max(0,x*x+y*y+z*z-along*along/length2);
        const physicalDepth2=fighter.radius*fighter.radius-perpendicular2;
        t=-along/length2-(physicalDepth2>=0?Math.sqrt(physicalDepth2/length2):0);
        // A contact plane behind this segment is valid only if its start is
        // already touching the expanded footprint, never for a receding miss.
        if(t<0&&c<=0)t=0;
      }
      if(t<0||t>1)continue;
      if(t>=out.t)continue;
      center.set(cx,cy,cz);
      t=exposedEntry(game.world,ax,ay,az,dx,dy,dz,t,Math.min(leave,out.t));
      if(t>=out.t)continue;
      out.fighter=fighter;out.naniteContact=null;out.index=i;out.t=t;out.point.copy(point);
      contactDirection(beam,i,fighter,dx,dy,dz,length2,out.direction);
      out.surface.copy(point).sub(center);
      if(out.surface.lengthSq()<1e-12)out.surface.copy(out.direction).negate();
      out.surface.normalize().multiplyScalar(fighter.radius).add(center);
    }
    if(out.fighter)return true;
  }
  return false;
}
