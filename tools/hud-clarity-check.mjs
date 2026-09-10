// Production HUD: one aim cue, no hidden-target leak, and data-sized player/kit layout.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hud-clarity';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const rows=[];
 for(const [width,height] of [[1280,720],[800,600],[1920,1080]])for(const hero of ['sol','stefanos','sandra'])for(const tier of [1,4]){
  await page.setViewportSize({width,height});
  const row=await page.evaluate(({hero,tier})=>{
   const {game:g,hud:h,THREE:T}=LSW;g.startMode('powerworld',{p1:hero,p2:'kano'});
   const p=g.player,t=g.entities.find(e=>e!==p&&!e.isDummy);g.fov=false;
   p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);
   t.pos.set(0,154,14);t.vel.set(0,0,0);t.flying=true;t.gait='airborne';t._vis=1;
   g.hardLock=t;t.center(g._aim3pt);g.world.snapChase();
   for(let i=0;i<120;i++){p._animate(1/120);t._animate(1/120);g.world.chase(p,t,1/120);}
   p.level=tier===4?10:1;p.tier=tier;p.buffT=12;p.buffName='SOLAR OVERLOAD';p._shieldHp=24;p._jetT=6;
   h.setPlayer(p.def);g.updateReticle(1/60);h.updateCrosshair(g);h.update();g.world.render();
   const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const visible=el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';};
   const pl=rect(h.el.plPanel),kit=rect(h.el.kit),cross=rect(h.el.cross),point=g.world.screenPosOf(g._aim3pt.x,g._aim3pt.y,g._aim3pt.z,{});
   const shapes=()=>[...h.el.cross.querySelectorAll('i')].map(el=>{const r=rect(el),s=getComputedStyle(el);return [r.width,r.height,s.borderTopWidth,s.borderLeftWidth].join('/');}).join('|');
   const lockedShape=shapes(),lockedCues=Number(visible(h.el.cross))+Number(g.redTri.visible)+Number(g.reticle.visible);
   const overlap=kit.width>0&&kit.left<pl.right&&kit.right>pl.left&&kit.top<pl.bottom&&kit.bottom>pl.top;
   const points=[];
   for(const mesh of [p.parts.head,p.parts.torso,p.parts.armL.children[2],p.parts.armR.children[2],p.parts.legL.userData.boot,p.parts.legR.userData.boot]){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
     const v=new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(g.world.camera);points.push({x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2});
    }
   }
   const body={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
   const masksPlayer=[kit,pl].some(r=>r.width>0&&r.left<body.right&&r.right>body.left&&r.top<body.bottom&&r.bottom>body.top);
   const row={hero,tier,width:innerWidth,height:innerHeight,pl,kit,overlap,body,masksPlayer,lockedCues,aimError:Math.hypot(cross.left-point.x,cross.top-point.y)};
   g.fov=true;t._vis=0;g.lockTarget=null;g.updateReticle(1/60);h.updateCrosshair(g);h.update();
   row.hiddenLeaks=visible(h.el.cross)||g.redTri.visible||h.el.foe.style.display!=='none';
   const oldPos=t.pos.clone();t.pos.set(0,140,-100);t.center(g._aim3pt);t._vis=1;
   h.updateCrosshair(g);h.update();row.edgeVisible=h.el.foeArrow.classList.contains('on');
   t._vis=0;for(const f of g.entities)if(f!==p)f._vis=0;
   h.updateCrosshair(g);h.update();row.hiddenEdgeLeak=h.el.foeArrow.classList.contains('on');
   t.pos.copy(oldPos);t.center(g._aim3pt);
   g.fov=false;g.hardLock=null;g.updateReticle(1/60);h.updateCrosshair(g);h.update();
   row.distinctShape=shapes()!==lockedShape;row.freeVisible=visible(h.el.cross);
   g.hardLock=t;t._vis=1;g.updateReticle(1/60);h.updateCrosshair(g);h.update();g.world.render();
   return row;
  },{hero,tier});rows.push(row);
  if(hero==='sol')await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${width}-tier${tier}.png`});
 }
 const failures=[];for(const r of rows){
  if(r.lockedCues!==1||r.aimError>1)failures.push(`${r.hero}/${r.width}: competing or misplaced aim cues`);
  if(!r.distinctShape||!r.freeVisible)failures.push(`${r.hero}/${r.width}: lock/free aim lacks a non-color distinction`);
  if(r.hiddenLeaks)failures.push(`${r.hero}/${r.width}: hidden foe retains target HUD`);
  if(!r.edgeVisible||r.hiddenEdgeLeak)failures.push(`${r.hero}/${r.width}: off-screen target bearing ignores visibility`);
  if(r.overlap||r.kit.top<0||r.pl.bottom>r.height||r.kit.right>r.width*.5-35||r.pl.right>r.width*.5-35)failures.push(`${r.hero}/${r.width}: player/kit panels overlap or invade the combat corridor`);
  if(r.masksPlayer)failures.push(`${r.hero}/${r.width}/tier${r.tier}: status panels hide the actual player body`);
 }
 for(const r of rows.filter(r=>r.tier===4&&r.width>=1280)){
  const base=rows.find(b=>b.hero===r.hero&&b.width===r.width&&b.tier===1);
  if(r.pl.width-base.pl.width<100)failures.push(`${r.hero}: tier expansion lost`);
 }
 const city=await page.evaluate(()=>{
  const {game:g,hud:h}=LSW;g.player._openSky=false;g.updateReticle(1/60);h.updateCrosshair(g);h.update();
  return {worldMark:g.redTri.visible,cross:getComputedStyle(h.el.cross).display,dock:getComputedStyle(document.querySelector('.status-dock')).display,pl:getComputedStyle(h.el.plPanel).position};
 });
 if(!city.worldMark||city.cross!=='none'||city.dock!=='contents'||city.pl!=='absolute')failures.push('city HUD ownership did not restore');
 const result={rows,city,failures,errors};await writeFile(`${out}/${process.argv.includes('--before')?'before':'after'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
