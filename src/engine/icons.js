// THRESHOLD — the stat symbol language. One tiny inline-SVG per concept, used identically on
// the select screen, the character sheets, and ORIGIN — so a shield always means defense and
// a crosshair always means range. Stroke-based, currentColor, house stroke-width 2.
const P = {
  power:     '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"/><circle cx="12" cy="12" r="3"/>',
  strength:  '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  range:     '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  mobility:  '<path d="M4 5l7 7-7 7M13 5l7 7-7 7"/>',
  defense:   '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
  health:    '<path d="M12 21C7 16.5 3 13 3 8.7 3 6 5 4 7.6 4c1.8 0 3.4 1 4.4 2.6C13 5 14.6 4 16.4 4 19 4 21 6 21 8.7c0 4.3-4 7.8-9 12.3z"/>',
  energy:    '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  fighting:  '<path d="M4 4l14 14M20 4L6 18M15 19l4-4M5 15l4 4"/>',
  agility:   '<path d="M3 8h11a3 3 0 1 0 0-6M3 12h15a3 3 0 1 1 0 6M3 16h7"/>',
  might:     '<path d="M6 5h9l3 3-3 3H6zM10 11v10"/>',
  vigor:     '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  intellect: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  awareness: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  resolve:   '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21M5 13c0 4.5 3 8 7 8s7-3.5 7-8M3 13h4M17 13h4"/>',
  threat:    '<path d="M12 3L2 20h20zM12 9v5M12 17.5v.5"/>',
  flight:    '<path d="M21 3L3 11l7 2 2 7z"/>',
  pin:       '<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  person:    '<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5"/>',
};
// what each symbol MEANS — used for tooltips so nobody has to guess
export const ICON_MEANING = {
  power: 'Power — heaviest single hit', strength: 'Strength — melee muscle & knockback',
  range: 'Range — how far the kit reaches', mobility: 'Mobility — speed, dashes, teleports',
  defense: 'Defense — how hard to put down', health: 'Health — hit points', energy: 'Energy — the ki pool',
  fighting: 'Fighting — strike skill', agility: 'Agility — evade recovery', might: 'Might — throws, slams, resist',
  vigor: 'Vigor — durability', intellect: 'Intellect — cooldowns', awareness: 'Awareness — vision range',
  resolve: 'Resolve — ki & status recovery', threat: 'LeFevre threat rating', flight: 'Flight capability',
  pin: 'Place of origin', person: 'Civilian identity',
};
export function icon(name, size = 13, extra = '') {
  const body = P[name]; if (!body) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;${extra}">${body}</svg>`;
}
// map an attribute key to its symbol
export const ATTR_ICON = { fgt: 'fighting', agl: 'agility', mgt: 'might', vig: 'vigor', int: 'intellect', awr: 'awareness', res: 'resolve' };
