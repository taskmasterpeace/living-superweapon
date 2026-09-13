import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createModularActor} from '../engine/modular-character.js';
import {applyModularRecipe,MODULAR_RECIPES} from '../engine/modular-costume.js';
import {createCreatureActor,CREATURE_RECIPES} from '../engine/creature-character.js';
import {metersToUnits} from '../core/world-units.js';
const $=id=>document.getElementById(id);
async function main(){
 const renderer=new T.WebGLRenderer({canvas:$('view'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new T.Scene();scene.background=new T.Color('#3e4437');scene.add(new T.HemisphereLight('#f8f1d9','#61614b',2));for(const pos of [[12,20,10],[-12,10,-8]]){const l=new T.DirectionalLight('#f5f3df',2.5);l.position.set(...pos);scene.add(l);}
 const floor=new T.Mesh(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:'#3b4338'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;scene.add(floor,new T.GridHelper(60,60,'#707354','#4a5345'));
 const camera=new T.PerspectiveCamera(40,1,.1,200);camera.position.set(15,10,24);const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,4,0);orbit.update();
 const soldier=createModularActor(await new GLTFLoader().loadAsync('/models/modular-hero/modular-hero.glb'));applyModularRecipe(soldier.meshes,{...MODULAR_RECIPES.mercenary,helmet:true,hair:'none'});soldier.pose('A_TPose',0);soldier.actor.scale.setScalar(metersToUnits(1.8288)/(1.795-.022));soldier.actor.position.set(-7,-.022*soldier.actor.scale.y,0);scene.add(soldier.actor);soldier.pose('Idle_Loop',0);
 let creature,recipe,epoch=0,playing=true,angle=0;
 async function load(id){const stamp=++epoch;recipe={...CREATURE_RECIPES[id]};const next=await createCreatureActor(recipe);if(stamp!==epoch){next.dispose();return;}creature?.dispose();creature=next;scene.add(creature.root);$('clip').replaceChildren(...[...creature.clips.keys()].map(n=>new Option(n,n)));$('clip').value='Idle';creature.play('Idle');$('measure').textContent=`Shoulder ${(recipe.shoulderMeters/.3048).toFixed(2)} ft / ${recipe.shoulderMeters.toFixed(2)} m · ${creature.clips.size} original clips`;playing=true;$('pause').textContent='Pause';}
 $('creature').onchange=e=>load(e.target.value).catch(fail);$('clip').onchange=e=>{creature.play(e.target.value);playing=true;$('pause').textContent='Pause';};$('pause').onclick=()=>{playing=!playing;$('pause').textContent=playing?'Pause':'Play';};$('scrub').oninput=e=>{playing=false;$('pause').textContent='Play';creature.sample($('clip').value,+e.target.value);};$('angle').onclick=()=>{angle+=Math.PI/2;camera.position.set(Math.sin(angle)*25,10,Math.cos(angle)*25);orbit.update();};
 $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({schema:1,family:'quadruped',skeleton:'quaternius-animal-v1',...recipe},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='powerworld-quadruped.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function resize(){renderer.setSize(innerWidth-340,innerHeight);camera.aspect=(innerWidth-340)/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();await load('husky');
 let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing)creature?.update(dt*+$('speed').value);$('status').textContent=recipe.name+' · '+$('clip').value+' · authored animation';orbit.update();renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
 window.CREATURE_WORKSHOP={get creature(){return creature;},scene,camera,renderer,soldier,load};
}
function fail(e){$('status').textContent=e.message;console.error(e);}main().catch(fail);
