import {sweepSplitObstacle} from './projectile-contact.js';
import {Vector3} from 'three';
export function thrownPropShape(c){return {radius:c.kind==='rock'?(c.size||2.8):c.kind==='plane'?4:c.kind==='car'?5:2.5,hitRadius:c.kind==='plane'?22:c.kind==='car'?13:c.kind==='rock'?Math.max(7,(c.size||2.8)*2.1):10,hitHeight:c.kind==='plane'?20:c.kind==='car'?16:c.kind==='rock'?Math.max(10,(c.size||2.8)*2.8):14};}
export function previewPropThrow(f,game){
 const c=f._carry;if(!c)return null;
 const pos=f.muzzle(new Vector3(),5,6.4),vel=f.aim3.clone().multiplyScalar(c.spd||74);vel.y+=.34*(c.spd||74);
 const points=[pos.clone()],shape=thrownPropShape(c);let contact=null;
 for(let i=0;i<240;i++){vel.y-=62/60;const next=pos.clone().addScaledVector(vel,1/60);contact=thrownPropContact(game,f,pos,next,shape);if(contact)next.lerpVectors(pos,next,contact.t);points.push(next);pos.copy(next);if(contact)break;}
 return {points,contact};
}

// Keep the existing fighter hit volume, but test the complete traveled segment.
// The earliest solid obstacle wins over a fighter behind it.
export function thrownPropContact(game,owner,a,b,{radius,hitRadius,hitHeight}){
 const obstacle={};let best=sweepSplitObstacle(game.world,a,b,radius,obstacle,true,radius)?obstacle.t:Infinity;
 let kind=best<Infinity?obstacle.kind:null,target=best<Infinity?obstacle.target:null;
 for(const f of game.entities){
  if(!game.isFoe(owner,f))continue;
  const x=a.x-f.pos.x,z=a.z-f.pos.z,dx=b.x-a.x,dz=b.z-a.z,r=hitRadius+f.radius;
  const A=dx*dx+dz*dz,B=x*dx+z*dz,C=x*x+z*z-r*r;let enter=0,leave=1;
  if(A<1e-12){if(C>0)continue;}else{const disc=B*B-A*C;if(disc<0)continue;const root=Math.sqrt(disc);enter=Math.max(0,(-B-root)/A);leave=Math.min(1,(-B+root)/A);}
  const dy=b.y-a.y,low=f.pos.y+5-hitHeight,high=f.pos.y+5+hitHeight;
  if(Math.abs(dy)<1e-12){if(a.y<low||a.y>high)continue;}else{const t1=(low-a.y)/dy,t2=(high-a.y)/dy;enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));}
  if(enter<=leave&&enter<best){best=enter;kind='fighter';target=f;}
 }
 return best<Infinity?{t:best,kind,target}:null;
}
