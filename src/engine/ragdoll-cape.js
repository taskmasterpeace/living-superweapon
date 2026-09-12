import * as THREE from 'three';
const AXES=['x','y','z'];
const SURFACE_WEIGHTS=[[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5],[2/3,1/6,1/6],[1/6,2/3,1/6],[1/6,1/6,2/3]];

// Cosmetic cloth, separate from the authoritative fighter/Verlet skeleton.
// The existing garment supplies its grid and captured shape. Only its shoulder
// row is kinematic; free vertices retain inertia and settle against body/terrain.
export class RagdollCape {
  constructor(parts,velocity){
    this.parts=parts;this.mesh=parts.cape;
    const g=this.mesh.geometry,a=g.attributes.position;
    this.rest=a.array.slice();this.columns=g.parameters.widthSegments+1;
    this.rows=g.parameters.heightSegments+1;this.points=[];this.links=[];
    this.inverse=new THREE.Matrix4();this.local=new THREE.Vector3();this.before=new THREE.Vector3();this.delta=new THREE.Vector3();
    this.velocity=new THREE.Vector3();this.normal=new THREE.Vector3();this.contactNormal=new THREE.Vector3();
    this.contactSlide=new THREE.Vector3();this.contactOffset=new THREE.Vector3();
    this.proposalNormal=new THREE.Vector3();this.projected=new THREE.Vector3();
    this.faceTargets=Array.from({length:3},()=>new THREE.Vector3());this.proposalTargets=Array.from({length:3},()=>new THREE.Vector3());
    this.mobility=new Float64Array(3);
    this.coverProbe=new THREE.Triangle();this.coverBefore=new THREE.Triangle();this.coverProbeBox=new THREE.Box3();this.coverStamp=0;
    this.dt=1/120;this.started=false;this.still=0;this.asleep=false;
    this.mesh.updateWorldMatrix(true,false);
    for(let i=0;i<a.count;i++){
      const local=new THREE.Vector3().fromBufferAttribute(a,i),pos=local.clone().applyMatrix4(this.mesh.matrixWorld);
      this.points.push({local,pos,prev:pos.clone().addScaledVector(velocity,-this.dt),pin:i<this.columns,target:pos.clone(),last:pos.clone(),contactNormals:[],contactOffsets:[],contactCount:0,faces:[]});
    }
    // Initial pose/restore data is separate from the garment's material metric.
    // Flight folds and flutter must not become permanent stretch at knockout.
    const material=this.mesh.userData.rest||this.rest;
    const bind=this.points.map((_,i)=>new THREE.Vector3().fromArray(material,i*3).applyMatrix4(this.mesh.matrixWorld));
    const add=(a,b,k)=>this.links.push({a,b,k,length:bind[a].distanceTo(bind[b])});
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.columns;x++){
      const i=y*this.columns+x;
      if(x+1<this.columns)add(i,i+1,1);if(y+1<this.rows)add(i,i+this.columns,1);
      if(x+1<this.columns&&y+1<this.rows){add(i,i+this.columns+1,.65);add(i+1,i+this.columns,.65);}
      if(y+2<this.rows)add(i,i+this.columns*2,.12);
    }
    const meshes=[parts.torso,parts.pelvis,parts.head];
    for(const side of ['L','R']){
      meshes.push(...parts['arm'+side].children.slice(0,3));
      const leg=parts['leg'+side].userData;meshes.push(leg.thigh,leg.shin,leg.boot);
    }
    // Conservative mesh-local body envelopes, not a second gameplay collider.
    this.bodies=meshes.map(mesh=>{
      mesh.geometry.computeBoundingBox();
      return {mesh,matrix:mesh.matrixWorld,lastMatrix:new THREE.Matrix4(),box:mesh.geometry.boundingBox.clone().expandByScalar(.025),worldBox:new THREE.Box3(),inverse:new THREE.Matrix4()};
    });
    this.covers=[];this.colliders=[...this.bodies];
    this.intervals=new Float64Array(this.bodies.length*2);this.candidate=new THREE.Vector3();this.escape=new THREE.Vector3();
    this.escapeNormal=new THREE.Vector3();
    this.sample=new THREE.Vector3();this.contactDelta=new THREE.Vector3();
    this.triangle=new THREE.Triangle();this.triBox=new THREE.Box3();this.faces=[];
    this.sleepFloor=new Float64Array(this.points.length);
    for(let i=0;i<g.index.count;i+=3){const face=[this.points[g.index.getX(i)],this.points[g.index.getX(i+1)],this.points[g.index.getX(i+2)]];this.faces.push(face);for(const p of face)p.faces.push(face);}
    g.userData.deformsWithRig=true;a.setUsage(THREE.DynamicDrawUsage);
  }
  update(dt,world){
    this.contactWorld=world;
    this.mesh.updateWorldMatrix(true,false);
    if(dt<=0){
      // Inspection can rigidly place the whole captured physics skeleton before
      // its first step. Keep the cloth in that same captured pose, without aging it.
      if(!this.started)for(const p of this.points){this.delta.subVectors(p.pos,p.prev);p.pos.copy(p.local).applyMatrix4(this.mesh.matrixWorld);p.prev.copy(p.pos).sub(this.delta);p.last.copy(p.pos);}
      return;
    }
    this.started=true;dt=Math.min(dt,.05);
    let pinMotion=0;
    for(let i=0;i<this.columns;i++){const p=this.points[i];p.target.copy(p.local).applyMatrix4(this.mesh.matrixWorld);pinMotion=Math.max(pinMotion,p.target.distanceToSquared(p.last));}
    if(this.asleep&&pinMotion<1e-10){
      if(!this.contactChanged(world))return;
      this.asleep=false;this.still=0;
    }
    if(pinMotion>1e-8){this.asleep=false;this.still=0;}
    for(const body of this.bodies){
      if(body.mesh.geometry.userData.deformsWithRig)body.box.copy(body.mesh.geometry.boundingBox).expandByScalar(.025);
      body.inverse.copy(body.mesh.matrixWorld).invert();body.worldBox.copy(body.box).applyMatrix4(body.mesh.matrixWorld);
      body.lastMatrix.copy(body.mesh.matrixWorld);
    }
    const cover=world?.cover||[];this.covers.length=cover.length;
    this.colliders.length=this.bodies.length;
    for(let i=0;i<cover.length;i++){
      const c=cover[i],solid=this.covers[i]||(this.covers[i]={cover:true,box:new THREE.Box3(),worldBox:new THREE.Box3(),matrix:new THREE.Matrix4(),inverse:new THREE.Matrix4()});
      const hx=c.hx??c.r,hz=c.hz??c.r;
      solid.box.min.set(c.x-hx-.035,-10000,c.z-hz-.035);solid.box.max.set(c.x+hx+.035,(c.top??c.h)+.035,c.z+hz+.035);
      solid.worldBox.copy(solid.box);this.colliders.push(solid);
    }
    if(this.intervals.length<this.colliders.length*2)this.intervals=new Float64Array(this.colliders.length*2);
    const steps=Math.ceil(dt*120),h=dt/steps,damping=Math.exp(-3.5*h);
    for(let step=0;step<steps;step++){
      for(const p of this.points){
        // This substep's real start, separate from velocity bookkeeping and
        // from last (the frame's displayed pose, used for sleep/entry masks).
        (p.sweep||(p.sweep=new THREE.Vector3())).copy(p.pos);
        if(p.pin){p.pos.lerpVectors(p.last,p.target,(step+1)/steps);p.prev.copy(p.pos);continue;}
        this.delta.subVectors(p.pos,p.prev).multiplyScalar(h/this.dt*damping);p.prev.copy(p.pos);p.pos.add(this.delta);p.pos.y-=62*h*h;
      }
      this.dt=h;
      let surfaceCorrection=0;
      for(let it=0;it<6;it++){
        for(const p of this.points)p.contactCount=0;
        for(const link of this.links){
          const a=this.points[link.a],b=this.points[link.b];this.delta.subVectors(b.pos,a.pos);const length=this.delta.length();
          if(length<1e-8||a.pin&&b.pin)continue;
          this.delta.multiplyScalar((length-link.length)/length*link.k/(a.pin||b.pin?1:2));
          if(!a.pin)a.pos.add(this.delta);if(!b.pin)b.pos.sub(this.delta);
        }
        this.collideCoverSurface(world);
        for(const p of this.points)if(!p.pin)this.collide(p,world);
        surfaceCorrection=this.collideSurface(world);
      }
      // Shared vertices let a late face contact invalidate an earlier face.
      // Finish contact convergence without reapplying stretch constraints and
      // pulling the garment back into the body. Clear surfaces need no tail.
      for(let it=0;surfaceCorrection>1e-10&&it<12;it++){
        for(const p of this.points)if(!p.pin)this.collide(p,world);
        surfaceCorrection=this.collideSurface(world);
      }
    }
    // Measure DISPLAYED motion, not the solver's provisional Verlet velocity:
    // contact correction can leave a nonzero prev delta at an unchanged surface.
    let energy=0,maximum=0;
    for(const p of this.points)if(!p.pin){const speed2=p.pos.distanceToSquared(p.last)/(dt*dt);energy+=speed2;maximum=Math.max(maximum,speed2);p.last.copy(p.pos);}
    for(let i=0;i<this.columns;i++)this.points[i].last.copy(this.points[i].target);
    if(pinMotion<1e-10&&energy/this.points.length<.0144&&maximum<1)this.still+=dt;else this.still=0;
    this.asleep=this.still>.6;
    if(this.asleep)for(let i=this.columns;i<this.points.length;i++){const p=this.points[i];this.sleepFloor[i]=world?.heightAt?.(p.pos.x,p.pos.z)||0;}
    this.inverse.copy(this.mesh.matrixWorld).invert();const g=this.mesh.geometry,a=g.attributes.position;
    for(let i=0;i<this.points.length;i++){this.local.copy(this.points[i].pos).applyMatrix4(this.inverse);a.setXYZ(i,this.local.x,this.local.y,this.local.z);}
    a.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();if(g.boundingBox)g.computeBoundingBox();
  }
  contactChanged(world){
    // A settled cape can be disturbed without moving its shoulder row: a limb
    // moves, cover is destroyed/placed, or an explosion excavates its support.
    // Read contact state only; unchanged cloth still does no solve or upload.
    for(const body of this.bodies){
      body.mesh.updateWorldMatrix(true,false);
      const previous=body.lastMatrix.elements,current=body.mesh.matrixWorld.elements;
      for(let i=0;i<16;i++)if(Math.abs(previous[i]-current[i])>1e-9)return true;
      if(body.mesh.geometry.userData.deformsWithRig){
        const box=body.mesh.geometry.boundingBox;
        for(const key of AXES)if(Math.abs(body.box.min[key]-(box.min[key]-.025))>1e-9||Math.abs(body.box.max[key]-(box.max[key]+.025))>1e-9)return true;
      }
    }
    const cover=world?.cover||[];
    if(cover.length!==this.covers.length)return true;
    for(let i=0;i<cover.length;i++){
      const c=cover[i],box=this.covers[i].box,hx=c.hx??c.r,hz=c.hz??c.r;
      if(Math.abs(box.min.x-(c.x-hx-.035))>1e-9||Math.abs(box.max.x-(c.x+hx+.035))>1e-9||Math.abs(box.min.z-(c.z-hz-.035))>1e-9||Math.abs(box.max.z-(c.z+hz+.035))>1e-9||Math.abs(box.max.y-((c.top??c.h)+.035))>1e-9)return true;
    }
    for(let i=this.columns;i<this.points.length;i++){
      const p=this.points[i];if(Math.abs((world?.heightAt?.(p.pos.x,p.pos.z)||0)-this.sleepFloor[i])>1e-7)return true;
    }
    return false;
  }
  collide(p,world){
    for(const body of this.colliders){
      this.solvingCover=!!body.cover;
      // Positional stabilization shifts Verlet prev to retain velocity. It
      // is not a physical sweep origin and can lie across a static wall even
      // when every displayed position stayed on this side of that wall.
      const from=body.cover?(p.sweep||p.last):p.prev;
      if(segmentOutside(p.pos,from,body.worldBox))continue;
      this.local.copy(p.pos).applyMatrix4(body.inverse);this.before.copy(from).applyMatrix4(body.inverse);
      // An embedded endpoint still entered through a specific face. Nearest
      // face ejection can incorrectly choose the opposite side of a thin wall.
      const swept=body.cover&&!body.box.containsPoint(this.before)&&projectBox(this.local,this.before,body.box,this.normal,true);
      if(!swept&&body.box.containsPoint(this.local)){
        let best=Infinity;
        for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
          const key=AXES[axis],e=body.inverse.elements;
          this.candidate.copy(this.local);this.candidate[key]=(sign<0?body.box.min[key]:body.box.max[key])+sign*.003;this.candidate.applyMatrix4(body.matrix);
          this.proposalNormal.set(e[axis],e[axis+4],e[axis+8]).multiplyScalar(sign).normalize();
          if(!this.contactPosition(p,this.candidate,this.proposalNormal,this.candidate))continue;
          if(this.candidate.y<(world?.heightAt?.(this.candidate.x,this.candidate.z)||0)+.035-1e-8)continue;
          const cost=this.candidate.distanceToSquared(p.pos);if(cost>=best)continue;
          best=cost;this.escape.copy(this.candidate);this.escapeNormal.copy(this.proposalNormal);
        }
        if(Number.isFinite(best))this.resolveContact(p,this.escape,this.escapeNormal);
        continue;
      }
      if(swept||projectBox(this.local,this.before,body.box,this.normal)){
        const e=body.inverse.elements,nx=this.normal.x,ny=this.normal.y,nz=this.normal.z;
        this.normal.set(e[0]*nx+e[1]*ny+e[2]*nz,e[4]*nx+e[5]*ny+e[6]*nz,e[8]*nx+e[9]*ny+e[10]*nz).normalize();
        this.local.applyMatrix4(body.matrix);this.resolveContact(p,this.local,this.normal);
      }
    }
    this.solvingCover=false;
    const floor=(world?.heightAt?.(p.pos.x,p.pos.z)||0)+.035;
    if(p.pos.y<floor){this.local.copy(p.pos).y=floor;this.normal.set(0,1,0);this.resolveContact(p,this.local,this.normal);p.prev.x+=(p.pos.x-p.prev.x)*.3;p.prev.z+=(p.pos.z-p.prev.z)*.3;}
    // A later limb/ground projection must not push cloth back inside an earlier
    // body. Resolve the UNION, rejecting exits below the actual terrain.
    if(this.colliders.some(body=>body.worldBox.containsPoint(p.pos)&&body.box.containsPoint(this.local.copy(p.pos).applyMatrix4(body.inverse))))this.escapeSolids(p,world);
  }
  resolveContact(p,position,normal){
    const normals=p.contactNormals||(p.contactNormals=[]),offsets=p.contactOffsets||(p.contactOffsets=[]),count=p.contactCount||0;
    if(!this.contactPosition(p,position,normal,this.projected))return false;
    position=this.projected;
    const correction=p.pos.distanceToSquared(position);
    // Positional stabilization is not an impulse. Keep tangential travel and
    // remove inward normal velocity rather than feeding the projection into
    // the next Verlet step (which repeatedly re-entered a resting surface).
    this._contactCorrection=Math.max(this._contactCorrection||0,correction);
    this.velocity.subVectors(p.pos,p.prev);p.pos.copy(position);
    let known=false;for(let i=0;i<count;i++)if(normals[i].dot(normal)>1-1e-10){known=true;if(correction>1e-16)offsets[i]=Math.max(offsets[i],p.pos.dot(normal));break;}
    if(!known&&correction>1e-16){(normals[count]||(normals[count]=new THREE.Vector3())).copy(normal);offsets[count]=p.pos.dot(normal);p.contactCount=count+1;}
    if(correction>1e-16)contactVelocity(this.velocity,p.pos,normals,offsets,p.contactCount||0);
    p.prev.copy(position).sub(this.velocity);
    return true;
  }
  contactPosition(p,position,normal,out){
    const normals=p.contactNormals,offsets=p.contactOffsets,count=p.contactCount||0;
    this.contactOffset.subVectors(position,p.pos);
    let conflict=false;for(let i=0;i<count;i++)if(normals[i].dot(position)<offsets[i]-1e-10){conflict=true;break;}
    if(conflict){
      const depth=this.contactOffset.dot(normal);
      if(depth<=1e-10||!contactDisplacement(this.contactSlide,p.pos,normal,depth,normals,offsets,count))return false;
      position=this.contactSlide.add(p.pos);
    }
    if(this.contactWorld&&position.y<(this.contactWorld.heightAt?.(position.x,position.z)||0)+.035-1e-8)return false;
    if(!this.solvingCover&&!this.applyingSurface&&!this.safeCoverTargets([p],[position]))return false;
    out.copy(position);return true;
  }
  safeCoverTargets(points,targets){
    if(!this.covers.length)return true;
    const stamp=++this.coverStamp,before=this.coverBefore,after=this.coverProbe;
    for(let i=0;i<points.length;i++){
      const p=points[i],target=targets[i];if(p.pos.distanceToSquared(target)<1e-16)continue;
      for(const cover of this.covers)if(!segmentOutside(p.pos,target,cover.box)&&!cover.box.containsPoint(p.pos)&&segmentHitsBox(p.pos,target,cover.box))return false;
      for(const face of p.faces||[]){
        if(face.coverStamp===stamp)continue;face.coverStamp=stamp;
        before.set(face[0].pos,face[1].pos,face[2].pos);
        const a=points.indexOf(face[0]),b=points.indexOf(face[1]),c=points.indexOf(face[2]);
        after.set(a<0?face[0].pos:targets[a],b<0?face[1].pos:targets[b],c<0?face[2].pos:targets[c]);
        // Exact broad phase: a triangle cannot enter a box outside its bounds.
        // Most battlefield cover is far from this cloth contact proposal.
        this.coverProbeBox.makeEmpty().expandByPoint(after.a).expandByPoint(after.b).expandByPoint(after.c);
        for(const cover of this.covers)if(cover.box.intersectsBox(this.coverProbeBox)&&cover.box.intersectsTriangle(after)&&!cover.box.intersectsTriangle(before))return false;
      }
    }
    return true;
  }
  escapeSolids(p,world){
    let best=Infinity;
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      let count=0;
      for(const body of this.colliders){
        this.local.copy(p.pos).applyMatrix4(body.inverse);const e=body.inverse.elements;let near=-Infinity,far=Infinity;
        for(let k=0;k<3;k++){
          const name=AXES[k],d=e[axis*4+k]*sign;
          if(Math.abs(d)<1e-10){if(this.local[name]<body.box.min[name]||this.local[name]>body.box.max[name]){far=-1;break;}continue;}
          const a=(body.box.min[name]-this.local[name])/d,b=(body.box.max[name]-this.local[name])/d;
          near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
        }
        if(far>=0&&near<=far){this.intervals[count++]=near;this.intervals[count++]=far;}
      }
      let end=0,changed=true;
      while(changed){changed=false;for(let i=0;i<count;i+=2)if(this.intervals[i]<=end+1e-6&&this.intervals[i+1]>end){end=this.intervals[i+1];changed=true;}}
      end+=.003;if(end*end>=best)continue;
      this.candidate.copy(p.pos);this.candidate[AXES[axis]]+=sign*end;
      this.normal.set(0,0,0);this.normal[AXES[axis]]=sign;
      if(!this.contactPosition(p,this.candidate,this.normal,this.candidate))continue;
      if(this.candidate.y<(world?.heightAt?.(this.candidate.x,this.candidate.z)||0)+.035)continue;
      if(this.colliders.some(body=>body.worldBox.containsPoint(this.candidate)&&body.box.containsPoint(this.local.copy(this.candidate).applyMatrix4(body.inverse))))continue;
      const cost=this.candidate.distanceToSquared(p.pos);if(cost>=best)continue;
      best=cost;this.escape.copy(this.candidate);this.escapeNormal.copy(this.normal);
    }
    if(Number.isFinite(best))this.resolveContact(p,this.escape,this.escapeNormal);
  }
  collideSurface(world){
    this._contactCorrection=0;
    // Collision-only barycentric samples distribute a local contact over its
    // free corners without flattening an entire triangle onto a box face.
    for(const face of this.faces){
      this.triBox.makeEmpty();for(const p of face)this.triBox.expandByPoint(p.pos);
      for(const body of this.bodies){
        if(!body.worldBox.intersectsBox(this.triBox))continue;
        for(const weights of SURFACE_WEIGHTS){
          this.sample.set(0,0,0);let inverseMass=0;
          for(let i=0;i<3;i++){this.sample.addScaledVector(face[i].pos,weights[i]);if(!face[i].pin)inverseMass+=weights[i]*weights[i];}
          if(!inverseMass)continue;
          this.local.copy(this.sample).applyMatrix4(body.inverse);
          if(!body.box.containsPoint(this.local))continue;
          let best=Infinity;
          for(const key of AXES)for(const sign of [-1,1]){
            this.candidate.copy(this.local);this.candidate[key]=(sign<0?body.box.min[key]:body.box.max[key])+sign*.003;
            this.candidate.applyMatrix4(body.matrix);this.delta.subVectors(this.candidate,this.sample);
            const k=AXES.indexOf(key),e=body.inverse.elements;this.proposalNormal.set(e[k],e[k+4],e[k+8]).multiplyScalar(sign).normalize();
            const distance=this.surfaceTargets(face,weights,this.proposalNormal,this.delta.dot(this.proposalNormal),world);
            if(distance<best){best=distance;this.contactNormal.copy(this.proposalNormal);for(let i=0;i<3;i++)this.faceTargets[i].copy(this.proposalTargets[i]);}
          }
          if(Number.isFinite(best))for(let i=0;i<3;i++)if(!face[i].pin){
            this.applyingSurface=true;
            this.resolveContact(face[i],this.faceTargets[i],this.contactNormal);
            this.applyingSurface=false;
          }
        }
        this.triBox.makeEmpty();for(const p of face)this.triBox.expandByPoint(p.pos);
      }
    }
    const correction=this._contactCorrection;return Math.max(correction,this.collideCoverSurface(world));
  }
  surfaceTargets(face,weights,normal,depth,world){
    let minWeight=Infinity;
    for(let i=0;i<3;i++)if(!face[i].pin&&weights[i]>0)minWeight=Math.min(minWeight,weights[i]);
    const maximum=depth/minWeight;let effectiveMass=0;
    // Find each corner's available escape ray. A constrained corner may stay
    // still while another supplies the sample's required normal displacement.
    // maximum bounds every allocated displacement, so scaling a feasible ray
    // toward its origin preserves all earlier halfspaces.
    for(let i=0;i<3;i++){
      const p=face[i],direction=this.proposalTargets[i];this.mobility[i]=0;
      if(p.pin||!weights[i])continue;
      if(!contactDisplacement(direction,p.pos,normal,maximum,p.contactNormals,p.contactOffsets,p.contactCount||0))continue;
      direction.divideScalar(maximum);this.mobility[i]=1/direction.lengthSq();
      effectiveMass+=weights[i]*weights[i]*this.mobility[i];
    }
    if(effectiveMass<1e-12)return Infinity;
    let cost=0;
    for(let i=0;i<3;i++){
      const p=face[i],target=this.proposalTargets[i];
      if(this.mobility[i])target.multiplyScalar(depth*weights[i]*this.mobility[i]/effectiveMass).add(p.pos);else target.copy(p.pos);
      if(!p.pin&&target.y<(world?.heightAt?.(target.x,target.z)||0)+.035-1e-8)return Infinity;
      cost+=target.distanceToSquared(p.pos);
    }
    return this.safeCoverTargets(face,this.proposalTargets)?cost:Infinity;
  }
  collideCoverSurface(world){
    this.solvingCover=true;
    const tri=this.triangle,verts=[tri.a,tri.b,tri.c];let correction=0;
    for(const face of this.faces){
      if(face.every(p=>p.pin))continue;
      this.triBox.makeEmpty();for(const p of face)this.triBox.expandByPoint(p.pos);
      for(const body of this.covers){
        if(!body.worldBox.intersectsBox(this.triBox))continue;
        for(let i=0;i<3;i++)verts[i].copy(face[i].pos).applyMatrix4(body.inverse);
        if(!body.box.intersectsTriangle(tri))continue;
        // A static obstacle cannot switch a material triangle to its opposite
        // side mid-contact. Use the last displayed safe side where available;
        // neighboring triangles then agree instead of flipping shared corners.
        let entryMask=0;
        if(body.cover)for(let axis=0;axis<3;axis++)for(let side=0;side<2;side++){
          const key=AXES[axis],sign=side?1:-1,value=side?body.box.max[key]:body.box.min[key];
          if(face.every(p=>(p.last[key]-value)*sign>=-1e-5))entryMask|=1<<(axis*2+side);
        }
        let best=Infinity,bestAxis=-1,bestSign=0,bestValue=0;
        for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
          if(entryMask&&!(entryMask&(1<<(axis*2+(sign>0?1:0)))))continue;
          const key=AXES[axis],value=(sign<0?body.box.min[key]:body.box.max[key])+sign*.003;let cost=0,valid=true;
          const e=body.inverse.elements;this.proposalNormal.set(e[axis],e[axis+4],e[axis+8]).multiplyScalar(sign).normalize();
          for(let i=0;i<3;i++){
            const amount=(value-verts[i][key])*sign;if(amount<=0)continue;
            if(face[i].pin){valid=false;break;}
            this.candidate.copy(verts[i]);this.candidate[key]=value;this.candidate.applyMatrix4(body.matrix);
            if(!this.contactPosition(face[i],this.candidate,this.proposalNormal,this.candidate)){valid=false;break;}
            if(this.candidate.y<(world?.heightAt?.(this.candidate.x,this.candidate.z)||0)+.035){valid=false;break;}
            cost+=this.candidate.distanceToSquared(face[i].pos);
          }
          if(valid&&cost<best){best=cost;bestAxis=axis;bestSign=sign;bestValue=value;}
        }
        if(bestAxis<0)continue;
        const key=AXES[bestAxis];
        const e=body.inverse.elements;this.contactNormal.set(e[bestAxis],e[bestAxis+4],e[bestAxis+8]).multiplyScalar(bestSign).normalize();
        for(let i=0;i<3;i++)if(!face[i].pin&&(bestValue-verts[i][key])*bestSign>0){
          this.candidate.copy(verts[i]);this.candidate[key]=bestValue;this.candidate.applyMatrix4(body.matrix);
          correction=Math.max(correction,this.candidate.distanceToSquared(face[i].pos));
          this.resolveContact(face[i],this.candidate,this.contactNormal);
        }
        this.triBox.makeEmpty();for(const p of face)this.triBox.expandByPoint(p.pos);
      }
    }
    this.solvingCover=false;return correction;
  }
  restore(){
    const g=this.mesh.geometry;g.attributes.position.array.set(this.rest);g.attributes.position.needsUpdate=true;
    g.computeVertexNormals();g.computeBoundingSphere();if(g.boundingBox)g.computeBoundingBox();
  }
}

