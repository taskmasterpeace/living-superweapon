import {vehicleContactSpeed} from './shared-impact.js';
import {terrainEntry} from './projectile-contact.js';

const EPS=1e-5;
const AXES=['x','y','z'];
// Sweep the existing feet-rooted fighter proxy, not a point or a projectile.
// Boundary-tangent motion is legal; initial penetration stays owned by the
// endpoint depenetration pass. Teleports happen before this frame-local sweep.
function boxContact(a,b,lx,hx,ly,hy,lz,hz,out){
  let enter=-Infinity,leave=Infinity,axis=null,normal=0;
  for(let i=0;i<3;i++){
    const key=AXES[i],lo=i===0?lx:i===1?ly:lz,hi=i===0?hx:i===1?hy:hz;
    const d=b[key]-a[key];
    if(Math.abs(d)<1e-12){if(a[key]<=lo||a[key]>=hi)return false;continue;}
    let near=(lo-a[key])/d,far=(hi-a[key])/d,n=-1;
    if(near>far){[near,far]=[far,near];n=1;}
    if(near>enter){enter=near;axis=key;normal=n;}
    leave=Math.min(leave,far);
    if(enter>leave)return false;
  }
  if(enter<0||enter>1||leave<=0||!axis)return false;
  if(enter>=out.t)return false;
  out.t=enter;out.axis=axis;out.normal=normal;return true;
}

// Read-only full-body clearance for a coupled carry or an aimed body path.
// Unlike ordinary movement, carry cannot phase through geometry or resolve an
// initial overlap by teleporting the held body to the far side.
export function fighterPathFraction(f,world,a,b){
  const r=f.radius||0,h=f.bodyBounds?.max.y??12*(f.sizeScale||1),hit={t:Infinity};
  const box=(x,z,hx,hz,bottom,top)=>{
    if(a.x>x-hx-r&&a.x<x+hx+r&&a.z>z-hz-r&&a.z<z+hz+r&&a.y>bottom-h&&a.y<top){hit.t=0;return;}
    boxContact(a,b,x-hx-r,x+hx+r,bottom-h,top,z-hz-r,z+hz+r,hit);
  };
  for(const c of world.cover||[])if(!c.destroyed)box(c.x,c.z,c.hx??c.r,c.hz??c.r,(c.frontlineAircraft||c.finiteBuilding)&&Number.isFinite(c.bottom)?c.bottom:-Infinity,c.top??c.h);
  for(const room of world.interiors||[]){
    for(const wall of room.walls||[])box(wall.x,wall.z,wall.hx,wall.hz,-Infinity,room.top);
    box(room.x,room.z,room.hx,room.hz,room.top-1,room.top);
  }
  if(world.heightAt)for(const [dx,dz]of [[0,0],[-r,-r],[-r,r],[r,-r],[r,r]]){
    const p={x:a.x+dx,y:a.y,z:a.z+dz},q={x:b.x+dx,y:b.y,z:b.z+dz};
    if(p.y>world.heightAt(p.x,p.z)+EPS)hit.t=Math.min(hit.t,terrainEntry(world,p,q));
    else if(q.y<world.heightAt(q.x,q.z)-EPS)hit.t=0;
  }
  return Math.max(0,Math.min(1,hit.t));
}

