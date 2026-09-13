// =================================================================================================
// THE ARMORY — pick what you carry, and be able to tell why one is better than another.
//
// Catalog choices persist; explicit issuance equips the current living soldier
// through game.equipFrom. Previewing or saving a row alone never changes kit.
//
// ⚠ EVERY NUMBER IS READ FROM `data/armory.js`. Nothing here is authored twice — DPS, reach, spread
// and range are DERIVED from the same `ab` block the engine fires with, so the comparison cannot
// flatter a weapon the engine treats differently. If the screen and the fight ever disagree, the
// screen is wrong by construction, which is the only kind of comparison worth showing.
//
// ⚠ AND THE BARS ARE NORMALISED WITHIN A CATEGORY, NOT GLOBALLY. A 46-damage marksman round against
// a 9mm is a real gap; the same bar drawn against a beam ultimate would make every firearm look
// identical, which is exactly how a stat screen ends up decorative.
//
// THE THING THIS SCREEN HAS THAT A TABLE DOES NOT: you can HEAR them. Manual §38 gave every firearm
// its own crack/body/tail/mech profile precisely so twelve weapons are twelve weapons and not one
// bang twelve times. That work is already paid for and was, until now, only audible by being shot.
// =================================================================================================
import { FIREARMS, BLADES, GEAR, LOADOUTS, weaponById, gearById } from '../data/armory.js';

const LS = 'threshold_loadout_v1';

// ---- the derived comparison axes. One place, so the table, the bars and the compare panel agree.
// `hi: false` means LOWER IS BETTER — the winner highlight has to know which way each row runs, or
// it cheerfully congratulates the weapon with the worst recoil.
const AXES = {
  firearm: [
    { k: 'dmg', n: 'Damage / shot', s: 'hit', u: '', hi: true, f: (w) => (w.ab.damage || 0) * (w.ab.pellets || 1) },
    { k: 'dps', n: 'Damage / second', s: 'dps', u: '', hi: true, f: (w) => ((w.ab.damage || 0) * (w.ab.pellets || 1)) / Math.max(0.01, w.ab.interval || 1) },
    { k: 'rof', n: 'Rounds / second', s: 'rate', u: '', hi: true, f: (w) => 1 / Math.max(0.01, w.ab.interval || 1) },
    { k: 'acc', n: 'Accuracy', s: 'aim', u: '', hi: true, f: (w) => 1 / Math.max(0.0005, w.ab.spread || 0.02) },
    { k: 'rng', n: 'Reach', s: 'reach', u: 'u', hi: true, f: (w) => (w.ab.speed || 0) * (w.ab.life != null ? w.ab.life : 1.2) },
    { k: 'kick', n: 'Recoil', s: 'kick', u: '', hi: false, f: (w) => w.ab.recoil || 0 },
    { k: 'ki', n: 'Energy cost', s: 'ki', u: '', hi: false, f: (w) => w.ab.cost || 0 },
  ],
  blade: [
    { k: 'dmg', n: 'Damage / swing', s: 'hit', u: '', hi: true, f: (w) => w.ab.damage || 0 },
    { k: 'dps', n: 'Damage / second', s: 'dps', u: '', hi: true, f: (w) => (w.ab.damage || 0) / Math.max(0.01, w.ab.cd || 1) },
    { k: 'reach', n: 'Reach', s: 'reach', u: 'u', hi: true, f: (w) => w.ab.reach || 0 },
    { k: 'arc', n: 'Arc', s: 'arc', u: 'rad', hi: true, f: (w) => w.ab.arc || 0 },
    { k: 'rate', n: 'Swings / second', s: 'rate', u: '', hi: true, f: (w) => 1 / Math.max(0.01, w.ab.cd || 1) },
  ],
  gear: [
    { k: 'chg', n: 'Charges / life', s: 'uses', u: '', hi: true, f: (g) => g.charges || 0 },
    { k: 'r', n: 'Radius', s: 'radius', u: 'u', hi: true, f: (g) => g.r || 0 },
    { k: 'dur', n: 'Duration', s: 'lasts', u: 's', hi: true, f: (g) => g.dur || 0 },
  ],
};

