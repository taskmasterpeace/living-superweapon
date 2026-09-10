/* THESIS: Compare a roster's beams, then tune one in the production rehearsal.
 * OWN WORLD: Studio's charcoal, bone and gold authoring surface; no new dashboard.
 * STORY: Find an attack → compare nominal configuration → open its real controls.
 * FIRST VIEWPORT: Search and shape filters above a compact, labeled beam table.
 * FORM: A dismissible dialog preserves the working draft and pauses the preview. */
import {beamCatalog,filterBeams} from './beam-library-data.js';
import './beam-library.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>Number.isFinite(value)?Number(value.toFixed(2)).toLocaleString('en-US'):'—';

export function mountBeamLibrary({button,roster,load,draft,onTune,onOpen,onClose}){
 const dialog=document.createElement('dialog');dialog.className='beam-library';
 dialog.setAttribute('aria-labelledby','beam-library-title');
 dialog.innerHTML=`<div class="beam-library-heading"><div><p class="beam-library-eyebrow">ROSTER / ATTACK AUTHORING</p><h2 id="beam-library-title">Beam Library</h2></div><button type="button" data-close aria-label="Close Beam Library">Close</button></div>
 <p class="beam-library-intro">Compare the kit. Tune the attack. Test its contact.</p>
 <div class="beam-library-filters"><label for="beam-library-search">Find a beam<input id="beam-library-search" type="search" data-search placeholder="Character or attack…"></label><label for="beam-library-shape"><span>Shape</span><select id="beam-library-shape" aria-label="Shape" data-shape><option value="all">All shapes</option><option value="ray">Ray · narrow</option><option value="hose">Hose · flowing</option><option value="torrent">Torrent · heavy</option></select></label><label for="beam-library-sort"><span>Sort by</span><select id="beam-library-sort" aria-label="Sort by" data-sort><option value="name">Character / attack</option><option value="travel">Fastest to 100u</option><option value="dps">Highest base DPS</option><option value="energy">Lowest sustain cost</option></select></label></div>
 <p class="beam-library-count" role="status"></p><div class="beam-library-errors" role="alert" hidden></div>
 <p id="beam-library-assumptions" class="beam-library-assumptions">Nominal, uncharged kit values — before character strength, buffs and other defenses. Travel assumes a straight shot; excludes charge time. Guard DPS assumes an intact frontal guard.</p>
 <div class="beam-library-table" tabindex="0" role="region" aria-label="Beam comparison, scroll for more columns"><table aria-describedby="beam-library-assumptions"><caption>Beam configuration comparison</caption><thead><tr><th scope="col">Attack</th><th scope="col">Shape / radius</th><th scope="col">Travel to 100u</th><th scope="col">Damage / second</th><th scope="col">Energy</th><th scope="col">Push</th></tr></thead><tbody></tbody></table><p class="beam-library-empty" hidden>No beams match. Try another character or choose All shapes.</p></div>
 <p class="beam-library-footnote">Tune opens the existing inspector and production beam sequence. Nothing is saved or changed by browsing.</p>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s);let catalog={rows:[],errors:[]},filtered=[],opener,pendingTune=null;
 function render(){
  filtered=filterBeams(catalog.rows,{query:$('[data-search]').value,shape:$('[data-shape]').value,sort:$('[data-sort]').value});
  $('.beam-library-count').textContent=`${filtered.length} of ${catalog.rows.length} beams · ${new Set(catalog.rows.map(r=>r.heroId)).size} characters`;
  $('.beam-library-errors').hidden=!catalog.errors.length;$('.beam-library-errors').textContent=catalog.errors.join(' ');
  $('tbody').innerHTML=filtered.map((r,i)=>`<tr><th scope="row"><button type="button" data-tune="${i}" aria-label="Tune ${esc(r.heroName)} ${esc(r.name)}"><b>${esc(r.name)}</b><span aria-hidden="true">Tune ↗</span></button><small>${esc(r.heroName)} · ${esc(r.slot.toUpperCase())}</small><small class="beam-library-state${r.state==='Unsaved draft'?' is-draft':''}">${esc(r.state)}</small></th><td><strong>${esc(r.shape)}</strong><small>Radius ${num(r.radius)}u · ${esc(r.flow)}</small></td><td>${r.travel100===null?'Out of reach':num(r.travel100)+'s'}<small>${num(r.tipSpeed)} u/s · reach ${num(r.reach)}u</small></td><td>${num(r.dps)} HP/s<small>Guard ${num(r.guardDps)} HP/s</small></td><td>${num(r.energy)} ki/s<small>Entry ${num(r.cost)} ki</small></td><td>${num(r.push)}<small>u/s² · nominal</small></td></tr>`).join('');
  $('.beam-library-empty').hidden=filtered.length>0;$('table').hidden=!filtered.length;
 }
 button.onclick=()=>{
  catalog=beamCatalog(roster,{load,draft:draft()});render();opener=document.activeElement;onOpen();dialog.showModal();$('[data-search]').focus();
 };
 $('[data-close]').onclick=()=>dialog.close();
 // Native close is queued. Navigate only after restoration so it cannot steal
 // focus from the inspector or the existing Save / Discard confirmation.
 dialog.addEventListener('close',()=>{const row=pendingTune;pendingTune=null;onClose();opener?.focus();if(row)onTune(row);});
 $('[data-search]').oninput=render;$('[data-shape]').onchange=render;$('[data-sort]').onchange=render;
 $('tbody').onclick=e=>{const tune=e.target.closest('[data-tune]');if(!tune)return;pendingTune=filtered[Number(tune.dataset.tune)];dialog.close();};
 return {dialog};
}
