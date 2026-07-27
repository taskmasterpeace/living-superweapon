# THE BRIEFING — written to be read aloud

*2026-07-27. Robert asked for this in a form he can have read back to him in the shower. So it is
prose, not tables. The ten questions first, because he asked for those in order.*

---

## PART ONE — THE TEN QUESTIONS, ANSWERED

**One. What engine.** A custom web stack. Three point js, version zero point one seven zero, in
TypeScript, built with Vite. That is the same engine Ascension runs, which is why a Passport between
the two games is realistic and why the harness can be unified. There is no Godot, Unity or Unreal
anywhere in this project and there should not be.

**Two. Is the city builder tile-based, voxel-based, modular-mesh, or hybrid.** Hybrid, and it is worth
being precise because the answer differs by game. War World is genuinely tile-based — the simulation
has a TILE constant, a WORLD size and a GRID, and there is a separate influence grid on top with cells
four tiles across. Ascension is modular-mesh — its cities are built from mesh builders placed on a
ninety-six unit lattice, not from tiles. Neither is voxel and neither should become voxel.

**Three. The canonical unit.** Metres, and this is already settled by a rule the whole project obeys.
One engine unit is nought point one nine metres, so a person is nine point six units and one point
eight metres. Every measurement in either game converts through that one number. Anyone who invents a
second scale is making a bug.

**Four. Which building classes matter first.** Not the list the question offers. War World is a
military shooter, so the order is: industrial and warehouse first, because that is where a firefight
with vehicles actually happens; then civic and institutional, because those are the objectives worth
fighting over; then commercial; and housing last, because a row of identical homes is the least
interesting fight in the game. Suburban houses are the wrong thing to build first here even though
they are the easiest.

**Five. Do all buildings need interiors, or only flagged ones.** Only flagged ones, and the codebase
already says so — there is a map in there described in its own comments as having almost no interiors,
built deliberately so armour and aircraft have room to move. That is the right instinct. An interior
costs collision, line of sight, navigation and lighting, so a building earns one by being worth
entering.

**Six. Are roofs and exteriors solved.** In Ascension, yes, thoroughly — facades, window bays, roofs,
region skins, all of it. In War World the generator will need to author them. But the important thing
is that Ascension already learned the hard lessons here and wrote them down, in particular the window
bay bug, where every storey in the game came out under a metre tall because one number treated a whole
facade texture as a single floor. Do not re-learn that.

**Seven. Do interiors need destruction, navigation, loot and line of sight.** Yes to line of sight and
yes to navigation, and those two are not optional — an interior nobody can see through or walk through
is scenery. Loot follows for free because the game already has ground pickups. Destruction is the one
to defer, and deliberately: a destructible interior wall changes navigation and line of sight
mid-fight, which means the navigation and vision systems have to handle a world that changes shape
while they are running. Build the interior first, break it later.

**Eight. Furniture: realistic, game-readable, or cluttered.** Game-readable, and it is not close.
Every piece of furniture in a shooter is either cover, an obstacle, or a lie. Clutter that does not
change how the room plays is a frame-rate cost and a visual noise cost for nothing. The test for any
prop is simple: can you shoot over it, hide behind it, or does it slow you down. If the answer is
none of those, it should not be there.

**Nine. Two-step workflow — semantic plan first, then geometry.** Yes, absolutely, and this is already
how Ascension works, so it is proven rather than theoretical. The plan is pure data with no rendering
code in it at all, and the geometry is built from the plan afterwards. That separation is why the map
tool can validate a city before anything is drawn, and why a plan can be saved, loaded and edited.
Never let geometry decisions leak into the plan.

**Ten. Should I turn this into a technical spec.** Yes, but not yet, and here is the honest reason. A
spec written before the harness exists cannot be checked, and the whole lesson of the last two days is
that work which cannot be seen gets approved while broken. The harness is about two hours. The spec is
better written the day after it, because then every rule in it can have a test.

---

## PART TWO — WHAT YOU DECIDED TODAY

