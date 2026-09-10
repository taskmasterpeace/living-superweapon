import {SOUND_CUES} from '../data/sound-library.js';
import {SPEAKER_PROFILES} from '../core/sound-library.js';
import './sound-library.css';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function mountSoundLibrary({host,backend,onOpen=()=>{}}){
 const library=backend.soundLibrary,button=document.createElement('button');button.id='open-sound-library';button.textContent='Sound Library';host.append(button);
 const dialog=document.createElement('dialog');dialog.className='sound-library';dialog.setAttribute('aria-label','Sound Library');document.body.append(dialog);
 dialog.innerHTML=`<header class="sl-header"><div><span class="sl-eyebrow">POWERWORLD / AUDIO WORKSHOP</span><h2>Sound Library</h2><p>Audible sketches. Your recordings. One native mixer.</p></div><button data-action="close" aria-label="Close Sound Library">Close</button></header>
 <div class="sl-summary"></div><div class="sl-browser"><nav class="sl-nav" aria-label="Sound cues"><input type="search" aria-label="Search sound cues" placeholder="Search cues or dialogue…"><select aria-label="Sound family"><option value="">All families</option>${[...new Set(SOUND_CUES.map(c=>c.family))].map(f=>`<option>${f}</option>`).join('')}</select><select aria-label="Cue wiring"><option value="">All wiring states</option><option value="native-replacement">Native replacement</option><option value="preview-only">Preview-only</option></select><div class="sl-list"></div></nav><section class="sl-detail" aria-label="Selected sound cue"></section></div>
 <footer class="sl-footer"><button data-action="export">Export library + audio</button><label class="button">Import library<input type="file" accept="application/json,.json" aria-label="Import sound library" hidden></label><button data-action="brief">Export generation briefs</button><p class="sl-status" role="status">Play starts audio after your gesture. Recordings stay local; maximum 1 MiB each, 30 seconds, 4 MiB package.</p></footer>`;
 const $=s=>dialog.querySelector(s);let selected='light',busy=false;
 const status=(message,error=false)=>{$('.sl-status').textContent=message;$('.sl-status').classList.toggle('sl-error',error);};
 const describeSource=id=>library.source(id)==='chosen-recording'?`Chosen recording · ${library.state.bindings[id].name}`:'Synthesized placeholder · nonverbal';
 function rows(){
  const query=$('[type=search]').value.toLowerCase(),family=$('[aria-label="Sound family"]').value,wiring=$('[aria-label="Cue wiring"]').value;
  const cues=SOUND_CUES.filter(c=>(!family||c.family===family)&&(!wiring||c.wiring===wiring)&&`${c.label} ${c.id} ${c.line||''}`.toLowerCase().includes(query));
  $('.sl-list').innerHTML=cues.map(c=>`<button data-cue="${c.id}" aria-pressed="${c.id===selected}"><b>${esc(c.label)}</b><small>${esc(c.family)} / ${esc(c.phase)} · ${c.wiring==='native-replacement'?'NATIVE REPLACEMENT':'PREVIEW-ONLY'}</small><span>${library.state.bindings[c.id]?'Recording attached':'Placeholder ready'}</span></button>`).join('')||'<p>No matching cues.</p>';
  $('.sl-summary').textContent=`${SOUND_CUES.length} playable cues · ${Object.keys(library.state.bindings).length} chosen recordings · ${SOUND_CUES.filter(c=>c.wiring==='native-replacement').length} native replacement routes · remaining cues preview-only`;
 }
 function details(){
  const c=SOUND_CUES.find(c=>c.id===selected),s=library.state.settings[c.id]||{},b=library.state.bindings[c.id];
  $('.sl-detail').innerHTML=`<span class="sl-wiring ${c.nativeMethod?'sl-native':''}">${c.nativeMethod?'NATIVE REPLACEMENT · '+esc(c.nativeMethod):'PREVIEW-ONLY · NOT CONNECTED TO GAMEPLAY'}</span><h3>${esc(c.label)}</h3><code>${esc(c.id)}</code><p>${esc(c.nativeNote||'This planned cue can be auditioned here. Its dedicated gameplay event is not connected.')}</p>
  ${c.line?`<blockquote>“${esc(c.line)}”</blockquote><p class="sl-warning">Placeholder is a nonverbal vocal marker. It does not speak these words.</p>`:''}
  <h4>Generation direction</h4><p>${esc(c.generationPrompt)}</p><dl><dt>Event / phase</dt><dd>${esc(c.event)} / ${esc(c.phase)}</dd><dt>Timing</dt><dd>${esc(c.timing||'At the accepted event; stop sustained cues when the event ends.')}</dd><dt>Guide</dt><dd>${c.duration}s · ${c.loop?'seamless loop':'one-shot'} · ${c.bus} bus · ${c.spatial}</dd><dt>Limits</dt><dd>${c.cooldown}s SFX gap · ${c.concurrency} concurrent</dd></dl>
  <div class="sl-source"><strong>${esc(describeSource(c.id))}</strong><label>Playback source<select aria-label="Sound playback source"><option value="placeholder" ${s.source==='placeholder'||!b?'selected':''}>Synthesized placeholder</option><option value="chosen" ${b&&s.source!=='placeholder'?'selected':''} ${b?'':'disabled'}>Chosen recording</option></select></label><label class="button">Choose local recording<input type="file" accept="audio/*" aria-label="Choose local sound recording" hidden></label><button data-action="remove" ${b?'':'disabled'}>Remove recording</button><small>Selection and gain persist. Native contact uses the chosen recording; placeholder selection restores its existing game sound. Reload an already open PowerWorld page to load changed recordings.</small></div>
  <div class="sl-controls"><button data-action="play" class="primary">Play cue</button><button data-action="stop">Stop cue</button><label>Gain <input aria-label="Sound gain" type="range" min="0" max="1" step=".01" value="${s.gain??c.gain}"></label><label><input aria-label="Loop sound cue" type="checkbox" ${(s.loop??c.loop)?'checked':''}> Loop audition</label></div>
  ${c.line?`<details open><summary>Speech suppression diagnostics</summary><p>8s global gap · ${c.lineCooldown}s same line · ${c.categoryCooldown}s category · ${c.expiry}s event expiry · priority ${c.priority}. No immediate repeat. SFX use their own limits.</p><label>Speaker <select aria-label="Dialogue speaker">${Object.entries(SPEAKER_PROFILES).map(([id,p])=>`<option value="${id}">${id} / ${p.speakerCooldown}s cooldown</option>`).join('')}</select></label><button data-action="speech">Dispatch current event</button><button data-action="stale">Dispatch expired event</button><p class="sl-diagnostics" role="log">No speech event evaluated.</p></details>`:'<p class="sl-diagnostics" role="log">Audition bypasses event cooldown; gameplay contact respects its own cadence.</p>'}`;
 }
 const refresh=()=>{rows();details();};
 async function enable(){backend.init();if(!backend.ok)throw Error('Audio could not start');await library.ready();}
 async function act(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message,true);}finally{busy=false;}}
 button.onclick=()=>{onOpen();refresh();dialog.showModal();status(library.error||'Choose a cue, then Play. Preview-only labels identify sounds that are not connected to gameplay.');};
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 dialog.addEventListener('close',()=>library.stop());
 dialog.addEventListener('cancel',()=>library.stop());
 dialog.addEventListener('input',e=>{if(e.target.matches('[type=search]'))rows();});
 dialog.addEventListener('change',e=>act(async()=>{
  if(e.target.matches('[aria-label="Sound family"],[aria-label="Cue wiring"]')){rows();return;}
  if(e.target.matches('[aria-label="Choose local sound recording"]')){const file=e.target.files[0];if(!file)return;await enable();await library.bindRecording(selected,file);refresh();status(`Saved ${file.name}. This recording is included in library exports.`);}
  if(e.target.matches('[aria-label="Import sound library"]')){const file=e.target.files[0];if(!file)return;if(file.size>4*1024*1024)throw Error('Package exceeds 4 MiB');await enable();await library.importPackage(await file.text());refresh();status('Library imported, decoded and saved locally.');}
  if(e.target.matches('[aria-label="Sound playback source"]')){library.setSettings(selected,{source:e.target.value});details();status(describeSource(selected));}
  if(e.target.matches('[aria-label="Sound gain"]'))library.setSettings(selected,{gain:Number(e.target.value)});
  if(e.target.matches('[aria-label="Loop sound cue"]'))library.setSettings(selected,{loop:e.target.checked});
 }));
 dialog.addEventListener('click',e=>act(async()=>{
  const row=e.target.closest('[data-cue]');if(row){library.stop();selected=row.dataset.cue;refresh();return;}
  switch(e.target.closest('[data-action]')?.dataset.action){
   case 'close':dialog.close();break;
   case 'play':await enable();{const h=library.audition(selected);status(h?`Playing ${describeSource(selected)}${h.loop?' · loop until Stop':''}`:'Audio is muted or unavailable.');}break;
   case 'stop':library.stop();status('Stopped. All library voices are fading out.');break;
   case 'export':download(library.exportPackage(),'powerworld-sound-library.json');status('Portable library exported with embedded chosen recordings.');break;
   case 'brief':download(library.exportBrief(),'powerworld-sound-generation-briefs.json');status('Generation briefs exported. No generation service was called.');break;
   case 'remove':if(confirm('Remove this local recording? Existing exported packages keep a recoverable copy.')){library.removeRecording(selected);refresh();status('Recording removed locally. Prior exported packages can restore it.');}break;
   case 'speech':case 'stale':{
    await enable();const c=SOUND_CUES.find(c=>c.id===selected),now=performance.now()/1000,eventTime=e.target.dataset.action==='stale'?now-10:now,decision=library.eventGate(selected,{speaker:$('[aria-label="Dialogue speaker"]').value,now,eventTime,event:c.event});
    $('.sl-diagnostics').textContent=`${decision.accepted?'ACCEPTED':'SUPPRESSED'} · ${decision.reason} · “${c.line}”`;
    if(decision.accepted)library.audition(selected);break;
   }
  }
 }));
 addEventListener('pagehide',()=>library.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)library.stop();});
 return {library,dialog,open:()=>button.click()};
}
