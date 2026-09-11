// Teleport can cross a wall, but cannot materialize inside it. Search backward
// along the requested direction, never toward an auto-selected opponent.
export function teleportDestination(fighter, dir, range, world) {
  const length=Math.hypot(dir?.x,dir?.z);
  if(!Number.isFinite(length)||length<0.001||!Number.isFinite(range)||range<=0)return null;
  const dx=dir.x/length,dz=dir.z/length,p=fighter.pos,r=fighter.radius||2.2;
  const bound=(world?.ARENA??240)-4;
  let reach=range;
  if(dx>0)reach=Math.min(reach,(bound-p.x)/dx);
  if(dx<0)reach=Math.min(reach,(-bound-p.x)/dx);
  if(dz>0)reach=Math.min(reach,(bound-p.z)/dz);
  if(dz<0)reach=Math.min(reach,(-bound-p.z)/dz);
  const overlaps=(x,z,b)=>Math.abs(x-b.x)<(b.hx??b.r)+r+0.05&&Math.abs(z-b.z)<(b.hz??b.r)+r+0.05;
  for(let distance=reach;distance>=0.5;distance-=0.5){
    const x=p.x+dx*distance,z=p.z+dz*distance;
    if(Math.abs(x)>bound||Math.abs(z)>bound)continue;
    if((world?.heightAt?.(x,z)??0)>p.y+0.05)continue;
    if((world?.cover||[]).some(b=>p.y<(b.top??b.h)-0.5&&overlaps(x,z,b)))continue;
    if((world?.interiors||[]).some(b=>{
      if(!overlaps(x,z,b)||p.y>=b.top-0.5)return false;
      return p.y>b.top-11||(b.walls||[]).some(w=>overlaps(x,z,w));
    }))continue;
    return {x,y:p.y,z};
  }
  return null;
}
