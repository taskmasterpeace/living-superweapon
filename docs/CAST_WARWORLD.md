# WAR WORLD — THE CAST

**A portrait-art commission brief and character handoff document.**

Source repository: `D:/git/ShootEM` (read-only for this document). Everything below is
**measured from the code**, not invented. Where the code says nothing, this document says
so explicitly — those gaps are the work list at the end.

The single most important finding: **all eight playable classes are already fully cast.**
They have names, ages, ethnicities, home cities, accents, vocal descriptions, personality
rules, and 186 + 44 lines of recorded, transcript-checked dialogue. Nobody needs naming.
What they do **not** have is a face — see THE WORK LIST.

**Primary sources**
| What | Where |
|---|---|
| The seven-class cast bible (personas, all dialogue, acting notes) | `D:/git/ShootEM/tools/sound-class-vo.mjs` |
| The Infiltrator's cast bible (persona, 44 lines, acting notes) | `D:/git/ShootEM/tools/sound-odessa-vo.mjs` |
| Class stats, loadouts, abilities, class colours | `D:/git/ShootEM/src/sim/data.ts` (`CLASSES`, line 372) |
| Weapon names | `D:/git/ShootEM/src/sim/data.ts` (line 26 onward) |
| Which weapon families each class may draw | `D:/git/ShootEM/src/sim/arsenal.ts` (`CLASS_ARMORY`, line 205) |
| Per-class silhouette geometry (the only appearance data that exists) | `D:/git/ShootEM/src/client/models/soldiers.ts` (line 880 onward) |
| Player-facing class descriptions | `D:/git/ShootEM/docs/MANUAL.md` (§5, line 83) |
| Casting manifests (rendered audio + persona, as shipped) | `D:/git/ShootEM/public/audio/casting/` |

---

## INDEX

| Class | Name | Role in one line | Signature weapon |
|---|---|---|---|
| Infantry | **Gabriel "Gabe" Reyes** | The squad anchor — takes ground and keeps it | Maklov AR-606 assault rifle |
| Heavy Weapons | **Omar "Big O" Haddad** | The mobile wall — firepower and a shield dome | AC-Mk2 autocannon |
| Jump Trooper | **Keisha "Kite" Bell** | The rooftop skirmisher — owns the air | Kuchler K6 SMG + jetpack |
| Combat Engineer | **Naveen "Patch" Singh** | The fortifier — sentries, mines, repairs | CAW-8 shotgun + repair gun |
| Field Medic | **Dr. Amina "Doc" Okafor** | The reason the squad is still standing | Kuchler K6 SMG + medi-beam |
| Infiltrator | **Odessa "Miss Dee" Broussard** | The cloaked marksman — the one Robert got right | RG-2 railgun |
| Pathfinder | **Mateo "Skip" Alvarez** | The route-maker — warp gates and shove | Impulse Cannon |
| Ghost | **Elias "Switch" Baptiste** | Counter-intelligence — sees through walls | Kamenel Plasma + recon drone |

**Factions** (`data.ts:841`): **The United Front** — amber, described in the model code as
*"veteran steel"*. **The Collective** — cyan, *"synthetic glass."* Every class exists on both
sides; the cast above is the voice of the class, not of one faction.

---

# PART ONE — THE EIGHT PLAYABLE CLASSES

All eight are fully cast. Each entry below gives the name, who they are (with their own lines
quoted, because the dialogue is a better portrait brief than any description), what can actually
be derived about their appearance, their issue loadout in plain words, and what separates them
from the other seven.

## 1. INFANTRY — GABRIEL "GABE" REYES

**NAME** Gabriel "Gabe" Reyes. Called **Gabe**.

**WHO THEY ARE** A 34-year-old Mexican-American infantryman from South Texas. The code is
specific about what he is *not*: *"the squad anchor rather than a shouting drill sergeant."*
Dependable, observant, quietly protective. *"His humor is practical and sparse, and immediate
danger strips every joke away."* Voice is a warm working-man baritone with a restrained South
Texas cadence. Direction: *"Keep the delivery plainspoken and grounded, never a movie-trailer
soldier. Let warmth appear most clearly when he helps another trooper."*

His own lines carry him better than description does:
> "Gabe Reyes. Rifle up, eyes open. Stay near me and we all get home."
> "This patch is ours. Make 'em pay rent."
> "I'm down, not done. Drag me in."
> "Stay with me. Breathe and look at me." *(reviving a teammate)*

And his death line, which the acting notes protect carefully — *"Fade on 'held' without adding
a scream or extra words"*:
> "Tell 'em... we held."

**WHAT THEY LOOK LIKE** Male. Class colour is a warm tan-khaki gold. Silhouette: two frag
grenades hung on the belt at the hips (`soldiers.ts:967`) — the only class that visibly carries
grenades. Standard combat helmet with dark goggles and, per the code comment, *"a HUMAN chin — a
person under the steel."* One of only two classes with a finished 3D model on disk
(`public/models/soldier_infantry.glb`). **No face, skin tone, hair, or build is specified.**

**STANDARD LOADOUT** A Maklov AR-606 assault rifle, a P9 sidearm, and four frag grenades.
His armory also opens onto carbines, shotguns, slug throwers, lasers, scatter packs and
grenade launchers — the widest weapon access of any class.

**WHAT THEY ARE GOOD AT** Winning ordinary mid-range firefights and holding captured ground.
The manual's own advice: *"When in doubt, pick this."*

**WHAT MAKES THEM DIFFERENT** He is the only class with no gadget and no gimmick — no cloak,
no jetpack, no drone, no beam. He is a rifle and a grenade and the widest gun locker in the
game, and he is the baseline every other class is measured against.

---

## 2. HEAVY WEAPONS — OMAR "BIG O" HADDAD

**NAME** Omar "Big O" Haddad.

**WHO THEY ARE** A 43-year-old Lebanese-American heavy-weapons operator from Dearborn,
Michigan. Cavernous textured bass with a Detroit edge and *"the warmth of a patient favorite
uncle."* The defining characterisation note: *"He treats enormous firepower like ordinary
factory equipment: careful, competent, faintly amused."* The code then forbids the obvious
mistake outright — ***"Never play him as stupid, lumbering, or a cartoon giant."***

> "Omar Haddad. You bring me targets; I bring the weather."
> "Big gun, small doorway. We will negotiate."
> "Long reload. This is why I have friends."
> "Cannon dry. This is socially awkward."
> "Easy, my friend. Heavy hands can still be gentle." *(reviving)*
> "Ah. Back to being everybody's wall."

**WHAT THEY LOOK LIKE** Male, physically the largest frame in the roster. Class colour is a
burnt rust-orange. Silhouette: a bandolier across the chest with four individually modelled
rounds riding it (`soldiers.ts:940`), and a visibly heavier weapon — the model code gives the
Heavy a thicker, longer receiver than any other class (`soldiers.ts:724-745`). **No face, skin
tone, hair, or facial hair is specified.**

**STANDARD LOADOUT** An AC-Mk2 autocannon, a Micro-Missile Launcher as his second weapon, and
a deployable shield dome. His locker is the siege locker: heavy and light machine guns,
anti-tank and anti-personnel rockets, mortars, a field gun, and the sonic cannon.

**WHAT THEY ARE GOOD AT** Shredding vehicles and heavy targets, and physically sheltering the
squad — the shield dome is the only portable cover in the game.

**WHAT MAKES THEM DIFFERENT** He is the slowest thing on two legs and the only class that
*creates* safety instead of consuming it. Everyone else finds cover; Omar brings it. His
weakness is structural and deliberate: he reloads slowly enough that he genuinely needs the
squad, which is the joke in "this is why I have friends."

