import {prepareHeroSurfaces} from './hero-materials.js';
import {configureShieldSurface} from './shield-surface.js';
import {CombatWarmup} from './combat-warmup.js';

const delay=()=>new Promise(resolve=>setTimeout(resolve,10));
const clock=()=>performance.now();

// Three r169's compileAsync polls material.currentProgram. A stage can be
// disposed while loading, so poll a snapshot of programs with cancellation
// checked BEFORE every GL query instead. Retain normal shader diagnostics.
export async function warmFrontlinePrograms(world,newsCamera,{cancelled=()=>false,wait=delay,now=clock,timeout=45000}={}){
 const r=world.renderer,start=now(),target=r.getRenderTarget(),cube=r.getActiveCubeFace(),mip=r.getActiveMipmapLevel();
 const sun=world.sun,shadow=sun?.castShadow;
 for(const castShadow of [true,false])for(const [destination,camera]of [[world.composer?.renderTarget1||null,world.camera],[null,newsCamera||world.camera]]){
  if(cancelled())return false;
  let programs;
  try{
   if(sun)sun.castShadow=castShadow;
   r.setRenderTarget(destination);r.compile(world.scene,camera);
   programs=[...r.info.programs];
  }finally{r.setRenderTarget(target,cube,mip);if(sun)sun.castShadow=shadow;}
  for(;;){
   if(cancelled())return false;
   if(programs.every(program=>program.isReady()))break;
   if(now()-start>timeout)throw Error('Graphics preparation timed out. Return to the menu and retry.');
   await wait();
  }
  // Resolve uniform/attribute caches only after linking has completed. This
  // keeps first-use validation out of the combat and reporter-camera frames.
  for(const program of programs){
   if(cancelled())return false;
   program.getUniforms();program.getAttributes();
   if(program.diagnostics?.runnable===false)throw Error('A battlefield shader could not compile.');
  }
 }
 return true;
}

function loadingUI(cancel){
 if(typeof document==='undefined')return{update(){},destroy(){}};
 const root=document.createElement('div');root.id='frontlinePreparing';root.setAttribute('role','dialog');root.setAttribute('aria-label','Preparing battlefield');
 root.style.cssText='position:fixed;inset:0;z-index:15000;display:grid;place-items:center;background:oklch(.18 .018 75);color:oklch(.94 .025 80);font:14px Inter,system-ui,sans-serif;';
 root.innerHTML='<section style="width:min(360px,80vw);padding:24px;border:1px solid oklch(.38 .045 80);border-radius:10px;background:oklch(.22 .025 75)"><div style="color:oklch(.8 .14 80);font-size:11px;letter-spacing:.14em">HERO ON THE FRONT LINE</div><h2 style="font-size:24px;letter-spacing:-.025em;margin:16px 0 12px">Preparing the battlefield</h2><p role="status" aria-live="polite" style="color:oklch(.75 .025 80);line-height:1.6;min-height:45px"></p><button type="button" style="border:1px solid oklch(.43 .045 80);border-radius:10px;background:transparent;color:inherit;padding:10px 14px;cursor:pointer;transition:background .2s">Return to menu</button></section>';
 const button=root.querySelector('button');button.onclick=cancel;
 button.onmouseenter=()=>button.style.background='oklch(.32 .035 80)';button.onmouseleave=()=>button.style.background='transparent';
 document.body.append(root);
 return{update:text=>root.querySelector('[role=status]').textContent=text,destroy:()=>root.remove()};
}

export function prepareFrontline(stage,{ui=loadingUI,...options}={}){
 const game=stage.g,r=game.world.renderer;
 if(!r?.compile||!r.info?.programs)return null;
 game._frontlinePreparing?.cancel();
 const group=stage.group;
 const task={status:'assets',error:null,cancelled:false,cancel(){
  this.cancelled=true;this.status='cancelled';screen.destroy();
  if(game._frontlinePreparing===this)game._frontlinePreparing=null;
 }};
 const screen=ui(()=>game.hud?.onMenu?.());
 stage.preparation=task;stage.frontlineReady=false;game._frontlinePreparing=task;
 const cancelled=()=>task.cancelled||stage.group!==group||game._frontlinePreparing!==task;
 const set=(status,text)=>{task.status=status;screen.update(text);};
 screen.update('Loading terrain, aircraft and equipment…');
 task.promise=Promise.resolve().then(async()=>{
  await Promise.all([stage.frontlineLoading,stage.outpostLoading,stage.aircraft?.loading,stage.convoy?.loading,game.ms?.frontline?.equipmentLoading,...(game.entities||[]).map(f=>f._soldierEquipmentLoading),
   prepareHeroSurfaces((game.entities||[]).map(entity=>entity.obj),{retry:true})]);
  if(cancelled())return false;
  const error=stage.frontlineError||stage.outpostError||stage.aircraft?.error||stage.convoy?.error||game.ms?.frontline?.equipmentError||(game.entities||[]).find(f=>f._soldierEquipmentError)?._soldierEquipmentError;if(error)throw Error(String(error));
  set('shaders','Preparing graphics and the field camera. Combat starts when both views are ready.');
  for(const fighter of game.entities||[])configureShieldSurface(fighter);
  if(stage.group?.isObject3D&&!stage.combatWarmup)stage.combatWarmup=new CombatWarmup(stage.group);
  const ready=await warmFrontlinePrograms(game.world,game.news?.cam,{...options,cancelled});
  if(!ready||cancelled())return false;
  set('upload','Uploading surfaces and preparing shadows…');
  // compile() does not upload texture pixels, render shadow-depth materials or
  // execute postprocessing. Their first real draws also belong behind the gate.
  // Do not call Game.update/World.render here: simulation, adaptive quality and
  // environmental clocks must not advance just to prepare graphics.
  const wait=options.wait||delay;
  for(const draw of [()=>game.world.composer?.render?.(),()=>{
   if(game.news?._renderPOV){game.news._renderPOV(null);game.news._warmed=true;}
  },()=>game.world.composer?.render?.()]){
   await wait();if(cancelled())return false;
   draw();if(cancelled())return false;
  }
  // Give the browser a chance to present the loading UI and service input
  // before publishing readiness; do not count loading as a gameplay frame.
  await wait();if(cancelled())return false;
  game.world._lastRender=null;
  stage.frontlineReady=true;task.status='ready';game._frontlinePreparing=null;screen.destroy();return true;
 }).catch(error=>{
  if(cancelled())return false;
  task.error=error.message;set('error',error.message);game.reportError?.(error,'frontline preparation');return false;
 });
 return task;
}
