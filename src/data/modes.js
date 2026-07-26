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
  { id: 'tournament', name: 'TOURNAMENT', tag: 'The Invitational', icon: '🏆', accent: '#ffd24a',
    desc: 'Eight seeds off the power rankings, single elimination. Matches are best-of-3 ELIMINATION rounds — last side standing, nobody respawns. Formats: 1v1, 2v2 duos, underdog 1v2. Team damage is ON.' },
];
