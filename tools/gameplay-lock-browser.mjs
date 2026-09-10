import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/beam-pressure/gameplay-lock';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);
 await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game,w=g.world,T=LSW.THREE,update=g.update.bind(g);g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.controlBot=()=>{};g.fov=false;
  // The deterministic simulation owns input consumption. The shell RAF must
  // not erase real key edges between browser automation and this clock step.
  const endFrame=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};
  const p=g.player,t=g.entities.find(f=>f!==p&&!f.isDummy);window.lockFoe=t;
  for(const f of g.entities)if(f!==p){f.ai=null;f.pos.set(800,140,800);}
  window.lockStep=()=>{update(1/60);endFrame();return {locked:g.hardLock===t,cross:getComputedStyle(g.hud.el.cross).visibility};};
  window.lockPlace=angle=>{
   g.hardLock=null;endFrame();p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.invuln=100;
   t.phase=false;t._vis=1;t.pos.set(800,140,800);t.vel.set(0,0,0);t.flying=true;t.gait='airborne';t.invuln=100;
   w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.snapChase();
   for(let i=0;i<60;i++)lockStep();
   const dir=new T.Vector3();w.camera.getWorldDirection(dir);dir.applyAxisAngle(new T.Vector3(0,1,0),angle*Math.PI/180);
   t.pos.copy(w.camera.position).addScaledVector(dir,110);t.pos.y-=5.2;t.obj.position.copy(t.pos);
  };
 });
 const press=async()=>{await page.keyboard.down('t');const result=await page.evaluate(()=>lockStep());await page.keyboard.up('t');await page.evaluate(()=>lockStep());return result;};
 const rows=[];
 await page.evaluate(()=>lockPlace(20));rows.push({case:'off-crosshair',...await press()});assert.equal(rows.at(-1).locked,false);
 await page.evaluate(()=>lockPlace(0));rows.push({case:'acquire',...await press()});assert.equal(rows.at(-1).locked,true);
 await page.screenshot({path:`${out}/locked.png`});
 rows.push({case:'release',...await press()});assert.equal(rows.at(-1).locked,false);
 await page.evaluate(()=>lockPlace(0));await press();await page.evaluate(()=>{lockFoe.phase=true;});
 rows.push({case:'phase-break',...await page.evaluate(()=>lockStep())});assert.equal(rows.at(-1).locked,false);assert.equal(rows.at(-1).cross,'visible');
 await page.screenshot({path:`${out}/released.png`});
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByRole('tab',{name:'Attacks',exact:true}).click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('lmb');
 const toggle=page.getByLabel('Pierce fighters (otherwise stops on impact)',{exact:true});assert.equal(await toggle.isChecked(),false);
 await toggle.check();assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.slots.lmb.def.pierceFighters),true);
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await toggle.isChecked(),false);
 await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await toggle.isChecked(),true);
 await page.screenshot({path:`${out}/editor.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/results.json`,JSON.stringify({rows,editor:{native:true,undo:true,redo:true},errors},null,2));console.log(JSON.stringify({rows,editor:'passed',errors}));
}finally{await browser.close();}
