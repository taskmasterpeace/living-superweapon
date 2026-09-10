// Render-only rounded joins on the ballistic polyline. Each half of a rounded
// corner stays within radius/4 of its own physical segment. Physics never moves.
export class BeamCurve {
  constructor(nodes) {
    this.capacity=Math.max(20,(nodes-2)*19+20); // <=18 angular samples per corner + reversal nozzle
    this.points=new Float32Array(this.capacity*3);
    this.caps=new Uint8Array(this.capacity);
    this.tangents=new Float32Array(this.capacity*3);
    this.radii=new Float32Array(this.capacity);
    this.count=0;this.length=0;
  }
  _append(x,y,z,cap=0){
    // Deduplicate in the representation actually stored/rendered. At world
    // height, a distinct double can quantize back onto the previous ring.
    x=Math.fround(x);y=Math.fround(y);z=Math.fround(z);
    const out=this.points,at=this.count*3;
    if(this.count){const distance=Math.hypot(x-out[at-3],y-out[at-2],z-out[at-1]);if(distance<1e-7&&!cap)return;this.length+=distance;}
    this.caps[this.count]=cap;
    out[at]=x;out[at+1]=y;out[at+2]=z;this.count++;
  }
  _nozzle(x,y,z,emission,radius){
    const out=this.points,ax=out[0],ay=out[1],az=out[2],dx=x-ax,dy=y-ay,dz=z-az,length=Math.hypot(dx,dy,dz);
    if(!emission||length<1e-7){this._append(x,y,z);return;}
    // Resolve the bend inside a short collar, then append the straight span.
    // Eight uniform samples over a long segment skipped the nozzle entirely.
    const reach=Math.min(length,radius),nx=ax+dx/length*reach,ny=ay+dy/length*reach,nz=az+dz/length*reach;
    const h=Math.min(reach/3,radius*.25),el=Math.hypot(emission.x,emission.y,emission.z)||1;
    const bx=ax+emission.x/el*h,by=ay+emission.y/el*h,bz=az+emission.z/el*h;
    const cx=nx-dx/length*h,cy=ny-dy/length*h,cz=nz-dz/length*h;
    const cosine=(emission.x*dx+emission.y*dy+emission.z*dz)/(el*length),reverse=cosine<-.7;
    // Near a reversal, the cubic turns sharply close to its start. Sample both
    // sides of the backward-axis turning point; uniform t skipped that turn.
    const pivot=reverse?(reach+h-Math.hypot(reach,h))/(2*reach):1,steps=reverse?16:8;
    for(let j=1;j<=steps;j++){
      const t=reverse?(j<=8?pivot*j/8:pivot+(1-pivot)*(j-8)/8):j/8,u=1-t;
      this._append(u*u*u*ax+3*u*u*t*bx+3*u*t*t*cx+t*t*t*nx,u*u*u*ay+3*u*u*t*by+3*u*t*t*cy+t*t*t*ny,u*u*u*az+3*u*u*t*bz+3*u*t*t*cz+t*t*t*nz);
      if(reverse&&j===8&&cosine<-.999999){const at=(this.count-1)*3;this.caps[this.count-1]=1;this._append(out[at],out[at+1],out[at+2],2);}
    }
    this._append(x,y,z);
  }
  _frames(emission){
    const p=this.points,n=this.tangents;
    for(let i=0;i<this.count;i++){
      const o=i*3,a=Math.max(0,i-1)*3,b=Math.min(this.count-1,i+1)*3;
      let ux=p[o]-p[a],uy=p[o+1]-p[a+1],uz=p[o+2]-p[a+2],vx=p[b]-p[o],vy=p[b+1]-p[o+1],vz=p[b+2]-p[o+2];
      const ul=Math.hypot(ux,uy,uz)||1,vl=Math.hypot(vx,vy,vz)||1;
      let x=ux/ul+vx/vl,y=uy/ul+vy/vl,z=uz/ul+vz/vl;
      if(i===0&&emission){x=emission.x;y=emission.y;z=emission.z;}
      let length=Math.hypot(x,y,z);if(length<1e-7){x=0;y=0;z=1;length=1;}
      n[o]=x/length;n[o+1]=y/length;n[o+2]=z/length;
    }
    for(let i=0;i<this.count;i++){
      let limit=Infinity;const o=i*3;
      for(let j=i-1;j<=i+1;j+=2){
        if(j<0||j>=this.count)continue;const q=j*3,length=Math.hypot(p[q]-p[o],p[q+1]-p[o+1],p[q+2]-p[o+2]);
        // Limit the inner-offset speed using how quickly the actual ring frame
        // turns, not only how a single ring projects onto its chord.
        const turn=Math.hypot(n[q]-n[o],n[q+1]-n[o+1],n[q+2]-n[o+2]);
        if(length>1e-7&&turn>1e-7)limit=Math.min(limit,.8*length/turn);
        if(length>1e-7){
          const cosine=Math.max(-1,Math.min(1,(n[o]*(p[q]-p[o])+n[o+1]*(p[q+1]-p[o+1])+n[o+2]*(p[q+2]-p[o+2]))/length));
          const sine=Math.sqrt(Math.max(0,1-cosine*cosine));
          if(sine>1e-7)limit=Math.min(limit,.48*length/sine);
        }
      }
      this.radii[i]=this.caps[i]?0:limit;
    }
  }
  update(path,count,emission,radius) {
    this.count=0;this.length=0;this._append(path[0],path[1],path[2]);let nozzle=true;
    for(let i=1;i<count-1;i++){
      const b=i*3,ax=path[b-3],ay=path[b-2],az=path[b-1],bx=path[b],by=path[b+1],bz=path[b+2],cx=path[b+3],cy=path[b+4],cz=path[b+5];
      let ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-bx,vy=cy-by,vz=cz-bz;
      const incoming=Math.hypot(ux,uy,uz),outgoing=Math.hypot(vx,vy,vz);
      if(incoming<1e-7||outgoing<1e-7){if(nozzle)this._nozzle(bx,by,bz,emission,radius);else this._append(bx,by,bz);nozzle=this.count===1;continue;}
      ux/=incoming;uy/=incoming;uz/=incoming;vx/=outgoing;vy/=outgoing;vz/=outgoing;
      const angle=Math.acos(Math.max(-1,Math.min(1,ux*vx+uy*vy+uz*vz))),sin=Math.sin(angle);
      // A true reversal is a physical cusp, not permission to invent a loop.
      if(angle<.001||Math.PI-angle<.001){
        if(nozzle)this._nozzle(bx,by,bz,emission,radius);else this._append(bx,by,bz);nozzle=false;
        // Coincident zero-radius rings close/reopen a true cusp, each with its
        // own incident direction. No loop, twisted seam or invented travel.
        if(Math.PI-angle<.001){this.caps[this.count-1]=1;this._append(bx,by,bz,2);}
        continue;
      }
      // At t<=.5, distance from the incoming segment is d*t²*sin(angle),
      // hence <=d*sin(angle)/4. The second half is symmetric. Neighboring
      // trims each take <=45% of a segment, so rounded joins cannot overlap.
      const d=Math.min(incoming*.45,outgoing*.45,radius/Math.max(1e-8,sin));
      const sx=bx-ux*d,sy=by-uy*d,sz=bz-uz*d,ex=bx+vx*d,ey=by+vy*d,ez=bz+vz*d;
      if(nozzle)this._nozzle(sx,sy,sz,emission,radius);else this._append(sx,sy,sz);nozzle=false;
      // Include t=.5 exactly: every rendered chord must stay within ONE half's
      // convex segment corridor, not cut across the union between two halves.
      const steps=2*Math.ceil(angle/(Math.PI/9));
      for(let j=1;j<=steps;j++){
        const phi=angle*j/steps,t=j===steps?1:Math.sin(phi)/(Math.sin(phi)+Math.sin(angle-phi)),u=1-t;
        this._append(u*u*sx+2*u*t*bx+t*t*ex,u*u*sy+2*u*t*by+t*t*ey,u*u*sz+2*u*t*bz+t*t*ez);
      }
    }
    const end=(count-1)*3;
    if(nozzle)this._nozzle(path[end],path[end+1],path[end+2],emission,radius);else this._append(path[end],path[end+1],path[end+2]);
    this._frames(emission);return this;
  }
}
