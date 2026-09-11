import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.vfx.update(10);const rows=[],failures=[];
  for(const hz of [30,60,120])for(const dir of [new T.Vector3(0,0,1),new T.Vector3(0,1,0),new T.Vector3(0,-1,0)]) {
   const before=new Set(g.world.scene.children),fxCount=g.vfx.fx.length;
   const source=new T.Vector3(0,140,0),origin=source.clone();g.vfx.contact(source,dir,{power:2,color:'#ffd24a'});
   const created=g.world.scene.children.filter(o=>!before.has(o));
   const streaks=created.find(o=>o.isMesh);let geometryDisposed=false,materialDisposed=false;
   streaks.geometry.addEventListener('dispose',()=>geometryDisposed=true);streaks.material.addEventListener('dispose',()=>materialDisposed=true);
   // A world-space impact must not follow a caller's reused position vector.
   source.x+=100;g.vfx.update(1/hz);
   const drift=streaks.position.distanceTo(origin);
   if(drift>2)failures.push(`${hz}Hz/${dir.y}: world contact followed mutable input (${drift})`);
   for(const v of streaks.geometry.attributes.position.array)if(!Number.isFinite(v))failures.push('non-finite streak vertex');
   for(let i=0;i<hz;i++)g.vfx.update(1/hz);
   const leaked=created.some(o=>o.parent)||g.vfx.fx.length!==fxCount||!geometryDisposed||!materialDisposed;
   if(leaked)failures.push(`${hz}Hz/${dir.y}: transient resource leak`);
   rows.push({hz,y:dir.y,drift,leaked});
  }
  const guards=[];
  for(const hero of ['kano','rime','vanguard']) {
   g.startMode('powerworld',{p1:hero,p2:'sol'});const f=g.player;
   f.guarding=true;f._blocked=.16;f._animate(1);const mat=f.parts.guardArc.material,version=mat.version;
   const opacity=mat.opacity,side=mat.side;
   if(opacity>.261||mat.blending!==T.NormalBlending||!mat.forceSinglePass)failures.push(`${hero}: close guard is not translucent`);
   if(side!==(hero==='rime'?T.FrontSide:T.DoubleSide))failures.push(`${hero}: wrong guard face policy`);
   if(hero==='vanguard'&&mat.color.getHex()!==0xffd24a)failures.push('Deflect guard lost its gold identity');
   for(let i=0;i<120;i++)f._animate(1/120);
   if(mat.version!==version)failures.push(`${hero}: guard triggers a material update every frame`);
   f._openSky=false;f._animate(1);
   if(mat.blending!==T.AdditiveBlending||mat.side!==T.DoubleSide||mat.forceSinglePass||mat.opacity<.73)failures.push(`${hero}: city guard was not restored`);
   guards.push({hero,opacity,side,stableVersion:mat.version===version+(hero==='rime'?1:0)});
  }
  return {rows,guards,failures};
 });console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
