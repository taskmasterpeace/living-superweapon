import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/marketing/issue-7-woodland-cost';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.waitForTimeout(1200);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Enter with squad',exact:true}).click();
 await page.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{}, {timeout:90000});await page.waitForTimeout(1200);

 await page.keyboard.press('g');await page.keyboard.down('w');await page.waitForTimeout(850);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.PW.game.ms.convoyOperation?.depot?.sites.length>0,{}, {timeout:30000});
 const fixed=process.argv[2]==='after'?JSON.parse(await readFile('artifacts/marketing/issue-7-woodland-before/view.json','utf8')):null;
 const result=await page.evaluate(()=>{const g=window.PW.game,o=g.ms.convoyOperation,s=o.woodland.trees[3];g.player.pos.set(s.x,s.y,s.z-35);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;return {trees:o.woodland.trees.length,meshes:o.woodland.group.children.length,view:{x:s.x,y:s.y,z:s.z-35}};});
 if(fixed)await page.evaluate(v=>{const g=window.PW.game;g.player.pos.set(v.x,v.y,v.z);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;},fixed);await writeFile(out+'/view.json',JSON.stringify(fixed||result.view));
 const cost=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),g=window.PW.game,w=g.world,wood=g.ms.convoyOperation.woodland,renderer=w.renderer,gl=renderer.getContext(),originalUpdate=g.update;g.update=()=>{};
  const current=wood.parts.map(p=>p.mesh.geometry),old=[];
  old[0]=new THREE.CylinderGeometry(.8,1.5,16,6);old[0].translate(0,8,0);
  old[1]=new THREE.CylinderGeometry(.3,.7,11,5);old[1].rotateZ(-.65);old[1].translate(3,13,0);
  old[2]=new THREE.IcosahedronGeometry(1,1);old[2].scale(11,3.5,8);old[2].translate(0,18,0);
  const sample=async(geometries)=>{
   wood.parts.forEach((p,i)=>p.mesh.geometry=geometries[i]);const times=[];
   for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const start=performance.now();w.composer.render();gl.finish();if(i>=30)times.push(performance.now()-start);}
   times.sort((a,b)=>a-b);return {p50:times[30],p95:times[57],samples:times.length};
  };
  try{const before=await sample(old),after=await sample(current),ext=gl.getExtension('WEBGL_debug_renderer_info');return {kind:'Render-only completion timing with gl.finish; frozen simulation, same camera, same 48-tree instances and full scene; not gameplay FPS',before,after,trees:wood.trees.length,drawMeshes:wood.parts.length,pixelRatio:renderer.getPixelRatio(),viewport:[innerWidth,innerHeight],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};}finally{wood.parts.forEach((p,i)=>p.mesh.geometry=current[i]);for(const geo of old)geo.dispose();g.update=originalUpdate;}
 });
 await writeFile(out+'/cost.json',JSON.stringify({cost,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
