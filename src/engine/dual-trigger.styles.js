// Existing combat-dock extension: the two trigger identities lead the kit inventory.
export const DUAL_TRIGGER_CSS=`
.nboards.arena-report{grid-template-columns:minmax(0,1fr);}
#hud .slots .trigger-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;grid-column:1/-1;min-width:0;flex:1 0 100%;}
#hud .slots{flex-wrap:wrap;max-width:calc(100vw - 32px);}
#hud .trigger-attack{display:grid;grid-template-columns:32px minmax(0,1fr);align-content:start;column-gap:8px;row-gap:4px;padding:10px;border-radius:var(--r-2);background:var(--surface-raised);color:var(--text);min-width:0;}
#hud .trigger-bind{grid-column:1/-1;display:flex;justify-content:space-between;gap:4px;font:700 var(--t-body) var(--f-display);color:var(--gold);}
#hud .trigger-bind small{font:500 var(--t-tiny) var(--f-display);align-self:center;color:var(--text-3);}
#hud .trigger-art{grid-row:2/4;align-self:center;}
#hud .attack-icon{width:28px;height:28px;flex-shrink:0;display:block;}
#hud .trigger-name{font:600 var(--t-body)/1.25 var(--f-display);overflow-wrap:anywhere;}
#hud .trigger-status{font:500 var(--t-label)/1.2 var(--f-display);color:var(--text-2);min-height:12px;}
#hud .trigger-attack.unavailable .trigger-status{color:var(--danger-2);}
#hud .slot .attack-icon{width:24px;height:24px;margin:0 auto 4px;color:var(--gold-pale,#e8cf92);}
#hud .slot.sel{outline:2px solid var(--gold);outline-offset:0;}
#hud .slot.sel-secondary{border-bottom:3px solid var(--info);}
#hud .slot .key{letter-spacing:0;font-size:10px;}
#hud .slot .an{font-size:10px;}
#hud .slot .cost{font-size:9px;}
#hud .slots .slot{height:auto;min-height:90px;padding-top:21px;}
/* The taller two-trigger selection cannot share the city's former fixed
   hands/charge offsets. Reuse the existing right-hand combat dock in desktop city play. */
body:not(.powerworld):not(.phone):not(.tablet) #hud .combat-dock{
 position:absolute;right:16px;bottom:16px;width:min(352px,calc(50vw - 80px));
 display:flex;flex-direction:column;gap:8px;max-height:calc(100% - 200px);
}
body:not(.powerworld):not(.phone):not(.tablet) #hud .combat-dock > .panel{
 position:relative;inset:auto;transform:none;width:100%;margin:0;flex-shrink:0;
}
body:not(.powerworld):not(.phone):not(.tablet) #hud .slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:8px;}
body:not(.powerworld):not(.phone):not(.tablet) #hud .slots .slot{width:auto;min-width:0;min-height:87px;padding:22px 5px 5px;}
body:not(.powerworld):not(.phone):not(.tablet) #hud .charge{overflow:hidden;}
body:not(.powerworld):not(.phone):not(.tablet) #hud .charge > i{display:block;height:100%;}
body:not(.powerworld):not(.phone):not(.tablet) #hud .combat-dock > .hint{max-width:none;min-height:0;flex-shrink:1;overflow-y:auto;pointer-events:auto;}
body:not(.powerworld):not(.phone):not(.tablet) #hud .cityplate{max-width:min(560px,calc(100vw - 752px));overflow-wrap:anywhere;}
@media(max-width:900px){body:not(.powerworld):not(.phone):not(.tablet) #hud .cityplate{display:none!important;}}
body.powerworld:not(.phone):not(.tablet) #hud .slots{grid-template-columns:repeat(4,minmax(0,1fr));}
body.powerworld:not(.phone):not(.tablet) #hud .slots .slot{min-height:87px;padding:22px 5px 5px;}
@media(max-width:1000px){
 #hud .trigger-pair .trigger-bind{display:block;}
 #hud .trigger-pair .trigger-bind small{display:block;margin-top:2px;}
 #hud .trigger-attack{padding:8px;column-gap:4px;grid-template-columns:24px minmax(0,1fr);}
 #hud .trigger-art .attack-icon{width:24px;height:24px;}
 body.powerworld:not(.phone):not(.tablet) #hud .slots .slot{min-height:74px;}
 body.powerworld:not(.phone):not(.tablet) #hud .slot .an{display:none;}
}
@media(max-width:800px){body.powerworld:not(.phone):not(.tablet) #hud .slots{grid-template-columns:repeat(3,minmax(0,1fr));}}
`;
