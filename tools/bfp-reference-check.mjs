// Independent image landmarks, not a test of our camera constants.
// Ultra BFP 2:44: hair top 448/720, trailing boot 633/720, centered rear.
// BFP's 4:3 90-degree horizontal lens has a 73.74-degree vertical field.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out=process.argv[2]||'artifacts/flight-review/reference-match';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],failures=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO);
 const initial=await page.evaluate(()=>STUDIO.preview.view);
 if(initial!=='game')failures.push('Studio opens a model-inspection angle instead of the reference game view');
 await page.evaluate(()=>{const p=STUDIO.preview;p.playing=false;cancelAnimationFrame(p.raf);p.setView('game');p.setState('hover');p.seek(0);});
 for(const width of [1280,960]){
  rows.push(await page.evaluate(async width=>{
   const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview;
   p.host.style.cssText=`position:fixed;inset:0;width:${width}px;height:720px;z-index:1000`;p.resize();p.seek(0);
   const f=p.fighter,c=p.camera;c.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   let top=1,bottom=0,left=1,right=0;
   // Only physical rig geometry, no aura, floor markers, weapons or VFX.
   for(const root of [f.parts.head,f.parts.torso,f.parts.pelvis,f.parts.armL,f.parts.armR,f.parts.legL,f.parts.legR])root.traverse(o=>{
    if(!o.isMesh||o.material.transparent)return;
    const pos=o.geometry.attributes.position,v=new T.Vector3();
    for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).project(c);const x=(v.x+1)/2,y=(1-v.y)/2;top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
   });
   // A one-unit feature one unit forward of the lens projects to 4/3 NDC
   // for BFP's tan(vfov/2)=.75, independent of width.
   const center=c.position.clone().add(c.getWorldDirection(new T.Vector3()));
   center.add(new T.Vector3(0,1,0).applyQuaternion(c.quaternion)).project(c);
   p.renderer.render(p.scene,c);
   return {width,top,bottom,left,right,oneUnitY:center.y,fov:c.fov};
  },width));
  await page.locator('.viewport canvas').screenshot({path:`${out}/hover-${width}.png`});
 }
 const response=await page.evaluate(()=>{
  const p=STUDIO.preview,w=p.chase,f=p.fighter,rows=[];
  for(const hz of [30,60,144]){
   f.pos.set(0,80,0);f.vel.set(0,0,0);w._lookYaw=0;w._lookPitch=0;w.snapChase();w.chase(f,null,1/hz);
   const x=w.camera.position.x-f.pos.x;let error=0;
   for(let i=0;i<hz;i++){f.vel.x=i<hz/2?210:0;f.pos.x+=f.vel.x/hz;w.chase(f,null,1/hz);error=Math.max(error,Math.abs(w.camera.position.x-f.pos.x-x));}
   rows.push({hz,error});
  }
  p.chase._lookPitch=-.8;p.setState('hover');
  return {rows,hoverPitch:p.chase._lookPitch};
 });
 if(response.rows.some(r=>r.error>.001))failures.push('Translation has a second camera spring: framing drifts during movement/braking');
 if(Math.abs(response.hoverPitch)>.001)failures.push('Studio hover inherits the previous attack camera pitch');
 for(const r of rows){
  if(Math.abs(r.top-448/720)>.018||Math.abs(r.bottom-633/720)>.018)failures.push(`${r.width}: fighter does not align with reference hair/boot landmarks`);
  if(Math.abs((r.left+r.right)/2-.5)>.015)failures.push(`${r.width}: fighter is not centered`);
  if(Math.abs(r.oneUnitY-4/3)>.002)failures.push(`${r.width}: narrowed vertical field loses BFP peripheral view`);
 }
 await writeFile(`${out}/results.json`,JSON.stringify({initial,rows,response,failures,errors},null,2));console.log({initial,rows,response,failures,errors});
 const reference=await readFile('docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 2-44 screenshot.png'),actual=await readFile(`${out}/hover-1280.png`);
 await page.setViewportSize({width:1440,height:490});
 await page.setContent(`<style>body{margin:0;padding:20px;background:#171b1e;color:#eef0eb;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}h2{font-size:16px;margin:0 0 12px}img{width:100%;display:block}p{color:#cad1cb}</style><main><figure><h2>REFERENCE · Ultra BFP 2:44</h2><img src="data:image/png;base64,${reference.toString('base64')}"></figure><figure><h2>CURRENT · Studio / Game camera</h2><img src="data:image/png;base64,${actual.toString('base64')}"></figure></main><p>Same 16:9 frame. Reference hair/boot: 62.22% / 87.92% · Current: ${(rows[0].top*100).toFixed(2)}% / ${(rows[0].bottom*100).toFixed(2)}%. Different characters and environments; camera framing comparison only.</p>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 await page.screenshot({path:`${out}/comparison.png`});
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