// Minimum displacement to the new plane while remaining beyond established
// contact planes. Stored offsets preserve real clearance; an old surface must
// not ratchet forward whenever another contact moves a vertex away from it.
// The minimum has zero, one or two additional active planes in 3-D.
function contactDisplacement(out,origin,n,depth,normals,offsets,count){
  let best=Infinity,bx=0,by=0,bz=0;
  const consider=(x,y,z)=>{
    const cost=x*x+y*y+z*z;if(cost>=best)return;
    for(let i=0;i<count;i++){const a=normals[i];if(a.x*x+a.y*y+a.z*z<offsets[i]-a.dot(origin)-1e-9)return;}
    best=cost;bx=x;by=y;bz=z;
  };
  consider(n.x*depth,n.y*depth,n.z*depth);
  if(best<Infinity){out.copy(n).multiplyScalar(depth);return true;}
  for(let i=0;i<count;i++){
    const a=normals[i],dot=n.dot(a),det=1-dot*dot,ba=offsets[i]-a.dot(origin);
    if(det>1e-10){const s=(depth-dot*ba)/det,t=(ba-dot*depth)/det;consider(n.x*s+a.x*t,n.y*s+a.y*t,n.z*s+a.z*t);}
    for(let j=0;j<i;j++){
      const b=normals[j],bb=offsets[j]-b.dot(origin),x=a.y*b.z-a.z*b.y,y=a.z*b.x-a.x*b.z,z=a.x*b.y-a.y*b.x,den=n.x*x+n.y*y+n.z*z;
      if(Math.abs(den)>1e-10)consider((depth*x+ba*(b.y*n.z-b.z*n.y)+bb*(n.y*a.z-n.z*a.y))/den,(depth*y+ba*(b.z*n.x-b.x*n.z)+bb*(n.z*a.x-n.x*a.z))/den,(depth*z+ba*(b.x*n.y-b.y*n.x)+bb*(n.x*a.y-n.y*a.x))/den);
    }
  }
  if(!Number.isFinite(best))return false;
  out.set(bx,by,bz);return true;
}

