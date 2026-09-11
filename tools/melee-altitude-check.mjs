// Aerial feedback placement, with the production pose/contact resolver at fixed roots.
// Locomotion/contact timing is covered separately by melee-contact-check.mjs.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const g=LSW.game;g.update=()=>{};const rows=[],failures=[];
  for(const height of [0,140,300])for(const kind of ['jab','blocked','heavy','crush','dive','grab','throw','breakFree','escape']){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});const a=g.player,f=g.entities.find(e=>e!==a&&!e.isDummy);
   a.pos.set(0,height,0);f.pos.set(0,height,5);a.faceDir(0,1);a.aim3.set(0,0,1);f.faceDir(0,-1);
   a.vel.set(0,0,0);f.vel.set(0,0,0);a.hasAimWorld=true;f.center(a.aimWorld);
   if(height>0)for(const e of [a,f]){e.flying=true;e.gait='airborne';}
   a._animate(.2);f._animate(.2);
   a.invuln=f.invuln=0;f.hp=f.maxHp=1000;f.guarding=kind==='blocked'||kind==='crush';
   let before=new Set(g.scene.children);
   if(['grab','throw','breakFree','escape'].includes(kind)){
    g.melee.grab(a);g.melee.update(a,.2);
    if(kind!=='grab')before=new Set(g.scene.children);
    if(kind==='throw')g.melee.grab(a);
    if(kind==='breakFree')g.melee._breakFree(a);
    if(kind==='escape'){
     f.teleEscape=true;f.ki=f.maxKi;a._victimEscape=true;g.melee.update(a,a.grabT*.6);
     if(a.grabbing||f.grabbedBy)failures.push(`Escape did not release at ${height}`);
    }
   }else{
    a.pos.z=1.2;a._animate(.2); // fixed-root contact distance; do not sample terrain physics here
    if(['heavy','crush'].includes(kind))g.melee._beginHeavy(a,'power',1,true);
    else{if(kind==='dive'){a.flying=true;a.descendHeld=true;a.vel.set(0,-30,0);}g.melee.strike(a);}
    for(let i=0;i<90&&f.hp===1000;i++){g.melee.update(a,1/120);a._animate(1/120);g.melee.resolveContact(a);f._animate(1/120);}
   }
   const feedback=g.scene.children.filter(o=>!before.has(o)&&(o.isSprite||o.geometry===g.vfx._ring||o.geometry===g.vfx._sphere));
   const ys=feedback.map(o=>o.position.y);rows.push({height,kind,ys});
   if(!ys.length||ys.some(y=>y<height-5||y>height+13))failures.push(`${kind}@${height}: contact feedback outside fighter height (${ys.join(',')})`);
  }
  return {rows,failures};
 });
 console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