// Three axis contacts suffice to constrain translation. Work depends on scene
// candidates, not speed-dependent microsteps. Existing endpoint checks remain
// responsible for initial overlaps, footing and the normal landing ceremony.
export function sweepFighterEnvironment(f,game,dt){
  const world=game.world,a={x:f.pos.x,y:f.pos.y,z:f.pos.z};
  const b={x:a.x+f.vel.x*dt,y:a.y+f.vel.y*dt,z:a.z+f.vel.z*dt};
  const radius=f.radius,low=f._pronePose?.weight?f._pronePose.bounds:null;
  const minX=low?.min.x??-radius,maxX=low?.max.x??radius;
  const minZ=low?.min.z??-radius,maxZ=low?.max.z??radius;
  const height=low?.max.y??12*(f.sizeScale||1),bottomY=low?.min.y??0;
  const ghost=f.sprintT>0&&f._sprintThrough;
  const wallGhost=ghost||(f.phase&&f._phaseWalk);
  for(let pass=0;pass<3;pass++){
    const hit={t:Infinity,axis:null,normal:0,cover:null,terrain:false};
    if(!ghost)for(const c of world.cover||[]){
      if(c.destroyed)continue;
      // The endpoint building-contact pass owns small authored step-ups.
      // Sweeping their vertical riser first would make an otherwise legal step a wall.
      if(c.buildingRole==='step'&&c.standable&&!f.flying&&!(f.launchT>0)&&f.vel.y<=2&&c.top-a.y>=0&&c.top-a.y<=2.5)continue;
      const hx=c.hx??c.r,hz=c.hz??c.r;
      const bottom=(c.frontlineAircraft||c.finiteBuilding)&&Number.isFinite(c.bottom)?c.bottom-height:-Infinity;
      if(boxContact(a,b,c.x-hx-maxX,c.x+hx-minX,bottom,(c.top??c.h)-bottomY,c.z-hz-maxZ,c.z+hz-minZ,hit))hit.cover=c;
    }
    if(!wallGhost)for(const room of world.interiors||[]){
      const lx=room.x-room.hx-maxX,hx=room.x+room.hx-minX;
      const lz=room.z-room.hz-maxZ,hz=room.z+room.hz-minZ;
      if(Math.max(a.x,b.x)<lx||Math.min(a.x,b.x)>hx||Math.max(a.z,b.z)<lz||Math.min(a.z,b.z)>hz)continue;
      for(const wall of room.walls){
        if(boxContact(a,b,Math.max(lx,wall.x-wall.hx-maxX),Math.min(hx,wall.x+wall.hx-minX),
          -Infinity,room.top-bottomY,Math.max(lz,wall.z-wall.hz-maxZ),Math.min(hz,wall.z+wall.hz-minZ),hit))hit.cover=null;
      }
      // A hollow room has a roof slab, not an invisible solid interior.
      if(boxContact(a,b,lx,hx,room.top-(low?.max.y??11),room.top-bottomY,lz,hz,hit))hit.cover=null;
    }
    // Grounded walking is still terrain-following. An airborne path must test
    // all native heightfield triangles, including ridges with clear endpoints.
    if(world.heightAt&&a.y>world.heightAt(a.x,a.z)+EPS){
      const t=terrainEntry(world,a,b);
      if(t<hit.t){hit.t=t;hit.terrain=true;}
    }
    if(hit.t===Infinity){f.pos.set(b.x,b.y,b.z);return;}
    const x=a.x+(b.x-a.x)*hit.t,y=a.y+(b.y-a.y)*hit.t,z=a.z+(b.z-a.z)*hit.t;
    f.pos.set(x,y,z);
    if(hit.terrain){
      f.pos.y=world.heightAt(x,z);
      // Keep downward velocity for the existing landing/launch-slam reaction.
      // Do not carry a level flight command through the far side of a ridge.
      f.vel.x=0;f.vel.z=0;
      return;
    }
    const key=hit.axis;
    if(key!=='y'){
      const speed=hit.cover?.frontlineVehicle||hit.cover?.frontlineAircraft ? vehicleContactSpeed(f,hit.cover,key,hit.normal) : Math.abs(f.vel[key]);
      f.pos[key]+=hit.normal*EPS;
      f.vel[key]*=-.3;
      f._wallContact(game,hit.cover,speed,key);
    }else if(hit.normal<0){
      f.pos.y-=EPS;f.vel.y=Math.min(0,f.vel.y)*.3;
    }
    // Slide the unconsumed tangential displacement; never move through the
    // contact plane. Roof-downward velocity remains available to _physics.
    b[key]=f.pos[key];
    a.x=f.pos.x;a.y=f.pos.y;a.z=f.pos.z;
  }
}
