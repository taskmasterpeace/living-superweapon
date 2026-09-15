import fs from 'node:fs/promises';
import {ROSTER} from '../src/data/characters.js';
import {identityOf} from '../src/data/identities.js';
import {birthOf,ageOf} from '../src/data/age.js';
import {deriveAttrs,ATTR_DEFS} from '../src/data/ranks.js';
import {heroModelOf} from '../src/data/hero-models.js';
import {impactMass,impactTolerance} from '../src/engine/shared-impact.js';
import {bodyWeightLb,liftCapacityOf,LB_PER_TON} from '../src/engine/entity.js';
import {SOUND_CUES} from '../src/data/sound-library.js';
import {SOUND_LIBRARY_SAMPLES} from '../src/data/sound-library-recordings.js';
import {FIREARMS,BLADES,GEAR} from '../src/data/armory.js';
import {ITEM_PRESENTATION} from '../src/data/item-presentation.js';
import {POWERS} from '../src/data/creator.js';
const date={y:2026,m:9,d:14};
const library=JSON.parse(await fs.readFile('docs/FAB_LIBRARY_FULL_TRIAGE_2026-09-14.json','utf8'));
const bank=JSON.parse(await fs.readFile('public/models/modular-hero/paid-motion-bank.json','utf8'));
const characters=ROSTER.map(d=>{
 const person=identityOf(d),attrs=deriveAttrs(d),f={def:d,sheet:{attrs},sizeScale:1};
 const b=birthOf(d);
 return {id:d.id,name:d.name,realName:person.n,city:person.c,country:person.co,
  birthDate:`${b.y}-${String(b.m).padStart(2,'0')}-${String(b.d).padStart(2,'0')}`,age:ageOf(d,date),birthBasis:d.born?'Authored date':d.age!==undefined?'Authored age; generated month/day':'Generated default; canon review needed',
  heritage:d.heritage||d.ethnicity||'Not authored',origin:d.origin||'Unspecified',...Object.fromEntries(ATTR_DEFS.map(a=>[a.name,attrs[a.k]])),
  hp:d.hp,energy:d.energyInfinite?'Infinite':d.ki,flightTier:d.flightTier??3,flightStyle:heroModelOf(d).flightStyle,
  collisionMassLb:impactMass(f),pickupMassLb:bodyWeightLb(d),liftCapacityLb:Math.round(liftCapacityOf(d)*LB_PER_TON),
  impactTolerance:impactTolerance(f),massBasis:d.environment?.massKg?'Explicit environment.massKg':d.weightLb?'Explicit weightLb':'Frozen stock migration weight; canon review',
  source:'src/data/characters.js; identities.js; age.js; ranks.js; body-mass.js; engine/shared-impact.js; entity.js'};
});
const motions=bank.entries.map(e=>({id:e.id,take:e.take,role:e.role||'Unassigned',duration:e.duration,loop:!!e.loop,
 frames:e.clip.tracks[0]?.times.length||0,status:e.status||'retargeted-unreviewed',userReview:'Pending',
 runtime:['aerial-hold-receiver','aerial-travel-receiver'].includes(e.role)?'Receiver limb overlay; native grip/root retained':['Paid_Boxer_Jab','Paid_Boxer_Cross'].includes(e.take)?'Candidate only; native contact continuity blocked, issue30':'Preview; check action admission',
 blockers:(e.review?.blockers||e.blockers||[]).join('; '),source:e.source.file,sha256:e.source.sha256,license:e.source.license}));
const audio=SOUND_CUES.map(c=>({id:c.id,label:c.label,family:c.family,event:c.event||c.phase,wiring:c.wiring||'Preview',
  recording:SOUND_LIBRARY_SAMPLES[c.id]||'No bundled recording; chosen local binding may exist',line:c.line||'',notes:c.nativeNote||''}));