// ---- traits, derived from the data rather than a hand-kept list, so a new row filters itself
const TRAITS = {
  firearm: [
    { k: 'quiet', n: 'Suppressed', t: (w) => !!w.ab.quiet },
    { k: 'pierce', n: 'Armour-piercing', t: (w) => !!w.ab.pierce },
    { k: 'buck', n: 'Buckshot', t: (w) => (w.ab.pellets || 1) > 1 },
    { k: 'one', n: 'One-handed', t: (w) => !!w.ab.oneHand },
    { k: 'auto', n: 'Automatic', t: (w) => (w.ab.interval || 1) <= 0.16 },
  ],
  blade: [
    { k: 'slash', n: 'Cuts (bleeds)', t: (w) => w.ab.dmgClass === 'slash' },
    { k: 'one', n: 'One-handed', t: (w) => !!w.ab.oneHand },
    { k: 'stag', n: 'Staggers', t: (w) => !!w.ab.stagger },
  ],
  gear: [
    { k: 'police', n: 'Police issue', t: (g) => !!g.police },
    { k: 'banned', n: 'Restricted', t: (g) => !!g.banned },
  ],
};

export function loadLoadout() {
  try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); if (o && typeof o === 'object') return {lmb:weaponById(o.lmb)?.id||null,rmb:weaponById(o.rmb)?.id||null,gear:Array.isArray(o.gear)?o.gear.filter(id=>gearById(id)).slice(0,3):[]}; } catch (e) {}
  return { lmb: null, rmb: null, gear: [] };
}
export function saveLoadout(l) { try { localStorage.setItem(LS, JSON.stringify(l)); } catch (e) {} return l; }

export function loadoutIssueError(game,actor,id){
  if(!actor||actor!==game?.player||!game.entities?.includes(actor))return 'Enter a match with a soldier to issue a weapon.';
  if(!actor.alive||actor.state==='ko'||actor.downedT>0||game.matchOver)return 'Cannot issue while down or after the match.';
  if(actor.def?.archetype!=='soldier')return 'Weapon issuance requires a soldier.';
  if(actor._carry||actor.grabbedBy||actor.grabbing||actor._aircraftVehicle||actor._scoutVehicle)return 'Leave the current action or vehicle before issuing.';
  if(!weaponById(id))return 'Select a weapon for LMB first.';
  return null;
}

