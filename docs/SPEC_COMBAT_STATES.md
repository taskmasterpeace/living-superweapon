# Combat Feel and Status Spec — Read-Aloud Edition

This is the implementation spec for the approved combat work: momentum melee, throwing people
into things, the second wind, and the expanded status family. It is written to be read aloud.
Where a system already shipped, it says so. The pasted Power System Expansion Brief is the
companion catalog document; its five readability tests — grayscale, freeze-frame, half-second,
combat-chaos, and status — are the acceptance bar for everything below.

## Part One. Momentum Melee. The blank, filled: melee becomes more kinetic.

The rule. When a strike connects, read the attacker's speed at the moment of contact.
Below twelve units per second, nothing changes — a standing jab stays a jab.
Above that, damage and knockback climb together, up to roughly two and a half times
at full cruise. A flying punch is a different animal from a standing one.

Where it lives. One read of the fighter's velocity inside the melee strike path.
The engine already knows the speed; cruise already draws speed lines past thirty-eight
units per second. The impact star and the hit sound scale with the same number,
so the player HEARS the difference before reading any number.

The dive punch. Flying plus descending plus strike equals a launcher: extra down-force
on the victim, a ground shockwave on arrival, and the attacker's own landing crouch.

The law that does not move. A blocked strike still bounces the attacker — momentum makes
the reward bigger, never the safety. Blocked momentum hits obey the block law unchanged.
The trifecta stays sacred.

The bots. Fliers with high air tendency open engagements with a cruise-punch approach.
Difficulty buys judgment about when, never extra physics.

## Part Two. Grab a person, throw them into something.

Today the clinch exists, back grabs exist, and slam physics already hurts anyone
hurled into a wall, the ground, or the arena edge, crediting the thrower.
What is missing is the aimed throw.

The spec. While clinching, the thrower aims. The dotted parabola — the same arc
the props use, the arc that never lies — shows where the body will land.
Release hurls the victim along it. Throw speed scales with strength.
The victim flies with launch time set, so every existing slam rule fires:
wall crunch, ground crater, tower crack, thrower credit.

The new check. A thrown BODY that passes through another fighter hits them too —
both take damage, both are launched. Throwing one enemy into another is the
highest expression of the move and the reason it exists.

The tell. The victim struggles visibly during the aim. Strength against strength
decides how long the window lasts before they break free.

## Part Three. The Status Family.

The engine already speaks: stagger, frozen, poison, burn, gas, drain, and mind control.
Two more shipped this week and three are specified here.

Stunned. SHIPPED. Twenty-four percent of max health inside a rolling two-second window
scrambles anyone: no actions, guard drops, a flyer falls out of the sky, three gold
stars orbit the head. Blocking is the counter — guarded damage never enters the window.
Four seconds of immunity after. It is in the combat manual, section nine.

The Second Wind — the get-up. Once per match, a human player's lethal blow becomes
a DOWNED state instead of a knockout. Time slows. The words STAY DOWN appear.
Holding any attack input for one second rises the fighter at a quarter health
with Overdrive burning — drained fists refill energy, the comeback attribute
finally gets its moment. The opponent's counterplay: a heavy strike on the downed
body inside the window finishes it for real. Bots never get the second wind;
it is a player's drama, not a simulation rule. Invincible always gets up.

Bleeding. NEW. Heavy physical hits and every slash-class weapon can open a wound.
A bleed ticks health slowly — and here is the identity — MOVING MAKES IT WORSE.
Sprint and the wound tears; stand and it clots, stopping entirely after several
still seconds. The tell is unmistakable: red drips falling DOWNWARD from the wound
point, a darkening patch on the suit, a faint trail on the ground behind a runner.
Downward red drips belong to bleeding alone — drain pulls inward, poison blooms
green, fire flickers up. Carried by at least the blade kits and the claw fighters:
two carriers, two delivery systems, per the mechanic protocol.

Sleep. NEW. The payload lane's proving power, from the brief. A sleep payload on
arrows and darts: the victim folds slowly to the ground, uncontrolled, and wakes
instantly on any damage. Pale gold rings and three slow dots overhead — rounded
and soft where stun's stars are sharp and orbiting fast. One status field,
one wake rule, one tell; it validates every future payload.

Blind. NEW. A smoke payload that scrambles artificial-intelligence aim inside the
cloud and breaks target lock. The blinded fighter shows a blocked-eye mark; shots
from inside the cloud visibly miss. It rides the belief system the bots already
honor — a blinded bot hunts what it believes, and it believes wrongly.

The status language rule. No two statuses share a silhouette, a direction of motion,
and a color. Frozen grows up from the feet. Stun orbits the head. Sleep sinks.
Bleed drips down. Drain flows inward. Gas lingers. The player names the state
from half a second of grayscale footage or the tell has failed.

## Part Four. Order of Work.

First, momentum melee — hours, not days, and it changes every fight.
Second, the aimed throw — one day; slam physics already does the killing.
Third, bleeding — one day; the DoT plumbing exists, the movement coupling is new.
Fourth, the second wind — one day, player-only, Overdrive is the donor.
Fifth, sleep and blind together — they share the payload lane and prove it for
everything the catalog brief wants to ship afterward.

Every one of these lands with its combat manual entry in the same commit,
a headless verification with real numbers, and the five readability tests
from the companion brief as the final gate.
