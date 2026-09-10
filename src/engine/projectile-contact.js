// Earliest contact with the existing collision shapes, without sampling across
// thin geometry. Shared by guided projectiles, beam packets and beam segments.
function boxEntry(a,b,lx,hx,lz,hz,top,bottom=-Infinity){
  let enter=0,leave=1,d=b.x-a.x;
  if(Math.abs(d)<1e-12){if(a.x<lx||a.x>hx)return Infinity;}
  else{const p=(lx-a.x)/d,q=(hx-a.x)/d;enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));}
  d=b.z-a.z;
  if(Math.abs(d)<1e-12){if(a.z<lz||a.z>hz)return Infinity;}
  else{const p=(lz-a.z)/d,q=(hz-a.z)/d;enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));}
  d=b.y-a.y;
  if(Math.abs(d)<1e-12){if(a.y>top||a.y<bottom)return Infinity;}
  else{
    const p=(bottom-a.y)/d,q=(top-a.y)/d;
    enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));
  }
  return enter<=leave?enter:Infinity;
}

// PowerWorld opts into the same box used by body/camera collision. A circle
// around a rotated rock can enclose legal standing space outside that box and
// catch outward shots at their muzzle. Unmarked city cover keeps its cylinder.
export function coverBoxEntry(a,b,c,radius=0,topPadding=0){
  return boxEntry(a,b,c.x-c.hx-radius,c.x+c.hx+radius,c.z-c.hz-radius,c.z+c.hz+radius,(c.top??c.h)+topPadding,
    Number.isFinite(c.bottom)?c.bottom-topPadding:-Infinity);
}

// Native terrain is piecewise linear, not a flat y=0 floor. Split the motion
// at grid edges and each crossed triangle diagonal; clearance is linear inside
// every interval. Endpoint-only checks miss a ridge between two clear points.
export function terrainEntry(world,a,b,verticalRadius=0){
  if(world._outerTerrain&&world._ghTriangles&&world._gh&&world._gseg){
    const A=world._ghArena||world.ARENA;
    if(Math.max(Math.abs(a.x),Math.abs(a.z),Math.abs(b.x),Math.abs(b.z))>A){
      let best=world._outerTerrain.entry(a,b,verticalRadius),enter=0,leave=1;
      // Clip to the real square before applying native grid traversal. Letting
      // the grid clamp exterior coordinates invents an invisible edge floor.
      for(const axis of ['x','z']){
        const d=b[axis]-a[axis];
        if(Math.abs(d)<1e-12){if(Math.abs(a[axis])>A)return best;}
        else{
          const p=(-A-a[axis])/d,q=(A-a[axis])/d;
          enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));
        }
      }
      if(enter<=leave){
        const point=t=>({x:Math.max(-A,Math.min(A,a.x+(b.x-a.x)*t)),y:a.y+(b.y-a.y)*t,z:Math.max(-A,Math.min(A,a.z+(b.z-a.z)*t))});
        const t=nativeTerrainEntry(world,point(enter),point(leave),verticalRadius);
        if(t!==Infinity)best=Math.min(best,enter+t*(leave-enter));
      }
      return best;
    }
  }
  return nativeTerrainEntry(world,a,b,verticalRadius);
}
function nativeTerrainEntry(world,a,b,verticalRadius){
  if(!world._ghTriangles||!world._gh||!world._gseg){
    return b.y<=verticalRadius?(a.y<=verticalRadius?0:(a.y-verticalRadius)/(a.y-b.y)):Infinity;
  }
  const S=world._gseg,A=world._ghArena||world.ARENA,k=S/(2*A),limit=S-.0001;
  const ux=(a.x+A)*k,uz=(a.z+A)*k,dx=(b.x-a.x)*k,dz=(b.z-a.z)*k,dy=b.y-a.y;
  const clampGrid=v=>Math.max(0,Math.min(limit,v));
  const cuts=[0,1];
  const edges=(start,delta)=>{
    if(Math.abs(delta)<1e-12)return;
    const low=Math.max(0,Math.ceil(Math.min(start,start+delta))),high=Math.min(S-1,Math.floor(Math.max(start,start+delta)));
    for(let n=low;n<=high;n++){const t=(n-start)/delta;if(t>0&&t<1)cuts.push(t);}
    const t=(limit-start)/delta;if(t>0&&t<1)cuts.push(t);
  };
  edges(ux,dx);edges(uz,dz);cuts.sort((x,y)=>x-y);
  const clearance=t=>a.y+dy*t-world.heightAt(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)-verticalRadius;
  let previous=clearance(0);
  if(previous<=0)return 0;
  for(let i=1;i<cuts.length;i++){
    const lo=cuts[i-1],hi=cuts[i];if(hi-lo<1e-12)continue;
    const mid=(lo+hi)*.5,diagonal=Math.floor(clampGrid(ux+dx*mid))+Math.floor(clampGrid(uz+dz*mid))+1;
    const left=clampGrid(ux+dx*lo)+clampGrid(uz+dz*lo)-diagonal;
    const right=clampGrid(ux+dx*hi)+clampGrid(uz+dz*hi)-diagonal;
    let start=lo;
    if(left*right<0){
      const split=lo+(hi-lo)*left/(left-right),at=clearance(split);
      if(at<=0)return lo+(split-lo)*previous/(previous-at);
      previous=at;start=split;
    }
    const at=clearance(hi);
    if(at<=0)return start+(hi-start)*previous/(previous-at);
    previous=at;
  }
  return Infinity;
}

