// The 3D stage. M1 ships the frame (renderer, camera, floor, empty package hook); M2 puts a
// production Fighter on it and plays pose-bank clips through the real bridge.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export class Stage{
 constructor(canvas,host){
  this.canvas=canvas;this.host=host;this.playing=true;this.time=0;this.overlays={skeleton:true,sockets:true,zones:false};
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#161a20');
  this.camera=new THREE.PerspectiveCamera(38,1,.1,600);this.camera.position.set(20,16,26);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,6,0);this.controls.enableDamping=true;
  this.scene.add(new THREE.HemisphereLight('#e9f0ff','#5a4a38',.7));
  const key=new THREE.DirectionalLight('#fff1d8',2.6);key.position.set(-18,26,-14);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-30,right:30,top:30,bottom:-30});this.scene.add(key);
  const rim=new THREE.DirectionalLight('#9ec9e8',.8);rim.position.set(14,12,18);this.scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(60,48),new THREE.MeshStandardMaterial({color:'#2a2f2a',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
  const grid=new THREE.GridHelper(80,20,'#4a5142','#333a34');grid.position.y=.02;this.scene.add(grid);
  this.content=new THREE.Group();this.scene.add(this.content);
  this.helpers=new THREE.Group();this.scene.add(this.helpers);
  this.onFrame=()=>{};this.onBodies=()=>{};this.playback={clips:[]};
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
  this.last=performance.now();
  const loop=now=>{const dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.controls.update();if(this.playing)this.advance(dt);this.renderer.render(this.scene,this.camera);requestAnimationFrame(loop);};
  requestAnimationFrame(loop);
 }
 resize(){const w=this.host.clientWidth||1,h=this.host.clientHeight||1;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async load(pkg){
  this.clear();this.pkg=pkg;this.time=0;
  this.playback={clips:[]};
  if(this.loader)this.playback=await this.loader(pkg,this);
  this.onBodies(this.playback.bodies||[]);
  return this.playback;
 }
 clear(){for(const o of [...this.content.children]){this.content.remove(o);o.traverse?.(x=>{x.geometry?.dispose?.();});}this.helpers.clear();this.dispose?.();this.dispose=null;}
 setClip(id){this.clip=this.playback.clips?.find(c=>c.id===id)||null;this.time=0;this.seek(0);}
 advance(dt){if(!this.clip)return;const d=this.clip.duration;this.time=this.clip.loop?(this.time+dt)%d:Math.min(d,this.time+dt);this.apply();}
 seek(frac){if(!this.clip)return;this.time=frac*this.clip.duration;this.apply();}
 apply(){if(!this.clip)return;this.playback.apply?.(this.clip,this.time);this.onFrame(this.time,this.clip.duration?this.time/this.clip.duration:0);}
 toggle(name,on){this.overlays[name]=on;this.playback.refreshOverlays?.();}
 setView(view){
  const t=this.controls.target;const d=Math.max(18,this.camera.position.distanceTo(t));
  if(view==='front')this.camera.position.set(t.x,t.y+2,t.z+d);
  if(view==='side')this.camera.position.set(t.x+d,t.y+2,t.z);
  if(view==='rear')this.camera.position.set(t.x,t.y+2,t.z-d);
  this.controls.update();
 }
 setBody(id){this.playback.setBody?.(id);}
 snapshot(){this.renderer.render(this.scene,this.camera);return this.canvas.toDataURL('image/jpeg',.85);}
}