---

## 3. JUMP TROOPER — KEISHA "KITE" BELL

**NAME** Keisha "Kite" Bell. **Kite** is her comms callsign — she introduces herself with it.

**WHO THEY ARE** A 28-year-old Black woman from Miami Gardens, Florida, and a veteran jump
trooper. Quick bright alto, *"authentic South Florida Black English rhythm, streetwise
observation, and agile sarcasm."* The direction ties her voice physically to the jetpack:
*"controlled before launch, exhilarated in flight, breathless after landing, genuinely alarmed
when thrust fails."* Two explicit guardrails: ***"No caricature and no invented slang,"*** and
*"Keep the wit quick and specific; never turn every line into a punch line."*

> "Keisha Bell—Kite on comms. If you lose me, look up."
> "Y'all take the road. I'm allergic to traffic."
> "Oh, they mad-mad! Shots from the east!"
> "Reloading in the air. Terrible life choices."
> "Feet down. Knees filing complaints."
> "Don't quit while I'm down here being responsible." *(reviving)*
> "See? Can't keep good trouble grounded."

Her death line drops the sarcasm entirely, and the notes say so — *"The care for the squad
replaces the usual sarcasm"*:
> "Hey... don't let 'em take the sky."

**WHAT THEY LOOK LIKE** Female. Class colour is a pale steel blue. Silhouette: the most
distinctive back profile in the game — twin cylindrical jetpack tanks, downward thrust nozzles
at the hips, and a pair of stabiliser fins (`soldiers.ts:925`). **No face, skin tone, or hair
is specified.**

**STANDARD LOADOUT** A Kuchler K6 SMG, a CL-40 Concussor grenade launcher (a knockback weapon
that does no damage — it *shoves*), and the jetpack. Her locker is deliberately narrow: SMGs,
carbines, shotguns and scatter packs. Close-range only.

**WHAT THEY ARE GOOD AT** Attacking from angles that do not exist for anyone else — over walls,
onto roofs, into a blind side while airborne.

**WHAT MAKES THEM DIFFERENT** She is the only class that leaves the ground under her own power,
and the only one whose resource is a *lifeline* rather than a cooldown: run the pack dry at
altitude and she falls. Her whole read — breath, pitch, confidence — is written to track fuel.

---

## 4. COMBAT ENGINEER — NAVEEN "PATCH" SINGH

**NAME** Naveen "Patch" Singh. He tells you the rule for which to use himself.

**WHO THEY ARE** A 48-year-old Punjabi-Canadian combat engineer from Brampton, Ontario. The
oldest of the seven non-Infiltrator cast. Textured knowledgeable tenor, *"an easy Canadian
cadence and subtle Punjabi musicality."* Methodical, patient, extremely dry. The line that
defines him: *"He speaks to machinery more gently than he speaks to careless soldiers, but his
concern becomes sincere when somebody is hurt."*

> "Naveen Singh. Patch if something is broken. Mister Singh if you broke it."
> "This position has good bones. Let me improve it."
> "They are shooting the engineer. Predictable and rude."
> "Diagnosis: poor maintenance." *(a kill)*
> "My sentry is gone. I take that personally."
> "I fix people reluctantly. Hold still." *(reviving)*
> "Vehicle is clean. Try not to invent a new noise."
> "Excellent. I remain billable."

His death line is the purest expression of the character — his last thought is a maintenance
note:
> "Don't leave... the turret facing the wall."

**WHAT THEY LOOK LIKE** Male, 48. Class colour is an olive-brass. Silhouette: a large wrench
slung on the back at an angle, plus a satchel on each hip (`soldiers.ts:914`). **No face, skin
tone, hair, or beard is specified — worth a decision, given he is Punjabi and turban/beard are
a live characterisation choice the code does not make.** The wardrobe system
(`models/wardrobe.ts`) has headwear slots but ships no turban.

**STANDARD LOADOUT** A CAW-8 shotgun and a repair gun, plus deployable sentry turrets and
proximity mines. His locker is short-range only: shotguns, slug throwers, SMGs, scatter packs.

**WHAT THEY ARE GOOD AT** Turning a position into a fortress, and keeping vehicles, turrets
and APCs alive mid-fight — he is the only class that repairs anything.

**WHAT MAKES THEM DIFFERENT** He is the only class whose contribution outlives his presence.
A sentry he placed keeps fighting after he walks away; a mine he armed is still there an hour
later. Everyone else's power is spent in the moment.

---

## 5. FIELD MEDIC — DR. AMINA "DOC" OKAFOR

**NAME** Doctor Amina "Doc" Okafor. **The rank is part of the name** — she introduces herself
as "Doctor Amina Okafor," and the persona string names her that way too. She is a physician who
is also a soldier, in that order.

**WHO THEY ARE** A 39-year-old Nigerian-British field medic. Controlled contralto, *"crisp
London-influenced English and a natural Nigerian cadence."* Brisk, authoritative, and
*"intolerant of preventable injuries."* The important structural note: *"The clinical wit
protects a deeply compassionate core that becomes unmistakable when a patient is frightened or
fading."* Direction: *"When treating a critical patient, lose the dryness and reveal direct
human warmth."*

> "Doctor Amina Okafor. I keep you alive; you make that difficult."
> "Check your seals, your magazines, and the person beside you."
> "Contact. I am a doctor with a weapon, not a pacifist."
> "They are targeting the medic. How original."
> "Medic down. Yes, the irony is noted."
> "Beam on you. Stop dodging your healthcare."
> "If you want treatment, stop running from the doctor!"
> "Threat treated." *(a kill)* / "Preventive medicine." *(several)*

The dryness drops completely in two places, exactly as directed:
> "Stay with me. Breathe when I tell you." *(critical patient)*
> "Eyes open. You are not leaving my shift." *(reviving)*

And her death line is still about the patient:
> "Keep... the beam on them."

**WHAT THEY LOOK LIKE** Female, 39. Class colour is a sage green. Silhouette: the only class
with a **white** backpack rather than an armoured one, carrying an emissive **red cross** that
glows (`soldiers.ts:888, 907`). She is designed to be identifiable at a distance, by both
teams. **No face, skin tone, or hair is specified.**

**STANDARD LOADOUT** A Kuchler K6 SMG, the medi-beam, and a self-stim. Her locker is the
narrowest in the game beside the Infiltrator's: SMGs and carbines only. She is armed to defend
herself, not to win fights.

**WHAT THEY ARE GOOD AT** Keeping other people alive through fire — the beam reaches through
gunfire, and she scores for healing rather than killing.

**WHAT MAKES THEM DIFFERENT** She is the only class whose score comes from *not* shooting, and
the only one written with a professional identity that outranks her military one. Her armory is
almost bare on purpose: the game wants her behind the Heavy, not beside the Infantry.

---

## 6. INFILTRATOR — ODESSA "MISS DEE" BROUSSARD

> **This is the character Robert asked about, and yes — she has a name.**
> **Odessa Broussard**, called **Miss Dee** by the squad. She is a **68-year-old Black
> American woman born and raised in New Orleans, Louisiana**, exactly as remembered. She has
> her own casting file, her own 44-line voice pack, and the most detailed persona in the
> project.

**NAME** Odessa Broussard. "Miss Dee" to the squad — she uses it about herself, in the third
person, when she is being dangerous. *Broussard* is a Louisiana Creole/Cajun surname; the name
was authored to fit the city.

**WHO THEY ARE** The full persona, verbatim from `tools/sound-odessa-vo.mjs:14`:

> *"Odessa Broussard, called Miss Dee by the squad, is a 68-year-old Black American woman born
> and raised in New Orleans, Louisiana. She is an Infiltrator and veteran intelligence field
> operative: observant, socially graceful, protective of frightened soldiers, and merciless
> toward anyone who mistakes warmth for weakness. Her voice is a low smoky contralto with
> breath, chest resonance, musical phrasing, and an authentic deep New Orleans Southern Black
> English accent. Her humor is dry and situational. People find her endearing because she
> listens, remembers names, and makes danger feel survivable. She never turns her age into a
> running joke, never becomes a caricature, and never sounds like a neutral audiobook
> narrator."*

Three prohibitions are written into that paragraph and they are the whole reason she works:
**her age is never the joke, she is never a caricature, and she is never neutral.** The
generation prompt adds a fourth: *"Use authentic New Orleans rhythm and warmth without
exaggerated dialect, parody, or added slang."*

She calls people *baby*, *darling*, *sugar*, *sweetheart*, and *babies* — and it is affection,
not affectation:

> "Odessa Broussard, baby. You keep your head down, and Miss Dee will keep the other side
> guessing." *(intro)*
> "All right, darlings. Let's go make ourselves difficult to find."
> "Check your corners. I'll check the places corners try to hide."
> "Quiet like this usually means somebody's planning something foolish."
> "Mm-hm. Take your time. Trouble always gets impatient first."
> "I'll hold here. Nothing passes without introducing itself."
> "This corner and I are acquainted now."
> "I hear you, baby. Hold on, I'm coming."

Cloaked, she goes to a whisper, and this is where the writing is best:
> "Now, let's become a rumor."
> "Keep looking forward, darling. That's where I used to be."
> "Easy now... even the air is listening."
> "Hold still... just a little longer." *(settling the rail sight — the notes say these words
> are for herself, not a taunt)*

Killing, she never celebrates. The notes insist on it: *"it is an observation, not a
celebration,"* *"No cruelty or cackle."*
> "Mm. You should've watched the quiet side."
> "There you go. Lie still for Miss Dee."
> "All that noise, and still you missed the important part."
> "I remembered you. Aren't you touched?" *(killing whoever killed her last life — the note
> says "Keep the anger cold and contained")*
> "Two down. They came together; seemed rude to separate them."

