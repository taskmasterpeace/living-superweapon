# ESF / BID FOR POWER — MECHANICS SPECIFICATION
### Research pass for a DBZ-style flight brawler
Compiled 2026-07-26. Every claim is sourced. Where sources disagree or I could not confirm something, it says so in the text — look for **⚠ UNCONFIRMED** and **⚠ DISPUTED**.

---

## 0. HOW TO READ THIS — SOURCE QUALITY AND THE VERSION MAP

**The single most important thing to understand before using any number below: "ESF melee" is not one system. It is four, and they contradict each other.** A guide, a forum post or a video is only meaningful once you know which version it describes. Most of the confusion in secondary sources (including several search-engine summaries I collected and discarded) comes from mixing 1.1-era lock-on melee with 1.2-era advanced melee.

The ESF development team published its own version-by-version history of the melee system. This is the authoritative spine of this document:

> **Short history of the Simple Melee system**
> **ESF Beta 1.0:** First introduction of Simple Melee · Lock on required to swoop with only forward swoop possible · Head-ons won by lower ping players · Blow back length and speed enough to cover half of the map · Chance for unlimited areal combos
> **ESF Beta 1.1:** Head-ons won by player with more KI remaining
> **ESF Beta 1.2.X:** Lock on removed in favor of the double tap swooping system · Blow back speed and distance decreased drastically · 2 hit limit for areal combos implemented to cope with easier chaining of hits · Head-ons changed to both players hitting each other and being blown apart
>
> — Grega (ESF team), *Simple Melee Update*, 8 March 2010, http://web.archive.org/web/20100322210449/http://esforces.com:80/news/36/51/Simple-Melee-Update.html

### Version map

| Version | Date | Melee model |
|---|---|---|
| Alpha versions | from ~2000 | Early experiments. Real-time free melee was tried and abandoned (see §1.1) |
| **Alpha 2.0** | **17 Nov 2001** | — |
| **Beta 1.0** | **27–28 Nov 2002** | **Lock-on melee.** Forward swoop only. Unlimited aerial combos. Map-crossing knockback |
| **Beta 1.1** | **17 May 2003** | Lock-on melee refined. Head-on resolved by remaining ki. Added **advanced *powerstruggling*** — see the conflation warning below |
| **Beta 1.2** | **Apr 2004** | **The rewrite. Lock-on REMOVED, double-tap swoop, ADVANCED MELEE (the arrow minigame) introduced** |
| **Beta 1.2.1** | **31 Jul 2004** | Balance patch (exact numbers in §1.10) |
| **Beta 1.2.2 / 1.2.3** | **15 Dec 2004** | Crash fix. "No more patches will be released for the 1.2 series after this." **1.2.3 is what people mean by "ESF" today** |
| **Open Beta ( = Beta 1.3)** | **11 Sep 2007**, then **CANCELLED** | **Simple melee only** — advanced melee had already been thrown out, and the replacement was not designed yet |
| **ESF: Final (ESF:F)** | **unreleased, TBA** | A *separate, third* melee system, designed after the Open Beta was abandoned. §1.11 |