// Project velocity against the complete active contact set. Sequentially
// removing one inward component can manufacture an inward component at another.
function contactVelocity(v,position,normals,offsets,count){
  const vx=v.x,vy=v.y,vz=v.z;let best=v.lengthSq(),bx=0,by=0,bz=0;
  const active=i=>normals[i].dot(position)-offsets[i]<1e-8;
  const consider=(x,y,z)=>{
    const cost=(x-vx)**2+(y-vy)**2+(z-vz)**2;if(cost>best)return;
    for(let i=0;i<count;i++)if(active(i)){const n=normals[i];if(n.x*x+n.y*y+n.z*z<-1e-10)return;}
    best=cost;bx=x;by=y;bz=z;
  };
  consider(vx,vy,vz);if(best===0)return;
  for(let i=0;i<count;i++)if(active(i)){
    const a=normals[i],d=a.x*vx+a.y*vy+a.z*vz;consider(vx-a.x*d,vy-a.y*d,vz-a.z*d);
    for(let j=0;j<i;j++)if(active(j)){
      const b=normals[j],x=a.y*b.z-a.z*b.y,y=a.z*b.x-a.x*b.z,z=a.x*b.y-a.y*b.x,den=x*x+y*y+z*z;
      if(den>1e-12){const t=(vx*x+vy*y+vz*z)/den;consider(x*t,y*t,z*t);}
    }
  }
  v.set(bx,by,bz);
}