Hurt, cornered, or alone, the warmth turns to iron:
> "I'm hurt. Still thinking, though. That's the dangerous part."
> "I'm down! Don't you mourn me while I'm still talking!"
> "Just me, then. All right. I've had quieter evenings." *(last one standing)*
> "GRENADE! MOVE, BABIES, MOVE!" *(the note: "Protective terror... never theatrical
> excitement")*
> "CLOAK'S GONE! I NEED COVER!"

And her death line, which is the best line in the game and needs no explanation:
> "Oh... hush now... I was listening..."
>
> *Scene: "Odessa takes a fatal hit while concealed; the battlefield noise seems to recede as
> she falls." Notes: "Barely voiced and fading... No melodrama, no scream; the quiet operative
> dies listening."*

**WHAT THEY LOOK LIKE** Female, 68 — the oldest character in the project by twenty years. She
is the **only class whose head is modelled differently from every other soldier**
(`soldiers.ts:1057`): no helmet, no goggles. Instead a **deep dark hood** in near-black, with
**two glowing eyes** set in it, and the code comment explains why: *"hooded infiltrator, both
factions — the job hides the flag."* Her weapon silhouette is also unique — the model code
gives the Infiltrator the **longest barrel in the game** (`soldiers.ts:731`), the only true
sniper profile.

⚠️ **Her class colour is `0x8a7fb9` — measured, that is RGB (138, 127, 185), hue ≈ 251°: a
muted blue-violet, a periwinkle.** Flagging rather than quietly changing it, and stating the
measurement rather than the verdict: it sits just outside the 270–320° band the standing
no-purple rule names, but it reads as violet to the eye and it is the only colour in the class
table that does. It is her identity colour on the HUD and in the class picker, so a portrait
painted to match the class colour will come back purple-ish. **Worth a decision before art is
commissioned.** Non-purple readings that suit a New Orleans intelligence operative: tarnished
brass, deep bottle-green, or a smoky charcoal-teal.

Beyond the hood and the eyes, **her face, skin tone, hair, and build are entirely unspecified.**
For a 68-year-old woman who is the standout character in the cast, that is the single biggest
gap in this document.

**STANDARD LOADOUT** An **RG-2 railgun** — a genuine long-range precision weapon, the
longest-reaching and hardest-hitting single shot carried by any soldier, with a very small
magazine — plus a P9 sidearm, and the **cloaking field**. Her locker is the most restricted of
all eight classes: **lasers and rifles only.** No shotgun, no SMG, no explosives. She is a
marksman and nothing else. She also throws frag grenades ("Little gift going out. Don't crowd
the doorway.") and rides in vehicles ("Scoot over. Miss Dee is riding.").

**WHAT THEY ARE GOOD AT** Killing one important thing from far away and not being there
afterwards. The manual's own instruction for her is a loop: *"Rail a target, cloak, relocate."*

**WHAT MAKES THEM DIFFERENT** She is the most fragile soldier in the game and the only one who
can simply not be seen. Firing breaks the cloak, so every shot is a decision to become visible;
enemy turrets ignore her entirely; and she is invisible unless someone is nearly on top of her.
She is also the only class with a hard counter written into another class — the Ghost's drone
marks cloaked Infiltrators specifically. Where every other class fights, Odessa *chooses* whether
a fight happens.

### ⚠️ SHE HAS TWO NAMES IN THE PROJECT — THIS NEEDS A RULING

The single most important thing to settle before art is commissioned. **The same character
exists under two names in two places, and the older one carries material the recorded version
does not.**

**The design document** — `docs/PATTERN-REGISTRATION.md:49`, §4 "THE STARTER CAST," where she is
the flagship entry — calls her:

> ***"Miss Odette Baptiste** — 68, New Orleans (Tremé), church organist before the war,
> infiltrator. A badass elderly Black lady, written with total dignity: warm, unhurried, lethal.
> **"Nobody suspects grandma."** Reprint attitude: "Every print is a blessing." — **"Third time
> that man done shot me. Lord, give me strength."***

**The recorded, shipping audio** calls her **Odessa "Miss Dee" Broussard** — 68, New Orleans,
same character, same dignity law, but *Broussard* not *Baptiste* and *Odessa* not *Odette*.

Three things follow, and all three matter to the portrait:

1. **The design doc gives her biography the audio does not**: she is from **Tremé**
   specifically — the oldest Black neighbourhood in America, and the birthplace of New Orleans
   brass — and she was a **church organist before the war**. That is a far better portrait brief
   than "intelligence operative." A church organist's hands, a churchgoer's bearing, Sunday
   clothes under field kit. The VO direction *"moves like Sunday service; deadliest voice is the
   gentlest"* comes from the same entry.
2. **"Nobody suspects grandma" is the thesis of the character** and it is not in the audio pack
   at all. It should be the first line on the artist's brief.
3. **`Baptiste` is already in use.** The Ghost is **Elias "Switch" Baptiste**. If she is restored
   to *Baptiste*, she and the Ghost share a surname — which is either a lovely deliberate
   connection (two Haitian/Louisiana Creole operators, possibly family) or an accident that will
   confuse people. **Decide which.**

**Recommendation:** keep **Odessa "Miss Dee" Broussard**, because 51 lines of finished, approved,
transcript-checked audio say that name out loud and re-recording it is real cost — but **import
Tremé, the church organ, and "nobody suspects grandma" into her canon**, because that is the
material an artist actually needs and it is currently stranded in a design doc nothing reads.

---

## 7. PATHFINDER — MATEO "SKIP" ALVAREZ

**NAME** Mateo "Skip" Alvarez. He hands you the nickname in his intro.

**WHO THEY ARE** A 30-year-old Puerto Rican pathfinder from the Bronx. Fast buoyant tenor,
*"warm New York rhythm and restless forward momentum."* The characterisation is spatial:
*"He sees battlefields as doors, angles, and shortcuts. Clever without being slippery, upbeat
without being childish, and most alive when a route nobody else saw suddenly works."* Direction:
*"His pleasure comes from geometry and timing, not reckless chaos."*

> "Mateo Alvarez. Call me Skip. Maps show where people went; I show where we're going."
> "The long way is for people with no imagination."
> "Cutting left. Trust me for six seconds."
> "This lane bends through me now."
> "They found the shortcut! Need pressure!"
> "You watched the road. Rookie mistake." *(a kill)*
> "Shortcut just became a toll booth."
> "Beacon Alpha planted. This is where we leave."
> "Beacon Beta live. This is where we surprise them."
> "Pair is hot. Step clean or lose your lunch."
> "Sent them the scenic way." *(shoving someone to their death)*
> "Took the fast way to you. Stay awake." *(reviving)*

His death line keeps the squad's route safe, which is the job:
> "Close... the route behind me."

**WHAT THEY LOOK LIKE** Male, 30. Class colour is a bright teal-aqua. Silhouette: two glowing
teal beacon pylons carried upright on the back (`soldiers.ts:952`) — they emit light, so he is
the most visually *lit* class. One of only two classes with a finished 3D model on disk
(`public/models/soldier_pathfinder.glb`), and the model code notes it is the correctly-rigged
reference body the others were fixed against. **No face, skin tone, or hair is specified.**

**STANDARD LOADOUT** The **Impulse Cannon** — a concussive weapon that shoves whatever it hits
— a P9 sidearm, a pair of **warp beacons**, and a targeting beacon. His locker is carbines,
sonic cannons and SMGs.

**WHAT THEY ARE GOOD AT** Moving the whole squad somewhere it should not be able to reach, and
using the map itself as a weapon — knocking people into water, off high ground, out of a flag
room.

**WHAT MAKES THEM DIFFERENT** He is the fastest class in the game, and the only one whose
ability is used by *other people*: he plants two beacons and any teammate standing on one can
teleport to the other. Everyone else's kit serves themselves. His gun is also the only primary
weapon that kills mostly by *physics* rather than damage. The manual calls him "the Tribes
homage" outright.

---

## 8. GHOST — ELIAS "SWITCH" BAPTISTE

**NAME** Elias "Switch" Baptiste. **Switch** is his comms handle.

**WHO THEY ARE** A 35-year-old Haitian-American Ghost operator from Brooklyn. Soft low
baritone, measured Brooklyn cadence, intense observational focus. The single most useful note
in the entire cast bible, because it heads off the lazy version of this character:
***"He is quiet because he is listening, not because he is supernatural."*** And: *"Nearly
conversational during surveillance work, sharply louder when physical danger reaches the team.
Never play him as sinister or emotionless."* Direction: *"Recon lines stay close, low, and
intimate as though sharing one headset."*

> "Elias Baptiste. Switch on comms. I see the room before the room sees us."
> "Keep talking. Noise gives me edges."
> "Moving underneath their attention."
> "I have eyes through the wall. Hold still and listen."
> "They found my body! Break their sightline!"
> "Contact erased." *(a kill)* / "Their picture just went dark." *(several)*
> "Little eye, up." *(launching the drone)*
> "Taking the drone. Guard the quiet body."
> "Marked. Through the wall, three meters right."
> "Eye is gone. We work blind."
> "EMP set. Armor's about to forget its name."
> "Stay quiet. Let them think the room is empty." *(reviving)*
> "I'm bleeding. Signal remains."
> "Switch is down. Feed is still live."

His death line is two words and a full stop:
> "Feed... terminated."

**WHAT THEY LOOK LIKE** Male, 35. Class colour is a slate blue-grey. Silhouette: a tall thin
antenna mast rising off the back with a small emissive dish at the top (`soldiers.ts:959`) — the
tallest profile of any class, and the reason he reads as an electronics operator rather than a
ninja. **No face, skin tone, or hair is specified.**

**STANDARD LOADOUT** A Kamenel Plasma rifle, a P9 sidearm, an orbiting **recon drone**, and
**EMP charges**. His locker is lasers, SMGs and carbines.

**WHAT THEY ARE GOOD AT** Information. His drone marks every enemy through walls — including
cloaked Infiltrators — and his EMP stalls vehicles, blinds turrets and drops cloaks.

**WHAT MAKES THEM DIFFERENT** He is the counter-intelligence class: the only one whose kit is
aimed at *other players' abilities* rather than their bodies. He is also the only class that
leaves his own body behind — piloting the drone means his real self is standing somewhere
exposed, which is why he says "Guard the quiet body." Note the deliberate pairing: Ghost is
built to beat Odessa, and Odessa has a line for being spotted by exactly this kind of operator
("Cloak shimmer, near the wall. Oh, somebody thinks they're subtle.").

---

## VOICE CASTING REFERENCE (for the handoff)

Every pack is already rendered and transcript-checked. The synthesis voices used, should the
performances need to be regenerated or matched by a human actor:

| Character | Seed voice | Lines | Casting file |
|---|---|---|---|
| Gabriel "Gabe" Reyes | Achird | 25 | `public/audio/casting/mortal-classes-manifest.json` |
| Omar "Big O" Haddad | Algenib | 26 | same |
| Keisha "Kite" Bell | Laomedeia | 27 | same |
| Naveen "Patch" Singh | Sadaltager | 27 | same |
| Dr. Amina "Doc" Okafor | Kore | 27 | same |
| Mateo "Skip" Alvarez | Sadachbia | 27 | same |
| Elias "Switch" Baptiste | Schedar | 27 | same |
| Odessa "Miss Dee" Broussard | **Gacrux** | **51** | `public/audio/casting/odessa-manifest.json` |

186 lines across the seven mortal classes, 51 for Odessa — **she has roughly twice the coverage
of any other character**, which is itself a statement about who the project thinks she is. Her
pack includes moments no one else has: idle musing, spotting reports for infantry/armour/air/
rival cloaks, a revenge kill, a last-stand line, vehicle entry and bail-out, and seven separate
cloak states. Every line carries a **scene** (the
physical situation) and at least **two acting notes**, kept deliberately separate from the
dialogue itself. Each character additionally has a **`fadePersona`** — a separate, weaker
version of their voice used only for the death line, so the dying read is directed rather than
merely quieter.

One production note worth carrying forward, from Odessa's plan document
(`2026-07-22-odessa-infiltrator-plan.md`): *"Human ear approval is required before minting
Odessa as a permanent Dramatis character."* There is **no Dramatis registry in the codebase** —
so as far as the code is concerned that approval step was never formally closed. Odessa is
shipped and playable, but she was never promoted to a permanent cast member of record.

---

## ⚠️ THE NAMES ARE INVISIBLE IN-GAME

Measured, and it matters for this commission: **not one of these eight names is ever displayed
to the player.** Searching the shipped game source (`src/`) for the cast surnames returns
nothing but two code comments. The class picker, HUD, scoreboard and codex all say "Infiltrator"
and "Field Medic" — never "Odessa Broussard" or "Dr. Amina Okafor."

The names exist in exactly three places:

1. **Spoken aloud**, once, in each character's intro line — the only way a player learns that
   the Infiltrator is called Odessa is by *hearing her say it* at the start of a match.
2. **The casting tools** (`tools/sound-class-vo.mjs`, `tools/sound-odessa-vo.mjs`) — which are
   **build-time only and not imported by the game at all**.
3. **Two comments** in `src/client/audio.ts` and `src/client/classvo.ts`.

So the project has a fully realised cast that the player can hear but never see or read. That
is the strongest practical case for the portrait pass: **a portrait with a name plate under it
is the first time any of this writing becomes visible.** Recommend that whatever surface the
portraits land on (class select, codex, squad roster) also carries the name, the callsign, and
the home city — the material is already written.

*(Unrelated coincidence, noted so it is not mistaken for a cameo: `src/sim/science-runtime.ts:234`
generates throwaway scientist names including "Dr. Okafor" and "Dr. Reyes." These are procedural
filler in the science layer and are not the medic or the infantryman.)*

---

# PART TWO — EVERY OTHER NAMED CHARACTER

The eight classes above are the finished cast. Beyond them the project contains a **great deal**
more character work at wildly different levels of completion — some fully recorded, some written
and never voiced, some biographies with no name attached. Everything below is measured; the
naming gaps are collected in THE WORK LIST at the end.

## A. THE BOT PATTERNS — eight biographies, seven of them UNNAMED

`docs/PATTERN-REGISTRATION.md:47-63`, §4 "THE STARTER CAST — authored bot Patterns." **This is a
second, parallel cast** — personalities for *bot* squadmates, distinct from the eight class
voices. Odessa/Odette is the flagship of this list and the only one with a name. The other seven
have an age, a city, a pre-war job, and a voice hook — **and no name at all.** This is the
clearest naming work list in the project.

| Slot | Age · City · Former life | The voice hook (verbatim) | Name |
|---|---|---|---|
| Infiltrator | 68 · New Orleans (Tremé) · church organist | *"moves like Sunday service; deadliest voice is the gentlest"* | **Miss Odette Baptiste** |
| Infantry | 34 · Philadelphia · ex-corrections officer | *"insults as suppressive fire; never satisfied, never quiet"* | ⚠️ **UNNAMED** — "the mean one" |
| Medic | 51 · Manila · ex-nurse | *"That's a scratch. I've SEEN scratches."* — triage deadpan | ⚠️ **UNNAMED** |
| Engineer | 45 · Cleveland · ex-elevator-inspector | *"I wouldn't ride that bridge, and I inspected bridges"* | ⚠️ **UNNAMED** |
| Heavy | 29 · Apia, Samoa · ex-bouncer | *"softest-spoken giant; counts to three exactly once"* | ⚠️ **UNNAMED** |
| Pathfinder | 22 · Lagos · ex-rideshare driver | *"narrates routes like pickups: 'two minutes out, don't make it weird'"* | ⚠️ **UNNAMED** |
| Marksman | 60 · Tromsø · ex-fisherman | *"patience metaphors; weather-reads the battlefield"* | ⚠️ **UNNAMED** |
| Officer | 47 · Zürich · ex-debt-collector | *"'everyone pays eventually' — the ledger voice"* | ⚠️ **UNNAMED** |

Two notes. **"Marksman" is not one of the eight playable classes** — it appears only here, so
this list either predates or proposes beyond the current roster. And the document names a tone
target for the whole cast (`:51`): *"**Meltdown (Jagged Alliance 2)** — Robert's all-time
favorite because* she's mean. *One cast slot is always the mean one."* The dignity law is stated
at `:65`: *"Every one is written by the author pass with dignity: people, never caricatures."*

## B. THE TWO WALK-UP NPCs — both need portraits

### DR. VOSS — the escort objective
**NAME** Dr. Voss. No first name anywhere. Male ("he" throughout).

**WHO** The VIP of *Protect the Scientist* / safehouse mode — unarmed, does not respawn, and the
match ends if he dies (`src/sim/world.ts:1792-1795`). He is also cast as the meta-layer's tech
tree: *"The scientist is the tech tree. Dr. Voss — already in the game"*
(`docs/DESIGN-DIRECTIVE.md:438`). His written personality is a peevish, cowardly, self-important
academic, and it is **written but never recorded** — the six best lines exist only in
`docs/VO-CATALOG.md:236-242`:

> "Fine. But if I die, the research dies, and THEN who's laughing?"
> "Holding position. Like a very educated sandbag."
> "IT'S NEAR ME. THE THING IS NEAR ME."
> "I am a DOCTOR, not a — ow — TARGET!"
> "Inside! Lock it! …Thank you. All of you. Now never again."
> "Fascinating — the reanimation latency drops with ambient heat. You're all in terrible
> danger, by the way."

**LOOKS LIKE** The **only NPC in the game with a described appearance**
(`src/client/models/soldiers.ts:642`): *"Dr. Voss: lab coat, spectacles, no weapon."* The model
builds an off-white lab coat with coat tails, slate-grey slacks, dark shoes. **Spectacles are
canon — the only eyewear specified on any character in the project.** Age, ethnicity, hair
unspecified. Suggested casting on file (`VO-CATALOG.md:47`): *"dry, exhausted academic."*

### VANESSA — the proprietor of Vanessa's Paintball
**NAME** Vanessa. No surname.

**WHO** The shop-keeper of a walkable paintball pro shop, and **the only walk-up-and-talk NPC in
the game** — the only consumer of the entire comic-panel dialogue engine. She sells and rents
the four paintball markers, and her counter writes to the real player loadout. She is spawned
`dummy = true` — *"she stands her counter; no bot brain marches her"* — facing *"into her shop,
at her customers,"* and made permanently invulnerable because *"the house does not get splatted"*
(`src/client/vanessas-place.ts:101-108`).

Warm, dry, maternal, and proprietary about her own gear:
> "Welcome to VANESSA'S, hon. Everything on these walls shoots paint. Walk up and get
> acquainted."
> **"Opened the shop when the war got too serious. Paint washes out. Losing doesn't."**
> "That one's mine. You clean it before you bring it back." *(the pump marker — she owns it
> personally)*
> "The Fan doesn't aim, sweetheart. It VOTES."
> "The Blitz eats pods, hon. Bring dry gloves and a plan."
> "Rent the Lobber and the maze plays different. Ask the ceiling."
> "Heading back to the war already?"

**LOOKS LIKE** ⚠️ **Nothing. She is rendered as the generic male infantry soldier body** —
`buildSoldier(0, 'infantry', 'human')` at `src/client/vanessas.ts:134`. Her dialogue reads as an
older, warm, Southern-inflected woman; the model is a trooper in fatigues. **No age, ethnicity,
face, hair, or clothing is specified anywhere, and she has no VO cast entry.** For the only NPC
a player can walk up to and talk with, that is a large gap — and a cheap, high-visibility
portrait win.

## C. THE PAINTBALL REGULARS — seven named rivals, written, unvoiced

`src/sim/personas.ts`. From Robert (`:1-15`): *"what if you're going against SPECIFIC people when
you play paintball… make bots talk trash to you"* and *"they should be able to yell at me when
they're within distance."* Each has a play style, a signature marker, and three line tables
(match start / after splatting you / proximity taunt), rendered as barks that **literally hang
over their heads**. All seven are named. Voice packs are future work.

| Name | Style | Character read | Verbatim |
|---|---|---|---|
| **Vex** | rusher | Cocky speed-demon; refers to himself in the third person | "THAT'S THE VEX SPECIAL!" · "I CAN HEAR YOU BREATHING!" · "RUN! IT'S FUNNIER!" |
| **Piston** | rusher | Loud doorway bully; the scatter-gun is his whole identity | "SEVEN BALLS SAY HELLO." · "WALL OF PAINT, BABY!" · "THE FAN FORGIVES NOBODY!" |
| **Widow** | flanker | Quiet, precise, menacing — **written in lower case while the rushers SHOUT** | "I'll take the long way." · "One ball. That's all this needs." · "Behind you. Or am I?" · "Quiet now." |
| **Jinx** | flanker | Gleeful chaos; freely admits she doesn't aim | "SKY PAINT INCOMING!" · "GRAVITY'S ON MY TEAM!" · "HA! DIDN'T EVEN AIM!" |
| **Marrow** | anchor | **Every single line is one word.** The most distinctive voice in the file | "Holding." · "Come." · "Mine." · "Next." · "Sit." · "Stop." |
| **Saber** | anchor | The gentleman — chivalrous, formal, sportsmanlike | "Play it clean out there." · "Walk it off — that was fair paint." · "Turn back. Last courtesy." |
| **Grit** | anchor | The old-timer; calls the player "kid" | "The junkyard remembers me." · "Kids these days." · "I've slept in this bunker, kid." · "You walk loud." |

**None has any described appearance.** Note `personas.ts:2` cites `docs/COMPETITIVE-ARC.md` as
their source document — **that file does not exist**, so the code comment is their only lore.

## D. VOICES WITHOUT PEOPLE — three unnamed personas worth naming

- **THE ANNOUNCER** — cast, recorded and shipping. Voice *Orus*, 160 lines, radio-filtered.
  Persona (`tools/lsw-vo-script.mjs:276`): *"a military radio-net voice, clipped, professional,
  been doing this too long to be surprised. **Equal parts air-traffic control and boxing ring.**"*
  Director's note: *"Military net deadpan with bureaucratic menace. He has seen everything and
  files it all."* ⚠️ **UNNAMED.**
- **THE OFFICER** — `src/sim/officer.ts` is a rules function, not a character, but it *speaks*,
  and in a very specific voice: *"REQUEST APPROVED — HEAVY. Bring the iron." · "REQUEST APPROVED
  — INFILTRATOR. Be nowhere." · "DENIED — one wrench per trench." · "DENIED — the shadows are
  crowded."* The file header calls this *"the officer's doctrine."* ⚠️ **UNNAMED, and the
  command audit flags it**: `docs/COMMAND-AUDIT.md:184` says the Officer rung is *"never
  presented as 'you, the Officer.'"* The whole chain (President → Secretary of War → General →
  Officer) has **no faces at all**, and there are two candidate personas for the slot — the
  Zürich ex-debt-collector above, and Todd "Shogun" Benchley below.
- **THE DRIVING INSTRUCTOR** — `src/sim/courses.ts`, twelve licence briefs in one consistent
  laconic teacher's voice, never named: *"A car goes where its weight is going." · "Five tonnes
  forgives nothing." · "Water has no brakes. You steer with the throttle and stop with
  patience." · "A rotor lets you stop in the sky. Everything else about that is your problem." ·
  "You are not in the vehicle. Nothing you feel is real — only what the feed tells you." · "The
  squad rides in the back. Insertion is a promise you make to eight people."* ⚠️ **UNNAMED.**

## E. THE DOGS — named from a pool, no individual identity

`src/sim/data.ts:876` — one dog per team, drawing a name from eight:

> `DOG_NAMES = ['Rex', 'Ajax', 'Bruno', 'Sable', 'Grit', 'Valkyrie', 'Koda', 'Havoc']`

No dog has a personality, backstory or dialogue; barking is a sound event. **The character hook
is written and not built** — `docs/DOGS-AND-ANIMALS.md:80,118`: *"It has a name and a record." ·
"Rex — 3 tours, 41 finds, wounded twice." · "**When a K9 goes down and the handler carries it to
the ambulance, that's the clip of the match. Dogs are how you make players feel things.**"* The
doc's own Gap #1: *"No service record. The dog has a name but no history."*

⚠️ **Breed contradiction, for the art brief:** the design says **Malinois**
(`DOGS-AND-ANIMALS.md:75`) and the shipped model is a **German Shepherd** — *"sloped body, black
saddle, dark snout, pricked ears… team-coloured K9 harness"* (`:56`) — and the doc itself flags
the mismatch at `:104`. **Pick one before anyone draws a dog.**

There is also a robot dog: the **junkhound** (`data.ts:834`), serial **HOUND-03**, one of the
four "Iron Eaters," described as *"machine to the last."*

## F. THE FORTY LIVING SUPER WEAPONS — a full cast sheet, already voiced

`tools/lsw-vo-script.mjs` describes itself as *"the casting sheet and the recording script in
one."* **Forty named "gods,"** each with a TTS voice, an audio FX profile, a written persona and
a scene; roster in `src/sim/lsw.ts:89-522`, five spoken moments each (arrive / triple-kill /
ability / low health / death). **This is by far the largest portrait job in the project** and is a
separate tier from the mortal soldier classes — flagging it as scope rather than enumerating all
forty. A representative sample of the persona writing, verbatim, to show the level of detail
already available per god:

| Name | Faction | Persona (verbatim excerpt) |
|---|---|---|
| **Firebrand** | UF | *"a fire-control specialist who fell in love with the fire… **Voice like a lit fuse.**"* |
| **Plaguebearer** | Collective | *"a quarantine engineer who BECAME the outbreak… **every word through a respirator.**"* |
| **Frostbite** | UF | *"cryo-containment made flesh. A woman's voice… **Words rationed like heat in winter.**"* |
| **Ragebeast** | Collective | *"**words come out broken because the throat was not built for them.**"* |
| **Titan** | UF | *"a mountain that learned to walk… **like boulders settling.**"* |
| **Oblivion** | Collective | *"**utterly certain that everything ends and mildly bored by how long it is taking.**"* |
| **Specter** | Collective | *"**a man who is a crowd**… he says 'we' when he means 'I' and it is never quite a mistake."* |
| **Gargoyle** | Collective | *"**he SCREAMS before every dive because terror is half the payload.**"* |
| **Phantom** | UF | *"treats walls as doorways… **he apologizes to the things he comes through.**"* |
| **Crimson** | Collective | *"**he speaks of the dead the way sommeliers speak of vintages.**"* |
| **Dominator** | Collective | *"**he never asks, he simply decides, and your body agrees.**"* |
| **Riptide** | UF | *"**a lifeguard the ocean kept.**"* |

All forty are named, and all forty have this quality of hook. None has a described face.

## G. THE CANON IMPORT LAYER — 24 renames and 10 walk-ons

`docs/LORE-COF-INTEGRATION.md` §3–4 proposes re-identifying the gods as characters from an
external canon bible, **each with a real country, an age where known, and an explicitly directed
accent.** Many are marked `[PROPOSED]`. This is a *naming and casting decision layer* sitting on
top of Part F, not a separate cast, and it is where the project's most specific accent direction
lives. Examples: `oblivion` → **John Rivers "STAMPEDE"** (Los Angeles, ex-LAPD); `reactor` →
**LIU XIAO** (Beijing, formerly a blind masseur, ~60); `venatrix` → **SANDRA, "the L.A. Jackal"**;
`pulse` → **JAWAH MATU** (Dar es Salaam); `inferno` → **KING STEFANOS** (Greece, *"the first LSW
branded a war criminal"*); `nightmare` → **ZEPHANIAH MWANGAZA** (Tanzania, canonically dead,
*"two layers — her voice and the recording of her voice"*).

Two entries matter beyond flavour:

- **TODD "SHOGUN" BENCHLEY** — *"Black ex-Airborne Ranger Colonel, commands FIST… **The chain of
  command finally has a face.**"* This is the strongest existing answer to the missing Officer.
- **MOSES APIO** — a Ugandan mechanic proposed as a **playable named operator with an
  infiltrator-class hero skin** and a full VO pack, with a casting instruction that should govern
  this whole document: ***"Cast a Ugandan VO or direct the TTS on real Ugandan English — never
  generic 'African accent.'"***

The section's own casting law (`:317-320`): ***"Write the country, not a backdrop**: real cities,
real accents directed specifically (Ugandan English, not 'African'), the local tongue where it
counts."*

## H. THE PROSE CAST — nine survivors, narrative only

`docs/NARRATIVE.md:943`, a section literally titled **"THE CAST, IN ONE LINE EACH."** Nine named
humans defined by a power and its cost — no game presence, no portraits, but the best character
writing in the repository:

> **Elliot Kerr** — cannot be damaged; *"cannot feel anything — he reads his body in a mirror at
> night."*
> **Jaan Vesk** — absorbs sound; *"has not heard a human voice since he was eleven."*
> **Bartol Lek** — one spoken word becomes true, once a day; *"the word is taken from him
> forever — 41 gone, including* mother."
> **Kemi Adesanya** — grown to adult in nine months; *"six years of body per year of service"* —
> the best fixed-wing pilot on her front.
> **Odile Harran** — closes another's wounds with her hands; *"it comes out of her own blood, and
> the ledger never resets."*
> **June Alvarez** — a print; *"came back off degraded stock with a stranger's memories and a
> stranger's grief."*
> **Sandra** — nothing at all, and proud of it; *"the first jackal; she'd rather take you alive,
> and that's the worst news you'll get all year."*
> **The keeper** — *"cuts the names of dead prints into a wall; has cut her own twice."* ⚠️ female,
> **UNNAMED**, and the subject of a proposed season finale.
> Plus **Elías Moreira** and **Yusuf Tahan** (*"Forty-four. Two kids."*).

## I. NAME POOLS — not characters

For completeness, so nobody mistakes these for cast: `BOT_NAMES` (22, `src/main.ts:95`) supplies
generic bots and the paintball roster draws from it — which is why **Vex, Widow, Jinx, Saber,
Grit, Piston and Havoc appear both as named personas and as filler names**. `HULL_CALLSIGNS`
(`campaign.ts:200`) names *vehicles*, not people. Squad names are faction-flavoured
(`docs/SQUADS.md:122`): United Front squads are *"stones and tools (HAMMER, ANVIL, FLINT,
WEDGE)"*, Collective squads *"process words (VECTOR, LATTICE, CIPHER, RELAY)"* — *"factions don't
even name squads the same way."*

