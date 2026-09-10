// Real production hand geometry must change through a beam sequence, not just
// point a permanently clenched fist at the target. Weapon grips remain closed.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hands';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const p=STUDIO.preview,rows=[],failures=[];
  const shape=hand=>{
   const v=p.fighter.pos.clone(),points=[];
   for(let i=0;i<hand.geometry.attributes.position.count;i++){hand.getVertexPosition(i,v);points.push(...v.toArray());}
   return points;
  };
  const delta=(a,b)=>a.length===b.length?Math.max(...a.map((x,i)=>Math.abs(x-b[i]))):Infinity;
  for(const armed of [false,true]){
   if(armed){const def={...p.def,build:{weaponR:'rifle'}};p.setProfile(def,p.profile);p.setState('beam');}
   p.seek(0);const initial=[p.fighter.parts.armL,p.fighter.parts.armR].map(a=>shape(a.children[2]));
   const phases=[];
   for(const time of [1.4,3,7]){
    p.seek(time);const hands=[p.fighter.parts.armL,p.fighter.parts.armR].map(a=>a.children[2]);
    p.fighter.obj.updateMatrixWorld(true);
    const palmHits=hands.map(h=>{
      const forward=new T.Vector3(0,-1,0).applyQuaternion(h.getWorldQuaternion(new T.Quaternion()));
      const origin=h.getWorldPosition(new T.Vector3()).addScaledVector(forward,2);
      // Only the owning arm's real volumes: invisible aura/guard shells are
      // still raycastable and must not masquerade as a cuff occlusion.
      const hits=new T.Raycaster(origin,forward.negate(),0,3).intersectObject(h.parent,true);
      return hits.slice(0,3).map(hit=>({hand:hit.object===h,name:hit.object.name,type:hit.object.geometry.type,distance:hit.distance,point:h.worldToLocal(hit.point.clone()).toArray()}));
    });
    const palmClear=palmHits.map(hits=>hits[0]?.hand);
    phases.push({time,delta:hands.map((h,i)=>delta(shape(h),initial[i])),open:hands.map(h=>h.morphTargetInfluences?.[0]??0),finite:hands.every(h=>shape(h).every(Number.isFinite)),palmClear,palmHits});
    p.renderer.render(p.scene,p.camera);
   }
   if(phases[0].delta[0]<.15||phases[1].delta[0]<.3)failures.push('casting hand remains a fixed fist');
   if(phases[1].delta[0]<=phases[0].delta[0]+.05)failures.push('release does not open beyond cupped charge');
   if(phases[2].delta.some(d=>d>.005))failures.push('hand fails to recover after release');
   if(armed&&phases.some(s=>s.open[1]!==0))failures.push('weapon grip opens while carrying a rifle');
   if(phases.some(s=>!s.finite))failures.push('non-finite rendered hand');
   if(!armed&&phases[1].palmClear.some(clear=>!clear))failures.push('open palm is buried behind cuff/forearm along its casting axis');
   if(armed&&!p.fighter.parts.armR.children[2].children.some(o=>o.isObject3D))failures.push('armed fixture has no actual rifle attached');
   p.seek(3);p.fighter.poseGuard=1;
   for(let i=0;i<30;i++)p.fighter._animate(1/60);
   if([p.fighter.parts.armL,p.fighter.parts.armR].some(a=>a.children[2].morphTargetInfluences[0]>.005))failures.push('guard interruption leaves an open casting hand');
   rows.push({armed,phases});
  }
  return {rows,failures};
 });
 await writeFile(`${out}/checks.json`,JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({rows:result.rows.map(r=>({...r,phases:r.phases.map(({palmHits,...p})=>p)})),failures:result.failures,errors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(result.failures,[]);
}finally{await browser.close();}
