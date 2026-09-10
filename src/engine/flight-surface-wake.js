import * as THREE from 'three';
import {SURFACE_WAKE_DEFAULTS} from '../data/flight-tuning.js';

const CAPACITY=192,SPACING=3;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
const dustSurfaces={sand:1,dirt:.65,gravel:.35};
export function createSurfaceWakeMesh(){
 const base=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
 geometry.index=base.index;for(const key of ['position','uv'])geometry.setAttribute(key,base.attributes[key]);
 for(const [key,size]of [['iCenter',3],['iSize',1],['iAlpha',1],['iSeed',1]])geometry.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*size),size).setUsage(THREE.DynamicDrawUsage));
 geometry.instanceCount=CAPACITY;base.dispose();
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
  vertexShader:`#include <fog_pars_vertex>
   attribute vec3 iCenter;attribute float iSize,iAlpha,iSeed;varying vec2 vUv;varying float vAlpha,vSeed;
   void main(){vUv=uv;vAlpha=iAlpha;vSeed=iSeed;vec4 mvPosition=modelViewMatrix*vec4(iCenter,1.);
   mvPosition.xy+=position.xy*vec2(iSize,iSize*.55);gl_Position=projectionMatrix*mvPosition;
   #include <fog_vertex>
   }`,
  fragmentShader:`#include <fog_pars_fragment>
   varying vec2 vUv;varying float vAlpha,vSeed;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec2 p=(vUv-.5)*2.;float grain=noise(p*3.+vSeed)*.7+noise(p*7.-vSeed)*.3;
   float a=(1.-smoothstep(.12,1.,length(p)+(.5-grain)*.34))*vAlpha;
   if(a<.002)discard;float lit=.73+vUv.y*.22+grain*.12;
   gl_FragColor=vec4(vec3(.56,.405,.25)*lit,a);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
   }`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='flight-surface-dust';mesh.frustumCulled=false;mesh.visible=false;return mesh;
}

export class FlightSurfaceWake{
 constructor(world,fighter){
  this.world=world;this.fighter=fighter;this.mesh=createSurfaceWakeMesh();world.scene.add(this.mesh);
  this.puffs=Array.from({length:CAPACITY},()=>({life:0}));this.cursor=0;this.active=0;this.emitted=0;this.remainder=0;
  this.previous=fighter.pos.clone();this.disposed=false;
 }
 static canEmit(world,f){
  const cfg=f.def.model?.surfaceWake||{},speed=Math.hypot(f.vel.x,f.vel.z),min=cfg.minSpeed??SURFACE_WAKE_DEFAULTS.minSpeed;
  if(!f.alive||!f.airborne||!f._openSky||!f.obj.visible||!f.obj.parent||(f._vis??1)<.35||!finite(f.pos)||!finite(f.vel)||speed<=min||(cfg.intensity??SURFACE_WAKE_DEFAULTS.intensity)<=0)return false;
  const ground=world.heightAt?.(f.pos.x,f.pos.z),agl=f.pos.y-ground;
  return Number.isFinite(ground)&&agl>=0&&agl<(cfg.maxHeight??SURFACE_WAKE_DEFAULTS.maxHeight)&&!!dustSurfaces[world.surfaceAt?.(f.pos.x,f.pos.z)];
 }
 _emit(x,z,y,fx,fz,speed,age){
  const settings={...SURFACE_WAKE_DEFAULTS,...this.fighter.def.model?.surfaceWake};
  x-=fx*(5+Math.min(6,speed*.025));z-=fz*(5+Math.min(6,speed*.025));
  const ground=this.world.heightAt(x,z),agl=y-ground,surface=dustSurfaces[this.world.surfaceAt?.(x,z)]||0;
  if(!Number.isFinite(ground)||agl<0||agl>=settings.maxHeight||!surface)return;
  // Never pull sand through the floor of a building, vehicle or rock ledge.
  if(this.world.cover?.some(c=>!c.destroyed&&c.top>ground+.5&&Math.abs(x-c.x)<(c.hx??c.r??0)&&Math.abs(z-c.z)<(c.hz??c.r??0)))return;
  const strength=settings.intensity*surface*smooth((speed-settings.minSpeed)/(settings.minSpeed*.5))*Math.pow(1-agl/settings.maxHeight,1.3);
  if(strength<=.002)return;
  for(const side of [-1,1]){
   const p=this.puffs[this.cursor],seed=(this.emitted*1.618)%100;this.cursor=(this.cursor+1)%CAPACITY;this.emitted++;
   Object.assign(p,{life:settings.life-age,duration:settings.life,age,ground,x:x+fz*side*3.4,z:z-fx*side*3.4,
    vx:fz*side*4.8-fx*3,vz:-fx*side*4.8-fz*3,strength,seed});
  }
 }
 update(dt){
  if(this.disposed)return true;
  const f=this.fighter;if(!finite(f.pos)||!finite(f.vel)||!Number.isFinite(dt))return true;if(dt<=0)return false;
  for(const p of this.puffs)if(p.life>0){p.life=Math.max(0,p.life-dt);p.age+=dt;}
  const eligible=FlightSurfaceWake.canEmit(this.world,f),speed=Math.hypot(f.vel.x,f.vel.z);
  const dx=f.pos.x-this.previous.x,dz=f.pos.z-this.previous.z,distance=Math.hypot(dx,dz);
  if(eligible&&distance>0&&distance<=Math.max(25,speed*dt*3+3)){
   const start=SPACING-this.remainder;
   for(let d=start;d<=distance;d+=SPACING){const t=d/distance;
    this._emit(this.previous.x+dx*t,this.previous.z+dz*t,this.previous.y+(f.pos.y-this.previous.y)*t,f.vel.x/speed,f.vel.z/speed,speed,dt*(1-t));
   }
   this.remainder=(this.remainder+distance)%SPACING;
  }else this.remainder=0;
  this.previous.copy(f.pos);this.active=0;
  const a=this.mesh.geometry.attributes;
  for(let i=0;i<CAPACITY;i++){
   const p=this.puffs[i];if(p.life<=0){a.iAlpha.setX(i,0);continue;}this.active++;
   const age=p.age,drift=(1-Math.exp(-age*.8))/.8;
   a.iCenter.setXYZ(i,p.x+p.vx*drift,p.ground+.6+age*1.6,p.z+p.vz*drift);
   a.iSize.setX(i,5+age*9);a.iSeed.setX(i,p.seed);
   a.iAlpha.setX(i,.4*p.strength*smooth(age/.13)*smooth(p.life/(p.duration*.65)));
  }
  for(const key of ['iCenter','iSize','iAlpha','iSeed'])a[key].needsUpdate=true;
  this.mesh.visible=this.active>0&&f.obj.visible&&(f._vis??1)>=.35;
  return !eligible&&this.active===0;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();if(this.fighter._surfaceWake===this)this.fighter._surfaceWake=null;}
}
