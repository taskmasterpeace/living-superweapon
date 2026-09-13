import {sessionFor} from './session.mjs';
export async function stageMelee(page,{trial='stationary',distance=14,facing='front',clearTargetInvulnerability=false}={}){
 if(!['stationary','retreat','guard','dodge','defend','airborne','air-defense'].includes(trial)||!Number.isFinite(distance)||distance<5||distance>100||!['front','rear'].includes(facing)||typeof clearTargetInvulnerability!=='boolean')throw new Error('Invalid melee fixture');
 const s=sessionFor(page);if(s.phase!=='setup')throw new Error('Fixture mutation rejected after native acceptance begins');
 if(s.fixtures.length>=8)throw new Error('Fixture limit reached');
 const record={kind:'melee',trial,distance,facing,clearTargetInvulnerability,status:'staging'};s.fixtures.push(record);s.phase='staging';
 try{
  const result=await page.evaluate(config=>{
   const g=globalThis.PW?.game;if(!g?._threatRoom?.active||g.ms?.threatLab?.state!=='preparing'||!g.player?.alive)throw new Error('Melee fixture requires a living player in the preparing Threat Room');
   const a=g.player,t=g.ms.threatLab.meleeTrial;t.origin.set(0,0,0);const v=t.start(config.trial);if(!v)throw new Error('Trial rejected');
   a.pos.set(0,0,config.distance);a.vel.set(0,0,0);if(config.clearTargetInvulnerability)v.invuln=0;
   const dir=config.facing==='rear'?1:-1;g.world._lookYaw=dir===1?0:Math.PI;g.world._lookPitch=0;a.faceDir(0,dir);a.aim3.set(0,0,dir);
   return {time:g.time,player:a.id,target:v.id,hero:a.def.id,targetHp:v.hp};
  },{trial,distance,facing,clearTargetInvulnerability});
  record.status='staged';record.result=result;s.phase='setup';return result;
 }catch(error){record.status='failed';record.error=String(error.message).slice(0,1000);s.phase='failed';throw error;}
}
