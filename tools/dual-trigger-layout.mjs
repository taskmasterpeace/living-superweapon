// The new trigger row must also fit the retained city HUD, not just PowerWorld.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/dual-trigger-layout';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),rows=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};LSW.game.world.render=()=>{};LSW.hud.hintFull(false);});
 for(const width of [800,960,1440])for(const theme of ['city','powerworld']){
  await page.setViewportSize({width,height:900});
  rows.push(await page.evaluate(({theme})=>{
   const {game:g,hud:h}=LSW;g.startMode('powerworld',{p1:'sarge',p2:'kano'});h.setPlayer(g.player.def);h.update();
   document.body.classList.toggle('powerworld',theme==='powerworld');
   h.el.charge.style.display='block';h.el.chargeI.style.width='60%';h.el.hands.style.display='flex';
   const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const boxes={slots:box(h.el.slots),hands:box(h.el.hands),charge:box(h.el.charge),player:box(h.el.plPanel),city:box(h.el.city)};
   const pairs=[['slots','hands'],['slots','charge'],['hands','charge'],['slots','player'],['city','slots'],['city','player']];
   const overlaps=pairs.filter(([a,b])=>{a=boxes[a];b=boxes[b];return a.width&&b.width&&a.height&&b.height&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;});
   return {theme,width:innerWidth,boxes,overlaps,columns:getComputedStyle(h.el.slots).gridTemplateColumns.split(' ').length};
  },{theme}));
  await page.screenshot({path:`${out}/${theme}-${width}.png`});
 }
 await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({rows,errors},null,2));
 assert.deepEqual(errors,[]);assert.ok(rows.every(r=>r.overlaps.length===0),'Trigger, hands, charge and player panels must not overlap');
 assert.equal(rows.find(r=>r.theme==='powerworld'&&r.width===800).columns,3,'Preserve the established narrow desktop kit layout');
}finally{await browser.close();}