### ⚠ THREE NAMING TRAPS
1. **ESF: Final is NOT Beta 1.3 / the Open Beta.** The official download page states: *"The Open Beta (**Beta 1.3**) is the most recent public release of ESF. This build is a snapshot of the inteam build **at the time it was cancelled**"* (https://esforces.com/download). ESF: Final is a separate project, still unreleased, release date listed as **TBA**.
2. **The Open Beta shipped with NO advanced melee and NO replacement.** Grega (team), 8 Dec 2012: *"Basically **we knew the old advanced melee system was no good, so it got thrown out** leaving simple melee in the Open Beta. The final design for the new melee system was only finalized after the open betas stopped. So the Open Beta is stuck with simple melee only."* (https://forum.esforces.com/threads/esf-open-beta-melee.154546/)
3. **"Advanced melee" (1.2) and "advanced powerstruggling" (1.1) are different features a year apart**, and they are constantly conflated in secondary sources. Advanced melee was explicitly *not* in 1.1 — a poster in May 2003: *"They never said there would be advance melee in 1.1. In fact, they've protested numerous times that advanced melee will NOT be in 1.1"* (https://forum.esforces.com/threads/whats-the-diffrence.130299/). It was pre-announced for 1.2 and appears in the official **Beta 1_2 Outline** as `Advanced Melee [in development]`.

**ESF: Final has never had a full release, and has left Half-Life entirely.** As of March 2024 the team had moved the mod onto the Sven Co-op engine, because Valve's November 2023 25th-anniversary HL update broke it — HL1 lacks the `LargeAddressAware` flag so it is capped at 2GB, and "our base Trunks model alone is as big as *all* of the Half-Life models combined" (https://esforces.com/, *ESF:F 2024 Update*). Treat every ESF:F mechanic below as **designed and demonstrated on video by the developers, but not shipped and not community-tested at scale.** ⚠ I could find **no published spec for the ESF:F melee system** beyond the 2010 articles in §1.11; if a fuller one exists it is likely Discord-only.

### ⚠ Two ESF myths worth killing before they reach a design doc
- **ESF had NO destructible terrain.** A team member, Oct 2002: *"**There is nothing destructable in any of our maps this time around.** Maybe in a future release. BTW, the textures aren't different, **the ki balls are lighting them up.**"* (https://forum.esforces.com/threads/destructible-terrain.144006/). What people remember as "destruction" is *light and sprite spectacle at scale*.
- **Base ESF 1.2.3 shipped 9 characters with ONE transformation each.** The multi-stage transformation ladder people remember is largely **fan-made** — community packs such as ECX RC3 carry ~36 characters (https://videogamemods.com/earthsspecialforces/mods/ecx-rc3-super-pack/).

### ⚠ A trap in the sources
The GameFAQs guide is filed under **"Earth's Special Forces: Final"** but its own header reads *"Written for ESF Version 1.1 Beta … FAQ Version 10.03"*. **It documents 1.1 lock-on melee and contains no advanced melee at all.** It is an excellent 1.1 source and a badly mislabelled one. (https://gamefaqs.gamespot.com/pc/919086-earths-special-forces-final/faqs/26239)

### Primary sources used, ranked
1. **The official ESF beta 1.2 manual** — the best single artefact. Recovered from the Internet Archive; the live copy 404s. http://web.archive.org/web/20040803230525/http://www.esforces.com:80/team/Manual/right.htm
2. **A `cvarlist` console dump from a live ESF 1.2 server** — real runtime values. https://forum.esforces.com/threads/console-commands.111788/ (post by !XxShAdOwxX!, 30 May 2004)
3. **The manual's own CVAR List section** — documented *defaults*, which lets me separate defaults from one server's settings
4. **ESF team news articles 2009–2010** — the ESF:F design rationale, straight from the developers
5. **The GameFAQs 1.1 FAQ by T.U.I.** — per-character statistics, HUD, 1.1 controls
6. **forum.esforces.com threads 2002–2020** — player technique, balance argument, dated per thread

**Access note:** `gamefaqs.gamespot.com` and `forum.esforces.com` both return HTTP 403 to plain fetchers. They serve normally to a browser user-agent (`curl -A "Mozilla/5.0 …"`) or a real browser.

---

# 1. THE MELEE SYSTEM

## 1.1 The design law underneath all of it — read this first

This is the most valuable single finding in the research, and it is a direct statement of intent from an ESF team member explaining why melee works the way it does. Someone proposed free-aim, punch-where-you-like melee. Grega's reply:

> "There are 4 factors that you have to take into consideration with ESF.
> **1.) Free movement.** Flight to be exact moving in a 3D space makes real time melee extremely hard to hit a thing cause the target can move in more directions than 2.
> **2.) Half Life.** … even with standard gameplay you can hardly hit a thing unless its standing still with the crowbar.
> **3.) Model size.** … the targets in ESF are 4 times smaller than in half life making it 4 times harder to hit.
> **4.) The speed in ESF.** … Lets say you move with the speed of 20 units per second in half life. In ESF that makes it 80 units per second. What is a slow speed in half life is really fast in ESF … Smaller models = more speed"
>
> "Now you take principle number 4 and apply ping to it … **ESFs 100 ping would be something similar to Half Lifes 400 ping** simply because the speed is that much higher."
>
> "But thats where the team made simple melee. All you need to do is be close and have to be holding a single mouse button. **How you get close is your choice, be it swoop, teleport or normally flying. Call it a proximity triggered crowbar.**"
>
> — https://forum.esforces.com/threads/why-this-melee-wont-work.71866/ (Sept 2008)

And the reply from another team member:

> "the movement mechanics … out-do the melee ones. Probably better to work with it instead of against it, **by making the movement more of a factor**."

**The law: in a fast 3-D flight brawler, the strike cannot be the skill test — the APPROACH is. ESF deliberately made the punch itself automatic (proximity + one held button) and moved 100% of the difficulty into how you close the gap.** Every good thing about ESF melee follows from this, and the one system that violated it (the advanced-melee arrow minigame) is the one the developers eventually deleted.

Two hard numbers fall out of the same thread:
- **Simple melee reach ≈ the height of the character.** "the simple melee reach length is about the height of the character to actually make a hit possible."
- **Playability ceiling ≈ 120 ping.** "simple melee can be used good up to 120 ping."

## 1.2 Simple / Basic Melee

**1.2.x (the definitive version).** From the official manual:

> "While you are swooping at an opponent hold down secondary mouse button (right click) to attack them with basic melee. You may also attack an opponent while stationary by tapping secondary mouse button (right click) within the basic melee range."

- **Bound to RMB in 1.2.x.** (ESF:F moved it to LMB — see §1.11.)
- Two delivery modes: **held during a swoop** (the normal case), or **tapped while stationary** inside reach.
- 1.1-era detail, no longer current but informative: when *not* locked on, "it is the RELEASE of the button that can trigger the attack." (SaiyanPrideXIX, May 2003, https://forum.esforces.com/threads/saiyanpridexixs-basic-melee-tutorial.131874/)

**Damage.** The only exact figures anywhere in my sources, from the 1.2.1 patch discussion:

> "The damage was reduced from **10 to 7**, along with ki blasts. … You have 2 million PL and I have 1 million. Two simple melee hits would do **40** damage to me, three ki blasts would do **60** damage. That's 100 damage. … At even PLs two hits and three ki blasts still does **35** damage (used to do **50**), assuming you don't knock them into a wall."
>
> — https://forum.esforces.com/threads/esf-1-21-tweaks-and-reasons.108949/ (Jul 2004)

Read carefully, this is a damage model, not just a number:
- Base simple-melee damage **10 → 7** in 1.2.1.
- **Damage scales with the power-level RATIO between attacker and defender.** At 2:1 PL, two hits did 40 (≈20 each, i.e. 2× the base 10). At 1:1 PL, two hits + three ki blasts = 35 post-patch.
- Against a ~100–150 HP bar (§App. B), the bread-and-butter exchange is worth roughly a quarter to a third of a health bar. **Melee is not a one-shot; it is a grind you have to land repeatedly.**
- Wall impact is additional and is called out explicitly as separate.

## 1.3 Swoop — how you close distance

The heart of the game. From the official 1.2 manual:

> "All highspeed movement now requires a **"Double Tap"** in order to swoop. Simply tap any direction (up, down, left, right, forward, backward) twice and hold down the directional key on the second instance. You may **"chain swoop"** by double tapping in a different direction while still holding your last direction to make a fluid, yet sudden change in direction.
> **There is no longer a need to target opponents, swooping is free form 360 degree movement.**"

Mechanics, assembled:
- **Input:** double-tap a direction, hold on the second tap. Any of six directions, including **backward** — back-swoop is as fast as forward-swoop, which is what makes hit-and-run viable (and was a complaint: "reducing the back swoop speed… this way if a player runs, he'll have to show his back/side towards you" — https://forum.esforces.com/threads/basicmelee-special-maneuver.69320/).
- **Release the key and the swoop ends.** "swoop is made so that you stop if you let go." (https://forum.esforces.com/threads/1-3s-swoop.66434/)
- **A swoop is time-limited.** "In 1.2 you can swoop only so long before the swoop stops automatically." (same thread)
- **Speed decays through the swoop.** "You gotta watch out with just a straightforward swoop though. At some point your speed will be more sluggish at the end and makes it easier for someone to hit you." (https://forum.esforces.com/threads/angleing.101651/) → **the tail of a swoop is a punish window.**
- **Chain-swoop costs extra ki** over simply turning with the mouse: "every time you chain swoop you use a chunk more ki unlike turning" (same thread). Both are available; the mouse turn is free and gradual, the chain-swoop is a sharp instant redirect that you pay for.
- **Swoop is audible and counter-playable by ear.** "he can swoop at you, which you'd hear and can teleport up and swoop down for a hit … HL has locational sound." (https://forum.esforces.com/threads/an-invisible-fight.89369/)
- **Whiff:** there is no dedicated whiff punish state. You simply overshoot, your speed is decaying, and you are committed in a straight line — which is what the defender exploits.

### Angling / "anglehits" — the emergent expert technique
The highest-value technique in 1.2.x and a pure product of the "approach is the skill" law:

> "never fly directly at the enemy, fly in a **curved swoop**. Do a sharp turn away from your enemy as you fly to each other, and then sharp turn inwards again. If your both amazingly good at angle, the chances are angle wont help you lol, all the hits will be head-ons"
>
> "I use chainswoop to side-hit them it seems alot more effective **especially against blockers**"
>
> — https://forum.esforces.com/threads/angleing.101651/ (Apr 2005)

The thread opener describes what it beats: "when you hit someone from the side in Basic Melee you hit them **even if they are already dashing**."

Two consequences worth copying:
1. **A straight approach is the worst approach.** It gets you a head-on (mutual knockback, no advantage) or a beam in the face. Curving in from the side beats both blocks and moving targets.
2. **Approach angle is a real, deep skill dimension that costs nothing to implement** — it emerges free from "hits register on proximity" + "guard is directional" + "swoop is committed."

Also documented in the same thread: **"dropping"/"gliding"** — cutting flight to free-fall, used to change altitude cheaply — and **"teleswoop"**, teleport blended with swoop, described as a technique you should have mastered by a certain skill level. And the counter to droppers is hard: "Thats what Im working on, hitting those damn droppers. I always undershoot."

## 1.4 ★ TELEPORT IN MELEE — the intercept question, answered precisely

**This was flagged as the single most important question in the brief. The answer is yes, with an important structural restriction and a version story.**

### Yes: teleport-chasing a launched opponent to continue a combo is THE core high-skill technique of ESF melee

From a dedicated combo tutorial (July 2003, so 1.1-era — the golden age of this technique):

> "A combo is an advanced usage of melee. **Combos include the usage of melee and teleporting used together to increase the damage inflicted on your opponent.** … A basic combo would be, Melee your opponent to the ground or in the air, **then swoop and tele (if needed) towards them and complete another hit on the opponent before they have enough time to recover from the previous blow.** More experienced ESF players will use more technical and more advanced combos such as 3 hitters, 4 hitters, and even 8 hitters."
>
> — EvilChimp, https://forum.esforces.com/threads/melee-combos-tutorial.126079/

Concrete documented combos, verbatim in substance:

| # | Combo |
|---|---|
| 1 | Melee them to the floor; **as they are rolling**, swoop in and melee them back into the air before they recover |
| 2 | Melee them up; tele + swoop; **as they hit the ceiling and start falling**, hit them right back up |
| 3 | Melee them into a wall; swoop under them and melee up. Done by hitting them into a wall, swooping, then **turning off fly mid-swoop, free-falling under them**, then swooping up |
| 4 | Hit them near a cliff; **as they roll off** the roll slows them, giving you the window to swoop and melee down |
| 5 | **Win a head-on → they are flung back → "tele straight at them 3 times very fast while holding your melee attack button"** → you connect again for double damage |
| 6 | **"The cork screw"** — hit them up, then immediately **hold jump while tapping teleport 3–4 times** to shoot above them, then aim straight down and swoop down to hit them back down. Works reversed (hit down, hold descend, tele down, swoop up) |
| 7 | 3-hitter: head-on → tele ×3 → hit → tele ×3 → hit |
| 8 | 4-hitter: melee to ground → swoop, hit up → **tele above them, hit down → tele below them, hit up** |
| 9 | 5-hitter: hit to ground → swoop-hit while rolling (sends them straight up) → swoop up, hit into ceiling → as they fall, hit horizontally → teleport rapidly and finish |

On #9: *"If you have a significantly higher power, (say 1-2mil) over them, and you have turbo on while swooping, this very-well can kill them with them having no chance to react."* — the combo ceiling is a genuine one-sided kill when you also have the PL and turbo advantage.

### ⚠ DISPUTED, and the disagreement is itself the mechanic
Players argued in that same thread about whether you can catch someone off a *swoop* hit:

- **Against:** "This is **not possible**. You can not do a combo like this off of **any kind of swoop-hit**. What IS possible … is to **normally** melee someone, which will send them flying at a slow enough rate for you to perform a 3-tele hit."
- **Against:** "From my experience, **any type of swoophit sends the opponent flying too fast to teleport into**."
- **For:** "that is very much possible. … You hit someone in the forward direction (**easier when you're not swooping and hitting while standing or dropping**), and when they are going away from you, teleport forward multiple times with right click pressed. If one of your teleport stops just infront of behind of the other person flying away from you, the right click connects with the player and hits them. This is even harder to do in 1.1, since **the hit detection system has changed** as compared to 1.0, but this is very much possible."
- **On netcode:** "You can see this is a lot better if you start up a **lan game. Theres no ping** so you can see that you can definantly tele in front of a person you hit."

**Resolution — and this is the implementable rule: whether you can catch them is decided by the launch velocity you gave them, and launch velocity depends on how you hit them.** A stationary or dropping hit imparts a *slow* launch you can chase. A full-speed swoop hit imparts a *fast* launch that outruns your teleport. Ping degrades it further. So the game contains a real, non-obvious tactical trade-off: **hit them hard and lose them, or hit them softly and keep them.** Nobody designed that as a stated feature; it fell out of the physics. It is worth deliberately designing in.

### ⚠ The structural restriction: you cannot teleport DURING a swoop (1.2.x)
This surprised me and it matters a lot for implementation:

> "now with 1.2 melee **you must swoop cause u cant teleport like in 1.1**"
> "you **CAN end your swoop and teleport manually**…like everyone else does"
>
> — https://forum.esforces.com/threads/teleport-while-swooping.111250/ (Jun 2004)

Teleport and swoop are **mutually exclusive states**. The chain is therefore: *hit → swoop ends → teleport 1–3× toward the flying body while holding melee → connect.* Teleport-while-swooping was repeatedly requested and rejected as overpowered — "Your moving fast, and you can move to a spot instantly. Oh yeah, nothing wrong there." The in-swoop redirect tool is **chain-swoop**, not teleport, and chain-swoop costs ki.

### Teleport mechanics
- **Input:** hold the direction you want, press teleport. "Basically you hold the direction you want to teleport to and press your teleport button." (https://forum.esforces.com/threads/teleporting.108386/)
- **Fixed distance for everyone.** "all tele distances are the same. your teleport distance is the same as everyone elses." (same thread) → skill is direction and timing, never range.
- **Chainable in a held direction.** "hold a direction down and tele. then let go of the directional key. teleport as many times as you want you will teleport in that direction until you specify otherwise."
- **Practical burst ≈ 3 rapid teleports.** Every documented combo uses "tele 3 times"; one source states you can only teleport about 3 times back-to-back at maximum rate before resources stop you. **⚠ The explicit "3" cap is UNCONFIRMED as a coded limit** — it may simply be where ki runs out — but three is consistently what players describe using.
- **Costs ki** (manual and 1.1 FAQ both). **⚠ No source gives the numeric ki cost.**
- **★ There is a teleport delay in 1.2.x, it was a unanimous team decision, and it is permanent.** This is one of the best-documented design rulings in ESF's history and the reasoning transfers directly:
  > **DJ-Ready** (team): *"teleport is ment to be like a **'rescue move'** to avoid beeing hit by someone and **not to move across the whole map within 1 second**. we put in the delay for a good reason."*
  > **grOOvy** (head tester): *"the decision to add the teleport delay was a **unanimous** one taken by all the development team members… added … to stop seeing **abuse of teleport binds and mouse-wheel instant teleports**… the teleport delay **will not be removed** and is a permanent feature."*
  > — https://forum.esforces.com/threads/teleport-delay-or-no-teleport-delay.108704/

  **And the objection is the interesting half**, because it names a real tension: *"**Teleport is not just an escape move, it's a way of offence.**"* (Carnage the 1). Even a moderator conceded *"It's rather annoying. Sometimes it completely ****s up an attack you try to pull off."* (Cold Steel). **The team designed teleport as defence; players had discovered it as the core of the offensive combo game (§1.4), and the delay taxed exactly that.** If you build a blink that can extend combos, decide deliberately which of the two things it is — ESF's team and its best players never agreed.
  **⚠ Duration still UNCONFIRMED.** The clearest symptom of the abuse it was added to stop: teleport bound to the **mouse wheel** for instant repeat.
- **Purpose, per the manual:** "When there isn't enough time to block an attack, teleporting will help you make a quick escape. Teleporting is also used to **quickly position yourself while in melee combat** and to **fool your opponent with the after image effect**."
- **Teleport after-images** are listed as a 1.2 graphics feature. The dodge is *legible* — the afterimage is the tell that sells "he was never there."
- **1.2.1 changed overshoot:** "now that you dont teleport past your opponent" — before 1.2.1 a teleport could carry you *past* your target, which is exactly why intercepting was so hard in 1.1.
- **Teleport is also the standard follow-up after your own hit:** "more experienced users who know how to **teleport after they deliver a hit** shouldn't have a problem" (1.2.1 thread) — i.e. teleport out of your own recovery to avoid the counter.

## 1.5 Knockback, the wall slam, and recovery

The best description is the 1.1 tutorial, and the model survived into 1.2.x with reduced magnitudes:

> "When you are struck with a melee attack and you are not defending yourself, you will be sent **helplessly flying across the map**. **Any landscape or object you hit will add damage** to the wounds you've already suffered from being hit, and eventually you will **tumble to an unconscious halt on the floor**, where you will remain for anywhere from a few to several **EXTREMELY VULNERABLE** seconds. …
> a **struggle bar appears at the far right of your screen** while you are helplessly tumbling. By **holding primary fire**, your character will **use some ki to right himself in midair, or do a cartwheel/handspring back to his feet** if he is tumbling along the ground, thus avoiding the obnoxious "frozen" state, and also avoiding being slammed against buildings or mountains for additional damage."
>
> — https://forum.esforces.com/threads/saiyanpridexixs-basic-melee-tutorial.131874/

The 1.1 FAQ says the same and adds the failure case:

> "if he hits a wall, he will take more damage and fall to the ground. However, if you have some Ki, you can click the left mouse button to stop your character. The same thing applies when you hit the ground. You can press the left mouse button to get up when you hit the ground; again, at the cost of Ki … **If you don't have Ki, your character will lie on the ground for a while before getting up.**"

**This is the most important loop in the game and it is worth stating as a rule:**

> **Being hit is not a punishment, it is a question: spend ki to recover, or eat the wall and the downtime.** And because the attacker is *also* spending ki to chase, the melee exchange is a ki-attrition duel disguised as a fistfight. Run dry and you are a ragdoll.

Numbers:
- **`mp_laydowntime : 1.500`** — the floor-lying duration, 1.5 s default (manual CVAR list).
- **Blowback magnitude by version:** 1.0 "enough to cover half of the map" → 1.2.x "decreased **drastically**" → 1.2.1 "knocks people back a little faster and a little farther so there's **less room for error in linking hits**."
- **Wall/ground impact damage is real and additive**, and explicitly excluded from the damage math quoted in §1.2 ("assuming you don't knock them into a wall").

### Stuck in a wall — the throw-only state
Wall-sticking is **not** a knockback state. It is exclusive to **throws** (§1.7):
> "Thrown enemies will "stick" to walls, or can be thrown into other players. **Pressing the jump button while stuck on a wall will allow you to jump off.**"

Governed by `am_wallstick_canstick : 1` · `am_wallstick_mintime : 1` · `am_wallstick_maxtime : 2` — a **1–2 second** pinned window, escapable early with jump. (Read of these three cvars is mine; the manual lists values without descriptions.)

### The aerial-combo governor — the most transferable balance lever in ESF
This is where all four versions differ, and the developers eventually found the good answer.

- **1.0:** "Chance for **unlimited** areal combos." Also: "When there were no restrictions on how many hits you could link together people came up with simple melee combos, but it was thought to be **too powerful by the majority of the community** (who found it quite complicated)." (https://forum.esforces.com/threads/basic-melee-combos.98431/)
- **1.2.x:** "**2 hit limit** for areal combos implemented to cope with easier chaining of hits." Community verdict: "now you can do 2 hits max and thats it, then you can spam kiblasts." The likely implementing cvar is **`mp_nomeleehittime : 1`** — a post-hit window during which melee cannot connect again. **⚠ The mapping of that cvar to the 2-hit limit is my inference.** One community reading is that raising it high "may invalidate melee for that many seconds after the last hit."
- **ESF:F — the fix worth stealing:**
> "The two hit limit has been **reverted back to the infinite hits** for simple melee. To balance the system out **each new hit you do will cause a bigger knock back to the opponent so it gets harder with each hit.** Getting the second hit is relatively easy, but with the third one it'll become harder as knock back speed and distance increases with each hit."
> — *Simple Melee Update*

**A hard cap is a wall you hit; escalating knockback is a curve you climb.** The second is strictly better design and costs the same to implement. Paired with the ESF:F bonus-point curve (§1.11) — 1, 2, 4, 8 points for successive hits in a chain, reset the moment the target recovers — you get a genuine risk/reward ramp: each extra hit is worth exponentially more and is meaningfully harder to land.

## 1.6 ADVANCED MELEE — the full specification

Introduced in 1.2, **removed in ESF:F**. It is ESF's most famous and most divisive system. Specification from the official manual, which is complete enough to implement from directly.

### Trigger
> "Advanced melee is **automatic**, you must come in contact with an opponent while swooping in order to begin the auto prepunch sequence."

**Advanced melee is the DEFAULT outcome of a swoop collision — you get it by holding nothing.** Holding RMB gives you basic melee instead. That is the whole input distinction:

| Input during swoop contact | Result |
|---|---|
| Nothing held | **Advanced melee** (prepunch) |
| RMB held | **Basic melee** (single hit + knockback) |
| LMB held during prepunch | **Combo** sequence |
| RMB held during prepunch | **Throw** |

### The prepunch
> "Prepunch has a max of **Twelve (12)** hits. Successful hits up to and including **Six (6)** increase your maximum stun time, any hits thereafter **decrease** maximum stuntime. Stuntime is the time you have to create your own unique combos."

- Max 12 hits (`am_prepunch_max : 12`); stun peaks at 6 (`am_prepunch_maxstun : 6`).
- **`am_prepunch_stunperpunch : 0.750`** → 6 × 0.75 = **4.5 s peak stun/combo time**. (Derivation mine, but it reconciles the two numbers exactly.)
- **This is a deliberate greed trap.** Punching past 6 *reduces* your own combo window. You must choose to stop.
- `am_prepunch_delay : 0.200` (per-punch cadence) · `am_prepunch_delaystruggle : 0.100` · `am_prepunch_driftspeed : 280` (the locked pair drifts at 280 u/s while this plays out) · `am_prepunch_mincombo : 3`.
- **Defender's options are thin:** the manual says "If your opponent blocks your prepunches, you may only use combos or cease adv. melee" — blocking removes the *throw*. Players report you cannot break out of the prepunch itself: "You can not break free from the 12 pre-punch hits." (https://forum.esforces.com/threads/please-help-lots-of-questions.98620/) **This is the core grievance — see §8.**

### The combo sequence (attacker)
> "You may now press any direction (**diagonals included**). There are Three(3) levels of attack, **Weak(Green), Medium(Blue), and Strong(Red)**. Holding the secondary mouse button (right click) while pressing a direction will use **kicks** instead of punches."

The elegant part is the randomness ladder — **stronger attacks are less legible to the defender**:

| Level | Colour | Damage | Time cost | Chance defender sees a **multi-directional (unknowable) arrow** |
|---|---|---|---|---|
| Weak | Green | Low | Low | **15%** |
| Medium | Blue | Mid | Mid | **25%** |
| Strong | Red | High | High | **35%** |

> "Weaker attacks use up less time, but inflict less damage. However, weak attacks can be put out **more quickly, causing more arrows for your opponent to try and fumble through.**"

So the attacker chooses between **few unblockable-ish heavy hits** and **many cheap hits that flood the defender's input buffer.** Genuinely good design. Releasing LMB at any time ends your combo early. Animation support: 3 punch levels × 3 kick levels × **4 directional animations each**, per character, all unique per character (https://forum.esforces.com/threads/the-advanced-melee-animations.114847/).

### Block Stun — the guard-breaker
> "When a Strong or Medium hit lands, your opponent receives a "Block Stun". If a **Strong** attack lands, your next **medium** attack **or your next two(2) weak** attacks will hit, **regardless of whether your opponent blocked it**. If a **Medium** attack lands, your next **weak** attack will hit, regardless of whether your opponent blocked it."

A landed heavy hit buys guaranteed follow-ups. This is the reward for taking the slow, expensive, high-variance option.

### The defence (arrow-matching)
> "After the prepunch sequence finishes you will see **white arrows appear at the top of the screen**, these are your opponents attacks! You must match the same directions, a successful dodge will turn the arrow **green**, while an unsuccessful attempt will turn it **red**. Multi-directional(random) arrows will start to appear **if you take too long to defend** or your opponent's attack may be random, depending on the strength they've chosen."
> "(To dodge a diagonal you can press **any direction adjacent** to it. For example, to block an upper-left diagonal you can press up or left)"

Timing cvars: `am_struggle_arrowtime : 0.500` (0.5 s per arrow) · `am_struggle_maxarrows : 6` · `am_struggle_startdelay : 0.750` in the 1.2 manual but **1.250 in the 1.2.3 server dump** (a real version change, or a non-default server value — see §App. A) · `am_struggle_enddelay : 1.500`.

### Retaliation — the exchange decay rule
> "Doing nothing will end the melee sequence after the enemies turn, however, **holding the primary mouse button (left click) or secondary mouse button (right click) will give you a chance to retaliate with your own combos.** Stun time(your combo time) for retaliation is calculated with this formula:
> **Stun time * ( blocked moves / total moves )**
> For example, if you block 1/2 of your opponent's moves, you'll get 1/2 the original time. Then if he blocks 1/2 of your moves, he'll get 1/4th the original time, and so on."

**A geometrically decaying back-and-forth that terminates by construction** — you cannot get an infinite exchange, because each handover multiplies the window down. Bounded by `am_maxextanges : 4` (max exchanges; the cvar name is misspelled in the source — almost certainly `maxexchanges`) and `am_struggle_maxextanges : 2`. `am_percentblocked : 0.750` presumably feeds this formula. **⚠ My reading.**

### Exit
> "(At the end of every advanced melee battle, both players involved (**as well as any close by**) will be blown back/away from each other **to ensure fairness**)"

Plus, from a player: "At the end of an Advanced Melee fight if you use a red it will knock you back left right, forward or backward" — the finisher's direction is chosen.

### Range bands
`am_minrange : 0.300` · `am_weakrange : 0.500` · `am_mediumrange : 0.900` · `am_strongrange : 1.350`. **⚠ INTERPRETATION UNCONFIRMED.** These look like multipliers on a base melee range, one per attack strength — i.e. a strong attack reaches 1.35× and a weak one 0.5×. That would mean **heavier attacks reach further**, the opposite of a fighting-game convention. No source explains them. Do not copy these numbers without deciding your own intent.

## 1.7 Throwing

> "Holding the secondary mouse button (right click) during the prepunch sequence will allow you to throw your enemy. Throwers beware, **throwing uses up ki** and your opponent may **resist by holding the primary mouse button** (left click).
> Once the charge bar passes the yellow line, you may release the secondary mouse button at any time to throw your opponent, **the longer you charge up, the farther he/she will fly.** Thrown enemies will "stick" to walls, or can be **thrown into other players**. Pressing the jump button while stuck on a wall will allow you to jump off.
> (**Using up all your ki at anytime will cancel the whole throwing process**)"

The resist is a **ki-burn contest, not a mash**:
> "a struggle bar appears. **Holding primary attack while being thrown makes your opponent drain more ki as he tries to throw you, so there is a possibility it'll stop the throw.** I get my throws messed up like this since I suck at ki conservation."
> — https://forum.esforces.com/threads/please-help-lots-of-questions.98620/

The defender cannot win outright — they can only make it **expensive**, and if the thrower is careless with ki the throw fails. That is a much better defensive verb than a coin-flip. Blocking the prepunch also denies the throw entirely (§1.6).

**ESF:F deleted the resist:** "This attack is based on the beta throw, but with a twist. **The ability for opponents to resist being thrown has been removed.**"

## 1.8 Head-on collisions (two players swoop into each other)

Resolution changed every single version — the team clearly struggled here:

| Version | Head-on resolution |
|---|---|
| 1.0 | **Won by the lower-ping player** (a netcode artefact, not a design) |
| 1.1 | **Won by the player with more ki remaining** |
| 1.2.x | **Both players hit each other and are blown apart** |
| ESF:F | Same as 1.2 with improved visuals |

In 1.2.x the outcome depends on what each player held, and the manual is explicit:

- **Adv vs Adv:** "A stream of arrows will appear at the top of your screen, some may be random. **The person with the most correct, wins and is rewarded with a special combo. Ties will reset** the stream of arrows and you will begin again until someone wins."
- **Adv vs Basic:** "**Basic melee hits first**, then the person using Adv. Melee is allowed to prepunch up to Twelve(12) hits, he or she **cannot throw or start combos.**" → basic melee has genuine priority; advanced melee gets consolation damage only.
- **Basic vs Basic:** "Both players hit each other and are knocked back."

`am_swoop_minstrugtime : 0.350` appears in the 1.2.3 dump and not in the 1.2 manual list — plausibly a minimum swoop-struggle duration added later. **⚠ UNCONFIRMED.**

Player note on the arrows: "The directions are **totally random**. … the stronger the attack, the slower it will be… the weaker the attack the faster it will be."

## 1.9 Block and how it interacts with melee

> "The block feature in ESF allows you to shield yourself from attacks with your arms. This causes the attack to inflict **less damage**. You can also **"swat" away weak attacks** with block. **When blocking melee there will be a .8 second delay before you may attack them.**"

- **0.8 s post-block attack lockout** — the one exact frame-data number in the whole manual. Blocking is not free; it buys safety and costs initiative.
- Blocking **swats** weak projectiles outright and forces a **block struggle** on strong ones (§4).
- **Lasers ignore block:** "Blocking will not impair the damage on this attack." **Discs cannot be blocked at all:** "Discs can go through anything and can't be blocked."
- Block **denies the throw** in advanced melee, restricting the attacker to combos or disengagement.
- Blocking a directional attack is beaten by **Block Stun** after a landed Medium/Strong (§1.6).
- **Angling beats blocking** — side hits land on blockers (§1.3).

### The block counter
A real, named 1.2 mechanic:
> "The advanced melee block "counter" was in 1.2. Just learn to use it and learn to avoid it. It isn't as instant as the 1.0 counter."

And the ki economics of the standoff it creates, which is a lovely piece of emergent play:
> "Person standing still blocking is using **less ki** then the person who charges blocks then teleports away. The blocking person having the more ki can just keep charging until they force the person to charge and get a hit."
> — https://forum.esforces.com/threads/esf-1-21-tweaks-and-reasons.108949/

Blocking was **strengthened** in 1.2.1, and a veteran immediately predicted "we are going to see more block counters."

## 1.10 What ESF 1.2.1 changed (July 2004) — a real patch record

From https://forum.esforces.com/threads/esf-1-21-tweaks-and-reasons.108949/, cross-corroborated across several posters in the thread:

- **Basic melee damage 10 → 7**; ki blast damage reduced likewise
- **Advanced melee made faster**, and "there's no longer an exploit"
- **Simple melee knockback made faster and farther** → "less room for error in linking hits"
- **Beam jumping made more expensive in ki** (players wanted its *speed/radius* cut instead; the team said that would come in 1.3)
- **Blocking improved**
- **Hit detection changed** — "harder to hit people"
- **Swoop responsiveness improved**
- **Teleport no longer carries you past your opponent**
- **Power-level gain "fixed"** (the `mp_plcatchup` catch-up system)
- Spectator changes; also known for **random crashes**

Stated intent behind the melee nerf: "They made basic weaker because **everyone and their mother hits you twice with it.** That was obviously not an intention of the design of the game." — i.e. **"two basic hits and a ki blast" had become the whole game**, and the patch was aimed at that. The counter-argument in the same thread is that it was intentional: "I believe Boyster himself said that the 2 hit and a ki blast was purposely designed that way."

## 1.11 ★ ESF: FINAL — what the developers changed, and why

This is the most useful section in the document for design purposes, because it is the ESF team's own retrospective verdict on their own famous system. From the official announcement (Skyrider, 19 Jan 2010, http://web.archive.org/web/20100124045858/http://esforces.com:80/news/34/51/ESF---New-Melee-System-Overview-video.html):

> "Over the years **one of the most heavily debated topics within the development team has been the melee system.** This system alone has required hours upon hours of discussion, design, redesign, re-redesign, re-re-redesign, re-re-re-redesign... you get the picture. … I am happy to announce that we have finally found a winner!
>
> There were a few realizations made during the last round of the design process that have had a huge impact on the new system.
> **1. Players really enjoy simple melee**
> **2. Melee is more about out maneuvering opponents than just mashing buttons**
> **3. There needs to be a way to do complex moves in a simple way**
>
> As a result, new moves have been implemented that **retain the feel of simple melee, but offer players a way to string attacks together to form combinations.**"

**That is the verdict: the arrow minigame was abandoned, and the reasons given are exactly points 1–3.** The new moveset:

| Move | Input | Behaviour |
|---|---|---|
| **Simple Melee** | Mouse 1 | Light damage. "the **knockback distance has been modified to allow average players to perform multiple melee hits more easily**" — chaining deliberately democratised |
| **Combo Melee** | Mouse 2 | "A more damaging **charge based** melee attack that delivers several blows. **Holding a direction will send the opponent flying in that direction after the combo finishes.** This is very handy for planning out the attack in the chain or for knocking opponents into objects that are to the left or right of the player" |
| **Quick Throw** | Mouse 1+2 | Based on the beta throw; **resist removed** |
| **Grab and Smash** | Mouse 1+2 **with turbo on** | "allows one player to **grab another during swoop and drag them around**" — fly them around the map, or "smash their head into the ground and/or adjacent walls" |
| **Bonus moves** | Bonus button (**C** by default) | See below |

Note the **rebind**: simple melee moved from RMB (1.2.x) to **LMB**, and the two buttons together became the throw. Charge-melee on RMB.

### The Bonus System — a resource earned by playing well
> "a framework was created where players **earn bonus points through different actions**, such as damaging an opponent, and **spend those points on special moves.** Bonus points may be applied to **blocking, beams, and melee.** Within each area there are **three levels of bonuses; the higher the tier, the higher the cost and the more devastating** the bonus. … **once a melee bonus has been activated it's only active for a limited amount of time. It is crucial to setup your bonus attack using simple melee, combo melee, and throwing.**"

And the earning curve (from *Simple Melee Update*):
> "a simple melee hit will give you **1** point; the second hit will give you an additional **2** points, third hit **4** points, fourth **8** points and so on. Of course this only counts for **continuous** hits. **If the target recovers from his blow back your point multiplier also gets reset.**"

### ESF:F simple-melee damage model
> "In the past damage and blow back dealt from a melee hit was **consistent no matter how the hit was done.** In ESF: Final the blow back and damage dealt with simple melee will depend on **2 things. The first is speed**, meaning that the faster you go the more damage blow back is done. **The second is power**, which can be considered the power level difference between the two players. … Of course **limits have been set** as to how much damage may be dealt to players."

**Momentum-scaled melee.** This is the direct mechanical expression of "the approach is the skill" — a committed high-speed run-up hits harder than a standing punch, which retroactively justifies the whole swoop system.

---

# 2. THE CAMERA

The brief flagged this as one of the two decisive sections. It is also, unfortunately, the thinnest-documented area, so I have separated what is confirmed from what I could not establish.

## 2.1 Confirmed: third person, and that is the identity of the game

The official ESF site's own description:
> "ESF is a fast paced, **3rd person fighter** based on the hit anime, Dragonball Z"
> — https://esforces.com/about

A first/third-person toggle exists and is bound to **F4** ("Toggle First/Third Person", 1.1 FAQ default controls). The console command `thirdperson` also works (https://forum.esforces.com/threads/an-invisible-fight.89369/). **Third person is the default and the intended view; first person is a toggle, not the norm.** This is the opposite of the Half-Life engine's default posture, and ESF chose it deliberately — you cannot read your own body's orientation, aura, transformation state or flight pose in first person, and all four are gameplay information here.

## 2.2 Confirmed: player-controlled camera, on keys

The 1.2 manual has a dedicated **Camera Controls** section:

| Key | Function |
|---|---|
| **Home** | Resets camera view to default location |
| **I** | Zoom in |
| **K** | Zoom out |
| **J** | Rotate camera to the left |
| **L** | Rotate camera to the right |

This is worth pausing on: **ESF gave the player manual orbit and zoom on the keyboard, as a first-class documented control, in a game where the mouse is already fully occupied by aiming.** The camera is treated as an instrument the player plays, not a fixed rig.

## 2.3 Confirmed: the default camera is centred behind the player, not over-the-shoulder

Offset is controlled by `cam_xoffset` / `cam_yoffset` / `cam_zoffset` (default `cam_zoffset : 10`, x and y `0`), settable via `userconfig.cfg`. Players used these to build a Budokai-style over-the-shoulder view — meaning it is **not** the default. A knowledgeable regular pushed back on doing it:

> "i have no clue why youd want such a bad camera angle as it **shrinks your right side view angle**. Not like everyone will be comming from the left you know ^^"
> — https://forum.esforces.com/threads/esf-camera.77478/ (Apr 2010)

**That is a real design argument specific to this genre: in an all-directions aerial fight, a shoulder offset is a genuine competitive handicap because it costs you peripheral vision on one side.** An over-the-shoulder camera is a cinematic choice that a 360° threat environment punishes.

## 2.4 Confirmed: 1.2.3's camera is *dynamic* and swings; ESF:F's is fixed

> "How can I make the camera in ESF 1.2.3 to be **fixed (not to move from one side to the other) and not dynamic** … **try this in the open beta and it is fixed as I want and does not move from one side to the other.** … It is rare because **in Open beta the character if kept aside and only occurs in 1.2.3**"
> — https://forum.esforces.com/threads/camera.158783/ (May 2020)

So: **1.2.3 = a dynamic camera that shifts the character from one side of frame to the other; ESF:F (Open Beta) = a stable fixed offset.** A player in 2020 was still trying to remove the 1.2.3 swing — so the dynamic camera was, to at least some players, a persistent irritant rather than a feature.

The same thread records what it costs to do better, from someone who tried:
> "The only way I know to do this is by creating an entity to be a new camera object using amxx. Ive made one that does the job, but **it still has bugs with fast movement and adv melee** unfortunately."

**Fast movement and advanced melee are named as the two hardest camera cases.** That is precisely the warning a flight-brawler project needs: the camera problems live in (a) high speed and (b) scripted two-body sequences.

Other camera-relevant cvars from the 1.2 dump — **⚠ note these are stock Half-Life third-person cvars and I cannot confirm ESF actually drives them**: `cl_chasedist : 112`, `cam_idealdist : 40`, `chase_back : 100`, `chase_up : 16`, `c_mindistance : 30`, `c_maxdistance : 200`, `c_maxpitch : 90`, `c_maxyaw : 135`, `c_minyaw : -135`, `default_fov : 90`.

**`cl_motionblur : 1`** is an ESF-specific client cvar and is on by default — ESF shipped motion blur in 2004, on the Half-Life engine, which tells you how much of the speed sensation the team located in the *presentation* rather than the physics.

## 2.5 ★ CONFIRMED: the camera is FORCED TO FIRST PERSON during an advanced melee battle

This is in the official ESF 1.2.1 changelog, and it is the single most concrete camera fact in the whole record:

> **"Firstperson is now forced during melee battles, so the screen doesn't fuck up"**
> — ESF Beta 1.2.1 changelog, 31 Jul 2004, https://web.archive.org/web/20040803105048/http://esforces.com:80/?p=news_archive

**Read what that admits.** ESF is a third-person game whose signature mechanic could not be filmed in third person — so rather than solve it, the team **cut to first person for the duration of the sequence** and said so in the patch notes. The stated reason is not artistic; it is that the third-person camera *broke*.

This corroborates §2.4 exactly: the two hardest cases for this camera are **fast movement** and **advanced melee**, and the shipped answer for the second was to stop using the camera. **For the project: a two-body scripted clinch needs its own purpose-built camera treatment decided up front, or you will end up doing what ESF did and hiding the problem.**

Other 1.2.1 changelog entries confirm the sequence had broader integrity problems: *"You're no longer able to change teams during Advanced Melee and Throw"*, *"Prepunch crashing bug fixed"*, *"Fixed a bug with the last few melee arrows not going green/red or fade away"*.

**⚠ UNVERIFIED but plausible and worth chasing:** one report holds that ESF's camera is *stateful* — that it **zooms out when you are hit and zooms in when you teleport** (traced to https://forum.esforces.com/threads/beam-camera.72972/, which I did not read on-page). If true, that is a dynamic-distance camera reacting to combat events, and it would be the most directly reusable camera idea in ESF. **Treat as a lead, not a fact.**

## 2.6 ⚠ STILL NOT CONFIRMED — I could not answer these from sources

I want to be explicit rather than plausible here, because these are exactly the questions the project needs and I would rather leave a hole than invent a number.

- **Is there any lock-on framing in 1.2.x?** Mechanically, no: "There is no longer a need to target opponents, swooping is free form 360 degree movement." In **1.1** a lock placed a **red box around the target** and 1.1's HUD/scouter put a **red diamond over enemy heads** — but a *box* is a HUD element, not a camera behaviour, and I found no source saying the 1.1 camera framed or tracked the locked target. **Do not assume ESF had a lock-on camera.**
- **How is the opponent framed during a swoop?** No source describes a swoop camera behaviour (pull-back, FOV kick, target framing). The `cl_motionblur` cvar and the "camera changing moments" praise for ESF:F videos suggest *something* dynamic in ESF:F, but I have no description of it.
- **What does the camera do during a beam / power struggle?** Not documented. The struggle HUD (the red/blue meter, right of screen) is documented in detail; the camera is not.
- **What does the camera do when you are launched?** Beyond the unverified "zooms out when hit" lead above, not documented. The 1.1 tutorial describes the *state* ("sent helplessly flying", "tumbling") and the recovery input, but nothing about view behaviour. **Note:** a dedicated search for camera-disorientation complaints found **none** — so despite being an obvious suspect, "the camera was awful when you got launched" is **not** a documented ESF grievance. Do not assume it was.
- **FOV behaviour.** `default_fov : 90` is the stock HL value. No source documents dynamic FOV.
- **Any ESF:F camera rework statement.** None found.

**Assessment for the project:** ESF's camera is best understood as *a competent third-person chase camera with player-driven zoom/orbit, plus motion blur, and a dynamic side-shift in 1.2.3 that ESF:F removed.* There is no evidence of a sophisticated cinematic or lock-on camera system in the shipped versions. If the project wants a camera that frames a duel well, **ESF is not a template to copy — it is a set of warnings** (§2.4: speed and two-body sequences break cameras; §2.3: shoulder offsets cost you the 360° read).

---

# 3. KI / ENERGY ECONOMY — what forces the pacing

## 3.1 The two resources

**Ki** is the universal currency — "ammunition" for attacks *and* the fuel for all movement and all defence. **Power Level (PL)** is a separate, persistent stat that grows during a match and multiplies your effectiveness. Health (LF, "Life Force") has no regeneration at all.

> "KI (energy) is your "ammunition" for ki attacks. The blue bar represents KI. The white numbers above it is your **Power Level (PL)** (how strong you are)."
> "**LF: (Life Force)** Your current health. **You start to lose PL under 10 LF.** When you reach 0 you die"
> — official 1.2 manual

## 3.2 What ki pays for — the near-complete list

Assembled from the manual and the 1.1 FAQ:

| Action | Ki cost |
|---|---|
| Every energy attack | Yes, scaling with charge |
| **Flying (sustained)** | "as long as you're flying, you will slowly drain your Ki meter. **If your Ki drains completely, you will stop flying and will fall to the ground**" |
| **Swooping** | Yes — "at the cost of ki". "Remember that you cannot melee without enough KI, so don't EVER get caught without Ki" |
| **Chain-swoop** | Extra, above a normal swoop |
| **Jumping** | Yes, and "the higher you jump, the more Ki you will drain (although it is a relatively small amount)" |
| **Teleport** | "a small amount of Ki" each time |
| **Turbo** | Continuous drain while active |
| **Blocking** | Yes, and block struggles drain harder |
| **Recovering from knockback** (mid-air righting, getting up off the floor) | Yes — and with no ki you simply lie there |
| **Throwing** | Yes — running dry cancels the throw outright |
| **Resisting a throw** | Yes (it burns the *thrower's* ki faster) |
| **Power struggling** | "While in a power struggle you will slowly drain your Ki" |
| **Transforming** | Some transformations (e.g. Super Saiyan) cost ki; running out **forces you to descend** |

**⚠ NO SOURCE GIVES A NUMERIC KI COST FOR ANYTHING.** Not one. I searched specifically for this. Every figure would be invented, so I have given none.

## 3.3 Powering up — the deliberate vulnerability

> "you can refill your Ki meter by powering up. It only takes a **few seconds** to power up your meter to full, **but you are completely vulnerable during that time!** To power up, holding down the "Power Up" key. While you hold it down, a distinctive aura will surround your character and he will recharge his Ki."
> — 1.1 FAQ. Bound to **R** in the 1.2 manual, **E** in the 1.1 FAQ (a real rebind between versions).

- Recovery is **fast** (seconds), **held** (not toggled), **stationary**, and **loudly telegraphed** by an aura every other player can see.
- **Health does not regenerate.** The only heals are Senzu Beans hidden on maps, which restore health, ki and PL to max. (Majin Buu alone has a ki→health conversion move.)

## 3.4 What actually forces the pacing

This is the answer to the brief's question, and it is worth stating plainly because it is ESF's best structural idea:

> **Ki is simultaneously your offence, your movement, and your defence — and refilling it requires standing still, glowing, in the open.**

The consequences:
1. **You cannot play safe.** Turtling costs ki (block), fleeing costs ki (swoop/teleport/fly), and doing nothing to refill leaves you unable to escape.
2. **Every melee exchange is a ki race.** The attacker pays to chase; the defender pays to recover. Whoever runs dry first becomes a ragdoll — the recovery input simply stops working (§1.5).
3. **The refill is a fight in itself.** A player powering up is an advertised, stationary target — so "when do I recharge" is a real read, and punishing a power-up is a legitimate win condition.
4. **Health's irreversibility supplies the tension.** Ki churns constantly; health only goes down. Damage is permanent, so the ki economy is played *over* a slowly closing window.
5. **A hard floor exists.** With zero ki you cannot fly, swoop, melee, block, teleport or recover. Running out is a soft death.

For a project already carrying a ki/regen system, the transferable part is #3 and #5: **make the refill a public, committed, punishable act, and make ki-zero genuinely helpless rather than merely weaker.**

---

# 4. BEAMS AND POWERSTRUGGLE

## 4.1 Attack taxonomy (official manual)

> "There are two(2) types of energy attacks, **instant, and minimum charge**."

- **Minimum-charge attacks:** "These attacks must have a minimum amount of ki put into them before they can be fired. **The yellow line shows where the minimum is.** You may **further charge after the minimum has been reached** in order to fire a larger, more damaging, blast. **When the charge is at it's maximum the attack can be held** (at the cost of draining ki)."
- **Instant attacks:** fired immediately, no charge; some have an inter-shot delay.

Five delivery classes, each with distinct rules:

| Class | Examples | Rules |
|---|---|---|
| **Beams** | Kamehameha, Final Flash, Generic Beam | **"Beams can be controlled and directed by mouse movement"** after firing. **"They may also be detonated prematurely by pressing the secondary mouse button"** |
| **Blasts** | Spirit Bomb, Big Bang, Ki blasts | "unable to be controlled or directed once you released them" |
| **Discs** | Frieza Disc, Destructo Disc | **"one-hit-kill attacks"**. **"Discs can go through anything and can't be blocked."** Frieza's is controllable and returns to him on RMB; Krillin's is not |
| **Lasers** | Finger Laser, Eye Laser | Quick. **"Blocking will not impair the damage on this attack"** |
| **Ki Blobs** | emergent | Many ki blasts into one spot form a persistent damaging bubble; **"you can detonate the ki blob with explosive power using a beam or blast attack"** for a massive explosion |

**Splash damage:** "Even if an attack doesn't directly hit someone the splash damage can still reach them. **The radius of splash damage depends on the size and strength of the attack.**"

Charge time example (1.1 FAQ, Goku's Spirit Bomb): maximum charge "takes close to **thirty seconds**", has **no ki drain** on Goku, but you cannot move while charging or holding it.

**Charging is interruptible and you lose it.** Getting meleed mid-charge releases the attack randomly or loses the stored ki — this is the premise of a much-discussed suggestion thread (https://forum.esforces.com/threads/charging-attacks.139589/) and confirmed as an accepted fact of the game by its participants: "If you get hit while charging, that's your fault: take the consequences."

**⚠ A CLAIM I AM EXPLICITLY REJECTING.** I encountered a secondary summary stating that overcharging a beam past a second bar makes it "explode in your hand, destroying you and a lot around you." I traced this to **forum suggestion/wishlist threads, not documentation**. The official manual describes no such mechanic. **Do not treat beam self-detonation as an ESF mechanic.** This is the kind of plausible-sounding number that would have shipped as a fact if I hadn't chased it.

## 4.2 Power Struggle and Block Struggle — two systems, one meter

The manual distinguishes them precisely:

**Block Struggle (BS)** — beam vs blocker:
> "A block struggle happens while trying to block an attack that is **too powerful to swat away**. You may **turn on turbo to increase your chances of winning**. **The beam will be thrown back in the direction your aiming after winning** a block struggle. **If you are pushed into the ground or a wall, you will recieve crushing damage.**
> (The person firing the beam may also use turbo and/or **"pump ki" into the beam by holding the primary mouse button** to increase their chances of winning)"

**Power Struggle (PS)** — beam vs beam:
> "Power Struggles are when **2 or more beams collide**. **Hold down the primary mouse button** to try to over power the other beam. Once 2 people are in a power struggle **more may join in** to do a multiple powerstruggle. *note* **only beams powerful enough will be able to enter** a multiple powerstruggle."

**The meter:**
> "the struggle meter will appear. When the opponent is winning the line will be in the **red** area. When you are winning a struggle the line will be in the **blue** area."

### Is it a mash or a power comparison? — **Neither. It is a HOLD plus a resource burn.**
The brief asks this directly and the answer is unambiguous across both the manual and the 1.1 FAQ: you **hold** primary fire. There is no mashing anywhere in the beam game.

> "To successfully perform a power struggle, simply **hold down the primary fire key** … While in a power struggle you will **slowly drain your Ki**. This Ki will be put into the wave in an effort to either shove it aside or to push it back."
> — 1.1 FAQ

The inputs to the outcome are therefore: **beam power (charge at launch) + continuous ki poured in + turbo on/off + number of participants.** Skill expresses as ki management and the decision of when to commit turbo — not dexterity.

**Note the sharp internal contrast, which is a deliberate design statement:** ESF's *beam* struggle is a **hold-and-spend** contest, its *throw* struggle is a **hold-and-burn-the-attacker's-ki** contest, and only its *advanced melee* struggle is a **directional-input minigame**. The minigame is the outlier — and it is the one that got cut.

### The loser, and the escalation
> "But be warned. **The more you struggle, the stronger the wave becomes.** Sometimes it can become so powerful that when it finally does explode, the blast radius is large enough and the wave strong enough that **EVERYBODY on the map dies** (with the exception of teammates)."
> — 1.1 FAQ

Losing a block struggle means being **pushed into terrain for crushing damage**. Losing a power struggle means the combined, escalated beam detonates on you. **A struggle you have invested in is more lethal than the beam you started with** — so the decision to keep feeding it is a real gamble.

**Anti-stall rule (1.2):** "Powerstruggles will be **detonated if they don't move for 5 secs**." A necessary addition, and a hint that stalemates were a problem. Related community complaint: "**Long powerstruggles are boring (no skill and take speed out of the game).**"

Server toggle: `mp_multipleps` (manual default **0**; the 1.2.3 server dump had it **1**) — multi-player power struggles are optional. 1.2 also fixed: "Players in a ps/bs now **can't be pushed away/fall down due to other explosions**", and added "Beams attached to hands during blockstruggle" (a presentation fix that matters — the beam visibly connects to the body).

### ★ THE DUEL IS PROTECTED FROM THE CROWD — BY RULE, NOT BY ETIQUETTE
This is the best structural idea in ESF's beam game and it is easy to miss. Beta 1.1's feature list added, alongside multiple simultaneous power struggles: **struggling participants become immune to melee and discs, and take reduced damage from third parties while struggling** (https://web.archive.org/web/20030523163009/http://www.esforces.com/). 1.2 extended it so explosions cannot shove them out of position.

**In a free-for-all, a dramatic two-player set-piece is defenceless — anyone can walk up and end it.** ESF's answer was not to hope players would respect the moment; it was to make the moment *mechanically* protected. That is also why the beam struggle is what people remember a decade later: it was allowed to finish.

The scale it reached is the thing veterans actually cite. From a retrospective: *"getting an **8-way Beam Struggle** and blowing the entire map is just awesome."* (https://www.kanzenshuu.com/forum/viewtopic.php?f=11&t=27897). ⚠ That is one enthusiastic voice, not a survey — but it is the same escalation the manual warns about ("EVERYBODY on the map dies"), so the mechanic and the memory agree.

## 4.3 Beam jumping and deflection — both exist

**Beam jumping** (movement via recoil):
> "Hold down jump while **firing a beam into the ground or wall** and you will be propelled by your beam."
> — 1.2 manual, Miscellaneous. The 1.1 FAQ adds: "you will be propelled in the opposite direction as the beam. Useful for moving across the map quickly."

History: 1.2 **"Removed beamjumping on players"** (you could previously ride a beam off another player); 1.2.1 made it cost more ki after players used it as an escape-and-spam tool: "Turbo plus a small beam jump = being thrown far enough away to be able to charge a sbc or kame." The team stated the *speed and radius* would be cut in 1.3 instead — an acknowledgement that taxing it was the wrong lever.

**Deflection** exists in three distinct forms — worth separating:
1. **Swatting** — block auto-deflects weak attacks. "small Ki blasts will be automatically swatted aside." 1.2 fixed: "Beam swatting now works correctly on beams."
2. **Block-struggle reflection** — win a block struggle and **"The beam will be thrown back in the direction your aiming"**. A genuine full reflect, aimable.
3. **Counter-firing** — fire your own beam into theirs to force a power struggle.

**Also: two ways to defeat a beam without any of the above** — teleport out (with afterimage), or simply hear it coming ("he can either shoot a beam at you, which you'd hopefully hear and beamjump away").

---

# 5. TRANSFORMATIONS

## 5.1 The mechanic

> "Your **CF Bar** increases as your power level goes up. **You cannot transform with the increased power level from Turbo mode.**
> **Transform:** To ascend press **Z** when your CF meter is full. When you transform your power level will be **multiplied by 2 or 1.5** (depending on the character) which increases your **speed and strength** dramatically. **Some transformation cost ki** (such as SSJ).
> **Descension:** Pressing **X** will make your character descend to their previous form. **If you run out of KI you will also be forced to descend.** Some Characters will not descend once they transform.
> **Perfect Transformation:** The higher your power level is, the **less time it will take to transform.** Once your power level reaches the point where it takes **no time to transform (its instant)** you've reached Perfect Transformation."
> — official 1.2 manual

The 1.1 FAQ adds: transforming also **decreases your charge time**, and re-ascending after a forced descent "will take slightly less time to complete the transformation." **CF = "Change Form"**, a HUD meter showing PL progress toward the threshold.

## 5.2 State or resource? — **A state, gated by a resource, that decays back**

The brief asks this directly. The answer is nuanced and it is the interesting part:

- It is a **state**: once transformed you remain transformed, with a flat multiplier on power, speed and charge rate. No timer.
- It is **gated by a threshold**, not bought: you need PL ≥ the character's requirement, and PL is earned by fighting.
- But it is **sustained by ki** for some characters: ki-zero **force-descends** you. So the transformed state is a standing ki tax for exactly the characters (Saiyans) whose transformation is the most powerful.
- And for others it is **permanent**: Cell and Buu "will not descend once they transform" and even **respawn transformed** after dying.
- **Turbo PL does not count** toward the threshold — you cannot bootstrap a transformation by turbocharging. Turbo and transformation are deliberately separated.
- **Transform time shrinks as PL grows, to zero.** The ceremony is a real, punishable commitment early on and free later. **That is an elegant curve: the transformation animation is a vulnerability window that your own growth eventually deletes.**

## 5.3 Turbo — the second, cheaper power state

Often conflated with transformation; it is separate.
> "Turbocharging is a method that allows you to boost your Power Level **at the expense of Ki**. As long as you are turbocharged, your Ki will drain at a **steady rate**. However, while turbocharged, **all of your attacks are more powerful, and you run and fly much faster.** … While turbocharged, **an aura will surround your character**, so you can tell by looking at anybody whether or not they are turbocharged."
> — 1.1 FAQ. Bound to **T**.

Turbo also: raises your chance in block/power struggles; is required for ESF:F's Grab and Smash; and combines with swoop for the killing combos ("if you have turbo on while swooping, this very-well can kill them"). **A toggleable burn-ki-for-everything state, publicly visible.** Two power tiers — a cheap toggle and an earned permanent ascension — is a good structure.

## 5.4 Per-character transformation numbers

Full table in §App. B. The shape: **PL multiplier 1.5 or 2.0 · max health +10 to +50 · max speed +55% to +94%.** Transformation is primarily a **speed** upgrade, secondarily health, with damage riding the PL multiplier.

---

# 6. MOVEMENT AND FLIGHT

## 6.1 Not 6DOF — a ground/fly toggle with free 3-D aim

> "To fly, **tap the "Fly" button to toggle flying mode.** While flying mode is activated, moving forward and backward will move you **straight forward and straight backward in the direction you're currently pointing.** To move straight up, press and hold the Jump key."
> — 1.1 FAQ

- **Toggle flight** (F), not hold. Bound alongside a separate descend.
- **Movement is aim-relative** — you fly where you look, so mouse aim and flight direction are the same control. This is what makes it feel like flight rather than a hover-jet.
- **No roll axis, no true 6DOF.** It is Half-Life movement with gravity suspended and the pitch axis made meaningful. Descent-style independent roll/yaw does not exist.
- Vertical: Jump/Space to rise; 1.1 also lists **Move Up `'` / Move Down `/`** as discrete binds. Later versions use a descend key.
- **"Dropping"/"gliding"** — deliberately toggling flight *off* to free-fall as a fast, ki-free way to lose altitude, and a documented evasive technique that hard-counters swoops ("hitting those damn droppers. I always undershoot").
- **You cannot duck.** (1.1 FAQ)
- Swimming exists (official About page).

## 6.2 Speed tiers

| Tier | Value | Source |
|---|---|---|
| Base ground/air speed | **`cl_forwardspeed : 216`** | 1.2 manual client cvar defaults |
| Per-character max speed | **180–220** untransformed, **250–350** transformed | 1.1 FAQ statistics (§App. B) |
| Vertical | `cl_upspeed : 320` | 1.2.3 dump |
| Turbo | "run and fly **much faster**" | 1.1 FAQ |
| Swoop | **"several times faster than normal"** | melee tutorial |
| Engine ceiling | **`sv_maxspeed : 5000`**, `sv_maxvelocity : 5000` | 1.2.3 dump |
| Gravity | `sv_gravity : 800` (HL default) | 1.2.3 dump |

**⚠ INFERENCE:** `cl_forwardspeed : 216` exactly equals Goku's listed "Max Speed: 216", which strongly suggests the per-character Max Speed stat *is* the movement speed cap in Half-Life units. I could not confirm the engine wiring. Note also that ESF raises `sv_maxspeed` from Half-Life's stock 320 to **5000** — a ~15× headroom increase whose only purpose can be to let swoop and turbo exist at all.

## 6.3 How "fast" reads on screen — and how much of it is presentation

This is the part worth copying. The perceived speed is not mostly in the numbers:

1. **Small characters.** "the targets in ESF are 4 times smaller than in half life." Grega's own formulation: **"Smaller models = more speed"** — "What is a slow speed in half life is really fast in ESF … the speed transition is equal to the model scaling." **Shrinking the character multiplies apparent speed for free**, because speed reads in body-lengths per second, not units.
2. **Motion blur**, on by default (`cl_motionblur : 1`) in 2004.
3. **Dust trails** (`cl_dusttrails : 1`, `cl_dusttrailslbl : 100`) and **aura bending** (`cl_aurabend : 1`).
4. **Locational audio** — a swoop is audible and directional, and skilled players fight by ear.
5. **Teleport afterimages** — the dodge leaves a visible ghost.
6. **Committed trajectories.** A swoop is a straight, fast, decaying line you cannot cancel except by ending it. Commitment reads as speed; steerable drift reads as floating.

And the counterweight: **all that speed is what made per-punch aiming impossible and drove the entire melee design** (§1.1), and it is also what made ping brutal ("ESFs 100 ping would be something similar to Half Lifes 400 ping").

## 6.4 Other movement verbs

- **Wall jumping** (added 1.2): "Hold any direction … towards a wall, then hold jump. The character will then **charge up a jump**, jumping distance is determined by the **length of charge**."
- **High jump:** "The height of your jump can be controlled by the length … you put on your jump key" — and it costs ki.
- **Beam jumping** — §4.3.
- **1.3/ESF:F split dash and swoop** into two systems: "swoop is made so that you stop if you let go. Dash isnt." Double-tap to start a swoop, **single tap to chain** (relaxed from 1.2's double-tap-to-chain). Community reaction was mixed and notably included "**1.3 is too fast right now**… should be slowed down to a speed that is *slightly* faster than 1.2" and "All 1.3 needs is 1.2 movement."

---

# 7. BID FOR POWER (Quake 3)

BFP turned out to be **better** documented than ESF, not worse — the official manual and site text survive, eight developer journals from 1998–2002 are archived, and a **source-code replica** exists whose constants can be read directly.

## 7.0 Source tiers — this governs every number below

| Tier | Source | Trust |
|---|---|---|
| **A — CANON** | The BFP manual, the still-live official site http://www.goldenhammersoftware.com/bidforpower/about.html, and 8 archived 1998–2002 **developer journals** | Authoritative for **rules** |
| **B — RECONSTRUCTION** | https://github.com/LegendaryGuard/BFP — a source **replica**; *"The original source code appears to be lost."* | Authoritative for **structure and cvar names**. **Numbers are reconstructed.** The repo itself flags divergence: *"Balanced player physics movements (**different from the original BFP**…)"*, and that `kiCharge`, `boostCost`, `blockCost` "work differently" |
| **B+ — data files** | `cfgs/bfp_weapon.cfg`, `bfp_attacksets.cfg`, `bfp_server.cfg` | Very likely genuine extracted data — **independently cross-validated**: the attacksets decode to all six official character kits exactly, and `bfp_weapon.cfg` contains **exactly 21** attack blocks, matching the official "21 ki attacks" claim |
| **C — community** | ESF forums, Reddit, ModDB | Opinion only. ⚠ The ESF-forum sample is self-admittedly biased (moderators eventually *banned* the comparison topic) |

**The highest-confidence reconstructed numbers** — cross-validated against canon or a journal entry — are the weapon table, the tier boundaries, the PL damage/health/ki formulas, and the flight/regen crossover.

## 7.1 What it is

A **total conversion for Quake III Arena**. "Players take control of Ki-powered superheroes and battle it out in a **mostly aerial** fight." Developed **1998–2002**, built from Quake 3 SDK 1.15c. Originally made with DBZ characters; a **Funimation cease-and-desist forced a retool** into original characters, and development stopped.

⚠ **Version dates are genuinely contradictory and you should not cite a single one.** The dev journal has **1.2 shipping May 2002** ("downloaded over 100,000 times") and Shacknews dates a 1.2 article 8 May 2002 — but GiantBomb says 27 Sep 2004 and ModDB says "Released 2004."
⚠ **There is no official BFP 2.0 or 2.5.** Per https://openarena.fandom.com/wiki/ModCompat/Bid_For_Power: *"**1.2 is the final mod version for Q3A/OA.**"* Versions numbered 2.0+ belong to a third-party fork, *English Bid For Power Final*, which the wiki notes violates the Q3 SDK licence.

## 7.2 Flight — a toggle, but with unrestricted pitch

Canon: *"BFP has a toggle able flight button… While flying, **you are able to move to wherever you look**. The jump key will make you move up, and the crouch key will make you move down. Your ki drains at a steady rate. **At low power levels you will need to limit your flight, while at high power levels you can fly all day.**"*

- **Toggle with a latch** (`PMF_FLIGHT_LATCH`, `eFlags ^= EF_FLIGHT`). Gravity fully suspended.
- **Translation is view-aligned in full 3D** — `wishvel = forward*fwd + right*side + up*up` using the **pitched** view vector.
- **★ THE PITCH CLAMP IS REMOVED WHILE FLYING.** In `PM_UpdateViewAngles`: `if ( i == PITCH && !( ps->eFlags & EF_FLIGHT ) )` — i.e. the "don't look up/down more than 90 degrees" rule is skipped in flight. **You can pitch past vertical and loop.** Confirmed deliberate by the journal: *"**got around the gimble lock for flight so you can go upside down**"* and *"changed up and down orientation while flying to be **relative to the player's axis**."*
- **No player-controlled roll** — roll is cosmetic auto-bank (`PM_FlyTiltView`, `cg_flytilt`). ⚠ **Real discrepancy:** the replica banks to **±20°**; a network dump derived from *real BFP demo files* records fly tilt running to **±80°**. Original BFP banked four times harder.
- **Momentum is real.** Journal: *"**Flight physics was totally redone to include momentum**."* `PM_Drifting()` adds residual lateral/vertical drift on input release — you slide, you don't stop.

**Tuning (Tier B — explicitly retuned, not original):** `pm_flyaccelerate 2.0` (Q3 default 8.0) · `pm_flightfriction 2.0` (3.0) · `pm_airaccelerate 4.5` (1.0). **Deliberately floaty** — a quarter of Q3's fly acceleration.

**Speed tiers — and flight boost is SUPERLINEAR in power level.** Base `g_speed 320`:
```
KiBoostSpeed = speed + powerlevel × 0.5
ground boost: wishspeed += KiBoostSpeed
flight boost: wishspeed += KiBoostSpeed × (2.0 + powerlevel × 0.001)   ← extra multiplier
```
| Internal PL | Walk | Ground boost | **Flight boost** |
|---|---|---|---|
| 50 (spawn) | 320 | 665 | **1027** |
| 500 | 320 | 890 | **1745** |
| 1000 (max) | 320 | 1140 | **2780** |

**Max-PL boosted flight is ~8.7× walking speed.** This is the direct cause of BFP's top complaint (§7.9).
Boost is **suppressed while blocking and while firing a beam** (journal: *"took away boost speed bonus while _firing_ a beam"*). `g_noFlight 0` disables flight server-wide.
⚠ Journal: *"**Flight speed was highly dependent on FPS** as of rc2. Ki boost cost was highly dependent on FPS since build 1."* Both later fixed.

## 7.3 Ki economy — one pool, and power literally buys you the sky

Canon: *"Ki is your stamina… **while charging you can not move or attack, and are highly visible to other players**."* One pool serves **ammo, flight, boost, block and teleport**.

**Both maxima derive from power level** (note the odd constant — the replica author flags it too):
```
STAT_MAX_KI     = min( 999 + 9.00825 × powerlevel, 10000 )
STAT_MAX_HEALTH = min( 1 + powerlevel, 1000 )
```

| Drain | cvar | Rate |
|---|---|---|
| Flight | `g_flightCost 50` | **50 ki/second** |
| Ki boost | `g_boostCost 350` | **350 ki/second** — 7× flight |
| Passive regen | `g_kiRegenPct 0.6` | **0.6% of maxKi per second**; blocked while boosting/charging, **not** blocked by flying |
| Ki charge (recharge) | `g_kiChargePct 15` | Canon target: *"Ki recharge time has been increased to **6 seconds**… We had it take about **20–30 seconds** a long time ago and **it really killed the gameplay**"* ⚠ per-frame in the replica → framerate-dependent |
| Block | `g_blockCost 2` | ~1+ ki/tick at 75% probability (replica: *"a weird random thingy… tried to get the similar result"*) |
| Block deflecting a missile | hard-coded | **10% of maxKi**, 250 ms debounce |
| Melee landing on a blocker | hard-coded | **5% of maxKi off the BLOCKER**, 250 ms debounce |
| Teleport | hard-coded | **5% of maxKi**; requires ki > 5% maxKi |
| Ki attacks | per-attack `kiCost` | 10 (Ki Blast) → **1000 (Ultimate Blast), per charge point** |

**★ The flight/regen crossover IS the progression curve.** Net flight drain = `50 − 0.006 × maxKi`:

| Display PL | maxHP | maxKi | dmg × | net ki/s flying | **Flight endurance** |
|---|---|---|---|---|---|
| 50,000 | 51 | 1,449 | ×0.51 | 41.3 | **35 s** |
| 250,000 | 251 | 3,251 | ×2.51 | 30.5 | 107 s |
| 500,000 | 501 | 5,503 | ×5.01 | 17.0 | 324 s |
| 999,000+ | 1,000 | 10,000 | ×10.01 | **−10.0** | **INFINITE** |

This exactly reproduces the journal entry *"upped ki regen rate so that **flying at max pl costs nothing**"* — strong independent evidence the reconstructed constants are close to original. **A new player gets 35 seconds of sky; a maxed player owns it forever.** That is a far more evocative progression than a stat increase, and it costs one subtraction.

⚠ **Running dry is punished hard.** Ki ≤ 0 → `eFlags &= ~EF_FLIGHT` (**you drop**) *and* 100 ms hitstun; insufficient ki for the flight tick → **1000 ms hitstun**. And **fall damage exists only while stunned**. Overextend your flight and you fall, get stunned, and take damage on landing.

**Charge attacks: 6 discrete points, each costing FULL price.** `ATTACK_CHARGE_LIMIT = 6`; one point per `weaponTime` ms; `kiCost` is charged **per point**. A fully-charged Ultimate Blast = 6 × 1500 ms = **9 seconds** and **6,000 ki — 60% of a maximum tank**. The HUD shows charge **dots**, and per-model configs key voice lines to *"charged to the 4th dot"*.

## 7.4 Melee — a hold-to-autoattack with a teleport gap-closer

**This is the section that most explains why ESF won on gameplay.** The canon spec is four sentences: *"To engage in melee combat, **hold down the melee key and put the crosshairs over your opponent**. If you are close range, then you will start beating on him. If you are long range, you will **dive** at the bad guy for a strike. To add extra knock back and stun your opponent, hold down the boost key while melee fighting."*

The official feature list calls it *"**offhand** melee combat"* — their word. Every character's kit is 5 ki attacks and **zero** melee moves. Only 4 melee animations exist.

`CheckMeleeAttack` (`g_weapon.c`):
1. Trace `g_meleeDiveRange` = **700** units along the view vector (retuned down from 2000).
2. Validate a live enemy player.
3. If distance ≥ `g_meleeRange + 45` (**32 + 45 = 77**) → **`VectorCopy( tr.endpos, attacker->client->ps.origin )`**
4. Deal `g_meleeDamage` **10**, then `weaponTime += 300` — a strike every **300 ms** while held.

**★ ⚠ THE "DIVE" IS AN INSTANTANEOUS TELEPORT, NOT A FLIGHT.** There is no travel, no commitment window, and nothing for the defender to read, dodge or intercept. **This is the single largest mechanical difference from ESF, and it is why BFP melee never felt like combat.**

```
damage = damage × (attackerPowerlevel + 1) × 0.01     // global PL scaling
melee knockback: computed from RAW damage → flat 75, cap 1800   // does NOT scale with PL
```

**Is melee weak? In raw DPS, no — and this is counterintuitive.** Because damage and maxHP both scale with PL, melee is **always 10 hits to kill ≈ a constant ~3 s TTK**, which out-DPSes the basic Ki Blast roughly 1.7:1.

**★ The real role of melee is the kill confirm, and the numbers are exact:**
```
boosted melee → 3000 ms hitstun ÷ 300 ms per strike = EXACTLY 10 strikes = exactly lethal
```
Canon is emphatic: *"**Do not overlook this feature.** Being able to knock people into hit stun with ki-boosted melee is **one of the keys to being good at BFP**."*

**Hit stun** (`STAT_HITSTUN_TIME`, real ms): no move, attack, block or charge; **`eFlags &= ~EF_FLIGHT` — a stunned flier falls** and takes fall damage. A real counter-triangle exists: **holding melee prevents the stun**, **teleport cancels it**, and the attacker has a **6000 ms re-stun cooldown**.

⚠ Two canon-vs-code conflicts: the manual says teleport escapes stun *"after 1 second"* but the replica gates at ~100 ms (**canon should win**); and the manual's claim that boost adds *"extra knock back"* is contradicted by both the code and the journal (*"removed the damage boost for ki boosting"*) — **treat it as stale manual text**; boost affects melee only via hitstun.

**Community verdict is unanimous, and the developers agreed:**
- *"**The melee was clearly an afterthought**, and the attacks didn't really seem like the show's."* (https://forum.esforces.com/threads/has-anyone-tried-bid-for-power-q3-mod.126115/)
- *"It's fun trying to use the melee attacks by holding ALT, but **it's so hard to aim since the bots keep zipping all around**."* (r/gaming, 2.4k pts)
- **Lead coder Yrgol, 17 Nov 2001:** *"**I will also likely be replacing the melee system with something different.**"*
- **Project lead Chris:** *"for Phase II… we will be introducing an **advanced melee system**"* — they used ESF's own term. Phase II died with the C&D.

## 7.5 Beams and powerstruggle

**21 attacks confirmed twice** — the feature list ("21 different ki attacks including controllable, homing, and chargeable attacks (no guns)") and an independent count of 21 `weaponNum` blocks in `bfp_weapon.cfg`. ⚠ The site's FFA blurb says "20"; one entry is a spawn-only sub-projectile, which reconciles 20 usable + 1 internal — **that reconciliation is inference, not a sourced claim.**

**Six data-driven attack types** (~45 fields each): `missile` · `rdmissile` (splits by charge points) · `beam` (steerable; *"If another beam collides against other beam, creates a beam struggle"*) · `sbeam` (steerable only while held; **"It doesn't work for beam struggles"**) · `hitscan` · `forcefield`.

**★ Beam implementation — the most reusable finding here** (`Weapon_BFPBeamRun`):
```c
distance = ent->distance + ent->speed * deltaTime;        // head travels out at missileSpeed
VectorMA( muzzle, distance, forward, ent->s.pos.trBase ); // ...re-anchored to CURRENT aim
```
- A beam is **one head entity** at distance *d*, moving out at 2000–3000 u/s.
- **Steering is instantaneous — no turn-rate cap.** The head is re-projected onto the current aim ray every frame, so swinging the mouse sweeps it through an arc of radius *d*.
- **Collision is the whole shaft:** traced from the owner's eyes to the head every frame.
- **⚠ The rendered beam bends but the damaging head does not.** Journal, Yrgol 06 Jul 2001: *"**beams are bendy now. beams are not guided missiles, they are a beam of energy that gets longer quickly. when you turn left while firing, the beam bends to the right briefly before straightening out again.**"* That bend is a lagging **client trail**. Worth knowing if you want a genuinely curved beam — BFP faked it.

**★ POWERSTRUGGLE — a damage comparison with one binary ×2 lever. NOT a mash.**
Canon: *"When two beam attacks collide, a power struggle will happen. Instead of the stronger beam blowing up the weaker beam, **the stronger beam will push back the weaker beam until it hits the other player**. **Ki boost can be used to up the power of your beam if you are losing.**"*
```c
const float BEAM_PUSH_STEP = 200.0f;
ps.weaponstate = WEAPON_BEAMSTRUGGLE;        // BOTH casters pinned
powerEnt    = ent->damage;  powerTarget = target->damage;   // charge-scaled damage
if ( boosting ) powerEnt    *= 2;            // a HOLD, not a mash
if ( boosting ) powerTarget *= 2;
if      (powerEnt > powerTarget)  push target back 200u
else if (powerTarget > powerEnt)  push self   back 200u
else                              push BOTH back 200u      // ties shrink both — no stalemate
```
`PM_BeamStruggleStatus` zeroes all movement input — **both players are rooted for the duration**, with sparks at the midpoint. **The drama comes from rooting both players and burning 350 ki/s, not from input rate.** Non-beam projectiles instead resolve by an integer `priority` (*"If both have the same priority, both break and explode"*).

**Attacks are volumetric objects that fight each other** — canon: *"BFP attacks are more than just a trajectory. Attacks have **actual dimensions**… If an attack looks 50' wide, it will hit any players who come within 25' of the center."*

Selected real weapon data (`bfp_weapon.cfg`; charge damage = `damage + (points − minCharge) × chargeDamageMult`, capped):

| Attack | Type | ki | dmg → max | speed | radius/expl | notes |
|---|---|---|---|---|---|---|
| Ki Blast | missile | 10 | 20 | 5000 | 20/125 | — |
| Razor Disk | missile | 500 | **100** | 4000 | 75/75 | piercing, priority 3, knockback **−1000** |
| Death Ball | missile | 250 | 20 → **100** | 3000 | **130/800** | charge 2–6, bounces |
| Impact Beam | beam | 250 | 5 → 50 | 2000 | 30/350 | charge 1–6 |
| **Ultimate Blast** | beam | **1000** | 20 → **100** | 2500 | 50/100 | charge 2–6 |
| Tornado Blast | hitscan | 1.5%/tick | 8 | — | r150/range450 | knockback **+200**, reflective |
| Blinding Flash | forcefield | 100 | 1 | — | radius **1200** | blinds **6 s** |

**⚠ The endgame balance failure, quantified:** a 6-point Ultimate Blast does 100 × the PL-1000 multiplier of 10.01 = **1001 damage against a 1000 max-HP target. A guaranteed one-shot kill.** This is exactly the developers' own admission: *"some of the **top tier attacks throw balance way off**."*

## 7.6 Blocking

Canon: *"Pressing block once causes the player to block for **2 seconds**. **Blocking drains ki quickly, but transfers all damage to ki instead of health.** The player **can not move** while blocking, and can not block again immediately after stopping."* The manual variant says *"between one and two seconds"* and a **one second delay** before re-blocking. ⚠ The two canon sources disagree on duration.

```c
blockTime      = level.time + g_blockLength × 1000
blockDelayTime = level.time + g_blockDelay  × 1000     // on release OR expiry
if ( ps.pm_flags & PMF_BLOCK ) { take = asave = 0; }   // FULL immunity
```

**★ ⚠ AN IMPORTANT ARCHITECTURAL DIVERGENCE.** Canon says damage is *transferred* to ki. The replica instead grants **flat health immunity plus a constant per-tick drain** — the ki lost does **not** scale with damage absorbed. The replica author says outright: *"On original BFP, this is handled into another way, so, **the formula remains unknown**."*

**Implement the canon version, not the replica's.** Damage-into-ki makes blocking a genuine resource decision and makes "break their ki, then hit them" a coherent strategy; flat immunity plus a fixed drain is just a 2-second invulnerability window. **This is the one idea BFP has that ESF does not, and it is a good one** — ESF's block merely *reduces* damage.

Discrete costs that do scale properly: **deflecting a missile 10% of maxKi** (+knockback) · **being melee'd while blocking 5% of maxKi**. Blocking suppresses ki boost and cancels fly-tilt; **teleporting clears block**.
⚠ Cvar defaults conflict between two files in the same repo (`g_blockCost 2 / g_blockLength 2` vs `g_blockCost 0 / g_blockCostPct 3 / g_blockLength 3`).

## 7.7 Teleport (Zanzoken)

Canon: *"controlled short-range teleportation performed by **double-tapping right or left movement keys**. If right or left is tapped twice **while moving forward**, then the teleport moves in a **diagonal forward** direction… useful for **dodging attacks**, and can be used to **break out of hit stun after 1 second**."*
Design intent, Yrgol Dec 2000: *"**yes there are restrictions and costs to prevent this from being used all the time**."*

Every constant (`Zanzoken` / `ZanzokenHandling`):
```
ZANZOKEN_NUMBER_TIMES_ALLOWED = 10        // uses before a forced cooldown
ZANZOKEN_ABUSE_DELAY          = 2000 ms   // lockout once you hit 10
MAX_ZANZOKEN_PRESS_TIME       = 240 ms    // double-tap window (must also exceed 50 ms)
ZANZOKEN_COOLDOWN             = 70 ms     // between consecutive teleports
range = ±500 units lateral;  cost = 5% of maxKi (requires ki > 5% maxKi)
```
- Traces `right × ±500` **plus an upward clearance check** (25→125 u); aborts on `startsolid`/`allsolid`.
- **Clears hit stun and block.**
- **Refused** during: mid-attack, beam struggle, stun, ki charge, Ultimate Tier.
- **★ NO i-frames.** It dodges purely by **displacement**. ESF's teleport is the same in this respect — neither game gave the blink invulnerability.

Net: a **~1.4 uses/second, 10-use-burst, 5%-ki, 500-unit lateral blink** with no invulnerability, that also cancels stun and block. **Note it is purely LATERAL** — you cannot blink toward or away from your target, which is precisely why BFP has no teleport-chase combo game (§1.4).

## 7.8 Transformations and power level

**Per-match progression, not persistent.** Canon: *"**The only way to get more power is to kill someone.** When you die… your power level is **reset to the average of all current power levels**. When the game ends… reset to the default."* A built-in rubber band; nothing carries between matches.

**★ ⚠ The displayed power level is a cosmetic lie, and the source says so.** Internally PL is an integer **1–1000**; the HUD appends three zeros:
```c
// they thought that adding "000" at the last can be entertaining for the player powerlevel
namePowerlevel = va( "%i000", powerlevel );
```
"1,000,000 PL" is internally **1000**. Implement in the small units. PL gain: `powerlevel += 1 + (victimPowerlevel × 0.1)`, clamped to 1000.

**Tiers gate LOADOUT SIZE — the progression *is* your kit unlocking:**

| Tier | Display PL | Internal | Aura | Selectable attacks |
|---|---|---|---|---|
| 1 | < 100,000 | < 100 | Blue | **1** |
| 2 | 100k–250k | 100–249 | Red | 2 |
| 3 | 250k–500k | 250–499 | Red | 3 |
| 4 | 500k–999k | 500–999 | Red | 4 |
| **Ultimate** | 1 mil | 1000 | **Yellow** | **all 5** |

Confirmed in `GainPowerlevelKiHealth`, firing `EV_TIER_1..4` with a **2000 ms** ceremony (**5000 ms** for Ultimate) plus a full health/ki refill. Global damage scaling is one line: `damage × (attackerPowerlevel + 1) × 0.01` — **×0.51 at spawn, ×10.01 at max.**

**★ Transformations are COSMETIC, and canon is explicit:** *"At 1 million power level, the transformation happens. The aura color turns yellow, and if the character has a transformation it occurs. **Other than the benefits from increased power level, there is no additional benefit of the transformation.**"* Compare ESF, where transforming is a discrete multiplier with its own ki tax — **ESF's transformation is a mechanic, BFP's is a costume on a threshold.**

⚠ **Ultimate Tier is a strange, probably-buggy state in the replica:** `PMF_ULTIMATE_TIER` makes you **invulnerable** (`G_Damage` returns immediately) but also disables flight movement, teleport and attacking. No canon support for the invulnerability — **do not copy it.**
⚠ **The tier→attack gating is documented in canon but NOT implemented in the replica** (`ClientSpawn` sets all five weapon bits unconditionally). The mechanism is right; the enforcement is missing.

## 7.9 ★ Camera — third person, no lock-on, and a documented failure

**Third-person by default, free-look, with a visible crosshair — and no lock-on of any kind.** Canon offers three viewpoints: *"**Third Person:** …Unlike the standard quake 3 third person view, **in BFP the crosshair is visible**, and the angle is changed to create less blocking of the view"* · *"**First Person Vis:** …viewpoint positioned on the model's eyes, and you can see your own arms and legs"* · *"**First Person:** standard."*

Exact geometry (`CG_OffsetThirdPersonView`), the shipped "Fixed Third Person" values:
```c
camAngle  =   0.0f;    // directly behind — NOT over-the-shoulder
camHeight = -60.0f;    // 60 units above
camRange  = 110.0f;    // 110 units back
#define FOCUS_DISTANCE 512
```
Confirmed in `cfgs/bfp.cfg`: `cg_thirdPersonRange 110`, `cg_thirdPersonHeight -60`. FOV is stock Q3 `cg_fov`. Cheat protection on the third-person cvars was **deliberately removed** so players could tune it. The camera solid-traces to avoid clipping geometry, and swings to face your killer on death.

**⚠ NO lock-on, soft-lock, or target cycling exists.** Searched across the manual, the official site, ~2,250 lines of dev journal, and the full source tree. Aim is a bare FPS crosshair. There is even an in-source comment acknowledging ESF differed:
```c
#define ESF_STYLE 0  // BFP - That isn't BFP, it's Earth Special Forces (ESF) style :P
```

**★ The camera was a known, never-solved problem — and the reason is instructive.** Because the camera sits off the model, a crosshair can be **truthful** or **stable** but not both. BFP shipped both and made you choose: *"accurate 3rd person crosshair"* → *"gave the accurate third person crosshair **some smoothing to prevent it jumping around**"* → *"added a toggle to use a **stable crosshair instead of the accurate one**"* (`cg_stableCrosshair`). Two of the manual's seven troubleshooting entries are camera failures (*"All I can see is the back of my character's head"*). An in-source TODO admits it never worked: *"BFP doesn't use the crosshair as player view, e.g. if the camera angle is 90º, the crosshair should look what's in this view, not what the player sees."*

**★★ THIS IS THE STRONGEST CAUTIONARY FINDING IN THE ENTIRE RESEARCH.** Combine **~2780 u/s boosted flight** + **unrestricted pitch** + **no aim assist** + **a melee system gated on crosshair-tracking**, and you get precisely the recorded complaints:
> *"**way too fast, i can't even see the guys flying around**"* — AnandTech, launch day Jan 2002, https://forums.anandtech.com/threads/bid-for-power-released.707420/
> *"so hard to aim since **the bots keep zipping all around**"* — r/gaming
> *"the game is awesome! but **have a lock on system would be better**"* — the sole piece of user feedback on UltraBFP's download page, **2024**

**A soft lock-on and an off-screen foe indicator are not concessions in this genre — they are the fix for the one problem that outlived the mod by twenty years.**

**Default bindings** (resolved from `q_shared.h` + `ui_controls2.c` + `cfgs/bfp.cfg`):

| Action | Bind | Default key |
|---|---|---|
| Attack | `+attack` | MOUSE1 / CTRL |
| **Melee** | `+button7` | **ALT** |
| **Ki boost (hold)** | `+button8` | **SHIFT** (also `q`); toggle on `e` |
| **Ki charge** | `+button9` | **MOUSE2** / CAPSLOCK |
| **Block** | `+button10` | **CTRL** |
| **Flight toggle** | `+button12` | **F** |
| Up / down in flight | `+moveup` / `+movedown` | SPACE / `c` |
| Select attack 1–5 | `weapon 1..5` | 1–5 |

## 7.10 The roster

The six final original characters map 1:1 onto the pre-legal DBZ roster:

| Final | Was | Signature attack |
|---|---|---|
| **Kyah** | Krillin | Death Ball / Razor Disk |
| **Tetsedah** | Vegeta | Ultimate Beam (Final Flash) |
| **Ryuujin** | Gohan | Rage / AGA (Angry Gohan Attack) |
| **Pyrate** | Piccolo | Corkscrew Beam (Special Beam Cannon) |
| **Gothax** | Goku | Heaven's Wrath (Kamehameha) |
| **Shilo** | Freeza | Death Ball |

⚠ Naming is **not** stable across releases; the manual's generic "BFP1–BFP6" kit lists and the site's final named kits differ, and `bfp_attacksets.cfg` does not follow the manual's order. Treat the attackset file as illustrative for *assignment*, authoritative for *attack data*.

## 7.11 What felt good, what was hated, and BFP vs ESF

### What felt good
1. **Flight — orientation freedom above all.** The decisive datapoint is that **ESF's own staff wanted to steal it.** ESF's `Zeonix`: *"It looks alright, but **plays horribly. The only thing I want ESF to take from the game is the ability to fly upside down.**"* ESF staff `KYnetiK`: *"Interesting about flying upside down though, **ive been wanting that for ages**."* They argued it on mechanical grounds — *"Dogfighting would actually be far more interesting and complex"* and *"This would give **Basic Melee** that extra edge"* (https://forum.esforces.com/threads/dbz-bid-for-power.70548/).
2. **Flight as earned progression** — 35 seconds at spawn, unlimited at max PL, out of one crossover in the ki economy (§7.3).
3. **★ Beam struggles are the standout memory — and they were RARE.** *"God, I remember playing that shit through many nights on LAN parties. **The beam struggles. The Oozaru mode.** One of the best gaming experiences."* But note the same thread's OP: *"**I rarely had the chance to do it**, that's probably why my memory's fuzzy."* Two beams had to physically intersect **with no aim assist to help you line it up.** *Scarcity made it memorable and also made it inaccessible* — a genuine design tension worth naming rather than resolving by reflex.
4. **Q3-engine visuals** — the consensus BFP win over ESF. `Twysta`: *"**ESF can never have graphics like BFP** but it can be better in gameplay."*
5. **Volumetric attacks that collide with each other** — genuinely distinctive for 2001.

### Known complaints
| Complaint | Evidence |
|---|---|
| **Too fast to track a flying opponent** | *"way too fast, i can't even see the guys flying around"* (AnandTech, Jan 2002) — see §7.9 |
| **Melee an afterthought** | §7.4; the developers agreed and planned to replace it |
| **Top-tier attacks unbalanced** | Dev: *"some of the top tier attacks throw balance way off"*; *"Boost jumping has been toned down. **It was simply too excessive**"* |
| **Balance outsourced → fragmentation** | Devs told unhappy admins to edit `bfp_weapons.cfg`. Result, in the dev's own words: *"BFP has been **heavily modified by several different groups** using the scripting system, so you may run into **compatibility issues**"* |
| **FPS-dependent physics** | *"Flight speed was highly dependent on FPS as of rc2. Ki boost cost was highly dependent on FPS since build 1"* |
| **Inputs sticking online** | *"Melee, block, ki boost, and ki charge had a tendency to get **'stuck' in online play**… a bug that's been present **since build 1**"* |
| **Tiny player base** | Dev: *"**We had about 30 people playing at a time** for about a year or two"* |
| **Lost its identity, then died** | *"it **lost its community and hype after it lost the dbz aspects**"* |

⚠ **Two premises corrected.** (a) **Map destruction was never shipped** — dev, Jul 2001: *"Breakable map entities are in… **None of the maps currently use this feature.**"* (b) **"Beam spam" is NOT in the BFP record** — searched and not found; the real complaints are speed/readability and melee. (Beam spam *is* an ESF complaint — see §8.2. Do not transplant it.)

### ★ BFP vs ESF — the verdict, and it holds outside the ESF forum
> **BFP better at:** engine, graphics, effects, **flight** (orientation freedom, momentum, upside-down), art, being first.
> **ESF better at:** **gameplay depth — melee above all**, being *alive*, feeling like DBZ.

- *"**BfP isn't as good as ESF, even though it uses the q3-engine!**"*
- *"I think **ESF has surpassed it in most areas**."*
- Neutral venue (r/gaming, 51 pts): *"you should check out Earth Special Forces… **Arguably better in every way than BFP was!**"*
- **The single most useful quote**, `Kurachi` (2004): *"**bfp had less bugs but esf has more ways**… **bfp should have more PL and swoop**."* A player naming **swoop** as the missing piece.

**⚠ Was melee decisive? Substantially yes — but BFP's death is over-determined and I will not overclaim it.** The Funimation C&D stripped its DBZ identity and development stopped in 2002, while ESF kept shipping for years. I cannot cleanly separate "ESF's melee won" from "BFP quit and stopped being DBZ." Both are load-bearing. What *is* clear: when players compared the two **as games**, melee depth is the axis they named.

**The mechanical heart of the difference, stated precisely:** ESF's melee was an authored **juggle grammar** built on recovery windows plus a traversal move with duration — *"Melee your opponent to the ground or in the air, then **swoop and tele** towards them and complete another hit **before they have enough time to recover**"* — and players invented named 2–8-hit combos from it. BFP's melee was **hold a key while your crosshair is on them, with an instant teleport as the gap-closer**. One produces a skill ceiling and a culture; the other produces a DPS check.

### UltraBFP — content revival, not a mechanics fix
https://www.moddb.com/mods/ultra-bid-for-power. One person, since **end of 2021**. Single release: **Beta 3, 8 Dec 2023**, 3.47 GB.

Self-described: Story Mode with cinematics · new maps · **manually-triggered, bindable transformations** with a **normal/fast speed choice** · **a dragon-ball collection and wish objective loop (one ball per 2 kills)** · **+150 characters** · full Latin audio · new menu and bot-selection.

**⚠ It does not claim to fix melee, the camera, aim, or balance.** The changelog is entirely content and presentation. The only mechanically meaningful changes are the transformation control (BFP's fired automatically at 1M PL; UltraBFP makes it a player decision, story-gated) and the wish loop.
⚠ **Do not assert an engine base** — no source states UltraBFP's (that detail belongs to *English Bid for Power Final*, a different fork). ⚠ A **UltraBFP 1.0** (May 2025) appears on YouTube only; ModDB still shows Beta 3 — **unverified**.

## 7.12 ⚠ What I could NOT confirm about BFP

- **Whether the replica's numeric constants match original BFP.** Cvar *names* are highly credible; *numbers* are a reconstruction, and the repo explicitly flags physics, `kiCharge`, `boostCost` and `blockCost` as divergent.
- **Original BFP's block cost formula** — replica author: *"the formula remains unknown."* Canon (damage→ki) and replica (flat immunity + fixed drain) are **different mechanics**.
- **Original fly-tilt magnitude** — demo dump says ±80°, replica does ±20°.
- **Whether Ultimate Tier invulnerability was in original BFP.** No canon support.
- **The tier→attack-availability enforcement mechanism** — in canon, absent from the replica's spawn code.
- **Release dates** for 1.0 / 1.1 / 1.2 (§7.1).
- **UltraBFP's engine base, and whether 1.0 exists.**
- **Melee hitbox geometry and dive speed** — never documented; the only figure is the retune *"decreased melee dive range from 2000 to 700."*
- Two canon-internal conflicts: **block duration** (2 s vs 1–2 s), and the **beam-vs-projectile collision rule** (the site says a beam destroys any attack it touches; the manual carves out disks and the death ball).
- Manual vs code on the **stun-escape window** (1 s vs ~100 ms) and on **boost adding melee knockback** (manual claims it; code and journal say it was removed).

---

# 8. WHAT MADE THEM FEEL GOOD, AND THE KNOWN COMPLAINTS

## 8.1 What felt good

**The approach game.** The genuine, repeatedly-evidenced pleasure of ESF is manoeuvring — curving a swoop to beat a guard, dropping out of flight to make someone undershoot, reading a swoop by ear and teleporting above it, chain-swooping to a side angle. The team named this themselves: **"Melee is more about out maneuvering opponents than just mashing buttons."** Everything players brag about in the technique threads is positioning, not execution.

**Combos as personal expression.** The 1.1-era combo culture is striking. Players invented, named and guarded techniques ("the cork screw"), refused to share them ("figure them out yr self no one is going to give there secrets"), and treated a clean 5-hitter as a trophy. One tutorial author: *"Thats why I like melee, its a system that is **open for me to make up my own combos and attacks**."* The mechanics did not enumerate combos — the physics permitted them, and players discovered them. That is the highest compliment a system of this kind can earn.

**Earned mastery with a visible skill gap.** "Mastering the combinations of these techniques is the key to being able to manhandle an entire server with minimal effort." Players could *see* someone better than them and identify exactly which technique they lacked.

**Speed and commitment.** "1.1 was one hell of a fast paced game, if you had the skill of course. I know that me and lynx had some pretty intense battles wich made us sweat buckets of water."

**Losing was still fun (in 1.0/1.1).** The most instructive positive quote in the whole corpus:
> "In the previous versions, **if you made a mistake you got knocked all over the place, perhaps not n00b friendly, but it was fun even if you lost.** You actually had the feeling you were "stronger" than the other if you had beaten him over and over."

**The escalation fantasy.** Power level visibly climbing, the scouter reading an opponent's number, the CF meter filling, the transformation ceremony, the aura, PL growth mid-match, "It's over 900000000" as a news headline. The fiction and the progression were the same system.

**Legible, generous feedback.** Auras for turbo and power-up, afterimages on teleport, dust trails, motion blur, locational audio, the red/blue struggle meter, diamonds over heads, per-character unique animations. You could always read the state of a fight.

**Melee that resists mashing — cited as a virtue, repeatedly.** *"This is one of the games which just **doesn't work mashing buttons**."* · *"While the melee in ESF 1.2.3 is a bit wierd at first… it comes really fun **when you get used to it**."* (https://www.kanzenshuu.com/forum/viewtopic.php?f=11&t=25726). Note this is praise for the *simple* melee's demands, from players who had to climb a learning curve to find it.

**Sound as information.** Players read the **swoop noise** as a tell and played off it: *"they usually react to swooping noises and immediately teleport away. If you teleport near them and they don't hear a swoop, **they may hesitate**, especially if they are low on Ki."* (⚠ recovered as a search result from https://forum.esforces.com/threads/esf-tutorial-for-the-new-players.75830/, not verified on-page.) Independently corroborated by the blind-fight thread in §6.3. **Audio was a genuine second sense, and a mind-game layer sat on top of it.**

**"I can't believe this is GoldSrc."** A flavour of enthusiasm in its own right, and it drew real press: PC Gamer ran "unbelievable visuals, unbelievable muscles" (Jan 2013, https://www.pcgamer.com/earths-special-forces-mod/) and TechSpot covered it in Jan 2018.

**Small-server intimacy over deathmatch chaos** — a texture point for mode design. Best experiences were reported on *"smaller servers preferably 4 maybe 6 players, where people actually communicate"*; worst on big servers where *"every time you fight someone someone else kamehame's you."* Compare the "protect the duel from the crowd" rule in §4.2 — ESF partly solved by mechanics what players otherwise solved by playing on small servers.

⚠ **Two things to keep in proportion.** (a) **Scarcity flattered ESF**: *"There weren't many ways to get your Dragon Ball video game fix in the US before Legacy of Goku dropped."* Some players thought the later official Sparking titles *"just looked like a more professional version"* of what ESF attempted. (b) **The developers themselves called it hard** — the About page closes *"ESF is a difficult game to master so newbies beware"*, which is charming and is also the reason §8.2's onboarding complaint exists.

**A useful genre framing from the community, on the successor ZEQ2-Lite:** *"ZEQ2-Lite feels more like a **fighting game**, where **ESF feels more like a 3rd person shooter**."* (⚠ search-derived, https://forum.esforces.com/threads/zeq2-lite.154673/). That is a sharp articulation of what ESF actually is: aim, positioning, projectiles and traversal — with fists as one weapon among several, not a fighting-game move list.

## 8.2 The complaints

**⚠ Attribution note:** these are drawn largely from forum argument, where the loudest posters are not the median player. Where something is clearly one person's grievance I say so; where the *developers* eventually acted on it, that is much stronger evidence and I flag it.

### Advanced melee — the central controversy
**Strongest evidence: the developers removed it.** Their stated realisations were that players enjoy *simple* melee and that melee should be about out-manoeuvring "rather than just mashing buttons" (§1.11). That is close to an admission.

The substance of the player complaint, articulated best by a 1.0-era veteran:
> "most of the veterans prefer speed and "skill" over advanced melee. Wich is just, **dodge the arrows. At that point I don't feel like im actually doing something, wow im pressing directional keys, how exciting.** … Pulling of a 3 to 6 hit combo is **much better looking than a few dodges and girly hits**."

And the pacing objection — that it stops the fight:
> "now, **you have to wait because someone is pressing arrows again** so you put a beam in his mouth the second he get's out, wow that's skill."

Two further specifics: **you cannot escape the prepunch** ("You can not break free from the 12 pre-punch hits"), and it is **slow** — "adv melee is just too slow for a lot of peoples taste when they had 1.0 and 1.1", "Adv melee has too many risks to use … It still not worth it when you got a big blast waiting for you."

**The most damning practical verdict is that players simply didn't use it.** Even after 1.2.1 buffed it: "**basic melee is still a lot better [than] adv. melee.**" A system that is optional, elaborate and dominated by the simple alternative is a system that failed.

**In fairness, it had defenders**, and the opposing case is not weak:
> "in 1.2 there is a wider variety of "tactics" … [1.0/1.1] was a **friggin aimbot melee system** … It was pure swoop, tele, charge, swoop, tele, charge, on and on. I'm looking for the skill."

**And Grega's own design test, which is the sharpest sentence in the whole argument and the one to hold a clinch system to:**
> *"if advanced melee is **the same as simple melee with an animation sequence** then **its pointless to have it in**."*
> — https://forum.esforces.com/threads/advanced-melee-3-stage-attack-concept.68981/

**There was also a symmetrical complaint pointing the other way, and it matters.** Some players thought *simple* melee was the unfair one, precisely because chained hits left you helpless — Rocky, 2008: *"what annoys most new players is the **inability to do anything when being smashed around by chained basic melee hits**"*, arguing every move needs a counter or interrupt. Grega agreed in the same thread: *"simple melee allso needs to be edited to make it harder to pull off multiple hits or maby even the posibility to **block the hits while you are in blowback mode**."* So the design problem was never "minigame vs no minigame" — it was **"the defender needs a verb,"** and neither system fully delivered one.

### ★ ⚠ THE "DANCE DANCE REVOLUTION" COMPARISON IS A DESCRIPTION, NOT A CRITICISM
This is a trap and it is worth flagging because it inverts the meaning of the evidence. The phrase comes from a **widely-copied mod blurb**, and the person who posted it into the guru3D forums was **a fan**:
> *"In this mode, the player enters in a series of directional attacks which then appear on the opponents screen. The opponent must then enter the same directions or he will be hit. **Advanced melee is similar to DDR.**"*
> — quoted by Mkilbride, 7 Sep 2010, https://forums.guru3d.com/threads/earths-special-forces.328469/ — who immediately adds: *"Really, it has some of the best combat in any game I've played."*

The blurb was quoted rather than authored there, so **its original author is undetermined** (the phrasing tracks the old ModDB/Wikipedia descriptions). The framing circulated neutrally — a Kanzenshuu poster in 2023 also refers to ESF's *"Dance Dance Revolution-like combo system"* descriptively. **Do not attribute "it's DDR" to the critics.** The actual critics' phrasing was *"dodge the arrows… wow im pressing directional keys."* Same objection, different provenance.

### ⚠ RESOLVED: `mp_simplemelee` existed, but it was a leaky switch — and there was no simple-melee-only scene
The cvar was designed as exactly this toggle *before 1.2 shipped* — Majin_You, May 2003: *"Actually, Yes. There is going to be a toggle. However, **once you start your server with one form of melee, you'd have to recreate it in order to switch**."* But in practice it did more than advertised:
> **Grega:** *"mp_simplemeele 1 in to the console does that trick. No need for AMXX."* → **hleV:** *"You obviously never tried that CVAR. **It screws up basic melee bad.**"* → **Grega:** *"It increases the blowback to about **half of what it was in 1.1**."* → **hleV:** *"The OP was asking for a solution to remove advanced melee, **not alter basic melee**."*
> — https://forum.esforces.com/threads/esf-1-2-3-block-advance-melee-and-throw.156076/ (2013)

So it disabled advanced melee **but also changed basic melee's knockback**, which is why an admin in 2013 was writing an AMX Mod X plugin instead. And by then the demand had faded — Grega: *"i guess the idea of a 1.1 mode for 1.2 is a bit old to the players nowadays."*
**⚠ I still could not confirm `mp_simplemelee`'s default value** (my 1.2 manual list shows `0`; the other recovered cvar dump is 1.1-era and predates the cvar). **And I found no evidence of a simple-melee-only server *community*** — the discussion is always individual admins, never a scene.

### Turtling — the 1.1 problem that advanced melee was partly meant to solve
Worth recording because it is the failure mode on the *other* side of the design, and it predates advanced melee:
> **GMan**, 20 May 2003: *"One of the things I like the most about the melee in ESF was the fast pace and randomness… Now, all anyone does is **hang back and wait for the other guy to attack**… when you've got two expert players fighting, it's become almost depressing. It's not even fun to watch, it's just **weird globs of elbows and white recharge animation**."*
> — https://forum.esforces.com/threads/melee-isnt-fun-anymore.130501/

That is what happens when clashes are decided by **remaining resource** (1.1 head-ons went to whoever had more ki): both players hoard, nobody commits. **A resource-decided clash creates turtling as surely as a mash-decided one creates spam.** 1.2's symmetrical "both get knocked back" is the fix.

### Netcode determinism — the complaint I'd underweighted
Not just latency, but *configuration* deciding fights:
> *"it gives exploiters also new advantages with this client prediction crap… Melee becomes more of a '**the one with the better FPS and CL_Updaterate settings, wins!**' stuff."* — GoldSaiyan, same thread.

Combined with 1.0's head-ons being **literally won by the lower-ping player**, the lesson is that in a game this fast, **any clash resolved by a race is really resolved by the network.** Resolve clashes by symmetric outcome or by a visible, committed resource — never by who registered first.

### Speed regression in 1.2
A consistent veteran complaint: "**the biggest problem in 1.2.x is speed.** 1.1 was one hell of a fast paced game … I have yet to experience that in 1.2." The counter-argument from a moderator: "Slower isn't always horrible. The speeds are fine once you get used to them, it's just easier to hit each other."

### The two-hit ceiling
Directly caused by the 1.2 aerial-combo cap: "**now you can do 2 hits max and thats it, then you can spam kiblasts.**" The expressive combo game of 1.0/1.1 was legislated away to make chaining fair. **ESF:F reversed this** (§1.5) — the clearest case in the whole history of the team conceding a mistake.

### "Beam spammer" vs "melee whore"
The permanent factional argument. Beam users accused of spamming from range; melee users accused of "whoring" the two-hit-plus-ki-blast loop. Both accusations were partly true, and the 1.2.1 patch notes read as an attempt to referee it. A third position appeared regularly and is probably correct: "u guys should stop b****in about BEAM SPAMMERS, MELEE WHORES.. if you get caught into it, that's your fault."

### Beam jumping as an escape tool
"People use this as a escape to get away and beam spam some more." Nerfed by ki cost in 1.2.1; the team agreed the right fix was speed/radius.

### Boring power struggles
"**Long powerstruggles are boring (no skill and take speed out of the game).**" The 1.2 five-second auto-detonation is the team's answer.

### Netcode and ping
Structural, unfixable, and severe because of the speed multiplier (§1.1). 1.0 head-ons were literally **won by the lower-ping player**. Combo players cite ping as the limiter: "I've managed to pull off 2 and 3 hitters, but never 8 hitters, **due to ping issues**." Teleport-intercept was verifiably easier on LAN.

### Camera
Mild but real: 1.2.3's dynamic side-swinging camera was still being complained about in 2020, and ESF:F changed it (§2.4).

### Onboarding
A recurring theme is that ESF's melee is unteachable without the manual — a tutorial author wrote a guide specifically because *"a majority of the people who dislike the melee in the game are not using it properly"*, citing complaints like "dude melee sucks, you can't even get up" from players who never learned that holding primary fire recovers you. **A core mechanic that players cannot discover is a design bug, not a player bug** — and note it is the *recovery* input, the one that makes being hit interesting rather than miserable, that nobody found.

---

# 9. PRIORITISED LIST FOR IMPLEMENTATION

## MUST HAVE — load-bearing for the feel

1. **Put the skill in the APPROACH, not the strike.** Contact-triggered melee: get close, hold a button, it lands. Do not require per-punch aiming in a fast 3-D flight game — ESF's team proved it does not work and explained why (§1.1). *This is the single most important item in this document.*
2. **Committed, non-cancellable dash/swoop with decaying speed.** Double-tap to enter, hold to sustain, release to stop, auto-expiry, and a **slow tail that is a punish window**. Commitment is what reads as speed.
3. **A separate in-dash redirect that costs extra** (chain-swoop). Free gradual turning with the mouse, expensive instant redirects. This is the whole approach mini-game.
4. **Melee reach ≈ one character height.** Small, honest, proximity-based.
5. **Knockback → terrain impact → downed state, with a KI-PRICED RECOVERY.** Hold a button and spend to right yourself mid-air or kip up off the ground; no ki means you lie there (~1.5 s). *Being hit must be a question, not a punishment.*
6. **Teleport as a short, FIXED-distance, ki-priced blink that can chase a launched opponent.** Hold direction + press. Chainable ~3× in a burst. This is what turns single hits into combos and it is the beating heart of ESF melee (§1.4).
7. **Make it possible to chase your own knockback — and let hit strength govern whether you can.** A soft, standing hit launches slowly and stays catchable; a full-speed run-up launches too fast to follow. This trade-off emerged accidentally in ESF and is worth building deliberately.
8. **Escalating knockback per chained hit, NOT a hit cap.** ESF's best single balance lesson: 1.0 unlimited was broken, 1.2's hard 2-hit cap was hated, ESF:F's rising knockback per hit is right (§1.5).
9. **One resource for offence, movement AND defence, refilled by a stationary, visible, punishable channel.** This is what forces the pacing (§3.4). And make ki-zero genuinely helpless.
10. **Health that does not regenerate**, so the ki churn plays out over a closing window.
11. **Momentum-scaled melee damage and knockback** (speed × power difference), with caps — ESF:F's model, and the mechanical payoff for the whole approach game.
12. **Third-person by default**, with the character's state legible on the body (aura, transform, flight pose).
13. **Presentation-first speed**: small characters relative to the world, motion blur, dust trails, afterimages on the blink, locational audio for the incoming dash. Cheaper and more effective than raising velocities (§6.3).
14. **A cheap toggleable power state (turbo) separate from an earned permanent one (transform)**, both publicly visible.
15. **Directional guard that side/rear angles beat**, with a real post-block lockout (ESF: 0.8 s). This is what makes the angled approach meaningful.

**Added from the BFP comparison — these are must-haves because BFP shipped without them and it is exactly what killed its combat:**

16. **★ SOFT LOCK-ON / AIM ASSIST, plus an off-screen foe indicator.** BFP had a ~2780 u/s free-pitch flier, no aim assist, and a melee system gated on crosshair-tracking. The result is the most consistently reproduced complaint in this entire research: *"way too fast, i can't even see the guys flying around"* (2002) → *"so hard to aim since the bots keep zipping all around"* → *"have a lock on system would be better"* (**2024**, on the successor's own page). **Twenty-two years of the same complaint. In this genre, aim assistance is not a concession — it is the fix for the defining problem.**
17. **★ THE GAP-CLOSER MUST HAVE DURATION AND VULNERABILITY.** BFP's melee "dive" was an *instantaneous teleport* within 700 units — no travel, no commitment, nothing for the defender to read or intercept, and therefore no juggle game and no combo culture. ESF's swoop was a traversal move with a recovery window, and that single difference is what the community named when they said ESF was the better game. **If the approach is where the skill lives (item 1), the approach must take time.**
18. **★ PROTECT A TWO-PLAYER SET-PIECE FROM THIRD PARTIES BY RULE.** ESF made struggling players immune to melee and discs, cut third-party damage, and stopped explosions from shoving them out of position. A dramatic duel in a free-for-all is defenceless otherwise, and this is why the beam struggle is what people remember (§4.2).
19. **Resolve every clash symmetrically or by a visible committed resource — never by a race.** ESF 1.0 awarded head-ons to the *lower-ping player*; melee outcomes were said to go to *"the one with the better FPS and CL_Updaterate settings"*. Anything decided by who registered first is decided by the network.
20. **Give the defender a verb in every state.** The one complaint that appears on *both* sides of ESF's melee argument: the 12-hit prepunch could not be escaped, and chained basic melee left new players *"unable to do anything when being smashed around."* Even a verb that only makes the attack **expensive** (ESF's throw resist) is enough.

## NICE — flavour, real value, not structural

21. **Charge-past-minimum beams** with a marked minimum line, hold-at-max for a ki drain, **mouse-steerable after launch**, and manual early detonation.
22. **Beam/block struggle as a HOLD-and-spend contest** (never a mash), with a red/blue meter, turbo as a commitment lever, an escalating payload, terrain-crush for the loser, an aimable reflect for a won block struggle, and an anti-stall auto-detonation (~5 s). **Root both players for the duration** (BFP) — the drama is in the resource commitment, not the input rate.
23. **Attack classes with distinct defensive rules** — steerable beams, dumb blasts, unblockable discs, block-ignoring lasers, and blobs you detonate with another attack. Cheap variety, big tactical texture.
24. **Throw with a ki-burn resist** — the defender cannot escape, only make it expensive enough to fail. Better than a coin flip.
25. **Wall-stick on thrown bodies** (1–2 s, jump to escape early) and throwing people **into** other people.
26. **Charge interrupted by being hit**, losing the stored energy.
27. **Recoil movement** (beam-jump) as a mobility option — but tune its speed and radius, not its cost.
28. **Player-controllable camera zoom/orbit** on keys.
29. **A geometric reward for chain length that resets on recovery** (ESF:F: 1, 2, 4, 8 …), optionally spent on tiered specials.
30. **Grab-and-drag** (ESF:F Grab and Smash) — grab during a dash and fly them into terrain. High-spectacle, low-complexity.
31. **A scouter/read-their-power mechanic.** Makes the escalation fantasy legible.
32. **Transform time that shrinks to zero as you grow** — the ceremony is a vulnerability window your own progress removes.
33. **Per-character unique melee animations** and a distinct silhouette.
34. **Free-fall by cutting flight** ("dropping") as a cheap evasive that hard-counters dashes.
35. **★ Blocking that converts damage into ki rather than reducing it** (BFP's *canon* rule). Ki becomes a literal second health bar, "break their ki then hit them" becomes a real plan, and the rule is more legible than a damage multiplier. **The one idea BFP has that ESF does not.**
36. **★ Unrestricted pitch while flying — let players loop and fly upside down.** ESF's own staff wanted this from BFP for years, on the mechanical grounds that *"dogfighting would actually be far more interesting and complex"* and it *"would give Basic Melee that extra edge."* Costs one skipped clamp.
37. **★ Flight endurance as the progression curve.** BFP's flight cost and ki regen cross over at max power, so a new player gets ~35 seconds of sky and a maxed player gets it permanently — derived from one subtraction, and far more evocative than a stat bar. Pair it with a hard punishment for running dry mid-air (drop + stun + fall damage).
38. **Charge in discrete "dots" that each cost full price** (BFP: 6 points). Legible on the HUD, quotable in voice lines, and it makes a maxed attack a visible, expensive commitment.
39. **Momentum/drift on flight** so releasing input slides rather than stops.
40. **Attacks with real volume that collide with each other**, not just trajectories.

## AVOID — actively disliked, or removed by the developers

41. **A directional-input matching minigame in the middle of a fight.** ESF's advanced melee. Removed by its own creators, who concluded *"we knew the old advanced melee system was no good, so it got thrown out."* It stops the fight, reads as *"pressing arrows"* rather than fighting, and players preferred the simpler option anyway. *If you want depth in the clinch, put it in positioning and resource commitment, not in a QTE.*
42. **A special melee mode that is only the basic one plus an animation.** Grega's own test: *"if advanced melee is the same as simple melee with an animation sequence then its pointless to have it in."* The elaborate system went unused because *"basic melee is still a lot better."*
43. **Inescapable auto-sequences.** The 12-hit prepunch with no break-out was the single most resented mechanic. Always give the defender a verb — even if, like the throw resist, it can only make the attack expensive rather than fail.
44. **Hard caps on combo length.** Use escalating cost/knockback instead (item 8).
45. **A hold-to-win struggle with no time limit.** Long power struggles were called boring and *"take speed out of the game"*. Force resolution.
46. **Resolving a clash by ping, framerate, or netcode settings.** ESF 1.0 literally awarded head-ons to the lower-ping player, and players said melee came down to *"the one with the better FPS and CL_Updaterate settings."*
47. **Resolving a clash purely by who has more resource left.** ESF 1.1 gave head-ons to whoever had more ki, and it produced turtling: *"all anyone does is hang back and wait for the other guy to attack… weird globs of elbows and white recharge animation."*
48. **A dynamic camera that swings the character across the frame** during fast movement. Complained about for over 15 years and changed in ESF:F.
49. **Forcing a different camera mode to hide a camera problem.** ESF's 1.2.1 notes say the quiet part out loud: *"Firstperson is now forced during melee battles, **so the screen doesn't fuck up**."* Design the set-piece camera; don't cut away from it.
50. **Over-the-shoulder offsets in a 360° threat environment** — they cost real peripheral vision on one side (§2.3). Related: BFP shipped **two crosshair modes** because an off-model camera cannot have one that is both truthful and stable. Decide this once, deliberately.
51. **Slowing the game down to make hits easier to land.** The 1.2 speed reduction is the most consistent veteran grievance. Solve accuracy with contact-triggered melee, generous hit detection and aim assist (item 16) — not by reducing speed.
52. **Nerfing an escape tool by cost when the problem is its speed/range.** The beam-jump lesson; the team said as much.
53. **Making a core defensive mechanic undiscoverable.** Players hated ESF melee mostly because nobody told them the recovery input existed (§8.2).
54. **A single dominant bread-and-butter loop.** *"everyone and their mother hits you twice with it"* — two basic hits plus a ki blast became the entire game. Watch for the equivalent.
55. **A transformation that is only a costume on a threshold.** BFP's canon is explicit: *"other than the benefits from increased power level, there is no additional benefit of the transformation."* ESF's, by contrast, is a discrete multiplier with its own ki tax and a forced descent — a mechanic, not a skin.
56. **An attack that scales past the health bar.** BFP's fully-charged Ultimate Blast computes to **1001 damage against a 1000-HP maximum** — a guaranteed one-shot at max power. Cap top-end damage against max health explicitly.
57. **Outsourcing balance to config files.** BFP let server groups rewrite the weapon table; the dev's own words: *"BFP has been heavily modified by several different groups using the scripting system, so you may run into compatibility issues."* It fragmented the playerbase.
58. **Framerate- or frame-dependent physics and costs.** BFP: *"Flight speed was highly dependent on FPS… Ki boost cost was highly dependent on FPS since build 1."*

---

# APPENDIX A — CVAR REFERENCE

Two sources. **Column 1 = documented defaults** from the official 1.2 manual's CVAR List. **Column 2 = a live `cvarlist` dump from one 1.2.3-era server** (https://forum.esforces.com/threads/console-commands.111788/) — that server's operator may have changed values, so **differences are not automatically version changes.**

## Advanced melee (`am_*`), server-side

| CVAR | 1.2 manual default | 1.2.3 server dump | My reading (⚠ inferred — the manual gives no descriptions) |
|---|---|---|---|
| `am_maxextanges` | 4 | 4 | Max exchanges per advanced-melee battle (name misspelled in source; = "maxexchanges") |
| `am_minrange` | 0.300 | 0.300 | Range band — minimum |
| `am_weakrange` | 0.500 | 0.500 | Range multiplier, weak attack |
| `am_mediumrange` | 0.900 | 0.900 | Range multiplier, medium attack |
| `am_strongrange` | 1.350 | 1.350 | Range multiplier, strong attack |
| `am_percentblocked` | 0.750 | 0.750 | Feeds the retaliation `blocked/total` formula |
| `am_prepunch_delay` | 0.200 | 0.200 | Seconds between prepunch hits |
| `am_prepunch_delaystruggle` | 0.100 | 0.100 | Prepunch cadence while struggling |
| `am_prepunch_driftspeed` | 280 | 280 | Speed the locked pair drifts during prepunch (u/s) |
| `am_prepunch_max` | **12** | **12** | Max prepunch hits — matches the manual's "Twelve (12)" |
| `am_prepunch_maxstun` | **6** | **6** | Hit count at which stun time peaks — matches "Six (6)" |
| `am_prepunch_stunperpunch` | **0.750** | **0.750** | Seconds of stun per hit → 6 × 0.75 = **4.5 s peak combo time** |
| `am_prepunch_mincombo` | 3 | 3 | Minimum prepunches before a combo can start |
| `am_struggle_arrowtime` | 0.500 | 0.500 | Seconds per arrow |
| `am_struggle_maxarrows` | 6 | 6 | Max arrows in a stream |
| `am_struggle_startdelay` | **0.750** | **1.250** | ⚠ **A real discrepancy.** Either a 1.2→1.2.3 change or a server setting |
| `am_struggle_enddelay` | 1.500 | 1.500 | Post-struggle delay |
| `am_struggle_maxextanges` | 2 | 2 | Max exchanges in a struggle |
| `am_swoop_minstrugtime` | *absent* | 0.350 | ⚠ Not in the 1.2 manual — likely added later |
| `am_wallstick_canstick` | 1 | 1 | Thrown bodies stick to walls |
| `am_wallstick_mintime` | 1 | 1 | Min wall-stick seconds |
| `am_wallstick_maxtime` | 2 | 2 | Max wall-stick seconds |
| `am_skill` | *absent* | 2 *(seen in a manual quote in one thread)* | ⚠ Unexplained |

## Gameplay (`mp_*`), server-side

| CVAR | Manual | Dump | Meaning |
|---|---|---|---|
| `mp_melee` | 1 | 1 | Melee enabled |
| `mp_simplemelee` | 0 | 0 | ⚠ Force simple-melee-only (my reading) |
| `mp_nomeleehittime` | 1 | 1 | Post-hit window (s) during which melee can't reconnect. ⚠ Likely the 2-hit aerial-combo governor. One community reading: set high, it "may invalidate melee for that many seconds after the last hit" |
| `mp_laydowntime` | 1.500 | 1.500 | Seconds spent lying on the ground |
| `mp_multipleps` | **0** | **1** | Multiple simultaneous power struggles |
| `mp_plcatchup` | 1 | 1 | Power-level catch-up for weaker players. 1.2 tweak: "Powerlevel shouldn't catchup when you kill yourself" |
| `mp_spawn_invulnerable_time` | 4 | 4 | Spawn protection (s) |
| `mp_allowsensubeans` | 1 | 1 | Senzu bean pickups |
| `mp_dbrespawntime` | 25 | 25 | Dragonball respawn (s) |
| `mp_characterlimit` | 1 | 0 | Per-character player cap |
| `mp_gamemode` | 0 | 1 | 0/1/2 = DM / TDM / Capture the Dragonballs |
| `mp_realteams` · `mp_ceasefire` · `mp_lockmodels` · `mp_allowspectator` · `mp_wishlimit` | — | — | Match options |

## Client / presentation

`cl_forwardspeed : 216` · `cl_backspeed : 180` · `cl_sidespeed : 180` · `cl_upspeed : 320` · **`cl_motionblur : 1`** · `cl_aurabend : 1` · `cl_dusttrails : 1` · `cl_dusttrailslbl : 100` · `cl_drawdiamonds : 1` · `cl_smoothflyinganim : 1` · `cl_explosionsmoke : 1` · `cl_beamquality` · `cl_fxquality` · `cl_chasedist : 112` · `cam_xoffset : 0` · `cam_yoffset : 0` · `cam_zoffset : 10` · `default_fov : 90` · `sv_gravity : 800` · `sv_maxspeed : 5000` · `sv_maxvelocity : 5000`

---

# APPENDIX B — CHARACTER STATISTICS (ESF 1.1)

From the GameFAQs 1.1 FAQ by T.U.I. Health/speed are game units; PL is the Dragon Ball "power level" fiction used as a real stat.

| Character | Start PL | HP | Speed | Transformation | Req. PL | Perfect-transform PL | PL × | HP′ | Speed′ |
|---|---|---|---|---|---|---|---|---|---|
| Goku | 750,000 | 110 | 216 | Super Saiyan | 1,750,000 | 5,000,000 | 2 | 120 | 280 |
| Gohan | 600,000 | 100 | 180 | Super Saiyan | 1,000,000 | 3,500,000 | 2 | 120 | 280 |
| Krillin | 600,000 | 100 | 180 | Mystic Krillin | 3,000,000 | 8,000,000 | 2 | 150 | **350** |
| Piccolo | 650,000 | 120 | 180 | Powered-Up Piccolo | 1,650,000 | 3,975,000 | 1.5 | 140 | 250 |
| Trunks | 650,000 | 110 | 180 | Super Saiyan | 1,000,000 | 3,000,000 | 2 | 130 | 250 |
| Vegeta | 700,000 | 110 | 216 | Super Saiyan | 2,000,000 | 5,000,000 | 2 | 120 | 280 |
| Frieza | 800,000 | 150 | 180 | *(unnamed)* | 1,800,000 | 2,500,000 | 1.5 | 170 | 275 |
| Cell | 900,000 | 120 | 220 | Semi-Perfect Cell | 1,900,000 | *none* | 1.5 | 140 | 290 |
| Majin Buu | 1,500,000 * | 160 | 220 | Evil Buu | 3,000,000 | *none* | 1.5 | 180 | 320 |

\* printed "1,500,00" in the source — a typo; 1,500,000 assumed.
Cell and Buu have **no perfect transform** and their transformation is **permanent** — they respawn transformed.

**Shape of the design:** HP spans 100–160 (1.6×), speed 180–220 (1.22×), start PL 600k–1.5M (2.5×). **Transformation is chiefly a speed upgrade** (+55% to +94%) with modest health gains, and damage riding the PL multiplier. Note Krillin — the weakest starting character has the **highest transformed speed (350)** and the **hardest transform requirement (3M)**: a genuine late-blooming payoff curve.

---

# APPENDIX C — CONTROLS

Two versions, because several binds moved. **⚠ Power Up moved from `E` (1.1) to `R` (1.2) — do not mix these tables.**

| Action | 1.1 (FAQ) | 1.2 (manual) |
|---|---|---|
| Move | W / S / A / D | W / S / A / D |
| Jump & rise | SPACE | SPACE |
| Toggle fly | **F** | **F** |
| Teleport | **G** | **G** |
| Turbo | **T** | **T** |
| Block | **Q** | **Q** |
| Power up (charge ki) | **E** | **R** |
| Ascend / transform | **Z** | **Z** |
| Descend | **X** | **X** |
| Select attack | 1–9, mouse wheel | number keys, mouse wheel |
| Basic melee | RMB (held during swoop) | RMB (held during swoop) |
| Fire / charge / struggle / recover | LMB | LMB |
| Camera reset / zoom in / out / rotate L / R | — | **Home / I / K / J / L** |
| Toggle 1st/3rd person | **F4** | — |
| Scouter | **F9** | **F9** |
| Move up / down (1.1 discrete binds) | `'` / `/` | — |

**ESF:F rebinds melee:** Simple Melee → **LMB**, Combo Melee → **RMB**, Quick Throw → **LMB+RMB**, Grab and Smash → **LMB+RMB + turbo**, Bonus → **C**.

Popular player rebinds (teleport is pressed constantly and `G` is awkward): teleport→`F` with fly→`G`; teleport→`R`, fly→`C`; teleport onto a side mouse button. **Signal: teleport wants to be under a resting finger or a thumb button.**

---

# APPENDIX D — SOURCES

**Official / primary**
- ESF beta 1.2 official manual (archived): http://web.archive.org/web/20040803230525/http://www.esforces.com:80/team/Manual/right.htm — nav frame: http://web.archive.org/web/20040803225353/http://www.esforces.com:80/team/Manual/left.htm
- ESF official site: https://esforces.com/ · https://esforces.com/about
- *ESF – New Melee System Overview* (Skyrider, 19 Jan 2010): http://web.archive.org/web/20100124045858/http://esforces.com:80/news/34/51/ESF---New-Melee-System-Overview-video.html
- *Simple Melee Update* (Grega, 8 Mar 2010): http://web.archive.org/web/20100322210449/http://esforces.com:80/news/36/51/Simple-Melee-Update.html
- *Mystery Map, Melee System Reaveled* (9 Feb 2009): http://web.archive.org/web/20090923144248/http://esforces.com:80/news/4/51/Mystery-Map-Melee-System-Reaveled.html
- *Throwing Tutorial Preview Video* (14 Apr 2010): http://web.archive.org/web/2011/http://esforces.com/news/39/51/Throwing-Tutorial-Preview-Video.html
- ESF 1.1 Full FAQ by T.U.I. (mislabelled "Final"): https://gamefaqs.gamespot.com/pc/919086-earths-special-forces-final/faqs/26239

**Forum threads (dated)**
- Console commands / `cvarlist` dump (May 2004): https://forum.esforces.com/threads/console-commands.111788/
- SaiyanPrideXIX's Basic Melee Tutorial (May 2003): https://forum.esforces.com/threads/saiyanpridexixs-basic-melee-tutorial.131874/
- Melee Combo's Tutorial (Jul 2003): https://forum.esforces.com/threads/melee-combos-tutorial.126079/
- Esf 1.21 tweaks and reasons? (Jul 2004): https://forum.esforces.com/threads/esf-1-21-tweaks-and-reasons.108949/
- Angleing (Apr 2005): https://forum.esforces.com/threads/angleing.101651/
- Teleport while swooping (Jun 2004): https://forum.esforces.com/threads/teleport-while-swooping.111250/
- Teleporting (2005–08): https://forum.esforces.com/threads/teleporting.108386/
- Please help! Lots of questions (2005): https://forum.esforces.com/threads/please-help-lots-of-questions.98620/
- Why this melee won't work (Sept 2008): https://forum.esforces.com/threads/why-this-melee-wont-work.71866/
- basic melee combos (Aug 2005): https://forum.esforces.com/threads/basic-melee-combos.98431/
- BasicMelee – Special Maneuver (Feb 2008): https://forum.esforces.com/threads/basicmelee-special-maneuver.69320/
- 1.3's Swoop (Mar 2007): https://forum.esforces.com/threads/1-3s-swoop.66434/
- The Advanced Melee Animations (Apr 2004): https://forum.esforces.com/threads/the-advanced-melee-animations.114847/
- ESF Camera (Apr 2010): https://forum.esforces.com/threads/esf-camera.77478/
- Camera (May 2020): https://forum.esforces.com/threads/camera.158783/
- An invisible fight (Oct 2006): https://forum.esforces.com/threads/an-invisible-fight.89369/
- Charging Attacks — *suggestion thread, not documentation* (Jan 2003): https://forum.esforces.com/threads/charging-attacks.139589/
- melee tips and tricks (Nov 2002): https://forum.esforces.com/threads/melee-tips-and-tricks.142853/
- ESF Full Command/CVar List (2003): https://forum.esforces.com/threads/esf-full-command-cvar-list.130044/

**ESF — additional (second research pass)**
- ESF 1.2.1 official changelog + news archive: https://web.archive.org/web/20040803105048/http://esforces.com:80/?p=news_archive — **the source of the forced-first-person camera finding**
- Beta 1.1 release + feature list, 17 May 2003: https://web.archive.org/web/20030523163009/http://www.esforces.com/
- Beta 1.0 release party / Alpha 2.0 anniversary: https://web.archive.org/web/20021127104744/http://www.esforces.com/ · https://web.archive.org/web/20021122184228/http://www.esforces.com/
- Official download page (states the Open Beta = Beta 1.3 and was **cancelled**): https://esforces.com/download
- ESF Open Beta Melee — Grega on why advanced melee was thrown out: https://forum.esforces.com/threads/esf-open-beta-melee.154546/
- Teleport delay or no teleport delay (the unanimous dev ruling): https://forum.esforces.com/threads/teleport-delay-or-no-teleport-delay.108704/
- Destructible Terrain? (team confirms there was none): https://forum.esforces.com/threads/destructible-terrain.144006/
- Melee isn't fun anymore (the 1.1 turtling complaint): https://forum.esforces.com/threads/melee-isnt-fun-anymore.130501/
- Beta 1.2.2/1.2.3 released, 15 Dec 2004: https://forum.esforces.com/threads/beta-1-2-2-1-2-3-released.104017/
- 1.2 melee pre-announcement: https://forum.esforces.com/threads/1-2-meelee-upate.130297/ · https://forum.esforces.com/threads/whats-the-diffrence.130299/
- Beam Spammers?: https://forum.esforces.com/threads/beam-spammers.91244/
- Your best/worst ESF experience: https://forum.esforces.com/threads/your-best-worst-esf-experience.137188/
- ESF forum thread on BFP (staff wanting upside-down flight): https://forum.esforces.com/threads/dbz-bid-for-power.70548/
- guru3D ESF thread (the "DDR" blurb, quoted by a fan): https://forums.guru3d.com/threads/earths-special-forces.328469/
- Press: https://www.pcgamer.com/earths-special-forces-mod/ · https://www.techspot.com/news/72835-earth-special-forces-mod-turns-half-life-dragon.html
- Retrospectives: https://www.kanzenshuu.com/forum/viewtopic.php?f=11&t=27897 · https://www.kanzenshuu.com/forum/viewtopic.php?f=11&t=25726 · https://www.kanzenshuu.com/forum/viewtopic.php?t=48314
- Community content packs (the transformation ladder people remember): https://videogamemods.com/earthsspecialforces/mods/ecx-rc3-super-pack/
- Wikipedia has **no ESF article** — the title is a redirect into https://en.wikipedia.org/wiki/List_of_GoldSrc_mods. A fuller article existed until Dec 2014 and is preserved at https://en.wikipedia.org/w/index.php?oldid=614846690 — it carried `original research` and `no footnotes` tags, so it is corroboration only.

**Bid For Power**
- **Official site, still live:** http://www.goldenhammersoftware.com/bidforpower/about.html — **Tier A canon**
- **https://github.com/LegendaryGuard/BFP** — source replica; the origin of nearly every BFP constant in §7. *"The original source code appears to be lost."* Includes `docs/Guide.md` (the manual), `docs/bfp_networking.md` (derived from real demo files), `docs/bfp_weapon_config_file.md`, and `cfgs/bfp_weapon.cfg` / `bfp_attacksets.cfg` / `bfp_server.cfg`
- 8 archived developer journals, 1998–2002 — **Tier A** for design intent
- https://www.moddb.com/mods/bid-for-power · https://www.moddb.com/mods/ultra-bid-for-power
- https://openarena.fandom.com/wiki/ModCompat/Bid_For_Power (states 1.2 is the final version; 2.0+ is a third-party fork)
- https://www.giantbomb.com/bid-for-power/3030-33356/
- https://forums.anandtech.com/threads/bid-for-power-released.707420/ — launch-day "too fast to see" complaint
- r/gaming BFP retrospective thread (2023) — the "hard to aim" complaint and the ESF recommendation
- ESF-forum comparison threads: https://forum.esforces.com/threads/has-anyone-tried-bid-for-power-q3-mod.126115/ · https://forum.esforces.com/threads/bfp-bid-for-power.105954/

**Other**
- https://gamebanana.com/mods/37847 (ESF 1.2.3 stable)
- ⚠ **`https://www.moddb.com/mods/special-forces1` IS NOT ESF.** It is an unrelated military mod that merely *mirrors* three ESF Open Beta files. ESF's real ModDB entry is https://www.moddb.com/mods/earths-special-forces. Both are 403 to plain fetchers.

---

## SUMMARY OF WHAT I COULD NOT ESTABLISH

Listed plainly so nothing here is mistaken for a complete answer.

**ESF**
1. **Any numeric ki cost, for anything.** No source publishes them. (BFP's are known — §7.3 — but they are a different game on a different engine and must not be borrowed as ESF figures.)
2. **Camera behaviour during a swoop, or during a beam struggle.** §2.6. What *is* now confirmed: third-person default, key-driven zoom/orbit, motion blur, a dynamic side-shift in 1.2.3 that ESF:F removed, and — the one hard answer — **first person is force-enabled during an advanced melee battle** (§2.5). Swoop and beam-struggle framing remain undocumented.
3. **What the camera does when you are launched.** One unverified lead says the camera zooms out when hit and in when teleporting. Worth chasing; not a fact yet. Note that a dedicated search found **no** camera-disorientation complaints, so this may simply never have been a problem.
4. **Whether ESF ever had a lock-on *camera*.** 1.1 had a lock-on *targeting* mechanic with a red box; no source connects it to camera framing.
5. **The `am_*range` band semantics** (0.300 / 0.500 / 0.900 / 1.350).
6. **Teleport delay duration.** Its *existence, rationale and permanence* are now well sourced (§1.4); the number is not. No source mentions i-frames — evasion appears purely positional in both games.
7. **Whether the 3-teleport burst limit is coded or merely where ki runs out.**
8. **`mp_simplemelee`'s default value**, and the exact 1.2 vs 1.2.3 values for `am_struggle_startdelay` (0.750 vs 1.250) and `mp_nomeleehittime` (1 vs a 2 seen in a 1.1-era dump).
9. **Any published spec for the ESF: Final melee system** beyond the two 2010 dev articles. If one exists it is likely Discord-only.
10. **Reddit as a source was inaccessible by every route tried** — so the enthusiast/retrospective sampling in §8.1 leans on forums, Kanzenshuu and press, and under-represents whatever the Reddit consensus is.

**BFP** — now substantially answered via the source replica; the residue is in §7.12. The important ones:
11. **Whether the replica's numbers match original BFP.** Names credible, numbers reconstructed; physics, `kiCharge`, `boostCost`, `blockCost` explicitly divergent.
12. **Original BFP's block formula** — canon (damage→ki) and replica (flat immunity + fixed drain) are different mechanics, and the replica's author says the real one is unknown.
13. **BFP's release dates** (1.0/1.1/1.2 — sources conflict by two years), and **UltraBFP's engine base and whether a 1.0 exists.**

**Cross-cutting**
14. **I could not cleanly separate "ESF's melee won" from "BFP quit and lost its DBZ licence."** Both are load-bearing in BFP's decline. The defensible claim is narrower: when players compared the two *as games*, melee depth is the axis they named.
