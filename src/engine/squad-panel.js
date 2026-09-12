import {ROSTER} from '../data/characters.js';
import {portraitOf} from './player-status-portrait.js';
import {validateSquad} from './squad-config.js';

export function mountSquadPanel() {
  const dialog=document.createElement('dialog');
  dialog.className='pw-squad';dialog.setAttribute('aria-label','Choose your squad');
  const style=document.createElement('style');
  style.textContent=`.pw-squad{margin:auto;width:min(850px,92vw);max-height:88dvh;overflow:auto;padding:24px;background:var(--ink,#10100e);color:var(--text,#eee6d6);border:1px solid var(--gold,#dcae42);border-radius:10px;font-family:var(--f-display,system-ui)}.pw-squad::backdrop{background:#050607df}.pw-squad h2{color:var(--gold,#ffd24a);margin:0}.pw-squad p{color:var(--text-3,#b8b0a0)}.pw-squad button{min-height:44px;padding:10px 15px;border:1px solid #68582e;border-radius:6px;color:inherit;background:#25231e;cursor:pointer}.pw-squad button:hover{border-color:#ffd24a}.pw-squad button[aria-pressed=true]{background:#ffd24a;color:#15120a}.pw-squad button:disabled{opacity:.4;cursor:default}.pw-squad .squad-sides,.pw-squad footer{display:flex;gap:10px;margin:18px 0;flex-wrap:wrap}.pw-squad .squad-roster{max-height:45dvh;overflow:auto;padding-right:6px;scrollbar-color:#8d743c #151512;display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:8px}.pw-squad .squad-roster button{display:flex;flex-direction:column;align-items:start}.pw-squad small{font-size:11px;opacity:.7}.pw-squad [role=status]{min-height:24px}`;
  style.textContent+=`.pw-squad{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:24px 36px;border:0;border-radius:0;background:#101113;display:none;grid-template-columns:340px minmax(0,1fr);grid-template-rows:100px minmax(0,1fr) auto auto;gap:12px 32px}.pw-squad[open]{display:grid}.squad-heading{grid-column:1/-1;display:flex;align-items:center;gap:20px;border-bottom:1px solid #414039}.squad-heading h2{font-size:30px;letter-spacing:.08em}.squad-heading .squad-portrait{height:94px;width:90px;object-fit:contain}.pw-squad .squad-setup{position:static;display:block;min-height:0;overflow:auto;padding-right:14px}.pw-squad .squad-roster{max-height:none;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));align-content:start;gap:12px}.pw-squad .squad-roster button{height:190px;min-height:190px;flex-shrink:0;position:relative;align-items:center;padding:8px 8px 12px;background:#1b1d20;border-color:#454239;overflow:hidden}.pw-squad .squad-roster button[aria-pressed=true]{background:#463918;color:#fff0b5;border:2px solid #ffd24a}.squad-roster .squad-portrait{height:135px;width:100%;object-fit:contain}.pw-squad [role=status],.pw-squad footer{grid-column:1/-1;margin:0}.pw-squad footer{justify-content:space-between;border-top:1px solid #414039;padding-top:12px}.pw-squad footer button:last-child{background:#ffd24a;color:#18140b}.pw-squad .squad-sides{margin:14px 0}.pw-squad p{font-size:13px;line-height:1.6}.pw-squad button:focus-visible{outline:2px solid #fff0b5;outline-offset:2px}@media(max-width:800px){.pw-squad{padding:12px;grid-template-columns:260px minmax(0,1fr);grid-template-rows:72px minmax(0,1fr) auto auto;gap:8px}.squad-heading h2{font-size:22px}.squad-heading .squad-portrait{height:66px;width:65px}.pw-squad .squad-roster{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}.squad-roster .squad-portrait{height:100px}}`;document.head.append(style);document.body.append(dialog);
  let p1='sol',side='lsw',assignment='escort',companions=[],soldiers=0,onDeploy=()=>{},onBack=()=>{};
  const portraits=new Map();let observer;
 function portrait(d){const img=document.createElement('img');img.alt=d.name+' portrait';img.className='squad-portrait';img.dataset.hero=d.id;const cached=portraits.get(d.id);if(cached)img.src=cached;else observer.observe(img);return img;}
 const reserves={soldierReserves:2,lswReserves:2};
  const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
  function button(label,fn,parent){const b=node('button',label);b.type='button';b.onclick=fn;parent.append(b);return b;}
  function render(){
    observer?.disconnect();observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);const d=ROSTER.find(d=>d.id===e.target.dataset.hero);try{const url=portraits.get(d.id)||portraitOf(d);portraits.set(d.id,url);e.target.src=url;}catch{e.target.alt=d.name;}}},{root:dialog,rootMargin:'80px'});
    dialog.replaceChildren();const heading=node('header','');heading.className='squad-heading';const lead=ROSTER.find(d=>d.id===p1);if(lead)heading.append(portrait(lead));heading.append(node('h2','ASSEMBLE YOUR SQUAD'));dialog.append(heading);
    const setup=node('aside','');setup.className='squad-setup';dialog.append(setup);
    setup.append(node('p',`You: ${ROSTER.find(d=>d.id===p1)?.name}. Choose your allegiance and named LSW companions.`));
    const sides=node('div','');sides.className='squad-sides';setup.append(sides);
    for(const [id,label] of [['soldier','SOLDIER SIDE'],['lsw','LSW SIDE']]){
      const b=button(label,()=>{side=id;companions=companions.slice(0,id==='soldier'?1:5);render();},sides);b.setAttribute('aria-pressed',String(side===id));
    }
    const limit=side==='soldier'?1:5;
    const missions=node('div','');missions.className='squad-sides';setup.append(missions);
    for(const [id,label]of [['escort','ESCORT RESEARCH CONVOY'],['ambush','AMBUSH RESEARCH CONVOY']]){const b=button(label,()=>{assignment=id;render();},missions);b.setAttribute('aria-pressed',String(assignment===id));}
    setup.append(node('p',`${companions.length} / ${limit} LSW companions · ${soldiers} Soldier allies · ${1+companions.length+soldiers} / 6 total squad members. Your equipment rules still follow your character’s class.`));
    const troops=node('div','');troops.className='squad-sides';setup.append(troops);
    button('− Soldier',()=>{soldiers--;render();},troops).disabled=soldiers===0;
    button('+ Soldier',()=>{soldiers++;render();},troops).disabled=1+companions.length+soldiers>=6;
    const budgets=node('div','');budgets.className='squad-sides';setup.append(budgets);
    for(const [key,title] of [['soldierReserves','Soldier reserves'],['lswReserves','LSW reserves']]){
      const label=node('label',title+' '),select=document.createElement('select');select.setAttribute('aria-label',title);
      select.style.cssText='min-height:44px;padding:8px;background:var(--ink,#10100e);color:var(--text,#eee6d6);border:1px solid var(--gold,#dcae42)';
      for(let n=0;n<=12;n++){const option=node('option',String(n));option.value=String(n);select.append(option);}select.value=String(reserves[key]);select.onchange=()=>{reserves[key]=Number(select.value);};label.append(select);budgets.append(label);
    }
    setup.append(node('p','Reserves replace lost allies; they do not add active squad slots. Classes absent from your squad receive no reserve stock.'));
    setup.append(node('p',assignment==='escort'?'Escort: recruit the scientist, board and dispatch the convoy, then protect the delivery.':'Ambush prototype: interception and full extraction are still awaiting native-play validation.'));
    const roster=node('div','');roster.className='squad-roster';dialog.append(roster);
    for(const d of ROSTER.filter(d=>d.id!==p1&&d.archetype!=='soldier')){
      const chosen=companions.includes(d.id);
      const b=button(d.name,()=>{companions=chosen?companions.filter(id=>id!==d.id):[...companions,d.id];render();},roster);
      b.prepend(portrait(d));b.append(node('small',d.threat||'LSW'));b.setAttribute('aria-pressed',String(chosen));b.disabled=!chosen&&(companions.length>=limit||1+companions.length+soldiers>=6);
    }
    const status=node('p','');status.setAttribute('role','status');dialog.append(status);
    const footer=node('footer','');dialog.append(footer);
    button('Back to character',()=>{dialog.close();onBack();},footer);
    button('Enter with squad',()=>{try{const cfg=validateSquad({side,p1,assignment,companions,soldiers,...reserves},ROSTER);dialog.close();onDeploy(cfg);}catch(e){status.textContent=e.message;}},footer);
  }
  dialog.addEventListener('cancel',()=>onBack());dialog.addEventListener('close',()=>observer?.disconnect());
  return {open(id,deploy,back){p1=id;companions=companions.filter(c=>c!==id);onDeploy=deploy;onBack=back;render();dialog.showModal();},close(){dialog.close();}};
}
