const prompts = [
  'How many human players are you targeting per match? 8? 16? 32? 64?',
  'Are the clone soldiers players, AI, or both?',
  'Can one player command AI clone squads?',
  'Does every player select a hero, or are superweapons scarce?',
  'Who controls aircraft? Players exclusively or AI too?',
  'Can superweapons pilot vehicles, or would that be pointless?',
  'Can a Superman-tier character pick up vehicles?',
  'Can they throw vehicles?',
  'Can they grab another flying player?',
  'Can they carry soldiers?',
  'Can players be captured instead of killed?',
  'How long should a normal match last: 15, 30, 45, 60 minutes?',
  'Is there persistent progression between matches?',
  'Is genome research match-specific or persistent?',
  'Can factions create custom hybrid soldiers from multiple genomes?',
  'Can enhancements fail or mutate?',
  'Can the enemy steal research rather than stealing a corpse?',
  'Can the cloning facility itself be infiltrated?',
  'Can enemy players disguise themselves as clones?',
  'Can you capture an enemy cloning facility?',
  'What happens when your clone reserve hits zero?',
  'Does the player then permanently die for that match?',
  'Can clones replenish through resources?',
  'Are civilians simulated continuously or spawned around objectives?',
  'Do civilians remember what they witnessed?',
  'Can civilians flee and report your position?',
  'Can civilians lie during interrogation?',
  'Can they support one faction?',
  'Can destroying civilian infrastructure create refugees?',
  'Does escalation affect only military reinforcements, or the world itself?',
  'Can both sides become equally brutal?',
  'Are there neutral factions?',
  'Are there police/local military forces separate from both teams?',
  'How much terrain can eye beams penetrate?',
  'Can beams cut through vehicles?',
  'Can powers destroy terrain?',
  'Can a Goku-tier blast permanently alter the battlefield?',
  'What exactly counts as cover against a superweapon?',
  'How do ordinary soldiers detect extremely fast characters?',
  'Does radar detect biological flyers?',
  'Does infrared?',
  'Can supers hide their energy signature?',
  'What happens when a sniper shoots a superweapon in the eye?',
  'Are powers governed by energy, cooldowns, stamina, or combinations?',
  'Can soldiers develop countermeasures after studying a power?',
  'Can powers interact—beam vs beam, shield vs missile, electricity vs vehicle, etc.?',
  'Can superweapons defect?',
  'Are they people with agency or literally government-owned biological weapons?',
  'Why are these factions fighting?',
  'Most important: what can an ordinary rifleman accomplish that your strongest superweapon cannot?',
];

const chapters = [
  ['Match & command', 1, 6], ['Physical capability', 7, 12],
  ['Progression & genomes', 13, 20], ['Clone reserve', 21, 23],
  ['Civilians & escalation', 24, 33], ['Destruction & counterplay', 34, 46],
  ['Agency & conflict', 47, 50],
];

export const QUESTIONS = prompts.map((prompt, index) => {
  const number = index + 1;
  const chapter = chapters.find(([, from, to]) => number >= from && number <= to)[0];
  return { id: `q${String(number).padStart(2, '0')}`, number, prompt, chapter };
});

export const CHAPTERS = chapters.map(([title, from, to]) => ({ title, from, to }));
