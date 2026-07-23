// Living Superweapon — game modes (menu metadata; logic lives in game.js MODE_IMPL).
export const MODES = [
  { id: 'duel', name: 'DUEL', tag: '1v1', icon: '⚔', accent: '#ff5a4a',
    desc: 'Pure one-on-one. First to 3 KOs takes it. No dummies, no distractions — just you and a rival.' },
  { id: 'survival', name: 'SURVIVAL', tag: 'Waves', icon: '🔥', accent: '#ffb03a',
    desc: 'Endless waves of rivals that grow stronger every round. Level up, chain kills, and see how long you last. 3 lives.' },
  { id: 'rumble', name: 'RUMBLE', tag: 'Free-for-all', icon: '💥', accent: '#7fe6ff',
    desc: 'Four-way chaos. You (and a friend) versus a pack of rivals. First to 12 KOs — or the top score when the clock runs out.' },
  { id: 'training', name: 'TRAINING', tag: 'Sandbox', icon: '🎯', accent: '#8fe08a',
    desc: 'Punching bags and a sparring partner. Test every power, learn the trifecta, no pressure. Endless.' },
  { id: 'tournament', name: 'TOURNAMENT', tag: 'The Invitational', icon: '🏆', accent: '#ffd24a',
    desc: 'Eight seeds off the power rankings, single elimination. Matches are best-of-3 ELIMINATION rounds — last side standing, nobody respawns. Formats: 1v1, 2v2 duos, underdog 1v2. Team damage is ON.' },
];
