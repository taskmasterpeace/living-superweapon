import {ROSTER} from './characters.js';
const directions={
 bulwark:{headwear:'greathelm',hair:'none',frame:'heavy',metallic:true,shoulders:true,primary:'#344656',secondary:'#bfb69a',trim:'#36424b',cape:false},
 graven:{frame:'heavy',headwear:'hood',hair:'none',robe:true,collar:true,cape:false,primary:'#302442',secondary:'#976fb5',aura:'gravity',auraState:'always'},
 hive:{frame:'agile',hair:'none',headwear:'insect',cape:false,armor:true,primary:'#26382c',secondary:'#d5ad35',aura:'swarm',auraState:'always'},
 ironclad:{frame:'machine',headwear:'helmet',hair:'none',metallic:true,shoulders:true,gauntlets:true,cape:false,primary:'#586878',secondary:'#c1cbd2'},

 sol:{cape:true,regionColors:{legs:'#173da0',calves:'#173da0'},wristbands:true,wristBlasters:true},
 vega:{hair:'none',skin:'#633b28',primary:'#161a1b',secondary:'#b18a3b',trim:'#252a29',emblemColor:'#d5b15c',emblem:'V',cape:false,pattern:'gilt'},
 aegis:{frame:'hero',metallic:true,primary:'#bac2c7',secondary:'#ad8b47',trim:'#293b50',weapon:'sword',shield:true,shieldStyle:'kite',lasso:true,emblem:'shield'},
 apex:{hair:'spiky',hairColor:'#66e82c',primary:'#182c24',secondary:'#80c339',emblem:'star',frame:'heavy'},
 aurum:{emblemColor:'#d6d9dc',primary:'#eff0e9',secondary:'#babfbe',trim:'#535d63',skin:'#d7dbda',collar:true,shimmer:true,emblem:'star',coat:true,coatStyle:'short'},
 breach:{headwear:'tactical',hair:'none',primary:'#4c5846',secondary:'#858b64',armor:true,helmet:false,shield:true,shieldStyle:'riot',emblem:'shield'},
 chainfire:{kiltColor:'#ac2730',headwear:'skull',hair:'none',primary:'#ec6824',secondary:'#f3bd38',regionColors:{legs:'#17191d',waist:'#bd292e'},kilt:true,emblem:'bolt'},
 circuit:{emblemColor:'#42ed70',headwear:'helmet',hair:'none',primary:'#101c1b',secondary:'#42ed70',trim:'#142c23',metallic:true,emblem:'bolt'},
 jelani:{hair:'dreadlocks',frame:'agile',bareArms:true,muscle:.9,primary:'#d49b2e',secondary:'#183e47',cape:false,weapon:'spear',emblem:'bolt'},
 stormcall:{weapon:'axe',cape:true,emblem:'bolt'},
 foundry:{metallic:true,primary:'#a4afb8',secondary:'#ac4e25',weapon:'axe',emblem:'shield'},
 coldsnap:{primary:'#cce7ed',secondary:'#819ab0',hair:'swept',emblem:'star'},
 dune:{headwear:'hood',trim:'#7d634b',frame:'heavy',hair:'none',beard:false,collar:true,coat:true,coatStyle:'long',cape:false,primary:'#78543b',secondary:'#bb8b58',skin:'#a07654',emblem:'none'},
 decibel:{frame:'agile',hair:'ponytail',hairColor:'#914831',muscle:.85,cape:false,footwear:'shoes',primary:'#ebe0cb',secondary:'#b52728',bareArms:true,gloves:'bare',gauntlets:false,belt:true,emblem:'none'},
 feral:{clawStyle:'singleBone',hair:'mohawk',hairColor:'#442d1d',claws:true,primary:'#734d30',secondary:'#ac612d',bareArms:true,gauntlets:false,emblem:'none'},
 gale:{eyepatch:true,hair:'braids',primary:'#254936',secondary:'#b7a575',coat:true,coatStyle:'short',emblem:'bolt'},
 jawah:{headwear:'circlet',hair:'none',frame:'hero',bareArms:true,muscle:1.25,cape:false,skin:'#eaded8',hairColor:'#f4eee4',eyeColor:'#af8495',primary:'#dad6ca',secondary:'#675668'},
 kano:{primary:'#d86828',secondary:'#24588b',hair:'swept',hairColor:'#161916',bareArms:true,gauntlets:false,gloves:'bare',emblem:'none'},
 stefanos:{hair:'slicked',hairColor:'#101314',belt:false,coat:true,coatStyle:'short',beard:true,primary:'#252d36',secondary:'#c7c2b3',trim:'#181f28',pattern:'pinstripe',emblem:'none'},
 knightfall:{belt:false,weapon:'dualKatana',beltStyle:'plain',emblemColor:'#758193',headwear:'hood',hair:'none',primary:'#171d28',secondary:'#596478',cape:true,emblem:'none'},
 majesty:{hair:'ponytail',gloveColor:'#ffffff',trim:'#ffffff',emblemColor:'#ffffff',wings:'angel',backpack:false,cape:false,primary:'#ffffff',secondary:'#ffffff',emblem:'star'},
 olympus:{wings:'armor',backpack:false,cape:false,metallic:true,primary:'#263e65',secondary:'#d1a746',emblem:'bolt'},
 kraken:{frame:'heavy',muscle:1.3,size:1.15,hair:'none',belt:false,tentacles:true,primary:'#146a72',secondary:'#36a39a',emblem:'none'},
 merc:{pattern:'denim',patternRegion:'legs',headwear:'cap',hair:'none',armor:true,primary:'#283432',secondary:'#667258',footwear:'shoes',emblem:'shield'},
 kivuli:{primary:'#41225f',secondary:'#a265c4',emblem:'none'},
 moses:{primary:'#35273d',secondary:'#9864bf',emblem:'triangle'},
 mystward:{robe:true,sleeves:true,collar:true,cape:true,primary:'#622b62',secondary:'#d7b469',emblem:'star'},
 onyx:{headwear:'speed',hair:'none',primary:'#192533',secondary:'#8daec5',emblem:'bolt'},
 webline:{headwear:'helmet',hair:'none',primary:'#bd5824',secondary:'#235066',wristBlasters:true,emblem:'web'},
 sandra:{primary:'#262b35',secondary:'#ab8541',emblem:'ring',hair:'bun',armor:true},
 rage:{frame:'heavy',primary:'#364130',skin:'#5faf6a',bareArms:true,gloves:'bare',gauntlets:false,emblem:'none'},
};
Object.assign(directions,{
 ...Object.fromEntries(Object.entries({sol:{hair:'swept',hairColor:'#382419',belt:true,beltStyle:'plain'},aegis:{hair:'braids',hairColor:'#ad7934',anatomy:'female',frame:'agile',muscle:.95},aurum:{hair:'slicked',hairColor:'#ddd6bc'},coldsnap:{hair:'spiky',hairColor:'#e2dca8'},kano:{hair:'spiky'},tempest:{anatomy:'female',frame:'agile',hair:'afro',hairColor:'#372120',belt:false,skirt:true,primary:'#dbe7ef',secondary:'#667ea4',cape:false},kamaria:{anatomy:'female',frame:'agile',hair:'braids',hairColor:'#25202a',skirt:true,belt:false,weapon:'spear'},majesty:{frame:'agile'},titan:{frame:'heavy',muscle:1.3,hair:'none',skin:'#d2a789',bareArms:true,belt:false,shoulders:true},marshal:{hair:'none',collar:true,belt:false},warden:{hair:'none',skin:'#e2bba6',beard:false,collar:true,frame:'hero',belt:false},nova:{hair:'ponytail',hairColor:'#e3be64',frame:'agile',headwear:'domino',belt:false},rime:{hair:'bob',hairColor:'#f1e9d3',frame:'agile',anatomy:'female',belt:false},volt:{hair:'mohawk',hairColor:'#d7b453',frame:'agile',belt:false},pyre:{hair:'none',headwear:'skull',belt:false},torch:{hair:'buzz',hairColor:'#b35d2e',bareArms:true,belt:false},specter:{hair:'none',skin:'#e0c6b6',headwear:'none',collar:true,belt:false},rift:{hair:'bob',hairColor:'#dedde9',frame:'agile',anatomy:'female',belt:false},sarge:{hair:'none',headwear:'tactical',belt:true,beltStyle:'utility'},trench:{hair:'none',headwear:'tactical',primary:'#173b48',secondary:'#c28140',centerPanel:true,regionColors:{arms:'#172c37',legs:'#172c37',calves:'#263742'},belt:false},talon:{hair:'none',headwear:'speed',weapon:'sword',belt:false},abeo:{hair:'dreadlocks',hairColor:'#36261d',frame:'agile',weapon:'bat',belt:false},ramiro:{hair:'fade',hairColor:'#181414',beard:true,belt:true,beltStyle:'plain'},ripclaw:{hair:'mohawk',hairColor:'#9a9d9b',claws:true,frame:'heavy',bareArms:true,belt:false},recon:{hair:'none',headwear:'cap',belt:true,beltStyle:'utility'},olympus:{hair:'slicked',hairColor:'#d9b759'},mystward:{hair:'bob',hairColor:'#dedde5'},kivuli:{hair:'dreadlocks',hairColor:'#131817'},moses:{hair:'fade',hairColor:'#242020'},stormcall:{hair:'braids',hairColor:'#babcc1'},foundry:{hair:'none',headwear:'greathelm'}}).map(([id,changes])=>[id,{...directions[id],...changes}]))
});
// Approved direction follow-up; all fields remain editable creator modules.
const previousStefanos={...directions.stefanos};
Object.assign(directions, Object.fromEntries(Object.entries({
 breach:{frame:'machine',primary:'#778c9b',secondary:'#172b3c',trim:'#121719',metallic:true,armor:false,headwear:'helmet',handModule:'cannon',shield:true,shieldStyle:'riot'},
 ironclad:{centerPanel:true,secondary:'#bb7838',regionColors:{arms:'#455d71',legs:'#2b3c4b'}},
 foundry:{metallic:false,hoodie:'short',primary:'#673f35',secondary:'#d4a461',trim:'#21252b',pattern:'denim',patternRegion:'legs',bareArms:true,belt:true,beltStyle:'utility'},
 sol:{hair:'mullet'},ripclaw:{hoodie:'short',hair:'mohawk',primary:'#465961',secondary:'#b95244',trim:'#192930',pattern:'denim',patternRegion:'legs',bareArms:true},
 rage:{frame:'heavy',size:1.25,muscle:1.3,hair:'none'},onyx:{trim:'#000000',secondary:'#48cbd2',glowRegion:'accent',glowStrength:1.5,unlitBlack:true},
 nova:{hair:'parted',hairColor:'#edc87b'},knightfall:{cape:false},
 stefanos:{businessSuit:true,coat:true,coatStyle:'short',primary:'#242b35',secondary:'#dedfd5',pattern:'solid',regionColors:{legs:'#242b35',calves:'#242b35'},footwear:'shoes',mustache:true,beard:true},
 ramiro:{mustache:true},jawah:{mustache:true},kamaria:{hair:'long'},
 }).map(([id,r])=>[id,{...directions[id],...r}])));
