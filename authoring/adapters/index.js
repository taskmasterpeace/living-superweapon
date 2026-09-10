// Adapter registry. An adapter turns one recipe kind into normalized outputs and the manifest
// fields it alone can know (rig mapping, sockets, clips, bounds, measured budgets, units
// conversion). Adapters are versioned; bumping a version changes every cache key it touches.
// Each adapter exports {name, version, kinds, build({recipe, recipeDir, sources, options, log})}.
import quaterniusUal from './quaternius-ual.js';

export const ADAPTERS={};
export function registerAdapter(adapter){
 if(!/^[a-z0-9-]+$/.test(adapter.name)||!Number.isInteger(adapter.version))throw new Error('adapter needs a plain name and integer version');
 if(ADAPTERS[adapter.name])throw new Error(`adapter ${adapter.name} registered twice`);
 ADAPTERS[adapter.name]=adapter;return adapter;
}
registerAdapter(quaterniusUal);
