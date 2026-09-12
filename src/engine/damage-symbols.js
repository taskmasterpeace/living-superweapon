import {DTYPE_INFO} from '../data/damage-types.js';
const paths={
 physical:'<path d="M5 13V8h3V5h3v3h3V6h3v4h2v7l-4 4H8l-4-6z"/>',
 ballistic:'<path d="M9 20V8l3-5 3 5v12zM9 15h6"/>',
 energy:'<path d="M14 2L4 14h7l-1 8 10-13h-7z"/>',
 fire:'<path d="M13 2c2 6-3 7 1 10l3-5c7 9 2 15-5 15S2 15 7 9c0 5 5 4 6-7z"/>',
 cold:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/>',
 toxic:'<circle cx="12" cy="12" r="2"/><path d="M9 8C3 10 2 3 7 2M15 8c6 2 7-5 2-6M8 15c-3 5 5 10 8 4M16 15c3 5-5 10-8 4M6 11c-6 0-5 8 0 9M18 11c6 0 5 8 0 9"/>',
 acid:'<path d="M9 3h7v3l-5 5-5-5zM5 16l2-4 2 4a2 2 0 0 1-4 0zM3 21h18M14 16l3 3 3-3"/>',
 magic:'<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM18 2v4M16 4h4"/>',
};
export function damageSymbol(type,size=16){
 const info=DTYPE_INFO[type];if(!info||!paths[type])return '';
 return `<svg data-damage-type="${type}" role="img" aria-label="${info.label}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${info.c};vertical-align:-3px;flex-shrink:0">${paths[type]}</svg>`;
}
export function damageBadges(types){return types.map(t=>`${damageSymbol(t)} ${DTYPE_INFO[t]?.label||''}`).join(' · ');}
export const CONDITION_DAMAGE={bleeding:'physical',frost:'cold',frozen:'cold',chill:'cold',shock:'energy',corrosion:'acid','dot-burn':'fire','dot-poison':'toxic','dot-gas':'toxic','dot-acid':'acid'};
