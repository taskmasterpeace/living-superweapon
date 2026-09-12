// Authoring reference, not fake voice assets. Native methods remain the sound authority.
export const AUDIO_CUES=Object.freeze([
 {id:'charge',label:'Charge / energy gathering',attackType:'Charged energy attack',phase:'charge',playback:'loop',status:'native',
  event:'charge starts / held',timing:'Begin on an accepted charge; follow its paid charge amount. Stop on release, cancellation or depletion.',
  method:'charge',source:'engine.charge',direction:'Low gathering loop; rising pitch, pressure and electrical detail. No launch crack or impact boom yet.'},
 {id:'release',label:'Charged blast / launch',attackType:'Charged orb or cannon',phase:'release',playback:'one-shot',status:'native',
  event:'charged attack releases',timing:'One launch transient when the native charged attack actually emits; never on a denied press.',
  method:'kiRelease',source:'ki.release',direction:'Compressed attack, heavy low body, broad outward tail. Scale with released charge. This is the source discharge, not the later target impact.'},
 {id:'beam',label:'Beam / sustained fire',attackType:'Traveling energy beam',phase:'sustain',playback:'loop',status:'native',
  event:'beam is emitting',timing:'Follow the live emitting beam and caster position; do not restart on each frame or damage tick.',
  method:'beamVoice',source:'engine.low',direction:'Continuous pressurized roar with a stable low body. The reference-family briefs below describe future narrow versus heavy variants; the native loop is currently shared.'},
 {id:'contact',label:'Beam / contact impact',attackType:'Traveling energy beam',phase:'impact',playback:'one-shot',status:'native',
  event:'beam reaches a Fighter or its defensive module',timing:'After positive accepted Fighter damage or local metal contact, at the native .18-second pulse cadence; never ahead of the traveling tip or on rejected damage.',
  method:'impact / zap',source:'punch.med / ki.zap',direction:'Localized contact pulses separate from the source roar; accepted Guard contact has a brighter defensive accent. No full explosion on every damage tick. Ordinary wall and construct-cover contact audio is not wired; see the separate direction-only cue.'},
 {id:'beam-cover-contact',label:'Beam / wall or construct contact',attackType:'Traveling beam against cover',phase:'impact',playback:'loop',status:'direction-only',
  event:'beam reaches ordinary wall or construct cover',timing:'Proposed: begin only at the actually reached cover endpoint; follow contact, stop when it leaves or the receiver is removed. The dedicated contact sound is not implemented.',
  method:'none',source:'not recorded',direction:'Localized material hiss, grit and restrained pressure pulses distinct from the source roar. Ordinary cover and construct damage already work; this separate sound remains an open production/integration task, not a promised native cue.'},
 {id:'blast',label:'Quick blast / discharge',attackType:'Uncharged energy bolt',phase:'release',playback:'one-shot',status:'native',
  event:'energy bolt fires',timing:'At accepted bolt emission, with no invented charging interval.',
  method:'kiRelease / blast / zap (ability-dependent)',source:'ki.release / ki.blast / ki.zap',direction:'Short, clean energy crack with a small pressure tail. Lighter than a fully charged cannon, clearly separate from impact.'},
 {id:'blast-impact',label:'Blast / detonation impact',attackType:'Explosive projectile',phase:'impact',playback:'one-shot',status:'native',
  event:'projectile detonates',timing:'At the native detonation position after travel/contact or its actual fuse; not at firing time.',
  method:'boom',source:'boom / boom.deep',direction:'Sharp initial rupture, weighty low-frequency body and decaying debris tail. Scale with the real explosion; a non-explosive contact must not acquire this boom.'},
 {id:'light',label:'Light punch / impact',attackType:'Light melee strike',phase:'impact',playback:'one-shot',status:'native',
  event:'jab connects',timing:'On confirmed strike contact only.',method:'meleeHit',source:'punch.med',direction:'Fast dry crack and body thump. Keep a light punch quick and readable.'},
 {id:'heavy',label:'Heavy punch / impact',attackType:'Heavy melee strike',phase:'impact',playback:'one-shot',status:'native',
  event:'heavy strike connects',timing:'On confirmed heavy contact; a miss has no impact. Independently gated swing and effort cues may still play.',method:'meleeHit',source:'punch.med / punch.heavy (power-dependent); haymaker adds land.flesh + hit.soft',direction:'Recorded punch crack, with haymaker body layers delayed .035 seconds (land.flesh) and .012 seconds (hit.soft). Express weight without an explosion recording or a long sound masking the next action.'},
 {id:'swing',label:'Melee / swing',attackType:'Fist or held weapon',phase:'release',playback:'one-shot',status:'native',
  event:'strike passes through air',timing:'During the native swing, including a miss.',method:'swing',source:'swing.fist / swing.blade',direction:'Short directional rush matched to the weapon. Never substitute an impact on a miss.'},
 {id:'guard',label:'Block / accepted contact',attackType:'Guard or shield defense',phase:'block',playback:'one-shot',status:'native',
  event:'guard accepts contact',timing:'When native guard accepts the hit, not just when the player raises an arm.',method:'zap',source:'ki.zap',direction:'Tight higher-frequency defensive accent, distinct from a clean flesh hit. Nanite panel granules remain separate unproduced cues.'},
 {id:'deflect',label:'Deflect / redirected projectile',attackType:'Projectile deflection',phase:'deflect',playback:'one-shot',status:'native',
  event:'projectile actually reflects',timing:'At the accepted native deflection; an ordinary block is not a deflection.',method:'zap(760)',source:'ki.zap',direction:'Bright compact snap at the redirection point. Existing native zap is available; a bespoke directional ricochet tail is future production.'},
 {id:'construct',label:'Construct / formation',attackType:'Energy construct',phase:'formation',playback:'one-shot',status:'native',
  event:'construct forms',timing:'On successful native construct creation.',method:'power',source:'cast.spell',direction:'Rising formation cast and solid arrival. Separate fracture/reform granules are requested assets, not present yet.'},
 {id:'nanite-break',label:'Nanite panel / fracture',attackType:'Physical nanite module',phase:'destruction',playback:'one-shot',status:'direction-only',
  event:'local panel breaks',timing:'Proposed: once on an intact-to-broken cell transition, at that cell; not per frame or for the whole shield.',method:'none',source:'not recorded',direction:'Dry metallic crack followed by a short granular scatter. Keep it smaller than a full-body explosion; the visual break already exists, this dedicated sound does not.'},
 {id:'nanite-reform',label:'Nanite panel / repair',attackType:'Physical nanite module',phase:'repair',playback:'loop',status:'direction-only',
  event:'broken local panel reforms',timing:'Proposed: begin after the quiet delay when actual repair starts; end on completion, interruption or module disposal.',method:'none',source:'not recorded',direction:'Fine inward metallic ticks gathering into a restrained locking click. Do not loop through the quiet waiting period or imply the whole module is rebuilding.'},
 {id:'gun',label:'Firearm / shot',attackType:'Ballistic firearm',phase:'release',playback:'one-shot',status:'native',
  event:'ballistic weapon fires',timing:'On an actual native shot, with the weapon fire cadence.',method:'gunshot',source:'gun.crack + weapon-profile DSP body / tail / mechanism',direction:'Recorded plate-crack transient with generated pressure body, mechanism click and weapon-sized tail. Not an energy zap; victim impact belongs at the later hit. The native weapon profile controls these generated layers.'},
 {id:'teleport',label:'Teleport / displacement',attackType:'Teleport movement',phase:'movement',playback:'one-shot',status:'native',
  event:'teleport executes',timing:'At accepted native displacement, never on a failed evade press.',method:'teleport',source:'fx.glitch',direction:'Compact inward cut and outward arrival impression; avoid a long masking tail. This describes the existing shared cue, not newly recorded departure/arrival stems.'},
 {id:'depleted',label:'Energy / depleted or denied',attackType:'Energy resource warning',phase:'warning',playback:'one-shot',status:'native',
  event:'energy runs out / press denied',timing:'Native depletion or denied-press event; no warning for every held frame.',method:'zap(140), zap(90) / zap(120)',source:'ki.zap',direction:'Low two-note depletion warning or one short denial cue. A bespoke descending collapse remains future sound direction.'},
 {id:'shutdown',label:'Sustained attack / shutdown',attackType:'Held beam or charge',phase:'shutdown',playback:'stop',status:'native',
  event:'source stops / attack retires',timing:'Charge handle stops at release/cancel; the beam follows its native released-tail intensity and stops its voice on disposal. Pause, mute and scrub retire audible routes.',method:'charge handle.stop / beam voice.set and stop',source:'existing loop envelope; no dedicated recording',direction:'Cut the gathering loop or let the native released beam tail fall away. No new shutdown sample is installed; future tails must not leave an orphan loop or fake an impact.'},
 {id:'pain',label:'Character / pain and effort',attackType:'Character reaction',phase:'voice',playback:'one-shot',status:'native',
  event:'fighter hurt / KO / exertion',timing:'Native reaction events only; character dialogue below is not automatically performed.',method:'grunt / cry; yell separately gated',source:'v.pain / v.roar; yell is optional DSP (off by default)',direction:'Existing generic recorded pain/KO cues, not future character dialogue performances. The ordinary Studio heroYell hook stays silent.'},
 {id:'landing',label:'Body / landing impact',attackType:'Landing or thrown body',phase:'impact',playback:'one-shot',status:'native',
  event:'landing or thrown surface contact',timing:'At a native physical landing or slam, not simply when an animation reaches its last frame.',method:'land / impact',source:'land.soft / land.metal / land.flesh / rubble; energy uses generated DSP; impact uses punch.med / punch.heavy',direction:'Match material and impact weight: stone selects rubble, energy uses a generated whisper, and slam impact can use the punch family. Broader motion-only footstep/flight audio remains a separate integration task.'},
].map(Object.freeze));

