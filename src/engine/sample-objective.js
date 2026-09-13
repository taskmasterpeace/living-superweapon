// Reuses the operation objective surface; its action follows the actual transport state.
export function sampleObjective(g,guidance){
 if(!g.ms?.fieldResearch?.carried)return null;
 const t=g.player?._passengerTransport;
 const action=!t?'Reach the lab and analyze':t.state==='parked'?(t.stop==='lab'?'Disembark and reach the lab':'Depart to return to the lab'):(t.pendingStop==='lab'?'Returning to the lab':'Outbound to depot');
 return `BLOOD RECOVERY · ${guidance} · ${action}`;
}
