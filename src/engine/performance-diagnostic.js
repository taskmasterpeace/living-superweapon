// On-demand diagnostic; never changes simulation or graphics quality.
export function summarizeFrameTimes(rows){
 const valid=rows.filter(r=>Number.isFinite(r.dt)&&r.dt>0),visible=valid.filter(r=>!r.hidden),times=visible.map(r=>r.dt).sort((a,b)=>a-b);
 return {frames:times.length,hiddenFrames:valid.length-visible.length,fps:times.length?1000*times.length/times.reduce((a,b)=>a+b,0):null,
  p95Ms:times[Math.min(times.length-1,Math.floor(times.length*.95))]??null,worstMs:times.at(-1)??null};
}
export function measureMethod(object,key,rows,now=()=>performance.now()){
 const original=object?.[key];if(typeof original!=='function')return ()=>{};
 function measured(...args){const start=now();try{return original.apply(this,args);}finally{if(rows.length<10000)rows.push(now()-start);}}
 object[key]=measured;return ()=>{if(object[key]===measured)object[key]=original;};
}

export function capturePerformance(game,hud,duration=8000){
 if(game._performanceCapture)return game._performanceCapture;
 const promise=new Promise(resolve=>{
  const rows=[],sections={game:[],render:[],hud:[],news:[]},restore=[],world=game.world;
  const start=performance.now();let last=0,raf,done=false,previousHidden=document.hidden;
  for(const [object,key,label] of [[game,'update','game'],[world,'render','render'],[hud,'update','hud'],[game.news,'update','news']])restore.push(measureMethod(object,key,sections[label]));
  function sample(now){const hidden=document.hidden;if(last)rows.push({dt:now-last,hidden:hidden||previousHidden});last=now;previousHidden=hidden;
   if(!done&&rows.length<10000)raf=requestAnimationFrame(sample);
  }
  raf=requestAnimationFrame(sample);
  setTimeout(()=>{
   done=true;cancelAnimationFrame(raf);for(const stop of restore)stop();
   let gpu='unavailable';try{const gl=world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');gpu=gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER);}catch{/* diagnosis cannot break the frame */}
   const report={...summarizeFrameTimes(rows),wallMs:performance.now()-start,gpu,quality:world._qTier,qualityOverride:world.qualityOverride??null,
    canvas:[world.renderer.domElement.width,world.renderer.domElement.height],pixelRatio:world.renderer.getPixelRatio(),
    running:game.running,preparing:!!game._frontlinePreparing,mode:game.modeId,entities:game.entities?.length,
    sections:Object.fromEntries(Object.entries(sections).map(([key,values])=>{values.sort((a,b)=>a-b);return [key,{calls:values.length,meanMs:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,p95Ms:values[Math.floor(values.length*.95)]??0,maxMs:values.at(-1)??0}];}))};
   resolve(report);
  },Math.max(1000,Math.min(15000,duration)));
 });
 game._performanceCapture=promise;
 promise.finally(()=>{if(game._performanceCapture===promise)game._performanceCapture=null;});
 return promise;
}
