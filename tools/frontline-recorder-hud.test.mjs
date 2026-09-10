import test from 'node:test';
import assert from 'node:assert/strict';
import {HUD} from '../src/engine/hud.js';
test('field camera indicator reports actual recording, saved clips, pause and venue exit',()=>{
 const label={textContent:''},el={hidden:true,dataset:{},querySelector:()=>label},hud={titleOpen:false,el:{fieldRecorder:el,paused:{style:{}}}};
 const game={modeId:'powerworld',running:true,news:{enabled:true,clips:[],rec:null}};
 const update=()=>HUD.prototype.updateFieldRecorder.call(hud,game);
 update();assert.equal(el.hidden,false);assert.equal(label.textContent,'FIELD CAM');
 game.news.rec={tag:'bighit'};update();assert.equal(el.dataset.state,'recording');assert.equal(label.textContent,'REC');
 // Escape, pad Start and blur stop game.running and call HUD.setPaused.
 game.running=false;HUD.prototype.setPaused.call(hud,true);update();
 assert.equal(el.hidden,false);assert.equal(el.dataset.state,'paused');assert.equal(label.textContent,'CAM PAUSED');
 assert.equal(hud.el.paused.style.display,'flex');
 hud.titleOpen=true;update();assert.equal(el.hidden,true,'opening the roster/menu hides even a paused recording');
 hud.titleOpen=false;game.running=true;HUD.prototype.setPaused.call(hud,false);update();
 assert.equal(el.hidden,false);assert.equal(el.dataset.state,'recording');assert.equal(label.textContent,'REC');
 assert.equal(hud.el.paused.style.display,'none');
 game.running=false;update();assert.equal(el.hidden,true,'stopped without the native pause overlay is not a paused recording');
 game.running=true;game.news.rec=null;game.news.clips=[{frames:['a']}];update();assert.equal(label.textContent,'1 CLIP');
 game.news.clips.push({frames:['b']});update();assert.equal(label.textContent,'2 CLIPS');
 game.modeId='freeroam';update();assert.equal(el.hidden,true);
 game.modeId='powerworld';game.news.enabled=false;update();assert.equal(el.hidden,true);
 game.news.enabled=true;game.matchOver=true;update();assert.equal(el.hidden,true);
});

test('returning directly from a paused menu cannot leave a running recorder labeled paused',()=>{
 const label={textContent:''},el={hidden:false,dataset:{},querySelector:()=>label},hud={titleOpen:false,el:{fieldRecorder:el,paused:{style:{}}}};
 const game={modeId:'powerworld',running:false,news:{enabled:true,clips:[],rec:{tag:'bighit'}}};
 HUD.prototype.setPaused.call(hud,true);
 hud.titleOpen=true;HUD.prototype.updateFieldRecorder.call(hud,game);assert.equal(el.hidden,true);
 // Tab/menu return sets running directly; the cached pause notification can be stale.
 hud.titleOpen=false;game.running=true;HUD.prototype.updateFieldRecorder.call(hud,game);
 assert.equal(el.hidden,false);assert.equal(el.dataset.state,'recording');assert.equal(label.textContent,'REC');
});
