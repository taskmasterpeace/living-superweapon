# User design answers — received 2026-09-10

Source: `C:/Users/taskm/Downloads/powerworld-design-decisions.json`.
Source SHA-256: `81F785E632D767359B95CC18895774ADF4039B2EA87E0461E6D0D5DF08C801D6`.
Export timestamp: `2026-09-11T00:43:14.029Z` (UTC).

The user asked this task to read these answers. Treat them as supplied design direction. The export labels every answer **Draft**; preserve that metadata rather than silently converting it to Locked. This records choices, not implementation completion. The [preserved export](2026-09-10-user-design-decisions.json) is semantically identical to the download, with normalized formatting.

## Direction for the playable slice

- Scarce living superweapons alongside player/AI clones; one small commanded fireteam per player.
- Give infantry a purpose through equipment, intel, constrained spaces and distributed objectives—not artificial parity with heroes.
- Match-local genome research and curated two-strain hybrids; no permanent direct-stat advantage or random failed mutations.
- Design for 8/16/32 players eventually; this export is not evidence that multiplayer exists.
- Grounded, human-scale heroes may pilot; flying and oversized heroes may not.
- Cover effectiveness must consider obstruction, material and thickness. Eye beams penetrate designated thin materials, not arbitrary terrain.
- Soldiers acquire imperfect, delayed sensor/squad tracks. Do not turn sensors into perfect aim assistance.

These favor distinctive power jobs: breach, intercept, restrain, suppress, shield, displace, finish. Multiple colored versions of the same damage button do not establish those jobs.

## All supplied answers (41)

### q01: How many human players are you targeting per match? 8? 16? 32? 64?

Support 8, 16, and 32-player matches with objectives, AI population, and map activity scaling to lobby size.

### q02: Are the clone soldiers players, AI, or both?

Clone soldiers can be controlled by players or AI through the same movement, damage, equipment, and objective rules.

### q03: Can one player command AI clone squads?

A player may command one small AI clone fireteam using move, defend, follow, attack, and interact orders.

### q04: Does every player select a hero, or are superweapons scarce?

Living superweapons are scarce team assets, while most human players serve as infantry, specialists, pilots, or commanders.

### q05: Who controls aircraft? Players exclusively or AI too?

Both players and AI can control aircraft, with players receiving full flight controls and AI using bounded mission behaviors.

### q06: Can superweapons pilot vehicles, or would that be pointless?

Grounded and human-scale heroes may pilot compatible vehicles, while flying or oversized superweapons cannot.

### q07: Can a Superman-tier character pick up vehicles?

Strategic-strength superweapons can lift vehicles up to their mass rating after a committed pickup action.

### q08: Can they throw vehicles?

Eligible superweapons can throw lifted vehicles through a slow, energy-costly action that turns the vehicle into a destructive projectile.

### q09: Can they grab another flying player?

Flying players can grab one another through a committed aerial intercept with a short escape contest and forced release timer.

### q10: Can they carry soldiers?

Superweapons can carry consenting allies and incapacitated soldiers for rescue or extraction, but cannot fight normally while carrying them.

### q11: Can players be captured instead of killed?

Players can be captured only in modes built around live recovery, with bounded restraint time and teammate rescue opportunities.

### q12: How long should a normal match last: 15, 30, 45, 60 minutes?

Target roughly 30-minute normal matches, with overtime only for actively contested final objectives.

### q13: Is there persistent progression between matches?

Between matches, players retain cosmetics, mastery records, and unlocked sidegrades, but not direct statistical power.

### q14: Is genome research match-specific or persistent?

Genome research is match-specific; recovered strains unlock temporary derivative capabilities only for that battle.

### q15: Can factions create custom hybrid soldiers from multiple genomes?

Factions can create hybrid soldiers only from curated two-strain recipes with defined tradeoffs and visual identity.

### q16: Can enhancements fail or mutate?

Enhancements do not randomly fail or mutate; paid research yields a predictable authored unit.

### q17: Can the enemy steal research rather than stealing a corpse?

Enemy research can be stolen from a lab, but copied data is slower or capped compared with a recovered genome sample.

### q18: Can the cloning facility itself be infiltrated?

Cloning facilities contain a limited authored infiltration route inaccessible or awkward for large superweapons.