directions.abeo={...directions.abeo,coat:previousStefanos.coat,coatStyle:previousStefanos.coatStyle,pattern:previousStefanos.pattern,primary:previousStefanos.primary,secondary:previousStefanos.secondary};
directions.warden={...directions.warden,bareArms:true};
// Preserve the previous pinstripe uniform as a separate reusable costume.
export const HERO_SIGNATURE_RECIPES=Object.fromEntries(ROSTER.map(d=>['roster-'+d.id,{name:d.name+' · signature candidate',rosterId:d.id,frame:d.strength>=9?'heavy':'hero',hair:'none',hairColor:'#222420',primary:d.colors.primary,secondary:d.colors.secondary,trim:'#252b30',skin:d.colors.skin,emblemColor:d.colors.accent,emblem:'none',anatomy:['aegis','majesty','sandra','tempest','kamaria'].includes(d.id)?'female':'male',cape:!!d.colors.cape,armor:/Military|Human Arsenal|Gun Combat/.test(d.role),shoulders:false,gauntlets:false,knees:false,belt:false,beltStyle:'plain',backpack:false,gloves:'full',muscle:1,...directions[d.id]}]));
HERO_SIGNATURE_RECIPES.deck52={name:'Deck 52 · standard mercenary',frame:'hero',hair:'none',headwear:'cap',primary:'#434c3e',secondary:'#938b65',trim:'#212724',skin:'#865738',armor:true,backpack:false,emblem:'deck52',emblemPlacement:'back',cape:false,shoulders:false,gauntlets:false,knees:true,belt:true,footwear:'shoes'};
export const SIGNATURE_DIRECTION_NOTES={moses:'User wants Atlas Protocol purple gas. Current kit remains symbiont/tendrils; appearance changes do not convert powers.',kivuli:'Current canonical Breath of Kampala gas controller. Keep separate from Moses until identity/power reassignment is decided.',coldsnap:'Surfing movement rig remains a separate traversal asset.',aegis:'Sword and shield presentation plus coiled golden lasso. Lasso throw/grab physics remains separate.'};
export function generateDeck52Mercenary(seed=1){
 if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw Error('Seed must be an integer from 0 to 2147483647');let state=(seed+1)>>>0;const choose=items=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return items[state%items.length];};
 return {...HERO_SIGNATURE_RECIPES.deck52,name:'Deck 52 · mercenary '+seed,anatomy:choose(['male','female']),frame:choose(['hero','agile','heavy']),skin:choose(['#593824','#865738','#bb8a63','#d7b091']),primary:choose(['#434c3e','#3f494c','#625d49']),secondary:choose(['#938b65','#768979','#b0aa8c']),headwear:choose(['cap','none','mask']),generation:{schema:1,seed}};
}

