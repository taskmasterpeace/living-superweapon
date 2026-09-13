export const scenarios=Object.freeze({
 'melee-grab-guard':{script:'guard-drill-browser.mjs',config:{attack:'grab'},capture:'silent video and screenshots',description:'Acquire a guarding trainer with native E, then release without lingering ownership.'},
 'melee-guard-crush':{script:'guard-drill-browser.mjs',config:{attack:'heavy'},capture:'silent video and screenshots',description:'Charge a native heavy into frontal guard; require real guard break and recovery.'},
 'melee-guard-rear':{script:'guard-drill-browser.mjs',config:{facing:'rear'},capture:'silent video and screenshots',description:'Hold native guard facing away; require rear contact to hurt health without guard absorption.'},
 'melee-guard':{script:'guard-drill-browser.mjs',capture:'silent video and screenshots',description:'Hold native guard against the trainer; require frontal contact with energy spent and no health loss.'},
 'melee-instructions':{script:'approach-teaching-browser.mjs',capture:'screenshots',description:'Open the Threat Room console, read character-specific instructions and start walking-retreat practice.'},
 'melee-retreat':{script:'jelani-entry-browser.mjs',capture:'silent video and screenshots',description:'JELANI targets and strikes a retreating trainer with native T/V input.'},
 'webline-chain':{script:'webline-chain-browser.mjs',capture:'silent video and screenshots',description:'WEBLINE selects Web Zip, pulls to an anchor, holds and jumps off with native input.'}
});
export function selectScenario(id){if(!Object.hasOwn(scenarios,id))throw new Error('Unknown scenario: '+id+'. Use --list.');return scenarios[id];}
export function validateResult(result){if(result?.passed!==true)throw new Error('Scenario did not produce an explicit passing result.');if(result.errors?.length)throw new Error('Scenario reported browser errors.');return result;}
