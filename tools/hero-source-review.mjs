import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/hero-skin/source';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const rows=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),bank=await fetch('/src/data/hero-body-bank.json').then(r=>r.json()),p=STUDIO.preview;
  cancelAnimationFrame(p.raf);p.resizeObserver.disconnect();p.controls.enabled=false;
  document.querySelector('.inspector').style.visibility='hidden';document.querySelector('.library').style.visibility='hidden';
  const scene=new T.Scene();scene.background=new T.Color('#242923');scene.add(new T.HemisphereLight('#edf4ff','#746048',1.2));
  const key=new T.DirectionalLight('#fff0d4',3);key.position.set(-3,4,5);scene.add(key);
  const rim=new T.DirectionalLight('#a6d6ef',1);rim.position.set(3,2,-3);scene.add(rim);
  const rows=[];window.sourceBody=(id,angle)=>{
   for(const g of [...scene.children].filter(c=>c.isGroup)){scene.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
   const source=bank.bodies[id],g=new T.Group();scene.add(g);
   for(const m of source.meshes){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(m.position,3));geo.setAttribute('normal',new T.Float32BufferAttribute(m.normal,3));geo.setIndex(m.index);
    const material=new T.MeshStandardMaterial({color:m.material==='eyes'?'#eff0e7':m.material==='eyebrows'?'#30281e':'#b9aea0',roughness:.7});g.add(new T.Mesh(geo,material));
   }
   const box=new T.Box3().setFromObject(g),center=box.getCenter(new T.Vector3());
   p.camera.fov=38;p.camera.position.copy(center).add(new T.Vector3(...(angle==='front'?[0,.1,4.3]:[4.3,.1,0])));p.camera.lookAt(center);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOURCE / ${source.source.files.gltf} / ${angle}`;
   document.querySelector('.viewport-note').textContent='Exact ingested Quaternius CC0 source geometry · neutral review materials · source bind pose · no animations in these body files';
   document.querySelector('.measurements').textContent=`${source.joints.length} joints · ${source.meshes.reduce((n,m)=>n+m.index.length/3,0)} triangles`;
   document.querySelector('.hero-heading').textContent='Source body / unretargeted';
   p.renderer.render(scene,p.camera);return {id,angle,source:source.source,bounds:box};
  };
  return rows;
 });
 for(const id of ['superhero-male','superhero-female'])for(const angle of ['front','right']){
  rows.push(await page.evaluate(([id,angle])=>sourceBody(id,angle),[id,angle]));
  await page.locator('.viewport').screenshot({path:`${out}/${id}-${angle}.png`});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log('PASS four exact source bind-geometry reference views');
}finally{await context.close();await browser.close();}
