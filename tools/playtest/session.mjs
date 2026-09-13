const sessions=new WeakMap();
export function sessionFor(page){let s=sessions.get(page);if(!s){s={phase:'setup',fixtures:[]};sessions.set(page,s);}return s;}
export function beginAcceptance(page){const s=sessionFor(page);if(s.phase==='staging'||s.phase==='failed')throw new Error('Fixture setup is incomplete or failed');s.phase='acceptance';}
export function sessionSummary(page){return structuredClone(sessionFor(page));}
