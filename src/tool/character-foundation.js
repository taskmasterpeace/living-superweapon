import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Fighter,buildWeapon} from '../engine/entity.js';
import {ROSTER} from '../data/characters.js';
import {STRIKE_CLIPS} from '../data/strike-markers.js';
import {authoredParts,samplePoseFrame,applyAuthoredPose} from '../engine/authored-pose.js';
import {animateWeaponStrike,animateWeaponReady} from '../engine/melee-weapon-pose.js';
import {alignWeaponGrip} from '../engine/weapon-grip.js';
import {updateLimbSurfaces} from '../engine/hero-limb-surface.js';
import {updateHeroSkin} from '../engine/hero-skin.js';

const renderer=new T.WebGLRenderer({canvas:document.querySelector('#view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#253035');
scene.add(new T.HemisphereLight('#ecf5ff','#5e5143',2.2));
const key=new T.DirectionalLight('#fff0d3',3);key.position.set(8,15,12);scene.add(key);
const rim=new T.DirectionalLight('#b8dcea',2);rim.position.set(-8,8,-8);scene.add(rim);
const floor=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:'#394447',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.06;scene.add(floor);scene.add(new T.GridHelper(40,20,'#887954','#495557'));
const camera=new T.PerspectiveCamera(42,1,.1,150);camera.position.set(12,8,17);const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,4.7,0);orbit.update();
let f,weapon,base,motion='punch',phase=0,playing=true,last=performance.now(),angle=0;
const frame=new Float64Array(45),clip=STRIKE_CLIPS.cross,original=structuredClone(ROSTER.find(d=>d.id==='vega'));
function rebuild(){
 if(f){scene.remove(f.obj);f.dispose();}
 const def=structuredClone(original);def.colors={...def.colors,primary:document.querySelector('#color').value,secondary:'#b3954a',accent:'#e2bf59'};
 def.model={...def.model,body:'superhero-male',costume:document.querySelector('#costume').value,insignia:'V',equipment:null};
 def.build={...(def.build||{}),weaponL:null,weaponR:null,gun:null,blade:null};
 f=new Fighter(def);f._openSky=true;f.flying=false;f.gait='grounded';f.pos.set(0,0,0);scene.add(f.obj);f._animate(0);
 weapon=buildWeapon('sword',{});alignWeaponGrip(weapon,1);f.parts.armR.children[2].add(weapon);
 base=authoredParts(f.parts).map(part=>({part,p:part.position.clone(),q:part.quaternion.clone(),s:part.scale.clone()}));
 draw();
}
function draw(){
 for(const b of base){b.part.position.copy(b.p);b.part.quaternion.copy(b.q);b.part.scale.copy(b.s);}
 weapon.visible=motion!=='punch';f.parts.armR.children[2].userData.gripOccupied=weapon.visible;f.parts.armR.children[2].userData.gripKind=weapon.visible?'cylinder':undefined;
 if(motion==='punch'){samplePoseFrame(clip,phase,frame,false);applyAuthoredPose(f,frame,1,{hips:true});}
 else if(motion==='sword'){
  const state=phase<.3?'startup':phase<.65?'active':'recovery',t=phase<.3?phase/.3:phase<.65?(phase-.3)/.35:(phase-.65)/.35;
  animateWeaponStrike(f,t,1,{weapon,side:1,point:new T.Vector3(0,5,5)},state);
 }else animateWeaponReady(f);
 f.obj.updateMatrixWorld(true);updateLimbSurfaces(f.parts);updateHeroSkin(f.parts);
 document.querySelector('#status').textContent=`${motion==='punch'?clip.take+' · source pose':motion==='sword'?'Procedural slash · source replacement pending':'Shared palm socket'} | ${(phase*100).toFixed(0)}%`;
 renderer.render(scene,camera);
}
for(const b of document.querySelectorAll('[data-motion]'))b.onclick=()=>{motion=b.dataset.motion;phase=0;playing=true;document.querySelector('#pause').textContent='Pause';for(const e of document.querySelectorAll('[data-motion]'))e.classList.toggle('active',e===b);draw();};
document.querySelector('#pause').onclick=()=>{playing=!playing;document.querySelector('#pause').textContent=playing?'Pause':'Play';};
document.querySelector('#scrub').oninput=e=>{playing=false;phase=+e.target.value;document.querySelector('#pause').textContent='Play';draw();};
document.querySelector('#costume').onchange=rebuild;document.querySelector('#color').onchange=rebuild;
document.querySelector('#angle').onclick=()=>{const a=++angle*Math.PI/2;camera.position.set(Math.sin(a)*18,7,Math.cos(a)*18);orbit.update();draw();};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();rebuild();
window.FOUNDATION={set(m,p=0){motion=m;phase=p;playing=false;draw();},get fighter(){return f;},get weapon(){return weapon;},draw};
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){phase=(phase+dt/(motion==='punch'?clip.duration+0.5:1.5))%1;document.querySelector('#scrub').value=phase;}orbit.update();draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);
