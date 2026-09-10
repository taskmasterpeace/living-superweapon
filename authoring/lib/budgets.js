// Budgets derive from a measured production baseline (authoring/baseline/production-baseline.json,
// written by `pw-author baseline`). Upstream marketing numbers are not performance proof; the
// limit for a kind is a documented multiple of what the game already ships in that class.
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {AUTHORING_ROOT} from './paths.js';

export const BUDGET_KEYS=['triangles','drawCalls','materials','bones','textures','bytes'];
export const PROFILES=['desktop','mobile'];
// Which baseline class each asset kind is judged against, and the headroom multiplier.
export const CLASS_OF={'humanoid-body':'body','humanoid-motion':'motion',equipment:'equipment',creature:'body',prop:'prop'};
export const HEADROOM={desktop:1.25,mobile:.6};

let cached=null;
export function loadBaseline(){
 if(cached)return cached;
 const file=resolve(AUTHORING_ROOT,'baseline','production-baseline.json');
 if(!existsSync(file))throw new Error('No production baseline. Run: node authoring/bin/authoring.js baseline');
 return cached=JSON.parse(readFileSync(file,'utf8'));
}
export function limitsFor(kind,profile,baseline=loadBaseline()){
 const cls=CLASS_OF[kind];if(!cls)throw new Error(`No budget class for kind ${kind}`);
 const ref=baseline.classes[cls];if(!ref)throw new Error(`Baseline has no class ${cls}`);
 const k=HEADROOM[profile];if(!k)throw new Error(`Unknown profile ${profile}`);
 const limits={};
 for(const key of BUDGET_KEYS)limits[key]=Math.max(1,Math.ceil(ref.max[key]*k));
 return limits;
}
export function overBudget(measured,limits){
 return BUDGET_KEYS.filter(key=>typeof measured?.[key]==='number'&&typeof limits?.[key]==='number'&&measured[key]>limits[key]);
}
