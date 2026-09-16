// VISION AUDIT — proves the Options VISION knob tightens BOTH the gameplay sight
// cone AND the fog you see, in lockstep (the can't-drift law). A foe dead-ahead at
// 90u is visible at a wide setting and gone at a tight one, and the fog uRange/uCos
// uniforms move with it. Needs a dev server on 127.0.0.1:5193.
import {chromium} from 'playwright';
const b=await chromium.launch({headless:false});const p=await b.newPage({viewport:{width:1280,height:800}});
const logs=[];p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
try{
 await p.goto('http://127.0.0.1:5193/powerworld.html');
 await p.waitForFunction(()=>window.LSW&&window.LSW.game,null,{timeout:60000});
 await p.locator('#hSelect.on').waitFor({timeout:60000}).catch(()=>{});
 const res=await p.evaluate(async()=>{
  const g=window.LSW.game;
  g.hud.hideTitle();g.running=true;g.world.render=()=>{};
  g.startMode('duel',{p1:'sarge',p2:'merc',enemy:'merc'});
  const pl=g.humans[0].fighter,foe=g.entities.find(e=>e.def&&e.def.id==='merc'&&e.team!==pl.team)||g.entities.find(e=>e.def&&e.def.id==='merc');
  if(!foe)return {error:'no foe'};
  foe.ai=null;
  if(g.world.cover)g.world.cover.length=0;                                        // clear occluders — isolate the RANGE/CONE gate from LOS
  pl.pos.set(0,0,0);pl.obj?.position.copy(pl.pos);pl.aim.set(0,0,1);pl.facing=0;   // look +Z
  foe.pos.set(0,0,60);foe.obj?.position.copy(foe.pos);                            // dead ahead, 60u (wide/base range ✓, tight range ✗)
  const measure=scale=>{
   g.visionScale=scale;
   for(let i=0;i<20;i++){pl.aim.set(0,0,1);g.updateVision(1/60);}                 // settle _vis (aim re-pinned; no controlPlayer here)
   const u=g.world.fogMat?.uniforms;
   return {scale,rangeEff:+g._visRangeEff.toFixed(1),coneEff:+g._visConeEff.toFixed(3),uRange:u?+u.uRange.value.toFixed(1):null,uCos:u?+u.uCos.value.toFixed(3):null,sees:!!g._humanSees(pl,foe),foeVis:+(foe._vis??0).toFixed(2)};
  };
  const wide=measure(1.2),base=measure(0.85),tight=measure(0.5);
  const rows=[];const ok=(n,c)=>rows.push({n,pass:!!c});
  ok('wide (1.2) sees the foe at 60u',wide.sees);
  ok('base (0.85) sees the foe at 60u',base.sees);
  ok('tight (0.5) does NOT see the foe at 60u',!tight.sees);
  ok('fog uRange follows the gameplay range',Math.abs(wide.uRange-wide.rangeEff)<0.6&&Math.abs(tight.uRange-tight.rangeEff)<0.6);
  ok('tighter = shorter range (48 < 82 < 115)',tight.rangeEff<base.rangeEff&&base.rangeEff<wide.rangeEff);
  ok('tighter = narrower wedge (higher cos)',tight.coneEff>base.coneEff&&base.coneEff>wide.coneEff);
  ok('fog uCos follows the gameplay cone',Math.abs(wide.uCos-wide.coneEff)<0.01&&Math.abs(tight.uCos-tight.coneEff)<0.01);
  const pass=rows.filter(r=>r.pass).length;
  return {pass,total:rows.length,wide,base,tight,rows};
 },{timeout:120000});
 console.log(JSON.stringify(res,null,1));
 console.log('--- console ---\n'+logs.filter(l=>/error|Error/i.test(l)).slice(-8).join('\n'));
}catch(e){console.log('RUN ERROR',e.message);console.log(logs.slice(-20).join('\n'));}
finally{await b.close();}
