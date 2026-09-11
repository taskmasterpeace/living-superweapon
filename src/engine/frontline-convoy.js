import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {disposeAircraftAsset} from './frontline-aircraft.js';
import {FrontlineDust} from './frontline-dust.js';
import {ScoutGunner} from './scout-gunner.js';
import {ScoutDriving} from './scout-driving.js';
import {OUTPOST_SCOUT_PARKS,OUTPOST_SCOUT_YAWS} from './frontline-outpost-layout.js';

export const SCOUT_ASSET='./models/frontline/armored-scout.glb';
// Native forward is +Z; negative X is screen-right from the entry approach.
const PARKS=OUTPOST_SCOUT_PARKS;
const SUPPORT=[[-4.9395,7.9],[4.9395,7.9],[-4.9395,-8.5],[4.9395,-8.5]];
const _up=new THREE.Vector3(),_forward=new THREE.Vector3(),_right=new THREE.Vector3(),_point=new THREE.Vector3(),_basis=new THREE.Matrix4();
// Grounded, destructible convoy vehicles. Optional Front Line adds a restrained
// remote gun station and bounded arcade ground driving.
export class FrontlineConvoy {
 constructor(stage,{loader=new GLTFLoader()}={}){
  this.stage=stage;this.game=stage.g;this.vehicles=[];this.disposed=false;this.ready=false;this.error=null;
  this._lastGameTime=this.game.time||0;
  this.driving=new ScoutDriving(this);
  this.group=new THREE.Group();this.group.name='frontline-convoy';this.game.scene.add(this.group);
  this.dust=new FrontlineDust(this.group);
  this.wreckMaterial=new THREE.MeshStandardMaterial({color:'#302b25',roughness:1,metalness:.15});
  this.loading=loader.loadAsync(SCOUT_ASSET).then(asset=>{
   if(this.disposed){disposeAircraftAsset(asset.scene);return;}
   this.asset=asset.scene;
   for(let i=0;i<PARKS.length;i++)this._add(i);
   this.ready=true;
  }).catch(error=>{if(!this.disposed){this.error=error.message;console.error('Frontline convoy asset',error);}});
 }
 _add(index){
  const yaw=OUTPOST_SCOUT_YAWS[index];
  const mesh=this.asset.clone(true);mesh.name=`armored-scout-${index+1}`;mesh.scale.setScalar(5);mesh.rotation.y=yaw;
  mesh.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const bounds=new THREE.Box3().setFromObject(mesh,true),hx=(bounds.max.x-bounds.min.x)/2,hz=(bounds.max.z-bounds.min.z)/2;
  const [px,pz]=PARKS[index],world=this.game.world,front=this.game.ms?.frontline;
  let at=null;
  for(let ring=0;ring<20&&!at;ring++)for(let j=0;j<(ring?16:1);j++){
   const x=px+Math.cos(j*Math.PI/8)*ring*16,z=pz+Math.sin(j*Math.PI/8)*ring*16;
   if(world.cover.some(c=>Math.abs(x-c.x)<hx+(c.hx??c.r??0)+5&&Math.abs(z-c.z)<hz+(c.hz??c.r??0)+5))continue;
   if([front?.casePosition,front?.extractionPosition,...(this.game.entities||[]).map(f=>f.pos)].some(p=>p&&Math.hypot(x-p.x,z-p.z)<32))continue;
   const cy=Math.cos(yaw),sy=Math.sin(yaw);
   const heights=SUPPORT.map(([dx,dz])=>world.heightAt?.(x+cy*dx+sy*dz,z-sy*dx+cy*dz)??0);
   const forward=((heights[0]+heights[1])-(heights[2]+heights[3]))/(2*16.4);
   const right=((heights[1]+heights[3])-(heights[0]+heights[2]))/(4*4.9395);
   const mean=heights.reduce((sum,h)=>sum+h,0)/4;
   const residual=Math.max(...heights.map((h,i)=>Math.abs(h-(mean+right*SUPPORT[i][0]+forward*(SUPPORT[i][1]+.3)))));
   // A static wheeled scout needs a gentle, nearly planar parking footprint.
   // Tilting a rigid chassis cannot fake suspension across a sharp ravine lip.
   if(Math.hypot(forward,right)>.25||residual>.75)continue;
   at={x,z};break;
  }
  if(!at)throw new Error('No clear convoy parking area');
  mesh.position.set(at.x,0,at.z);this.group.add(mesh);
  const cover={x:at.x,z:at.z,hx,hz,r:Math.hypot(hx,hz),hp:120,maxHp:120,mesh,projectileShape:'box',frontlineVehicle:true,blastBounds:new THREE.Box3(),bottom:0,top:0,h:bounds.max.y-bounds.min.y};
  const vehicle={mesh,cover,destroyed:false,ground:NaN,terrain:[],yaw,speed:0,occupant:null,driveRadius:Math.hypot(hx,hz),restBounds:new THREE.Box3(),mountBounds:new THREE.Box3()};
  cover.onShatter=(game,c,src)=>this.destroy(vehicle,src||c._breaker||game.player);
  this.vehicles.push(vehicle);world.cover.push(cover);world.coverAll.push(cover);this.stage._cover.push(cover);
  this._ground(vehicle);
  if(mesh.getObjectByName('turret')&&mesh.getObjectByName('barrel'))vehicle.gunner=new ScoutGunner(this.game,vehicle);
  world.refreshFogBoxes?.();
 }
 _ground(v){
  const {mesh,cover}=v,height=(x,z)=>this.game.world.heightAt?.(x,z)??0,sy=Math.sin(v.yaw??.25),cy=Math.cos(v.yaw??.25);
  const samples=SUPPORT.map(([x,z])=>height(cover.x+cy*x+sy*z,cover.z-sy*x+cy*z));
  if(samples.every((h,i)=>v.terrain[i]===h))return;v.terrain=samples;
  const forwardSlope=((samples[0]+samples[1])-(samples[2]+samples[3]))/(2*16.4);
  const rightSlope=((samples[1]+samples[3])-(samples[0]+samples[2]))/(4*4.9395);
  _up.set(-cy*rightSlope-sy*forwardSlope,1,sy*rightSlope-cy*forwardSlope).normalize();
  _forward.set(sy,0,cy).projectOnPlane(_up).normalize();_right.crossVectors(_up,_forward).normalize();
  mesh.quaternion.setFromRotationMatrix(_basis.makeBasis(_right,_up,_forward));
  // Four wheel footprints determine a rigid support plane. On uneven terrain
  // take its highest supporting contact so no tire plane penetrates the floor.
  let ground=-Infinity;
  for(const [x,z]of SUPPORT){_point.set(x,0,z).applyQuaternion(mesh.quaternion);ground=Math.max(ground,height(cover.x+_point.x,cover.z+_point.z)-_point.y);}
  v.ground=ground;mesh.position.y=ground;mesh.updateWorldMatrix(true,true);
  const box=cover.blastBounds.setFromObject(mesh,!v.occupant);
  v.restBounds.copy(box);
  cover.bottom=box.min.y;cover.top=cover.h=box.max.y;
  cover.hx=Math.max(cover.x-box.min.x,box.max.x-cover.x);cover.hz=Math.max(cover.z-box.min.z,box.max.z-cover.z);cover.r=Math.hypot(cover.hx,cover.hz);
  this.game.world.refreshFogBoxes?.();
 }
 update(){
  const time=this.game.time||0,dt=time-this._lastGameTime;this._lastGameTime=time;
  if(this.disposed)return;this.driving.update(dt);for(const v of this.vehicles)this._ground(v);
  if(!this.game.paused&&this.game.running!==false){
   this.dust?.update(Math.min(.1,Math.max(0,dt)));
   // Only the nearest station engages: three simultaneous perfect gun crews
   // would overwhelm the small first encounter. Other scouts remain cover.
   const p=this.game.player;let active=null,nearest=260*260;
   if(this.game.ms?.frontline&&p?.alive)for(const v of this.vehicles){
    const d=v.mesh.position.distanceToSquared(p.pos);if(!v.destroyed&&d<nearest){active=v;nearest=d;}
   }
   for(const v of this.vehicles){
    const gun=v.gunner;if(!gun)continue;const yaw=gun.turret.rotation.y,pitch=gun.barrel.rotation.x;
    gun.update(dt,v===active||!!v.occupant);
    if(!v.destroyed&&(yaw!==gun.turret.rotation.y||pitch!==gun.barrel.rotation.x)){
     // Cached geometry bounds, not a per-frame walk through 30k triangles.
     const b=v.cover.blastBounds.copy(v.restBounds).union(v.mountBounds.setFromObject(gun.turret,false)),c=v.cover;
     c.bottom=b.min.y;c.top=c.h=b.max.y;c.hx=Math.max(c.x-b.min.x,b.max.x-c.x);c.hz=Math.max(c.z-b.min.z,b.max.z-c.z);c.r=Math.hypot(c.hx,c.hz);
    }
   }
  }
 }
 _retireCover(c){
  const w=this.game.world,fade=w._fades?.get(c);
  if(fade){for(const [mesh,original]of fade.mats){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.material=original;}w._fades.delete(c);}
  for(const array of [w.cover,w.coverAll,this.stage._cover]){const i=array.indexOf(c);if(i>=0)array.splice(i,1);}
  w.refreshFogBoxes?.();
 }
 destroy(v,src){
  if(this.disposed||v.destroyed)return;v.destroyed=true;if(v.occupant)this.driving.exit(true);if(v.gunner)v.gunner.source.alive=false;v.cover.hp=0;this._retireCover(v.cover);
  v.mesh.traverse(o=>{if(o.isMesh)o.material=this.wreckMaterial;});
  const g=this.game,pos=new THREE.Vector3(v.cover.x,v.mesh.position.y+6,v.cover.z);
  this.dust.emit(pos);
  g.vfx.flash(pos,'#ff9b43',24,.6);g.particles.burst(pos.x,pos.y,pos.z,{count:40,speed:30,life:1.5,size:7,color:['#ffbb58','#e99a42','#38332e'],up:20,grav:9,drag:1});
  g.vfx.scorch(new THREE.Vector3(pos.x,v.mesh.position.y+.15,pos.z),12,'#29251f');
  if(g.audio.soundLibrary)g.audio.soundLibrary.play('vehicle-explosion',{pos});else g.audio.boom(.85,pos);
  g.world.shake(1.4);g.world.punch(.8);
  g.news?.highlight('car','ARMORED SCOUT DESTROYED',{dur:2.4,priority:2,focus:pos});
  // Book dead/removal BEFORE the native blast can chain back into this convoy.
  g.areaDamage(src,pos,24,30,2,{dtype:'fire'});
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.ready=false;
  this.driving.dispose();
  this.dust?.dispose();this.dust=null;
  for(const v of this.vehicles){if(v.gunner)v.gunner.source.alive=false;this._retireCover(v.cover);}
  this.group.removeFromParent();this.group.clear();this.vehicles.length=0;
  if(this.asset)disposeAircraftAsset(this.asset);this.asset=null;this.wreckMaterial.dispose();
 }
}
