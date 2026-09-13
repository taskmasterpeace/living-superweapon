import {setModularExpression,setModularMuscle} from '../engine/modular-face.js';
import {setModularCostume} from '../engine/modular-character.js';
import {MODULAR_RECIPES,applyModularRecipe,applyModularFrame,applyModularHeadScale,validateModularRecipe,animateModularCape} from '../engine/modular-costume.js';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Fighter} from '../engine/entity.js';
import {Ragdoll} from '../engine/ragdoll.js';
import {ROSTER} from '../data/characters.js';
import {createModularFlightAdapter} from '../engine/modular-flight.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
async function main(){
const renderer=new T.WebGLRenderer({canvas:document.querySelector('#view'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new T.Scene();scene.background=new T.Color('#353c38');scene.add(new T.HemisphereLight('#f5f4e8','#5d6553',2));
for(const [pos,color] of [[[5,9,9],'#fff3dd'],[[-5,4,-5],'#d0e2e6']]){const l=new T.DirectionalLight(color,2.5);l.position.set(...pos);scene.add(l);}
const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#343b34',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);scene.add(new T.GridHelper(40,40,'#62644c','#434b41'));
const camera=new T.PerspectiveCamera(38,1,.01,200);camera.position.set(8,4.5,12);const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,2.7,0);orbit.update();
const gltf=await new GLTFLoader().loadAsync('/models/modular-hero/modular-hero.glb');const actor=gltf.scene;actor.scale.setScalar(3);scene.add(actor);
const mixer=new T.AnimationMixer(actor);let motion='Idle_Loop',phase=0,playing=true,last=performance.now(),angle=0;
const meshes=[];actor.traverse(o=>{if(o.isMesh){meshes.push(o);o.frustumCulled=false;o.material=o.material.clone();o.material.side=T.DoubleSide;}});
const native=new Fighter(ROSTER.find(d=>d.id==='vega'));native._openSky=true;native.obj.visible=false;scene.add(native.obj);native._animate(0);
const height=native.parts.head.position.y+.8*native.parts.head.scale.y;actor.scale.setScalar(height/1.8325);camera.position.set(14,8,22);orbit.target.set(0,height/2,0);orbit.update();
const flightAdapter=createModularFlightAdapter(actor,native);
setModularCostume(meshes);setModularExpression(meshes);
let recipe={...MODULAR_RECIPES.base},size=1;
const colorFields={color:'primary',secondary:'secondary',trim:'trim',emblemColor:'emblemColor',skin:'skin',hairColor:'hairColor',eyeColor:'eyeColor',gloveColor:'gloveColor'};
function applyRecipe(sync=false){
 recipe=applyModularRecipe(meshes,recipe);applyModularFrame(actor,recipe.frame,height/1.8325*size);
 if(sync){
  for(const [id,key]of Object.entries(colorFields))document.getElementById(id).value=recipe[key]||({hairColor:'#171b19',eyeColor:'#29221b'}[key]);
  for(const key of ['hair','frame','emblem','emblemPlacement','expression','muscle','anatomy','gloves'])document.getElementById(key).value=recipe[key]??(key==='expression'?'neutral':key==='anatomy'?(recipe.frame==='agile'?'female':'male'):1);
  for(const key of ['tornClothes','robe','sleeves','collar','glasses','cape','armor','visor','eyepatch','eyeGlow','gauntlets','shoulders','knees','belt','backpack'])document.getElementById(key).checked=!!recipe[key];
 }
}
applyRecipe(true);
const find=n=>actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(n));const hand=find('DEF-hand.R');const sword=new T.Group();sword.name='review-sword';
const steel=new T.MeshStandardMaterial({color:'#cdd5ce',metalness:.65,roughness:.28});const gold=new T.MeshStandardMaterial({color:'#bba365',metalness:.5,roughness:.4});
const grip=new T.Mesh(new T.CylinderGeometry(.016,.016,.15,8),new T.MeshStandardMaterial({color:'#262b29'}));sword.add(grip);
const guard=new T.Mesh(new T.BoxGeometry(.20,.025,.035),gold);guard.position.y=.075;sword.add(guard);
const blade=new T.Mesh(new T.BoxGeometry(.046,.72,.014),steel);blade.position.y=.445;sword.add(blade);
const tip=new T.Mesh(new T.ConeGeometry(.024,.08,4),steel);tip.position.y=.845;sword.add(tip);
hand.add(sword);sword.position.set(0,.075,.028);sword.rotation.set(Math.PI/2,0,0);
let flightHands='fist';
let ragdoll=null,dropTime=0;
function sourcePose(name,t){const clip=gltf.animations.find(c=>c.name===name);mixer.stopAllAction();flightAdapter.reset();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(t*clip.duration);return clip;}
function draw(){
 const flight=motion.startsWith('flight');
 if(motion==='ragdoll'){
  if(!ragdoll){native.flying=false;native.pos.set(0,12,0);native.obj.position.copy(native.pos);native._animate(0);native.obj.updateMatrixWorld(true);ragdoll=new Ragdoll(native,new T.Vector3(8,3,5),{jointLimits:true});dropTime=performance.now();}
  const now=performance.now(),dt=Math.min(.033,(now-dropTime)/1000);dropTime=now;
  if(playing)ragdoll.step(dt,{world:{ARENA:100,heightAt:()=>0,cover:[]}});ragdoll.apply(native);sourcePose('Punch_Cross',.4);flightAdapter.update();
  const oldTarget=orbit.target.clone();native.parts.pelvis.getWorldPosition(orbit.target);camera.position.add(orbit.target.clone().sub(oldTarget));orbit.update();
 }else if(flight){
  sourcePose(flightHands==='open'?'A_TPose':'Punch_Cross',flightHands==='open'?0:.4);
  native.flying=true;native.gait='airborne';native.pos.set(0,3,0);native.vel.set(0,motion==='flightRise'?30:0,motion==='flightHover'?0:70);native.cruiseHeld=motion==='flightBoost';native.animT=phase*8;
  native._animate(1/60);flightAdapter.update();
 }else sourcePose(motion,phase);
 applyModularHeadScale(actor,recipe.frame);animateModularCape(meshes,performance.now()/1000,motion.startsWith("flight")?60:0);
 sword.visible=motion.startsWith('Sword');actor.updateMatrixWorld(true);
 document.querySelector('#status').textContent=motion==='ragdoll'?'Ragdoll · bounded elbows and knees · neck constraint':flight?'Native procedural flight · '+flightHands+' hands':motion+' · original authored clip · '+(phase*100).toFixed(0)+'%';
 renderer.render(scene,camera);
}
for(const b of document.querySelectorAll('[data-motion]'))b.onclick=()=>{if(ragdoll){ragdoll.restore();ragdoll=null;native.pos.set(0,0,0);native.obj.position.set(0,0,0);camera.position.set(14,8,22);orbit.target.set(0,height/2,0);orbit.update();}motion=b.dataset.motion;phase=0;playing=true;document.querySelector('#pause').textContent='Pause';for(const button of document.querySelectorAll('[data-motion]'))button.classList.toggle('active',button===b);draw();};
document.querySelector('#pause').onclick=()=>{playing=!playing;document.querySelector('#pause').textContent=playing?'Pause':'Play';};
document.querySelector('#scrub').oninput=e=>{playing=false;phase=+e.target.value;draw();};
document.querySelector('#costume').onchange=e=>{recipe={...MODULAR_RECIPES[e.target.value==='soldier'?'mercenary':e.target.value]};if(e.target.value==='soldier')Object.assign(recipe,{helmet:true,hair:'none'});applyRecipe(true);draw();};
for(const [id,key]of Object.entries(colorFields))document.getElementById(id).oninput=e=>{recipe[key]=e.target.value;applyRecipe();draw();};
document.querySelector('#angle').onclick=()=>{const a=++angle*Math.PI/2;camera.position.set(Math.sin(a)*24,8,Math.cos(a)*24);orbit.update();draw();};
document.querySelector('#hands').onchange=e=>{flightHands=e.target.value;draw();};
document.querySelector('#size').onchange=e=>{size=+e.target.value;applyRecipe();draw();};
for(const key of ['hair','frame','emblem','emblemPlacement','expression','anatomy','gloves'])document.getElementById(key).onchange=e=>{recipe[key]=e.target.value;applyRecipe();draw();};
document.querySelector('#muscle').oninput=e=>{recipe.muscle=+e.target.value;applyRecipe();draw();};
for(const key of ['tornClothes','robe','sleeves','collar','glasses','cape','armor','visor','eyepatch','eyeGlow','gauntlets','shoulders','knees','belt','backpack'])document.getElementById(key).onchange=e=>{recipe[key]=e.target.checked;applyRecipe();draw();};
document.querySelector('#exportRecipe').onclick=()=>{const blob=new Blob([JSON.stringify({schema:1,skeleton:'ual-deform-v1',body:'faceted-v1',...recipe,size},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='powerworld-character-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#recipeStatus').textContent='Recipe exported. Reuses the shared rig, modules and clips.';};
document.querySelector('#importRecipe').onclick=()=>document.querySelector('#recipeFile').click();
document.querySelector('#recipeFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1600000)throw Error('Recipe is too large');const next=validateModularRecipe(JSON.parse(await file.text()));recipe=next;size=next.size??1;delete recipe.size;const select=document.querySelector('#costume');select.querySelector('[value=imported]')?.remove();const option=new Option(next.name,'imported',true,true);option.disabled=true;select.add(option);const sizeSelect=document.querySelector('#size');if(!Array.from(sizeSelect.options).some(o=>+o.value===size))sizeSelect.add(new Option('Imported height',String(size)));sizeSelect.value=String(size);applyRecipe(true);draw();document.querySelector('#recipeStatus').textContent='Imported '+recipe.name;}catch(error){document.querySelector('#recipeStatus').textContent=error.message;}finally{e.target.value='';}};
document.querySelector('#uploadEmblem').onclick=()=>document.querySelector('#emblemFile').click();
document.querySelector('#emblemFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(!['image/png','image/webp'].includes(file.type)||file.size>1000000)throw Error('Use a PNG or WebP under 1 MB');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const bitmap=await createImageBitmap(file);if(bitmap.width>2048||bitmap.height>2048){bitmap.close();throw Error('Emblem must be at most 2048 × 2048');}bitmap.close();recipe.emblemImage=data;recipe.emblem='custom';applyRecipe(true);draw();document.querySelector('#recipeStatus').textContent='Transparent emblem imported and included in recipe exports.';}catch(error){document.querySelector('#recipeStatus').textContent=error.message;}finally{e.target.value='';}};
function resize(){const w=Math.max(320,innerWidth-340);renderer.setSize(w,innerHeight);camera.aspect=w/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();draw();
window.FOUNDATION={actor,meshes,mixer,orbit,native,flightAdapter,clips:gltf.animations,hand,sword,scene,camera,renderer,get recipe(){return {...recipe,size};},set(m,p=0){motion=({punch:'Punch_Cross',sword:'Sword_Attack',hold:'Sword_Idle'})[m]||m;phase=p;playing=false;document.querySelector("#pause").textContent="Play";for(const b of document.querySelectorAll("[data-motion]"))b.classList.toggle("active",b.dataset.motion===motion);document.querySelector("#scrub").value=phase;draw();},draw};
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing&&motion!=='ragdoll'){phase=(phase+dt/((motion.startsWith('flight')?8:gltf.animations.find(c=>c.name===motion).duration)+.35))%1;document.querySelector('#scrub').value=phase;}orbit.update();draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);

}
main().catch(error=>{console.error(error);document.querySelector("#status").textContent="Character failed to load: "+error.message;});
