// WAR WORLD: ASCENDANTS — game modes (menu metadata; logic lives in game.js MODE_IMPL).
export const MODES = [
  { id: 'duel', name: 'DUEL', tag: '1v1', icon: '⚔', accent: '#ff5a4a',
    desc: 'Pure one-on-one. First to 3 KOs takes it. No dummies, no distractions — just you and a rival.' },
  { id: 'survival', name: 'SURVIVAL', tag: 'Waves', icon: '🔥', accent: '#ffb03a',
    desc: 'Endless waves of rivals that grow stronger every round. Level up, chain kills, and see how long you last. 3 lives.' },
  { id: 'rumble', name: 'RUMBLE', tag: 'Free-for-all', icon: '💥', accent: '#7fe6ff',
    desc: 'Four-way chaos. You (and a friend) versus a pack of rivals. First to 12 KOs — or the top score when the clock runs out.' },
  { id: 'training', name: 'TRAINING', tag: 'Sandbox', icon: '🎯', accent: '#8fe08a',
    desc: 'Punching bags and a sparring partner. Test every power, learn the trifecta, no pressure. Endless.' },
  { id: 'lab', name: 'THE TRAINING HALL', tag: 'Blue room · white room', icon: '📐', accent: '#e8e2d6',
    desc: 'A two-storey indoor hall with two rooms. You arrive in the BLUE ROOM: a bag, a ramp to the upper floor, and nothing that can hurt you — learn the controls at your own pace. The console opens the WHITE ROOM next door, where the machinery lives: moving targets on rails, wall turrets that shoot back, a flight course, a sparring partner, and a wall board measuring every attack you land at the damage choke point.' },
  { id: 'tournament', name: 'TOURNAMENT', tag: 'The Invitational', icon: '🏆', accent: '#ffd24a',
    desc: 'Eight seeds off the power rankings, single elimination. Matches are best-of-3 ELIMINATION rounds — last side standing, nobody respawns. Formats: 1v1, 2v2 duos, underdog 1v2. Team damage is ON.' },
];
