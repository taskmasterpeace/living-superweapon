import {ROSTER} from './characters.js';
const directions={
 sol:{cape:true,regionColors:{legs:'#173da0',calves:'#173da0'},wristbands:true,wristBlasters:true},
 vega:{hair:'none',skin:'#633b28',primary:'#161a1b',secondary:'#b18a3b',trim:'#252a29',emblemColor:'#d5b15c',emblem:'V',cape:false,pattern:'gilt'},
 aegis:{frame:'hero',metallic:true,primary:'#bac2c7',secondary:'#ad8b47',trim:'#293b50',weapon:'sword',shield:true,shieldStyle:'kite',lasso:true,emblem:'shield'},
 apex:{hair:'swept',hairColor:'#66e82c',primary:'#182c24',secondary:'#80c339',emblem:'star',frame:'heavy'},
 aurum:{emblemColor:'#d6d9dc',primary:'#eff0e9',secondary:'#babfbe',trim:'#535d63',skin:'#d7dbda',collar:true,shimmer:true,emblem:'star',coat:true,coatStyle:'short'},
 breach:{primary:'#4c5846',secondary:'#858b64',armor:true,helmet:true,shield:true,shieldStyle:'riot',emblem:'shield'},
 chainfire:{kiltColor:'#ac2730',headwear:'skull',hair:'none',primary:'#ec6824',secondary:'#f3bd38',regionColors:{legs:'#17191d',waist:'#bd292e'},kilt:true,emblem:'bolt'},
 circuit:{emblemColor:'#42ed70',headwear:'helmet',hair:'none',primary:'#101c1b',secondary:'#42ed70',trim:'#142c23',metallic:true,emblem:'bolt'},
 jelani:{weapon:'spear',emblem:'bolt'},
 stormcall:{weapon:'axe',cape:true,emblem:'bolt'},
 foundry:{metallic:true,primary:'#a4afb8',secondary:'#ac4e25',weapon:'axe',emblem:'shield'},
 coldsnap:{primary:'#cce7ed',secondary:'#819ab0',hair:'swept',emblem:'star'},
 dune:{primary:'#78543b',secondary:'#bb8b58',skin:'#a07654',emblem:'triangle'},
 decibel:{primary:'#ebe0cb',secondary:'#b52728',bareArms:true,gloves:'bare',gauntlets:false,belt:true,emblem:'none'},
 feral:{claws:true,primary:'#734d30',secondary:'#ac612d',bareArms:true,gauntlets:false,emblem:'none'},
 gale:{eyepatch:true,hair:'braids',primary:'#254936',secondary:'#b7a575',coat:true,coatStyle:'short',emblem:'bolt'},
 jawah:{skin:'#eaded8',hairColor:'#f4eee4',eyeColor:'#af8495',primary:'#dad6ca',secondary:'#675668'},
 kano:{primary:'#d86828',secondary:'#24588b',hair:'swept',hairColor:'#161916',bareArms:true,gauntlets:false,gloves:'bare',emblem:'none'},
 stefanos:{coat:true,coatStyle:'short',beard:true,primary:'#252d36',secondary:'#c7c2b3',trim:'#181f28',pattern:'pinstripe',emblem:'none'},
 knightfall:{headwear:'hood',hair:'none',primary:'#171d28',secondary:'#596478',cape:true,emblem:'triangle'},
 majesty:{wings:'angel',backpack:false,cape:false,primary:'#efe9d4',secondary:'#b0924d',emblem:'star'},
 olympus:{wings:'armor',backpack:false,cape:false,metallic:true,primary:'#263e65',secondary:'#d1a746',emblem:'bolt'},
 kraken:{tentacles:true,primary:'#146a72',secondary:'#36a39a',emblem:'none'},
 merc:{headwear:'cap',hair:'none',armor:true,primary:'#283432',secondary:'#667258',footwear:'shoes',emblem:'shield'},
 kivuli:{primary:'#41225f',secondary:'#a265c4',emblem:'none'},
 moses:{primary:'#35273d',secondary:'#9864bf',emblem:'triangle'},
 mystward:{robe:true,sleeves:true,collar:true,cape:true,primary:'#622b62',secondary:'#d7b469',emblem:'star'},
 onyx:{headwear:'speed',hair:'none',primary:'#192533',secondary:'#8daec5',emblem:'bolt'},
 webline:{headwear:'helmet',hair:'none',primary:'#bd5824',secondary:'#235066',wristBlasters:true,emblem:'web'},
 sandra:{primary:'#262b35',secondary:'#ab8541',emblem:'ring',hair:'bun',armor:true},
 rage:{frame:'heavy',primary:'#364130',skin:'#5faf6a',bareArms:true,gloves:'bare',gauntlets:false,emblem:'none'},
};
export const HERO_SIGNATURE_RECIPES=Object.fromEntries(ROSTER.map(d=>['roster-'+d.id,{name:d.name+' · signature candidate',rosterId:d.id,frame:d.strength>=9?'heavy':'hero',hair:'swept',hairColor:'#222420',primary:d.colors.primary,secondary:d.colors.secondary,trim:'#252b30',skin:d.colors.skin,emblemColor:d.colors.accent,emblem:'sig-'+d.id,anatomy:['aegis','majesty','sandra','tempest','kamaria'].includes(d.id)?'female':'male',cape:!!d.colors.cape,armor:/Military|Human Arsenal|Gun Combat/.test(d.role),shoulders:false,gauntlets:false,knees:false,belt:true,backpack:false,gloves:'full',muscle:1,...directions[d.id]}]));
HERO_SIGNATURE_RECIPES.deck52={name:'Deck 52 · standard mercenary',frame:'hero',hair:'none',headwear:'cap',primary:'#434c3e',secondary:'#938b65',trim:'#212724',skin:'#865738',armor:true,backpack:false,emblem:'deck52',emblemPlacement:'back',cape:false,shoulders:false,gauntlets:false,knees:true,belt:true,footwear:'shoes'};
export const SIGNATURE_DIRECTION_NOTES={moses:'User wants Atlas Protocol purple gas. Current kit remains symbiont/tendrils; appearance changes do not convert powers.',kivuli:'Current canonical Breath of Kampala gas controller. Keep separate from Moses until identity/power reassignment is decided.',coldsnap:'Surfing movement rig remains a separate traversal asset.',aegis:'Sword and shield presentation plus coiled golden lasso. Lasso throw/grab physics remains separate.'};
export function generateDeck52Mercenary(seed=1){
 if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw Error('Seed must be an integer from 0 to 2147483647');let state=(seed+1)>>>0;const choose=items=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return items[state%items.length];};
 return {...HERO_SIGNATURE_RECIPES.deck52,name:'Deck 52 · mercenary '+seed,anatomy:choose(['male','female']),frame:choose(['hero','agile','heavy']),skin:choose(['#593824','#865738','#bb8a63','#d7b091']),primary:choose(['#434c3e','#3f494c','#625d49']),secondary:choose(['#938b65','#768979','#b0aa8c']),headwear:choose(['cap','none','mask']),generation:{schema:1,seed}};
}
