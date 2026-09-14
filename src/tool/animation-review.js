// Player review notes are independent of file validity and gameplay acceptance.
export function animationReview(entry){
 const k=entry.key||'';
 if(/^(Front kick|Roundhouse kick|Knee strike|Throwing axe|Boomerang throw|Paired grab|Front clinch|Side grab|Rear body|Neck hold|Ground pickup|Flying pickup|Flailing fall|Curled backward)/.test(k))return 'Revised candidate: your rejection is retained until you review this revision.';
 if(['Poison / gas','Burn / acid'].includes(k))return 'Revised body-reaction candidate; review hand contact and body clearance.';
 if(k==='Grappling hook deploy and hang')return 'Revised windup, pull and moving hang candidate; anchor and rope contact are not demonstrated.';
 if(k==='Infected_Sprint_Loop')return 'Revised asymmetric flailing arms over source running legs; review wildness and clearance.';
 if(['Air stagger','Air stunned','Blind flight'].includes(k))return 'Airborne pose study with illustrative height/motion. Actual flight interruption must be tested in the Threat Room.';
 if(['Slide_Loop','Slide_Start','NinjaJump_Land','LayToIdle','Zombie_Scratch','Zombie_Walk_Fwd_Loop','Zombie_Idle_Loop','Roll','Fixing_Kneeling'].includes(k)||k.startsWith('Sword_'))return 'Liked during your review. Weapon contact and gameplay transitions remain separate checks.';
 if(k==='Melee_Hook')return 'One-shot attack; stops at its end. Melee_Hook_Rec is the separate source recovery.';
 if(k==='ClimbUp_1m')return 'Climb onto a one-metre ledge. A matching ledge/contact test is still required.';
 if(k==='Hit_Knockback')return 'Source impact reaction. Ground slide distance and get-up are separate controller transitions.';
 return 'Visual review pending; playback does not prove gameplay readiness.';
}
