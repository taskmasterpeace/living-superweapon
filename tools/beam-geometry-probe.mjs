import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/beam-geometry';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');
 await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const result=await page.evaluate(()=>{
  const p=STUDIO.preview;p.setCombat({elevation:45,distance:32});p.seek(4);
  const b=p.combat.game.projectiles.list[0];
  const geo=b.glow.geometry, pos=geo.attributes.position,normal=geo.attributes.normal;
  const rings=[];
  for(let i=0;i<pos.count/b.RADIAL;i++){
   const v=b.muzzle.clone(),n=b.muzzle.clone();
   let minDepth=Infinity,maxDepth=-Infinity,minRadius=Infinity,maxRadius=0,maxNormalError=0;
   const center=v.clone().set(0,0,0);for(let r=0;r<b.RADIAL;r++)center.add(v.fromBufferAttribute(pos,i*b.RADIAL+r));center.multiplyScalar(1/b.RADIAL);
   for(let r=0;r<b.RADIAL;r++){
    v.fromBufferAttribute(pos,i*b.RADIAL+r);const radius=v.distanceTo(center);
    minRadius=Math.min(minRadius,radius);maxRadius=Math.max(maxRadius,radius);
    v.applyMatrix4(p.camera.matrixWorldInverse);minDepth=Math.min(minDepth,-v.z);maxDepth=Math.max(maxDepth,-v.z);
    n.fromBufferAttribute(normal,i*b.RADIAL+r);maxNormalError=Math.max(maxNormalError,Math.abs(n.length()-1));
   }
   rings.push({i,minRadius,maxRadius,minDepth,maxDepth,maxNormalError});
  }
  return {camera:p.camera.position.toArray(),near:p.camera.near,rings,pn:b.pn,path:Array.from(b.path.slice(0,b.pn*3)),meshes:b.grp.children.map(m=>({type:m.type,name:m.name,position:m.position.toArray(),scale:m.scale.toArray()}))};
 });
 for(const layer of ['all','core','glow','tip','detail','effects','glow-double','all-double']){
  await page.evaluate(layer=>{
   const p=STUDIO.preview,b=p.combat.game.projectiles.list[0];
   for(const key of ['core','glow','tip','detail'])if(b[key])b[key].visible=layer.startsWith('all')||layer===key||(layer==='glow-double'&&key==='glow');
   if(layer.endsWith('double')){b.glow.material.side=2;b.glow.material.forceSinglePass=true;b.glow.material.needsUpdate=true;}
   for(const fx of p.combat.game.vfx.fx)if(fx.mesh)fx.mesh.visible=layer==='all'||layer==='effects';
   p.combat.game.particles.points.visible=layer==='all'||layer==='effects';
   p.renderer.render(p.scene,p.camera);
  },layer);
  await page.screenshot({path:`${out}/${layer}.png`});
 }
 await writeFile(`${out}/probe.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
