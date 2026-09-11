// A uniform alpha shell reads as flat polygon sheets. Measure the production
// sheath alone: its rim must soften, while its center remains visible.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const row=await page.evaluate(async frontOnly=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const p=STUDIO.preview;p.seek(4);const b=p.combat.game.projectiles.list[0],mesh=b.glow;
  const scene=new T.Scene();scene.background=new T.Color(0);
  const wanted=new T.Vector3().fromArray(b.path,30),center=new T.Vector3(),candidate=new T.Vector3(),vertex=new T.Vector3();
  let ring=0,closest=Infinity;const position=mesh.geometry.attributes.position;
  for(let r=0;r<position.count/b.RADIAL;r++){
   candidate.set(0,0,0);for(let i=0;i<b.RADIAL;i++)candidate.add(vertex.fromBufferAttribute(position,r*b.RADIAL+i));candidate.multiplyScalar(1/b.RADIAL);
   const distance=candidate.distanceTo(wanted);if(distance<closest){closest=distance;ring=r;center.copy(candidate);}
  }
  const dir=new T.Vector3().fromArray(b.path,33).sub(new T.Vector3().fromArray(b.path,27)).normalize();
  const side=new T.Vector3(1,0,0).addScaledVector(dir,-dir.x).normalize(),up=new T.Vector3().crossVectors(dir,side).normalize();
  const camera=new T.OrthographicCamera(-12,12,12,-12,.1,200);
  camera.position.copy(center).addScaledVector(side,70);camera.up.copy(up);camera.lookAt(center);
  let radius=0;for(let i=0;i<b.RADIAL;i++)radius=Math.max(radius,vertex.fromBufferAttribute(position,ring*b.RADIAL+i).distanceTo(center));
  const target=new T.WebGLRenderTarget(512,512),pixels=new Uint8Array(512*512*4),renderer=p.renderer,previous=renderer.getRenderTarget();
  scene.add(mesh);
  if(frontOnly){mesh.material.side=T.FrontSide;mesh.material.needsUpdate=true;}
  try{
   renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);
   const patch=y=>{let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=((Math.round(y)+dy)*512+256+dx)*4;sum+=pixels[i]+pixels[i+1]+pixels[i+2];}return sum/9;};
   const result={center:patch(256),rim:patch(256+radius*.85*512/24),radius,calls:renderer.info.render.calls};
   // Looking out from inside the open shell exercises the back-facing wall
   // that a rear camera sees through the beam's mouth.
   camera.position.copy(center);camera.lookAt(center.clone().add(side));
   renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);
   result.interior=patch(256);return result;
  }finally{renderer.setRenderTarget(previous);b.grp.add(mesh);target.dispose();}
 },process.argv.includes('--front-only'));
 console.log(JSON.stringify({row,errors}));assert.equal(errors.length,0);assert.ok(row.center>5,'Sheath must stay visible');
 assert.ok(row.rim<row.center*.65,`Flat shell: rim ${row.rim} vs center ${row.center}`);
 assert.equal(row.calls,1,'A sheath must stay one draw call');
 assert.ok(row.interior>5,'Rear view through the mouth must not cull the far wall');
}finally{await browser.close();}
