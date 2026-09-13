export const scenarios=Object.freeze({
 'touch-guard':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',config:{scheme:'touch'},capture:'silent video and screenshots',description:'Landscape browser touch menus and Block control; require energy-first frontal defense.'},
 'gamepad-guard':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',config:{scheme:'pad'},capture:'silent video and screenshots',description:'Browser-emulated controller through native polling: frontal guard protects health.'},
 'melee-grab-guard':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',config:{attack:'grab'},capture:'silent video and screenshots',description:'Acquire a guarding trainer with native E, then release without lingering ownership.'},
 'melee-guard-crush':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',config:{attack:'heavy'},capture:'silent video and screenshots',description:'Charge a native heavy into frontal guard; require real guard break and recovery.'},
 'melee-guard-rear':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',config:{facing:'rear'},capture:'silent video and screenshots',description:'Hold native guard facing away; require rear contact to hurt health without guard absorption.'},
 'melee-guard':{schemes:['kbm','pad','touch'],script:'guard-drill-browser.mjs',capture:'silent video and screenshots',description:'Hold native guard against the trainer; require frontal contact with energy spent and no health loss.'},
 'melee-instructions':{schemes:['kbm'],script:'approach-teaching-browser.mjs',capture:'screenshots',description:'Open the Threat Room console, read character-specific instructions and start walking-retreat practice.'},
 'melee-retreat':{schemes:['kbm'],script:'jelani-entry-browser.mjs',capture:'silent video and screenshots',description:'JELANI targets and strikes a retreating trainer with native T/V input.'},
 'webline-chain':{schemes:['kbm'],script:'webline-chain-browser.mjs',capture:'silent video and screenshots',description:'WEBLINE selects Web Zip, pulls to an anchor, holds and jumps off with native input.'}
});
export function selectScenario(id){if(!Object.hasOwn(scenarios,id))throw new Error('Unknown scenario: '+id+'. Use --list.');return scenarios[id];}
export function validateResult(result){if(result?.passed!==true)throw new Error('Scenario did not produce an explicit passing result.');if(result.errors?.length)throw new Error('Scenario reported browser errors.');return result;}

export function parseRunArgs(args){
 if(![2,4].includes(args.length)||args[0]!=='--scenario'||(args.length===4&&args[2]!=='--scheme'))throw new Error('Usage: node tools/playtest/run.mjs --list | --controls | --scenario <id> [--scheme kbm|pad|touch]');
 const id=args[1],scenario=selectScenario(id),scheme=args[3]??scenario.config?.scheme??'kbm';
 if(!scenario.schemes.includes(scheme))throw new Error('Unsupported scheme '+scheme+' for '+id+'. Supported: '+scenario.schemes.join(', '));
 return {id,scenario,config:{...scenario.config,scheme}};
}
