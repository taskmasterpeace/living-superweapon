// Split a world-time interval at spatial clock boundaries. Velocity remains in
// local units/second; neither entering nor leaving permanently changes it.
export function fieldMotion(fields,pos,vel,owner,maxTime){
 if(!fields?.list.length)return {scale:1,time:maxTime};
 const speed=Math.hypot(vel.x,vel.y,vel.z),epsilon=speed>0?1e-7/speed:0;
 const ahead={x:pos.x+vel.x*epsilon,y:pos.y+vel.y*epsilon,z:pos.z+vel.z*epsilon};
 const scale=fields.scaleAt(ahead,owner);
 let time=maxTime;
 if(speed>1e-9)for(const f of fields.list){
  if(f.t<=0||f.src===owner||f.follow&&!f.src?.alive)continue;
  const c=f.follow?f.src.pos:f,x=pos.x-c.x,y=pos.y-c.y,z=pos.z-c.z;
  const vx=vel.x*scale,vy=vel.y*scale,vz=vel.z*scale,a=vx*vx+vy*vy+vz*vz;
  const b=x*vx+y*vy+z*vz,d=b*b-a*(x*x+y*y+z*z-f.r*f.r);
  if(d<=0)continue;
  for(const t of [(-b-Math.sqrt(d))/a,(-b+Math.sqrt(d))/a])if(t>1e-8&&t<time)time=t;
 }
 return {scale,time};
}

export function updateFieldProjectile(p,dt,game){
 if(!game.timeFields?.list.length)return p.update(dt,game);
 let left=dt;
 while(left>1e-12){
  const clock=fieldMotion(game.timeFields,p.pos,p.vel,p.caster,Math.min(left,1/120));
  if(!p.update(clock.time*clock.scale,game))return false;
  left-=clock.time;
 }
 return true;
}