---

## NOT CHARACTERS (checked, so nobody has to check again)

- **The zombie/horde enemies** (`data.ts:844`) — `zombie`, `spitter`, `brute`, `sprinter`,
  `bomber`, `stalker`. Generic archetypes with stats and no names, no voices, no identity.
  Monster types, not cast.
- **THE STREET** (`src/client/streetvo.ts`, `docs/STREET-VO.md`) — deliberately archetypal, and
  worth knowing about because it is **already recorded: 216 clips across 12 directed regional
  accents.** Two speakers, neither an individual: **the pedestrian** (*"the world's bystander.
  Chatters when calm, panics at gunfire, points when a god walks, curses you when you drive like
  that"*) and **the vigilante** (*"the pedestrian who does NOT run… the police come, but first a
  neighbour with a bat"*), who escalates through CHALLENGE → WARN → ENGAGE → TRIUMPH. The casting
  law is the one worth carrying into portrait work: ***"A cadence and a place, never a
  caricature."*** Status: *"still a voice, not a body"* — there is no pedestrian model yet, so
  there is nothing to draw, and that is the gap rather than the naming.
- **The factions** — The United Front and The Collective have colours, names and a one-line
  aesthetic each ("veteran steel" / "synthetic glass") but no leaders or spokespeople in the
  class/VO layer.
- **The command layer files** — `src/sim/fireteam.ts` (five order acknowledgements: MOVING /
  HOLDING HERE / TARGET MARKED / ON THE BODY / ON YOU), `src/sim/ranks.ts` (the ten-rung ladder),
  `src/sim/k9-orders.ts` (pure order machinery — **no dog is characterised here**), and
  `src/client/dialogue.ts` (the conversation *engine*; its only content-bearing consumer is
  Vanessa). None contains a named character.
- **`docs/VO-DIRECTORS-NOTES.md`** — despite the title, no cast section. It is a
  transcription-verification log. The persona data lives in `tools/lsw-vo-script.mjs` and
  `docs/VO-CATALOG.md`.

---

## THE WORK LIST

### Everyone who still needs a NAME

**Among the eight playable classes: nobody.** All eight are fully named, and that is the headline
finding of this document. Robert's specific question — does the Infiltrator have a name — is
answered: **Odessa "Miss Dee" Broussard**, with a second candidate name (**Miss Odette
Baptiste**) that needs a ruling.

Outside the eight classes, **fifteen characters have real written identities and no name.**
Ranked by how much is already written for them, i.e. how cheap the naming is:

| # | Who | What already exists | Why it matters |
|---|---|---|---|
| 1 | **The Officer** | A full voice (approve/deny doctrine barks), *and* a biography in the Patterns list — 47, Zürich, ex-debt-collector, *"everyone pays eventually"* | The command chain has **no face at any rung**; the audit explicitly flags it. Highest-value name in the project. |
| 2 | **Bot Pattern — Infantry ("the mean one")** | 34, Philadelphia, ex-corrections officer; the declared *Meltdown* homage and Robert's stated favourite archetype | *"One cast slot is always the mean one"* — this is a deliberate design slot sitting empty |
| 3 | **Bot Pattern — Medic** | 51, Manila, ex-nurse, *"That's a scratch. I've SEEN scratches."* | Complete character, one field missing |
| 4 | **Bot Pattern — Engineer** | 45, Cleveland, ex-elevator-inspector | as above |
| 5 | **Bot Pattern — Heavy** | 29, Apia, ex-bouncer, *"counts to three exactly once"* | as above |
| 6 | **Bot Pattern — Pathfinder** | 22, Lagos, ex-rideshare driver | as above |
| 7 | **Bot Pattern — Marksman** | 60, Tromsø, ex-fisherman | as above — **and this class does not exist yet**; naming it implies shipping it |
| 8 | **The Announcer** | Voice cast (*Orus*), **160 lines already recorded**, a sharp persona | Fully shipped and anonymous |
| 9 | **The Driving Instructor** | Twelve written licence briefs in one distinct voice | A whole teaching character with no identity |
| 10 | **The keeper** (memorial wall) | Female; *"has cut her own name twice"*; a proposed season finale is built on her | The most emotionally loaded unnamed character in the docs |
| 11 | **Dr. Voss's first name** | Surname, appearance, six written lines | Partial — needs a forename only |
| 12 | **Vanessa's surname** | Forename, a shop, seven written lines | Partial |
| 13 | **The Stormcaller god** | Kyrgyz season-turner, accent directed, *"prays into the wind — both sides fear her"* | Marked `[PROPOSED — unnamed in canon]` |
| 14–15 | **The pedestrian / the vigilante** | **216 clips already recorded across 12 directed regional accents** | Archetypes by design — naming may be wrong here, but worth a deliberate decision rather than a default |

### Everyone whose APPEARANCE is undefined — the actual art commission

This is the real gap, and it is bigger than "no portraits exist yet."

**Not one of the eight has a specified face.** The game's soldier bodies are stylised low-poly
figures whose faces are, literally in the code, *"the line-and-circle face"*
(`models/bodyvariants.ts:126`): five small dark boxes — two brows, two eyes, one mouth. There
is no nose, no jaw, no individuality, and the same five boxes go on every head in the game.

**More seriously: skin tone is a single hard-coded constant.** `models/bodyvariants.ts:74` sets
`skin: 0xc9835f` — one mid-tan — for **every soldier of every class on both factions**, with
hair likewise pinned to one dark brown (`0x2e2118`). Set that against the cast the writing
actually specifies:

- **Black** — Odessa Broussard (New Orleans), Keisha Bell (Miami Gardens), Elias Baptiste
  (Haitian-American)
- **Nigerian-British** — Amina Okafor
- **Mexican-American** — Gabe Reyes
- **Lebanese-American** — Omar Haddad
- **Punjabi-Canadian** — Naveen Singh

**Every one of the eight personas names an ethnicity, and the visual layer expresses none of
them.** Six of the eight are actively misrepresented by that one constant. The voice packs did
this work carefully and in detail; the art has not caught up. That is the gap the portrait
commission exists to close, and it is the strongest argument for doing it.

Nothing about age is expressed visually either — which matters most for Odessa at 68 and
Naveen at 48.

So for **all eight characters**, the portrait art must originate:

| Needed for all eight | Status |
|---|---|
| Face, features, expression | **Undefined — commission** |
| Skin tone | **Undefined in-game** (one shared default constant); *specified in the persona text* |
| Hair | **Undefined — commission** |
| Build / physicality | Only implied (Heavy largest, Infiltrator most fragile) |
| Age read | *Specified in persona text*, never expressed visually |

What the portraits **can** and **should** inherit from the code, because it already exists:

| Character | Locked visual anchors from the code |
|---|---|
| Gabe Reyes | Combat helmet, dark goggles, human chin visible; two frag grenades on the belt; warm tan-khaki |
| Omar Haddad | Largest frame; chest bandolier with visible rounds; heaviest weapon profile; rust-orange |
| Keisha Bell | Twin jetpack tanks, hip thrust nozzles, stabiliser fins; pale steel blue |
| Naveen Singh | Wrench slung on the back; a satchel on each hip; olive-brass |
| Amina Okafor | **White** pack, not armour; glowing red cross; sage green |
| **Odessa Broussard** | **Deep near-black hood, no helmet, glowing eyes; longest-barrelled weapon in the game** |
| Mateo Alvarez | Two upright glowing teal beacon pylons on the back; teal-aqua |
| Elias Baptiste | Tall antenna mast with an emissive dish; tallest silhouette; slate blue-grey |

### Appearance status for everyone in PART TWO

| Character(s) | Appearance status |
|---|---|
| **Dr. Voss** | ✅ **The only NPC with described appearance** — lab coat with tails, spectacles, slate slacks, dark shoes, unarmed, male. Age/ethnicity/hair still open. |
| **Vanessa** | ⚠️ **Rendered as the generic male infantry soldier.** Dialogue implies an older, warm, Southern woman. Nothing specified. Highest-visibility mismatch in the game. |
| The 8 bot Patterns | ⚠️ Nothing. Age, city and former job only — which is *good* portrait material, but no visual line exists. |
| The 7 paintball regulars | ⚠️ Nothing. Play style and marker only. |
| The Announcer | n/a — a radio voice; arguably should never be seen. |
| The Officer | ⚠️ Nothing, at any rung of the command chain. |
| The K9 dog | ⚠️ **Contradictory** — design says Malinois, model is a German Shepherd. Team-coloured harness is canon. |
| The 40 Living Super Weapons | ⚠️ Forty personas, forty voices, **zero described faces.** The largest single art job in the project. |
| The 9 prose survivors | ⚠️ Nothing — narrative only, no game presence. |
| The street (pedestrian / vigilante) | ⚠️ No model exists at all; civilians are currently represented by cars. |

### Decisions needed before art starts

1. ⚠️ **Odessa's class colour is a muted violet** (`0x8a7fb9`), which is the one banned colour.
   Decide her replacement identity colour *before* portraits are painted, or the portrait and
   the HUD will disagree. Suggested non-purple readings: tarnished brass, deep bottle-green.
2. **Naveen Singh is Punjabi-Canadian and the code makes no turban/beard choice.** That is a
   real characterisation decision, not a detail — make it deliberately rather than letting an
   artist default it.
3. **Only two of eight classes have finished 3D models** (`soldier_infantry.glb`,
   `soldier_pathfinder.glb`). The other six are procedural geometry. If portraits are meant to
   guide eventual models, the six unmodelled classes are where portrait art has the most
   leverage — and Odessa is one of them.
4. **Odessa is 68.** Twenty-nine years older than the next-oldest woman in the cast (Amina, 39)
   and twenty years older than the oldest man (Naveen, 48). The persona explicitly forbids
   making her age a joke. An artist given only a class name will not draw an elderly woman —
   **the brief must lead with her age and the three prohibitions**, or this will come back
   wrong.

### The cast, by age — for the art pass

| Character | Age | Class |
|---|---|---|
| Odessa Broussard | **68** | Infiltrator |
| Naveen Singh | 48 | Combat Engineer |
| Omar Haddad | 43 | Heavy Weapons |
| Amina Okafor | 39 | Field Medic |
| Elias Baptiste | 35 | Ghost |
| Gabe Reyes | 34 | Infantry |
| Mateo Alvarez | 30 | Pathfinder |
| Keisha Bell | 28 | Jump Trooper |

Two women under forty, one woman at sixty-eight, and five men spread across thirty to forty-
eight. It is a deliberately wide age range and none of it is currently visible.

5. ⚠️ **Rule on Odessa Broussard vs Miss Odette Baptiste** before her portrait is drawn — and
   decide whether she keeps the surname *Baptiste* that the Ghost also carries. Recommendation and
   reasoning are in her entry above. Either way, **import Tremé, the church organ, and "nobody
   suspects grandma"** into her canon; they are the strongest portrait material in the project and
   they currently live in a document nothing reads.
6. ⚠️ **Rule on the K9 breed** — Malinois (design) or German Shepherd (shipped model). The doc
   itself flags the contradiction and has not resolved it.
7. **Decide whether the Officer gets a face.** There are two ready-made candidates — the Zürich
   ex-debt-collector Pattern and Todd "Shogun" Benchley (*"the chain of command finally has a
   face"*) — and a documented audit finding that the rung is invisible. This is the highest-value
   *new* character in the project, and a portrait is what would make him exist.

### The one casting law to carry into the art brief

It is already written in the repo twice, in two different places, and it should govern the
commission. From the canon-import doc: ***"Write the country, not a backdrop: real cities, real
accents directed specifically (Ugandan English, not 'African'), the local tongue where it
counts."*** From the street-VO doc: ***"A cadence and a place, never a caricature."*** And from
Odessa's own persona, the three prohibitions that make her work: **never a running joke about her
age, never a caricature, never neutral.**

Every one of the eight class personas names a real city and a real ethnicity. The portraits should
be specific to those places and those people — not eight soldiers in eight different colours.
