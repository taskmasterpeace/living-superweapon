// Isolated asset inspection, not gameplay acceptance evidence.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts/frontline-aircraft',{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.THREE);
 const details=await page.evaluate(async()=>{
  const T=LSW.THREE,{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const scene=new T.Scene();scene.background=new T.Color('#9dabb4');scene.add(new T.HemisphereLight('#dce9f2','#6d614e',2));const sun=new T.DirectionalLight('#fff0d6',3);sun.position.set(15,25,20);scene.add(sun);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1400,900);renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.domElement.id='aircraftInspection';renderer.domElement.style='position:fixed;inset:0;z-index:99999';document.body.append(renderer.domElement);
  const camera=new T.PerspectiveCamera(45,1400/900,.1,10000),results=[];
  for(const [name,url,x] of [['helicopter','/assets-src/aircraft/helicopter-optimized.glb',-14],['jet','/assets-src/aircraft/f15.glb',14]]){
   const asset=await new GLTFLoader().loadAsync(url),model=asset.scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const scale=22/Math.max(size.x,size.y,size.z);model.scale.multiplyScalar(scale);model.position.sub(center.multiplyScalar(scale));model.position.x+=x;scene.add(model);
   const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,count:o.geometry.attributes.position.count});});
   results.push({name,size:size.toArray(),clips:asset.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>t.name)})),meshes});
   if(asset.animations.length){const mixer=new T.AnimationMixer(model);mixer.clipAction(asset.animations[0]).play();mixer.update(.4);}
  }
  camera.position.set(34,28,43);camera.lookAt(0,0,0);renderer.render(scene,camera);return results;
 });
 await page.locator('#aircraftInspection').screenshot({path:'artifacts/frontline-aircraft/models.png'});await writeFile('artifacts/frontline-aircraft/inspection.json',JSON.stringify({details,errors},null,2));console.log(JSON.stringify({details,errors}));
}finally{await browser.close();}
