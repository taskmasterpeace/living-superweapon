import * as THREE from 'three';

// Shared terrain/shelter contract. Roof proxies remain solid when visually cut away.
export function weatherSurface(world,x,z){
 const h=world.heightAt?.(x,z);let y=Number.isFinite(h)?h:0;
 for(const list of [world.cover,world.interiors])for(const c of list||[]){
  if(!c.destroyed&&!c.weatherTransparent&&Number.isFinite(c.top)&&Math.abs(x-c.x)<=(c.hx??c.r??0)&&Math.abs(z-c.z)<=(c.hz??c.r??0))y=Math.max(y,c.top);
 }
 return y+.04;
}

// One reusable, bounded strike per weather owner. No light-count changes, no
// setTimeout, and no mutation of the combat-lightning primitive.
export class WeatherLightning {
 constructor(game){
  this.g=game;this.position=new THREE.Vector3();this.age=1;this.active=false;this.flash=0;
  this.geometry=new THREE.CylinderGeometry(1,1,1,5,1);
  this.core=new THREE.InstancedMesh(this.geometry,new THREE.MeshBasicMaterial({color:new THREE.Color(3,3.8,4.2),toneMapped:false}),48);
  this.glow=new THREE.InstancedMesh(this.geometry,new THREE.MeshBasicMaterial({color:'#a5d8eb',transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false}),48);
  this.warning=new THREE.Mesh(new THREE.RingGeometry(8.5,9,48),new THREE.MeshBasicMaterial({color:'#ffba4c',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));
  this.warning.rotation.x=-Math.PI/2;
  this.group=new THREE.Group();this.group.name='weather-lightning';this.group.add(this.core,this.glow,this.warning);game.scene.add(this.group);
  this.core.frustumCulled=this.glow.frustumCulled=false;this.group.visible=false;
 }
 start(position,{warning=false,reduced=false}={}){
  this.cancel();this.position.copy(position);this.group.position.copy(position);this.group.visible=true;
  this.age=warning?-.85:0;this.active=true;this.reduced=reduced;this.hit=false;
  const cloudHeight=Math.max(230,(this.g.world.camera?.position.y||0)-position.y+140),nodes=[new THREE.Vector3()];
  for(let i=1;i<=24;i++)nodes.push(new THREE.Vector3(nodes[i-1].x+(Math.random()-.5)*6,cloudHeight*i/24,nodes[i-1].z+(Math.random()-.5)*6));
  const transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();let count=0;
  const segment=(a,b,width)=>{
   dir.subVectors(b,a);transform.position.copy(a).add(b).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(up,dir.clone().normalize());
   transform.scale.set(width,dir.length(),width);transform.updateMatrix();this.core.setMatrixAt(count,transform.matrix);
   transform.scale.x=transform.scale.z=width*4;transform.updateMatrix();this.glow.setMatrixAt(count++,transform.matrix);
  };
  for(let i=0;i<24;i++)segment(nodes[i],nodes[i+1],.22+(i/24)*.16);
  for(const at of [9,15,20]){
   let a=nodes[at].clone();const dx=(Math.random()-.5)*16,dz=(Math.random()-.5)*16;
   for(let j=0;j<6;j++){const b=a.clone().add(new THREE.Vector3(dx+(Math.random()-.5)*8,-cloudHeight/38,dz+(Math.random()-.5)*8));segment(a,b,.1*(1-j/7));a=b;}
  }
  this.core.count=this.glow.count=count;this.core.instanceMatrix.needsUpdate=this.glow.instanceMatrix.needsUpdate=true;
 }
 update(dt){
  if(!this.active)return false;
  this.age+=dt;const t=this.age;this.warning.visible=t<0;this.core.visible=this.glow.visible=t>=0;
  if(t<0){this.warning.material.opacity=.4+.3*Math.sin(t*20)**2;return false;}
  const first=!this.hit;this.hit=true;
  // Three diminishing return strokes, softened to a single low flash for the
  // OS reduced-motion preference. There is no full-screen white overlay.
  let pulse=t<.07?1-t/.1:t>.14&&t<.21?.6*(1-(t-.14)/.1):t>.30&&t<.37?.25*(1-(t-.30)/.1):0;
  if(this.reduced)pulse=t<.25?.16*(1-t/.25):0;
  this.flash=pulse;this.core.visible=pulse>.01;this.glow.visible=pulse>.01;this.glow.material.opacity=pulse*.17;
  if(!this.light&&pulse>0){this.light=this.g.vfx.borrowLight('#d9f1ff',0,260);this.lease=this.light.userData.vfxLease;this.light.position.copy(this.position).y+=24;}
  if(this.light&&this.light.userData.vfxLease===this.lease)this.light.intensity=pulse*1500;
  if(t>.45)this.cancel();return first;
 }
 cancel(){
  if(this.light&&this.light.userData.vfxLease===this.lease)this.g.vfx.returnLight(this.light);
  this.light=null;this.flash=0;this.active=false;this.group.visible=false;
 }
 dispose(){this.cancel();this.group.removeFromParent();this.geometry.dispose();this.core.material.dispose();this.glow.material.dispose();this.warning.geometry.dispose();this.warning.material.dispose();}
}
