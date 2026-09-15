import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fortification-expansion';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1800,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/fortification-kit-inspection',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#29322d"><script type="module">import * as T from "/node_modules/three/build/three.module.js";window.T=T;</script></body></html>'}));
await page.goto('http://127.0.0.1:5193/fortification-kit-inspection');await page.waitForFunction(()=>window.T);
const report=await page.evaluate(async()=>{
 const T=window.T,{buildFortificationKit}=await import('/src/engine/fortification-kit.js');
 const scene=new T.Scene();scene.background=new T.Color(0x3b443a);const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1800,1100);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;document.body.append(renderer.domElement);
 scene.add(new T.HemisphereLight(0xe6efff,0x4a4636,2));const sun=new T.DirectionalLight(0xfff4df,3);sun.position.set(-100,180,90);sun.castShadow=true;sun.shadow.camera.left=-250;sun.shadow.camera.right=250;sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0001;sun.shadow.normalBias=.2;scene.add(sun);
 const floor=new T.Mesh(new T.BoxGeometry(650,2,350),new T.MeshStandardMaterial({color:0x535b4f,roughness:1}));floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);
 const placements=[];const add=(id,moduleId,x,z,extra={})=>placements.push({id,moduleId,x,z,...extra});
 add('long','tall-long-wall',-180,-65);add('curve','tall-long-curve',-30,-65);
 for(const [i,state] of ['closed','damaged','destroyed','open'].entries()){add('gate-'+state,'gate-'+state,-210+i*100,70);add('door-'+state,'door-'+state,95+i*45,-65);}
 const kit=buildFortificationKit(placements);scene.add(kit);
 const label=(text,x,z)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#e7e7d9';c.font='600 28px sans-serif';c.textAlign='center';c.fillText(text,256,40);const tex=new T.CanvasTexture(canvas),m=new T.Mesh(new T.PlaneGeometry(47,6),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.04,z);scene.add(m);};
 for(const p of placements)if(!['closed-leaf','roof-mount','bunker-access'].includes(p.id))label(p.moduleId.toUpperCase(),p.x,p.z+(p.z<0?30:35));
 const {createSoldierFamilyDefinition}=await import('/src/data/soldier-family.js'),{figure}=await import('/src/engine/figure.js'),{modularAsset,createModularActor,characterRecipeOf}=await import('/src/engine/modular-character.js'),{applyModularRecipe,applyModularFrame}=await import('/src/engine/modular-costume.js');
 const def=createSoldierFamilyDefinition({id:'highwall-rifleman',appearance:'olive',team:0}),native=figure(def),height=native.head.position.y+.8*native.head.scale.y;
 const measured=[];for(const [x,z]of[[-243,-50],[-231,56],[-72,-50],[115,-47]]){const soldier=createModularActor(await modularAsset()),recipe=characterRecipeOf(def);applyModularFrame(soldier.actor,recipe.frame,height/1.8325);applyModularRecipe(soldier.meshes,recipe);soldier.pose('Idle_Loop',0);soldier.actor.position.set(x,0,z);scene.add(soldier.actor);soldier.actor.updateMatrixWorld(true);const bounds=new T.Box3();for(const mesh of soldier.meshes)if(mesh.visible)bounds.union(new T.Box3().setFromObject(mesh,true));measured.push({height:bounds.max.y-bounds.min.y,scale:soldier.actor.scale.toArray()});}
 const camera=new T.OrthographicCamera(-285,285,174,-174,.1,1500);camera.position.set(145,235,365);camera.lookAt(0,14,0);renderer.render(scene,camera);
 window.inspection={renderer,scene,camera};
 return {method:'Isolated source-kit visual inspection; no gameplay or navigation claim',placements:placements.length,solids:kit.userData.solids.length,currentSoldierHeight:height,measured};
});
await page.screenshot({path:`${out}/module-lineup.png`});
await page.evaluate(()=>{const {renderer,scene,camera}=inspection;camera.left=-67;camera.right=67;camera.top=41;camera.bottom=-41;camera.position.set(-225,21,105);camera.lookAt(-210,25,-65);camera.updateProjectionMatrix();renderer.render(scene,camera);});
await page.screenshot({path:`${out}/soldier-wall-scale.png`});
report.errors=errors;await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();if(errors.length)process.exitCode=1;
