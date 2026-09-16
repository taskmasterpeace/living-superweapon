// Death & Reaction semantic-ID registry (Mission A) — the runtime resolver's contract.
// Slots are composed from the existing banks' entries (provenance and semantic IDs
// preserved) plus the computed death-presentation data; slots the purchased Windows
// library must fill are declared awaiting-source (docs/TRANSFER_REQUEST_ANIMATIONS.md).
// Convention: registry slot ids classify by IMPACT direction; some older bank
// semantics (e.g. shared.knockdown.rear) named the FALL direction — the slot's
// bankSemantic field carries that mapping so neither id is rewritten.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const war=JSON.parse(await fs.readFile(path.join(root,'public/models/modular-hero/warworld-motion-bank.json'),'utf8'));
const paid=JSON.parse(await fs.readFile(path.join(root,'public/models/modular-hero/paid-motion-bank.json'),'utf8'));
const deaths=JSON.parse(await fs.readFile(path.join(root,'public/models/modular-hero/death-presentation-set.json'),'utf8'));
const bankEntry=id=>war.entries.find(e=>e.id===id)||paid.entries.find(e=>e.id===id)||(()=>{throw Error('Missing bank entry '+id)})();
const computed=sem=>deaths.clips.find(c=>c.semantic===sem);
const HANDOFF={blendMs:120,maxAngularVelocityRadS:6,settledLinearDamping:0.92,settledAngularDamping:0.95,
 note:'Hand off at clip end (trigger=clip-complete). Grounded settled endings may clamp angular velocity to 2 rad/s. If displaced mid-clip, abandon to full ragdoll from the current sampled pose.'};
const evidenceDir='artifacts/asset-lab/death-reaction-evidence';
function slot(id,bankId,meta){
 const e=bankEntry(bankId),c=e.semantic?computed(e.semantic):computed(meta.deathSetSemantic);
 return {slot:id,status:meta.status??'rig-playback-captured',
  bank:e.id.startsWith('paid/')?'paid-motion-bank.json':'warworld-motion-bank.json',
  bankId:e.id,bankSemantic:e.semantic??e.key??null,take:e.take,
  source:e.source,duration:e.duration,loop:false,
  skeleton:'ual-deform-v1 (53 mapped bones on modular-hero.glb)',
  entryPosture:meta.entryPosture,impactDirection:meta.impactDirection,
  reactionType:meta.reactionType,finalOrientation:meta.finalOrientation??(c?{up:'face-up',down:'face-down',side:'side',upright:'upright'}[c.endPose?.face]:'unknown'),
  computedMotion:c?{fall:c.fall,endHipsHeight:c.endPose?.hipsHeight,phases:c.phases}:null,
  rootMotionPolicy:typeof e.rootMotionPolicy==='string'?'in-place (source values preserved; simulation owns displacement)':'in-place (simulation owns root; source trajectory in sourceMotion metadata)',
  useCase:meta.useCase,ragdollHandoff:{trigger:'clip-complete',atSeconds:e.duration,...HANDOFF},
  retargetConcerns:meta.retargetConcerns??(e.id.startsWith('paid/')?e.retarget?.limitations:['Same-skeleton source; only leaf finger/toe tips omitted.']),
  visualNotes:meta.visualNotes,
  evidence:['front','side'].flatMap(v=>[0,0.25,0.5,0.75,1].map(p=>`${evidenceDir}/${e.take}-${v}-${p}.png`)),
 };
}
function awaiting(id,meta){return {slot:id,status:'awaiting-source',...meta,
 expectedSource:'Knockdown & Get-Up pack (85 FBX) on the Windows PC — docs/TRANSFER_REQUEST_ANIMATIONS.md',
 note:'No substitute assigned by policy: purchased library only.'};}
