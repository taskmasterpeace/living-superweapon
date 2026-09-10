import {collectFootage,FootageTransport} from './field-footage.js';
import {esc} from './hudUtil.js';
import './field-footage.css';

const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
// One decoder, one timer, only while the selection screen is visible. No second WebGL render.
export function createFieldFootage(game){
 const el=document.createElement('section');el.className='field-footage';el.setAttribute('aria-label','KMK 9 field footage');
 const transport=new FootageTransport();let clips=[],timer=null,last=0,loaded='',wanted='',img=null,decoded='',refreshAt=0,drawn='',focusBefore=null,backdrop=null;
 el.innerHTML=`<header><span class="ff-station">9 <span>KMK</span></span><div><b>FIELD FOOTAGE</b><small>Your fight. Their angle.</small></div><span class="ff-count">0 CLIPS</span></header>
  <button class="ff-screen" aria-label="Expand field footage"><canvas width="640" height="360"></canvas><span class="ff-empty">NO FOOTAGE YET<small>The field crew captures major hits and knockouts.<br>Return here after combat to watch.</small></span><span class="ff-bug">KMK 9 · REPLAY</span><span class="ff-expand">⛶ EXPAND</span></button>
  <div class="ff-caption"><strong>Awaiting field report</strong><small class="ff-meta">Recorded in this browser session</small></div>
  <div class="ff-seek"><input type="range" min="0" max="0" value="0" step="1" aria-label="Scrub footage"><output>0:00 / 0:00</output></div>
  <div class="ff-controls"><button data-action="previous" aria-label="Previous clip" title="Previous clip">‹</button><button data-action="play" aria-label="Pause footage">Ⅱ</button><button data-action="next" aria-label="Next clip" title="Next clip">›</button><select aria-label="Playback speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select><button data-action="loop" aria-pressed="true" title="Loop current clip">Loop</button><button data-action="save" title="Save the displayed frame as a PNG">Save still</button><button data-action="close" class="ff-close" aria-label="Close expanded footage">Close ×</button></div>
  <div class="ff-list" aria-label="Recorded clips"></div><footer>Silent camera footage · Session only <span>Space: play/pause · ← →: seek</span></footer>`;
 const $=s=>el.querySelector(s),cv=$('canvas'),ctx=cv.getContext('2d'),range=$('input'),empty=$('.ff-empty');
 function resetImage(){img=null;loaded='';decoded='';wanted='';drawn='';ctx.clearRect(0,0,cv.width,cv.height);}
 function choose(c){transport.select(c||null);resetImage();refreshList();sync();}
 function refreshList(){
  $('.ff-count').textContent=`${clips.length} CLIP${clips.length===1?'':'S'}`;
  $('.ff-list').innerHTML=clips.map((c,i)=>`<button data-clip="${i}" aria-pressed="${c===transport.clip}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(c.title||'Field report')}</b><small>${esc(c.tag||'REPORT')} · ${clock(c.frames.length/(c.fps||12))}</small></button>`).join('');
  for(const b of el.querySelectorAll('[data-clip]'))b.onclick=()=>choose(clips[+b.dataset.clip]);
 }
 function refresh(){
  const next=collectFootage(game),changed=next.length!==clips.length||next.some((c,i)=>c!==clips[i]);clips=next;
  if(!clips.includes(transport.clip))choose(clips[0]);else if(changed)refreshList();
 }
 function sync(){
  const c=transport.clip,has=!!c;
  $('.ff-caption strong').textContent=c?.title||'Awaiting field report';
  $('.ff-meta').textContent=c?`${c.tag?.toUpperCase()||'REPORT'} · T+${c.tLabel||'0:00'} · ${c.shotBy||'Field camera'}`:'Recorded in this browser session';
  range.max=String(Math.max(0,(c?.frames.length||1)-1));range.value=String(Math.floor(transport.frame));range.disabled=!has;
  $('output').textContent=`${clock(transport.frame/transport.fps)} / ${clock(transport.duration)}`;
  const play=$('[data-action="play"]');play.textContent=transport.playing?'Ⅱ':'▶';play.setAttribute('aria-label',transport.playing?'Pause footage':'Play footage');
  for(const name of ['play','save','loop'])$(`[data-action="${name}"]`).disabled=!has||(name==='save'&&!decoded);
  for(const name of ['previous','next'])$(`[data-action="${name}"]`).disabled=clips.length<2;
  $('.ff-screen').disabled=!has;
 }
 function tick(){
  const now=performance.now(),dt=Math.min(.15,(now-last)/1000);last=now;
  if(document.hidden||!el.isConnected)return;
  if(now-refreshAt>400){refreshAt=now;refresh();}
  if(decoded)transport.advance(dt);
  const c=transport.clip,frame=Math.floor(transport.frame);wanted=c&&!c._dead?c.frames[frame]:'';
  if(wanted&&wanted[0]!=='#'&&wanted!==loaded){
   // Do not abort a pending decoder every timer tick. A late JPEG gets a chance to finish.
   if(!img||img.complete){
    const candidate=new Image();img=candidate;loaded=wanted;
    candidate.onload=()=>{if(img===candidate){decoded=loaded;}};
    candidate.onerror=()=>{if(img===candidate){decoded='';loaded='';img=null;}};
    candidate.src=loaded;
   }
  }
  if(img?.complete&&img.naturalWidth&&decoded&&drawn!==decoded){ctx.drawImage(img,0,0,cv.width,cv.height);drawn=decoded;}
  empty.hidden=!!drawn;
  if(!drawn)empty.innerHTML=c?'PROCESSING FOOTAGE<small>Waiting for captured frames…</small>':'NO FOOTAGE YET<small>The field crew captures major hits and knockouts.<br>Return here after combat to watch.</small>';
  sync();
 }
 function step(n){const i=clips.indexOf(transport.clip);choose(clips[(i+n+clips.length)%clips.length]);}
 function collapse(){backdrop?.remove();backdrop=null;el.classList.remove('expanded');el.removeAttribute('role');el.removeAttribute('aria-modal');focusBefore?.focus();focusBefore=null;}
 $('.ff-screen').onclick=()=>{if(el.classList.contains('expanded'))return;focusBefore=document.activeElement;backdrop=document.createElement('div');backdrop.className='ff-backdrop';backdrop.onclick=collapse;el.parentElement.appendChild(backdrop);el.classList.add('expanded');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');$('[data-action="close"]').focus();};
 $('[data-action="close"]').onclick=collapse;
 $('[data-action="previous"]').onclick=()=>step(-1);$('[data-action="next"]').onclick=()=>step(1);
 $('[data-action="play"]').onclick=()=>{transport.playing=!transport.playing;sync();};
 $('[data-action="loop"]').onclick=e=>{transport.loop=!transport.loop;e.currentTarget.setAttribute('aria-pressed',String(transport.loop));};
 $('select').onchange=e=>{transport.rate=+e.target.value;};
 range.oninput=()=>{transport.seek(+range.value);transport.playing=false;tick();};
 $('[data-action="save"]').onclick=()=>{if(!drawn)return;const a=document.createElement('a');a.download=`KMK9-${(transport.clip?.tag||'field').replace(/[^a-z0-9-]/gi,'')}-${Math.floor(transport.frame)}.png`;a.href=cv.toDataURL('image/png');a.click();};
 el.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&el.classList.contains('expanded')){e.preventDefault();e.stopPropagation();collapse();return;}
  if(e.code==='Tab'&&el.classList.contains('expanded')){
   const all=[...el.querySelectorAll('button:not(:disabled),select,input:not(:disabled)')].filter(n=>n.getClientRects().length),i=all.indexOf(document.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&i===all.length-1){e.preventDefault();all[0]?.focus();}e.stopPropagation();return;
  }
  if(e.code==='Tab'){e.stopPropagation();return;} // Tab navigates this player, never resumes combat.
  if(['INPUT','SELECT'].includes(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();e.stopPropagation();transport.playing=!transport.playing;sync();}
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();e.stopPropagation();transport.seek(transport.frame+(e.code==='ArrowRight'?1:-1)*transport.fps);transport.playing=false;tick();}
 });
 return {el,open(){refresh();last=performance.now();if(!timer)timer=setInterval(tick,50);tick();},close(){clearInterval(timer);timer=null;collapse();resetImage();}};
}
