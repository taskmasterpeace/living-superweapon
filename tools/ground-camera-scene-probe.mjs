import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
const row=JSON.parse(readFileSync('artifacts/ground-camera/wall-slide/results.json')).rows[285];
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 console.log(JSON.stringify(await page.evaluate(r=>{
  const {game:g,THREE:T}=LSW,w=g.world,c=w.camera,f=g.player;g.update=()=>{};
  f.pos.fromArray(r.position);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f._animate(1/60);
  c.position.fromArray(r.camera);c.lookAt(c.position.clone().add(new T.Vector3(0,Math.sin(r.pitch),Math.cos(r.pitch))));c.updateMatrixWorld(true);w.scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(c.position,c.getWorldDirection(new T.Vector3()),c.near,1000);ray.camera=c;
  const hits=ray.intersectObjects(w.scene.children,true).filter(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return[].concat(h.object.material).some(m=>!m.transparent);});
  const nearest=hits[0]?.object;
  return {camera:c.position.toArray(),hits:hits.slice(0,8).map(h=>({distance:h.distance,name:h.object.name,geo:h.object.geometry.type,point:h.point.toArray(),parents:[h.object.parent?.name,h.object.parent?.parent?.name],box:new T.Box3().setFromObject(h.object)})),
   cover:w.cover.filter(k=>Math.abs(k.x-f.pos.x)<20&&Math.abs(k.z-f.pos.z)<20).map(k=>({keys:Object.keys(k),x:k.x,z:k.z,hx:k.hx,hz:k.hz,meshName:k.mesh?.name,objName:k.obj?.name,box:k.mesh?new T.Box3().setFromObject(k.mesh):null})),
   nearestAncestors:nearest?(()=>{const a=[];for(let o=nearest;o;o=o.parent)a.push({name:o.name,type:o.type,position:o.position.toArray(),scale:o.scale.toArray(),userDataKeys:Object.keys(o.userData)});return a;})():[]};
 },row),null,2));
}finally{await browser.close();}
