import {AUDIO_CUES,DIALOGUE_CANDIDATES,BEAM_SOUND_DIRECTIONS} from './audio-cues.js';

// Original directions remain the authority; this layer adds playable authoring recipes.
const recipes={
 impact:[150,38,.85,'sine'], heavy:[95,28,.9,'triangle'], air:[420,180,.95,'sine'],
 energy:[190,740,.35,'sawtooth'], hum:[92,115,.45,'triangle'], metal:[1900,570,.7,'triangle'],
 ui:[660,990,.08,'sine'], voice:[155,115,.3,'triangle'], warning:[270,65,.2,'square'],
 engine:[65,85,.85,'sawtooth'], gun:[165,38,.95,'triangle'], shimmer:[1400,2400,.65,'sine'],
};
function cue(id,label,family,phase,description,recipe='air',duration=.35,loop=false,extra={}){
 const [frequency,endFrequency,noise,wave]=recipes[recipe];
 return {id,label,family,phase,event:`${family}.${phase}`,description,generationPrompt:`${description} Deliver an isolated, clean ${loop?'seamless loop':'one-shot'} with no music or unrelated voices; ${duration} seconds.`,duration,loop,
  bus:family==='dialogue'?'voice':['ui','correspondent','objective'].includes(family)?'ui':'sfx',spatial:family==='dialogue'?'speaker-distance':['ui','correspondent','objective'].includes(family)?'nonspatial':'world-distance-and-pan',gain:.55,cooldown:loop?0:.08,concurrency:loop?1:4,
  placeholder:{frequency,endFrequency,noise,wave,attack:recipe==='impact'||recipe==='gun'?.004:.025},nativeMethod:null,wiring:'preview-only',...extra};
}
const mapping={charge:['beam','energy',1.5],release:['beam','energy',.65],beam:['beam','hum',2],contact:['beam','impact',.18],
 'beam-cover-contact':['beam','metal',1.2],blast:['beam','energy',.25],'blast-impact':['weapons','heavy',1.1],light:['melee','impact',.18],heavy:['melee','heavy',.42],swing:['melee','air',.2],guard:['defense','metal',.16],deflect:['defense','shimmer',.23],construct:['constructs','shimmer',.7],
 'nanite-break':['nanites','metal',.3],'nanite-reform':['nanites','metal',1.5],gun:['weapons','gun',.24],teleport:['defense','shimmer',.35],depleted:['beam','warning',.45],shutdown:['beam','warning',.3],pain:['dialogue','voice',.4],landing:['movement','impact',.4]};