// Stills establish appearance, not timing or actual source-game audio. These
// production directions do not select new runtime sounds or alter beam physics.
export const BEAM_SOUND_DIRECTIONS=Object.freeze([
 {id:'narrow',label:'Narrow / focused beam',status:'direction-only',
  evidence:'User-supplied still: codex-clipboard-176d8b05-9c09-48f1-8b5c-1bc8a6593a9f.png. Motion and sound cannot be established from a still.',
  visual:'Thin white column, tight edge and restrained source glow; the character and aiming lane remain legible.',
  phases:{charge:'If this attack charges: a compact rising electrical whine. Do not add a charge sound to a tap-fired beam.',release:'Quick focused snap at emission, without a massive explosion.',sustain:'Narrow-band energetic hiss with a restrained low body; steady, precise and directional.',impact:'Small concentrated sizzling crack at confirmed contact, distinct from the source hiss.',shutdown:'Fast pressure drop with a short residual fizz. This bespoke tail is not recorded or wired yet.'}},
 {id:'pressure',label:'Heavy / pressure beam',status:'direction-only',
  evidence:'User-supplied still: codex-clipboard-8424dc52-aaa6-420a-a0d6-24145dd3ec86.png. Motion and sound cannot be established from a still.',
  visual:'Thick bright core with a broad luminous envelope, forceful source flare and distinct contact splash. Preserve the character silhouette rather than copying clipped white exposure.',
  phases:{charge:'Layer a rising energy whine over a building low rumble; density follows the actual paid charge.',release:'Heavy compressed discharge with a brief bass punch, then hand off to the sustained body.',sustain:'Broad pressurized roar, low weight and controlled turbulent detail: a powerful hose, not repeated explosions.',impact:'Weighty localized contact roar with short pulsing cracks and displaced-energy detail; never mask the hit location.',shutdown:'Source pressure falls away while the real traveling tail finishes. A bespoke decay layer remains unrecorded.'}},
].map(p=>Object.freeze({...p,phases:Object.freeze(p.phases)})));

