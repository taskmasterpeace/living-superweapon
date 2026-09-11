// Exterior beam surfaces must face outward. Double-sided rendering used to hide
// inverted triangle winding; single-sided combat materials must not show an inside-out hose.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const f=g.player;f.pos.set(0,1000,0);f.faceDir(0,1);f._animate(1/60);f.hasAimWorld=false;f.aim3.set(0,0,1);
  const beam=g.spawnBeamFor(f,f.slots.lmb.def,1);
  for(let i=0;i<120;i++){f.ki=f.maxKi;g.time+=1/60;beam.update(1/60,g);}
  g.world.camera.position.copy(beam.muzzle).add(new T.Vector3(30,15,40));g.world.camera.lookAt(beam.muzzle);
  g.world.render();
  const failures=[],rows=[];
  for(const mesh of [beam.core,beam.glow]){
   const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
   let outward=0,inward=0;
   const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),radial=new T.Vector3();
   for(let i=0;i<index.count;i+=3){
    a.fromBufferAttribute(p,index.getX(i));b.fromBufferAttribute(p,index.getX(i+1));c.fromBufferAttribute(p,index.getX(i+2));
    radial.copy(a).add(b).add(c).multiplyScalar(1/3).sub(beam.muzzle).setZ(0);
    normal.copy(b).sub(a).cross(c.sub(a));const dot=normal.dot(radial);
    if(dot>1e-5)outward++;else if(dot< -1e-5)inward++;
   }
   const origin=beam.muzzle.clone().add(new T.Vector3(20,0,50));
   mesh.updateMatrixWorld(true);const hit=new T.Raycaster(origin,new T.Vector3(-1,0,0)).intersectObject(mesh)[0];
   const nearSurface=!!hit&&hit.point.x>beam.muzzle.x;
   rows.push({outward,inward,nearSurface});
   if(!outward||inward||!nearSurface)failures.push('beam exterior is inside-out / front-side camera ray misses the near surface');
  }
  const attributes=[];
  for(const path of ['straight','vertical','curve']){
   if(path!=='straight')for(let i=0;i<120;i++){
    f.aim3.copy(path==='vertical'?new T.Vector3(0,1,0):new T.Vector3(Math.sin(i/160),.3,Math.cos(i/160)).normalize());
    f.ki=f.maxKi;g.time+=1/60;beam.update(1/60,g);
   }
   const geo=beam.core.geometry,n=geo.attributes.normal,a=geo.attributes.beamArc,t=geo.attributes.beamTangent,index=geo.index;
   let invalid=0,inward=0,previous=-1;
   for(let i=0;i<n.count;i++){
    const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i)),arc=a.getX(i);
    if(!Number.isFinite(length)||Math.abs(length-1)>.001||!Number.isFinite(arc)||arc<previous)invalid++;
    const tl=t?Math.hypot(t.getX(i),t.getY(i),t.getZ(i)):NaN;
    const perpendicular=t?n.getX(i)*t.getX(i)+n.getY(i)*t.getY(i)+n.getZ(i)*t.getZ(i):NaN;
    if(!Number.isFinite(tl)||Math.abs(tl-1)>.001||!Number.isFinite(perpendicular)||Math.abs(perpendicular)>.001)invalid++;
    previous=arc;
   }
   const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),surface=new T.Vector3(),nb=new T.Vector3();
   for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    va.fromBufferAttribute(geo.attributes.position,ids[0]);vb.fromBufferAttribute(geo.attributes.position,ids[1]);vc.fromBufferAttribute(geo.attributes.position,ids[2]);
    surface.set(0,0,0);for(const id of ids)surface.add(nb.fromBufferAttribute(n,id));
    if(vb.sub(va).cross(vc.sub(va)).dot(surface)<-1e-5)inward++;
   }
   attributes.push({path,invalid,inward});
   if(invalid||inward)failures.push(`${path}: invalid normals/tangents/arc or inward triangles`);
  }
  // An emitter born before aim initialization still needs a finite render basis.
  beam.dir.set(0,0,0);beam.pn=2;for(let i=0;i<beam.NODES;i++)beam.muzzle.toArray(beam.path,i*3);
  beam._sweep(beam.core.geometry,beam.radius,1);
  const n=beam.core.geometry.attributes.normal,t=beam.core.geometry.attributes.beamTangent;
  const zeroAimBasis=[...n.array,...t.array].every(Number.isFinite)&&Math.hypot(n.getX(0),n.getY(0),n.getZ(0))>.99&&Math.hypot(t.getX(0),t.getY(0),t.getZ(0))>.99;
  if(!zeroAimBasis)failures.push('newborn zero aim collapses the rendered cross-section basis');
  return {rows,attributes,zeroAimBasis,failures};
 });console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
