import {canReceiveShot} from './shot-contact-eligibility.js';
import {anatomicalBulletContact} from './anatomical-bullet-contact.js';
import {sweepSplitObstacle,coverBoxEntry,terrainEntry} from './projectile-contact.js';
import {naniteContact} from './nanite-forearms.js';
import {proneBoxTime,proneSurface} from './prone-pose.js';
// Side-effect-free earliest-time queries for the production projectile manager.
// All returned t values refer to the SAME [start,end] time interval. Intersecting
// two spatial trails is insufficient: their centers must coincide in time.
export function sweptPairTime(a, aEnd, b, bEnd) {
  return sphereTime(a.pos, aEnd, b.pos, a.radius + b.radius, bEnd);
}

function sphereTime(a,b,c,r,cEnd=c) {
  const x=a.x-c.x,y=a.y-c.y,z=a.z-c.z;
  const dx=b.x-a.x-(cEnd.x-c.x),dy=b.y-a.y-(cEnd.y-c.y),dz=b.z-a.z-(cEnd.z-c.z);
  const C=x*x+y*y+z*z-r*r;
  if(C<=1e-10)return 0;
  const A=dx*dx+dy*dy+dz*dz,B=x*dx+y*dy+z*dz,disc=B*B-A*C;
  if(A<1e-16||B>=0||disc<0)return Infinity;
  const t=(-B-Math.sqrt(disc))/A;
  return t>=0&&t<=1?t:Infinity;
}

function clipAxis(a,b,lo,hi,interval) {
  const d=b-a;
  if(Math.abs(d)<1e-12)return a>=lo&&a<=hi;
  const p=(lo-a)/d,q=(hi-a)/d;
  interval[0]=Math.max(interval[0],Math.min(p,q));interval[1]=Math.min(interval[1],Math.max(p,q));
  return interval[0]<=interval[1];
}

function cylinderTime(a,b,x,z,r,lo,hi) {
  const dx=b.x-a.x,dz=b.z-a.z,px=a.x-x,pz=a.z-z;
  const A=dx*dx+dz*dz,B=px*dx+pz*dz,C=px*px+pz*pz-r*r,range=[0,1];
  if(A<1e-16){if(C>0)return Infinity;}
  else{const disc=B*B-A*C;if(disc<0)return Infinity;const root=Math.sqrt(disc);
    range[0]=Math.max(0,(-B-root)/A);range[1]=Math.min(1,(-B+root)/A);}
  if(range[0]>range[1]||!clipAxis(a.y,b.y,lo,hi,range))return Infinity;
  return range[0];
}

const contactPoint={x:0,y:0,z:0},bodyPoint={x:0,y:0,z:0},paddingCover={};