**The garage door.** You are right and the current number is far too small. The doorway constant in
the floor plan generator is five point six units, which is one point zero six metres — a household
door. A vehicle entrance needs to be roughly ten times that in width and two storeys in height, so
aircraft and armour can get inside a building. This is not a tweak, it is a second kind of opening
with its own rules, and it changes what a building is for: a warehouse with a vehicle door is a
garage, a hangar, a repair bay and an ambush all at once. This is the single most valuable interior
feature in the list, because it is the one that makes interiors matter to the vehicles.

**Prone instead of crouch.** Your reasoning is correct and it is a stronger argument than you gave
yourself credit for. Crouching shortens you but does not change your outline, so at this camera it
reads as almost nothing. Going prone changes your silhouette completely — you become long and thin
instead of short and wide — and that is a real tactical difference rather than a cosmetic one. And the
rolling matters: rolling left and right gives small precise movements that no other control provides.

One warning, and it is a real one. Crouch is already load-bearing in War World. There is a rule in the
map code, dated the twenty-fourth, that defines a crouched profile line against cover heights and
rubble heights. Changing crouch to prone changes what a piece of cover protects, everywhere, at once.
That is a good change but it is not a small one, and it wants its own session.

**Glass, and hearing someone through it.** This is the best small idea in the message. The audio system
already places every sound in the world and falls off with distance, and the pedestrians already have
positional voices. So a window is not a new system — it is a hole in a wall that sound passes through
and sight does too. Which means glass gives you three things at once for almost nothing: you can see
in, they can see out, and you can hear where someone is standing before you can see them.

**The Choir.** Renamed from Querent. It is a better name and it fits the myth better than the old one
— a choir is many voices that were once one, which is exactly what the seven fragments are. The rest
of the design stands, and it got cheaper today: it is not a place you travel to, it is a designation
you are born with, a rare roll at character creation, a thin layer on the sheet.

---

## PART THREE — WHAT I NEED FROM YOU

Six questions. Answer whichever you have opinions about; I can proceed on defaults for the rest.

**One. The vehicle door — does it need to be openable and destructible, or is an opening enough for
now?** An opening is one number. A door that opens is animation, state, and something the AI has to
understand. I would ship the opening first.

**Two. Prone — replace crouch entirely, or have both?** Both is more control but it is another button
on a Steam Deck that is already short of buttons. My instinct is replace.

**Three. When you say the interior is your priority — do you mean the EDITOR to build them, or the
interiors themselves in a playable map?** These are different weeks of work and I do not want to guess.

**Four. For the Steam Deck target — what is the actual finish line for "playable"?** One map, one mode,
one class, running at a locked frame rate would be a real answer. So would something bigger. I need to
know what counts.

**Five. Codex running in parallel — what do you want it doing?** My honest read is that the highest
value split is Codex on mechanical breadth, meaning many small independent files, while I hold the
things that need one consistent mental model. Two agents editing the same system is how you get a
merge conflict with opinions.

**Six. The image pipeline and the UI database.** Both are real and both are for LATER, and I want to
say that plainly rather than let them quietly become this week. The user-interface database is a
genuinely good reference and it costs nothing to collect. Generating reference images and feeding them
back for analysis is a proven pattern and we can absolutely build it. But neither one gets War World
onto the Steam Deck, and you told me that is priority one.

---

## PART FOUR — THE THING I WANT TO SAY PLAINLY

You said you want me clear on what we are building before I build towards it. So here it is, as I
understand it, in one paragraph.

We are building one universe that runs on more than one engine, where the same person can exist in a
military shooter and in a superhero game and be recognisably themselves, carrying their injuries,
their reputation and eventually a cosmic designation between them. The thing that makes it possible is
not shared code, because the two games have almost nothing in common technically. It is a shared
contract — a small honest description of a person that both games agree to read and write. Everything
else is each game being the best version of itself. War World is a military shooter about fireteams
and territory. Ascension is a superhero game about scale and consequence. The Choir is the thing that
connects them without either one having to become the other.

And the reason the harness comes first, before any of it, is that a contract between two games cannot
be tested from inside either one of them. That is not a technical detail. It is the whole reason the
harness is item zero.