export const DIALOGUE_CANDIDATES=Object.freeze([
 {personality:'Resolute protector',event:'charge',line:'Stay behind me.'},
 {personality:'Resolute protector',event:'guard',line:'You are not getting through.'},
 {personality:'Resolute protector',event:'victory',line:'Everyone still standing? Good.'},
 {personality:'Calm powerhouse',event:'beam-resisted',line:'You will need more than that.'},
 {personality:'Calm powerhouse',event:'heavy-release',line:'My turn.'},
 {personality:'Calm powerhouse',event:'victory',line:'We are done here.'},
 {personality:'Disciplined soldier',event:'energy-denied',line:'Reserve dry. Switching tactics.'},
 {personality:'Disciplined soldier',event:'guard-break',line:'Defense compromised.'},
 {personality:'Disciplined soldier',event:'victory',line:'Threat contained. Check the perimeter.'},
 {personality:'Construct architect',event:'construct-create',line:'Let me build you an answer.'},
 {personality:'Construct architect',event:'construct-damaged',line:'Holding the shape.'},
 {personality:'Construct architect',event:'energy-drained',line:'Cannot hold it. Clear the construct.'},
 {personality:'Resolute protector',event:'hit',line:'Still here.'},
 {personality:'Disciplined soldier',event:'KO',line:'I need a hand over here.'},
]);
export function audioCuePackage(){return {format:'lsw.audio-brief',version:2,recordings:'Existing local CC0 samples; direction-only cues and dialogue below are unrecorded production instructions, not shipped speech or new sound assets.',cues:AUDIO_CUES,beamDirections:BEAM_SOUND_DIRECTIONS,dialogue:DIALOGUE_CANDIDATES,voicePolicy:{optional:true,minimumGapSeconds:8,neverInterrupt:['impact','energy-denial'],provider:'pending user AAI service details'}};}