const CSS = `
#hArm{ position:fixed; inset:0; z-index:64; display:none; background:rgba(6,7,10,.94); backdrop-filter:blur(4px);
  color:var(--text); font-family:var(--f-display,"Rajdhani",system-ui,sans-serif); }
#hArm.on{ display:flex; flex-direction:column; }
#hArm .amtop{ display:flex; align-items:center; gap:14px; padding:11px 20px; border-bottom:1px solid var(--line,rgba(255,255,255,.12)); }
#hArm .amcls{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.34em; text-transform:uppercase;
  color:var(--stamp,#b8523f); border:1px solid currentColor; padding:3px 8px; }
#hArm .amttl{ font-size:21px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:var(--gold); }
#hArm .amcount{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.2em; color:var(--text-5,#7d776b); text-transform:uppercase; }
#hArm .amx{ margin-left:auto; cursor:pointer; background:none; border:1px solid var(--line,rgba(255,255,255,.14));
  color:var(--text-3,#b3ab9a); padding:5px 12px; border-radius:var(--r-1,4px); font-family:inherit; font-size:var(--t-md,13px); letter-spacing:.1em; }
#hArm .amx:hover{ color:var(--gold); border-color:var(--gold-deep,#8a6b1e); }
#hArm .ambody{ flex:1; display:flex; min-height:0; }
#hArm .amrail{ width:236px; flex:none; border-right:1px solid var(--line,rgba(255,255,255,.12)); padding:14px 14px 18px; overflow-y:auto; }
#hArm .amsh{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.3em; text-transform:uppercase;
  color:var(--text-5,#7d776b); border-bottom:1px dashed var(--line-2,rgba(255,255,255,.09)); padding-bottom:5px; margin:16px 0 9px; }
#hArm .amsh:first-child{ margin-top:0; }
#hArm .amcat{ display:flex; flex-direction:column; gap:4px; }
#hArm .amcat button, #hArm .amchip{ text-align:left; background:var(--surface-hi,#1a1a16); border:1px solid var(--line-2,rgba(255,255,255,.09));
  color:var(--text-3,#b3ab9a); padding:7px 10px; border-radius:var(--r-1,4px); cursor:pointer; font-family:inherit;
  font-size:var(--t-md,13px); letter-spacing:.08em; text-transform:uppercase; }
#hArm .amcat button.on{ background:var(--grad-gold,linear-gradient(180deg,#e0b23c,#8a6b1e)); border-color:var(--gold); color:var(--on-gold,#20180a); font-weight:700; }
#hArm .amchips{ display:flex; flex-wrap:wrap; gap:5px; }
#hArm .amchip{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.12em; padding:4px 8px; border-radius:var(--r-pill,20px); }
#hArm .amchip.on{ color:var(--gold); border-color:var(--gold-deep,#8a6b1e); background:var(--surface-hi,#221d12); }
#hArm input.amq, #hArm select.amq{ width:100%; background:var(--surface-hi,#1a1a16); border:1px solid var(--line,rgba(255,255,255,.14));
  color:var(--text); padding:6px 9px; font-family:inherit; font-size:var(--t-md,13px); border-radius:var(--r-1,4px); }
#hArm .amlist{ flex:1; overflow-y:auto; padding:10px 14px 20px; min-width:0; }
#hArm .amrow{ display:grid; grid-template-columns:22px 1fr 300px 128px; gap:12px; align-items:center;
  padding:9px 10px; border:1px solid transparent; border-bottom:1px solid var(--line-2,rgba(255,255,255,.07)); }
#hArm .amrow:hover{ background:rgba(255,255,255,.028); }
#hArm .amrow.sel{ border-color:var(--gold-deep,#8a6b1e); background:rgba(224,178,60,.07); }
#hArm .amrow .amn{ font-size:var(--t-lg,15px); font-weight:700; letter-spacing:.05em; }
#hArm .amrow .amd{ font-size:var(--t-sm,11px); color:var(--text-4,#96907f); line-height:1.35; margin-top:2px; }
#hArm .amtag{ display:inline-block; font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.12em;
  padding:1px 5px; border:1px solid var(--line-2,rgba(255,255,255,.12)); color:var(--text-5,#7d776b); border-radius:2px; margin:3px 3px 0 0; }
#hArm .ambars{ display:flex; flex-direction:column; gap:3px; }
#hArm .ambar{ display:flex; align-items:center; gap:6px; font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); color:var(--text-5,#7d776b); }
#hArm .ambar span{ width:52px; flex:none; letter-spacing:.1em; text-transform:uppercase; }
#hArm .ambar i{ height:5px; background:var(--gold-deep,#8a6b1e); display:block; border-radius:1px; }
#hArm .ambar em{ font-style:normal; color:var(--text-3,#b3ab9a); min-width:38px; text-align:right; font-variant-numeric:tabular-nums; }
#hArm .ambtns{ display:flex; flex-direction:column; gap:4px; }
#hArm .ambtns button{ background:var(--surface-hi,#1c1a15); border:1px solid var(--line,rgba(255,255,255,.14)); color:var(--text-3,#b3ab9a);
  padding:5px 6px; border-radius:var(--r-1,4px); cursor:pointer; font-family:var(--f-mono,monospace);
  font-size:var(--t-micro,8.5px); letter-spacing:.14em; text-transform:uppercase; }
#hArm .ambtns button:hover{ color:var(--gold); border-color:var(--gold-deep,#8a6b1e); }
#hArm .ambtns button.eq{ background:var(--grad-gold,linear-gradient(180deg,#e0b23c,#8a6b1e)); border-color:var(--gold); color:var(--on-gold,#20180a); font-weight:700; }
#hArm .amcmp{ width:392px; flex:none; border-left:1px solid var(--line,rgba(255,255,255,.12)); padding:14px 16px 20px; overflow-y:auto; }
#hArm table.amt{ width:100%; border-collapse:collapse; font-size:var(--t-md,13px); }
#hArm table.amt th{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.12em; text-transform:uppercase;
  color:var(--text-5,#7d776b); text-align:right; padding:5px 4px; border-bottom:1px solid var(--line-2,rgba(255,255,255,.09)); font-weight:400; }
#hArm table.amt th:first-child{ text-align:left; }
#hArm table.amt td{ padding:5px 4px; text-align:right; color:var(--text-2,#cfc7b6); font-variant-numeric:tabular-nums;
  border-bottom:1px solid var(--line-2,rgba(255,255,255,.05)); }
#hArm table.amt td:first-child{ text-align:left; font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px);
  letter-spacing:.12em; text-transform:uppercase; color:var(--text-5,#7d776b); }
#hArm table.amt td.win{ color:var(--gold); font-weight:700; }
#hArm .amslot{ display:flex; align-items:baseline; gap:8px; padding:4px 0; font-size:var(--t-md,13px); }
#hArm .amslot b{ font-family:var(--f-mono,monospace); font-size:var(--t-micro,8.5px); letter-spacing:.16em;
  text-transform:uppercase; color:var(--text-5,#7d776b); width:44px; flex:none; }
#hArm .amnote{ font-size:var(--t-sm,11px); color:var(--text-4,#96907f); line-height:1.45; margin-top:8px; }
#hArm .amempty{ font-size:var(--t-md,13px); color:var(--text-4,#96907f); line-height:1.5; }
@media (max-width:1180px){ #hArm .amcmp{ display:none; } #hArm .amrow{ grid-template-columns:22px 1fr 200px 110px; } }
@media (max-width:640px){
 #hArm .amtop{padding:8px;gap:8px;flex-wrap:wrap} #hArm .amcls,#hArm .amcount{display:none}
 #hArm .ambody{flex-direction:column;overflow:auto} #hArm .amrail{width:auto;overflow:visible;border-right:0;padding:12px}
 #hArm .amcat{flex-direction:row;flex-wrap:wrap} #hArm .amlist{overflow:visible;flex:none;padding:8px}
 #hArm .amrow{grid-template-columns:22px minmax(0,1fr) 90px;gap:6px} #hArm .ambars{display:none}
 #hArm button{min-height:44px} #hArm .amnote{font-size:12px}
}
`;