// Projectile height rules stay unchanged by default. Limb-volume callers can
// explicitly expand obstacle tops without changing projectile/beam balance.
export function sweepSplitObstacle(world,a,b,radius,out,ground=true,topPadding=0){
  let best=Infinity,isGround=false,kind=null,target=null;
  if(ground){
    best=terrainEntry(world,a,b,radius*.5);
    if(best!==Infinity){isGround=true;kind='ground';}
  }
  for(const c of world.cover||[]){
    if(c.projectileShape==='box'){
      const t=coverBoxEntry(a,b,c,radius,topPadding);
      if(t<best){best=t;isGround=false;kind='cover';target=c;}
      continue;
    }
    const top=c.h+topPadding;
    const x=a.x-c.x,z=a.z-c.z,dx=b.x-a.x,dz=b.z-a.z,r=c.r+radius;
    const A=dx*dx+dz*dz,B=x*dx+z*dz,C=x*x+z*z-r*r;
    let enter=0,leave=1;
    if(A<1e-12){if(C>0)continue;}
    else{
      const disc=B*B-A*C;if(disc<0)continue;
      const root=Math.sqrt(disc);enter=Math.max(0,(-B-root)/A);leave=Math.min(1,(-B+root)/A);
    }
    const dy=b.y-a.y;
    if(Math.abs(dy)<1e-12){if(a.y>=top)continue;}
    else if(dy>0)leave=Math.min(leave,(top-a.y)/dy);
    else enter=Math.max(enter,(top-a.y)/dy);
    if(enter<=leave && enter<best){best=enter;isGround=false;kind='cover';target=c;}
  }
  for(const room of world.interiors||[]){
   const top=room.top+topPadding;
   // A swept AABB broad phase avoids walking every wall in every distant room
   // for each packet. It rejects only segments wholly outside the room bounds.
   if(Math.min(a.y,b.y)>top||Math.max(a.x,b.x)<room.x-room.hx-radius||Math.min(a.x,b.x)>room.x+room.hx+radius||
     Math.max(a.z,b.z)<room.z-room.hz-radius||Math.min(a.z,b.z)>room.z+room.hz+radius)continue;
   for(const wall of room.walls){
    const lx=Math.max(room.x-room.hx-radius,wall.x-wall.hx-radius),hx=Math.min(room.x+room.hx+radius,wall.x+wall.hx+radius);
    const lz=Math.max(room.z-room.hz-radius,wall.z-wall.hz-radius),hz=Math.min(room.z+room.hz+radius,wall.z+wall.hz+radius);
    if(lx>hx||lz>hz)continue;
    const t=boxEntry(a,b,lx,hx,lz,hz,top);
    if(t<best){best=t;isGround=false;kind='interior';target=wall;}
  }
  }
  if(best===Infinity)return false;
  out.t=best;out.ground=isGround;out.kind=kind;out.target=target;return true;
}
