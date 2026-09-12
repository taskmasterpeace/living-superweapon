import * as THREE from 'three';
import {WAKE_DEFAULTS} from '../data/flight-tuning.js';

// World-space slipstreams. Bounded spatial samples preserve the travelled
// curve without turning old energy into a beam that swings with the fighter.
const CAPACITY=256,SPACING=.75;
const finite=v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
export class FlightWake {
  constructor(world,fighter){
    this.world=world;this.fighter=fighter;this.n=0;this.idle=0;this.disposed=false;
    this.history=new Float32Array(CAPACITY*6);this.age=new Float32Array(CAPACITY);
    this.strength=new Float32Array(CAPACITY);this.spread=new Float32Array(CAPACITY);
    this.point=new THREE.Vector3();this.right=new THREE.Vector3();this.direction=new THREE.Vector3();
    this.eye=new THREE.Vector3();this.tangent=new THREE.Vector3();this.width=new THREE.Vector3();this.rotation=new THREE.Quaternion();
    this.previousWidth=new THREE.Vector3();
    this.footL=new THREE.Vector3();this.footR=new THREE.Vector3();
    const geometry=new THREE.BufferGeometry(),vertices=new Float32Array(CAPACITY*12),colors=new Float32Array(CAPACITY*12),alpha=new Float32Array(CAPACITY*4),edges=new Float32Array(CAPACITY*4),indices=[];
    const palette=fighter.def.afterburner?.wake||['#fff','#ffd24a'];
    for(let i=0;i<CAPACITY;i++)for(let lane=0;lane<2;lane++){
      const color=new THREE.Color(palette[lane%palette.length]);
      for(let edge=0;edge<2;edge++){const j=i*4+lane*2+edge;edges[j]=edge?1:-1;color.toArray(colors,j*3);}
      if(i<CAPACITY-1){const j=i*4+lane*2;indices.push(j,j+1,j+4,j+1,j+5,j+4);}
    }
    for(const [key,array,size] of [['position',vertices,3],['color',colors,3],['aAlpha',alpha,1],['aEdge',edges,1]])geometry.setAttribute(key,new THREE.BufferAttribute(array,size).setUsage(key==='position'||key==='aAlpha'?THREE.DynamicDrawUsage:THREE.StaticDrawUsage));
    geometry.setIndex(indices);geometry.setDrawRange(0,0);
    const material=new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
      uniforms:{uVisible:{value:1}},
      vertexShader:'attribute float aAlpha; attribute float aEdge; varying vec3 vColor; varying float vAlpha; varying float vEdge; void main(){vColor=color;vAlpha=aAlpha;vEdge=aEdge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform float uVisible; varying vec3 vColor; varying float vAlpha; varying float vEdge; void main(){float a=pow(max(0.0,1.0-abs(vEdge)),.7)*vAlpha*uVisible;gl_FragColor=vec4(vColor,a);}'
    });
    this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='flight-wake';this.mesh.frustumCulled=false;world.scene.add(this.mesh);
    // Vision updates after VFX simulation. Recheck visibility at render time too.
    this.mesh.onBeforeRender=()=>{material.uniforms.uVisible.value=fighter.obj.visible&&(fighter._vis??1)>=.35?1:0;};
  }
  _sample(x,y,z,rx,ry,rz,age,strength=1,spread=1){
    const h=this.history;
    if(this.n===CAPACITY){h.copyWithin(0,6);this.age.copyWithin(0,1);this.strength.copyWithin(0,1);this.spread.copyWithin(0,1);this.n--;}
    const i=this.n++,j=i*6;h[j]=x;h[j+1]=y;h[j+2]=z;h[j+3]=rx;h[j+4]=ry;h[j+5]=rz;this.age[i]=age;
    this.strength[i]=strength;this.spread[i]=spread;
  }
  update(dt){
    if(this.disposed)return true;
    if(!finite(this.fighter.pos)||!finite(this.fighter.vel)||!Number.isFinite(dt)){this.mesh.visible=false;return true;}
    const f=this.fighter,h=this.history,speed=f.vel.length(),visible=f.obj.visible&&(f._vis??1)>=.35;
    const settings={...WAKE_DEFAULTS,...f.def.model?.wake};
    // The wake is the speed readout in the world: slow flight leaves a short
    // ribbon, while committing to the highest gear holds a much longer trail.
    const speedScale=Math.min(1,Math.max(0,(speed-30)/140)),LIFE=settings.life*(.65+1.35*speedScale);
    for(let i=0;i<this.n;i++)this.age[i]+=dt;
    while(this.n&&this.age[0]>=LIFE){h.copyWithin(0,6);this.age.copyWithin(0,1);this.strength.copyWithin(0,1);this.spread.copyWithin(0,1);this.n--;}
    const active=visible&&f.obj.parent&&f.alive&&f._openSky&&f.airborne&&speed>30&&settings.intensity>0;
    if(!visible)this.n=0;
    if(active){
      const strength=Math.min(1,Math.max(0,(speed-25)/35)),spread=(f.cruiseHeld?1.3:1)*(1+.5*speedScale);
      this.idle=0;this.direction.copy(f.vel).normalize();
      f.parts.legL.userData.boot.getWorldPosition(this.footL);f.parts.legR.userData.boot.getWorldPosition(this.footR);
      this.point.copy(this.footL).add(this.footR).multiplyScalar(.5).addScaledVector(this.direction,-.35);
      this.right.copy(this.footR).sub(this.footL).multiplyScalar(.5/2.2);
      if(!finite(this.point)||!finite(this.right)){this.mesh.visible=false;return true;}
      if(this.n){
        const j=(this.n-1)*6,x=h[j],y=h[j+1],z=h[j+2],dx=this.point.x-x,dy=this.point.y-y,dz=this.point.z-z,distance=Math.hypot(dx,dy,dz);
        if(distance>Math.max(18,speed*dt*3+4))this.n=0; // teleport/respawn: never stitch across the map
        else for(let d=SPACING;d<=distance;d+=SPACING){const k=d/distance;this._sample(x+dx*k,y+dy*k,z+dz*k,this.right.x,this.right.y,this.right.z,dt*(1-k),strength,spread);}
      }
      if(!this.n)this._sample(this.point.x,this.point.y,this.point.z,this.right.x,this.right.y,this.right.z,0,strength,spread);
    }else this.idle+=dt;
    const geometry=this.mesh.geometry,p=geometry.attributes.position,a=geometry.attributes.aAlpha;
    this.world.camera.getWorldPosition(this.eye);
    if(!finite(this.eye)){this.mesh.visible=false;return true;}
    for(let i=0;i<this.n;i++){
      const j=i*6,other=(i===this.n-1?Math.max(0,i-1):i+1)*6;
      this.tangent.set(h[other]-h[j],h[other+1]-h[j+1],h[other+2]-h[j+2]).normalize();
      if(i===this.n-1)this.tangent.negate();
      this.width.copy(this.eye).sub(this.point.set(h[j],h[j+1],h[j+2])).cross(this.tangent);
      if(this.width.lengthSq()<1e-8)this.width.set(h[j+3],h[j+4],h[j+5]);this.width.normalize();
      if(i===0)this.previousWidth.set(h[j+3],h[j+4],h[j+5]);
      if(this.width.dot(this.previousWidth)<0)this.width.negate();
      this.previousWidth.copy(this.width);
      const life=Math.max(0,1-this.age[i]/LIFE),taper=Math.sin(Math.PI*.5*(i+.5)/Math.max(1,this.n));
      for(let lane=0;lane<2;lane++)for(let edge=0;edge<2;edge++){
        const index=i*4+lane*2+edge,side=lane?1:-1,w=(edge?1:-1)*settings.width*(.4+.6*life)*taper*this.spread[i];
        p.setXYZ(index,h[j]+h[j+3]*side*2.2+this.width.x*w,h[j+1]+h[j+4]*side*2.2+this.width.y*w,h[j+2]+h[j+5]*side*2.2+this.width.z*w);
        a.setX(index,Math.min(1,settings.intensity*life*taper*this.strength[i]*(1+.25*speedScale)));
      }
    }
    geometry.setDrawRange(0,Math.max(0,this.n-1)*12);this.mesh.visible=visible&&this.n>1;
    p.clearUpdateRanges();a.clearUpdateRanges();
    if(this.n){p.addUpdateRange(0,this.n*12);a.addUpdateRange(0,this.n*4);p.needsUpdate=true;a.needsUpdate=true;}
    return this.idle>LIFE;
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();if(this.fighter._flightWake===this)this.fighter._flightWake=null;}
}