const num = (v) => v >= 1000 ? Math.round(v) : v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);

export function openArmory(game, hud) {
  if (document.getElementById('hArm')) return null;
  const actor=game?.player,previousFocus=document.activeElement;
  const prior={running:game?.running,paused:game?.paused};
  if(game){game.retireCombatViewInput?.(actor);game.running=false;game.paused=true;game.combatOverlayOpen=true;}
  if(document.pointerLockElement)document.exitPointerLock?.();
  if (!document.getElementById('hArmCss')) {
    const st = document.createElement('style'); st.id = 'hArmCss'; st.textContent = CSS; document.head.appendChild(st);
  }
  const el = document.createElement('div');
  el.id = 'hArm';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Armory loadout');
  el.innerHTML = `
    <div class="amtop">
      <span class="amcls">quartermaster · issue</span>
      <span class="amttl">The Armory</span>
      <span class="amcount" id="amCount"></span>
      <button class="amx" id="amX">Close ✕</button>
    </div>
    <div class="ambody">
      <div class="amrail" id="amRail"></div>
      <div class="amlist" id="amList"></div>
      <div class="amcmp" id="amCmp"></div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));

  let cat = 'firearm', q = '', sort = 'dmg', cls = null;
  const traits = new Set();
  const compare = [];                       // ids, max 3
  let load = loadLoadout();
  let issueNotice='Selection saved locally. Confirm below to equip your current soldier.';

  const rows = () => {
    const src = cat === 'firearm' ? FIREARMS : cat === 'blade' ? BLADES : GEAR;
    let out = src.slice();
    if (cat === 'firearm' && cls) out = out.filter(w => w.cls === cls);
    if (traits.size) {
      const defs = TRAITS[cat] || [];
      out = out.filter(w => [...traits].every(k => { const d = defs.find(x => x.k === k); return d && d.t(w); }));
    }
    if (q) { const s = q.toLowerCase(); out = out.filter(w => (w.n + ' ' + (w.d || '')).toLowerCase().includes(s)); }
    const ax = (AXES[cat] || []).find(a => a.k === sort);
    if (ax) out.sort((a, b) => (ax.hi ? 1 : -1) * (ax.f(b) - ax.f(a)));
    return out;
  };
  // ⚠ the bar maximum comes from the WHOLE category, never the filtered view — otherwise filtering
  // to two pistols redraws them as if one were the best weapon in the game.
  const maxOf = (axis) => {
    const src = cat === 'firearm' ? FIREARMS : cat === 'blade' ? BLADES : GEAR;
    return Math.max(...src.map(axis.f), 0.0001);
  };

  const rail = el.querySelector('#amRail'), list = el.querySelector('#amList'), cmp = el.querySelector('#amCmp');

  function renderRail() {
    const cats = [['firearm', 'Firearms', FIREARMS.length], ['blade', 'Blades', BLADES.length],
      ['gear', 'Gear', GEAR.length], ['loadout', 'Preset Loadouts', Object.keys(LOADOUTS).length]];
    const classes = [...new Set(FIREARMS.map(w => w.cls))];
    rail.innerHTML = `
      <div class="amsh">category</div>
      <div class="amcat">${cats.map(([k, n, c]) =>
        `<button data-cat="${k}" class="${cat === k ? 'on' : ''}">${n} <span style="opacity:.6">${c}</span></button>`).join('')}</div>
      ${cat === 'loadout' ? '' : `
        <div class="amsh">search</div>
        <input class="amq" id="amQ" placeholder="name or description" value="${q.replace(/"/g, '')}">
        ${cat === 'firearm' ? `<div class="amsh">class</div><div class="amchips">
          ${classes.map(c => `<span class="amchip ${cls === c ? 'on' : ''}" data-cls="${c}">${c}</span>`).join('')}</div>` : ''}
        <div class="amsh">traits</div>
        <div class="amchips">${(TRAITS[cat] || []).map(t =>
          `<span class="amchip ${traits.has(t.k) ? 'on' : ''}" data-tr="${t.k}">${t.n}</span>`).join('')}</div>
        <div class="amsh">sort by</div>
        <select class="amq" id="amS">${(AXES[cat] || []).map(a =>
          `<option value="${a.k}" ${sort === a.k ? 'selected' : ''}>${a.n}</option>`).join('')}</select>`}
      <div class="amsh">your loadout</div>
      <div class="amslot"><b>LMB</b><span>${load.lmb ? (weaponById(load.lmb) || {}).n || load.lmb : '—'}</span></div>
      <div class="amslot"><b>RMB</b><span>${load.rmb ? (weaponById(load.rmb) || {}).n || load.rmb : '—'}</span></div>
      <div class="amslot"><b>Gear</b><span>${load.gear.length ? load.gear.map(g => (gearById(g) || {}).n || g).join(', ') : '—'}</span></div>
      <div class="amnote" role="status" id="amIssueStatus">${issueNotice}</div>
      <div class="ambtns"><button id="amIssue" ${loadoutIssueError(game,actor,load.lmb)?'disabled':''}>Equip selected weapon · LMB</button></div>
      <div class="amnote">${loadoutIssueError(game,actor,load.lmb)||(weaponById(load.lmb)?.ab.type==='melee'?'Replaces your primary weapon. LMB swings · connect with the weapon, then recover.':'Replaces your primary firearm. LMB fires · R reloads · wheel selects attacks.')+' Other saved slots are not issued here.'}</div>`;
    rail.querySelector('#amIssue').onclick=()=>{
      const error=loadoutIssueError(game,actor,load.lmb);
      if(error){issueNotice=error;renderRail();return;}
      game.retireCombatViewInput?.(actor);
      const row=weaponById(load.lmb),issued=game.equipFrom(actor,row,{primary:true});
      issueNotice=issued?`EQUIPPED — ${row.n} · LMB`:'Issuance failed. Your current weapon is unchanged.';
      if(issued){hud?.buildSlots?.({...actor.def,abilities:{...actor.def.abilities,lmb:actor.slots.lmb.def}});hud?.selectSlot?.('lmb',actor._selSecondary);}
      renderRail();
    };
    rail.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
      cat = b.dataset.cat; cls = null; traits.clear(); q = '';
      sort = (AXES[cat] || [{ k: 'dmg' }])[0].k; compare.length = 0; render();
    });
    const qi = rail.querySelector('#amQ');
    if (qi) qi.oninput = () => { q = qi.value; renderList(); };
    const si = rail.querySelector('#amS');
    if (si) si.onchange = () => { sort = si.value; renderList(); };
    rail.querySelectorAll('[data-cls]').forEach(c => c.onclick = () => { cls = cls === c.dataset.cls ? null : c.dataset.cls; render(); });
    rail.querySelectorAll('[data-tr]').forEach(c => c.onclick = () => {
      const k = c.dataset.tr; traits.has(k) ? traits.delete(k) : traits.add(k); render();
    });
  }

  function renderList() {
    if (cat === 'loadout') {
      list.innerHTML = Object.entries(LOADOUTS).map(([k, L]) => `
        <div class="amrow" data-lo="${k}">
          <span></span>
          <div><div class="amn">${L.n}</div>
            <div class="amd">${(L.guns || []).map(g => (weaponById(g) || {}).n || g).join(' · ')}${L.gear && L.gear.length ? ' — ' + L.gear.map(g => (gearById(g) || {}).n || g).join(' · ') : ''}</div></div>
          <span></span>
          <div class="ambtns"><button data-take="${k}">Take loadout</button></div>
        </div>`).join('');
      list.querySelectorAll('[data-take]').forEach(b => b.onclick = () => {
        const L = LOADOUTS[b.dataset.take];
        load = { lmb: L.guns[0] || null, rmb: L.guns[1] || null, gear: (L.gear || []).slice(0, 3) };
        saveLoadout(load); render();
      });
      el.querySelector('#amCount').textContent = Object.keys(LOADOUTS).length + ' presets';
      return;
    }
    const axes = AXES[cat] || [], R = rows();
    const bars = axes.slice(0, 3);
    const maxes = bars.map(maxOf);
    list.innerHTML = R.map((w) => {
      const tags = (TRAITS[cat] || []).filter(t => t.t(w)).map(t => `<i class="amtag">${t.n}</i>`).join('');
      const cl = cat === 'firearm' ? `<i class="amtag">${w.cls}</i>` : cat === 'gear' ? `<i class="amtag">${w.kind}</i>` : '';
      const bh = bars.map((a, i) => {
        const v = a.f(w), pct = Math.max(2, Math.min(100, 100 * v / maxes[i]));
        return `<div class="ambar"><span>${a.s || a.n}</span><i style="width:${pct * 1.5}px"></i><em>${num(v)}${a.u}</em></div>`;
      }).join('');
      const on = compare.includes(w.id);
      return `<div class="amrow ${on ? 'sel' : ''}" data-id="${w.id}">
        <input type="checkbox" data-cmp="${w.id}" ${on ? 'checked' : ''} title="Compare">
        <div><div class="amn">${w.n}</div><div class="amd">${w.d || ''}</div><div>${cl}${tags}</div></div>
        <div class="ambars">${bh}</div>
        <div class="ambtns">
          ${cat === 'gear'
            ? `<button data-eq="${w.id}" data-slot="gear" class="${load.gear.includes(w.id) ? 'eq' : ''}">${load.gear.includes(w.id) ? '✓ carried' : '+ carry'}</button>`
            : `<button data-eq="${w.id}" data-slot="lmb" class="${load.lmb === w.id ? 'eq' : ''}">LMB</button>
               <button data-eq="${w.id}" data-slot="rmb" class="${load.rmb === w.id ? 'eq' : ''}">RMB</button>`}
          ${cat === 'firearm' ? `<button data-hear="${w.id}">▶ hear it</button>` : ''}
        </div></div>`;
    }).join('') || `<div class="amempty">Nothing matches those filters.</div>`;
    el.querySelector('#amCount').textContent = R.length + ' of ' +
      (cat === 'firearm' ? FIREARMS.length : cat === 'blade' ? BLADES.length : GEAR.length) + ' shown';

    list.querySelectorAll('[data-cmp]').forEach(c => c.onchange = () => {
      const id = c.dataset.cmp, i = compare.indexOf(id);
      if (i >= 0) compare.splice(i, 1); else { compare.push(id); if (compare.length > 3) compare.shift(); }
      renderList(); renderCmp();
    });
    list.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      const id = b.dataset.eq, slot = b.dataset.slot;
      if (slot === 'gear') {
        const i = load.gear.indexOf(id);
        if (i >= 0) load.gear.splice(i, 1); else { load.gear.push(id); if (load.gear.length > 3) load.gear.shift(); }
      } else load[slot] = load[slot] === id ? null : id;
      saveLoadout(load); issueNotice='Selection saved. Confirm Equip selected firearm to issue LMB.'; render();
    });
    // ⚠ THE ONE THING A TABLE CANNOT DO. Every firearm has its own crack/body/tail/mech profile
    // (manual §38) and it was only ever audible by being shot at. `audio.gunshot` takes the voice.
    list.querySelectorAll('[data-hear]').forEach(b => b.onclick = () => {
      const w = weaponById(b.dataset.hear);
      try {
        game.audio.init && game.audio.init(); game.audio.resume && game.audio.resume();
        game.audio.gunshot(1, null, w.voice);
      } catch (e) { /* audio must never throw into a click handler either */ }
    });
  }

  function renderCmp() {
    if (cat === 'loadout') { cmp.innerHTML = `<div class="amsh">compare</div><div class="amempty">Pick a category to compare individual items.</div>`; return; }
    const items = compare.map(id => (cat === 'gear' ? gearById(id) : weaponById(id))).filter(Boolean);
    if (items.length < 2) {
      cmp.innerHTML = `<div class="amsh">side by side</div>
        <div class="amempty">Tick two or three rows to compare them. The better figure in each row is
        marked — and <b>lower is better</b> for recoil and energy cost, which is exactly the kind of
        thing a plain table gets wrong.</div>`;
      return;
    }
    const axes = AXES[cat] || [];
    const body = axes.map(a => {
      const vals = items.map(a.f);
      const best = a.hi ? Math.max(...vals) : Math.min(...vals);
      return `<tr><td>${a.n}</td>${vals.map(v =>
        `<td class="${Math.abs(v - best) < 1e-9 ? 'win' : ''}">${num(v)}${a.u}</td>`).join('')}</tr>`;
    }).join('');
    cmp.innerHTML = `<div class="amsh">side by side</div>
      <table class="amt"><thead><tr><th>Figure</th>${items.map(i => `<th>${i.n.split(' ')[0]}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody></table>
      <div class="amnote">${items.map(i => `<b style="color:var(--gold)">${i.n}</b> — ${i.d || ''}`).join('<br><br>')}</div>`;
  }

  function render() { renderRail(); renderList(); renderCmp(); }

  const close = () => {
    window.removeEventListener('keydown', onKey, true);
    el.remove();
    if (game) {
      game._armory = null;game.retireCombatViewInput?.(game.player);
      if(game.player===actor&&!game.matchOver){game.running=prior.running;game.paused=prior.paused;}
      game.combatOverlayOpen=!!hud?.overlayOpen?.();
    }
    previousFocus?.focus?.();
  };
  const onKey = (e) => {
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    // Menu typing must never enter the global game input/key handlers.
    e.stopImmediatePropagation();
    if(e.key==='Tab'){
      const buttons=[...el.querySelectorAll('button:not(:disabled),input,select')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  };
  window.addEventListener('keydown', onKey, true);
  el.querySelector('#amX').onclick = close;

  render();
  el.querySelector('#amX').focus();
  const api = { el, close, get loadout() { return load; },
    // test seams — drive the real render paths without a mouse
    setCategory(c) { cat = c; cls = null; traits.clear(); sort = (AXES[c] || [{ k: 'dmg' }])[0].k; render(); return rows().length; },
    setFilter(o) { if (o.cls !== undefined) cls = o.cls; if (o.q !== undefined) q = o.q;
      if (o.trait) traits.has(o.trait) ? traits.delete(o.trait) : traits.add(o.trait);
      if (o.sort) sort = o.sort; render(); return rows().map(r => r.id); },
    compareWith(ids) { compare.length = 0; ids.forEach(i => compare.push(i)); renderList(); renderCmp(); return cmp.textContent; },
    rows: () => rows().map(r => r.id),
    axes: () => (AXES[cat] || []).map(a => a.k),
  };
  if (game) game._armory = api;
  return api;
}
