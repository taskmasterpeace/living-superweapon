// Diagnose the native KANO frame from the waistband recording without altering physics.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const label=process.argv[2]||'baseline',out=`artifacts/beam-hollow/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const state=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview;p.playing=false;p.view='front';p.controls.enabled=false;
  p.combat.shooterMotion='ground-right';p.combat.motion='orbit-right';p.combat.targetSpeed=18;p.combat.elevation=14;p.seek(0);
  for(const selector of ['header','.library','.inspector'])document.querySelector(selector).style.display='none';
  document.querySelector('.viewport').style.cssText+=';position:fixed;inset:0;width:100vw;height:100vh;z-index:100';p.resize();
  for(let frame=1;frame<=180;frame++){p.time=frame/60;p.step(1/60,false,false);}
  const center=p.fighter.pos.clone().setY(p.fighter.pos.y+5.2),angle=Math.PI+.3;
  p.camera.position.copy(center).add(new T.Vector3(Math.sin(angle)*18,4.5,Math.cos(angle)*18));p.camera.lookAt(center);p.camera.fov=42;p.camera.updateProjectionMatrix();
  const b=p.combat.game.projectiles.list.find(b=>b.core),original=b.core.material;
  const compile=original.onBeforeCompile,cacheKey=original.customProgramCacheKey,callback=b.core.onBeforeRender;
  window.hollowMode=mode=>{
   b.core.material=original;b.core.visible=true;b.glow.visible=mode==='full';b.tip.visible=mode==='full';if(b.detail)b.detail.visible=mode==='full';
   original.side=T.FrontSide;original.forceSinglePass=false;b.core.onBeforeRender=callback;
   original.onBeforeCompile=compile;original.customProgramCacheKey=cacheKey;
   if(mode==='field'){
    original.onBeforeCompile=shader=>{compile(shader);
     shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb=mix(diffuseColor.rgb,beamBody*.85,axialStrand*.95);','diffuseColor.rgb=vec3(facing,length(across),abs(dot(normal,axis)));diffuseColor.a=1.0;');
    };original.customProgramCacheKey=()=> `hollow-${mode}`;
   }
   if(mode==='double'){original.side=T.DoubleSide;original.forceSinglePass=true;}
   if(mode==='opaque-front'||mode==='opaque-double')b.core.material=new T.MeshBasicMaterial({color:0x00ccff,side:mode==='opaque-double'?T.DoubleSide:T.FrontSide});
   p.camera.position.copy(center).add(new T.Vector3(Math.sin(angle)*18,4.5,Math.cos(angle)*18));p.camera.lookAt(center);p.camera.fov=42;p.camera.updateProjectionMatrix();
   original.needsUpdate=true;p.renderer.render(p.scene,p.camera);
   const png=p.renderer.domElement.toDataURL('image/png');
   if(b.core.material!==original)b.core.material.dispose();
   return png;
  };
  return {radius:b.radius,dir:b.dir.toArray(),path:[...b.path.slice(0,b.pn*3)],curve:[...b._curve.points.slice(0,b._curve.count*3)],radii:[...b._curve.radii.slice(0,b._curve.count)],damage:p.combat.damage};
 });
 for(const mode of ['full','core','opaque-front','opaque-double','double','field']){const png=await page.evaluate(mode=>hollowMode(mode),mode);await writeFile(`${out}/${mode}.png`,Buffer.from(png.split(',')[1],'base64'));}
 await writeFile(`${out}/state.json`,JSON.stringify({state,errors},null,2));console.log({out,errors,damage:state.damage});
}finally{await browser.close();}