// Swept slab contact catches a vertex crossing a thin wall between samples.
// For an already embedded vertex (moving body), use the nearest outward face.
function projectBox(point,previous,box,normal,sweepEmbedded=false){
  if(!sweepEmbedded&&box.containsPoint(point))return projectEmbedded(point,box,normal);
  if(box.containsPoint(previous))return false;
  let enter=0,exit=1,axis=null,value=0,sign=0;
  for(const k of AXES){
    const d=point[k]-previous[k];
    if(Math.abs(d)<1e-10){if(previous[k]<box.min[k]||previous[k]>box.max[k])return false;continue;}
    const a=(box.min[k]-previous[k])/d,b=(box.max[k]-previous[k])/d,lo=Math.min(a,b),hi=Math.max(a,b);
    if(lo>enter){enter=lo;axis=k;value=d>0?box.min[k]:box.max[k];sign=d>0?-1:1;}exit=Math.min(exit,hi);if(enter>exit)return false;
  }
  if(!axis||enter<0||enter>1)return false;
  point.lerp(previous,1-enter);point[axis]=value+sign*.003;normal.set(0,0,0);normal[axis]=sign;return true;
}

function projectEmbedded(point,box,normal){
  if(!box.containsPoint(point))return false;
  let depth=Infinity,axis='x',value=0,sign=0;
  for(const k of AXES)for(const edge of ['min','max']){const d=Math.abs(point[k]-box[edge][k]);if(d<depth){depth=d;axis=k;value=box[edge][k];sign=edge==='min'?-1:1;}}
  point[axis]=value+sign*.003;normal.set(0,0,0);normal[axis]=sign;return true;
}

function segmentOutside(a,b,box){
  return Math.max(a.x,b.x)<box.min.x||Math.min(a.x,b.x)>box.max.x||Math.max(a.y,b.y)<box.min.y||Math.min(a.y,b.y)>box.max.y||Math.max(a.z,b.z)<box.min.z||Math.min(a.z,b.z)>box.max.z;
}

function segmentHitsBox(a,b,box){
  let enter=0,exit=1;
  for(const key of AXES){
    const d=b[key]-a[key];
    if(Math.abs(d)<1e-12){if(a[key]<box.min[key]||a[key]>box.max[key])return false;continue;}
    const x=(box.min[key]-a[key])/d,y=(box.max[key]-a[key])/d;
    enter=Math.max(enter,Math.min(x,y));exit=Math.min(exit,Math.max(x,y));if(enter>exit)return false;
  }
  return true;
}
