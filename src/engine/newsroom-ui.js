import {loadArchivedClip} from './news-archive-adapter.js';
import '../styles/newsroom.css';

const PAGE_SIZE=8;
const dateText=value=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const durationText=clip=>{
  const seconds=(clip?.frames?.length||clip?.frameCount||0)/(clip?.fps||12);
  return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
};
const bytesText=value=>{
  let n=Math.max(0,Number(value)||0),unit='B';
  for(const next of ['KB','MB','GB']){if(n<1024)break;n/=1024;unit=next;}
  return `${n>=10||unit==='B'?Math.round(n):n.toFixed(1)} ${unit}`;
};

export class NewsroomUI{
  constructor({archive,onClose,roster=[]}){
    if(!archive)throw Error('Newsroom requires an archive');
    this.archive=archive;this.onClose=onClose;this.roster=roster;
    this.byId=new Map(roster.map(hero=>[hero.id,hero]));
    this.rows=[];this.filtered=[];this.page=0;this.heroId='';this.event='';this.days='all';this.favoritesOnly=false;
    this.selectedId='';this.active=null;this.generation=0;this.playing=true;this.frame=0;this.last=0;this.raf=0;
    this.image=null;this.imageUrl='';this.drawnUrl='';this.exportUrls=new Set();
    this._build();
  }
  _build(){
    const root=document.createElement('section');root.className='newsroom';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','nrTitle');
    root.innerHTML=`<div class="nr-shell">
      <header class="nr-head"><div class="nr-brand"><span class="nr-kmk">9<small>KMK</small></span><div><span class="nr-kicker">CAREER MEDIA DESK</span><h1 id="nrTitle">NEWSROOM</h1><p>Your fights. Their cameras. Kept on this device.</p></div></div><div class="nr-head-actions"><span class="nr-stats" aria-live="polite">Loading archive…</span><button class="nr-close" type="button" aria-label="Close newsroom">Close ×</button></div></header>
      <div class="nr-filters" aria-label="Archive filters">
        <label>Hero<select aria-label="Hero filter"><option value="">All footage</option></select></label>
        <label>Event<select aria-label="Event filter"><option value="">All events</option></select></label>
        <label>Date<select aria-label="Date filter"><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
        <button class="nr-filter-favorite" type="button" aria-pressed="false" aria-label="Show favorites only">☆ Favorites</button>
        <span class="nr-scope">All footage</span>
      </div>
      <div class="nr-state" aria-live="polite" hidden></div>
      <main class="nr-main">
        <section class="nr-library" aria-label="Archived clips"><div class="nr-list"></div><div class="nr-pages"><button type="button" data-page="previous" aria-label="Previous page">← Newer</button><span>Page 1 of 1</span><button type="button" data-page="next" aria-label="Next page">Older →</button></div></section>
        <section class="nr-player" aria-label="Selected archived clip">
          <div class="nr-tv"><canvas width="960" height="540"></canvas><div class="nr-tv-empty"><b>STANDING BY</b><span>Your first highlights appear after a match.</span></div><span class="nr-livebug">KMK 9 · ARCHIVE</span><span class="nr-silent">SILENT FOOTAGE</span></div>
          <div class="nr-transport"><button type="button" data-action="previous" aria-label="Previous clip">‹</button><button type="button" data-action="play" aria-label="Pause footage">Ⅱ</button><button type="button" data-action="next" aria-label="Next clip">›</button><label class="nr-scrub"><input type="range" min="0" max="0" value="0" step="1" aria-label="Scrub footage"><output>0:00 / 0:00</output></label><button type="button" data-action="still" aria-label="Save still image">Save still</button></div>
          <div class="nr-details"><div><span class="nr-eyebrow">SELECTED REPORT</span><h2 class="nr-selected-title">No clip selected</h2><p class="nr-selected-meta">Choose a report from the archive.</p><p class="nr-participants"></p></div><div class="nr-actions"><button type="button" data-action="rename" aria-label="Rename clip">Rename</button><button type="button" data-action="favorite" aria-label="Favorite clip">☆ Favorite</button><button type="button" data-action="export" aria-label="Export clip backup">Export clip backup</button><label class="nr-import">Import clip backup<input type="file" accept="application/json,.json" aria-label="Import clip backup"></label><button type="button" class="nr-delete" data-action="delete" aria-label="Delete clip">Delete</button></div></div>
          <form class="nr-rename" hidden><label>Clip title<input type="text" maxlength="120" aria-label="Clip title"></label><button type="submit" aria-label="Save title">Save title</button><button type="button" data-action="cancel-rename">Cancel</button></form>
        </section>
      </main>
      <footer class="nr-footer"><span>Archive is local to this browser, device and site origin. Clearing site data can erase it.</span><span>Backups contain one silent clip per file; they are not video exports.</span></footer>
    </div>
    <dialog class="nr-confirm" aria-label="Delete archived clip"><h2>Delete this clip?</h2><p>This removes the archived frames from this browser. Export a backup first if you want to keep them.</p><div><button type="button" data-action="cancel-delete" aria-label="Cancel delete">Cancel</button><button type="button" class="nr-delete" data-action="confirm-delete" aria-label="Confirm delete">Delete clip</button></div></dialog>`;
    document.body.appendChild(root);this.el=root;
    this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.range=root.querySelector('.nr-scrub input');this.output=root.querySelector('.nr-scrub output');this.state=root.querySelector('.nr-state');
    const hero=root.querySelector('[aria-label="Hero filter"]');
    for(const def of rosterSort(this.roster)){const option=document.createElement('option');option.value=def.id;option.textContent=def.name;hero.appendChild(option);}
    root.querySelector('.nr-close').onclick=()=>this.onClose?.();
    hero.onchange=()=>{this.heroId=hero.value;this.page=0;this._applyFilters();};
    root.querySelector('[aria-label="Event filter"]').onchange=e=>{this.event=e.target.value;this.page=0;this._applyFilters();};
    root.querySelector('[aria-label="Date filter"]').onchange=e=>{this.days=e.target.value;this.page=0;this._applyFilters();};
    root.querySelector('.nr-filter-favorite').onclick=e=>{this.favoritesOnly=!this.favoritesOnly;e.currentTarget.setAttribute('aria-pressed',String(this.favoritesOnly));e.currentTarget.setAttribute('aria-label',this.favoritesOnly?'Show all clips':'Show favorites only');e.currentTarget.textContent=this.favoritesOnly?'★ Favorites only':'☆ Favorites';this.page=0;this._applyFilters();};
    root.querySelector('[data-page="previous"]').onclick=()=>{if(this.page>0){this.page--;this._renderList();}};
    root.querySelector('[data-page="next"]').onclick=()=>{if((this.page+1)*PAGE_SIZE<this.filtered.length){this.page++;this._renderList();}};
    root.querySelector('[data-action="previous"]').onclick=()=>this._step(-1);
    root.querySelector('[data-action="next"]').onclick=()=>this._step(1);
    root.querySelector('[data-action="play"]').onclick=()=>{this.playing=!this.playing;this._syncTransport();};
    this.range.oninput=()=>{this.frame=+this.range.value;this.playing=false;this._drawFrame();this._syncTransport();};
    root.querySelector('[data-action="still"]').onclick=()=>this._saveStill();
    root.querySelector('[data-action="favorite"]').onclick=()=>this._toggleFavorite();
    root.querySelector('[data-action="rename"]').onclick=()=>this._startRename();
    root.querySelector('[data-action="cancel-rename"]').onclick=()=>this._finishRename();
    root.querySelector('.nr-rename').onsubmit=e=>{e.preventDefault();this._saveTitle();};
    root.querySelector('[data-action="delete"]').onclick=()=>this._askDelete();
    root.querySelector('[data-action="cancel-delete"]').onclick=()=>root.querySelector('.nr-confirm').close();
    root.querySelector('[data-action="confirm-delete"]').onclick=()=>this._deleteConfirmed();
    root.querySelector('[data-action="export"]').onclick=()=>this._export();
    root.querySelector('[aria-label="Import clip backup"]').onchange=e=>this._import(e.target.files?.[0],e.target);
    root.addEventListener('keydown',e=>this._key(e));
    root.addEventListener('keyup',e=>e.stopPropagation());
    for(const type of ['mousedown','mouseup','wheel','touchstart','touchend'])root.addEventListener(type,e=>e.stopPropagation(),{passive:type!=='wheel'});
  }
  async show({heroId}={}){
    this.el.hidden=false;this.el.classList.add('is-open');this.heroId=this.byId.has(heroId)?heroId:'';
    this.el.querySelector('[aria-label="Hero filter"]').value=this.heroId;
    this.playing=true;this.last=performance.now();this._setState('Loading archived footage…');
    await this._refresh();
    if(!this.el.hidden){cancelAnimationFrame(this.raf);this.raf=requestAnimationFrame(now=>this._tick(now));this.el.querySelector('.nr-close').focus();}
  }
  hide(){
    this.el.hidden=true;this.el.classList.remove('is-open');this.generation++;cancelAnimationFrame(this.raf);this.raf=0;this._releaseClip();this._finishRename();
    const dialog=this.el.querySelector('.nr-confirm');if(dialog.open)dialog.close();
    for(const url of this.exportUrls)URL.revokeObjectURL(url);this.exportUrls.clear();
  }
  destroy(){this.hide();this.el.remove();}
  reportArchiveError(error){this._setState(this._friendlyError(error),true);}
  async _refresh(preferred=''){
    const token=++this.generation;
    try{
      const [rows,stats,estimate]=await Promise.all([this.archive.list({limit:1000}),this.archive.stats(),navigator.storage?.estimate?.().catch(()=>null)]);
      if(token!==this.generation||this.el.hidden)return;
      this.rows=rows;this._renderEvents();
      const quota=estimate?.quota?` · browser quota ${bytesText(estimate.quota)}`:'';
      this.el.querySelector('.nr-stats').textContent=`${stats.count} clip${stats.count===1?'':'s'} · ${bytesText(stats.bytes)} / ${bytesText(stats.budgetBytes)} archive${quota}`;
      this.selectedId=preferred||this.selectedId;this._setState('');this._applyFilters();
    }catch(error){if(token!==this.generation)return;this._setState(this._friendlyError(error),true);this.rows=[];this._applyFilters();}
  }
  _renderEvents(){
    const select=this.el.querySelector('[aria-label="Event filter"]'),value=this.event;
    select.replaceChildren(new Option('All events',''));
    for(const tag of [...new Set(this.rows.map(row=>row.tag).filter(Boolean))].sort()){const option=new Option(tag.replace(/[-_]/g,' ').toUpperCase(),tag);select.appendChild(option);}
    if([...select.options].some(option=>option.value===value))select.value=value;else this.event='';
  }
  _applyFilters(){
    const cutoff=this.days==='all'?0:Date.now()-(+this.days*864e5);
    this.filtered=this.rows.filter(row=>(!this.heroId||row.heroIds?.includes(this.heroId))&&(!this.event||row.tag===this.event)&&(!this.favoritesOnly||row.favorite)&&(!cutoff||row.createdAt>=cutoff));
    const hero=this.byId.get(this.heroId);this.el.querySelector('.nr-scope').textContent=hero?`Exact hero view · ${hero.name}`:'All footage · every participant';
    const pages=Math.max(1,Math.ceil(this.filtered.length/PAGE_SIZE));this.page=Math.min(this.page,pages-1);
    this._renderList();
    const wanted=this.filtered.some(row=>row.id===this.selectedId)?this.selectedId:this.filtered[0]?.id||'';
    if(wanted!==this.selectedId||(!this.active&&wanted))this._select(wanted);
    else if(!wanted)this._select('');
    else this._renderDetails();
  }
  _renderList(){
    const list=this.el.querySelector('.nr-list');list.replaceChildren();
    const slice=this.filtered.slice(this.page*PAGE_SIZE,(this.page+1)*PAGE_SIZE);
    if(!slice.length){const empty=document.createElement('p');empty.className='nr-no-results';empty.textContent=this.rows.length?'No footage matches these filters.':'Your first highlights appear after a match.';list.appendChild(empty);}
    for(const row of slice){
      const button=document.createElement('button');button.type='button';button.className='nr-clip-row';button.dataset.clip=row.id;button.setAttribute('aria-pressed',String(row.id===this.selectedId));
      const marker=document.createElement('span');marker.className='nr-row-mark';marker.textContent=row.favorite?'★':'•';
      const copy=document.createElement('span'),title=document.createElement('b'),meta=document.createElement('small');title.textContent=row.title||'Untitled field report';meta.textContent=`${row.tag.toUpperCase()} · ${dateText(row.createdAt)} · ${bytesText(row.bytes)}`;copy.append(title,meta);
      button.append(marker,copy);button.onclick=()=>this._select(row.id);list.appendChild(button);
    }
    const pages=Math.max(1,Math.ceil(this.filtered.length/PAGE_SIZE));this.el.querySelector('.nr-pages span').textContent=`Page ${this.page+1} of ${pages}`;
    this.el.querySelector('[data-page="previous"]').disabled=this.page===0;this.el.querySelector('[data-page="next"]').disabled=(this.page+1)*PAGE_SIZE>=this.filtered.length;
  }
  async _select(id){
    if(id===this.selectedId&&this.active)return;
    this.selectedId=id;this._releaseClip();this.frame=0;this.playing=true;this._renderList();this._renderDetails();
    if(!id){this._syncTransport();return;}
    const token=++this.generation;this._setState('Loading selected clip…');
    try{
      const clip=await loadArchivedClip(id);
      if(token!==this.generation||this.el.hidden||id!==this.selectedId){clip?.release?.();return;}
      if(!clip)throw Error('Archived clip is no longer available');
      this.active=clip;this._setState('');this._renderDetails();this._drawFrame();this._syncTransport();
    }catch(error){if(token!==this.generation)return;this._setState(this._friendlyError(error),true);this._syncTransport();}
  }
  _releaseClip(){this.active?.release?.();this.active=null;this.image=null;this.imageUrl='';this.drawnUrl='';this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.el.querySelector('.nr-tv-empty').hidden=false;}
  _renderDetails(){
    const row=this.rows.find(item=>item.id===this.selectedId);
    this.el.querySelector('.nr-selected-title').textContent=row?.title||'No clip selected';
    const playback=this.active?.id===row?.id?this.active:row;
    this.el.querySelector('.nr-selected-meta').textContent=row?`${row.tag.toUpperCase()} · ${dateText(row.createdAt)} · ${durationText(playback)} · ${bytesText(row.bytes)} · ${row.shotBy||'Field camera'} · silent`:'Choose a report from the archive.';
    this.el.querySelector('.nr-participants').textContent=row?`Participants · ${(row.heroIds||[]).map(id=>this.byId.get(id)?.name||id).join(' · ')||'Unidentified field footage'}`:'';
    const fav=this.el.querySelector('[data-action="favorite"]');fav.textContent=row?.favorite?'★ Favorited':'☆ Favorite';fav.setAttribute('aria-label',row?.favorite?'Unfavorite clip':'Favorite clip');
    for(const action of ['rename','favorite','delete','export'])this.el.querySelector(`[data-action="${action}"]`).disabled=!row;
    this._renderList();
  }
  _syncTransport(){
    const n=this.active?.frames?.length||0,fps=this.active?.fps||12;
    this.range.max=String(Math.max(0,n-1));this.range.value=String(Math.min(Math.floor(this.frame),Math.max(0,n-1)));this.range.disabled=!n;
    this.output.textContent=`${durationText({frameCount:this.frame,fps})} / ${durationText({frameCount:n,fps})}`;
    const play=this.el.querySelector('[data-action="play"]');play.disabled=!n;play.textContent=this.playing?'Ⅱ':'▶';play.setAttribute('aria-label',this.playing?'Pause footage':'Play footage');
    this.el.querySelector('[data-action="still"]').disabled=!this.drawnUrl;
    for(const action of ['previous','next'])this.el.querySelector(`[data-action="${action}"]`).disabled=this.filtered.length<2;
  }
  _drawFrame(){
    const url=this.active?.frames?.[Math.min(Math.floor(this.frame),Math.max(0,(this.active?.frames?.length||1)-1))];
    if(!url||url===this.imageUrl)return;
    const token=this.generation,image=new Image();this.image=image;this.imageUrl=url;
    image.onload=()=>{if(token!==this.generation||image!==this.image||this.el.hidden)return;this.ctx.drawImage(image,0,0,this.canvas.width,this.canvas.height);this.drawnUrl=url;this.el.querySelector('.nr-tv-empty').hidden=true;this._syncTransport();};
    image.onerror=()=>{if(image===this.image)this._setState('This clip contains an unreadable frame.',true);};image.src=url;
  }
  _tick(now){
    if(this.el.hidden)return;const dt=Math.min(.15,Math.max(0,(now-this.last)/1000));this.last=now;
    const n=this.active?.frames?.length||0;
    if(this.playing&&n){this.frame+=dt*(this.active.fps||12);if(this.frame>=n){this.frame=n-1;this.playing=false;this._step(1,true);}else this._drawFrame();this._syncTransport();}
    this.raf=requestAnimationFrame(next=>this._tick(next));
  }
  _step(delta,autoplay=false){
    if(!this.filtered.length)return;let index=this.filtered.findIndex(row=>row.id===this.selectedId);if(index<0)index=0;
    const next=this.filtered[(index+delta+this.filtered.length)%this.filtered.length];this._select(next.id);if(autoplay)this.playing=true;
  }
  _startRename(){const row=this.rows.find(item=>item.id===this.selectedId);if(!row)return;const form=this.el.querySelector('.nr-rename');form.hidden=false;const input=form.querySelector('input');input.value=row.title||'';input.focus();input.select();}
  _finishRename(){this.el.querySelector('.nr-rename').hidden=true;}
  async _saveTitle(){const input=this.el.querySelector('.nr-rename input'),id=this.selectedId;if(!id)return;try{await this.archive.update(id,{title:input.value});this._finishRename();await this._refresh(id);this._announce('Title saved.');}catch(error){this._setState(this._friendlyError(error),true);}}
  async _toggleFavorite(){const row=this.rows.find(item=>item.id===this.selectedId);if(!row)return;const next=!row.favorite;try{await this.archive.update(row.id,{favorite:next});row.favorite=next;this._renderDetails();await this._refresh(row.id);this._announce(next?'Added to favorites.':'Removed from favorites.');}catch(error){this._setState(this._friendlyError(error),true);}}
  _askDelete(){if(!this.selectedId)return;this.deleteId=this.selectedId;const dialog=this.el.querySelector('.nr-confirm');dialog.showModal?dialog.showModal():dialog.setAttribute('open','');dialog.querySelector('[data-action="cancel-delete"]').focus();}
  async _deleteConfirmed(){const id=this.deleteId;this.deleteId='';this.el.querySelector('.nr-confirm').close();if(!id)return;try{await this.archive.remove(id);if(this.selectedId===id)this.selectedId='';await this._refresh();this._announce('Clip deleted.');}catch(error){this._setState(this._friendlyError(error),true);}}
  async _export(){if(!this.selectedId)return;try{const blob=await this.archive.exportClip(this.selectedId),url=URL.createObjectURL(blob),link=document.createElement('a');this.exportUrls.add(url);link.href=url;link.download=`powerworld-${this.selectedId.replace(/[^a-z0-9_-]/gi,'clip')}.json`;link.click();setTimeout(()=>{URL.revokeObjectURL(url);this.exportUrls.delete(url);},10_000);this._announce('Exported 1 clip backup.');}catch(error){this._setState(this._friendlyError(error),true);}}
  async _import(file,input){if(!file)return;try{const row=await this.archive.importBackup(file);this.event='';this.el.querySelector('[aria-label="Event filter"]').value='';this.days='all';this.el.querySelector('[aria-label="Date filter"]').value='all';await this._refresh(row.id);this._announce('Imported 1 clip backup.');}catch(error){this._setState(this._friendlyError(error),true);}finally{input.value='';}}
  _saveStill(){if(!this.drawnUrl||!this.selectedId)return;const link=document.createElement('a');link.download=`KMK9-${this.selectedId}-${Math.floor(this.frame)}.png`;link.href=this.canvas.toDataURL('image/png');link.click();}
  _setState(message,error=false){this.state.hidden=!message;this.state.textContent=message;this.state.classList.toggle('is-error',error);if(error&&/storage|archive|favorites/i.test(message)){const button=document.createElement('button');button.type='button';button.textContent='Enable archive saving';button.onclick=async()=>{try{await navigator.storage?.persist?.();await this._refresh(this.selectedId);}catch(e){this._setState(this._friendlyError(e),true);}};this.state.append(' ',button);}}
  _announce(message){this._setState(message);clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>{if(this.state.textContent===message)this._setState('');},2200);}
  _friendlyError(error){const message=String(error?.message||error||'Unknown archive error');return /filled by favorites/i.test(message)?'Favorites fill the archive budget. Export clip backups or delete a favorite to free space.':`Archive unavailable: ${message}`;}
  _key(event){
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();const dialog=this.el.querySelector('.nr-confirm');if(dialog.open){dialog.close();return;}if(!this.el.querySelector('.nr-rename').hidden){this._finishRename();return;}this.onClose?.();return;}
    if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
    if(event.code==='Space'){event.preventDefault();this.playing=!this.playing;this._syncTransport();}
    if(event.code==='ArrowLeft'||event.code==='ArrowRight'){event.preventDefault();this.frame+=event.code==='ArrowRight'?(this.active?.fps||12):-(this.active?.fps||12);this.frame=Math.max(0,Math.min((this.active?.frames?.length||1)-1,this.frame));this.playing=false;this._drawFrame();this._syncTransport();}
  }
}

function rosterSort(roster){return [...roster].sort((a,b)=>String(a.name).localeCompare(String(b.name)));}
