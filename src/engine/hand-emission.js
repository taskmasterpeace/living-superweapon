// Anatomical emission shared by the command and post-pose projectile launch.
// The simulation owns velocity; this samples only the rendered source socket.
// New palm metadata uses the actor's left/right. The legacy +Z-facing rig calls
// its +X (anatomical left) arm "armR". Keep old kits/weapon/volley lanes intact:
// absent castHand still uses the original +X palm, rather than renaming the rig.
export function palmCastSide(def){return def.castHand==='right'?-1:1;}
export function handEmissionPosition(f,side,out){
 const hand=(side<0?f.parts?.armL:f.parts?.armR)?.children[2];
 return hand?hand.getWorldPosition(out):f.muzzle(out);
}
export function volleyPattern(def){return def.handPattern|| (def.arrow&&def.gear?'left':def.oneHand?'right':'alternate');}
export function attackEntryCost(def){return def.type==='volley'?(def.cost||3)*(volleyPattern(def)==='paired'?2:1):(def.cost||0);}
export function volleySides(def,slot){
 const pattern=volleyPattern(def);
 if(pattern==='paired')return [-1,1];
 if(pattern==='left')return [-1];
 if(pattern==='right')return [1];
 slot.side=(slot.side||1)*-1;return [slot.side];
}
