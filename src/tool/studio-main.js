import {ROSTER} from '../data/characters.js';
import {usesThrowAction} from '../engine/throwable-action.js';
import {EFFECT_FIELDS} from '../data/effects-profile.js';
import {AUDIO_CUES,BEAM_SOUND_DIRECTIONS,DIALOGUE_CANDIDATES,audioCuePackage} from '../data/audio-cues.js';
import {loadBroadcastProfile,saveBroadcastProfile,broadcastPackage,importBroadcastProfile} from '../data/broadcast-profile.js';
import {heroModelOf,HERO_BODIES,HERO_BODY_LABELS} from '../data/hero-models.js';
import {CAMERA_DEFAULTS} from '../data/flight-tuning.js';
import {installCustoms,loadCustoms,buildDef} from '../data/creator.js';
import {exportCharacter,validateCharacter,importCharacter} from './character-package.js';
import {StudioPreview} from './studio-preview.js';
import {mountSoundLibrary} from './sound-library.js';
import {mountBeamLibrary} from './beam-library.js';
import {TARGET_MOTIONS,TARGET_DEFENSES,SHOOTER_MOTIONS,CONTACT_TESTS,NANITE_SAMPLES,naniteSelection,naniteSource,supportsAttackRehearsal} from './studio-combat.js';
import {MELEE_SEQUENCES} from './studio-melee.js';
import {styleOf} from '../data/martial.js';
import {LIMITS,profileFromDef,validateProfile,applyProfile,loadProfile,saveProfile,removeProfile,DraftHistory,resetFlightStyle,resetCamera} from './studio-profile.js';
import {attackFields,attackIdentity,attackSource,reconcileAttackOverrides,resetAttackOverride,setAttackOverride} from '../data/attack-tuning.js';
import {progressionInspector,formDialogBody,editForm} from './studio-progression.js';
import {loadCatalog} from '../engine/authored-assets.js';
import {catalogInspector,prepareCatalogSelection,watchCatalogRuntime} from './studio-catalog.js';
import {loadFighterMotion} from '../engine/authored-character.js';

