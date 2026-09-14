// Local-joint candidates only. Contact IK and the simulation own payload placement.
const arms=(raise,bend)=>({'DEF-upper_armL':[raise,0,-.28],'DEF-upper_armR':[raise,0,.28],'DEF-forearmL':[bend,0,0],'DEF-forearmR':[bend,0,0]});
const crouch={'DEF-hips':[.18,0,0],'DEF-spine003':[.48,0,0],'DEF-neck':[-.25,0,0],'DEF-thighL':[-.65,0,-.12],'DEF-thighR':[-.65,0,.12],'DEF-shinL':[1.05,0,0],'DEF-shinR':[1.05,0,0],...arms(.65,.2)};
const support={'DEF-spine003':[-.12,0,0],'DEF-thighL':[-.15,0,-.1],'DEF-thighR':[-.15,0,.1],'DEF-shinL':[.25,0,0],'DEF-shinR':[.25,0,0],...arms(1.1,1)};
const air={'DEF-spine003':[.22,0,0],'DEF-neck':[-.18,0,0],'DEF-thighL':[.3,0,-.15],'DEF-thighR':[.45,0,.15],'DEF-shinL':[.65,0,0],'DEF-shinR':[.85,0,0],...arms(1.3,.18)};
export const PICKUP_BODY_STUDIES={
 'Ground pickup':{visualReview:{rejected:true,note:'Issue #21: foot support/root height and payload hand placement failed visual review.'},duration:1.5,loop:false,markers:{contact:.45,release:1.2,controlReturn:1.5},poses:[{time:0,joints:{}},{time:.3,joints:crouch},{time:.42,joints:crouch},{time:.68,joints:support},{time:.8,joints:support},{time:1,joints:{}}]},
 'Flying pickup':{duration:1.2,loop:false,markers:{contact:.35,release:.95,controlReturn:1.2},poses:[{time:0,joints:{}},{time:.35/1.2,joints:air},{time:.48,joints:air},{time:.65,joints:{...air,...arms(1.1,.95),'DEF-spine003':[-.12,0,0]}},{time:.95/1.2,joints:{...air,...arms(1.1,.95)}},{time:1,joints:{}}]},
};
