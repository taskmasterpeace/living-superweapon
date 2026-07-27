// WAR WORLD: ASCENDANTS — game modes (menu metadata; logic lives in game.js MODE_IMPL).
export const MODES = [
  { id: 'duel', name: 'DUEL', tag: '1v1', icon: '⚔', accent: '#ff5a4a',
    desc: 'Pure one-on-one. First to 3 KOs takes it. No dummies, no distractions — just you and a rival.' },
  { id: 'survival', name: 'SURVIVAL', tag: 'Waves', icon: '🔥', accent: '#ffb03a',
    desc: 'Endless waves of rivals that grow stronger every round. Level up, chain kills, and see how long you last. 3 lives.' },
  { id: 'rumble', name: 'RUMBLE', tag: 'Free-for-all', icon: '💥', accent: '#7fe6ff',
    desc: 'Four-way chaos. You (and a friend) versus a pack of rivals. First to 12 KOs — or the top score when the clock runs out.' },
  { id: 'freeroam', name: 'FREE ROAM', tag: 'The living city', icon: '🌆', accent: '#8fe08a',
    desc: 'No objective, no clock, no opponent — a real city, running. Traffic, pedestrians, birds, weather and the day/night cycle, with the police response live: hurt civilians and the theatre answers. B orders a rival if you want one, N a sparring construct. Fly high enough on a lit afterburner and you can leave for another city — or another planet.' },
  { id: 'lab', name: 'THE TRAINING HALL', tag: 'Blue room · white room', icon: '📐', accent: '#e8e2d6',
    desc: 'A two-storey indoor hall with two rooms. You arrive in the BLUE ROOM: a bag, a ramp to the upper floor, and nothing that can hurt you — learn the controls at your own pace. The console opens the WHITE ROOM next door, where the machinery lives: moving targets on rails, wall turrets that shoot back, a flight course, a sparring partner, and a wall board measuring every attack you land at the damage choke point.' },
  { id: 'boxing', name: 'THE RING', tag: 'Real rules', icon: '🥊', accent: '#c9564a',
    desc: 'A boxing ring, and inside it the ring’s rules win. NO FLYING — feet on the canvas. The ropes give back most of your speed, so being knocked into them returns you to the middle at pace, and momentum melee turns that into damage. Three rounds, a real ten-count when you go down, three knockdowns ends it, and a ten-point-must card if it goes the distance. The board over the ring reads the fight live: landed, thrown, accuracy, knockdowns, points.' },
  // POWERWORLD — the second dimension (docs/POWERWORLD.md). ⚠ This is the PROVING GROUND for the
  // chase loop, deliberately shipped BEFORE the third-person camera: Robert's own build order says
  // prove it in the isometric view first, because if it is not fun there the camera will not fix it.
  { id: 'powerworld', name: 'POWERWORLD', tag: 'The chase loop', icon: '🌀', accent: '#7fd8ff',
    desc: 'Another dimension, and its rules are not the city’s. The sky is open — no ceiling to dock against, no deck to be eased onto. A knockback CARRIES: hit someone hard and they travel, which turns a trade into a chase you have to fly down. Nobody lives here, so nobody films you and nobody answers a call. The camera and the stages come later; this is where the fight itself gets proven.' },
  { id: 'tournament', name: 'TOURNAMENT', tag: 'The Invitational', icon: '🏆', accent: '#ffd24a',
    desc: 'Eight seeds off the power rankings, single elimination. Matches are best-of-3 ELIMINATION rounds — last side standing, nobody respawns. Formats: 1v1, 2v2 duos, underdog 1v2. Team damage is ON.' },
];

/**
 * DOES THIS THEATRE HAVE A CIVIL SOCIETY?
 *
 * ⚠ ONE DEFINITION, because it was being asked as a magic string in two unrelated files: the police
 * getter (`police.js` — `modeId !== 'training'`) and the news crew (`newscrew.js` — the same test
 * again). Both mean "are there civilians here to protect, and a press to report it", and both would
 * have had to be edited by hand for every new dimension. POWERWORLD has nobody living in it, so
 * there is no one to hurt, no call to answer and no broadcast to make.
 */
const NO_CIVIL = new Set(['training', 'powerworld']);
export const hasCivilians = (modeId) => !!modeId && !NO_CIVIL.has(modeId);

/**
 * ARE YOU STANDING IN THE CITY THE PLAN DESCRIBES?
 *
 * ⚠ A DIFFERENT QUESTION FROM `hasCivilians`, and conflating them would be wrong in both
 * directions. A VENUE — the ring, the training hall, the base — replaces the world without ever
 * touching `world.plan`, so the plan still says TOKYO while you are standing in a boxing hall.
 * That has always made the city nameplate print a stale city name, which is cosmetic. It is NOT
 * cosmetic for the district reaction table (data/districts.js): announcing "MEDICAL — RAPID
 * RESPONSE · PROTECTED" inside a sealed hall with no civilians and no responding units is a lie
 * about the rules of the fight the player is actually in.
 *
 * Declared here rather than sniffed from world state (`_indoor`, cover counts, arena size) because
 * none of those separate the venues cleanly and all of them would break the first time a venue was
 * built differently. A mode knows whether it kept the city; it should say so.
 */
const NO_CITY = new Set(['boxing', 'lab', 'base', 'powerworld']);
export const hasCity = (modeId) => !!modeId && !NO_CITY.has(modeId);
