// Review filters only. A family does not grant a move or change its controller.
export function animationFamily(name='') {
 const key=name.toLowerCase().replaceAll('_',' ');
 if(/zombie|infected/.test(key))return 'Infected and creatures';
 if(/poison|gas|burn|acid|stun|stagger|fall|knock|laytoidle|recovery/.test(key))return 'Reactions and recovery';
 if(/grab|clinch|carry|pick.?up|throw|boomerang/.test(key))return 'Grabs, carries and throws';
 if(/sword|shield|rifle|pistol|spear|bow|axe|treechop/.test(key))return 'Weapon actions';
 if(/punch|kick|knee|melee|block/.test(key))return 'Unarmed combat';
 if(/fly|flight|hover|takeoff/.test(key))return 'Flight';
 if(/jump|land|roll|slide|climb|grappl|wall|run|jog|sprint|walk/.test(key))return 'Movement and traversal';
 return 'Other actions';
}