// ===============================================================================================
// OPERATION-V1 CUE REGISTRY  (scoped addition — codex/pw-operation-audio, docs/handoffs/operation-audio.md)
// -----------------------------------------------------------------------------------------------
// New, PRODUCED-BUT-UNWIRED combat/squad cues for the first playable operation. These are ASSETS
// (real .wav masters + .mp3 derivatives under public/audio/operation-v1/, rendered deterministically
// from authoring/audio/operation-v1/), NOT native engine routes. `status:'asset'` and `wired:false`
// mark that distinction — main integrates the events; nothing here plays in gameplay yet.
//
// Kept OUT of AUDIO_CUES / audioCuePackage() on purpose: the legacy brief's status enum is
// {native, direction-only}, and these are a third kind. This keeps the existing audio-cues test
// green while modelling "made, not wired" honestly. Provenance: original deterministic DSP synthesis
// (no AI audio model, no recorded/cloned voice, no third-party sample) — permitted by the audio
// contract (docs/AUDIO_SOURCES.md: "DSP we wrote").
//
// Each cue maps to a PROPOSED gameplay eventType (the BATTLEFIELD_STRUCTURE event envelope) with the
// payload it needs and a dedup rule. `bus`/`spatial`/`reach`/`cooldownMs`/`maxConcurrent`/`priority`/
// `duckSpeech` are the integration recommendations. Observer-safe pursuit reports carry `observerRule`.
const _opDefaults={playback:'one-shot',spatial:false,maxConcurrent:1,priority:2,duckSpeech:false,wired:false,status:'asset',cooldownMs:0};
const _opCue=(o)=>Object.freeze({..._opDefaults,sample:o.id,
 files:Object.freeze((o._variants||['a']).map(v=>`operation-v1/${o.id.replace(/\./g,'_')}_${v}`)),
 ...o,payload:Object.freeze(o.payload||[])});
