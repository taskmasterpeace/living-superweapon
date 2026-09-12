import {ROSTER} from '../data/characters.js';
import {validateSquad} from './squad-config.js';

export function mountSquadPanel() {
  const dialog=document.createElement('dialog');
  dialog.className='pw-squad';dialog.setAttribute('aria-label','Choose your squad');
  const style=document.createElement('style');
  style.textContent=`.pw-squad{margin:auto;width:min(850px,92vw);max-height:88dvh;overflow:auto;padding:24px;background:var(--ink,#10100e);color:var(--text,#eee6d6);border:1px solid var(--gold,#dcae42);border-radius:10px;font-family:var(--f-display,system-ui)}.pw-squad::backdrop{background:#050607df}.pw-squad h2{color:var(--gold,#ffd24a);margin:0}.pw-squad p{color:var(--text-3,#b8b0a0)}.pw-squad button{min-height:44px;padding:10px 15px;border:1px solid #68582e;border-radius:6px;color:inherit;background:#25231e;cursor:pointer}.pw-squad button:hover{border-color:#ffd24a}.pw-squad button[aria-pressed=true]{background:#ffd24a;color:#15120a}.pw-squad button:disabled{opacity:.4;cursor:default}.pw-squad .squad-sides,.pw-squad footer{display:flex;gap:10px;margin:18px 0;flex-wrap:wrap}.pw-squad .squad-roster{max-height:45dvh;overflow:auto;padding-right:6px;scrollbar-color:#8d743c #151512;display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:8px}.pw-squad .squad-roster button{display:flex;flex-direction:column;align-items:start}.pw-squad small{font-size:11px;opacity:.7}.pw-squad [role=status]{min-height:24px}`;
  document.head.append(style);document.body.append(dialog);
  let p1='sol',side='lsw',assignment='escort',companions=[],soldiers=0,onDeploy=()=>{},onBack=()=>{};
  const reserves={soldierReserves:2,lswReserves:2};
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  function button(label,fn,parent){const b=node('button',label);b.type='button';b.onclick=fn;parent.append(b);return b;}
  function render(){
    dialog.replaceChildren(node('h2','ASSEMBLE YOUR SQUAD'));
    dialog.append(node('p',`You: ${ROSTER.find(d=>d.id===p1)?.name}. Choose your allegiance and named LSW companions.`));
    const sides=node('div','');sides.className='squad-sides';dialog.append(sides);
    for(const [id,label] of [['soldier','SOLDIER SIDE'],['lsw','LSW SIDE']]){
      const b=button(label,()=>{side=id;companions=companions.slice(0,id==='soldier'?1:5);render();},sides);b.setAttribute('aria-pressed',String(side===id));
    }
    const limit=side==='soldier'?1:5;
    const missions=node('div','');missions.className='squad-sides';dialog.append(missions);
    for(const [id,label]of [['escort','ESCORT RESEARCH CONVOY'],['ambush','AMBUSH RESEARCH CONVOY']]){const b=button(label,()=>{assignment=id;render();},missions);b.setAttribute('aria-pressed',String(assignment===id));}
    dialog.append(node('p',`${companions.length} / ${limit} LSW companions · ${soldiers} Soldier allies · ${1+companions.length+soldiers} / 6 total squad members. Your equipment rules still follow your character’s class.`));
    const troops=node('div','');troops.className='squad-sides';dialog.append(troops);
    button('− Soldier',()=>{soldiers--;render();},troops).disabled=soldiers===0;
    button('+ Soldier',()=>{soldiers++;render();},troops).disabled=1+companions.length+soldiers>=6;
    const budgets=node('div','');budgets.className='squad-sides';dialog.append(budgets);
    for(const [key,title] of [['soldierReserves','Soldier reserves'],['lswReserves','LSW reserves']]){
      const label=node('label',title+' '),select=document.createElement('select');select.setAttribute('aria-label',title);
      select.style.cssText='min-height:44px;padding:8px;background:var(--ink,#10100e);color:var(--text,#eee6d6);border:1px solid var(--gold,#dcae42)';
      for(let n=0;n<=12;n++){const option=node('option',String(n));option.value=String(n);select.append(option);}select.value=String(reserves[key]);select.onchange=()=>{reserves[key]=Number(select.value);};label.append(select);budgets.append(label);
    }
    dialog.append(node('p','Reserves replace lost allies; they do not add active squad slots. Classes absent from your squad receive no reserve stock.'));
    const roster=node('div','');roster.className='squad-roster';dialog.append(roster);
    for(const d of ROSTER.filter(d=>d.id!==p1&&d.archetype!=='soldier')){
      const chosen=companions.includes(d.id);
      const b=button(d.name,()=>{companions=chosen?companions.filter(id=>id!==d.id):[...companions,d.id];render();},roster);
      b.append(node('small',d.threat||'LSW'));b.setAttribute('aria-pressed',String(chosen));b.disabled=!chosen&&(companions.length>=limit||1+companions.length+soldiers>=6);
    }
    const status=node('p','');status.setAttribute('role','status');dialog.append(status);
    const footer=node('footer','');dialog.append(footer);
    button('Back to character',()=>{dialog.close();onBack();},footer);
    button('Enter with squad',()=>{try{const cfg=validateSquad({side,p1,assignment,companions,soldiers,...reserves},ROSTER);dialog.close();onDeploy(cfg);}catch(e){status.textContent=e.message;}},footer);
  }
  dialog.addEventListener('cancel',()=>onBack());
  return {open(id,deploy,back){p1=id;companions=companions.filter(c=>c!==id);onDeploy=deploy;onBack=back;render();dialog.showModal();},close(){dialog.close();}};
}
