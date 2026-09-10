// Clip events: how they are derived at build time and how a runtime would fire them exactly once
// regardless of frame rate. Nothing here applies damage or spends resources; an event is a time.

// ---- derivation (build time, deterministic, from take analysis rows) ----
// rules: foot-contact (per side) · hand-speed-peak (hand R/L) · support-hand-leave / support-hand-return
export function deriveEvents(spec,analysis,duration,legLength,{loop=false}={}){
 const out=[];
 for(const raw of spec||[]){
  const e={...raw,loop};
  if(typeof e.t==='number'){out.push({t:+e.t.toFixed(4),type:e.type,...(e.side?{side:e.side}:{}),note:e.note||'authored'});continue;}
  const {rows}=analysis;
  switch(e.derive){
   case 'foot-contact':{
    for(const side of e.side?[e.side]:['L','R']){
     const h=r=>r['foot'+side],v=r=>r['foot'+side+'Speed'];
     const contact=legLength*.03,slow=legLength*1.2; // within 3% leg length of rest support, foot nearly still
     // A loop is scanned twice and only the second pass is kept, so a foot already planted at
     // t=0 (the tail of the previous cycle's strike) does not fire again at the wrap.
     const passes=e.loop?2:1;let armed=true;
     for(let pass=0;pass<passes;pass++)for(let i=0;i<rows.length;i++){
      const down=h(rows[i])<contact&&v(rows[i])<slow;
      if(down&&armed){if(pass===passes-1)out.push({t:+rows[i].t.toFixed(4),type:e.type||'footstep',side,note:'derived:foot-contact'});armed=false;}
      if(!down&&h(rows[i])>contact*3)armed=true;
     }
    }
    break;
   }
   case 'hand-speed-peak':{
    const key='hand'+(e.hand||'R')+'Speed';let best=0;
    for(let i=1;i<rows.length;i++)if(rows[i][key]>rows[best][key])best=i;
    out.push({t:+rows[best].t.toFixed(4),type:e.type,side:e.hand||'R',note:'derived:hand-speed-peak'});
    break;
   }
   case 'support-hand-leave':case 'support-hand-return':{
    // Hands together = gripping the weapon. Leave = first time the gap opens past the threshold
    // after the opening grip; return = last time it closes back under it.
    const gap=rows.map(r=>r.handGap),base=Math.min(...gap.slice(0,Math.max(2,Math.floor(rows.length*.1)))),open=base+.35;
    let idx=-1;
    if(e.derive==='support-hand-leave'){for(let i=0;i<rows.length;i++)if(gap[i]>open){idx=i;break;}}
    else{for(let i=rows.length-1;i>=0;i--)if(gap[i]>open){idx=Math.min(rows.length-1,i+1);break;}}
    if(idx<0)throw new Error(`event ${e.type}: support hand never leaves the weapon in this take`);
    out.push({t:+rows[idx].t.toFixed(4),type:e.type,side:'L',note:`derived:${e.derive}`});
    break;
   }
   default:throw new Error(`unknown event derivation "${e.derive}" for ${e.type}`);
  }
 }
 out.sort((a,b)=>a.t-b.t||a.type.localeCompare(b.type));
 for(const ev of out)if(ev.t<0||ev.t>duration+1e-9)throw new Error(`event ${ev.type} at ${ev.t}s falls outside the ${duration}s clip`);
 return out;
}

// ---- playback (runtime proposal) ----
// Tracks a clip's time and reports which events were crossed between two times. Half-open
// intervals (prev, now] make a 30/60/120 Hz step sequence fire each event exactly once; loops
// wrap by counting whole cycles; a reset() re-arms for replay; interrupt() drops the rest.
export class ClipEventTracker{
 constructor(clip){this.clip=clip;this.events=[...(clip.events||[])].sort((a,b)=>a.t-b.t);this.time=0;this.cycle=0;this.fired=new Set();this.active=true;this.started=false;}
 reset(time=0){this.time=time;this.cycle=0;this.fired.clear();this.active=true;this.started=false;}
 interrupt(){this.active=false;}
 // Advance by dt seconds; returns the events crossed, each once per cycle. The very first
 // advance includes t=0 itself, so an event authored at the clip start fires once.
 advance(dt){
  if(!this.active||!(dt>0))return [];
  const d=this.clip.duration,prev=this.started?this.time:this.time-1e-9;this.started=true;let now=this.time+dt;const crossed=[];
  if(this.clip.loop){
   while(now>=d){this._collect(prev,d,crossed,true);this.cycle++;this.fired.clear();now-=d;this._prevWrapped=true;}
   this._collect(this._prevWrapped?-1e-9:prev,now,crossed,false);this._prevWrapped=false;
  }else{
   now=Math.min(now,d);this._collect(prev,now,crossed,true);
  }
  this.time=now;return crossed;
 }
 _collect(from,to,into,inclusiveEnd){
  for(const e of this.events){
   const key=e.type+'@'+e.t+(e.side||'');
   if(this.fired.has(key))continue;
   const hit=e.t>from&&(inclusiveEnd?e.t<=to:e.t<=to);
   if(hit){this.fired.add(key);into.push({...e,cycle:this.cycle});}
  }
 }
 // Hand this tracker's progress to a replacement clip instance (a form swap) without refiring.
 transferTo(next){next.time=this.time;next.cycle=this.cycle;next.fired=new Set(this.fired);next.active=this.active;next.started=this.started;return next;}
}