export const OPERATION_AUDIO_CUES=Object.freeze([
 // ---- COMBAT CONFIRMATIONS (non-positional feedback, distinct from the spatial world impact) ----
 _opCue({id:'op.hit.confirm',label:'Confirmed hit / damage accepted',family:'combat',_variants:['a','b','c'],bus:'sfx',durationMs:90,priority:3,cooldownMs:60,
  event:'combat.hit.confirmed',transition:'local attack deals accepted damage to a valid target',
  payload:['attackerId(local)','targetId','amount','accepted:true'],
  dedupe:'coalesce multi-hit within 60ms per (attacker,target); one marker per accepted-damage event; not on blocked/rejected',
  duckSpeech:false,direction:'Tight dry high tick + small mid body. A hit-marker read, not a world thud.',
  reuse:'ADD. World impact already exists natively (meleeHit/punch.med/land). This is the non-positional CONFIRMATION the operation lacked; do not replace the spatial impact.'}),
 _opCue({id:'op.block.confirm',label:'Block / guard accepted',family:'combat',_variants:['a','b'],bus:'sfx',durationMs:150,priority:3,cooldownMs:90,
  event:'combat.guard.blocked',transition:'native guard accepts an incoming hit',
  payload:['defenderId(local)','attackerId','blockedAmount'],
  dedupe:'one per accepted guard contact; coalesce within 90ms',
  direction:'Damped metallic thunk + short bell ring; reads as "absorbed", brighter than a flesh hit.',
  reuse:'REUSE/ADD. Legacy native cue `guard` (ki.zap) covers the spatial defensive accent. This is a cleaner local block-confirm; main may keep the native cue and use this only for the operator UI.'}),
 _opCue({id:'op.guard.break',label:'Guard broken / defense compromised',family:'combat',_variants:['a','b'],bus:'sfx',durationMs:360,priority:4,cooldownMs:400,
  event:'combat.guard.broken',transition:'a fighter\'s guard meter breaks / guard-crush lands',
  payload:['victimId','breakerId'],
  dedupe:'one per guard-break event per fighter; supersedes a pending block cue',
  direction:'Descending cracked stinger + low sub thump + granular shatter. Bigger and rarer than a block.',
  reuse:'ADD. No native guard-break SFX existed (only the DIALOGUE candidate "Defense compromised").'}),
 // ---- SHIELD DOME (one-way squad dome; section 6) ----
 _opCue({id:'op.shield.deploy',label:'Shield dome deployed',family:'shield',bus:'sfx',spatial:true,reach:150,durationMs:720,priority:3,
  event:'shield.deployed',transition:'deployment committed → one-way dome established',
  payload:['ownerId','teamId','position','correlationId'],
  dedupe:'one per dome instance (correlationId)',
  direction:'Rising energised whoosh settling into a soft harmonic chord. Original; forcefield-adjacent.',
  reuse:'ADD (native `fx.forcefield`/forceField_* is the closest existing texture; this is a purpose-built deploy transient main may prefer).'}),
 _opCue({id:'op.shield.hit',label:'Shield shell absorbs a hit',family:'shield',_variants:['a','b','c'],bus:'sfx',spatial:true,reach:150,durationMs:180,priority:2,cooldownMs:90,maxConcurrent:2,
  event:'shield.absorbed',transition:'incoming shot meets the shell; finite shield loses integrity',
  payload:['ownerId','contactPosition','damage'],
  dedupe:'throttle to one per 90ms per dome; coalesce a burst; test SHELL CROSSING not "inside radius"',
  direction:'Bright dampened energy splash + brief shell ring at the contact point.',
  reuse:'ADD. Distinguish from op.shield.deploy/collapse; the shell contact is its own read.'}),
 _opCue({id:'op.shield.collapse',label:'Shield depleted / collapse',family:'shield',bus:'sfx',spatial:true,reach:160,durationMs:600,priority:4,
  event:'shield.collapsed',transition:'shield integrity reaches zero — ONE collapse event, collider removed',
  payload:['ownerId','position','correlationId'],
  dedupe:'EXACTLY ONCE per dome instance (correlationId); cancels any pending op.shield.hit',
  direction:'De-powering downward sweep + granular shatter + final low thud. VFX tail is cosmetic.',
  reuse:'ADD.'}),
 // ---- SCANNER (threat scan panel: SCANNING/LOCKED/LOST/UNKNOWN) ----
 _opCue({id:'op.scanner.acquire',label:'Scanner lock acquired',family:'scanner',_variants:['a','b'],bus:'ui',durationMs:220,priority:3,cooldownMs:200,
  event:'scanner.locked',transition:'scan resolves acquiring → LOCKED snapshot',
  payload:['observerId(local)','targetId','snapshotAtScanTime'],
  dedupe:'one per lock; do not re-fire while the same lock holds',
  direction:'Rising two-tone confirmation ping, clean comms register.',
  reuse:'ADD (cleaner than ui.confirm; scanner needs a dedicated up/down pair).'}),
 _opCue({id:'op.scanner.lost',label:'Scanner lock lost / expired',family:'scanner',_variants:['a','b'],bus:'ui',durationMs:260,priority:2,cooldownMs:200,
  event:'scanner.lost',transition:'LOCKED → LOST on LOS loss or snapshot expiry (no live data claimed after loss)',
  payload:['observerId(local)','targetId','reason:los|expiry'],
  dedupe:'one per lock loss',
  direction:'Falling two-tone with a soft static fizz — "signal gone".',
  reuse:'ADD.'}),
 // ---- PORTAL / DEPLOYMENT GATE ----
 _opCue({id:'op.portal.ready',label:'Portal ready / crossing open',family:'portal',bus:'sfx',spatial:true,reach:170,durationMs:520,priority:3,
  event:'deployment.portal.ready',transition:'deployment state → preparing/ready; companions may cross',
  payload:['portalId','teamId','position','correlationId'],
  dedupe:'one per portal-ready per correlationId',
  direction:'Rising harmonic hum resolving to a clean chime — "gateway stabilised".',
  reuse:'ADD (native `fx.glitch` covers teleport displacement; the READY gate is distinct).'}),
 _opCue({id:'op.portal.cross',label:'Body crosses the portal',family:'portal',_variants:['a','b'],bus:'sfx',spatial:true,reach:170,durationMs:400,priority:2,cooldownMs:120,maxConcurrent:3,
  event:'deployment.portal.cross',transition:'an actor crosses the portal (the crossing step of the squad-deploy loop)',
  payload:['actorId','portalId','position','correlationId'],
  dedupe:'per-actor; stagger with the deploy loop; ≤3 concurrent for staggered arrivals',
  direction:'Displacement whoosh with a short doppler sweep + soft arrival pop.',
  reuse:'ADD.'}),
 // ---- SQUAD ORDERS (friendly filtered radio; short; non-positional) ----
 _opCue({id:'op.squad.ready',label:'Squad ready',family:'squad',bus:'voice',route:'radio',durationMs:340,priority:3,cooldownMs:1200,duckSpeech:true,
  event:'squad.ready',transition:'all confirmed companions active/rallied — readiness confirmed',
  payload:['teamId','memberCount'],
  dedupe:'one per readiness transition; radio channel single-at-a-time',
  direction:'Radio affirmative: squelch-open, two rising blips, squelch-close. Filtered comms.',
  reuse:'ADD. Non-verbal comms cue standing in for a future licensed VO line (NOT voice cloning).'}),
 _opCue({id:'op.squad.regroup',label:'Squad regroup / rally order',family:'squad',bus:'voice',route:'radio',durationMs:420,priority:3,cooldownMs:1500,duckSpeech:true,
  event:'squad.order.regroup',transition:'regroup order issued (one of follow/hold/regroup)',
  payload:['teamId','rallyPosition'],
  dedupe:'one per order; cooldown suppresses re-issue spam',
  direction:'Radio rally: three descending tones — "form up".',
  reuse:'ADD.'}),
 // ---- PURSUIT REPORTS (friendly filtered radio; short; OBSERVER-KNOWLEDGE SAFE) ----
 // observerRule: fire ONLY on the emitting observer\'s own accepted knowledge transition. The cue is a
 // friendly-radio sound to the LISTENER and is never positioned on the enemy, so it cannot reveal an
 // unseen enemy. Debounce LOS flicker with cooldownMs; team sharing needs comms, not hidden coords.
 _opCue({id:'op.pursuit.spotted',label:'Pursuit — target spotted',family:'pursuit',bus:'voice',route:'radio',durationMs:300,priority:4,cooldownMs:2500,duckSpeech:true,
  event:'pursuit.spotted',transition:'per-observer knowledge → Spotted',
  payload:['observerId','teamId','targetId','knowledgeSource:sight|sensor'],
  observerRule:'observer must have earned the sighting; non-positional to listener; never reveals unseen enemies',
  dedupe:'one per (observer,target) transition; suppress while still Spotted; debounce LOS flicker 2.5s',
  direction:'Urgent double up-chirp radio blip — "contact".',reuse:'ADD.'}),
 _opCue({id:'op.pursuit.airborne',label:'Pursuit — target airborne',family:'pursuit',bus:'voice',route:'radio',durationMs:160,priority:4,cooldownMs:2500,duckSpeech:true,
  event:'pursuit.airborne',transition:'supplemental "target airborne" (target took flight); supplements pursuit',
  payload:['observerId','teamId','targetId','knowledgeSource:sight|sensor'],
  observerRule:'same as pursuit.spotted',
  dedupe:'one per (observer,target) airborne transition',
  direction:'Single rising sweep radio blip.',reuse:'ADD.'}),
 _opCue({id:'op.pursuit.lost',label:'Pursuit — target lost / escaped',family:'pursuit',bus:'voice',route:'radio',durationMs:300,priority:3,cooldownMs:2500,duckSpeech:true,
  event:'pursuit.escaped',transition:'Pursuing/Searching/Spotted → lost visual / Escaped',
  payload:['observerId','teamId','targetId'],
  observerRule:'fires on the observer losing its own knowledge; non-positional',
  dedupe:'one per transition',
  direction:'Downward two-note + squelch tail — "lost them".',reuse:'ADD.'}),
 _opCue({id:'op.pursuit.search',label:'Pursuit — searching',family:'pursuit',bus:'voice',route:'radio',durationMs:300,priority:2,cooldownMs:4000,duckSpeech:true,
  event:'pursuit.searching',transition:'per-observer knowledge → Searching',
  payload:['observerId','teamId','lastKnownArea'],
  observerRule:'reports the observer\'s own search state; lastKnownArea is a coarse area, not live coords',
  dedupe:'one per search transition; long cooldown (searching persists)',
  direction:'Neutral single mid blip + soft repeat tick, lower urgency.',reuse:'ADD.'}),
 _opCue({id:'op.pursuit.reacquired',label:'Pursuit — target reacquired',family:'pursuit',bus:'voice',route:'radio',durationMs:260,priority:4,cooldownMs:2500,duckSpeech:true,
  event:'pursuit.reacquired',transition:'Searching → Spotted/Pursuing again (Reacquired event)',
  payload:['observerId','teamId','targetId','knowledgeSource:sight|sensor'],
  observerRule:'same as pursuit.spotted',
  dedupe:'one per reacquire transition',
  direction:'Sharp bright up-chirp, brighter/cleaner than spotted — "re-acquired".',reuse:'ADD.'}),
 // ---- ZOMBIE VOCAL SET (spatial enemy creature vocals — synthesis, NOT speech, no voice cloning) ----
 _opCue({id:'op.zombie.idle',label:'Zombie idle / ambient moan',family:'zombie',_variants:['a','b','c'],bus:'voice',spatial:true,reach:120,durationMs:900,priority:1,cooldownMs:3500,maxConcurrent:3,
  event:'zombie.idle',transition:'idle zombie ambient, periodic while near a hero',
  payload:['zombieId','position'],
  dedupe:'periodic per zombie; min gap 3.5s (jitter); global concurrency cap; never a drone',
  direction:'Low gurgling moan. Local spatial sound heard when near.',
  reuse:'ADD (native v.roar/v.beast are hero/creature reactions, not a zombie idle bed).'}),
 _opCue({id:'op.zombie.alert',label:'Zombie alert / aggro snarl',family:'zombie',_variants:['a','b','c'],bus:'voice',spatial:true,reach:180,durationMs:500,priority:3,cooldownMs:1500,maxConcurrent:3,
  event:'zombie.alert',transition:'zombie becomes aware of a hero (aggro)',
  payload:['zombieId','position','targetId'],
  dedupe:'one per aggro transition per zombie',
  direction:'Rising snarl, brighter formants.',reuse:'ADD.'}),
 _opCue({id:'op.zombie.attack',label:'Zombie attack / lunge',family:'zombie',_variants:['a','b','c'],bus:'voice',spatial:true,reach:200,durationMs:450,priority:3,cooldownMs:700,maxConcurrent:3,
  event:'zombie.attack',transition:'zombie attack windup / lunge',
  payload:['zombieId','position','targetId'],
  dedupe:'per attack; cooldown 700ms',
  direction:'Lunging screech/roar, heavy drive.',reuse:'ADD.'}),
 _opCue({id:'op.zombie.hurt',label:'Zombie hurt',family:'zombie',_variants:['a','b','c'],bus:'voice',spatial:true,reach:150,durationMs:300,priority:2,cooldownMs:250,maxConcurrent:4,
  event:'zombie.hurt',transition:'zombie takes accepted damage',
  payload:['zombieId','position','amount'],
  dedupe:'coalesce rapid damage; cooldown 250ms',
  direction:'Pained gurgle bark, choked.',reuse:'ADD.'}),
 _opCue({id:'op.zombie.death',label:'Zombie death',family:'zombie',_variants:['a','b'],bus:'voice',spatial:true,reach:170,durationMs:820,priority:3,
  event:'zombie.death',transition:'zombie KO',
  payload:['zombieId','position'],
  dedupe:'one per death',
  direction:'Collapsing groan, pitch falling away.',reuse:'ADD.'}),
].map(Object.freeze));