const registries={FIREARMS,BLADES,GEAR};
const equipment=ITEM_PRESENTATION.map(p=>{
 const item=registries[p.registry].find(x=>x.id===p.registryId),a=item.ab||{};
 return {id:p.id,name:p.name,category:p.category,subtype:p.subtype,role:p.proposedEquipmentRole,
  damage:a.damage??null,damageType:a.dtype||a.dmgClass||'Action-specific',interval:a.interval??a.cd??null,
  speed:a.speed??null,magazine:a.magazine??null,reserve:a.reserveAmmo??null,reload:a.reloadTime??null,
  charges:item.charges??null,columns:p.proposedFootprint.columns,rows:p.proposedFootprint.rows,
  footprintStatus:'Layout proposal; not enforced capacity',weight:'Not authored in armory',iconId:p.icon.id,iconStatus:p.icon.status,
  voice:item.voice||'',notes:item.d+' Base action damage is before target defenses; footprint is not weight.',source:'src/data/armory.js; src/data/item-presentation.js'};
});
const spear=POWERS.find(p=>p.id==='guided-spear');
if(spear)equipment.push({id:'signature.guided-spear',name:spear.name,category:'signature',subtype:'guidedSpear',role:'Optional custom-character ability',damage:spear.ab.damage,damageType:'physical / pierce',interval:spear.ab.cd,speed:spear.ab.speed,columns:5,rows:1,footprintStatus:'Layout proposal; not backpack integration',weight:'Not authored',iconId:'item.signature.guided-spear',iconStatus:'missing',notes:'One hand; same physical object through throw/embed/recall. Does not replace an existing hero kit.',source:'src/data/creator.js; src/engine/guided-spear.js'});
const decisions=[
 ['Flight and grabs','Current modular actors; imported receiver limbs preserve root/grip authority','Build','Contact and interruption outrank decorative motion'],
 ['Boxing','Use isolated single punches, not a multi-hit clip mislabeled as jab','Build','Contact timing still must match simulation'],
 ['Heavy charge','Three regions','Keep','Airborne actions never choose grounded sweeps'],
 ['Mass','Separate from strength; use explicit body weight and volume scale','Build','Legacy pickup/collision mass agreement is tested'],
 ['Impact tolerance','Resilience affects damage threshold; impulse remains separate','Build','Tuning is game units, not medical physics'],
 ['Movement power','Explicit impactDrive for flight bracing; flight motion retains existing controller','Build','Does not grant infinite mass or automatic grabs'],
 ['Inventory','Compact right overlay, grid space separate from weight','Mock-up','Live inventory overhaul follows interaction work'],
 ['Hand ownership','Two hands = one stored item, both equipped hand slots','Decision','Carried world objects are not backpack items'],
 ['Devices','Separate square/widescreen focus at75–80% viewport','Mock-up','Physical device and interruption integration later'],
 ['Vehicles','Chase camera attached to valid occupied vehicle seat','Decision','Never leave player and vehicle controls active together'],
 ['HUD','Heart health; bolt energy; shield defense, accessible exact resource labels','Mock-up','Armor mitigation is not the guard meter'],
 ['Dialogue','Confirmed major events; existing SpeechGate cooldowns; real recordings only','Decision','Candidate text does not imply spoken audio'],
 ['Nightfall','First dual-sword candidate (knightfall runtime ID)','Queued','Current kit remains until contact review'],
 ['Magic spear','Black shaft, crimson head; steer, embed, recall; one object per owner','Build','Normal spear remains separate ballistic type'],
 ['New packs','Export from user Unreal staging project as sources arrive','Waiting for files','Engine install is not game migration'],
 ['Destruction and cover','Defer expanded destruction and cover shooting','Deferred','Focus on flight, melee and pickups'],
];
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/combat-workbook-data.json',JSON.stringify({asOf:'2026-09-14',decisions,characters,motions,assets:library.items,audio,equipment},null,2));
console.log(JSON.stringify({characters:characters.length,motions:motions.length,assets:library.items.length,audio:audio.length,equipment:equipment.length}));
