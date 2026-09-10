import {LIMITS,validateProfile} from './studio-profile.js';
import {formAt,unlockLevel} from '../data/progression.js';
import {heroModelOf,HERO_BODY_LABELS} from '../data/hero-models.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const frames={scale:'Scale',bulk:'Bulk',broad:'Shoulders',head:'Head',neck:'Neck',stance:'Stance'};
const palettes=['primary','secondary','accent','skin','cape'];
const languages={hero:'One-fist lead',twin:'Two-fist spearhead',martial:'BFP arms-back',thruster:'Repulsor stance',hammer:'Weapon-led flight',glider:'Relaxed glide'};

export function editForm(profile,fields,previousLevel=null){
 const p=structuredClone(profile),level=String(fields.level);
 if(!/^(?:[2-9]|10)$/.test(level))throw new Error('Choose a whole form level from 2 to 10.');
 if(level!==previousLevel&&p.progression.forms[level])throw new Error(`Level ${level} already has a form. Edit that form or choose another level.`);
 const form={name:(fields.name||'').trim()};
 for(const [group,keys] of [['model',['body','costume','flightStyle','hairColor','definition']],['frame',Object.keys(frames)],['colors',palettes]]){
  const patch={};for(const key of keys){const v=fields[key];if(v!==undefined&&String(v).trim()!=='')patch[key]=group==='frame'||key==='definition'?Number(v):String(v).trim();}
  if(Object.keys(patch).length)form[group]=patch;
 }
 if(previousLevel!==null)delete p.progression.forms[previousLevel];p.progression.forms[level]=form;
 return validateProfile(p);
}

export function progressionInspector(profile,hero,level){
 const current=formAt({progression:profile.progression},level,hero.energyInfinite),forms=Object.entries(profile.progression.forms).sort(([a],[b])=>Number(a)-Number(b));
 return `<h2>Progression</h2><p class="help">Build an ascent from level 1 to 10. Preview level tests the real attack gates and appearance swap; it does not change a match's starting level.</p>
 <div class="progression-current"><span>PREVIEW · LEVEL ${level}</span><strong>${esc(current.form?.name|| (current.form?'Authored form':'Base appearance'))}</strong>${hero.energyInfinite?'<small>Infinite core: appearance stops at level 6 / Tier II. Attack unlocks still use your actual level.</small>':''}</div>
 <h3>Attack unlocks</h3><p class="help">Level 1 is available immediately. A gate belongs to its slot, so replacing that power in ORIGIN keeps its unlock level.</p>
 ${Object.entries(hero.abilities||{}).map(([slot,a])=>`<div class="unlock-row"><label for="unlock-${esc(slot)}"><b>${esc(slot.toUpperCase())}</b>${esc(a.name)}</label><select id="unlock-${esc(slot)}" data-unlock="${esc(slot)}" aria-label="${esc(slot.toUpperCase())} unlock level">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${unlockLevel({progression:profile.progression},slot)===i+1?'selected':''}>Level ${i+1}</option>`).join('')}</select></div>`).join('')}
 <h3>Transformation appearances</h3><p class="help">The highest reached form replaces only its specified appearance fields. Blank fields inherit the base character, not an earlier form. These forms add no extra stat bonuses.</p>
 <div class="form-list">${forms.length?forms.map(([at,form])=>`<article class="form-row ${current.level===Number(at)?'current':''}"><span class="form-level">${at}</span><div><strong>${esc(form.name||'Unnamed form')}</strong><small>${esc(form.model?.costume||'Inherited costume')} · ${esc(Object.values({...form.model,...form.frame,...form.colors}).length)} overrides</small></div><button data-edit-form="${at}" aria-label="Edit level ${at} form">Edit</button><button data-remove-form="${at}" aria-label="Remove level ${at} form">Remove</button></article>`).join(''):'<p class="empty">No appearance changes yet. Your base rig stays intact at every level.</p>'}</div><button id="add-form" ${forms.length>=9?'disabled':''}>Add transformation form</button>`;
}

export function formDialogBody(profile,previousLevel=null){
 const form=profile.progression.forms[previousLevel]||{},free=Array.from({length:9},(_,i)=>i+2).find(n=>!profile.progression.forms[n]);
 const input=(key,label,value,attrs='')=>`<label>${label}<input name="${key}" aria-label="Form ${label.toLowerCase()}" value="${esc(value)}" ${attrs}></label>`;
 const select=(key,label,options,value)=>`<label>${label}<select name="${key}" aria-label="Form ${label.toLowerCase()}"><option value="">Inherit base</option>${Object.entries(options).map(([k,v])=>`<option value="${k}" ${value===k?'selected':''}>${v}</option>`).join('')}</select></label>`;
 return `<p>Changes are saved as a sparse appearance patch. Leave a field blank to inherit the base character. Changing flight language uses that language's default poses; base custom joint targets do not carry over.</p><p>Body definition, neck thickness and costume shell settings apply only to Procedural modules. They remain stored when a source body is active. Signature gear and weapons stay attached to either body.</p><form id="form-editor"><div class="form-fields">
 ${input('level','Level',previousLevel??free,'type="number" min="2" max="10" step="1" required')}
 ${input('name','Name',form.name,'type="text" maxlength="32" placeholder="e.g. Ascended"')}
 ${select('costume','Costume',{fitted:'Fitted',martial:'Martial',plated:'Plated',tactical:'Tactical'},form.model?.costume)}
 ${select('body','Body source',HERO_BODY_LABELS,form.model?.body)}
 ${select('flightStyle','Flight language',languages,form.model?.flightStyle)}
 ${input('definition','Body definition',form.model?.definition,`type="number" min="0" max="1" step="any" placeholder="Base: ${heroModelOf({id:profile.heroId,model:profile.model}).definition}"`)}
 <h3>Body proportions</h3>${Object.entries(frames).map(([k,label])=>input(k,label,form.frame?.[k],`type="number" min="${LIMITS.frame[k][0]}" max="${LIMITS.frame[k][1]}" step="any" placeholder="Base: ${profile.frame[k]}"`)).join('')}
 <h3>Palette overrides</h3>${[...palettes,'hairColor'].map(k=>input(k,k==='hairColor'?'Hair color':k, k==='hairColor'?form.model?.hairColor:form.colors?.[k],`type="text" pattern="#[0-9a-fA-F]{6}" placeholder="${esc(k==='hairColor'?profile.model.hairColor:profile.colors[k]||'#rrggbb')}"`)).join('')}
 </div></form><p class="error-text" role="alert"></p>`;
}