### q19: Can enemy players disguise themselves as clones?

Only an infiltration specialist can disguise as an enemy clone, with explicit tells and actions that expose the disguise.

### q20: Can you capture an enemy cloning facility?

Teams can temporarily capture an enemy cloning facility to deny respawns and gain a constrained forward deployment point.

### q21: What happens when your clone reserve hits zero?

At zero clone reserve, no new clone bodies can spawn; surviving units may still complete objectives or restore production.

### q22: Does the player then permanently die for that match?

With no clone reserve, a dead player cannot respawn a new body but may assume control of an available allied unit or support station.

### q23: Can clones replenish through resources?

Clone reserve can be replenished slowly through controlled facilities and delivered resources, subject to a maximum stock and interruption.

### q24: Are civilians simulated continuously or spawned around objectives?

Civilians persist by settlement and identity, with full simulation activated only around relevant players and events.

### q25: Do civilians remember what they witnessed?

Civilians remember a bounded set of witnessed events during the match and can later report or describe those facts.

### q26: Can civilians flee and report your position?

Civilians can report what they witnessed only after reaching a communication point or allied authority, giving players a counterplay window.

### q27: Can civilians lie during interrogation?

Civilians may lie only when their faction support, fear, or coercion state motivates it, with readable credibility clues.

### q28: Can they support one faction?

Civilians can support a faction based on local history and conduct, enabling bounded intelligence and logistics assistance.

### q29: Can destroying civilian infrastructure create refugees?

Infrastructure destruction creates abstracted refugee flows represented by bounded groups, route congestion, and humanitarian objectives.

### q30: Does escalation affect only military reinforcements, or the world itself?

Escalation changes military response and bounded world conditions such as curfews, civilian movement, checkpoints, and emergency services.

### q31: Can both sides become equally brutal?

Both factions can become equally brutal; escalation evaluates actions and consequences symmetrically.

### q34: How much terrain can eye beams penetrate?

Eye beams penetrate authored thin-material depths but cannot tunnel freely through terrain or major structures.

### q35: Can beams cut through vehicles?

Sustained beams can cut through vehicle armor after material- and power-dependent contact time, damaging components along the path.

### q36: Can powers destroy terrain?

Powers can destroy authored props and structure components and create bounded terrain deformation, but cannot freely excavate the whole map.

### q37: Can a Goku-tier blast permanently alter the battlefield?

A Goku-tier blast can permanently alter designated battlefield terrain for the remainder of that match, with hard deformation limits.

### q38: What exactly counts as cover against a superweapon?

Cover against a superweapon requires line-of-effect obstruction plus sufficient material/thickness rating for that attack family and duration.

### q39: How do ordinary soldiers detect extremely fast characters?

Soldiers combine deployable sensors and shared sightings into delayed speedster tracks that support ambushes but not perfect targeting.

### q40: Does radar detect biological flyers?

Radar detects biological flyers conditionally based on altitude, speed, size, energy output, and terrain masking.

### q41: Does infrared?

Infrared detects flyers through a heat-signature model affected by power use, weather, range, and physical occlusion.

### q49: Why are these factions fighting?

The war began when factions rejected a shared genome-control regime and now fight over living-weapon sovereignty, cloning access, and proliferation.

### q50: Most important: what can an ordinary rifleman accomplish that your strongest superweapon cannot?

An ordinary rifleman can quietly identify people, enter constrained spaces, operate equipment, collect intelligence, and hold one of many simultaneous objectives that a conspicuous superweapon cannot cover alone.

## Unanswered (9)

- **q32** — Are there neutral factions?
- **q33** — Are there police/local military forces separate from both teams?
- **q42** — Can supers hide their energy signature?
- **q43** — What happens when a sniper shoots a superweapon in the eye?
- **q44** — Are powers governed by energy, cooldowns, stamina, or combinations?
- **q45** — Can soldiers develop countermeasures after studying a power?
- **q46** — Can powers interact—beam vs beam, shield vs missile, electricity vs vehicle, etc.?
- **q47** — Can superweapons defect?
- **q48** — Are they people with agency or literally government-owned biological weapons?

No flight-gear or hero/jet/missile speed-ratio question appears in this export. Previous speed discussions remain a separate backlog item; these answers do not supply a numeric tuning decision.
