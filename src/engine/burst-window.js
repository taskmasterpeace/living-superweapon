// Damage in (simulation time - 2s, simulation time], not a chain extended by
// each new hit. _burst/_burstT remain the native total / time-until-empty readouts.
const WINDOW=2,ROUNDING=1e-10;

export function resetBurstWindow(f){
 f._burst=0;f._burstT=0;
 const w=f._burstWindow;if(w){w.samples.length=0;w.head=0;w.time=0;}
}

export function recordBurstDamage(f,amount){
 if(!(amount>0)||!Number.isFinite(amount))return;
 const w=f._burstWindow??=( {time:0,samples:[],head:0} ),expires=w.time+WINDOW;
 const last=w.samples.at(-1);
 // Several sources in one simulation step share an expiry and one queue entry.
 if(last&&last.expires===expires)last.damage+=amount;
 else w.samples.push({expires,damage:amount});
 f._burst=(f._burst||0)+amount;f._burstT=WINDOW;
}

export function advanceBurstWindow(f,dt){
 const w=f._burstWindow;if(!w||!w.samples.length||!(dt>0)||!Number.isFinite(dt))return;
 w.time+=dt;
 // A tiny arithmetic tolerance removes only frame-sum rounding at the boundary.
 while(w.head<w.samples.length&&w.samples[w.head].expires<=w.time+ROUNDING)f._burst-=w.samples[w.head++].damage;
 if(w.head===w.samples.length){resetBurstWindow(f);return;}
 f._burst=Math.max(0,f._burst);f._burstT=Math.max(0,w.samples.at(-1).expires-w.time);
 // Amortized O(1) expiration: never shift the array on every beam contact.
 if(w.head>=128&&w.head*2>=w.samples.length){w.samples.splice(0,w.head);w.head=0;}
}
