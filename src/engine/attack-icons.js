import {TYPE_META} from './abilityMeta.js';
import {naniteConfig} from '../data/nanite-tuning.js';

// Original mechanic silhouettes: these describe the emission/shape, not a hero's IP.
const paths={
 optic:'M2 10q4-5 8 0-4 5-8 0Zm4 0h.1M12 8l10-4M12 10h10M12 12l10 4',
 beam:'M3 8v8m3-6h15M6 14h15M17 7l5 5-5 5',
 chest:'M3 5l4-2 5 3 5-3 4 2-3 15H6ZM9 10l3-2 3 2-3 5ZM12 15v7',
 charge:'M8 6a7 7 0 1 1-3 6M12 2v3M2 12h3M19 5l-2 2M7 4l1 3M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
 shot:'M2 7h8M2 12h5M2 17h8M10 12l6-4 6 4-6 4Z',
 volley:'M2 4h5m2 0 4-2 4 2-4 2ZM4 12h6m2 0 4-2 6 2-6 2ZM2 20h5m2 0 4-2 4 2-4 2Z',
 'volley-pair':'M2 7h7m2 0 5-3 6 3-6 3ZM2 17h7m2 0 5-3 6 3-6 3ZM5 10v4',
 grenade:'M10 7V3h6l3 4M8 7h8l3 6-2 8H7l-2-8ZM8 11h9M8 16h9m-5-8v11',
 shotgun:'M2 9h11v5H8l-2 6H3l2-6H2ZM13 10h4m-4 3h4m2-6 3-2m-3 7h3m-3 5 3 2',
 blade:'M4 20 17 7l4-4-1 6L8 21ZM3 14l7 7M3 21l3-3',
 rifle:'M2 8h13v3h7v3H11l-1 6H6l1-6H2ZM14 8V5h4v3',
 bow:'M8 2q17 10 0 20l4-10ZM2 12h20m-4-4 4 4-4 4',
 strike:'M5 11V6h3V4h4v1h4v2h3v7l-5 7H7l-4-7v-3h3l2 4M8 6v5m4-6v6m4-4v5',
 grapple:'M4 9V5h3v6-7h3v7-8h3v8-6h3v10l-4 6H7l-4-6 1-3 4 3M18 4l4 3-4 3',
 cone:'M3 12 20 3q5 9 0 18ZM8 12h10M12 9l6-2m-6 8 6 2',
 nova:'M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3M12 7l5 5-5 5-5-5Z',
 movement:'M2 7h7M2 12h4M2 17h7M13 3l8 9-8 9m-3-5 4-4-4-4',
 teleport:'M5 3v18M19 3v18M2 5h6M2 19h6M16 5h6M16 19h6M8 12h8m-3-3 3 3-3 3',
 defense:'M12 2 3 6v6q1 6 9 10 8-4 9-10V6ZM7 12l3 3 7-7',
 'nanite-shield':'M12 2 3 6v6q1 6 9 10 8-4 9-10V6ZM4 9h16M6 15h12M9 4v15m6-15v15',
 'nanite-cannon':'M2 8h4v9H2ZM6 6h11v13H6ZM6 10h11M6 15h11M17 8h3v9h-3M20 5l2-2m-1 9h2m-3 7 2 2',
 summon:'M12 3l5 3v6l-5 3-5-3V6ZM2 14l5 3v5l-5-3Zm20 0-5 3v5l5-3Z',
 buff:'M12 21V3m-6 6 6-6 6 6M4 16l4-4m8 0 4 4',
 trap:'M3 18h18M5 18l3-5h8l3 5M12 3v5m-7-3 3 4m11-4-3 4',
 control:'M3 10q9-11 18 0-9 11-18 0ZM9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0M7 18l-2 3m7-2v3m5-4 2 3',
 utility:'M9 2h6v6h6v6h-6v8H9v-8H3V8h6Z',
};
export function attackSymbol(def={}){
 try{const module=naniteConfig(def);if(module)return `nanite-${module.naniteForm}`;}catch{/* Invalid data keeps its ordinary type fallback. */}
 if(def.type==='volley'&&def.handPattern==='paired')return 'volley-pair';
 if((def.type==='beam'||def.type==='charge')&&(def.faceOrigin||def.face))return 'optic';
 if((def.type==='beam'||def.type==='charge')&&def.chest)return 'chest';
 if(def.type==='rifle'&&def.weapon==='shotgun')return 'shotgun';
 if(def.type==='projectile'&&def.canister)return 'grenade';
 if(def.type==='melee'&&def.dmgClass==='slash')return 'blade';
 if(['rifle','bow','teleport','volley'].includes(def.type))return def.type;
 if(def.type==='grab')return 'grapple';
 return TYPE_META[def.type]?.family||'utility';
}
export function attackIcon(def){
 const symbol=attackSymbol(def);
 return `<svg class="attack-icon" data-symbol="${symbol}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[symbol]||paths.utility}"/></svg>`;
}
