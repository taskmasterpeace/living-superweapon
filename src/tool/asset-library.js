import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSoldierFamilyDefinition} from '../data/soldier-family.js';
import {figure} from '../engine/figure.js';
import {modularAsset,createModularActor,characterRecipeOf} from '../engine/modular-character.js';
import {applyModularRecipe,applyModularFrame} from '../engine/modular-costume.js';
import {createSignatureParts} from '../engine/modular-signature-parts.js';
import {drives} from '../data/fleet-handling.js';

const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const labels={fleet:'Fleet library',characters:'Characters & constructs',equipment:'Equipment library',facilities:'Facilities'};
let collection=Object.hasOwn(labels,params.get('collection'))?params.get('collection'):'fleet',catalog,selected,model,soldier,signature,serial=0;
const renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#343b32');scene.add(new THREE.HemisphereLight('#f1ecd7','#4c5944',2.6));const sun=new THREE.DirectionalLight('#fff6d9',2.8);sun.position.set(50,100,70);scene.add(sun);
const grid=new THREE.GridHelper(1000,190,'#7c815f','#45523e');scene.add(grid);
const camera=new THREE.PerspectiveCamera(40,1,.1,50000);const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
function disposeModel(root){root?.removeFromParent();const materials=new Set();root?.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}
async function loadSoldier(){
 const def=createSoldierFamilyDefinition({id:'highwall-rifleman',appearance:'olive',team:0}),native=figure(def);const height=native.head.position.y+.8*native.head.scale.y;disposeModel(native.g);
 const actor=createModularActor(await modularAsset()),recipe=characterRecipeOf(def);applyModularFrame(actor.actor,recipe.frame,height/1.8325);applyModularRecipe(actor.meshes,recipe);signature=createSignatureParts(actor.actor);signature.set(recipe);actor.pose('Idle_Loop',0);soldier=actor;scene.add(actor.actor);placeSoldier();
}
function placeSoldier(){if(!soldier)return;soldier.actor.visible=$('#soldier').checked;if(!model)return;const box=new THREE.Box3().setFromObject(model);soldier.actor.position.set(box.max.x+5,0,0);}
function frame(){if(!model)return;const box=new THREE.Box3().setFromObject(model);if(soldier?.actor.visible)box.union(new THREE.Box3().setFromObject(soldier.actor));const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),distance=Math.max(20,size.length()*1.25);orbit.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(distance*.75,distance*.42,distance));camera.far=Math.max(5000,distance*8);camera.updateProjectionMatrix();orbit.update();}
function renderList(){
 const q=$('#search').value.toLowerCase(),category=$('#category').value,rows=catalog.models.filter(m=>m.collection===collection&&(category==='all'||m.group===category)&&(!q||(m.id+' '+m.name).toLowerCase().includes(q)));
 $('#count').textContent=`${rows.length} models · ${catalog.models.filter(m=>m.collection===collection).length} in collection`;$('#models').replaceChildren();
 for(const row of rows){const button=document.createElement('button');button.dataset.model=row.id;button.setAttribute('aria-pressed',String(row.id===selected?.id));const name=document.createElement('b');name.textContent=row.name;const sub=document.createElement('small');sub.textContent=`${row.group} · ${row.runtime==='integrated-controller'?'Integrated controller':'Authored asset'}`;button.append(name,sub);button.onclick=()=>select(row);$('#models').append(button);}
 if(!rows.length)$('#models').textContent='No matching models.';
}
function chooseCollection(value){collection=value;selected=null;params.set('collection',value);history.replaceState(null,'','?'+params);$('#library-title').textContent=labels[value];$('#collections').replaceChildren();for(const [id,label]of Object.entries(labels)){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(id===value));b.onclick=()=>chooseCollection(id);$('#collections').append(b);}const category=$('#category');category.replaceChildren(new Option('All categories','all'));for(const group of [...new Set(catalog.models.filter(m=>m.collection===value).map(m=>m.group))])category.add(new Option(group,group));renderList();const first=catalog.models.find(m=>m.collection===value&&m.id===params.get('model'))||catalog.models.find(m=>m.collection===value&&m.id==='tank')||catalog.models.find(m=>m.collection===value);if(first)select(first);}
async function select(row){
 const request=++serial;selected=row;params.set('model',row.id);history.replaceState(null,'','?'+params);renderList();$('#model-name').textContent=row.name;$('#model-id').textContent=row.id;$('#model-note').textContent=row.note||'';$('#model-status').textContent='Loading authored model…';$('#provenance').textContent=`${row.url} · original authored version retained · ${row.runtime==='integrated-controller'?'Existing integrated controller; individual gameplay acceptance remains separate.':'Model preview; no claim of complete gameplay integration.'}`;$('#model-actions').replaceChildren();
 const link=(text,href)=>{const a=document.createElement('a');a.textContent=text;a.href=href;$('#model-actions').append(a);};
 if(row.collection==='fleet'&&drives(row)&&!/-damaged$|-destroyed$/.test(row.id))link(row.runtime==='integrated-controller'?'Try in vehicle proving ground':'Test drive · unverified',`./powerworld.html?destination=vehicle-sim&vehicle=${encodeURIComponent(row.id)}`);
 if(row.collection==='characters'){const family={'nanite-mech':'mech','nanite-hound':'hound','nanite-rat':'rat','nanite-cloud':'cloud'}[row.id];if(family)link('Open character motion tools',`./character-families.html?family=${family}`);else link('Open humanoid robot editor','./character-foundation.html?recipe=robot');link('Dog & creature editor','./creature-foundation.html');}
 if(row.collection==='equipment')link('Character equipment & powers','./studio.html');
 try{const gltf=await new GLTFLoader().loadAsync(new URL(row.url,new URL('./',location.href)).href);if(request!==serial){disposeModel(gltf.scene);return;}disposeModel(model);model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.position.y-=box.min.y;$('#dimensions').textContent=`${(size.x*.19).toFixed(2)}m wide × ${(size.y*.19).toFixed(2)}m high × ${(size.z*.19).toFixed(2)}m long · native scale, 0.19m per unit`;$('#model-status').textContent='Drag to orbit · wheel to zoom · grid spacing 1m';placeSoldier();frame();}catch(error){if(request!==serial)return;disposeModel(model);model=null;$('#model-status').textContent='Model unavailable: '+error.message;$('#dimensions').textContent='No dimensions verified; source entry retained.';}
}
$('#search').oninput=renderList;$('#category').onchange=renderList;$('#frame').onclick=frame;$('#soldier').onchange=()=>{placeSoldier();frame();};
const resize=()=>{const box=$('canvas').getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/Math.max(1,box.height);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('#preview'));resize();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
window.ASSET_LIBRARY={get collection(){return collection;},get selected(){return selected;},get model(){return model;},get soldier(){return soldier;},select};
async function initialize(){try{const response=await fetch('./asset-library/catalog.json');if(!response.ok)throw Error('Catalog response '+response.status);catalog=await response.json();chooseCollection(collection);await loadSoldier();frame();}catch(error){$('#model-status').textContent=error.message;}}
initialize();
addEventListener('pagehide',()=>{serial++;renderer.setAnimationLoop(null);disposeModel(model);signature?.dispose();soldier?.dispose();orbit.dispose();renderer.dispose();});
