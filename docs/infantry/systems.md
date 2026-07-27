# INFANTRY ONLINE — EVERYTHING ELSE

Scope: this file is the *surrounding game* — history, economy, progression, social structure, the
zone/server model, the tools, the UI, and the honest post-mortem. Maps, weapons and combat are in
`maps.md`, `weapons.md` and `combat.md` (other authors). Nothing here duplicates those.

Every claim carries a source. Every section carries a confidence mark.

**A note on sources, because it decides how much of this you can trust.** Infantry was a small game
that died in 2012 and its official site is gone. There is no press archive, no design post-mortem,
no developer interview of substance. What survives is: two mirrored wiki articles descended from a
2010 Wikipedia edit; a community archive of the *original 1999 Harmless Games manual and the
complete in-game command listing*, which are genuine primary documents; a third-party population
tracker with a dated timeline; the community's own press releases (marketing, treat accordingly);
and Steam. The command listing is the single most valuable artefact here — a game's full command
surface tells you what systems actually existed, because you cannot ship a `*cash` moderator command
for an economy you never built.

---

## 1. HISTORY AND FATE — **CONFIRMED** (dates cross-checked across three independent sources)

### The lineage: this is the SubSpace team's second game

Infantry is not an isolated curiosity. It is the direct descendant of **SubSpace** (Virgin
Interactive Entertainment, 1997), and it inherited SubSpace's central idea — *zones* — which is the
thing you actually care about (§5).