const sourceCues=AUDIO_CUES.map(c=>{
 const [family,recipe,duration]=mapping[c.id];
 const nativeMethod=['light','heavy'].includes(c.id)?'meleeHit':null;
 return cue(c.id,c.label,family,c.phase,c.direction,recipe,duration,c.playback==='loop',{event:c.event,timing:c.timing,sourceDescription:c.source,existingNativeMethod:c.method,nativeMethod,wiring:nativeMethod?'native-replacement':'preview-only',nativeNote:nativeMethod?'Chosen recording replaces the complete native melee contact. Without a binding, existing local native sound remains.':c.status==='native'?'Existing game sound is available, but this library binding is not connected to that native event.':'Dedicated gameplay cue is not wired.'});
});
const additions=[
 ['weather-domain-rain','Storm Domain / local rain','weather','sustain','A localized ceiling of heavy rain with close droplets, soft wind and distant wet splashes. No thunder, speech or music; seamless rain loop.','air',3,true,{bus:'ambient',reach:240,concurrency:4,wiring:'native-loop',nativeMethod:'StormLayer.updateRain',nativeNote:'One spatial rain loop per owned domain, up to four. Cloud buildup precedes onset. Shelter and distance attenuate; owner cancellation, depletion, KO and reset stop only this voice.'}],
 ['weather-domain-thunder','Storm Domain / local thunder','weather','impact','A strong overhead crack rolling outward into a short low thunder rumble. No weapon chirp, voices or music; one localized storm strike.','heavy',2.2,false,{bus:'ambient',reach:600,cooldown:0,concurrency:4,wiring:'native-replacement',nativeMethod:'StormLayer.update',nativeNote:'Each domain schedules one distance-delayed cue after its warned lightning impact. Its four-to-eight-second strike timer bounds cadence; cancellation removes only its pending or playing thunder.'}],
 ['weather-vortex','Weather / vortex roar','weather','sustain','Continuous broad low wind roar with swirling grit and intermittent loose debris rattles. No explosions, speech or music. Seamless outdoor storm loop.','air',3,true,{bus:'ambient',reach:1100,concurrency:1,wiring:'native-loop',nativeMethod:'WeatherVortex.update',nativeNote:'One spatial owned loop per visible vortex; warning-to-active intensity. Stops on expiry, weather change and match reset. Placeholder or selected recording.'}],
 ['weather-rain','Weather / rain bed','weather','sustain','Continuous rain hiss with fine close droplets and a soft distant wash. No thunder, speech or music; seamless background bed.','air',3,true,{bus:'ambient',spatial:'nonspatial',wiring:'native-loop',nativeMethod:'Weather.update',nativeNote:'One owned loop follows rainfall intensity; quieter under shelter, stopped on reset/disposal. Placeholder or selected recording.'}],
 ['weather-thunder','Weather / delayed thunder','weather','impact','Deep rolling outdoor thunder, a sharp initial crack giving way to a long low rumble. No explosion debris or electric weapon chirp.','heavy',2.2,false,{bus:'ambient',reach:1600,cooldown:2,concurrency:1,wiring:'native-replacement',nativeMethod:'Weather.update',nativeNote:'One cue per actual weather strike after distance-based delay; clearing weather cancels the pending cue and its owned voice.'}],
 ['grenade-prepare','Grenade / grip and safety','weapons','prepare','Short pouch cloth movement, firm grenade grip and dry safety lever click. No explosion or energy charge.','metal',.2,false,{wiring:'native-replacement',nativeMethod:'beginThrowAction',nativeNote:'Once per accepted soldier throw; replaced by a chosen recording through the sound harness.'}],
 ['grenade-release','Grenade / hand release','weapons','release','Quick overarm cloth swish and tiny metal lever tick at hand release. No explosion; the later impact is separate.','air',.18,false,{wiring:'native-replacement',nativeMethod:'resolveThrowRelease',nativeNote:'Once at the actual hand release, never during an interrupted wind-up.'}],
 ['walk','Walking footfall','movement','walk','Soft alternating boot sole taps with a small grit scuff; individual foot contact.','impact',.12],
 ['run','Running footfall','movement','run','Firm fast heel contact, compressed body weight and brief gravel movement.','impact',.17],
 ['hover','Hover pressure','movement','hover','Quiet low floating pressure with a slow airy shimmer; steady with no thrust attack.','hum',2,true,{wiring:'native-loop',nativeMethod:'updateFlightAudio',nativeNote:'Player controlled flight at low speed; chosen recording only. Stops on landing, launch, capture, KO or removal.'}],
 ['flight','Flight air','movement','flight','Broad smooth rushing air and faint energy body following travel speed.','air',2,true,{wiring:'native-loop',nativeMethod:'updateFlightAudio',nativeNote:'Player controlled flight above hover speed; decoded bundled or chosen recording, intensity follows speed. Explicit placeholder preference stays silent. Stops on landing, launch, capture, KO or removal.'}],
 ['boost','Flight boost','movement','boost','Sharp air intake blooming into a short forceful thrust rush.','energy',.7],
 ['brake','Air brake','movement','brake','A reverse air wash falling in pitch, quickly settling into stillness.','air',.45],
 ['windup','Melee anticipation','melee','windup','Close cloth tension and low gathering effort before a committed heavy strike.','hum',.45],
 ['miss','Melee miss','melee','miss','A fast empty swish with a dry cloth flick, no flesh impact.','air',.22],
 ['guard-break','Guard break','melee','break','Brittle defensive crack followed by a short descending energy collapse.','metal',.45,false,{wiring:'native-replacement',nativeMethod:'Fighter.takeDamage',nativeNote:'Decoded bundled or chosen recording plays on a resolved guard break, including energy exhaustion and heavy crush. Ordinary blocks and held guard do not trigger it.'}],
 ['grab','Grab capture','melee','grab','Cloth snatch and compact body compression on a successful seize.','impact',.2,false,{wiring:'native-replacement',nativeMethod:'MeleeSystem.update',nativeNote:'Chosen recording replaces the capture hit sound once when an enemy is successfully seized. Failed, interrupted or out-of-range attempts do not play it.'}],
 ['throw','Throw release','melee','throw','Low forceful air displacement and grip release before the later landing.','air',.35],
 ['melee-recovery','Melee recovery','melee','recovery','Small settling cloth shuffle and breath after a committed strike.','air',.24],
 ['beam-clash','Beam clash','beam','clash','Two pressures colliding: restrained rough electrical crackle above a wavering low roar.','energy',2,true],
 ['shield-raise','Shield raise','defense','raise','Fast compact energy sheet opening with a soft resonant rim.','shimmer',.4],
 ['shield-lower','Shield lower','defense','lower','A smooth inward electrical fold with a small closing click.','warning',.25],
 ['construct-fracture','Construct fracture','constructs','fracture','Solid resonant crystal-like fracture with several short scattering pieces.','metal',.55],
 ['nanite-form','Nanite formation','nanites','formation','Fine metallic ticks converge into a compact mechanical locking plate.','metal',.8],
 ['reload','Reload / prepare','weapons','reload','Brief grip adjustment and cloth movement as reload begins; no magazine seating or bolt action yet.','air',.18,false,{wiring:'native-replacement',nativeMethod:'requestReload',nativeNote:'One placeholder or chosen recording when a physical firearm accepts a reload.'}],
 ['reload-eject','Reload / magazine release','weapons','eject','Single magazine catch click and short slide-out scrape. No shot, seating clack or bolt action.','metal',.14,false,{wiring:'native-replacement',nativeMethod:'updateFirearmReload',nativeNote:'Once at 20% of the authored reload duration; interruption cancels remaining phases.'}],
 ['reload-insert','Reload / magazine seat','weapons','insert','Firm magazine insertion and positive locking clack. No shot or bolt action.','metal',.18,false,{wiring:'native-replacement',nativeMethod:'updateFirearmReload',nativeNote:'Once at 65% of the authored reload duration.'}],
 ['reload-chamber','Reload / chamber ready','weapons','chamber','Short bolt pull and spring-forward mechanical snap. No muzzle report.','metal',.2,false,{wiring:'native-replacement',nativeMethod:'updateFirearmReload',nativeNote:'Once at 90% of reload; firing resumes only on full completion.'}],
 ['empty','Empty weapon','weapons','empty','Single dry hammer click, close and small, without a firing report.','metal',.08,false,{cooldown:.6,wiring:'native-replacement',nativeMethod:'emptyFirearm',nativeNote:'Empty physical trigger; throttled per fighter to prevent held-trigger spam.'}],
 ['heavy-weapon','Heavy weapon discharge','weapons','heavy','Hard muzzle crack over a deep pressure thump and broad short outdoor tail.','gun',.65],
 ['scout-gunshot','Scout mounted rifle','vehicles','discharge','One dry mounted-rifle muzzle crack with a compact low mechanical body and short outdoor tail. Each round is separate; do not bake a burst or an explosion into the recording.','gun',.24,false,{reach:260,cooldown:.12,concurrency:2,wiring:'native-replacement',nativeMethod:'ScoutGunner.update',nativeNote:'Front Line scout: one spatial placeholder or chosen recording per actual finite-speed round; three-round bursts, with acquisition and recovery gaps.'}],
 ['environment-hit','Environmental impact','weapons','environment','Chunky concrete strike with scattered grit and a short solid body.','heavy',.5],
 ['rotor','Helicopter rotor','vehicles','rotor','Rhythmic low rotor chopping and restrained mechanical whine; distant outdoor loop.','engine',3,true,{reach:1200,wiring:'native-loop',nativeMethod:'FrontlineAircraft',nativeNote:'PowerWorld transport helicopter loop; placeholder or chosen recording, moving distance and stereo pan.'}],
 ['jet','Jet engine','vehicles','jet','Continuous turbine hiss over a steady bass roar, without a pass-by pitch swoop.','engine',3,true,{reach:2200,wiring:'native-loop',nativeMethod:'FrontlineAircraft',nativeNote:'PowerWorld patrol jet loop; placeholder or chosen recording, moving distance and stereo pan.'}],
 ['flyby','Vehicle flyby','vehicles','flyby','Rising approach roar crossing into a falling pitched departure and air wake.','engine',1.5],
 ['vehicle-explosion','Armored vehicle explosion','vehicles','impact','Deep fuel-pressure boom, tearing armored metal and a short gritty debris tail; a single outdoor explosion, not a weapon discharge.','heavy',1.4,false,{reach:280,wiring:'native-replacement',nativeMethod:'FrontlineConvoy.destroy',nativeNote:'PowerWorld scout destruction; synthesized placeholder or the chosen recording, one cue per destroyed vehicle.'}],
 ['record-start','Correspondent recording','correspondent','record','Small tactile camera record latch with a crisp electronic confirmation.','ui',.22],
 ['broadcast','Broadcast opening','correspondent','broadcast','Compact urgent local-news brass-like rise, low drum body and clean end.','energy',1.2],
 ['highlight','Highlight transition','correspondent','highlight','Brief analog static sweep and clean editorial cut, no explosive tail.','air',.28],
 ['objective','Objective received','objective','received','Warm concise two-tone confirmation with a soft communication click.','ui',.4],
 ['objective-complete','Objective complete','objective','complete','Clear ascending resolution with a restrained bright success tail.','shimmer',.7],
 ['sample-recovery','Blood sample recovered','recovery','sample','Sealed vial click, soft device confirmation and tiny fluid movement.','ui',.6],
 ['return-sample','Sample delivered','recovery','return','Laboratory docking latch and a low positive device acknowledgement.','metal',.5],
 ['research-start','Research starts','research','start','Quiet laboratory scanner spin-up with small data ticks.','energy',.8],
 ['research-loop','Research analysis','research','analysis','Restrained scanner hum and faint repeating analytic pulses.','hum',2,true],
 ['research-unlock','Attribute unlocked','research','unlock','Measured ascending harmonic confirmation followed by a definite unlock click.','shimmer',.9],
 ['ui-select','UI selection','ui','select','Soft rounded tactile tick, short enough for repeated menu selection.','ui',.08],
 ['ui-confirm','UI confirmation','ui','confirm','Two clear warm upward notes and a tiny tactile closure.','ui',.22],
 ['ui-denied','UI denied','ui','denied','Short low descending pair that signals an unavailable choice.','warning',.22],
];
const extended=additions.map(args=>cue(...args));
const dialogue=DIALOGUE_CANDIDATES.map(c=>cue(`dialogue.${c.personality.toLowerCase().replaceAll(' ','-')}.${c.event.toLowerCase()}`,`${c.personality} / ${c.event}`,'dialogue','line',`Original dialogue performance: “${c.line}” Character style: ${c.personality}. Natural, concise battlefield delivery.`, 'voice',1.3,false,
 {line:c.line,personality:c.personality,event:c.event,category:c.event,priority:['KO','guard-break','energy-drained'].includes(c.event)?3:1,expiry:3,lineCooldown:45,categoryCooldown:12,nativeNote:'Preview-only dialogue candidate. The synthesized marker is nonverbal and does not speak this line.'}));
export const SOUND_CUES=Object.freeze([...sourceCues,...extended,...dialogue].map(c=>Object.freeze(
 ['nanite-form','nanite-break','nanite-reform'].includes(c.id)?{...c,wiring:'native-replacement',nativeMethod:'updateNaniteAudio',nativeNote:'One spatial cue per observed formation, cell break or completed repair transition; simultaneous cell changes coalesce.'}:c)));
export const SOUND_CUE_BY_ID=new Map(SOUND_CUES.map(c=>[c.id,c]));
export function generationBrief(){return {format:'lsw.sound-generation-brief',version:1,cues:SOUND_CUES.map(({id,family,phase,event,generationPrompt,duration,loop,line,personality,wiring})=>({id,family,phase,event,generationPrompt,duration,loop,line,personality,wiring})),beamReferences:BEAM_SOUND_DIRECTIONS};}
