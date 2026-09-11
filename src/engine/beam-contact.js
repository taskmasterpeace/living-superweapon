// Capsule overlap along the traveled hose, never its future maximum reach.
// Scalar math keeps the bounded segment-pair loop allocation-free.
const unit = n => Math.max(0, Math.min(1, n));
export function beamPathsTouch(a, b, contact) {
  const p=a.path,q=b.path,r=a.radius+b.radius,r2=r*r;
  for(let i=3;i<a.pn*3;i+=3) for(let j=3;j<b.pn*3;j+=3){
    const ax=p[i-3],ay=p[i-2],az=p[i-1],bx=q[j-3],by=q[j-2],bz=q[j-1];
    if(Math.max(ax,p[i])+r<Math.min(bx,q[j]) || Math.max(bx,q[j])+r<Math.min(ax,p[i]) ||
       Math.max(ay,p[i+1])+r<Math.min(by,q[j+1]) || Math.max(by,q[j+1])+r<Math.min(ay,p[i+1]) ||
       Math.max(az,p[i+2])+r<Math.min(bz,q[j+2]) || Math.max(bz,q[j+2])+r<Math.min(az,p[i+2]))continue;
    const ux=p[i]-ax,uy=p[i+1]-ay,uz=p[i+2]-az,vx=q[j]-bx,vy=q[j+1]-by,vz=q[j+2]-bz;
    const wx=ax-bx,wy=ay-by,wz=az-bz;
    const A=ux*ux+uy*uy+uz*uz,B=ux*vx+uy*vy+uz*vz,C=vx*vx+vy*vy+vz*vz;
    const D=ux*wx+uy*wy+uz*wz,E=vx*wx+vy*wy+vz*wz;
    let s=0,t=0;
    if(A<=1e-12){if(C>1e-12)t=unit(E/C);}
    else if(C<=1e-12)s=unit(-D/A);
    else{
      const den=A*C-B*B;
      s=den>1e-12*A*C?unit((B*E-C*D)/den):0;
      t=(B*s+E)/C;
      if(t<0){t=0;s=unit(-D/A);}
      else if(t>1){t=1;s=unit((B-D)/A);}
    }
    const dx=wx+s*ux-t*vx,dy=wy+s*uy-t*vy,dz=wz+s*uz-t*vz;
    if(dx*dx+dy*dy+dz*dz<=r2){
      if(contact)contact.set((ax+s*ux+bx+t*vx)*.5,(ay+s*uy+by+t*vy)*.5,(az+s*uz+bz+t*vz)*.5);
      return true;
    }
  }
  return false;
}

// Absorb packets at the contact knot. Keep the traveled curve before the nearest
// segment, instead of retracting it to a caster midpoint or making a straight ray.
export function pinBeamContact(beam, contact){
  const p=beam.path;let best=Infinity,cut=1;
  for(let i=3;i<beam.pn*3;i+=3){
    const ax=p[i-3],ay=p[i-2],az=p[i-1],ux=p[i]-ax,uy=p[i+1]-ay,uz=p[i+2]-az;
    const t=unit(((contact.x-ax)*ux+(contact.y-ay)*uy+(contact.z-az)*uz)/(ux*ux+uy*uy+uz*uz||1));
    const dx=contact.x-ax-t*ux,dy=contact.y-ay-t*uy,dz=contact.z-az-t*uz,d=dx*dx+dy*dy+dz*dz;
    if(d<best){best=d;cut=i/3;}
  }
  beam.pn=cut+1;const i=cut*3;
  p[i]=contact.x;p[i+1]=contact.y;p[i+2]=contact.z;
  beam.pvel[i]=beam.pvel[i+1]=beam.pvel[i+2]=0;
}
