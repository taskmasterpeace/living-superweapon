import {Vector3} from 'three';
import {sweepSplitObstacle} from './projectile-contact.js';

const from=new Vector3(),to=new Vector3(),obstacle={};

// Entry into a physical threat envelope along a segment (or seconds when the
// delta is velocity). No cone extending infinitely above/below the real shot.
function entry(x,y,z,dx,dy,dz,r,limit){
 const c=x*x+y*y+z*z-r*r;if(c<=0)return 0;
 const a=dx*dx+dy*dy+dz*dz,b=x*dx+y*dy+z*dz;
 if(a<1e-12||b>=0)return Infinity;
 const disc=b*b-a*c;if(disc<0)return Infinity;
 const t=(-b-Math.sqrt(disc))/a;return t<=limit?t:Infinity;
}

// Read the actual emitted stream; prediction uses each packet's retained
// velocity, never the caster's newly turned aim. This only nominates a threat:
// AI.observeThreat still enforces sight, blindness and per-shot reflex time.
export function beamThreatTime(beam,fighter,world,horizon=.55){
 if(beam.sustaining===undefined||beam.dead||beam.pendingLaunch||beam.pn<2||!beam.path)return Infinity;
 const p=beam.path,v=beam.pvel,cx=fighter.pos.x,cy=fighter.pos.y+5.2,cz=fighter.pos.z;
 const radius=(beam.radius||0)+(fighter.radius||2)+1;
 const receiver=beam._bodyContact?.fighter;
 const predict=!beam.blocked&&!beam.clashing&&(!receiver||receiver===fighter);
 let earliest=Infinity,arc=0;
 for(let i=1;i<beam.pn;i++){
  const a=(i-1)*3,b=i*3,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2];
  const length=Math.hypot(dx,dy,dz);arc+=length;
  if(length>1e-6&&entry(p[a]-cx,p[a+1]-cy,p[a+2]-cz,dx,dy,dz,radius,1)<Infinity)return 0;
  if(!predict||!v)continue;
  const vx=v[b],vy=v[b+1],vz=v[b+2],speed=Math.hypot(vx,vy,vz);
  if(speed<1e-6)continue;
  const limit=Math.min(horizon,Math.max(0,beam.maxLen-arc)/speed);
  const t=entry(p[b]-cx,p[b+1]-cy,p[b+2]-cz,vx,vy,vz,radius,limit);
  if(t>=earliest)continue;
  // Only pay terrain/cover work for a packet that could actually reach us.
  from.fromArray(p,b);to.set(from.x+vx*t,from.y+vy*t,from.z+vz*t);
  if(world&&sweepSplitObstacle(world,from,to,beam.radius||0,obstacle,!!world._ghTriangles))continue;
  earliest=t;
 }
 return earliest;
}
