import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output='artifacts/correspondent-framing';await mkdir(output,{recursive:true});
const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(base+'/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const {game:g}=LSW;g.startMode('powerworld',{p1:'sol',p2:'kano'});
  const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
  for(const e of g.entities){e.ai=null;if(e!==a&&e!==b)e.pos.set(800,300,800);}
  for(const [f,x] of [[a,-12],[b,12]]){f.pos.set(x,0,55);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.invuln=30;}
  g.hardLock=b;g.controlPlayer=()=>{};g.controlBot=()=>{};
  const step=g.update.bind(g);g.update=()=>{};g.world.render=()=>{};g.news.reset('powerworld');g.news.setCameraProfile({handheld:0});
  // Framing inspection, not a capture/performance benchmark: suppress scheduled
  // encoding through its normal frame-pressure gate; draw the actual POV on demand.
  window.framing={g,a,b,step:()=>{g.world._ema=100;step(1/60);LSW.input.endFrame();}};
 });
 const capture=async name=>{
  const data=await page.evaluate(()=>{const n=framing.g.news;n._renderPOV(null);return n.canvas.toDataURL('image/png');});
  await writeFile(`${output}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 };
 await page.evaluate(()=>{for(let i=0;i<24;i++)framing.step();});await capture('opening');
 const result=await page.evaluate(()=>{
  const {g,a,b,step}=framing,{THREE:T}=LSW,n=g.news;
  n.highlight('bighit','COLD OPENING — CONTACT',{focus:b.pos,actor:a,target:b});const frames=[];
  for(let i=0;i<12;i++){
   step();n.grp.updateMatrixWorld(true);n.cam.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(n.rp);
   frames.push({frame:i,shot:n._shot.kind,reporterVisible:n.rp.visible,
    subjects:[a,b].map(f=>{const body=f.pos.clone().add(new T.Vector3(0,5,0));const ray=new T.Ray(n.cam.position.clone(),body.clone().sub(n.cam.position).normalize());
     const hit=ray.intersectBox(box,new T.Vector3());return {blocked:!!hit&&hit.distanceTo(n.cam.position)<body.distanceTo(n.cam.position),ndc:body.clone().project(n.cam).toArray()};})});
  }
  return {frames,operator:n.opPos.toArray(),reporter:n.rpPos.toArray(),camera:n.cam.position.toArray()};
 });
 await capture('impact');
 assert.ok(result.frames.every(f=>f.reporterVisible&&f.subjects.every(s=>!s.blocked)));
 assert.deepEqual(errors,[]);await writeFile(`${output}/results.json`,JSON.stringify({result,errors},null,2));
 console.log(JSON.stringify({nativeFrames:result.frames.length,clear:!result.frames.some(f=>f.subjects.some(s=>s.blocked)),errors}));
}finally{await browser.close();}
