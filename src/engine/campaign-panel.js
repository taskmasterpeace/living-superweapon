import {CampaignState,RESEARCH} from './campaign-state.js';

// Save management is usable independently of a running operation. Research activation
// belongs to native equipment handlers; this panel does not sell unwired upgrades.
export function mountCampaignPanel({storage=localStorage}={}){
 const campaign=new CampaignState(storage),dialog=document.createElement('dialog');
 dialog.className='pw-campaign';dialog.setAttribute('aria-label','Campaign records');
 const style=document.createElement('style');style.textContent=`
.pw-campaign{margin:auto;background:var(--ink,#10100e);color:var(--text,#eee6d6);border:1px solid var(--gold,#dcae42);border-radius:10px;padding:24px;width:min(580px,90vw);max-height:85vh;font-family:var(--f-display,system-ui);box-shadow:0 20px 80px #0009}
.pw-campaign::backdrop{background:#080909c9}.pw-campaign h2{margin:0 0 16px;color:var(--gold,#dcae42);letter-spacing:.06em}.pw-campaign .balances{display:flex;gap:24px;margin:18px 0}.pw-campaign strong{font-size:28px;display:block}.pw-campaign footer{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.pw-campaign button{background:var(--surface,#25231e);color:inherit;border:1px solid var(--line,#615337);padding:12px 16px;border-radius:6px;cursor:pointer;min-height:44px}.pw-campaign button:hover{border-color:var(--gold,#dcae42)}.pw-campaign [role=status]{min-height:24px;color:#e4bb6e}.pw-campaign p{line-height:1.5}.pw-campaign .muted{color:var(--text-3,#b8b0a0)}
`;document.head.append(style);document.body.append(dialog);
 const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 let status='';
 function render(){
  dialog.replaceChildren(el('h2','CAMPAIGN RECORDS'));
  const s=campaign.snapshot(),balances=el('div','');balances.className='balances';
  for(const [name,value] of [['Supplies',s.supplies],['Research',s.research]]){const cell=el('div',name);cell.append(el('strong',String(value)));balances.append(cell);}dialog.append(balances);
  dialog.append(el('p',campaign.error?'Your existing save could not be loaded. Import a valid backup or explicitly start a new campaign.':`${s.awarded.length} completed operations recorded. Campaign records stay in this browser until exported.`));
  if(s.purchased.length)dialog.append(el('p','Researched: '+s.purchased.map(id=>RESEARCH[id].name).join(', ')));
  for(const [id,item]of Object.entries(RESEARCH)){
   const section=el('section','');section.append(el('h3',item.name),el('p',item.description));
   const owned=s.purchased.includes(id),affordable=s.supplies>=item.supplies&&s.research>=item.research;
   const buy=el('button',owned?'Researched':`${item.supplies} supplies + ${item.research} research${affordable?'':' · insufficient resources'}`);
   buy.disabled=owned||!affordable||!!campaign.error;buy.onclick=()=>{try{const receipt=campaign.purchase(id);status=receipt.accepted?`${item.name} unlocked.`:receipt.reason;render();}catch(e){status=e.message;render();}};section.append(buy);dialog.append(section);
  }
  const note=el('p','Export your campaign separately when moving to your Mac. GitHub transfers the game, not browser saves.');note.className='muted';dialog.append(note);
  const message=el('p',campaign.error||status);message.setAttribute('role','status');dialog.append(message);
  const footer=el('footer','');
  function button(label,action){const b=el('button',label);b.type='button';b.onclick=()=>{try{action();}catch(e){status=e.message;render();}};footer.append(b);return b;}
  button('Export save',()=>{const blob=new Blob([campaign.exportSave()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='powerworld-campaign.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status='Campaign exported.';render();}).disabled=!!campaign.error;
  button('Import save',()=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>2_000_000)throw Error('Campaign file is too large.');const raw=await file.text();if(!confirm('Replace this browser’s campaign with the selected save?'))return;campaign.importSave(raw);status='Campaign imported.';render();}catch(e){status=e.message;render();}};input.click();});
  button('New campaign',()=>{if(!confirm('Reset campaign resources and research? Export a backup first if you want to keep them.'))return;campaign.reset();status='New campaign created.';render();});
  button('Close',()=>dialog.close());dialog.append(footer);
 }
 return {campaign,open(){render();dialog.showModal();},close(){dialog.close();},dispose(){dialog.remove();style.remove();}};
}