export function earliestOrdinaryContact(p,end,dt,game,ignored=new Set()) {
  const a=p.pos,world=game.world;
  let result=null,best=Infinity;
  // Enumeration order is ordinary-contact tie precedence: ground, cover,
  // interiors, shields, props, fighters, then expiry. Pair events come last.
  const offer=(t,kind,target)=>{if(t>=0&&t<=1&&t<best&&!ignored.has(target||kind)){best=t;result={t,kind,target};}};
  if(p._armed||p._stuckTo){
    const time=p._armed?p._armT:p._stuckTo.alive?p._fuse:0;
    if(time<=dt)offer(Math.max(0,time/dt),'fuse');
    return result;
  }
  const verticalRadius=p.charged?p.radius:0,groundRadius=p.radius*(p.charged?1:.5);
  if(p.ground)offer(terrainEntry(world,a,end,groundRadius),'ground');
  for(const c of world.cover||[]){
    // A measured vehicle muzzle can sit inside its conservative hull AABB.
    // Only its own outgoing shot skips that proxy; deflection changes caster.
    if(c.frontlineVehicle&&c===p.launchCover&&p.caster===p.launchCaster)continue;
    offer(c.projectileShape==='box'?coverBoxEntry(a,end,c,p.radius,verticalRadius):cylinderTime(a,end,c.x,c.z,c.r+p.radius,-Infinity,c.h+verticalRadius),'cover',c);
  }
  if(!p._return)for(const room of world.interiors||[])for(const wall of room.walls){
    const range=[0,1],r=p.radius;
    const lx=Math.max(room.x-room.hx-r,wall.x-wall.hx-r),hx=Math.min(room.x+room.hx+r,wall.x+wall.hx+r);
    const lz=Math.max(room.z-room.hz-r,wall.z-wall.hz-r),hz=Math.min(room.z+room.hz+r,wall.z+wall.hz+r);
    if(lx<=hx&&lz<=hz&&clipAxis(a.x,end.x,lx,hx,range)&&clipAxis(a.z,end.z,lz,hz,range)&&clipAxis(a.y,end.y,-Infinity,room.top+verticalRadius,range))offer(range[0],'interior',wall);
  }
  for(const d of game._domes||[]){
    if(d.owner.team===p.caster.team||d.hp<=0)continue;
    offer(sphereTime(a,end,d,d.r),'dome',d);
  }
  for(const fl of game._flung||[]){
    if(fl.dead||fl.by===p.caster||(fl.by&&!game.isFoe(fl.by,p.caster)))continue;
    offer(sphereTime(a,end,fl,fl.r+p.radius+1.5),'prop',fl);
  }
  for(const f of game.entities||[]){
    if(!canReceiveShot(game,p.caster,f))continue;
    // Match overlapFoe's actual upright cylinder, including its height band.
    const top=f.bodyBounds?.max.y??f._crouchPose?.top??14;
    let time=f._pronePose?.weight?proneBoxTime(f,a,end,p.radius):cylinderTime(a,end,f.pos.x,f.pos.z,p.radius+1.5+f.radius,f.pos.y+(f.bodyBounds?.min.y??-4),f.pos.y+top);
    const anatomical=p.ballistic&&f.def?.zombieProfile?anatomicalBulletContact(f,a,end,p.radius):null;
    if(p.ballistic&&f.def?.zombieProfile)time=anatomical?.t??Infinity;
    const local={};
    if(!p.stick&&!p.armDelay&&!p.boomerang&&!(p._guidedSplit&&p.pierce)&&!ignored.has(f)&&naniteContact(f,a,end,p.radius,local,null,time>=0&&time<=1)){
      if(local.t<best&&!sweepSplitObstacle(world,a,local.naniteContact.point,0,paddingCover,false)){
        offer(local.t,'foe',f);result.naniteContact=local.naniteContact;
      }
      continue;
    }
    if(local.deferBody)continue;
    if(time>=0&&time<=1&&time<best&&!ignored.has(f)){
      contactPoint.x=a.x+(end.x-a.x)*time;contactPoint.y=a.y+(end.y-a.y)*time;contactPoint.z=a.z+(end.z-a.z)*time;
      // Hit generosity cannot project through a wall. Test the nearest physical
      // body surface, not just its center (a visible shoulder can flank cover).
      const dx=contactPoint.x-f.pos.x,dz=contactPoint.z-f.pos.z,distance=Math.hypot(dx,dz);
      const ratio=Math.min(1,f.radius/Math.max(1e-8,distance));
      bodyPoint.x=f.pos.x+dx*ratio;bodyPoint.z=f.pos.z+dz*ratio;
      bodyPoint.y=Math.max(f.pos.y,Math.min(f.pos.y+Math.min(10,top),contactPoint.y));
      if(f._pronePose?.weight)proneSurface(f,contactPoint,bodyPoint);
      if(!sweepSplitObstacle(world,contactPoint,bodyPoint,0,paddingCover,false)){offer(time,'foe',f);if(result.target===f&&anatomical)result.zone=anatomical.zone;}
    }
  }
  if(p.life<=dt)offer(Math.max(0,p.life/dt),'expiry');
  return result;
}

export function priorityEnabled(p) {
  return Number.isInteger(p.collisionPriority)&&p.collisionPriority>=0&&p.collisionPriority<=16;
}

// Ray against a finite capsule: projected cylinder plus the two spherical caps.
// t is the bullet's time, not the closest point on its swept spatial trail.
function capsuleTime(a,b,c,d,r){
  const ux=d.x-c.x,uy=d.y-c.y,uz=d.z-c.z,L=ux*ux+uy*uy+uz*uz;
  let best=Math.min(sphereTime(a,b,c,r),sphereTime(a,b,d,r));
  if(L<1e-16)return best;
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,wx=a.x-c.x,wy=a.y-c.y,wz=a.z-c.z;
  const du=dx*ux+dy*uy+dz*uz,wu=wx*ux+wy*uy+wz*uz;
  const A=dx*dx+dy*dy+dz*dz-du*du/L,B=wx*dx+wy*dy+wz*dz-wu*du/L;
  const C=wx*wx+wy*wy+wz*wz-wu*wu/L-r*r;
  if(C<=0 && wu>=0 && wu<=L)return 0;
  const disc=B*B-A*C;
  if(A>1e-16&&disc>=0){
    const t=(-B-Math.sqrt(disc))/A,s=(wu+du*t)/L;
    if(t>=0&&t<=1&&s>=0&&s<=1)best=Math.min(best,t);
  }
  return best;
}

export function sweptBeamTime(p,end,beam,world){
  let best=Infinity;
  const a={x:0,y:0,z:0},b={x:0,y:0,z:0},clip={};
  // The field is the already-emitted frame-boundary path, as with beam clashes.
  // No future tip extrapolation. Reclip to current obstacles without damaging them.
  for(let i=3;i<beam.pn*3;i+=3){
    a.x=beam.path[i-3];a.y=beam.path[i-2];a.z=beam.path[i-1];
    b.x=beam.path[i];b.y=beam.path[i+1];b.z=beam.path[i+2];
    const blocked=sweepSplitObstacle(world,a,b,beam.radius,clip,!!world._ghTriangles);
    if(blocked){b.x=a.x+(b.x-a.x)*clip.t;b.y=a.y+(b.y-a.y)*clip.t;b.z=a.z+(b.z-a.z)*clip.t;}
    best=Math.min(best,capsuleTime(p.pos,end,a,b,p.radius+beam.radius));
    if(blocked)break;
  }
  return best;
}
