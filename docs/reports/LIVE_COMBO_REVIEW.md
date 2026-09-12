# Live combo and finisher review

Runtime revision `cf13a1eb862f7e74721d96285918c8a203516601`, stable source throughout. Ordinary SOL/WEBLINE sparring with keyboard and mouse inputs; no actor, health, AI or physics overrides. Flight and sprint close the initial distance; the connected sequence below occurs on the ground.

| Simulation time | Contact | Resolved HP loss |
| --- | --- | --- |
| 5.960984 | WEBLINE return light on SOL | 9.550464 |
| 6.140284 | SOL light, index 0 | 11.33184 |
| 6.511484 | SOL light, index 1 | 9.4432 |
| 6.920184 | SOL finisher, index 2 | 20.0668 |
| 9.212508 | WEBLINE airborne return light | 12.4156032 |

After the connected finisher, sampled root separation grows from 3.9945 to 14.7042 units at 7.398208s, then falls as the driver attacks and pursues again. WEBLINE eventually wins. This establishes a connected live sequence, spacing and retaliation; it is not a roster-wide balance verdict, nor proof that an unguarded stunned defender can interrupt every contact. Earlier native guard, evade and startup-interruption trials establish those distinct cases.

Evidence in the primary checkout: `artifacts/marketing/combat-pass-2026-09-12/ai-defense-live-combo-flight-finisher-candidate/`. Zero runtime errors, source stable, video and actual master audio saved. Inspected `combo-40.png`: both fighters, close contact and hit/status feedback are visible beside terrain; partial body cutaway prevents player obstruction. Audio remains unauditioned.

The preceding `ai-defense-live-combo-finisher-candidate` run failed to reach combat: grounded guarded pursuit fell behind WEBLINE. It contains no melee contacts and must not count as successful combat validation.