// The global mix policy that keeps callouts intelligible over combat and prevents radio spam.
export const OPERATION_AUDIO_POLICY=Object.freeze({
 radioChannel:Object.freeze({single:true,minGapMs:1200,preemptByPriority:true,route:'audio.radioChain()->voice bus',
  note:'Squad + pursuit reports share ONE radio channel: at most one at a time, 1.2s min gap, higher-priority (spotted/reacquired) preempts lower (search). Prevents radio spam.'}),
 speechCoexistence:'Report cues are <=0.45s and route on the voice bus; while a spoken line plays a report yields (priority-drop) or ducks it, so dialogue stays intelligible over combat.',
 observerKnowledge:'Pursuit reports fire ONLY on the emitting observer\'s own accepted knowledge transition, are non-positional to the listener, and never reveal an unseen enemy. Debounce LOS flicker with each cue\'s cooldownMs; record the suppression reason for diagnostics.',
 voiceBudget:Object.freeze({zombieMaxConcurrent:4,radioMaxConcurrent:1}),
 duckOnReport:{bus:'sfx',db:-3},
});

// One package export mirroring audioCuePackage(); consumed by the operation-audio test + reel and
// the handoff. `wired:false` throughout — asset delivery, not live gameplay.
export function operationAudioPackage(){return {format:'lsw.operation-audio',version:1,
 provenance:'Original deterministic DSP synthesis (authoring/audio/operation-v1/). No AI audio model, no recorded or cloned human voice, no third-party sample. See docs/handoffs/operation-audio.md.',
 wired:false,assetsDir:'public/audio/operation-v1/',recipes:'authoring/audio/operation-v1/recipes.mjs',
 cues:OPERATION_AUDIO_CUES,policy:OPERATION_AUDIO_POLICY};}