- 1997: VIE released SubSpace. Members of that team formed **Harmless Games LLC**.
  ([Codex Gamicus / Gamia archive wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online); [HandWiki](https://handwiki.org/wiki/Software:Infantry_(video_game)))
- **December 1997** — pre-testing begins, led by **Rod Humble** and **Jeff Petersen**. Larry Cordner
  ("Harmless Games' editors programmer and level designer") joined **28 Jan 1998**.
  ([Infantry Archive — dev history](https://www.freeinfantry.com/history/infantry/devhistory.html))
  ⚠ Note that a dedicated *editors programmer* was on the team from month two. The tools were not an
  afterthought bolted on in 2007; they were staffed before the game existed.
- **October 1998** — Harmless Games formally launches; Nick Fisher creates GameFan Network to host
  servers. **November 1998** — Infantry announced. **March 1999** — BrainScan announced as publisher.
  ([Dan Luu's SubSpace/Continuum history](https://danluu.com/subspace-history/))
- **15 April 1999** — Alpha opens, ~100–200 testers, "mostly comprised of Subspace players."
  ([devhistory](https://www.freeinfantry.com/history/infantry/devhistory.html); date corroborated by [Infantry Arena timeline](https://infantry.gamespec.org/))
- Summer 1999 — open beta. This is the "1999 release" everyone cites.

### The corporate churn — three owners in two years

- GameFan (parent of publisher Brainscan Interactive) **went bankrupt and did not pay its employees
  for several months**; it was absorbed by Express.com, "as the new rightsholders of the game had
  little interest in maintaining it."
  ([devhistory](https://www.freeinfantry.com/history/infantry/devhistory.html))
- **5 October 2000** — **Sony Online Entertainment announced its acquisition of Infantry**, buying
  Harmless Games and its sole game from Brainscan for an undisclosed sum. Dan Luu's history records
  Nick Fisher's account that the IP sale "earned him a figure around 6 million USD."
  ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online); [danluu.com](https://danluu.com/subspace-history/))
- The game was **dark for three weeks** during the transfer, then closed beta, then **26 Oct 2000**
  public beta on SOE's "The Station." Delisted Games records the commercial digital release as
  **7 December 2000**.
  ([devhistory](https://www.freeinfantry.com/history/infantry/devhistory.html); [Infantry Arena timeline](https://infantry.gamespec.org/); [Delisted Games](https://delistedgames.com/infantry-online/))
- Rod Humble left for a senior SOE role. Only **two** developers came across: Jeff Petersen
  (programmer) and Jerimy Weeks (artist/zone designer).

### The staffing collapse — the actual cause of death, years before the shutdown

This is the part most retrospectives skip, and it is the most instructive thing in the whole history.

| When | Who was on the game |
|---|---|
| Oct 2001 | Petersen transferred to EverQuest development; Weeks laid off. **"Game development stagnated."** |
| May 2002 | Weeks rehired — *the same month the subscription launched* |
| Oct 2005 | Weeks laid off **again**; replaced by Joe Nelson, "whose only prior experience with Infantry involved customer service duties," who "held the position for only a few months" |
| May 2006 | Three SOE employees full- or part-time: Bill Corning, Jose Araiza, and a re-rehired Weeks |
| Apr 2007 | Weeks' contract expires |

([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online), sourced to the SOE
official forums; same text in [devhistory](https://www.freeinfantry.com/history/infantry/devhistory.html))

Infantry spent roughly its last decade with somewhere between **zero and three** people on it, at
least one of whom was a support rep. It was maintained, not developed.

### The business model, in order

1. **1999–2002** — free, with the game funded by publisher/portal money.
2. **1 May 2002** — SOE introduces **"Station Pass," $6.95/month**, covering its three small action
   titles: Infantry, Cosmic Rift and Tanarus. Infantry stayed playable free **but crippled**:
   > "restricted to a limited playtime on servers (a player could only stay connected for **half an
   > hour** before being disconnected), **the inability to accumulate money**, **no statistical
   > tracking** and **no personalized options**."
   ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online); [devhistory](https://www.freeinfantry.com/history/infantry/devhistory.html))
   ⚠ Read what that free tier removed: the **economy**, the **persistence**, and the **identity**.
   The three things §2–§4 are about. SOE paywalled the game's soul and left the shooting free.
3. **26 May 2007 announced / 26 June 2007 live** — SOE makes Infantry and the rest of Station Pass
   fully free.
   ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online), sourced to the SOE press
   release; date corroborated by [Infantry Arena timeline](https://infantry.gamespec.org/))
4. **2007** — SOE releases the **Map Editor** publicly (see §6 for a date conflict).

### The shutdown

- **29 February 2012** — SOE announces the closure by mass email. Full text:
  > "It is with a heavy heart that we announce today the imminent sunsetting of four of our
  > long-standing game services on March 29, 2012, including Cosmic Rift®, Infantry®, Star Chamber:
  > The Harbinger Saga and EverQuest® Online Adventures… **This is not an easy decision, but there
  > comes a time when it's best for our developers to move on to the next adventure, and that day has
  > come.**"
  ([Delisted Games, quoting the SOE announcement](https://delistedgames.com/infantry-online/); corroborated [Shacknews](https://www.shacknews.com/article/72671/soe-killing-four-mmos-in-march))
- ⚠ Note what SOE *did not* say: no cost figure, no population figure, no technical reason. EQOA
  players got three months of free EverQuest gold membership as a consolation. Infantry players got
  nothing. Read that as the honest measure of how much the game mattered to its publisher.
- **29 March 2012, 12:00am PT** — servers off.
  ([Infantry Arena timeline](https://infantry.gamespec.org/))

### What the community did — and note the dates carefully

- **1 December 2009** — "Group of players reverse engineered game server."
  ([Infantry Arena timeline](https://infantry.gamespec.org/))
  ⚠ **The emulator predates the shutdown by two years and four months.** A private-server scene
  already existed while SOE was live — the 2010 wiki text records "Alternative servers to the
  official Infantry Online have spawned over the recent years, initially to provide a free option to
  the game, most notably 'Free Infantry'," which then "transitioned to providing alternative maps and
  gameplay" once SOE went free.
  ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
  This is the whole reason the game survived. The lifeboat was built and sea-trialled while the ship
  was still afloat.
- **5 April 2012** — free player-run servers start. **Seven days** after SOE pulled the plug.
  ([Infantry Arena timeline](https://infantry.gamespec.org/))
- **15 September 2020** — Free Infantry publishes an **open letter to Daybreak Game Company**
  (SOE's successor) asking for the same kind of written agreement Daybreak gave EverQuest's Project
  1999. Their stated problems are worth quoting because they are the real cost of running on a dead
  client:
  > "The game client that Free Infantry uses is still **the original Infantry Online client**. It
  > uses **DirectDraw** which has more compatibility issues with each new Windows version… Some of
  > the tools used also require the zone developers to run them in **compatibility mode** which may
  > not always work. We are unsure how much longer the game client will remain usable, and would like
  > to maintain and update it."
  ([Free Infantry press release, 15/09/2020](https://www.gamespress.com/Free-Infantry-celebrates-being-one-of-the-longest-community-run-privat))
- **15 April 2024** — **FreeInfantry launches on Steam**, free, no microtransactions.
  ([Steam app 2830720](https://store.steampowered.com/app/2830720/FreeInfantry/); [Infantry Arena timeline](https://infantry.gamespec.org/))

### Where it stands today (July 2026)

- Free-to-play on Steam, "Very Positive," **80% of 162 reviews**.
  ([Steam](https://store.steampowered.com/app/2830720/FreeInfantry/))
- Concurrents: all-time peak **70** (Nov 2024); last 30 days **6.15 average / 46 peak**; the trend is
  down (Apr 2024 avg 10.78 → Jun 2026 avg 6.52).
  ([SteamCharts](https://steamcharts.com/app/2830720))
- Server infrastructure is open source; the community finances and operates it.
  ([freeinfantry.com](https://www.freeinfantry.com/))

⚠ **On the licence: LIKELY, NOT CONFIRMED.** MMOBomb states flatly that the revival runs "under a
licensing agreement with Daybreak Games."
([MMOBomb](https://www.mmobomb.com/news/25-years-later-infantry-online-back-free-infantry-steam))
Free Infantry's own 2024 press release says the community revived it "on a **rogue server**,
operating under a license agreement similar to that of the fan-led 'Project 1999'."
([Free Infantry press release, 29/04/2024](https://www.gamespress.com/Classic-Shooter-Infantry-Online-Revived-on-Steam-After-25-Years))
But Massively OP, reporting the Steam launch, wrote only: "**We're assuming they got it**."
([MassivelyOP, 24 Apr 2024](https://massivelyop.com/2024/04/24/community-led-infantry-online-soes-25-year-old-shooter-marches-its-way-onto-steam/))
No Daybreak statement exists in any source I found. Getting onto Steam is *circumstantial* evidence
of a rights clearance, since Valve requires it — but nobody has published the agreement.

---

## 2. THE ECONOMY — **CONFIRMED in structure, UNVERIFIED in numbers**

### There was real currency, and it was called cash

Three independent confirmations that money was a first-class, server-side, persistent player property:

1. The moderator command `*cash` — "Sent privately it will **grant target player the specified
   amount of cash**."
   ([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))
2. The 2002 free tier's stated restriction: "**the inability to accumulate money**."
   ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
3. Marketing: "You start with the basic essentials and **work your way to better, more costly
   armaments by destroying enemies to earn the funds you need to progress**."
   ([MMORPG.com game page](https://www.mmorpg.com/infantry-online))
4. **The database schema settles it.** The `Stat` table's columns are
   `Cash, Experience, ExperienceTotal, Kills, Deaths, KillPoints, PlaySeconds, Zonestat1..8`.
   ([Stat.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Stat.cs))
   Cash is a persisted, per-zone column sitting beside kills and deaths — not a session score.

**How it was earned: by killing.** The 1999 manual describes a **bounty** system inherited from
SubSpace: "Your bounty is the amount of points someone gets for killing you. Your bounty goes up
gradually the longer you stay alive and increases every time you get a kill." Plus **assists**: "If
you are near an enemy when he is killed by a teammate you get a small amount of points as an
'assist'. This helps get rid of some of the frustration of stolen kills."
([1999 manual, v25 guide](https://www.freeinfantry.com/history/infantry/iomversion25.htm))

⚠ That bounty rule is a *self-balancing* design and it is worth stealing (§steal). A player who
survives and racks up kills becomes progressively more valuable to kill. The game applies pressure
to the leader automatically, with no rubber-banding and no hidden handicap — it is entirely legible
to everyone.

### Buying: a command-line store, not just a menu

`?buy` — "Commandline buy function (`?buy grenades:10` or `?buy grenades:10,monkeys:20` and
`?buy grenades:#` if you wish have no more than *#* in your inventory.)"
`?sell` — "Syntax works like ?buy, **all items aren't sellable**."
`?drop` — "The syntax works like ?buy, drops the item(s) listed to your current location."
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

⚠ Read `?buy grenades:#` again. That is a **top-up-to-N** syntax. A veteran bound one macro that
restocked their entire loadout to exact quantities in one keystroke. The store had a *power-user
tier* — which is simultaneously the best UI idea in the game and a direct cause of the newbie cliff
in §8. The novice is clicking through an armoury; the veteran typed one line and is already moving.

The CTF zone is documented as having "an **extensive store** with purchasable weapons."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))

### Did death cost you anything? — **LIKELY: yes, your carried inventory. Not confirmed directly.**

I could not find an explicit statement of a death penalty. What the sources support:

- Loadouts were **carried**, in a real inventory with weight limits (§7), and were bought with cash.
  Items could be dropped for teammates. The natural reading is that you re-equipped after dying and
  that re-equipping cost money.
- The design pressure is visible in the manual's own tips: "Players will not be in a position to
  carry all the weapons he wants. Players should pick a weapon he feels comfortable with and try and
  find an ideal 'load' that he likes."
  ([1999 manual](https://www.freeinfantry.com/history/infantry/iomversion25.htm))
- ⚠ But this is inference. **Do not cite Infantry as proof that death-costs-money works.** I did not
  find a rule statement, and it very likely varied per zone (§5 — every zone set its own economy).

### Resources, supply and base building — **CONFIRMED that all three existed**

The command listing settles this:

- `?resources` — "Displays **your team's inventory** (where applicable)."
- `*teamprofile` — "Displays a breakdown of **the total inventory that a team has**."
- `?struct` — "Lists the number/name of each type of **computer vehicle the team owns**."
- `?structures` — "Lists detailed information about each computer vehicle. Things like **creator's
  name, HP, location**, etc."
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

So: a **team-level shared inventory** distinct from personal inventory, and **player-built
structures that remember who built them**, have hit points, and are enumerable. The 1999 class list
confirms the builder: the **Combat Engineer** "is the backbone of Defense because of his ability to
make defensive weapons such as **Auto Turrets, and Mines**… he is there to support his team on
defense, and build items that are necessary."
([1999 manual, characters](https://www.freeinfantry.com/history/infantry/iomcharacters.htm))
The 2000 feature list promises "emplacements (**build your own base**)."
([Infantry features page, from infantryzone.com c.2000](https://www.freeinfantry.com/history/infantry/features.html))

**Supply lines and harvesting existed in at least one zone.** The Fleet zone is described as a place
where players "board massive, multi-player ships and engage in an all-out territory war, **harvest
and steal enemy supplies**, build defense structures and frigates, and assail the enemy mothership."
([freeinfantry.com](https://www.freeinfantry.com/), corroborated by the [Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online) description of Fleet as command-post destruction)
Modern coverage confirms base-building survives: player modes include "class customization, weapon
upgrades, and **innovative base-building tactics**."
([Free Infantry press release, 2024](https://www.gamespress.com/Classic-Shooter-Infantry-Online-Revived-on-Steam-After-25-Years); [PCGamesN](https://www.pcgamesn.com/freeinfantry/steam-launch))

⚠ **UNVERIFIED: whether bases had to be *continuously* supplied.** I found team inventories and
harvesting, but no rule saying a base decays or goes dry without logistics. Do not assume it.

---

## 3. PROGRESSION AND PERSISTENCE — **CONFIRMED, and the shape is the interesting part**

### Experience and skills existed — as engine features, used by some zones

- `*experience` — "Sent privately it will **grant target player the specified amount of
  experience**."
- `*profile` — "Sent privately it will list target players **inventory and skills**."
- `?wipecharacter` — "**Erases your current character's information**, you have to be in spectator
  mode to use this."
- `*wipe` — "Sent privately it will wipe a player's stats completely… Sent publicly as `*wipe all` it
  will wipe **everybody's** stats."
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

⚠ The existence of `?wipecharacter` is the proof of persistence. **You cannot offer to erase
something that does not survive the session.** And note it is a *player-facing* command: a player
could voluntarily reset their own character. That is a reroll button, shipped, in 2001.

The schema confirms both halves. `Player` (indexed on `AliasId, ZoneId`) carries `Inventory`,
`Skills`, `Banner` and `SquadId`; `Stat` carries `Experience` **and** `ExperienceTotal` — a spendable
pool and a lifetime total, which is the standard shape for a system where XP is *currency for
unlocks* rather than a level counter.
([Player.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Player.cs),
[Stat.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Stat.cs))

### Persistence was PER-ZONE, not global. This is the single most important structural fact in the file.

The scoring commands are explicitly zone-scoped:

- `?score_top100` — "Displays Top 100 scores **in the current zone**."
- `?score_online` — "Displays scores of online players **in the current zone**."
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

And the historical tracking was serious — `?score_top100_year` / `_month` / `_week` / `_day` (with a
date parameter: `?score_top100_day 2001-06-26`), plus `?score_history_year/_month/_week/_day` for any
named player. A per-zone leaderboard with **daily granularity queryable by date**, in 2001.

**And the database proves it** (full table in §5): `Account` and `Alias` are global, `Alias.Name` is
globally unique, while `Player` is indexed on `(AliasId, ZoneId)` and `Stat` is `ZoneId`-scoped. Your
cash, experience, inventory and skills are **stored per zone**.

So the model is: **one account and one identity across the whole game; a separate character, economy
and ladder inside each zone.** Your name, your squad, your friends and your chat channels follow you
everywhere (`?find` locates a player across zones; private messages "are sent across ALL the game
arenas"); your *progress* does not. Confirmed by the 2002 free-tier restrictions, which removed "no
statistical tracking" as an account-level property.
([1999 manual, communication](https://www.freeinfantry.com/history/infantry/iomcomms.htm); [Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))

⚠ **This is what let a stranger host a zone without the game losing coherence.** A zone operator gets
to run their own economy and ladder — they cannot inflate the *global* one, because there isn't one.
Identity is central and authoritative; progress is local and disposable. If you are building
community-hosted anything, copy this split exactly (§steal).

### Which zones had RPG progression

- **`[I:RPG] Eol`** — "Infantry's action/RPG project. Various versions including Eol Beta, Gamma and
  Advanced." Revived by the community in Nov 2022 as **Eol: Reforged**, now "quickly becoming one of
  our most popular zones," featuring "KOTH and CTF action and **kill aliens and pirates for
  bounty**."
  ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online); [freeinfantry.com news](https://www.freeinfantry.com/))
- **`[I:RPG] TFCity`** — player-developed, with "**class branches, character traits and skill
  requirements to level up**… This zone uses **missions (quests)** to allow for character trait
  upgrades."
- **`[I:RTS] Connors Canyon`** — player-developed RTS zone "with classes, basing, bunkers. A series of
  quests to complete."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))

⚠ Note that two of those three are **player-made**. The RPG and RTS layers of Infantry were built by
players, in the shipped tools, on top of a shooter. That is the tools story (§6) proving itself.

### Pay-to-win: no, then partially, then no

There was never a cash shop. But the 2002–2007 subscription **did** gate money accumulation and stat
tracking behind $6.95/month, which is pay-to-progress if not pay-to-win. Today: "100% free with
**zero paid unlockables**."
([Steam](https://store.steampowered.com/app/2830720/FreeInfantry/))

---

## 4. SQUADS, TEAMS AND SOCIAL — **CONFIRMED. This is a full guild system, not a friends list.**

### The squad system, in full

Reconstructed from the command listing — note this is a *complete* organisational primitive with
ownership, delegation and succession:

| Command | What it does |
|---|---|
| `?squadcreate name:password` | Creates a squad. **Password-protected.** Name must be unique. |
| `?squadinvite add: player:squad` | Invite. Also `remove:` to rescind. |
| `?squadIresponse accept:` / `reject:` | The invited player answers. **Two-sided handshake.** |
| `?squadlistinvites squad` / `player` | Pending invites, queryable from either side |
| `?squad [name]` | Lists **online** players in a squad |
| `?squadlist` | Lists **all** players in a squad ("may take a while to display") |
| `?squadchart` | Chart of everybody online in the squad **and their location** |
| `?squadkick` / `?squadrename` / `?squaddissolve` | Owner-only |
| `?squadtransfer` | **Transfers ownership.** Target "cannot own a squad already." |
| `?squadleave` | Quit |

([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

⚠ `?squadtransfer` is the tell. A system with succession is a system whose designers expected squads
to **outlive their founders**. And `?squadchart` — one command showing where every squadmate is,
across the whole game — is the single feature most responsible for a small population feeling
populated. You never open a dead game; you open a list of your people and where they are.

Squad membership was visible to strangers: `?info`, sent privately, "will display information of the
person's ping/packetloss **and his squadname (if applicable)**." Squad name was also available as a
macro variable, `%squad`.

### Chat: channels that crossed the entire game

- `?chat name1,name2,…,name9` — join up to **nine** named channels; `?chatadd` / `?chatdrop` to
  manage. "Chat channels go **across all game servers** and can be about any topic."
- `?chat Psionics rod` — channels could be **password-protected**, created by any player, with no
  admin involvement.
- `?chatchart` — "Displays a chart of everybody online in your chat channels **and their location**."
- Prefixes: `'` for team, `:name:` for private, `::` to quick-reply to whoever last paged you.
  Private messages "are sent across ALL the game arenas, thus if you want to know if your friend is
  online anywhere in Infantry then you can send him a message."
([1999 manual, communication](https://www.freeinfantry.com/history/infantry/iomcomms.htm); [Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

⚠ **Player-created, password-protected, cross-server channels with a presence chart.** In 1999. This
is Discord, shipped inside the game, twelve years before Discord. And it is the largest single reason
the community outlived the game: *the social graph was inside the client and it was portable across
every zone.*

### Macro variables — communication as a game mechanic

`%commands` could be embedded in any message:

`%coord` (current radar coordinate) · `%exact` (exact map position) · `%facing` / `%heading` (8-way)
· `%flagger` (name of the nearest player carrying a flag) · `%flagdrop` (time until flags drop) ·
`%flagcount` · `%killer` / `%killed` · `%count[ItemName]` (how many of an item you hold) ·
`%crownexpire` · `%tickname` / `%tickitem` (whatever is highlighted in the playerlist / inventory)
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

Bound to F-keys (`?savemacro` / `?loadmacro`, saved to named files), this is a **one-keystroke
callout system**: press a key, your team gets "enemy flagger DEATHBRINGER at G7 heading north" with
live values. No voice chat, no ping wheel — a text templating language.

⚠ This is the best idea in Infantry that nobody copied. It is not a chat feature; it is a *tactical
information protocol* that the player composes themselves. Steal it (§steal).

### Leagues: five separate competitions, each with its own website and its own zone

As of the 2010 wiki snapshot, running **on Sony's servers with dedicated zones** — "Each of these
dedicated zones have custom maps and settings not always available or found within the public zones":

- **CTFPL** (Capture The Flag Players League) — "arguably the biggest." 10v10 on a modified
  *I:CTF Twin Peaks*. Permit-only. Sunday nights 7–10pm EST. Site: ctfpl.org
- **USL** (Unified Skirmish League) — 6–8 a side on a modified *I:SK Kliest Ridge*. 30-minute
  kill-count. **Per-team class limitations.** Site: uslzone.com
- **SL** (Skirmish League) — 8 team *slots*; three deaths retires a slot permanently, shrinking your
  team as the match goes on. Or win by holding all flags 20 seconds. Best of 3. Site: skirmishleague.com
- **SBL** (Soccerbrawl League) — football where "checking/killing your opponent is allowed." 6–8 a
  side, 30 min, sudden death. **"Team members must be part of a squad to play in this zone."**
- **IGBL** (Infantry Gravball League) — 6 a side, hoverbikes, 20 min, 3-goal mercy rule, best of 3.
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))

Still running: USL reached **Season 20** on Free Infantry in Oct 2023, and Steam's store page (2024)
advertises a "competitive deathmatch league that's **50 plus seasons running**."
([freeinfantry.com](https://www.freeinfantry.com/); [Steam](https://store.steampowered.com/app/2830720/FreeInfantry/))
Weekly public events persist: **Twin Peaks Tuesdays** (CTF, Tuesdays 10pm ET) and **Skirmish**
(Sundays 10pm ET).
([freeinfantry.com](https://www.freeinfantry.com/))

### So why was the community disproportionately strong? — four structural reasons, not sentiment

1. **The social graph lived in the client and crossed every zone.** Squads, chat channels and
   presence charts were global while gameplay was local (§3). You could not "leave" the community by
   changing what you played.
2. **Players held real authority.** Any player who created an arena became its owner by default —
   "Normally the **oldest player in the arena** (usually arena creator unless he leaves) has ownership
   rights" — with a full moderator command set (`*spec`, `*team`, `*scramble`, `*timer`, `*block`,
   `*specquiet`, `*lock`, and `*grant` to share ownership).
   ([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))
   Organising a match required *no staff*.
3. **The tools made players into authors** (§6), and SOE formalised it: from May 2007 a **Player
   Content Team (PCT)** was "set up to encourage, nurture and oversee much of the new content being
   developed for the game." The 2010 wiki infobox credits the game's **designer** as
   "Player Content Team."
   ([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
4. **Scheduled appointments.** Five leagues on fixed weeknights meant a 100-player game could still
   produce a full 10v10, because everyone showed up at the same hour. A tiny population that
   *synchronises* behaves like a large one. Free Infantry still does exactly this, and says so on the
   store page: "most active daily between 9 PM and 2 AM EST."
   ([Steam](https://store.steampowered.com/app/2830720/FreeInfantry/))

⚠ And the honest flip side, which §8 develops: every one of those four is also an **enclosure**. The
leagues were *permit-only*. You applied to a human.

---

## 5. THE ZONE / SERVER MODEL — **CONFIRMED (read off the live directory API and the open-source server)**

This is the part worth your time. Most of what follows is verified against the **actual production
directory server** and the **actual source code**, not recollection.

### The shape

Four separate services, and keeping them separate is the whole trick:

| Service | What it is |
|---|---|
| **Zone server** | One process, one UDP port, one zone. The build output is a single `InfServer.exe` — *"the `InfServer.exe` file which powers **all** the zone servers that we run in our production environments."* ([README](https://github.com/InfantryOnline/Infantry-Online-Server)) |
| **Directory server** | UDP **4850**. Hands the client the zone list. ([DirectoryServer.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/DirectoryServer/Directory/DirectoryServer.cs); corroborated by the community's own reverse-engineering notes: *"the directory server is hosted on port 4850, still a UDP communication"* — [Docs/DirServ/notes.txt](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/Docs/DirServ/notes.txt)) |
| **Account server** | Separate HTTP/JSON service. *"Prior to launching the game, the user must authorize with the Account Server to receive the necessary session token. The session token received by the user is required to be sent to the zone that the user wishes to join."* ([Account Server Protocol](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/Docs/Protocols/Account%20Server%20Protocol.md)) |
| **Database server** | SQL Server or SQLite via EF Core, selected in `server.xml`. ([DirectoryServer.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/DirectoryServer/Directory/DirectoryServer.cs)) |

A zone is genuinely a separate process on its own port, not a shard of one world. As of **27 July
2026** the live directory lists **7 public zones plus a test entry**, and all seven share **one IP
(51.81.82.133)**, differing only by port — 9023, 9071, 9079, 9101, 9117, 9130, 9163.
([live directory API](http://infdir1.aaerox.com/directory/))

### The zone list, and how population gets on it

The client shows an **in-client zone browser with live player counts**. The counts are **polled, not
pushed**: every ~5 seconds the directory sends each zone a 4-byte UDP probe and reads back an int32.

```csharp
udpClient.Send(new byte[] {00, 00, 00, 01}, 4);
var bytes = udpClient.Receive(ref endpoint);
PlayerCount = BitConverter.ToInt32(bytes, 0);
```
([Directory/Protocol/Helpers/Zone.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/DirectoryServer/Directory/Protocol/Helpers/Zone.cs))

⚠ **Polling, not registration, is the right call and it is worth understanding why.** A zone that has
crashed, hung, or been quietly switched off simply stops answering the probe and vanishes from the
list within five seconds — nobody has to write a heartbeat, a timeout, or a deregistration path, and
a zone operator cannot lie about their population because they never report it; they *answer* it.
The listing is a consequence of being alive.

The wire format each list entry carries: 4 bytes IP, 2 bytes port, a 32-byte zone name, a
**beginner-zone flag** ("00 = beginner, 01 = not beginner"), and a variable-length description, sent
in 512-byte chunks. ([Docs/DirServ/notes.txt](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/Docs/DirServ/notes.txt))

⚠ Note the **beginner flag on the zone record itself**. The list, not a tutorial, was the onboarding
mechanism — a fresh player was pointed at zones flagged safe. It is one bit, and given §8's newbie
problem, one bit that was clearly not enough.

The directory also exposes a **public JSON API** (`Title, Description, PlayerCount, Address, Port`),
with a `/notz` variant that filters out test zones, and third parties consume it to build web zone
lists. ([HttpJsonResponder.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/DirectoryServer/Directory/Protocol/HttpJsonResponder.cs); [nebez/inf-list](https://github.com/nebez/inf-list))

### Who could run a zone — the answer changed in 2012, and the distinction is precise

**Under SOE: no.** Zones ran on Sony's hardware — "There are a series of Leagues established and
running on **the Sony Servers**, all with dedicated Zones."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
What players could do instead was run *whole alternative servers* outside SOE's list entirely — which
is what the private-server scene was (§1).

⚠ But the important nuance: **players authored the zones; SOE hosted them.** From May 2007 the
**Player Content Team** existed to "encourage, nurture and oversee much of the new content being
developed for the game," and the 2010 wiki records "several new zones and some old zones resurrected
by players updating, converting from the old file format to the new."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
That is the crucial split: SOE kept the *operational* keys and gave away the *creative* ones.

**Today: anyone.** The Quick Start guide is titled "**Host your own Zone Server in minutes**" and the
path has no compiler step — download a prebuilt zone pack from
[assets.freeinfantry.com/dev-packs/](https://assets.freeinfantry.com/dev-packs/), extract it, run.
([quick-start.md](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/quick-start.md))
Setting `connectionDelay` to 0 in `server.xml` gives a **stand-alone offline mode with no database at
all** — you get a working private server with zero infrastructure.
([README](https://github.com/InfantryOnline/Infantry-Online-Server))

### ⚠ But getting *listed* is still gated — and that gate is the whole governance model

The directory does not accept registrations. It **reads the database**, filtered on an active flag:

```csharp
var activeZones = ctx.Zones.Where(z => z.Active == 1)
    .Select(z => new Protocol.Helpers.Zone(
        IPAddress.Parse(z.Ip.ToString()).GetAddressBytes(),
        (ushort)z.Port.Value, z.Name, z.Advanced == 1, z.Description)).ToList();
```
([DirectoryServer.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/DirectoryServer/Directory/DirectoryServer.cs))

The `Zone` row carries `ZoneId, Password, Name, Description, Notice, Active, Ip, Port, Advanced` —
and that **`Password`** is how the zone process authenticates itself to the database server.
([Database/Zone.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Zone.cs))

So: **listing is an admin INSERT, not a self-service handshake.** Run whatever you like on your own
machine; appearing in front of the playerbase requires a human to add you *and* issue you a
credential that lets your zone write to the shared stat database. Independent operators are
explicitly told to disconnect from the directory instead — clear `infdir1.aaerox.com` and
`infdir2.aaerox.com` from the client's options, then hand-edit `Infantry.lst`:

```
"Test Zone","127.0.0.1",1337,1,0,"The test zone's description.",50,0
```
([README](https://github.com/InfantryOnline/Infantry-Online-Server))

⚠ This is the single most transferable idea in the file, so state it plainly: **open the software,
gate the directory.** Anyone can host; the shared list is curated. That gives you a real modding
scene without letting anyone claim the front page, and — because the stat database sits behind a
per-zone password — without letting an untrusted operator forge progression on the shared ladder.

There is even a sanctioned escape hatch for developers: the live list carries a permanent
`[I:TZ] Local Test Zone` entry pointing at **127.0.0.1**, described as "For zone developers wishing
to test their zones locally." Every developer's client resolves that one shared listing to their own
machine. One row in the public directory serves every developer at once.
([live directory API](http://infdir1.aaerox.com/directory/))

### Account persistence — one login, many zones (read off the schema)

| Table | Scope | Carries |
|---|---|---|
| `Account` | **GLOBAL** | `AccountId, Name, Password, Ticket, Email, Permission, DateCreated` |
| `Alias` | **GLOBAL, unique** (`[Index(nameof(Name), IsUnique = true)]`) | one account → many aliases |
| `Player` | **PER ZONE** (`[Index(AliasId, ZoneId)]`) | `Inventory, Skills, Banner, SquadId, StatId` |
| `Stat` | **PER ZONE** | `Cash, Experience, ExperienceTotal, Kills, Deaths, KillPoints, PlaySeconds, Zonestat1..8` |

([Account.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Account.cs),
[Alias.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Alias.cs),
[Player.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Player.cs),
[Stat.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/dotnetcore/Database/Stat.cs))

This is the hard confirmation of §3: **your name is global and unique; your cash, experience,
inventory and skills are per-zone and do not travel.** `StatsDaily/Weekly/Monthly/Yearly` are
likewise zone-scoped, which is what powered `?score_top100_day 2001-06-26`.

⚠ And the mechanism that makes a zone feel like its own game: **eight free-form stat columns**,
`Zonestat1..8`, which the zone's own script names — the CTF script's comments note they "map over to
the config file `Name0` through `Name6` list of stats."
([CTF.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/scripts/GameTypes/CTF/CTF.cs))
The platform ships a fixed schema plus **eight blank columns the content author gets to define**.
A racing zone tracks lap times in the same table a CTF zone tracks flag captures.

### Zones, then and now

- **Today: 7 public zones, 3 players online** at a midday sample (SK-Minimaps 0 · Soccer Brawl 0 ·
  Chambert's Tournament 0 · SKX Triple Threat 0 · USL Megamaps 0 · **Eol Pioneer Station (Bots) 3** ·
  USL KS10 0). ([live directory API](http://infdir1.aaerox.com/directory/), 27 Jul 2026)
- **Preserved historically: 233 zone archives** — 92 in "Complete Zones" (plug-and-play on the modern
  server) and 141 filed under "Incompatible Zone Archives," sorted **by the exception they throw**:
  KeyNotFoundException 85 · SilentClientCrash 31 · FormatException 13 · IndexOutOfRange 7 ·
  OutOfMemory 3 · ArgumentException 2. ([Zone-Assets](https://github.com/InfantryOnline/Zone-Assets))
  ⚠ Filing your broken content library by stack trace, so that fixing one server bug promotes 85
  zones at once, is a genuinely good preservation idea and I have not seen it anywhere else.
- ⚠ **UNVERIFIED: the peak zone count under SOE.** ~16 zone names are attested across sources but no
  authoritative list survives.

### Fragmentation

Infantry's answer to "a small population spread over many zones" was **not** to merge zones. It was
to **concentrate the population in time**: fixed weekly events (Twin Peaks CTF Tuesdays 10pm ET,
Skirmish Sundays 10pm ET) and league nights. ([freeinfantry.com](https://www.freeinfantry.com/))
The one documented instance of *re*-consolidation was involuntary: when SOE went free in 2007 the
third-party servers "inevitably slowly faded out of existence as players went back to SOE's version
of the game."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))

⚠ **UNVERIFIED:** no developer or journalist ever stated that zone count *caused* the population
split. That is a plausible reading, not a documented one, and my live sample — 7 zones, 3 players,
all in one zone — is equally consistent with "the population is simply small."

---

## 6. THE TOOLS — **CONFIRMED for the modern stack; LIKELY for the SOE-era tool list**

### There is no "the editor." There is one editor per asset type.

| Tool | File | What it owns |
|---|---|---|
| **Map Editor** / InfantryStudio | `.lvl` | terrain, tiles, doodads, minimap |
| **Infantry CFG Editor ("ICE") v0.07** | `.cfg` | zone-wide rules + the asset manifest. Ships `iceHelp.cfg` "that provides descriptions of all of the settings you can modify" |
| **Item Editor** | `.itm` | "the data for all the items in a zone" — weapons, gear |
| **Vehicle Editor** | `.veh` | vehicles |
| **Skill Editor** | `.rpg` | "information about classes and skills" |
| **LIO Editor** | `.lio` | Level Interactive Objects |
| **BlobEdit v0.24 / v0.16** | `.blo`, `.lvb` | the asset archive — a **mixed sound + sprite container** |
| **CFSConvW v0.21** | `.cfs` | "take a bitmap of frames and convert it to a CFS file… edit CFS file options as well as decompile them" |

⚠ Tool names, versions and descriptions come from the "Infantry Editors" thread on the Free Infantry
forum, which now returns **HTTP 500 on every URL** — the forum appears dead, and these were recovered
from search-engine snippets.
([freeinfantry.com/forum/viewtopic.php?f=7&t=47](http://www.freeinfantry.com/forum/viewtopic.php?f=7&t=47) — **LIKELY, snippet-sourced**)

The **formats** are confirmed from the modern C# reimplementations, which is much firmer ground:
InfantryStudio's open filter is `"Infantry Online Level File (*.lvl)|*.lvl"` and it has
`MainWindow`, `MinimapWindow`, a `DoodadWindow` and a `Rendering` folder; BlobEditor's filter is
`"Infantry Online Blob File (*.blo)|*.blo"` and it branches on `.wav` (plays it via NAudio) vs
`.cfs` (previews it). `Tools.LvbRebase` exists to clean bloat out of level-bundled blobs.
([Infantry-Online-Tools](https://github.com/InfantryOnline/Infantry-Online-Tools);
corroborated by the format library [gibbed/Gibbed.Infantry](https://github.com/gibbed/Gibbed.Infantry) —
`BlobFile.cs`, `LevelFile.cs`, `SpriteFile.cs`, `DecompileCFS`, `DecompileLVL`)

⚠ **The tools are ancient 16-bit-era Windows binaries** and this is a live wound: Free Infantry's own
troubleshooting tells zone developers to run "Windows XP inside of a VM," or Compatibility Mode with
"16-bit Color Mode checked."
([freeinfantry.com](https://www.freeinfantry.com/))
Their 2020 letter to Daybreak said the same: "Some of the tools used also require the zone developers
to run them in compatibility mode which may not always work."
([2020 press release](https://www.gamespress.com/Free-Infantry-celebrates-being-one-of-the-longest-community-run-privat))
A modern **Angular 17 web replacement** is in progress but incomplete.
([InfantryOnline/Editor](https://github.com/InfantryOnline/Editor))

⚠ **When and how the tools were released, honestly: three candidate dates, none nailed down.**

| Date | Claim | Source |
|---|---|---|
| **1 June 2007** | "Sony released a free map editor for Infantry" | [Infantry Arena timeline](https://infantry.gamespec.org/) |
| **July 2007** | "In July 2007, Sony Online Entertainment released a Map Editor for Infantry, available for free download via the official website" | [Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online), cited to a now-dead SOE page |
| *26 June 2007* | the free-to-play launch itself — **often conflated with the tools release; no source ties them** | — |

July has two encyclopedia mirrors citing an SOE URL, so it is the stronger claim; the SOE page is
dead and archive.org was not reachable during this research. **Report both.** What is *not* supported
is the common retelling that the editors shipped alongside the free-to-play move.

### The `.cfg` is the zone's constitution

Four independent confirmations of what it controls:

1. The server points at exactly one — `<zoneConfig value="ctf1.cfg" />`.
2. It is the **manifest**: the server validates "any other files listed in the **cfg**'s `[Level]` and
   `[HelpMenu]` sections," so the cfg is what binds map + items + vehicles + skills into a zone.
3. Scripts receive the whole thing as one typed object: `_config = _arena._server._zoneConfig;` of
   type `CfgInfo`.
4. It **names the per-zone stat columns** (`Name0`–`Name6` → `Zonestat1..7`).
([README](https://github.com/InfantryOnline/Infantry-Online-Server); [Blank.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/scripts/GameTypes/Blank/Blank.cs); [CTF.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/scripts/GameTypes/CTF/CTF.cs))

Note the division of labour: **weapon and item stats live in `.itm`, vehicles in `.veh`, classes and
skills in `.rpg`.** The `.cfg` holds zone-wide rules and the manifest, not the numbers.

### Scripting: C#, in the modern emulator

`scripts/GameTypes/` holds **26** game types — AxiCTF, Basic, BasketBall, Blank, BoomBall, BugHunt,
CTF, CTFHQ, Conquest, Dodgeball, FantasyZone, Frontlines, GravBall, HQ, Hockey, KOTH, LaserTag,
**MOBA**, Multi, SKCTF, SL, SoccerBrawl, TDM, USL, ZombieZone — all `.cs`, compiled as a library
(.NET Framework 4.6.1), selected by name in `server.xml` and registered in `bin\scripts.xml`.
([scripts/](https://github.com/InfantryOnline/Infantry-Online-Server/tree/master/scripts))

The API is small: implement `Scripts.IScript` with `init(IEventObject invoker)`, `poll()`, and an
`#region Events` block. `Blank/Blank.cs` is a shipped empty template. Scale: `CTF.cs` is ~56KB —
these are real programs.
([Blank.cs](https://github.com/InfantryOnline/Infantry-Online-Server/blob/master/scripts/GameTypes/Blank/Blank.cs))

⚠ **UNVERIFIED: what SOE's own scripting layer was.** The C# gametype system belongs to the
*community emulator* (the SourceForge project is C#, registered 31 Mar 2010). No source states what
language SOE's original gametype scripts used, or whether players could write server-side logic on
SOE's hardware. The PCT evidence proves players authored **content**; it does not prove they authored
**rules**. Do not assume.
([sourceforge.net/projects/infserver](https://sourceforge.net/projects/infserver/))

### THE KEY QUESTION: what could a non-programmer actually make?

**A qualified yes with a hard, documented ceiling — and the repo states the ceiling in one sentence.**

**Yes:** a non-programmer can stand up a genuinely new-feeling zone with **no code at all**. Take a
dev pack, open the editors, and change the map, the arsenal, the vehicles, the classes and skills,
the sprites and the sounds — then point `server.xml` at one of **26 prebuilt game types**. New map,
new weapons, new classes, new art, proven CTF/KOTH/TDM/Zombie logic. That is most of a game.

**No, past that line:**

> "**Game Type scripts control the logical flow of a zone, if you are creating a new zone or require
> specific scenarios to play out it is highly likely you will need to create a custom Game Type.**"
> … "If a GameType does not exist in the `bin\scripts.xml` file, it must be manually added."
([README](https://github.com/InfantryOnline/Infantry-Online-Server))

**New content: editors only. New rules: C#.**

And the community organised itself around exactly that seam. A live zone credits its authors
separately: *"SKX — Triple Threat … **Map by FlyMolo, scripting by Axidus**."*
([live directory API](http://infdir1.aaerox.com/directory/))
A mapper and a scripter, named as two people, in the zone's own description string.

⚠ **How it shaped the game's life — the honest version.** This is why Infantry has content at all: by
2010 its own wiki was recording, as community consensus, that "Player Development and content is the
only real way to help Infantry survive," and two of the three RPG/RTS zones in §3 were player-built.
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
But it is *also* why the content is 233 zone archives of which 141 do not run, why the modern project
spends its effort on compatibility rather than design, and why the tools' biggest problem in 2026 is
that they need a Windows XP virtual machine. **Tools built a scene that outlived the studio by
fourteen years, and they are simultaneously the thing that pins the project to 1999.**

---

## 7. UI AND PRESENTATION — **CONFIRMED for the 1999 client; that client is still the one in use**

### The screen, reconstructed from the 1999 manual

([1999 manual: controls](https://www.freeinfantry.com/history/infantry/iomcontrol.htm) and
[v25 guide](https://www.freeinfantry.com/history/infantry/iomversion25.htm); UI defaults from
[Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

| Region | Contents |
|---|---|
| Upper **left** | **Energy** bar (doubles as shield), and **ammo counts for left and right hand weapons** — `---` for infinite |
| Upper **right** | **Hit points**, labelled by what you currently *are*: `MARINE: 30`. Enter a vehicle and a second line appears under it — `BUNKER 200` |
| Upper right (buttons) | **Four MODE buttons**: INVENTORY · COMMS · STATUS · OPTIONS. "The most common mode used is INVENTORY" |
| Right panel | The **inventory area** — right-click an item to assign it to a hand or a belt slot, or drop it for a teammate. Items you have no ammo for are **highlighted in red** |
| Lower right | **Radar.** `?radarsize` — default **160** px, player-adjustable |
| Bottom | **Message area**, with **tabs**: CHAT and INFO. `?namewidth` sets the name column width — default **84** px |
| Centre | The world, with **your character drawn at `?viewpercent` — default 75**, i.e. deliberately *off-centre*, so you see further in the direction you face |

**Two-handed inventory.** Right hand fires on CTRL, left hand on TAB, plus **six belt slots on
F5–F10**. That is eight weapons bound simultaneously — and the manual openly admits the cost: a tip
titled "Ammo" and another warning against "the panic of rummaging through your back pack during
combat."

### Density: extremely high, and the game knew it

Things simultaneously on screen or one click away: energy %, HP, two ammo counters, six belt slots,
a weight/encumbrance budget in kilograms, a bounty value, a full inventory grid, a radar, a
playerlist, a tabbed message log, four mode panels, and per-crew-position HP if you are in a vehicle.

⚠ For your Steam Deck problem, the two ideas here that are actually worth something are both about
*not* showing everything at once:

1. **The four MODE buttons.** One region of screen, four completely different panels, one click
   apart, with a stated default ("the most common mode used is INVENTORY"). Infantry did not try to
   fit inventory, comms, status and options on screen together — it **time-multiplexed one rectangle
   and told the player which face was normal.**
2. **`?viewpercent 75`.** The camera does not centre the player. Three quarters of the viewport is
   in front of you. On a small screen that is worth more than any amount of HUD shrinking, because it
   converts wasted behind-you pixels into sightline.

### Player-toggleable diagnostic overlays — the genuinely unusual bit

- `?showphysics` — "Puts up a grid to help you see what objects cannot be walked over
  (**green = object is half-height (shootable over), red = object is full-height (not shootable
  over)**)."
- `?showvision` — "Works like showphysics but adds the grid only to objects that **block your line of
  vision**."
- `?showvehicle` — "Shows vehicles with a small orange grid below them, helps targeting."
- `?showfog` — "Toggles LOS viewing on, off or sets it to **automatic**."
- `?mark` — "marks the player for easier visibility in **radar, playerlist and message display**" —
  one command, three surfaces, saved via `?marksave`.
([Gambit's Command Listing](https://www.freeinfantry.com/history/infantry/gambit.html))

⚠ **Infantry shipped its debug views to players.** In a game whose two defining mechanics are
line-of-sight and shoot-over-cover, the rules of cover are *invisible in the art* — so rather than
redraw the art, they let you turn on the collision grid. Green = shoot over it, red = don't. That is
a readability fix costing one shader and zero art hours, and it is directly applicable to a
top-down/isometric game where you cannot tell a chest-high wall from a tall one.

### The art and the technology

- **Isometric 2D sprites** throughout — "sprite animation graphics… complex soldier, ground vehicle
  and space-ship models on typically complex terrains."
  ([Wikipedia](https://en.wikipedia.org/wiki/Infantry_(video_game)))
- Original system requirements: **Pentium 90, 16MB RAM, 2MB video card, 28.8k modem, Windows 9x.**
  ([Gamia wikitext infobox](https://gamia-archive.fandom.com/wiki/Infantry_Online)) The 2020 press
  release still trades on it: players "each connected with 28.8K modems."
  ([Free Infantry press release 2020](https://www.gamespress.com/Free-Infantry-celebrates-being-one-of-the-longest-community-run-privat))
- **Rendering is DirectDraw, and it is still the 1999 client.** This is the community's biggest
  liability (§1). Their fix, March 2022, was to ship **cnc-ddraw** with the installer: "FreeInfantry
  now runs in fullscreen or windowed mode with higher F.P.S. and **requires no compatibility
  overrides** for modern machines."
  ([freeinfantry.com news](https://www.freeinfantry.com/))
  ⚠ i.e. the game got its modern display support from an **unrelated open-source Command & Conquer
  compatibility shim**, not from anyone touching the engine.
- Resolution is configurable but not free: a cnc-ddraw maintainer thread on Infantry notes the wish
  "to figure out how to get **higher framerates at higher resolutions**," and users report 1024×768
  as workable but "not as zoomed in as desired."
  ([cnc-ddraw issue #138](https://github.com/CnCNet/cnc-ddraw/issues/138))
  ⚠ **UNVERIFIED whether the HUD scales with resolution.** The evidence that `?radarsize` and
  `?namewidth` are specified *in pixels* strongly suggests a fixed-pixel UI over a resizable
  viewport — i.e. raising resolution makes the world bigger and the text smaller. Directly relevant
  to a Deck. I could not confirm it.
- Keyboard was **fully rebindable from the first public build** (VIEW → KEYBOARD CONFIGURATION).
  ([1999 manual, controls](https://www.freeinfantry.com/history/infantry/iomcontrol.htm))
- No controller support in the original; Steam tags list neither. The 2024 Steam release notes
  "keyboard/mouse changes we have been working through."
  ([freeinfantry.com](https://www.freeinfantry.com/))

---

## 8. WHAT KILLED IT, HONESTLY — **CONFIRMED where cited; the weighting is my judgement**

### 1. The subscription. This is the big one, and it is not close.

The wiki text is unambiguous: after May 2002, "Infantry's and Cosmic Rift's populations have
**declined drastically from daily highs of thousands at a time to a mere hundred or fewer
players**."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
A contemporaneous player: "Was a good game before sony made it P2P, after that I think **more than
90% of its population left**."
([AnandTech forums, Nov 2007](https://forums.anandtech.com/threads/infantry-online.104398/post-24445808))

⚠ But be precise about *what* was monetised, because the lesson is in the detail. SOE did not put the
game behind a wall. It put **money accumulation, stat tracking and personalisation** behind the wall
and left a 30-minute disconnect timer on the rest. So the free player got the shooting — the part
that is fun for an hour — and was denied the economy, the ladder and the identity, which are the
only three reasons anyone plays a game like this for a year. They monetised **retention** and gave
away **acquisition**. That is exactly backwards, and the population chart says so.

Worse: it never recovered. Free access returned in June 2007 — five years later — and the game
limped another five before closing. **You do not get the population back.**

### 2. Nobody was making the game

Zero-to-three staff for a decade (§1), including a stretch where the sole developer was a former
support rep who lasted a few months. By 2010 the wiki was recording, as community consensus, that
"**Player Development and content is the only real way to help Infantry survive**."
([Gamia wikitext](https://gamia-archive.fandom.com/wiki/Infantry_Online))
That is a community writing its own publisher's obituary two years early.

### 3. Onboarding — the cliff is real and it is still there

- Massively OP, quoting a launch-week Steam review: "Kind of a **steep learning curve**, but feels
  rewarding to learn how to play."
  ([MassivelyOP 2024](https://massivelyop.com/2024/04/24/community-led-infantry-online-soes-25-year-old-shooter-marches-its-way-onto-steam/))
- PCGamesN's verdict is a conditional, and the condition is the problem: "**But put the time into
  FreeInfantry**, and it's a deep and imaginative online shooter."
  ([PCGamesN](https://www.pcgamesn.com/freeinfantry/steam-launch))
- SOE's own store copy claimed the opposite — "**Easy to play and simple to get into**."
  ([Delisted Games, quoting the Station Pass page](https://delistedgames.com/infantry-online/))
  That is marketing describing a game with encumbrance in kilograms, eight bound weapons, a
  command-line store and a hundred-command chat syntax.

The structural failure: **the interesting depth was in systems the UI never taught.** Energy is
simultaneously your ammo and your shield. Weight caps your speed. Bounty makes you a target for
surviving. Each is a fine idea; none is explained on screen; all of them are being exploited against
you by someone with 600 hours.

### 4. Veterans, and a community that closed

This is the harshest finding and it is worth reading in full, because it is what happens to *every*
small persistent game that survives on its core. From current Steam reviews (Not Recommended):

> "You'll be **instantly outmatched by veterans with decades of experience**." … "New players are
> frequently **mocked or ignored**, and the environment is anything but welcoming." … "The community
> is extremely toxic. Despite most players being in their 30s or 40s, the behavior often resembles
> that of immature teenagers."

> "If you're not a part of the exclusively small 20 person cult that runs this game **you'll never
> even get to actually play any matches**." … "Most matches are in private 'arenas'."

> "You can only play skirmish except Tuesday and skirmish is the most uneventful boring thing ever."
([Steam reviews, FreeInfantry](https://steamcommunity.com/app/2830720/reviews/?browsefilter=toprated))

⚠ **The features in §4 that made the community strong are the same features that closed it.**
Player-owned private arenas, permit-only leagues, squad gatekeeping and scheduled event nights are
exactly how ~40 concurrent players sustain a competitive scene — and exactly how a new player
arrives to find the game empty, the good matches invisible in private arenas, and the door
administered by a person who has to say yes. The mechanism of survival is the mechanism of
exclusion. There is no version of this where you get one without the other; you can only decide how
much public, joinable, unscheduled game sits alongside it.

### 5. Graphics — a real problem, but the *least* of them

By 2007 a 1999 isometric sprite game looked its age, and one forum reply at the free-to-play relaunch
put it plainly: "**I doubt it'll take off again, as much as I loved it. It's too old now for most
people.**"
([AnandTech, Nov 2007](https://forums.anandtech.com/threads/infantry-online.104398/post-24445808))
But the game's *own* reviewers today are 80% positive on the same art. Sprites did not kill it.
⚠ What art *did* cost them was compatibility: a DirectDraw client that took until 2022 to run
properly on modern Windows, and only then via a third-party shim (§7). The rendering technology
outlived its usefulness long before the rendering *style* did.

### 6. Population, honestly

- ⚠ The widely repeated **"over 140,000 active players"** figure comes from **Free Infantry's own
  press releases** — the 2020 one says "at one point the game has seen over 140,000 active players";
  the 2024 one dates it: "In 2001, Infantry's unique MMO gameplay supported over 140,000 gamers."
  ([2020](https://www.gamespress.com/Free-Infantry-celebrates-being-one-of-the-longest-community-run-privat); [2024](https://www.gamespress.com/Classic-Shooter-Infantry-Online-Revived-on-Steam-After-25-Years))
  **Treat it as self-reported marketing.** It is almost certainly cumulative registered accounts, not
  concurrents — SOE's own store copy advertised "battles featuring up to **100+**" and the engine's
  own spec sheet claimed 150–200 per arena.
  ([Delisted Games](https://delistedgames.com/infantry-online/); [features page](https://www.freeinfantry.com/history/infantry/features.html))
  The only *independent* population statement anywhere is the wiki's "daily highs of thousands at a
  time" pre-2002.
- Today: all-time Steam peak **70** concurrent (Nov 2024), now ~**6 average / 46 peak**, trending
  down.
  ([SteamCharts](https://steamcharts.com/app/2830720))

⚠ Note the shape: **the Steam launch did not fix the population.** Two years of free distribution on
the largest storefront in PC gaming moved the all-time peak to seventy people. If your theory is
"discovery is the bottleneck," Infantry is the counter-example. Discovery was solved and retention
was not.

---

## WHAT I COULD NOT FIND

1. **A death penalty rule.** No source states what dying cost you. Inventory loss is the natural
   reading of a bought, carried, weight-limited loadout, but it is inference and it almost certainly
   varied per zone. §2.
2. **Whether bases had to be continuously supplied.** Team inventories (`?resources`,
   `*teamprofile`), player-built structures (`?struct`) and harvesting (Fleet) are all confirmed. A
   decay/logistics rule is not. §2.
3. **What SOE's original scripting layer was.** The C# GameType system is demonstrably the community
   emulator's (SourceForge project registered 31 Mar 2010). No source says what language SOE's own
   gametype scripts used, or whether players could write server-side rules on SOE hardware. §6.
4. **The map editor's release date.** Three candidates — 1 June 2007, July 2007, or "with the 26 June
   free-to-play launch." July has two encyclopedia mirrors citing a now-dead SOE URL and is the
   strongest; the F2P conflation is unsupported by any source. Unresolved. §6.
5. **The peak zone count under SOE.** ~16 zone names are attested; no authoritative list survives.
   233 zone archives are preserved but that is a corpus, not a concurrent count. §5.
6. **Any independent population figure.** The "140,000 active players" number is Free Infantry's own
   press release. The only third-party statement is the wiki's "daily highs of thousands at a time"
   pre-2002. No SOE figure was ever published — not even in the shutdown notice. §8.
7. **Confirmation of the Daybreak licence.** Asserted by MMOBomb and by Free Infantry's own PR;
   Massively OP wrote "we're assuming they got it." No Daybreak statement exists. §1.
8. **Whether the HUD scales with resolution** — the question that matters most for a handheld.
   `?radarsize` and `?namewidth` are specified *in pixels*, which strongly implies a fixed-pixel UI
   over a resizable viewport, but I found no direct statement. §7.
9. **The full "Infantry Editors" thread.** freeinfantry.com's forum returns HTTP 500 on every URL and
   appears dead; tool names and versions in §6 come from search-engine snippets of it.
10. **Anything from the developers.** No post-mortem, no design document, no substantive interview
    with Humble, Petersen, Weeks or Cordner about Infantry specifically. The best account of the
    studio is [danluu.com/subspace-history](https://danluu.com/subspace-history/), and it is about
    SubSpace.
11. **archive.org was unreachable** from this toolchain, which blocked the archived
    `infantryonline.com` and `station.sony.com` pages that would settle items 4 and 5. Anyone
    redoing this with Wayback access should start at `station.sony.com/casualProduct.vm?Id=039`.

---

## WHAT WAR WORLD SHOULD STEAL — AND WHAT IT SHOULD NOT

### STEAL

1. **Identity global, progress per-zone.** The best idea in the game and the one that makes
   community hosting *safe*. One account, one globally unique name, one squad, one friends graph —
   and cash, XP, inventory, skills and ladder stored per zone. A stranger can host a theatre and
   invent their own economy without touching yours, because there is no global economy to corrupt.
   You already have the shape of this: `rankings.js` is a global Elo book and `hud.theater` is a
   per-city context. Decide *now*, before anyone hosts anything, which of your numbers are
   Account-scoped and which are Zone-scoped, and put the `ZoneId` in the row.
2. **Eight blank stat columns.** `Zonestat1..8`, named by the zone's own config. A fixed schema plus
   a handful of author-defined slots is how one database serves a CTF zone, a racing zone and an RPG
   zone without a migration. Cheap, and it makes a hosted mode feel like its own game.
3. **Poll the servers; don't let them register.** The directory sends a 4-byte UDP probe every ~5s
   and reads back a player count. No heartbeat protocol, no deregistration path, no timeout logic —
   a dead zone stops answering and disappears. And an operator cannot inflate their population,
   because they never report it. Fewer moving parts *and* honest by construction.
4. **Open the software, gate the directory.** Anyone can run a server; being *listed* is an admin
   INSERT plus a per-zone password that lets you write to the shared stat DB. That is the whole
   governance model in one sentence, and it gives you a modding scene without giving away the front
   page or the ladder.
5. **The permanent `127.0.0.1` test-zone listing.** One row in the public directory, pointing at
   localhost, that every developer's client resolves to their own machine. One entry serves every
   modder. Free.
6. **A no-database offline mode.** `connectionDelay = 0` and the server runs stand-alone. The path
   from "downloaded the repo" to "playing on my own server" has no infrastructure in it. That is why
   people actually make zones.
7. **The macro variable language.** `%coord` `%exact` `%facing` `%heading` `%flagger` `%flagdrop`
   `%flagcount` `%count[item]` `%killer` — embeddable in any message, bound to a key, saved to a
   file. One keystroke sends your team *"enemy flagger DEATHBRINGER at G7 heading north"* with live
   values. This is a tactical information protocol the player composes themselves, and it is the best
   idea in Infantry that nobody copied. You already have a comic-balloon layer and a bark engine
   (`soundscape.say`); you have the render surface, you're missing the templating language.
8. **`?showphysics`: green = shoot over it, red = don't.** Infantry shipped its collision debug view
   to players, because in a top-down game the *rules of cover are invisible in the art*. You have
   exactly this problem — half-height vs full-height, interiors, `world.interiors` vs `world.cover` —
   and you already own `auditSurfaces` and the fog raster. A toggleable cover overlay is one shader
   and zero art hours, and it is a readability fix that does not compromise the look, because it is
   off by default.
9. **Bounty that rises the longer you live.** Kill value scales with the target's survival and kill
   streak, and *everyone can see it*. Self-balancing pressure on the leader with no rubber-banding
   and no hidden handicap. Legible, which is the whole point.
10. **`?squadchart` — presence with location.** One command listing every squadmate and where they
    are, across the entire game. This is the single feature that makes a small population feel
    populated: you don't open a dead game, you open a list of your people. At WAR WORLD's likely
    scale this matters more than anything in §5.
11. **Concentrate population in TIME, not in fewer zones.** Fixed weekly appointments — Twin Peaks
    Tuesdays, Skirmish Sundays, league nights — are how ~40 concurrent players sustained a 10v10
    competitive scene for 50+ seasons. Scheduling is the cheapest matchmaking there is.
12. **File broken content by the exception it throws.** Zone-Assets sorts 141 non-working zones into
    `KeyNotFoundException/` (85), `SilentClientCrash/` (31), `FormatException/` (13)… so fixing one
    server bug promotes eighty-five zones at once. A genuinely original preservation idea.
13. **`?buy grenades:10` and `?buy grenades:#` (top up to N).** A power-user tier on the store that
    turns a re-equip into one keystroke. Ship it *alongside* the clickable armoury, never instead.
14. **Two UI ideas for the Deck.** The **four MODE buttons** — one rectangle, four panels, one click
    apart, with a stated default ("the most common mode used is INVENTORY") — Infantry did not try to
    fit inventory, comms, status and options on screen at once, it time-multiplexed one region and
    told you which face was normal. And **`?viewpercent 75`**: the camera does not centre the player,
    three quarters of the viewport is ahead of you. On a 7-inch screen that converts wasted
    behind-you pixels into sightline, and it is worth more than any amount of HUD shrinking.

### DO NOT STEAL

1. **Do not paywall retention and give away acquisition.** SOE's 2002 free tier removed *money
   accumulation, stat tracking and personalisation* and left the shooting free — it sold the hour-two
   systems and gave away the hour-one ones. The population went from "thousands daily" to "a hundred
   or fewer" and **never came back**, not even after five years of free access. If you ever charge
   for anything, charge for something that is not the reason people stay.
2. **Do not let permit-only be the only good game.** CTFPL and SL were "permit only. Players must
   private message administrators." Today's Steam reviews: *"If you're not a part of the exclusively
   small 20 person cult that runs this game you'll never even get to actually play any matches. Most
   matches are in private 'arenas'."* The same structures that let a tiny population run a real
   competitive scene are the structures that make a newcomer bounce. You cannot remove them — you can
   only guarantee that a stranger who logs in at a random hour finds a joinable, public, unscheduled
   fight. Infantry did not.
3. **Do not ship depth the UI never teaches.** Energy is your ammo *and* your shield. Weight caps your
   speed. Surviving raises your bounty. Three good mechanics, none explained on screen, all being used
   against you by someone with 600 hours — while the store page said "Easy to play and simple to get
   into." Your slot chips already carry a glyph, a range word and a hover line; that instinct is
   correct and Infantry is the argument for pushing it further.
4. **Do not build one editor per file type.** Eight separate tools across `.lvl .cfg .itm .veh .rpg
   .lio .blo .cfs`, no unified project, no shared undo, and in 2026 they need a Windows XP virtual
   machine. Your ATLAS is already the better answer — one tool, live 3D, validation in the panel, the
   same assertions the headless sweep runs. Keep it one tool.
5. **Do not require code for a new mode.** "It is highly likely you will need to create a custom Game
   Type" is where Infantry's non-programmer ceiling sits, and it is why the RPG and RTS zones are rare
   exceptions rather than the norm. You already have `MODE_IMPL` with `setup/tick/onKO/isOver/hud`
   and `data/modes.js` — the discipline to hold is that a new mode should be **declarable in data
   for the common cases**, with script as the escape hatch, not the entry fee.
6. **Do not take a rendering dependency you cannot replace.** The single largest tax on Infantry's
   survival is that it is still the 1999 DirectDraw client; the community's 2020 letter to Daybreak
   was mostly about that, and the fix, when it came in 2022, was an unrelated open-source Command &
   Conquer shim. You own your whole stack in Three.js. Keep it that way — and note that this is the
   same law your own `print pass` already follows by branching one shader instead of chaining eleven.
7. **Do not treat a "beginner zone" flag as onboarding.** One bit on the zone record, in a game whose
   Steam reviews in 2025 read *"You'll be instantly outmatched by veterans with decades of
   experience"* and *"new players are frequently mocked or ignored."* A flag is not a ramp.
8. **Do not let zone count outrun population.** Seven zones, three players, all three in one of them.
   Every additional hostable surface divides the same people. If you go community-hosted, decide in
   advance what *forces* convergence — a default zone, a rotation, a scheduled event, an in-client
   "where is everyone" — because the directory will not do it for you.
9. **Do not rely on the community being the developer.** By 2010 Infantry's own wiki recorded, as
   consensus, that "Player Development and content is the only real way to help Infantry survive."
   That is a community writing its publisher's obituary. Tools multiply an active developer; they do
   not replace one. Infantry's last decade had between zero and three people on it — one of them a
   former support rep — and no amount of player content changed the outcome.
10. **Do not assume distribution is the bottleneck.** Free Infantry got the thing it spent four years
    asking for: a Steam listing, free, no microtransactions, on the largest storefront in PC gaming.
    All-time peak concurrency: **70**. Two years later it is averaging six. Discovery was solved.
    Retention was not, and retention is §8 items 3 and 4.
