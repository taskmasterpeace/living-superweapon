// Additive local poses measured on modular-hero.glb; +Z is actor-forward.
// Contact IK and simulation still own payload placement and root travel.
const paired=(upper,lower)=>({'DEF-upper_armR':upper,'DEF-forearmR':lower,'DEF-upper_armL':[upper[0],-upper[1],-upper[2]],'DEF-forearmL':[lower[0],-lower[1],-lower[2]]});
const open=paired([.65,0,.25],[.35,0,0]);
const ready=paired([1,-.49,1.09],[.89,-.13,.42]);
const reach=paired([1.8,0,.8],[.2,-1.46,.23]);
const carry=paired([1.5,-1.485,0],[.925,0,0]);
const overhead=paired([1.185,0,-.965],[.52,.5,-.595]);
const crouch={'DEF-hips':[.1,0,0],'DEF-spine003':[.2,0,0],'DEF-neck':[-.25,0,0],'DEF-thighL':[-1.45,0,-.1],'DEF-thighR':[-1.45,0,.1],'DEF-shinL':[2.25,0,0],'DEF-shinR':[2.25,0,0],...reach};
const air={'DEF-spine003':[.12,0,0],'DEF-neck':[-.12,0,0],'DEF-thighL':[.3,0,-.15],'DEF-thighR':[.45,0,.15],'DEF-shinL':[.65,0,0],'DEF-shinR':[.85,0,0]};
export const PICKUP_BODY_STUDIES={
 'Ground pickup':{hand:'both',grounded:true,visualReview:{rejected:true,note:'Issue #21 revised: deeper supported pickup and overhead lift; visual acceptance still pending.'},duration:1.5,loop:false,markers:{contact:.45,release:1.2,controlReturn:1.5},poses:[{time:0,joints:ready},{time:.3,joints:crouch},{time:.42,joints:crouch},{time:.6,joints:carry},{time:.75,joints:overhead},{time:.8,joints:overhead},{time:1,joints:{}}]},
 'Flying pickup':{hand:'both',duration:1.2,loop:false,markers:{contact:.35,release:.95,controlReturn:1.2},poses:[{time:0,joints:{...air,...open}},{time:.12,joints:{...air,...open}},{time:.35/1.2,joints:{...air,...carry}},{time:.48,joints:{...air,...carry}},{time:.65,joints:{...air,...carry}},{time:.95/1.2,joints:{...air,...carry}},{time:1,joints:{}}]},
};