const slots=[
 slot('death.impact-front.a','ual1full/Death01',{entryPosture:'standing',impactDirection:'front',reactionType:'death',
  useCase:'Highwall soldier shot from the front at close/medium range; falls backward, settles supine.',
  visualNotes:'Clean backward collapse, settled flat supine final pose on the rig; no limb distortion; slight backward travel (0.46 rig units) stays in-clip.'}),
 slot('death.impact-rear.a','ual1full/Death02',{entryPosture:'standing',impactDirection:'rear',reactionType:'death',
  useCase:'Soldier shot from behind; pitches forward ~1 unit, ends prone.',
  visualNotes:'Strong forward pitch with clear rear-impact read; prone final pose; forward travel must be absorbed by simulation anchoring (policy in-place).'}),
 slot('knockdown.impact-front.heavy','ual2full/Hit_Knockback',{entryPosture:'standing',impactDirection:'front',reactionType:'knockdown',
  useCase:'Nonlethal heavy impact (blast wave, superweapon shove); knocked flat on back, pairs with getup.from-supine.',
  visualNotes:'Fast (0.83 s) full knockback to supine; front-impact read is unambiguous; in-place.'}),
 slot('collapse.weakened','ual2full/IdleToLay',{entryPosture:'standing',impactDirection:'unspecified',reactionType:'death',
  useCase:'Bleed-out / non-directional death; slow controlled collapse to supine (3.0 s).',
  visualNotes:'Reads as controlled lying-down more than combat death; acceptable for bleed-out only — do not use for gunshot reactions.'}),
 slot('death.airborne.fall','ual2full/LiftAir_Fall',{entryPosture:'airborne',impactDirection:'unspecified',reactionType:'death',
  useCase:'Airborne kill, part 1: limp fall entry. Chain: fall -> fall.loop while airborne -> impact on ground contact.',
  visualNotes:'Limp-body read; chain into death.airborne.fall.loop.'}),
 slot('death.airborne.fall.loop','ual2full/LiftAir_Fall_Air_Loop',{entryPosture:'airborne',impactDirection:'unspecified',reactionType:'death',
  useCase:'Airborne kill, part 2: hold while falling (loop until ground contact).',
  visualNotes:'Loopable limp fall; loop=one-shot in registry because the RUNTIME decides repetition by airtime.'}),
 slot('death.airborne.impact','ual2full/LiftAir_Fall_Impact',{entryPosture:'airborne',impactDirection:'lower-body',reactionType:'prone death',
  useCase:'Airborne kill, part 3: ground impact to settled supine; hand off to restrained ragdoll AFTER this completes.',
  visualNotes:'Impact settles supine at ground level (end hips 0.044); the correct spin-free handoff point for aerial kills.'}),
 slot('getup.from-prone','paid/knockdown-getup/AS_KG_Front_Getup',{entryPosture:'prone',impactDirection:'unspecified',reactionType:'recovery',finalOrientation:'upright',
  useCase:'Nonlethal recovery from face-down; pairs with forward knockdowns.',
  visualNotes:'PURCHASED KG pack clip on the actual rig: prone -> kneel -> stand, natural weight, no floor penetration observed across 10 phase frames.'}),
 slot('getup.from-supine','paid/knockdown-getup/AS_KG_Back_Getup',{entryPosture:'supine',impactDirection:'unspecified',reactionType:'recovery',finalOrientation:'upright',
  useCase:'Nonlethal recovery from face-up; pairs with knockdown.impact-front.heavy.',
  visualNotes:'PURCHASED KG pack clip on the actual rig; clean supine-to-stand.'}),
 slot('getup.kipup','ual2full/KipUp',{entryPosture:'supine',impactDirection:'unspecified',reactionType:'recovery',
  useCase:'Heroic fast recovery (superweapons, elite units) from supine.',
  visualNotes:'Athletic kip-up; too heroic for ordinary soldiers — gate by unit class.'}),
 slot('getup.from-supine.slow','ual2full/LayToIdle',{entryPosture:'supine',impactDirection:'unspecified',reactionType:'recovery',
  useCase:'Slow deliberate recovery; wounded or cautious units.',
  visualNotes:'Unhurried supine-to-stand.'}),
 awaiting('death.impact-left.a',{entryPosture:'standing',impactDirection:'left',reactionType:'death',useCase:'Side-impact death, falls right/away.'}),
 awaiting('death.impact-right.a',{entryPosture:'standing',impactDirection:'right',reactionType:'death',useCase:'Side-impact death, falls left/away.'}),
 awaiting('death.impact-front.b',{entryPosture:'standing',impactDirection:'front',reactionType:'death',useCase:'Front-impact death variety (avoid same-clip repetition in firefights).'}),
 awaiting('death.impact-rear.b',{entryPosture:'standing',impactDirection:'rear',reactionType:'death',useCase:'Rear-impact death variety.'}),
 awaiting('death.prone.a',{entryPosture:'prone',impactDirection:'upper-body',reactionType:'prone death',useCase:'Killing a downed/crawling soldier.'}),
 awaiting('death.crouched.a',{entryPosture:'crouched',impactDirection:'front',reactionType:'death',useCase:'Death from cover crouch (Highwall firing positions).'}),
 awaiting('knockdown.impact-rear.heavy',{entryPosture:'standing',impactDirection:'rear',reactionType:'knockdown',useCase:'Nonlethal heavy impact from behind; falls forward, pairs with getup.from-prone.'}),
 awaiting('stagger.front',{entryPosture:'standing',impactDirection:'front',reactionType:'stagger',useCase:'Heavy hit that does not floor the soldier.'}),
 awaiting('stagger.rear',{entryPosture:'standing',impactDirection:'rear',reactionType:'stagger',useCase:'Rear heavy hit stagger.'}),
];
const output={version:1,mission:'War World Death & Reaction Presentation Set (Mac asset lab, Mission A)',
 targetRig:'public/models/modular-hero/modular-hero.glb (ual-deform-v1)',
 selectionConvention:'Slot ids classify by IMPACT direction; bankSemantic may name fall direction (mapping preserved, ids never rewritten).',
 statusLadder:['awaiting-source','retargeted-unreviewed','rig-playback-captured','visually-accepted','gameplay-proven'],
 counts:{satisfied:slots.filter(s=>s.status!=='awaiting-source').length,awaitingSource:slots.filter(s=>s.status==='awaiting-source').length},
 transferRequest:'docs/TRANSFER_REQUEST_ANIMATIONS.md',
 handoffDefaults:HANDOFF,
 slots};
await fs.writeFile(path.join(root,'public/models/modular-hero/death-reaction-registry.json'),JSON.stringify(output,null,1)+'\n');
console.log(JSON.stringify(output.counts),'slots:',slots.length);