installCustoms(ROSTER);
try {
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={hover:'Hover',forward:'Forward flight',backward:'Backward flight',strafeLeft:'Strafe left',strafeRight:'Strafe right',brake:'Air brake',boost:'Boost',cycle:'Transition loop',beam:'Beam sequence',attack:'Attack sequence',melee:'Melee sequence'};
Object.assign(states,{groundWalk:'Ground walk',groundJog:'Ground jog',groundSprint:'Ground sprint',groundJump:'Ground jump',groundCrouch:'Crouch · procedural',groundCrouchWalk:'Crouch walk · procedural'});
let hero=ROSTER.find(d=>d.id===new URLSearchParams(location.search).get('hero'))||ROSTER[0],history,tab='model',pose='hover',attackSlot='lmb',approvedNavigation=false,hasSaved=false;
let assetCatalog=null,catalogLoading=false,catalogError='',catalogOpen=false,catalogSelectionEpoch=0;
async function refreshCatalog(){
 catalogLoading=true;catalogError='';if(history&&tab==='model')inspector();
 try{assetCatalog=await loadCatalog();}catch(error){catalogError=error.message;}
 finally{catalogLoading=false;if(history&&tab==='model')inspector();}
}
const refHover=new URL('../../docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 2-44 screenshot.png',import.meta.url).href;
const refCamera=new URL('../../docs/reference/Ultra Bid For Power 1.0 - Release [DOWNLOAD] 1-26 screenshot.png',import.meta.url).href;
$('#studio').innerHTML=`<header><div><div class="brandmark">LIVING SUPERWEAPON / AUTHORING</div><h1>Character Studio</h1><p>Build the silhouette. Shape the flight.</p></div><div class="actions"><span class="save-state"></span><button id="undo">Undo</button><button id="redo">Redo</button><button id="save" class="primary">Save local</button><button id="playtest">Play Test ↗</button></div></header>
<main class="workspace"><aside class="library"><div class="section-title">Fighters <span class="count">${ROSTER.length}</span></div><input class="search" aria-label="Find fighter" placeholder="Find a fighter…"><div class="roster"></div><div class="library-footer">Studio profiles include presentation and sparse attack tuning.<br>Local saves never edit source files.<br><a href="./index.html">Power kits / ORIGIN ↗</a></div></aside>
<section class="stage-shell" aria-label="Character preview"><div class="stage-toolbar"><div class="hero-heading"></div><div class="view-controls">${['orbit','front','side','rear','game'].map(v=>`<button data-view="${v}" aria-label="${v==='game'?'Game camera':v==='orbit'?'Orbit':v[0].toUpperCase()+v.slice(1)+' view'}" aria-pressed="${v==='orbit'}">${v==='game'?'Game camera':v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div><div class="viewport"><span class="view-tag">LIVE ENGINE / ORBIT</span><span class="attack-phase" hidden></span><span class="measurements"></span><span class="viewport-note">Drag to orbit · Scroll to frame<br>Actual game rig, materials and flight poses</span></div>
<div class="transport"><button id="play" aria-label="Pause preview">Pause</button><label for="state">Motion</label><select id="state" aria-label="Motion state">${Object.entries(states).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><input class="timeline" type="range" min="0" max="8" step=".01" value="0" aria-label="Preview time"><span class="time">0.00 s</span><button class="reference-toggle" aria-expanded="false">BFP references</button></div>
<div class="combat-controls" hidden><label><span id="combat-kind">Beam</span> <select id="combat-slot" aria-label="Preview beam"></select></label><label>Target <select id="target-motion" aria-label="Target motion">${Object.entries(TARGET_MOTIONS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Speed · u/s <input id="target-speed" aria-label="Target speed" type="number" min="10" max="210" step="10" value="70" disabled></label><label>Elevation · ° <input id="target-elevation" aria-label="Target elevation" type="number" min="-75" max="75" step="5" value="0"></label><label>Distance · u <input id="target-distance" aria-label="Target distance" type="number" min="12" max="60" step="1" value="32"></label><label>Charge hold · s <input id="charge-hold" aria-label="Charge hold" type="number" min="0.2" max="30" step="any" value="1.8"></label><p id="encounter-note">Stationary target · silent · measured contact, not a balance test</p><p id="attack-sequence-note">0.6s fire → 1.8s release charge → 2s target moves → 4.6s stop fire → recover</p></div>
<div class="references" hidden><figure><img src="${refHover}" alt="Bid For Power rear airborne silhouette reference"><figcaption>Upright hovering, separated legs. Reference footage; our rig is original.</figcaption></figure><figure><img src="${refCamera}" alt="Bid For Power camera settings reference"><figcaption>Angle, height, range and FOV are independent controls.</figcaption></figure><a href="https://github.com/LegendaryGuard/BFP" target="_blank" rel="noreferrer">Community source reconstruction ↗</a><a href="https://www.youtube.com/watch?v=4BAwJyKkrpg" target="_blank" rel="noreferrer">Reference footage ↗</a></div></section>
<aside class="inspector"><div class="tabs" role="tablist" aria-label="Studio inspector">${['model','pose','camera','flight','attacks'].map(t=>`<button role="tab" data-tab="${t}" aria-selected="${t==='model'}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><div class="inspector-body"></div><div class="inspector-footer"><button id="import">Import JSON</button><button id="export">Export JSON</button><button id="reset">Reset hero</button></div></aside></main><footer class="statusbar" role="status"><span id="status">Ready</span><span>Local-first · No map changes · Version 1 profiles</span></footer><dialog></dialog>`;
$('.library-footer a').href='./index.html?editor=origin';
$('.search').insertAdjacentHTML('afterend','<button id="beam-library-open">Beam Library ↗</button>');
$('.view-controls').insertAdjacentHTML('beforeend','<label class="inspection-focus"><input id="isolate-fighter" type="checkbox" disabled> Isolate fighter</label>');
$('#combat-slot').closest('label').insertAdjacentHTML('afterend',`<label>Fighter motion <select id="shooter-motion" aria-label="Fighter motion">${Object.entries(SHOOTER_MOTIONS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>`);
$('#combat-slot').closest('label').insertAdjacentHTML('afterend','<label>Co-fire <select id="combat-secondary" aria-label="Co-fire attack"><option value="">None</option></select></label>');
$('#target-motion').closest('label').insertAdjacentHTML('beforebegin',`<label>Defender <select id="target-hero" aria-label="Defender character">${ROSTER.map(d=>`<option value="${esc(d.id)}">${esc(d.name)} · STR ${d.strength??5}</option>`).join('')}</select></label>`);
$('#encounter-note').insertAdjacentHTML('afterend','<p id="target-pressure-readout" hidden></p>');
$('.tabs').insertAdjacentHTML('beforeend','<button role="tab" data-tab="progression" aria-selected="false">Progression</button>');
$('.tabs').insertAdjacentHTML('beforeend','<button role="tab" data-tab="effects" aria-selected="false">Effects</button>');
$('#play').insertAdjacentHTML('afterend','<button id="preview-sound" aria-pressed="false" title="Enable local combat recordings during playback. Pause and scrubbing are silent.">Sound off</button>');
$('#play').insertAdjacentHTML('afterend','<label>Rate <select id="preview-rate" aria-label="Playback rate"><option value="1">1×</option><option value="0.25">0.25×</option></select></label>');
// Extend the existing transport; melee is a real input sequence, not another kit editor.
$('.combat-controls').insertAdjacentHTML('afterend',`<div class="combat-controls melee-controls" hidden><label>Sequence <select id="melee-sequence" aria-label="Melee sequence">${Object.entries(MELEE_SEQUENCES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><p id="melee-style"></p><p>Standard controls: hold C or Mouse4/5 to block · tap V: light · hold V: heavy · G: grab. In a clinch: tap V for a body blow, hold V to drive down, or aim and press G to throw.</p><p>Production contact and physics vs KANO · silent rehearsal · resistance applies. Block reduces damage; grabs and heavy guard crush counter it. Custom fighters inherit weight from Might, guard type and strike access from Edit power kit.</p></div>`);
$('.reference-toggle').insertAdjacentHTML('beforebegin',`<label class="preview-level-label" for="preview-level">Preview level</label><select id="preview-level" aria-label="Preview level">${Array.from({length:10},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select>`);
$('#melee-style').insertAdjacentHTML('afterend','<p id="melee-events" aria-label="Melee contact breakdown">No contact yet.</p>');
$('#melee-sequence').closest('label').insertAdjacentHTML('afterend','<label>Stage <select id="melee-stage" aria-label="Melee stage"><option value="airborne">Airborne</option><option value="grounded">Grounded</option></select></label>');
$('.melee-controls p:last-child').textContent='Production contact and physics vs KANO (SOL for guard-breaking heavy) · optional sound, not an AI balance test. Blocks reduce damage; grabs and heavy guard crush counter them. Custom fighters inherit Might, guard type and Melee Style from Edit power kit.';
const characterActions=document.createElement('div');characterActions.className='character-actions';
characterActions.innerHTML='<button id="new-character">New character</button><button id="edit-kit" disabled>Edit power kit</button><button id="example-characters">Example characters</button>';
$('.stage-toolbar').before(characterActions);
document.querySelector('header p').textContent='Create the fighter. Shape the flight. Test the kit.';
$('.statusbar > span:last-child').textContent='Local-first · Character packages + Studio profiles · Source files unchanged';
$('#encounter-note').insertAdjacentHTML('beforebegin',`<label id="contact-test-control">Contact test <select id="contact-test" aria-label="Contact test">${Object.entries(CONTACT_TESTS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label id="opposing-priority-control">Opponent priority <input id="opposing-priority" aria-label="Opponent priority" type="number" min="-1" max="16" step="1" value="1" disabled></label>`);
$('#encounter-note').insertAdjacentHTML('beforebegin','<label id="construct-start-control" hidden>Starting ki <input id="construct-start-ki" aria-label="Construct starting ki" type="number" min="0" max="120" step="any" value="120" disabled><span id="construct-core"></span></label><p id="construct-budget" aria-label="Construct energy and accepted contacts" hidden></p>');
$('#encounter-note').insertAdjacentHTML('beforebegin',`<label id="nanite-sample-control" hidden>Incoming sample <select id="nanite-sample" aria-label="Nanite incoming sample">${Object.entries(NANITE_SAMPLES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><p id="nanite-measurements" aria-label="Nanite integrity and actual contacts" hidden></p>`);
$('#encounter-note').insertAdjacentHTML('beforebegin',`<label id="target-defense-control">Target defense <select id="target-defense" aria-label="Target defense">${Object.entries(TARGET_DEFENSES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><p id="target-guard-readout" aria-label="Target guard results" hidden></p>`);
const preview=new StudioPreview($('.viewport'),({time,state,speed,fov,damage=0,contacts=0,nominalDamage=0,nominalUnit='hp/hit',phase='ready',splitChildren=0,liveSplitChildren=0,pattern='target',interception,resource=null,nanite=null,meleeEvents=[],defending=false,guardMeter=1,groundTake,groundDuration,strikeTake,strikeTime})=>{
  $('.time').textContent=`${time.toFixed(2)} s`;$('.timeline').value=time;
  if(state==='melee'){
    $('.measurements').textContent=`${damage.toFixed(1)} damage${defending?' received':''} · ${contacts} contact${contacts===1?'':'s'}${defending?` · Guard ${Math.round(guardMeter*100)}%`:''} · ${phase.replaceAll('-',' ')} · ${fov.toFixed(1)}°`;
    if(strikeTake)$('.measurements').append(document.createTextNode(` · ${strikeTake} @ ${strikeTime.toFixed(3)}s source`));
    const names={light:'Light',heavy:'Heavy',crush:'Guard crush',block:'Blocked / chip',body:'Body blow',throw:'Throw','slam-release':'Drive down',surface:'Surface impact'};
    $('#melee-events').textContent=meleeEvents.length?meleeEvents.map(e=>`${names[e.move]||e.move} ${e.amount.toFixed(1)}`).join(' → '):'No contact yet.';
  }
  else if(['beam','attack'].includes(state)){
   const split=splitChildren?` · Split ${splitChildren} children (${liveSplitChildren} live)`:'';
   const construct=preview.fighter?.slots?.[preview.combat.slot]?.def.type==='construct';
   const reload=preview.combat.reloadEncounter?preview.fighter.slots[preview.combat.slot].ammo:null;
   const measured=resource?`Humanoid target: ${damage.toFixed(1)} HP damage · ${contacts} contacts`:construct?`Contact ${damage.toFixed(1)} actual · ${contacts} damage events · Native construct`:preview.combat.secondarySlot?`Combined contact ${damage.toFixed(1)} actual · ${contacts} damage events · Primary nominal ${nominalDamage.toFixed(1)} ${nominalUnit}`:splitChildren?`Measured ${damage.toFixed(1)} incl. splash/defenses · ${contacts} damage event${contacts===1?'':'s'}${split} · Nominal direct ${nominalDamage.toFixed(1)} ${nominalUnit}`:`Contact ${damage.toFixed(1)} actual · ${contacts} hit${contacts===1?'':'s'} · Nominal ${nominalDamage.toFixed(1)} ${nominalUnit}`;
   $('.measurements').textContent=reload?`Magazine ${reload.loaded} / ${reload.capacity} · Reserve ${reload.reserve} · ${phase.replaceAll('-',' ')}`:nanite?`Owner ${nanite.hp.toFixed(1)} / ${nanite.maxHp} HP · ${nanite.bodyDamage.toFixed(1)} damage received · ${nanite.contacts} arrivals · ${nanite.alive?'active':'KO'}`:!resource&&pattern!=='target'&&interception?
     `${interception.events} interception${interception.events===1?'':'s'} · ${interception.retired} retired · Live ${interception.own} yours / ${interception.opposing} opposing${pattern==='bullets'&&interception.beamActive?` · Invested ${interception.investedKi.toFixed(1)} / ${interception.threshold} ki`:''}`:`${measured} · ${fov.toFixed(1)}°`;
  }else $('.measurements').textContent=groundTake?`${groundTake}${groundTake!=='Procedural'?` · ${groundDuration.toFixed(3)}s source`:''} · ${speed.toFixed(1)} u/s`:`${states[state]} · ${speed.toFixed(0)} u/s · ${fov.toFixed(1)}°`;
  $('#construct-budget').hidden=!resource;
  const targetGuard=['beam','attack'].includes(state)&&preview.combat.targetDefense==='guard'&&pattern==='target'&&!resource&&!nanite;
  $('#target-guard-readout').hidden=!targetGuard;
  if(targetGuard){const t=preview.combat.target;$('#target-guard-readout').textContent=`${t?.guarding?'GUARDING':t?.staggerT>0?'GUARD BROKEN':'RECOVERING'} · Meter ${Math.round((t?.guardMeter??1)*100)}% · ${preview.combat.blockedContacts} blocked ticks · ${preview.combat.guardBreaks} breaks · ${preview.combat.pressureEncounter?'Native pressure travel.':'Scripted path does not measure knockback travel.'}`;}
  const pressure=preview.combat.pressureEncounter;$('#target-pressure-readout').hidden=!pressure;
  if(pressure){const c=preview.combat,t=c.target;$('#target-pressure-readout').textContent=`${t.name} · STR ${t.strength} · Advance ${(c.distance-t.pos.z).toFixed(1)}u · Forward ${(-t.vel.z).toFixed(1)}u/s · ${t.launchT>0?'LAUNCHED':t.vel.z>1?'PUSHED BACK':t.vel.z<-1?'ADVANCING':'HOLDING'} · Damage ${c.damage.toFixed(1)} HP`;}
  $('#nanite-measurements').hidden=!nanite;
  if(nanite)$('#nanite-measurements').textContent=nanite.modules.map(m=>`${m.slot.toUpperCase()} ${m.form} / ${m.attachment.replace('-',' ')}: ${m.phase.replaceAll('-',' ')} · ${m.intactCells}/${m.totalCells} intact · absorbed ${m.absorbed.toFixed(1)} · body HP ${m.bodyDamage.toFixed(1)} · ${m.liveFragments} fragments${m.muzzleError===null?'':` · muzzle error ${m.muzzleError.toExponential(1)}u`}`).join(' | ')+` · Outgoing autohealed dummy: ${nanite.outgoingDamage.toFixed(1)} HP / ${nanite.outgoingContacts} events · ${nanite.launches} committed launches · incoming emitted ${nanite.emitted}${nanite.incomingStatus==='unavailable-ko'?' / fixture unavailable: incoming KO':''}${nanite.events.filter(e=>e.target==='owner').length?' / arrived '+nanite.events.filter(e=>e.target==='owner').map(e=>e.time.toFixed(2)+'s').join(', '):' / no arrival'}`;
  if(resource)$('#construct-budget').textContent=`Owner ${resource.infinite?'∞ core':resource.ki.toFixed(1)+' / '+resource.maxKi+' ki'} · `+resource.constructs.map(c=>`${c.slot.toUpperCase()} ${c.kind} / ${c.state}: ${c.mode==='upkeep'?c.rate+' ki/s; physical hit, no per-hit ki charge':c.rate+' ki/hp received'} · ${c.hits} accepted hits / ${c.damage.toFixed(1)} damage received · ${c.kiSpent.toFixed(1)} ki spent`).join(' | ');
  $('.attack-phase').hidden=!['attack','melee'].includes(state);$('.attack-phase').textContent=`SEQUENCE / ${phase.replaceAll('-',' ').toUpperCase()}`;
  watchCatalogRuntime(preview.fighter,$('.inspector-body'),()=>preview.fighter);
});
function status(message,error=false){$('#status').textContent=message;$('.statusbar').classList.toggle('error',error);}
$('#preview-sound').onclick=async()=>{
 const button=$('#preview-sound');
 if(preview.sound.enabled){preview.sound.disable();button.textContent='Sound off';button.setAttribute('aria-pressed','false');status('Preview muted.');return;}
 button.disabled=true;button.textContent='Loading sound…';
 const ready=await preview.sound.enable();button.disabled=false;button.textContent=ready?'Sound on':'Sound unavailable';button.setAttribute('aria-pressed',String(ready));
 status(ready?'Local combat recordings enabled. Play a sequence; pause and scrubbing stay silent. No character dialogue recordings are installed.':'Audio could not start. The preview still works; try Sound again.',!ready);
};
function savedState(){const dirty=history.dirty;$('.save-state').textContent=dirty?'Unsaved draft':hasSaved?'Saved / local':'Shipped default';$('.save-state').classList.toggle('dirty',dirty);$('#undo').disabled=!history.canUndo;$('#redo').disabled=!history.canRedo;}
function roster(){const q=$('.search').value.toLowerCase();$('.count').textContent=ROSTER.length;$('#edit-kit').disabled=!hero.isCustom;$('.roster').innerHTML=ROSTER.filter(d=>(d.name+' '+d.title).toLowerCase().includes(q)).map(d=>`<button class="hero-row" data-hero="${esc(d.id)}" aria-pressed="${d.id===hero.id}"><span class="hero-swatch" style="background:${esc(d.colors.primary)}"></span><span><b>${esc(d.name)}</b><small>${d.isCustom?'Custom · ':''}${esc(d.title)}</small></span></button>`).join('')||'<p class="empty">No matching fighters.</p>';}
function reconciledProfile(def,p){
 const before=Object.keys(p.attacks||{}),attacks=reconcileAttackOverrides(def,p.attacks),kept=new Set(Object.keys(attacks));
 return {profile:{...p,attacks},dropped:before.filter(slot=>!kept.has(slot))};
}
function selectHero(def){let p,dropped=[],saved=false;try{p=loadProfile(def.id);saved=!!p||!!def.isCustom;p||=profileFromDef(def);({profile:p,dropped}=reconciledProfile(def,p));applyProfile(def,p);status(dropped.length?`${def.name} loaded. Dropped stale attack tuning for ${dropped.map(slot=>slot.toUpperCase()).join(', ')} because the ORIGIN attack changed. Saved storage was not overwritten.`:`${def.name} loaded. Saved profiles apply when a game page loads; source files stay unchanged.`);}catch(e){p=profileFromDef(def);applyProfile(def,p);status(e.message,true);}preview.setProfile(def,p);hero=def;hasSaved=saved;if(!def.abilities?.[attackSlot])attackSlot=Object.keys(def.abilities||{})[0]||'';history=new DraftHistory(p);syncCombat();$('.hero-heading').innerHTML=`${esc(hero.name)}<small>${esc(hero.title)} / ${esc(hero.id)}</small>`;roster();inspector();savedState();}
function mutate(path,value,rebuild=false){const p=history.value;if(path.startsWith('environment.'))p.environment??=profileFromDef(hero).environment;let part=p;const keys=path.split('.');for(const k of keys.slice(0,-1))part=part[k];part[keys.at(-1)]=value;try{applyProfile(hero,p);history.push(p);preview.setProfile(hero,p,rebuild);savedState();status('Draft updated. Save local to use it in the next game.');}catch(e){status(e.message,true);inspector();}}
function numeric(path,label,bounds,value,degrees=false){const factor=degrees?180/Math.PI:1,min=degrees?Math.ceil(bounds[0]*factor*10)/10:bounds[0],max=degrees?Math.floor(bounds[1]*factor*10)/10:bounds[1],val=(value*factor).toFixed(degrees?1:2);return `<div class="property"><label>${label}${degrees?' · degrees':''}</label><div class="property-control"><input aria-label="${label}" data-path="${path}" data-factor="${factor}" type="range" min="${min}" max="${max}" step="${degrees?.1:.01}" value="${val}"><input aria-label="${label} value" data-path="${path}" data-factor="${factor}" type="number" min="${min}" max="${max}" step="${degrees?.1:.01}" value="${val}"></div></div>`;}
function attackFingerprint(source){let h=2166136261;for(const char of attackIdentity(source))h=Math.imul(h^char.charCodeAt(0),16777619);return (h>>>0).toString(16).padStart(8,'0');}
function attackNumber(field){const value=String(field.value),unit=field.unit?` <span>· ${esc(field.unit)}</span>`:'',inactive=field.disabled?' disabled':'',description=field.note?` aria-describedby="attack-note-${esc(field.key)}"`:'';return `<div class="property attack-property"><label>${esc(field.label)}${unit}</label><div class="property-control"><input aria-label="${esc(field.label)}" data-attack-key="${esc(field.key)}" type="range" min="${field.min}" max="${field.max}" step="any" data-increment="${field.step}" value="${esc(value)}"${inactive}${description}><input aria-label="${esc(field.label)} value" data-attack-key="${esc(field.key)}" type="number" min="${field.min}" max="${field.max}" step="any" data-increment="${field.step}" value="${esc(value)}"${inactive}${description}></div>${field.note?`<p class="help" id="attack-note-${esc(field.key)}">${esc(field.note)}</p>`:''}<p class="attack-field-error" role="alert" hidden></p></div>`;}
function attackBoolean(field){return `<label class="attack-boolean"><input type="checkbox" data-attack-key="${esc(field.key)}" ${field.value?'checked':''}> <span>${esc(field.label)}</span></label>`;}
function attackEnum(field){return `<div class="property attack-property"><label for="attack-${esc(field.key)}">${esc(field.label)}</label><select id="attack-${esc(field.key)}" data-attack-key="${esc(field.key)}">${field.options.map(option=>`<option value="${esc(option.value)}" ${option.value===field.value?'selected':''}>${esc(option.label)}</option>`).join('')}</select><p class="attack-field-error" role="alert" hidden></p></div>`;}
function attackAuthorship(p){const count=Object.keys(p.attacks?.[attackSlot]?.values||{}).length;return count?`Authored override · ${count} field${count===1?'':'s'}`:hero.isCustom?'ORIGIN kit default':'Shipped default';}
function updateAttackAuthorship(){const el=$('.attack-authorship');if(el)el.textContent=attackAuthorship(history.value);}
function friendlyAttackError(message,key){
 if(['minR','maxR'].includes(key))return 'Minimum radius must be less than maximum radius.';
 if(['dmgMin','dmgMax'].includes(key))return 'Minimum damage must be less than maximum damage.';
 if(['speedMin','speedMax'].includes(key))return 'Minimum speed cannot exceed maximum speed.';
 return message;
}
function focusAttackField(key,type,message=''){
 const field=$(`.attack-fields ${type==='select-one'?'select':''}[data-attack-key="${key}"]${type==='select-one'?'':`[type="${type}"]`}`);if(!field)return;
 if(message){field.setAttribute('aria-invalid','true');const note=field.closest('.attack-property')?.querySelector('.attack-field-error');if(note){note.hidden=false;note.textContent=message;}}
 field.focus();
}
function attackInspector(p){
 const slots=Object.entries(hero.abilities||{}),ability=hero.abilities?.[attackSlot];
 if(!ability&&slots.length){attackSlot=slots[0][0];return attackInspector(p);}
 const source=attackSource(hero,attackSlot),fields=source?attackFields(hero,attackSlot,p.attacks):[];
 const selector=`<div class="property attack-selector"><label for="attack-slot">Attack slot</label><select id="attack-slot" aria-label="Attack slot">${slots.map(([slot,def])=>`<option value="${esc(slot)}" ${slot===attackSlot?'selected':''}>${slot.toUpperCase()} · ${esc(def.name||def.type)}</option>`).join('')}</select></div>`;
 const identity=ability?`<div class="attack-identity"><div><h2>${esc(ability.name||attackSlot.toUpperCase())}</h2><span>${esc(ability.type)}</span></div>${source?`<code title="Exact source identity">attack-v1 · ${attackFingerprint(source)}</code>`:'<code>unsupported source</code>'}</div><p class="attack-authorship">${esc(attackAuthorship(p))}</p>`:'';
 const note='<p class="attack-balance-note">Custom attack tuning is outside ORIGIN point balancing. Preview contact uses production defenses; these controls do not claim the result is balanced.</p>';
 const splitNote=fields.some(field=>field.key==='splitCount')?'<p class="help">Split children require <b>Second press detonates</b>. Zero keeps the ordinary remote burst; 2–8 retires the parent without burst damage and launches ordinary homing children.</p>':'';
 if(!source)return `<h2>Attack tuning</h2><p class="help">Inspect an actual kit slot. Supported attack values rebuild the same Fighter used by players and bots.</p>${selector}${identity}<div class="attack-fields"><p class="attack-unsupported">${esc(ability?.name||attackSlot.toUpperCase())} / ${esc(ability?.type||'empty')} is not tunable here. Supported: beam, projectile, volley, charge, and wall/tank constructs. Other construct forms keep their native timed behavior.</p></div>${note}`;
 const interception=fields.find(field=>field.key==='interceptBullets');
 const traits=fields.filter(field=>field.kind==='boolean'&&field.key!=='interceptBullets');
 const contact=interception?`<div class="attack-booleans">${attackBoolean(interception)}</div><p class="help">Threshold counts paid entry, preparation and sustain ki. Only traveled beam contact absorbs a bullet.</p>`:'';
 const module=naniteSource(source),formationFields=fields.filter(field=>field.key.startsWith('nanite'));
 const renderField=field=>field.kind==='enum'?attackEnum(field):attackNumber(field);
 const gameplay=new Set(['naniteCellHp','naniteRepairDelay','naniteReformTime']);
 const formation=module?`<section aria-label="Nanite formation"><h3>Formation</h3><p class="help">${module.naniteForm==='cannon'?'Forearm cannon · finite sphere launches from the real barrel aperture.':'Segmented forearm shield · only intact cells intercept real contact during native Guard.'} Family comes from Edit power kit, not a profile origin override. Forearm names are anatomical.</p>${formationFields.filter(f=>!gameplay.has(f.key)).map(renderField).join('')}<h4>Integrity & repair · gameplay</h4><p class="help">Integrity, assembly, dimensions and repair affect availability or physical protection. These are unbalanced engineering defaults, not appearance-only Effects settings.</p>${formationFields.filter(f=>gameplay.has(f.key)).map(renderField).join('')}${Object.values(hero.abilities).filter(naniteSource).length===2?'<button id="swap-nanite-forearms">Swap forearms</button><p class="help">Moves both modules in one validated Undo step; each forearm holds one module.</p>':''}</section>`:'';
 const presentation=fields.filter(field=>field.kind==='enum'&&!field.key.startsWith('nanite')).map(attackEnum).join('');
 const constructHelp=source.type==='construct'?`<p class="help">Source-owned ${esc(source.construct)} · entry ${source.cost||0} ki · cooldown ${source.cd||0}s. Resource modes have no lifetime timer; press again to dismiss. Unused rate values stay saved when switching modes.${source.construct==='tank'?' The hull holds to fire. Fixed 14.5u barrel clearance requires target-center distance greater than 14.5 + target radius + 1u from the turret pivot (17.7u for a 2.2u target). Near targets or obstructed lanes suppress fire; the muzzle never moves invisibly.':''}</p>`:'';
 const originHelp=fields.some(field=>field.key==='emissionOrigin')?'<p class="help">Pose choices follow the emitter. Attack origin moves preparation and emission together; combined palms produce one attack, not double damage. Kit default restores the original emitter and pose. Incompatible poses reset to Automatic.</p>':'';
 return `<h2>Attack tuning</h2><p class="help">Edit only values consumed by this production attack. A committed change enters Undo history and rebuilds the live Fighter; local save never edits source files.</p>${selector}${identity}<div class="attack-fields">${formation}${presentation}${constructHelp}${originHelp}${contact}${fields.filter(field=>field.kind==='number'&&!field.key.startsWith('nanite')).map(attackNumber).join('')}${traits.length?`<h3>Attack traits</h3><div class="attack-booleans">${traits.map(attackBoolean).join('')}</div>`:''}</div>${splitNote}<button id="reset-attack" ${p.attacks?.[attackSlot]?'':'disabled'}>Reset attack slot</button>${note}`;
}
const flightLabels={hero:'One-fist lead',twin:'Two-fist spearhead',martial:'BFP arms-back',thruster:'Repulsor stance',hammer:'Weapon-led flight',glider:'Relaxed glide'};
function menu(path,label,values,value){return `<div class="property"><label for="${path}">${label}</label><select id="${path}" data-path="${path}">${values.map(v=>`<option value="${v}" ${v===value?'selected':''}>${path==='model.body'?HERO_BODY_LABELS[v]:path==='model.flightStyle'?flightLabels[v]:v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></div>`;}
function inspector(){const p=history.value;let html='';
 if(tab==='effects')html=`<h2>Energy & constructs</h2><p class="help">Shared gameplay effects. These settings change appearance, never damage or protection. Save local or export with your character.</p>${Object.entries(EFFECT_FIELDS).map(([group,fields])=>`<h3>${group==='shield'?'Reactive shields':group==='charge'?'Charge staging':'Particle constructs'}</h3>${Object.entries(fields).map(([key,field])=>numeric('effects.'+group+'.'+key,field.label,[field.min,field.max],p.effects[group][key])).join('')}`).join('')}<p class="help">Particles form the existing energy shape, then settle into its surface. Zero density keeps the solid construct. Color comes from the power kit.</p><button id="preview-construct" ${Object.values(hero.abilities||{}).some(a=>a.type==='construct')?'':'disabled'}>Preview constructs</button> <button id="preview-shield">Preview shield hits</button><h3>Sound direction</h3><p class="help">Enable Sound in the transport for native combat recordings. The cue brief includes original, unrecorded dialogue candidates for future voice production.</p><button id="audio-cue-brief">Sound & dialogue brief</button>`;
 if(tab==='model')html=`<h2>Form & costume</h2><p class="help">Modular costume shells on the same articulated rig. Proportions keep weapons, knees and ragdolls attached.</p>${menu('model.costume','Costume module',['fitted','martial','plated','tactical'],p.model.costume)}${menu('model.flightStyle','Flight language',['hero','twin','martial','thruster','hammer','glider'],p.model.flightStyle)}<h3>Body proportions</h3>${Object.entries(LIMITS.frame).map(([k,b])=>numeric('frame.'+k,({scale:'Scale',bulk:'Bulk',broad:'Shoulders',head:'Head',neck:'Neck',stance:'Stance'})[k],b,p.frame[k])).join('')}<h3>Palette</h3><div class="colors">${[...Object.keys(p.colors).map(k=>['colors.'+k,k,p.colors[k]]),['model.hairColor','Hair',p.model.hairColor]].map(([path,label,v])=>`<label><input type="color" data-path="${esc(path)}" value="${esc(v)}" aria-label="${esc(label)} color">${esc(label)}</label>`).join('')}</div>`;
 if(tab==='model'){
  html=html.replace('<h3>Body proportions</h3>',`${menu('model.surface','Material surface',['standard','field'],p.model.surface??'standard')}<p class="help">Field: textured primary-color cloth with matte ceramic armor. Standard: original two-color material treatment.</p><h3>Body proportions</h3>`);
  const imported=p.model.body&&p.model.body!=='procedural';
  html=html.replace('<h3>Body proportions</h3>',`${menu('model.body','Body source',HERO_BODIES,p.model.body??'procedural')}<p class="help">${imported?'Source-authored skinned anatomy from <a href="https://quaternius.com/packs/universalbasecharacters.html" target="_blank" rel="noreferrer">Quaternius · CC0 ↗</a>. Fitted suit palette; final gameplay poses, weapons and ragdoll remain authoritative. This is a bundled body, not a custom model upload.':'Procedural anatomy and costume modules. Choose a source-authored superhero body to compare on the same production rig.'}</p><h3>Body proportions</h3>`);
  html+=imported?'<h3>Body surface</h3><p class="help">The source mesh supplies anatomy. Procedural body definition, neck thickness and costume shells are retained in your draft but apply only to Procedural modules.</p>':`<h3>Body surface</h3>${numeric('model.definition','Body definition',[0,1],heroModelOf({id:p.heroId,model:p.model}).definition)}<p class="help">Smooth fabric at 0; sculpted chest, abdomen and back at 1. Changes the body surface, not strength or reach. Transformation forms can override this independently.</p>`;
 }
 if(tab==='model')html+=`<h3>Ground movement</h3>${menu('model.locomotion','Ground locomotion',['authored','procedural'],p.model.locomotion??'authored')}<p class="help">Authored walk, jog and sprint from <a href="https://quaternius.com/packs/universalanimationlibrary.html" target="_blank" rel="noreferrer">Quaternius · CC0 ↗</a>, retargeted to this body and aligned with ground travel. Retreat reverses the source take; it is not a separate imported backstep. Ranged attacks retain this gait while guard, punches and grabs own their combat poses. Choose Ground walk / jog / sprint, or a Beam / Attack sequence with Fighter motion set to Ground, beneath the stage.</p>`;
 if(tab==='model')html+=`<h3>Fighting motion</h3>${menu('model.strikes','Light strike animation',['authored','procedural'],p.model.strikes??'authored')}${menu('model.heavyStrikes','Heavy punch animation',['authored','procedural'],p.model.heavyStrikes??'authored')}<p class="help">Authored jab, cross and heavy hook use licensed CC0 motion, retimed to this fighter’s combat windows. Ground strikes plant a fighting stance; airborne strikes retain superhero legs. The hook includes its recovery. Armed heavy swings and two-person grabs keep their procedural motion. Choose Melee sequence, then Grounded or Airborne beneath the stage.</p>`;
 if(tab==='pose'){const names={armLx:'Left shoulder pitch',armRx:'Right shoulder pitch',armLz:'Left shoulder spread',armRz:'Right shoulder spread',elbowL:'Left elbow',elbowR:'Right elbow',hipL:'Left hip',hipR:'Right hip',kneeL:'Left knee',kneeR:'Right knee',headPitch:'Head pitch'};html=`<h2>${states[pose]} pose</h2><p class="help">Choose a flight motion below the stage to edit its joint targets. Imported ground clips are selected under Model. Combat poses retain priority.</p>${Object.entries(LIMITS.pose).map(([k,b])=>numeric('poses.'+pose+'.'+k,names[k],b,p.poses[pose][k],true)).join('')}`;}
 if(tab==='camera')html=`<h2>Flight camera</h2><p class="help">Raised rear framing keeps your fighter below the aiming area. Lock-on tracks the target's height without a sideways orbit or zoom. FOV is vertical.</p>${Object.entries(LIMITS.camera).map(([k,b])=>numeric('camera.'+k,({fov:'Vertical FOV',range:'Range',height:'Height',shoulder:'Shoulder offset',boostFov:'Boost FOV addition',boostRange:'Boost range addition',cutaway:'Opponent visibility cutaway'})[k],b,p.camera[k]??CAMERA_DEFAULTS[k])).join('')}<p class="help">Cutaway reveals a close locked opponent through only the overlapping part of your fighter. Set to 0 to keep the full foreground body. Walls remain solid.</p><button id="camera-view">Preview game camera</button><h3>Camera preset</h3><p class="help">Replace only these camera values. Model, poses and flight tuning stay unchanged. Undo is available; Save local applies the draft to your next game.</p><button id="camera-preset">Use combat camera preset</button>`;
 if(tab==='flight')html=`<h2>Movement response</h2><p class="help">Frame-rate-independent flight steering. Higher values respond faster. Transition loop previews flight acceleration and braking.</p>${Object.entries(LIMITS.motion).filter(([k])=>k!=='groundSprint').map(([k,b])=>numeric('motion.'+k,({acceleration:'Acceleration',braking:'Braking',boostAcceleration:'Boost acceleration'})[k],b,p.motion[k])).join('')}${hero.archetype==='soldier'?`<h3>Soldier sprint</h3><p class="help">Held Shift multiplies ground speed. Release, crouch, prone, fire or reload returns to combat pace. This never changes airborne boost. Use Play Test to measure travel.</p>${numeric('motion.groundSprint','Sprint speed multiplier',LIMITS.motion.groundSprint,p.motion.groundSprint??1.65)}`:''}<h3>Motion trails</h3><p class="help">World-space boot trails follow your traveled path. Lifetime sets length at speed; zero strength disables them. Use Forward flight or Transition loop.</p>${Object.entries(LIMITS.wake).map(([k,b])=>numeric('wake.'+k,({life:'Trail lifetime',width:'Trail width',intensity:'Trail strength'})[k],b,p.wake[k])).join('')}<button id="cycle-view">Preview transition loop</button>`;
 if(tab==='flight')html+=`<h3>Low-flight surface wake</h3><p class="help">Fast flight lifts sand into a widening wake. Concrete, asphalt and water emit no desert dust. Studio previews a flat sand response; Play Test uses the actual terrain. Speed and height are game units (1u = 0.19m). Zero intensity disables dust independently of boot trails.</p>${Object.entries(LIMITS.surfaceWake).map(([k,b])=>numeric('surfaceWake.'+k,({intensity:'Dust intensity',minSpeed:'Dust minimum speed',maxHeight:'Dust height cutoff',life:'Dust settling time'})[k],b,p.surfaceWake[k])).join('')}`;
 if(tab==='attacks')html=attackInspector(p);
 if(tab==='flight'){
  const env=p.environment??profileFromDef(hero).environment;
  html+=`<h3>Wind and landing resilience</h3><p class="help">Applies in gameplay, not the fixed-pose preview. Mass and resistance reduce wind acceleration. Crouching, prone positioning and shelter improve footing. Fall damage scale 0 makes ordinary falls harmless; combat slams still hurt. Speed is in game units per second. Save local, then choose Tornado or Hurricane in Play Test.</p>${Object.entries(LIMITS.environment).map(([k,b])=>numeric('environment.'+k,({massKg:'Body mass (kg)',windResistance:'Wind resistance',fallSafeSpeed:'Safe landing speed',fallDamageScale:'Fall damage scale'})[k],b,env[k])).join('')}`;
 }
 if(tab==='progression')html=progressionInspector(p,hero,preview.level??1);
 if(tab==='model')html=html.replace('<h3>Palette</h3>',`<h3>Cape</h3><label class="cape-control"><input id="cape-enabled" aria-label="Cape enabled" type="checkbox" ${p.colors.cape?'checked':''}> Enabled</label><h3>Palette</h3>`);
 if(tab==='camera'){
  html+='<button id="camera-frontline">Use front-line close preset</button><p class="help">Closer off-center framing emphasizes the full flying body. The combat preset above restores centered BFP framing. Both retain the same controls.</p>';
  const broadcast=loadBroadcastProfile();
  html+=`<h3>War correspondent</h3><p class="help">Project-wide field-camera direction, separate from your fighter’s chase camera. Applied to new matches in this browser; these settings are not part of a character profile. Recorded action, reporter stand-ups and winner shots appear in the post-match report.</p>${[['crashZoom','Crash zoom',0,1],['handheld','Handheld motion',0,1],['shotHold','Attacker shot hold (seconds)',.6,2.4]].map(([k,label,min,max])=>numeric(k,label,[min,max],broadcast[k]).replaceAll('data-path=','data-broadcast=')).join('')}<button id="broadcast-export">Export camera JSON</button> <button id="broadcast-import">Import camera JSON</button><p class="help">Use Play Test, fight a rival, then finish a match to see the real field footage. Studio’s neutral model stage does not simulate the crew.</p>`;
 }
 if(tab==='model')html+=catalogInspector(assetCatalog,p.model.assets,{loading:catalogLoading,error:catalogError,open:catalogOpen});
 $('.inspector-body').innerHTML=html;
 const catalogDetails=$('.asset-catalog');if(catalogDetails)catalogDetails.ontoggle=()=>{catalogOpen=catalogDetails.open;};
 const catalogRetry=$('#catalog-retry');if(catalogRetry)catalogRetry.onclick=()=>refreshCatalog();
 const motionRetry=$('#catalog-motion-retry');if(motionRetry)motionRetry.onclick=()=>{
  const fighter=preview.fighter;
  loadFighterMotion(fighter);
  watchCatalogRuntime(fighter,$('.inspector-body'),()=>preview.fighter);
 };
 watchCatalogRuntime(preview.fighter,$('.inspector-body'),()=>preview.fighter);
 if(tab==='model'&&p.model.body&&p.model.body!=='procedural')for(const input of document.querySelectorAll('[data-path="model.costume"],[data-path="frame.neck"]')){input.disabled=true;input.title='Applies to procedural modules only; your value is retained.';}
 $('.inspector-body').classList.toggle('attack-panel',tab==='attacks');
 $('.inspector-body').classList.toggle('progression-panel',tab==='progression');
}
function refresh(){preview.setProfile(hero,history.value);syncCombat();inspector();savedState();}
function save(){try{applyProfile(hero,history.value);saveProfile(history.value);hasSaved=true;history.markSaved();savedState();status(`${hero.name} saved in this browser. Source files were not edited; export JSON for a portable backup.`);return true;}catch(e){status(`Not saved: ${e.message}`,true);if($('dialog').open){let alert=$('dialog .error-text');if(!alert){alert=document.createElement('p');alert.className='error-text';alert.setAttribute('role','alert');$('dialog').append(alert);}alert.textContent=`Not saved: ${e.message}`;}return false;}}
function dialog(title,body,actions){const d=$('dialog');d.innerHTML=`<h2 id="dialog-title">${title}</h2>${body}<div class="dialog-actions"><button data-cancel>Cancel</button>${actions.map((a,i)=>`<button data-action="${i}" ${a.primary?'class="primary"':''}>${a.label}</button>`).join('')}</div>`;d.setAttribute('aria-labelledby','dialog-title');d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actions[+b.dataset.action].run(d));d.showModal();return d;}
function guard(next){if(!history.dirty)return next();dialog('Keep your draft?',`<p>${esc(hero.name)} has unsaved changes. Save them locally or discard this draft before continuing.</p>`,[{label:'Discard draft',run:d=>{d.close();next();}},{label:'Save & continue',primary:true,run:d=>{if(save()){d.close();next();}}}]);}
$('.search').oninput=roster;
$('.roster').onclick=e=>{const b=e.target.closest('[data-hero]');if(b&&b.dataset.hero!==hero.id)guard(()=>selectHero(ROSTER.find(d=>d.id===b.dataset.hero)));};
const tabButtons=[...$('.tabs').querySelectorAll('button')];
for(const b of tabButtons){b.id='tab-'+b.dataset.tab;b.setAttribute('aria-controls','inspector-panel');b.tabIndex=b.dataset.tab===tab?0:-1;}
$('.inspector-body').id='inspector-panel';$('.inspector-body').setAttribute('role','tabpanel');$('.inspector-body').setAttribute('aria-labelledby','tab-model');
$('.tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;tabButtons.forEach(x=>{x.setAttribute('aria-selected',x===b);x.tabIndex=x===b?0:-1;});$('.inspector-body').setAttribute('aria-labelledby',b.id);inspector();};
$('.tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=tabButtons.length,i=tabButtons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:n-1))%n;tabButtons[next].focus();tabButtons[next].click();};
$('.inspector-body').addEventListener('change',async e=>{const el=e.target;
 if(el.dataset.catalog){
  const owner=history,snapshot=JSON.stringify(history.value),epoch=++catalogSelectionEpoch;
  try{
   el.disabled=true;
   const p=await prepareCatalogSelection(history.value,el.dataset.catalog,el.value);
   if(epoch!==catalogSelectionEpoch||history!==owner||JSON.stringify(history.value)!==snapshot)return;
   applyProfile(hero,p);history.push(p);preview.setProfile(hero,p,true);savedState();inspector();
   document.querySelector(`[data-catalog="${el.dataset.catalog}"]`)?.focus();
   status('Asset reference updated. Save local or export to keep this selection. Package fit and motion still need inspection.');
  }catch(error){if(epoch===catalogSelectionEpoch&&history===owner){status(error.message,true);inspector();}}
  finally{if(el.isConnected)el.disabled=false;}
  return;
 }
 if(el.dataset.broadcast){
  if(!el.value.trim()||!el.checkValidity()){status('Enter a camera value within the displayed range.',true);return;}
  try{saveBroadcastProfile({...loadBroadcastProfile(),[el.dataset.broadcast]:Number(el.value)});el.closest('.property-control').querySelectorAll('input').forEach(input=>input.value=el.value);status('Field camera saved for new matches. Fighter camera and character draft are unchanged.');}
  catch(error){status(`Field camera not saved: ${error.message}`,true);}return;
 }
 if(el.dataset.unlock){mutate('progression.unlocks.'+el.dataset.unlock,Number(el.value));inspector();return;}
 if(el.id==='attack-slot'){
  attackSlot=el.value;const ability=hero.abilities[attackSlot];let note='';
  if(['beam','attack'].includes(preview.state)){
   if(attackSource(hero,attackSlot)){
    if(preview.state==='beam'&&ability.type!=='beam'){setState('attack');note=' Switched to Attack sequence for this attack.';}
    else{preview.setCombat({slot:attackSlot});syncCombat();}
   }else{setState('hover');note=' This attack is not supported by the preview; the previous attack sequence stopped.';}
  }
  inspector();$('#attack-slot').focus();status(`${ability.name} selected.${note} Draft data is unchanged.`);return;
 }
 if(el.dataset.attackKey){
  const isNumber=el.type==='range'||el.type==='number',key=el.dataset.attackKey,type=el.type;
  if(isNumber&&(!el.value.trim()||!el.checkValidity()||!Number.isFinite(Number(el.value)))){
   const message=`Enter ${el.getAttribute('min')}–${el.getAttribute('max')} for ${el.getAttribute('aria-label').replace(' value','')}.`;
   status(message,true);inspector();focusAttackField(key,type,message);return;
  }
  const p=history.value,value=el.type==='checkbox'?el.checked:isNumber?Number(el.value):el.value;
  try{
   const currentPose=attackFields(hero,attackSlot,p.attacks).find(field=>field.key==='castStyle');
   const resetPose=['faceOrigin','chest'].includes(key)&&currentPose&&currentPose.value!=='auto';
   const patch={[key]:value,...(resetPose?{castStyle:'auto'}:{})};
   p.attacks=setAttackOverride(p.attacks,hero,attackSlot,patch);applyProfile(hero,p);history.push(p);preview.setProfile(hero,p,true);savedState();syncCombat();
   // Re-render from public metadata so derived defaults (beam burst radius/damage)
   // cannot lag behind the committed source fields. Restore the same editing affordance.
   inspector();focusAttackField(key,type);
   status(`${hero.abilities[attackSlot].name} updated in the draft.${resetPose?' Emitter changed; attack pose reset to Automatic.':''} Save local to install it on the next game load.`);
  }catch(error){const message=friendlyAttackError(error.message,key);status(error.message,true);inspector();focusAttackField(key,type,message);}
  return;
 }
 if(el.id==='cape-enabled'){const p=history.value;if(el.checked)p.colors.cape=p.colors.primary;else delete p.colors.cape;history.push(validateProfile(p));refresh();$('#cape-enabled').focus();status('Cape updated in draft. Save local to apply.');return;}
 if(!el.dataset.path)return;
 if(el.dataset.path==='model.flightStyle'){const style=el.value;el.value=history.value.model.flightStyle;dialog('Replace the flight pose family?','<p>This installs all seven default poses for the selected flight language. Your custom joint targets are replaced in the draft. Undo can restore them.</p>',[{label:'Replace pose family',primary:true,run:d=>{history.push(resetFlightStyle(history.value,style));d.close();refresh();}}]);return;}
 const isNumber=el.type==='range'||el.type==='number';if(isNumber&&!el.checkValidity()){status('Enter a value inside the displayed range.',true);return;}mutate(el.dataset.path,isNumber?Number(el.value)/(+el.dataset.factor||1):el.value,/^(frame|colors|model|effects)\./.test(el.dataset.path));if(isNumber)el.closest('.property-control').querySelectorAll('input').forEach(input=>input.value=el.value);
 if(el.dataset.path==='model.body'){inspector();$('[data-path="model.body"]').focus();}
});
$('.inspector-body').addEventListener('input',e=>{if(e.target.type==='range'){const el=e.target;el.closest('.property-control').querySelector('[type=number]').value=el.value;}});
function openForm(previousLevel=null){
 const d=dialog(previousLevel?'Edit transformation form':'Add transformation form',formDialogBody(history.value,previousLevel),[{label:'Apply to draft',primary:true,run:d=>{
  const form=d.querySelector('form');if(!form.reportValidity())return;
  try{const next=editForm(history.value,Object.fromEntries(new FormData(form)),previousLevel);history.push(next);d.close();refresh();status('Transformation added to the draft. Choose its preview level to inspect it; Save local to use it in game.');$('#add-form').focus();}
  catch(error){d.querySelector('.error-text').textContent=error.message;}
 }}]);
 d.querySelector('form').onsubmit=e=>{e.preventDefault();d.querySelector('[data-action]').click();};
}
$('.inspector-body').addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.id==='audio-cue-brief'){
  const wasPlaying=preview.playing;preview.playing=false;
  const d=dialog('Sound & dialogue direction',`<p>Each cue identifies the attack, its phase and when the sound belongs. Local combat recordings are available now; <strong>Direction only</strong> means the dedicated sound is not produced or wired. Reading this brief never plays audio.</p><p class="help">Enable Sound in the transport, then Play to hear native combat. Scrub, pause and reset never replay historical sounds.</p><details open><summary>Combat cue sheet · ${AUDIO_CUES.length} events</summary>${AUDIO_CUES.map(c=>`<h3>${esc(c.label)}</h3><p><strong>${esc(c.attackType)}</strong> · ${esc(c.phase)} · ${esc(c.playback)}<br><small>${c.status==='native'?'Native cue / lifecycle':'Direction only · not recorded'}</small></p><p><strong>When:</strong> ${esc(c.timing)}</p><p><strong>Sound:</strong> ${esc(c.direction)}</p><p class="help">Event: ${esc(c.event)}<br>Native: ${esc(c.method)} · ${esc(c.source)}</p>`).join('')}</details><details><summary>Beam reference sound directions · 2 families</summary><p class="help">Direction only: these are sound-production briefs inspired by the supplied stills, not recordings from those games or new selectable audio presets.</p>${BEAM_SOUND_DIRECTIONS.map(p=>`<h3>${esc(p.label)}</h3><p>${esc(p.visual)}</p>${Object.entries(p.phases).map(([phase,direction])=>`<p><strong>${esc(phase)}:</strong> ${esc(direction)}</p>`).join('')}`).join('')}</details><details><summary>Original dialogue candidates · not recorded</summary>${DIALOGUE_CANDIDATES.map(c=>`<p><strong>${esc(c.personality)}</strong> / ${esc(c.event)}<br>“${esc(c.line)}”</p>`).join('')}</details><p class="help">Future voices, nanite granules and bespoke shield fracture sounds still need production. AAI provider details are pending; no paid service is connected.</p>`,[{label:'Export sound brief',run:()=>{
   const url=URL.createObjectURL(new Blob([JSON.stringify(audioCuePackage(),null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='lsw-sound-direction-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }}]);
  d.addEventListener('close',()=>{preview.playing=wasPlaying;button.focus();},{once:true});return;
 }
 if(button.id==='preview-construct'){
  const slot=Object.entries(hero.abilities||{}).find(([,a])=>a.type==='construct')?.[0];
  if(!slot)return;preview.combat.slot=slot;preview.combat.secondarySlot=null;preview.combat.pattern='target';preview.combat.shooterMotion='ground-forward';preview.combat.motion='static';preview.combat.elevation=0;
  attackSlot=slot;setState('attack');setView('orbit');status('Native construct rehearsal. Assembly, action and cleanup use the production ability.');return;
 }
 if(button.id==='preview-shield'){
  preview.combat.meleeSequence='block';preview.combat.meleeStage='grounded';$('#melee-sequence').value='block';$('#melee-stage').value='grounded';setState('melee');setView('orbit');status('Incoming punch uses real guard chip and localized shield contact.');return;
 }
 if(button.id==='broadcast-export'){
  const url=URL.createObjectURL(new Blob([JSON.stringify(broadcastPackage(loadBroadcastProfile()),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='lsw-broadcast-camera-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Field-camera package exported. Character profile is unchanged.');
 }
 if(button.id==='broadcast-import'){
  const d=dialog('Import field-camera direction','<label>Camera JSON<textarea id="broadcast-json" rows="9" aria-label="Camera JSON" placeholder="Paste an exported LSW broadcast-camera package"></textarea></label><p class="error-text" role="alert"></p>',[{label:'Import camera',primary:true,run:d=>{
   try{saveBroadcastProfile(importBroadcastProfile(JSON.parse(d.querySelector('textarea').value)));d.close();inspector();status('Field-camera settings imported for new matches.');}
   catch(error){d.querySelector('.error-text').textContent=error.message;}
  }}]);d.querySelector('textarea').focus();
 }
 if(button.id==='add-form')openForm();
 if(button.dataset.editForm)openForm(button.dataset.editForm);
 if(button.dataset.removeForm){const level=button.dataset.removeForm;dialog('Remove this transformation?',`<p>Remove the level ${level} appearance from this draft. Other forms and attack unlocks stay unchanged. Undo can restore it.</p>`,[{label:'Remove form',run:d=>{const p=history.value;delete p.progression.forms[level];history.push(validateProfile(p));d.close();refresh();$('#add-form').focus();status('Transformation removed from draft. Undo is available.');}}]);}
});
$('#preview-level').onchange=e=>{preview.setLevel(Number(e.target.value));if(tab==='progression')inspector();status(`Preview level ${preview.level}. Attack gates and authored forms are active; match starting level is unchanged.`);};
$('.inspector-body').onclick=e=>{if(e.target.id==='camera-view')setView('game');if(e.target.id==='cycle-view'){setState('cycle');setView('game');}
 if(e.target.id==='swap-nanite-forearms'){try{const p=preview.swappedNaniteProfile(history.value);history.push(p);refresh();$('#swap-nanite-forearms').focus();status('Both forearms swapped in one draft step. Undo or Save local.');}catch(error){status(error.message,true);}return;}
 if(e.target.id==='camera-frontline'){dialog('Use front-line close framing?','<p>Replace only the camera in this draft. Character geometry, poses and controls stay unchanged. Undo restores the previous camera.</p>',[{label:'Apply close framing',primary:true,run:d=>{history.push(resetCamera(history.value,'frontline'));d.close();refresh();setView('game');$('#camera-frontline').focus();status('Front-line camera added to draft. Save local to use it in your next game.');}}]);return;}
 if(e.target.id==='reset-attack'){try{const p=history.value;p.attacks=resetAttackOverride(p.attacks,attackSlot);applyProfile(hero,p);history.push(p);preview.setProfile(hero,p,true);inspector();savedState();syncCombat();$('#reset-attack').focus();status(`${hero.abilities[attackSlot].name} restored to its ${hero.isCustom?'ORIGIN kit':'shipped'} default in the draft.`);}catch(error){status(`Not reset: ${error.message} Use Swap forearms to move an equipped pair together.`,true);}}
 if(e.target.id==='camera-preset'){dialog('Use the combat camera preset?','<p>Replace only the camera values in this draft. Your model, poses and flight tuning stay unchanged. Undo can restore your previous camera.</p>',[{label:'Apply camera preset',primary:true,run:d=>{history.push(resetCamera(history.value));d.close();refresh();setView('game');$('#camera-preset').focus();status('Combat camera added to draft. Save local to use it in your next game.');}}]);}};
function syncViewControls(){
 const v=preview.view,solo=preview.isolated;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));
 $('#isolate-fighter').checked=solo;$('#isolate-fighter').disabled=!preview.isCombat||v==='game';
 $('.inspection-focus').title=v==='game'?'Choose Orbit, Front, Side or Rear to inspect the fighter alone':!preview.isCombat?'Only one fighter is present':'Hide the rendered opponent; combat simulation continues';
 $('.view-tag').textContent=(solo?'ISOLATED FIGHTER / ':'LIVE ENGINE / ')+v.toUpperCase();
 $('.viewport-note').textContent=solo?'Opponent hidden for inspection · combat still simulated':v==='game'?'BFP reference framing · Play Test for mouse-look and flight controls':v==='orbit'?'Drag to orbit · Scroll to frame · Model inspection':'Model inspection · Choose Game camera for flight framing';
}
function setView(v){preview.setView(v);syncViewControls();}
$('#isolate-fighter').onchange=e=>{preview.setIsolated(e.target.checked);syncViewControls();status(preview.isolated?'Selected fighter isolated. The opponent still attacks and receives hits; saved character data is unchanged.':'Full encounter restored. Saved character data is unchanged.');};
$('.view-controls').onclick=e=>{if(e.target.dataset.view)setView(e.target.dataset.view);};
function syncCombat(){
 $('#melee-style').textContent=`${hero.name} · Strength ${hero.strength??5}/10 · ${styleOf(hero).name||styleOf(hero).n||'Martial style'} · light/heavy access follows the character’s martial art.`;
 const all=Object.entries(preview.fighter?.slots||{}),beams=all.filter(([,s])=>s.def.type==='beam'),attacks=all.filter(([,s])=>supportsAttackRehearsal(s.def));
 $('#state option[value="beam"]').disabled=!beams.length;$('#state option[value="attack"]').disabled=!attacks.length;
 if(['beam','attack'].includes(preview.state)){
  const compatible=preview.state==='beam'?beams:attacks;
  if(compatible.some(([key])=>key===attackSlot)){
   if(preview.combat.slot!==attackSlot)preview.setCombat(selectionPatch(attackSlot,preview.combat.secondarySlot));
  }else if(preview.combat.slot){
   // Entering a narrower sequence can select a different valid slot. Its
   // inspector must follow the production preview before any edit is offered.
   attackSlot=preview.combat.slot;if(tab==='attacks')inspector();
  }
 }
 const slots=preview.combat.slots;
  $('#combat-slot').innerHTML=slots.map(([key,s])=>`<option value="${key}">${esc(s.def.name)} / ${key.toUpperCase()}</option>`).join('');
  $('#combat-slot').value=preview.combat.slot;
 $('#combat-secondary').innerHTML='<option value="">None</option>'+slots.filter(([key])=>key!==preview.combat.slot).map(([key,s])=>`<option value="${key}" ${preview.combat.naniteEncounter&&!naniteSource(s.def)?'disabled':''}>${esc(s.def.name)} / ${key.toUpperCase()}</option>`).join('');
 $('#combat-secondary').value=preview.combat.secondarySlot||'';
 $('#shooter-motion').value=preview.combat.shooterMotion;
 $('#target-hero').value=preview.combat.targetHero;$('#target-motion').value=preview.combat.motion;
 $('#target-speed').min=preview.combat.pressureEncounter?'20':'10';$('#target-speed').value=String(preview.combat.targetSpeed);
 const ground=preview.combat.shooterMotion.startsWith('ground-'),airTravel=preview.combat.shooterMotion.startsWith('air-');
 $('#target-elevation').min=ground?'0':'-75';$('#target-elevation').value=String(preview.combat.elevation);
 const targetNote=preview.combat.motion==='static'?'Stationary target':`${TARGET_MOTIONS[preview.combat.motion]} · scripted path`;
 $('#encounter-note').textContent=ground?`${targetNote} · fighter travels and returns on the floor · target path holds its starting height · preview only`:`${targetNote} · optional sound · measured contact, not a balance test`;
 if(airTravel)$('#encounter-note').textContent=`${targetNote} · airborne travel and return · anchored target height · pose rehearsal, not gameplay flight permission`;
 const attackMode=preview.state==='attack',selected=preview.fighter?.slots?.[preview.combat.slot]?.def;
 const resource=preview.combat.resourceEncounter;
 const nanite=preview.combat.naniteEncounter,punch=nanite&&preview.combat.naniteSample==='punch';
 const constructStage=attackMode&&[selected,preview.fighter?.slots?.[preview.combat.secondarySlot]?.def].some(def=>def?.type==='construct');
 $('#target-elevation').disabled=constructStage||punch;
 $('#target-distance').disabled=punch;$('#target-motion').disabled=punch;$('#target-speed').disabled=punch||preview.combat.motion==='static';
 $('#target-defense-control').hidden=nanite||resource||preview.combat.pattern!=='target';$('#target-defense').value=preview.combat.targetDefense;
 $('#shooter-motion').disabled=punch;
 if(constructStage){$('#target-elevation').value='0';$('#encounter-note').textContent='Ground-anchored native constructs · scripted inspection path · actual contact and cleanup';}
 if(preview.combat.pressureEncounter){$('#target-elevation').disabled=true;$('#shooter-motion').disabled=true;$('#encounter-note').textContent='Ground pressure rehearsal · 2–6s advance command, stop near caster · real movement, push, damage and guard · autohealed measurement defender, no AI. Speed is a wish bounded by native movement (minimum 20u/s), not a forced path.';}
 $('#construct-start-control').hidden=!resource;$('#construct-start-ki').disabled=!resource||preview.fighter.energyInfinite;
 $('#construct-start-ki').max=String(preview.fighter.maxKi);$('#construct-start-ki').value=String(preview.fighter.energyInfinite?preview.fighter.maxKi:Math.min(preview.fighter.maxKi,preview.combat.startingKi??preview.fighter.maxKi));
 $('#construct-core').textContent=preview.fighter.energyInfinite?'∞ core · pinned at maximum':'finite owner pool';
 $('#combat-kind').textContent=attackMode?'Attack':'Beam';$('#combat-slot').setAttribute('aria-label',attackMode?'Preview attack':'Preview beam');
 const canCharge=[selected,preview.fighter?.slots?.[preview.combat.secondarySlot]?.def].some(def=>def?.type==='charge'||(def?.type==='beam'&&def.charge));$('#charge-hold').disabled=!canCharge||nanite;$('#charge-hold').value=String(preview.combat.chargeHold);
 $('#contact-test-control').hidden=!attackMode||resource;$('#opposing-priority-control').hidden=!attackMode||resource||preview.combat.pattern!=='priority';
 $('#contact-test').value=preview.combat.pattern;$('#opposing-priority').value=String(preview.combat.opposingPriority);
 $('#contact-test option[value="nanite"]').disabled=!naniteSelection(preview.fighter,preview.combat.slot,preview.combat.secondarySlot);
 $('#contact-test option[value="reload"]').disabled=selected?.type!=='rifle'||!(selected.magazine>0);
 $('#nanite-sample-control').hidden=!nanite;$('#nanite-sample').value=preview.combat.naniteSample;
 for(const option of $('#nanite-sample').options)option.disabled=![preview.combat.slot,preview.combat.secondarySlot].some(key=>naniteSource(preview.fighter.slots[key]?.def)?.naniteForm===(option.value==='punch'?'shield':option.value));
 $('#opposing-priority').disabled=preview.combat.pattern!=='priority';
 $('.timeline').max=String(preview.duration);
 if(preview.combat.reloadEncounter){
  $('#attack-sequence-note').textContent=`Half-used magazine (inspection setup) → 0.6s reload → eject at 20% → insert at 65% → chamber at 90% → recover. Duration ${selected.reloadTime??2.2}s; production ammo and sound phases.`;
  $('#encounter-note').textContent='Reload inspection · no target fire · choose ground movement to check the armed stride · edit Reload duration in Attacks and Save local';
 }
 else if(selected?.remoteDetonate){
  const charged=selected.type==='charge'||(selected.type==='beam'&&selected.charge),launch=usesThrowAction(preview.fighter,selected)?`0.6s prepare → ${selected.throwWindup??.38}s wind-up → hand release`:charged?`0.6s charge start → ${preview.combat.chargeHold.toFixed(1)}s hold → release`:'0.6s fire';
  $('#attack-sequence-note').textContent=selected.splitCount>=2?`${launch} → live shot arms → second press after 0.18s splits at its actual position into ${selected.splitCount} ordinary homing children → contact or expire`:`${launch} → live shot arms → second press after 0.18s detonates the production shot before ordinary contact → recover`;
 }
 else if(selected?.type==='charge'){$('#attack-sequence-note').textContent=`0.6s charge start → ${preview.combat.chargeHold.toFixed(1)}s hold (${Math.round(Math.min(1,preview.combat.chargeHold/(selected.maxCharge||2.2))*100)}% of ${selected.maxCharge||2.2}s authored maximum) → release → recover`;}
 else if(selected?.type==='volley')$('#attack-sequence-note').textContent='0.6s start → repeat with production cooldowns → 2.2s release → recover';
 else if(selected?.type==='projectile')$('#attack-sequence-note').textContent=usesThrowAction(preview.fighter,selected)?`0.6s prepare → ${selected.throwWindup??.38}s wind-up → hand release → ${selected.throwRecovery??.32}s recovery. Grenade continues to contact or timeout.`:'0.6s press → one production projectile → contact or timeout → recover';
 else if(selected?.type==='construct')$('#attack-sequence-note').textContent=`0.6s assemble → ${selected.holdTrigger?'2.4s release':(.7+(selected.cd||0)).toFixed(1)+'s second press after native cooldown'} → native construct action → dissolve. Ground-anchored rehearsal.`;
 else $('#attack-sequence-note').textContent='0.6s fire → charged beams use the displayed hold → 4.6s stop fire → recover';
 if(attackMode&&preview.combat.pattern!=='target'&&!preview.combat.reloadEncounter&&!resource&&!nanite){
  $('#encounter-note').textContent='Scripted opposing fire · real collision results · test settings are not saved to the character';
  $('#attack-sequence-note').textContent=preview.combat.pattern==='priority'?
   'Opponent fires at your release. Both shots must enable priority: higher survives, equal cancel. −1 is off. Remote second press is disabled for this contact test.':
   'Eight ballistic rounds follow your release. Only an enabled, sufficiently invested beam absorbs them on contact. Remote second press is disabled for this contact test.';
 }
 if(preview.combat.secondarySlot&&!nanite)$('#encounter-note').textContent+=' · Co-fire uses a normal trigger at 0.6s; no remote second press. Contact includes both; nominal/phase describe the primary with named co-fire resource failures.';
 if(resource){
   const tank=preview.combat.resourceStats().constructs.some(c=>c.kind==='tank');
   $('#encounter-note').textContent='8-second resource inspection, not a lifetime limit · native regeneration and shared owner budget · starting ki is rehearsal-only.'+(tank?' For a clear cannon inspection, set Target distance to 60u. Close targets inside fixed barrel clearance and obstructed lanes suppress firing.':'')+(preview.combat.secondarySlot?' Both selected attacks share the owner pool; any timed co-fire is only partially inspected.':'');
   $('#attack-sequence-note').textContent='0.6s assemble → '+(tank?'1s ground travel → ':'')+'2.5s native incoming shot at each live proxy → '+(tank?'3s hold and acquire → ':'')+'6s native dismissal press → empty by 8s. Accepted construct hits below are separate from humanoid HP damage above.';
 }
 if(nanite){
  $('#encounter-note').textContent='8-second native nanite inspection · finite owner HP; real KO stops the script · incoming hostile and outgoing autohealed measurement dummy are separate. '+(punch?'Native light punch from a 4.8u close-contact start; distant path controls are inactive.':'Precision 30-damage, 0.035u-radius ballistic fixture travels from the current cell; moving geometry can miss. Native movement limits apply to the selected path intent.');
  $('#attack-sequence-note').textContent='Assemble → 0.8–1.5s paid cannon → Guard 2–3.9s / incoming emitted 2.4s → quiet + reform → fresh cannon 4.2–5s → unguarded shield toggles 6 / 6.3s → ordnance cleared at 8s. Authored timing may deny shots. Module life is not limited to 8s; seek reconstructs semantic state, not identical fragment seeds.';
 }
 if(!slots.length&&['beam','attack'].includes(preview.state))setState('hover');
 syncViewControls();
}
function selectionPatch(slot,secondarySlot,pattern=preview.combat.pattern,naniteSample=preview.combat.naniteSample){
 if(secondarySlot===slot)secondarySlot=null;
 if(pattern==='nanite'&&!naniteSelection(preview.fighter,slot,secondarySlot))pattern='target';
 const d=preview.fighter.slots[slot]?.def;if(pattern==='reload'&&(d?.type!=='rifle'||!(d.magazine>0)))pattern='target';
 const forms=[slot,secondarySlot].map(key=>naniteSource(preview.fighter.slots[key]?.def)?.naniteForm);
 if(!forms.includes(naniteSample==='punch'?'shield':naniteSample))naniteSample=forms.includes('shield')?'shield':'cannon';
 return {slot,secondarySlot,pattern,naniteSample};
}
function setState(s){$('#state').value=s;preview.setState(s);if(Object.hasOwn(history.value.poses,s))pose=s;if(tab==='pose')inspector();syncCombat();
 const combat=['beam','attack'].includes(s);$('.combat-controls').hidden=!combat;
 $('.melee-controls').hidden=s!=='melee';
 $('.viewport-note').textContent=s==='melee'?'Production melee · actual contact and recovery':combat?'Production attacks · fixed volley spread seed · measurement target':'Drag to orbit · Scroll to frame · Actual game rig, materials and flight poses';
 if(combat||s==='melee')setView('game');else setView(preview.view);
}
$('#melee-sequence').onchange=e=>{preview.combat.meleeSequence=e.target.value;preview.seek(0);status('Melee rehearsal restarted. The character’s saved data is unchanged.');};
$('#melee-stage').onchange=e=>{preview.combat.meleeStage=e.target.value;preview.seek(0);status('Melee stage changed for rehearsal only. Saved character data is unchanged.');};
$('.combat-controls').onchange=e=>{
 const reject=()=>{
  $('#target-motion').value=preview.combat.motion;$('#combat-slot').value=preview.combat.slot;$('#charge-hold').value=String(preview.combat.chargeHold);
  $('#combat-secondary').value=preview.combat.secondarySlot||'';
  $('#shooter-motion').value=preview.combat.shooterMotion;
  $('#contact-test').value=preview.combat.pattern;$('#opposing-priority').value=String(preview.combat.opposingPriority);
  $('#nanite-sample').value=preview.combat.naniteSample;
  $('#construct-start-ki').value=String(Math.min(preview.fighter.maxKi,preview.combat.startingKi??preview.fighter.maxKi));
  status('Use the displayed ranges: speed 10–210 u/s, elevation −75° to 75° (0° to 75° on the ground), distance 12–60 units, charge hold 0.2–30 seconds, whole-number opponent priority −1 to 16, starting ki 0 to the owner maximum.',true);
 };
 const shooterMotion=$('#shooter-motion').value,raiseTarget=e.target.id==='shooter-motion'&&shooterMotion.startsWith('ground-')&&Number($('#target-elevation').value)<0;
 if(raiseTarget)$('#target-elevation').value='0';
 if(['#target-speed','#target-elevation','#target-distance','#charge-hold','#opposing-priority','#construct-start-ki'].some(s=>!$(s).disabled&&(!$(s).value.trim()||!$(s).checkValidity()))){reject();return;}
 const motion=$('#target-motion').value;
 const selection=selectionPatch($('#combat-slot').value,$('#combat-secondary').value||null,$('#contact-test').value,$('#nanite-sample').value);
 if(!preview.setCombat({...selection,targetHero:$('#target-hero').value,targetDefense:$('#target-defense').value,elevation:+$('#target-elevation').value,distance:+$('#target-distance').value,motion,shooterMotion,targetSpeed:+$('#target-speed').value,chargeHold:+$('#charge-hold').value,opposingPriority:+$('#opposing-priority').value,startingKi:e.target.id==='construct-start-ki'?+$('#construct-start-ki').value:Math.min(preview.fighter.maxKi,preview.combat.startingKi??preview.fighter.maxKi)})){reject();return;}
 if(e.target.id==='combat-slot'&&['beam','attack'].includes(preview.state)){attackSlot=preview.combat.slot;if(tab==='attacks')inspector();}
 $('#target-speed').disabled=motion==='static';
 $('#encounter-note').textContent=motion==='static'?'Stationary target · optional sound · measured contact, not a balance test':`${TARGET_MOTIONS[motion]} · scripted path, no AI or knockback travel · scrub to inspect the crossing`;
 syncCombat();
 status(`${SHOOTER_MOTIONS[shooterMotion]} / ${TARGET_MOTIONS[motion]} preview updated.${raiseTarget?' Target elevation raised to 0° to stay above the floor.':''} Saved character data is unchanged.`);
 if(preview.view!=='game')preview.setView(preview.view);
};
$('#state').onchange=e=>setState(e.target.value);
$('#preview-rate').onchange=e=>{if(preview.setPlaybackRate(Number(e.target.value)))status(`${e.target.value==='1'?'Normal':'Quarter'}-speed transport. Native simulation steps are unchanged; rate is not saved.`);};
function play(){preview.playing=!preview.playing;$('#play').textContent=preview.playing?'Pause':'Play';$('#play').setAttribute('aria-label',preview.playing?'Pause preview':'Play preview');}
$('#play').onclick=play;$('.timeline').oninput=e=>{if(preview.playing)play();preview.seek(+e.target.value);};
$('.reference-toggle').onclick=e=>{const show=$('.references').hidden;$('.references').hidden=!show;e.target.setAttribute('aria-expanded',show);};
$('#undo').onclick=()=>{history.undo();refresh();};$('#redo').onclick=()=>{history.redo();refresh();};$('#save').onclick=save;
$('#playtest').onclick=()=>guard(()=>{approvedNavigation=true;location.href=`./powerworld.html?hero=${encodeURIComponent(hero.id)}`;});
let libraryWasPlaying=false;
mountBeamLibrary({button:$('#beam-library-open'),roster:ROSTER,load:loadProfile,
 draft:()=>({heroId:hero.id,attacks:history.value.attacks,dirty:history.dirty,saved:hasSaved}),
 onOpen:()=>{libraryWasPlaying=preview.playing;if(preview.playing)play();},
 onClose:()=>{if(libraryWasPlaying&&!preview.playing)play();},
 onTune:row=>{
  const tune=()=>{
   if(row.heroId!==hero.id)selectHero(ROSTER.find(def=>def.id===row.heroId));
   attackSlot=row.slot;preview.setCombat({slot:row.slot,secondarySlot:null,pattern:'target'});setState('beam');
   $('[data-tab="attacks"]').click();$('#attack-slot')?.focus();
   status(`${row.heroName} / ${row.name}: tune the attack, then play its production beam sequence. Save local to keep edits.`);
  };
  if(row.heroId===hero.id)tune();else guard(tune);
 }
});
$('#export').onclick=()=>{try{const record=hero.isCustom?loadCustoms().find(c=>c.def.id===hero.id):null;
 applyProfile(hero,history.value);
 const data=hero.isCustom?exportCharacter(record,history.value):history.value;
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=hero.id+(hero.isCustom?'-character-v1.json':'-studio-v1.json');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(hero.isCustom?'Character package exported: ORIGIN recipe, presentation and compatible attack overrides. Local save state is unchanged; source files were not edited.':'Studio profile exported: model, poses, camera, flight and compatible attack overrides. Shipped source files are not included or edited.');}catch(e){status(`Not exported: ${e.message}`,true);}};
$('#reset').onclick=()=>dialog('Reset this hero?',`<p>Remove ${esc(hero.name)}’s saved Studio profile and restore its ${hero.isCustom?'ORIGIN kit':'shipped'} model, poses, camera, flight and attack values. Other fighters and ORIGIN recipes are untouched. Export first if you want a backup.</p>`,[{label:'Reset hero',run:d=>{try{removeProfile(hero.id);d.close();selectHero(hero);}catch(e){status(e.message,true);}}}]);
$('#import').onclick=()=>{const d=dialog('Import a character or profile','<p>Character packages create a new local fighter with powers, attack overrides and presentation. Version 1 Studio profiles update an existing fighter’s draft only. Maximum 100 KB.</p><input id="profile-file" type="file" accept=".json,application/json" aria-label="Profile file"><label for="profile-json">Profile JSON</label><textarea id="profile-json" maxlength="100000" spellcheck="false"></textarea><div id="import-error" class="error-text" role="alert"></div>',[{label:'Import profile',primary:true,run:d=>{try{
 const raw=$('#profile-json').value;if(raw.length>100000)throw new Error('File exceeds 100 KB.');
 const data=JSON.parse(raw);
 if(data.format==='lsw-character'){
  const pack=validateCharacter(data);applyProfile(buildDef(pack.picks,pack.sourceId),pack.profile);d.close();guard(()=>{
   try{const rec=importCharacter(pack,ROSTER);$('.search').value='';selectHero(rec.def);status('Character imported and saved locally as a new copy. Ready to edit or Play Test.');}
   catch(e){status('Not imported: '+e.message,true);}
  });return;
 }
 let p=validateProfile(data);const def=ROSTER.find(x=>x.id===p.heroId);if(!def)throw new Error('Hero is not installed. Import its character package or create its power kit first.');
 const reconciled=reconciledProfile(def,p);p=reconciled.profile;
 applyProfile(def,p);
 d.close();guard(()=>{selectHero(def);history.push(p);refresh();status(reconciled.dropped.length?`Imported into draft. Dropped stale attack tuning for ${reconciled.dropped.map(slot=>slot.toUpperCase()).join(', ')}; imported source identity did not match the current ORIGIN kit.`:'Imported into draft. Review presentation and attack overrides, then Save local.');});
 }catch(e){$('#import-error').textContent=e.message;}}}]);
 d.querySelector('#profile-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw new Error('File exceeds 100 KB.');$('#profile-json').value=await file.text();$('#import-error').textContent='';}catch(err){$('#import-error').textContent=err.message;}};
};
let creator;
async function openCreator(edit=false){
 try{
  // Resolve Save/Discard before opening ORIGIN. Preserve an imported package's embedded
  // presentation when ORIGIN rebuilds its gameplay definition from the editable recipe.
  if(edit){selectHero(hero);saveProfile(history.value);}
  const rec=edit?loadCustoms().find(c=>c.def.id===hero.id):null;
  if(edit&&!rec)throw Error('This character has no editable ORIGIN recipe.');
  const {CreatorUI}=await import('../engine/creatorUI.js');creator||=new CreatorUI(ROSTER);
  const wasPlaying=preview.playing;preview.playing=false;
  const restore=()=>{preview.playing=wasPlaying;$('#new-character').focus();};
  creator.show({edit:rec,presentationEditor:edit,onCancel:restore,onDone:(def,{test})=>{
   restore();$('.search').value='';selectHero(def||ROSTER[0]);
   if(test){approvedNavigation=true;location.href=`./powerworld.html?hero=${encodeURIComponent(hero.id)}`;}
  }});
 }catch(e){status('Could not open power authoring: '+e.message,true);}
}
$('#new-character').onclick=()=>guard(()=>openCreator());
$('#edit-kit').onclick=()=>guard(()=>openCreator(true));
$('#example-characters').onclick=()=>guard(()=>{
 const d=dialog('Start from a playable example',`<p>Create an editable local copy. Your existing fighters stay untouched. Export JSON for a portable backup; example tuning is not a balance guarantee.</p><div class="example-list">
 <section class="example-card"><span>ATTACK AUTHORING</span><h3>COMET <small>The Skybreaker</small></h3><p>BFP arms-back flight, second-press detonation and a four-way homing split. A complete kit for testing attack lifecycles.</p><button data-example="comet" aria-label="Create local copy of COMET">Create local copy · COMET</button></section>
 <section class="example-card"><span>TRANSFORMATIONS + UNLOCKS</span><h3>HELION <small>The Rising Sun</small></h3><p>Three forms at levels 4, 7 and 10: one-fist, two-fist and repulsor flight. Q unlocks at 4; R at 7. A paid beam can absorb bullets.</p><button data-example="helion" aria-label="Create local copy of HELION">Create local copy · HELION</button></section>
 </div><p class="example-feedback" role="status"></p>`,[]);
 const list=d.querySelector('.example-list'),feedback=d.querySelector('.example-feedback'),buttons=[...list.querySelectorAll('button')];
 // The shared dialog can close and reopen while a lazy module is loading. Its old
 // content must still belong to this open dialog before any storage/roster write.
 const current=()=>d.open&&list.isConnected&&d.contains(list);
 for(const button of buttons)button.onclick=async()=>{
  buttons.forEach(b=>b.disabled=true);feedback.classList.remove('error-text');feedback.textContent='Loading example…';
  try{
   const pack=button.dataset.example==='comet'?(await import('../../examples/comet-character.mjs')).cometCharacter():(await import('../../examples/helion-character.mjs')).helionCharacter();
   if(!current())return;
   const rec=importCharacter(pack,ROSTER);d.close();$('.search').value='';selectHero(rec.def);
   $('#preview-level').value='1';preview.setLevel(1);setState('hover');setView('game');
   if(button.dataset.example==='helion')$('#tab-progression').click();else $('#tab-attacks').click();
   status(`${rec.def.name} created and saved as a new local copy. Edit freely, preview levels or Play Test. Export JSON for a backup.`);
   $('#example-characters').focus();
  }catch(e){if(current()){feedback.classList.add('error-text');feedback.textContent='Not created: '+e.message;}}
  finally{if(current())buttons.forEach(b=>b.disabled=false);}
 };
});
addEventListener('keydown',e=>{if($('dialog').open||creator?.open)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?history.redo():history.undo();refresh();}if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();play();}});
addEventListener('beforeunload',e=>{if(history?.dirty&&!approvedNavigation){e.preventDefault();e.returnValue='';}});
selectHero(hero);
setView('game');
const soundLibraryPanel=mountSoundLibrary({host:$('.stage-toolbar'),backend:preview.sound.backend,onOpen:()=>{if(preview.playing)$('#play').click();}});
window.STUDIO={preview,soundLibrary:soundLibraryPanel.library,soundLibraryPanel,get history(){return history;}};
refreshCatalog();
} catch(error) {
 const host=document.querySelector('#studio');host.replaceChildren();
 const heading=document.createElement('h1');heading.textContent='Studio could not open';
 const detail=document.createElement('p');detail.textContent=`${error.message}. Check that WebGL is enabled, then reload. Saved profiles have not been changed.`;
 const reload=document.createElement('button');reload.textContent='Reload Studio';reload.onclick=()=>location.reload();host.className='boot-note';host.append(heading,detail,reload);
 console.error('[STUDIO]',error);
}
