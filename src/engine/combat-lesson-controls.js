export const meleeLessonScheme=g=>g.touch?.enabled?'touch':g.pad?.active?'pad':'kbm';
export function grabLesson(scheme='kbm'){
 const strike=scheme==='touch'?'Punch':scheme==='pad'?'Strike':'V',grab=scheme==='kbm'?'E':scheme==='touch'?'Throw':'Grab';
 return `GRAB CONNECTED · tap ${strike}: body blow · hold ${strike}: slam · move/fly: carry · hold ${grab} then release: aimed throw · tap ${grab}: set down/drop`;
}
export function trialPrompt(kind,scheme='kbm'){
 const strike=scheme==='touch'?'Punch':scheme==='pad'?'Strike':'V',guard=scheme==='touch'?'Block':scheme==='pad'?'Guard':'Q';
 const hints={stationary:`Face target · tap ${strike} to approach and strike`,retreat:`Tap ${strike} to catch walking retreat`,guard:'Compare punch, charged heavy and grab against guard',dodge:'Wait for the sideways dodge, then approach',defend:`Face attacker · hold ${guard} · watch energy`,airborne:`Fly into reach · tap ${strike} for aerial melee`,'air-defense':`Face the aerial approach · hold ${guard}`};
 return `${kind.toUpperCase()} · ${hints[kind]||'Practice active'}`;
}
