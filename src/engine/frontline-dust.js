import * as THREE from 'three';

const CAPACITY=64;
// Non-additive, camera-facing impact dust: one bounded instanced draw, no lights.
// Emission is driven by a real scout destruction, never a decorative explosion.
export class FrontlineDust{
 constructor(scene){
  this.active=0;this.cursor=0;this.disposed=false;this.puffs=Array.from({length:CAPACITY},()=>({life:0,x:0,y:0,z:0,vx:0,vz:0,seed:0}));
  const base=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=base.index;for(const key of ['position','uv'])geometry.setAttribute(key,base.attributes[key]);
  for(const [name,n]of [['iCenter',3],['iSize',1],['iAge',1],['iSeed',1]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*n),n).setUsage(THREE.DynamicDrawUsage));
  geometry.instanceCount=CAPACITY;base.dispose();
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`attribute vec3 iCenter;attribute float iSize;attribute float iAge;attribute float iSeed;varying vec2 vUv;varying float vAge;varying float vSeed;void main(){vUv=uv;vAge=iAge;vSeed=iSeed;vec4 p=modelViewMatrix*vec4(iCenter,1.);p.xy+=position.xy*iSize;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec2 vUv;varying float vAge;varying float vSeed;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){vec2 p=(vUv-.5)*2.;float n=noise(p*3.+vSeed)*.6+noise(p*7.-vAge*.13+vSeed)*.28+noise(p*15.+vSeed)*.12;
  float density=1.-smoothstep(.18,1.,length(p)+(.5-n)*.4);float envelope=smoothstep(0.,.22,vAge)*(1.-smoothstep(5.,10.,vAge));
  float alpha=density*envelope*.28;if(alpha<.002)discard;
  float light=clamp(.58+.28*vUv.y-.16*vUv.x+n*.18,.3,1.);gl_FragColor=vec4(vec3(.62,.46,.29)*light,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
  this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='frontline-impact-dust';this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
 }
 emit(pos){
  if(this.disposed)return;
  for(let i=0;i<16;i++){
   const p=this.puffs[this.cursor],a=i*2.399963,power=3+(i%5)*1.4;this.cursor=(this.cursor+1)%CAPACITY;
   Object.assign(p,{life:10,age:0,x:pos.x,y:pos.y,z:pos.z,vx:Math.cos(a)*power,vz:Math.sin(a)*power,seed:i*13.71,up:3+(i%4)*2.2});
  }
  this.active=this.puffs.filter(p=>p.life>0).length;
 }
 update(dt){
  if(this.disposed||!Number.isFinite(dt)||dt<=0)return;
  const a=this.mesh.geometry.attributes;this.active=0;
  for(let i=0;i<CAPACITY;i++){
   const p=this.puffs[i];if(p.life<=0){a.iSize.setX(i,0);continue;}
   p.life=Math.max(0,p.life-dt);p.age+=dt;
   if(!p.life){a.iSize.setX(i,0);continue;}
   this.active++;const drag=Math.exp(-p.age*.4),rise=p.up*(1-Math.exp(-p.age*.7))/.7;
   a.iCenter.setXYZ(i,p.x+p.vx*(1-drag)/.4+p.age*1.4,p.y+rise,p.z+p.vz*(1-drag)/.4);
   a.iSize.setX(i,8+p.age*4.5);a.iAge.setX(i,p.age);a.iSeed.setX(i,p.seed);
  }
  this.mesh.visible=this.active>0;for(const attr of Object.values(a))if(attr.isInstancedBufferAttribute)attr.needsUpdate=true;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
