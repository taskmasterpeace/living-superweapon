// THE TITLE SCREEN + THE COLD OPEN — extracted from hud.js (code review item 4).
//
// Methods of HUD, installed onto HUD.prototype. ⚠ #title is flex-start + overflow-y:auto with
// margin-top:auto on the first child — you cannot scroll ABOVE a centred flex item, so when the
// news desk was added the headline became unreachable off the top. Keep that if you add height.
// ⚠ _startColdOpen is a setInterval and hideTitle clears it.

import { agoStr, describeAbility, describeEvade, esc, fileDate, fileNoOf, isSynthDef } from './hudUtil.js';
import { ROSTER, SLOT_ORDER } from '../data/characters.js';
import { MODES } from '../data/modes.js';
import { fmtMoney, loadCareer } from '../data/career.js';
import { ATTR_DEFS, RANKS, TALENTS, deriveAttrs, heroTalents, rankColor, rankName } from '../data/ranks.js';
import { identityOf } from '../data/identities.js';
import { ATTR_ICON, icon } from './icons.js';
import { championId, recOf, recentIncidents, snapshotTable } from '../data/rankings.js';
import { cityList } from '../data/cities.js';
import { org as loadOrg } from '../data/org.js';

import { heroStats, kitFacts } from './hud.js';
import { THREAT_COLORS } from './hud.js';
export const TitleMixin = {
  buildTitle(onStart) {
    // (10) OPEN WHERE YOU LEFT OFF — last hero, mode and format are restored from prefs
    const PF = this.prefs || {};
    let selMode = MODES.some(m => m.id === PF.mode) ? PF.mode : 'duel';
    let selP1 = ROSTER.find(r => r.id === PF.p1) || ROSTER[0];
    let selP2 = ROSTER[2], two = !!PF.two;
    if (PF.format) this._tFormat = PF.format;
    this.title.innerHTML = `
      <div class="topbar"><button id="tSelect">🎮 Character Select</button><button id="tAtlas">🗺 Atlas</button><button id="tRank">📊 Rankings</button><button id="tArm">⚔ Armory</button><button id="tNet">🌐 Online</button><button id="tTut">🎓 Tutorial</button><button id="tOpt">⚙ Options</button><button id="tHow">❓ How to Play</button></div>
      <div class="tag">Machine King Labs</div>
      <div class="thead"><div class="tleft">
      <h1><span class="t1">WAR WORLD</span><span class="t2">ASCENDANTS</span></h1>
      <div class="clsbar"><span class="clschip">TOP SECRET // THRESHOLD</span><span class="clsline">THRESHOLD TREATY OFFICE — ASCENDANT REGISTRY · INDEX COPY 7 OF 9 · COSMIC-EYES ONLY</span><span class="clschip">WWA-INDEX</span></div>
      <div class="term">&gt; QUERY: ASCENDANT INDEX — <b id="termCount"></b> · THEATER: <span class="thchip" id="termTheater" title="Open the City Atlas">${(() => { try { const t = this.theater; if (!t || t.flagship) return 'THE WHITE CITY'; if (t.gallery) return 'PROVING GROUND'; const c = cityList()[t.cityId]; return c ? c.name.toUpperCase() : 'THE WHITE CITY'; } catch { return 'THE WHITE CITY'; } })()}</span><span class="tcur">▍</span></div>
      </div>
      <div class="colddesk" id="coldDesk">
        <div class="cdmon">
          <canvas id="cdCv" width="384" height="216"></canvas>
          <div class="cdbug"><b>KMK</b>9</div>
          <div class="cdlive"><i></i>LIVE</div>
          <div class="cdclock" id="cdClock">--:--</div>
          <div class="cdlower"><span id="cdLower">THE ASCENDANT REGISTRY</span></div>
          <div class="cdscan"></div>
        </div>
        <div class="cdside">
          <div class="cdkick">KMK 9 ACTION NEWS — CONTINUING COVERAGE</div>
          <div class="cdhead" id="cdHead">THE ASCENDANT REGISTRY</div>
          <div class="cdsub" id="cdSub">Fifty-two registered weapons. One thousand and fifty cities. Pick your fight.</div>
          <div class="cdstats" id="cdStats"></div>
        </div>
      </div>
</div>
      <div id="circuitBar" style="display:flex;align-items:center;gap:10px;margin:2px 0 4px;padding:8px 12px;border:1px solid var(--line-gold,#6b5824);background:var(--surface,#12110ecc);cursor:pointer;border-radius:var(--r-1,4px)"></div>
      <div id="firmBar" style="display:flex;align-items:center;gap:10px;margin:0 0 6px;padding:8px 12px;border:1px solid var(--line-gold,#6b5824);background:var(--surface,#12110ecc);cursor:pointer;border-radius:var(--r-1,4px)"></div>
      <div class="modes" id="modes"></div>
      <div class="selwrap">
        <div class="preview" id="pv"></div>
        <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
          <div class="ptabs" id="ptabs"></div>
          <div class="filters" id="filters"></div>
          <div class="roster" id="roster"></div>
          <button class="startbtn" id="startBtn">ENTER THE ARENA ▶</button>
          <div class="modehint" id="modehint"></div>
        </div>
      </div>`;
    const modesEl = this.title.querySelector('#modes'), roster = this.title.querySelector('#roster'), pv = this.title.querySelector('#pv'), ptabs = this.title.querySelector('#ptabs'), hintEl = this.title.querySelector('#modehint');
    // THE CIRCUIT banner — the single-player loop's front door. Reads the live save.
    {
      const circ = this.title.querySelector('#circuitBar');
      let cc = null; try { cc = loadCareer(); } catch {}
      const chero = cc && ROSTER.find(d => d.id === cc.heroId);
      const mono = 'font-family:var(--f-mono,monospace);font-size:10px';
      circ.innerHTML = cc && chero
        ? `<span style="${mono};background:var(--stamp,#8a1d24);color:#fff;padding:2px 8px">THE CIRCUIT</span><b style="color:${chero.colors.accent};letter-spacing:0.05em">${chero.name}</b><span style="${mono};color:var(--text-5,#8b8577)">WEEK ${cc.week} · ${fmtMoney(cc.bank)} · RENOWN ${cc.renown}${cc.titles ? ' · 🏆×' + cc.titles : ''}</span><span style="${mono};margin-left:auto;color:var(--gold,#ffd24a)">CONTINUE ▸</span>`
        : `<span style="${mono};background:var(--stamp,#8a1d24);color:#fff;padding:2px 8px">THE CIRCUIT</span><span style="${mono};color:var(--text-5,#8b8577)">A sanctioned career — weekly contracts, purses, grudges, the belt. Signs the selected weapon.</span><span style="${mono};margin-left:auto;color:var(--gold,#ffd24a)">START ▸</span>`;
      circ.onclick = () => { if (this.onCircuit) this.onCircuit(); };
    }
    // THE FIRM banner — the other front door, and the one the firm never had. `data/org.js` builds
    // a whole company (payroll, four kinds of person who are not interchangeable, a research tree)
    // and until now every route into it was a dev-console command, which means it was not shipped.
    // ⚠ The banner reads the save and says what state you are in, so it is never a button that
    // might or might not do something: FOUND YOUR FIRM, or the firm's own name and where it sits.
    {
      const fb = this.title.querySelector('#firmBar');
      if (fb) {
        let o = null; try { o = loadOrg(); } catch {}
        const mono = 'font-family:var(--f-mono,monospace);font-size:10px';
        fb.innerHTML = o && o.founded
          ? `<span style="${mono};background:var(--gold-deep,#8a6b1e);color:var(--on-gold,#20180a);padding:2px 8px">THE FIRM</span><b style="color:var(--gold,#e0b23c);letter-spacing:0.05em">${o.firm}</b><span style="${mono};color:var(--text-5,#8b8577)">${o.city}, ${o.country} · ${fmtMoney(o.cash)}</span><span style="${mono};margin-left:auto;color:var(--gold,#ffd24a)">HEADQUARTERS ▸</span>`
          : `<span style="${mono};background:var(--gold-deep,#8a6b1e);color:var(--on-gold,#20180a);padding:2px 8px">THE FIRM</span><span style="${mono};color:var(--text-5,#8b8577)">Incorporate somewhere on Earth. Where you register decides what you may build, what you can raise, and whether you may even name it.</span><span style="${mono};margin-left:auto;color:var(--gold,#ffd24a)">CHOOSE ON THE GLOBE ▸</span>`;
        fb.onclick = () => { if (this.onFirm) this.onFirm(); };
      }
    }
    const bar = (label, v, col, tip, ic) => `<div class="statrow"${tip ? ` title="${tip}"` : ''}><span class="sl">${ic ? icon(ic, 11) + ' ' : ''}${label}</span><span class="sb"><i style="width:${v * 10}%;background:${col}"></i></span><span class="sv">${v}</span></div>`;
    const renderPv = (c) => {
      const st = heroStats(c);
      pv.style.setProperty('--pc', c.colors.accent);
      const tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      const idn = identityOf(c);
      const facts = kitFacts(c);
      const fno = fileNoOf(c, ROSTER), synth = isSynthDef(c);
      const rec = recOf(c.id, c);
      const snap = snapshotTable(ROSTER), me = snap.find(r => r.id === c.id) || { rank: '—' };
      const incid = recentIncidents(c.id, ROSTER);
      pv.innerHTML = `<div class="sweep"></div><div class="stamp">CLASSIFIED</div>
        <div class="pvflip"><span id="pvPrev" title="Previous file (←)">‹</span><span id="pvNext" title="Next file (→)">›</span></div>
        <div class="dsh"><span>SUBJECT FILE <b>${fno}</b></span><span>OPENED <b>${fileDate(c.id)}</b></span></div>
        <div class="pvname" style="color:${c.colors.accent}">${c.name}</div>
        <div class="pvttl">${c.title} · ${c.role}</div>
        <div class="idrows">
          <div class="ir"><span class="ik">LEGAL NAME</span><span class="iv">${esc(idn.n)}</span></div>
          <div class="ir"><span class="ik">REGISTERED</span><span class="iv">${esc(idn.c)} · ${esc(idn.co)} ${idn.f}</span></div>
          <div class="ir"><span class="ik">STATUS</span><span class="iv ${synth ? 'opn' : 'act'}">● ${synth ? 'OPERATIONAL — SYNTHETIC' : 'ACTIVE IN THE FIELD'}</span></div>
        </div>
        <div class="pvblurb">${c.blurb}</div>
        <div class="frec">
          <span>PWR-IDX <b>${rec.elo}</b></span><span>RANK <b>#${me.rank}</b>/${snap.length}</span>
          <span>RECORD <b>${rec.w}–${rec.l}</b></span><span>KO <b>${rec.ko}</b>/${rec.kod}</span>
        </div>
        ${incid.length ? `<div class="incid">${incid.map(h => `<span class="${h.win ? 'iw' : 'il'}">${h.win ? '▲ def.' : '▼ lost to'} ${esc(h.vs)} · ${h.how === 'tournament' ? 'invitational' : h.how} · ${agoStr(h.t)}</span>`).join('')}</div>` : ''}
        <div class="glance">${facts.map(([ic, t, lead]) => `<span${lead ? ' class="lead"' : ''}>${icon(ic, 11)} ${t}</span>`).join('')}</div>
        ${c.threat ? `<div class="pvthreat" title="The LeFevre Threat Scale — the Treaty's official danger rating, Low → Extreme. Mixed matches are SUPPOSED to be lopsided; skill steals rounds, not physics." style="color:${tc};border-color:${tc}66;background:${tc}18">${icon('threat', 11)} LeFevre Threat · ${c.threat}</div>` : ''}
        <div class="pvcodex" id="pvCodex" title="The full Treaty case file — armament figures, countermeasures, the record">📁 OPEN FULL CASE FILE — ${fno}</div>
        <div class="pvstats" title="Hover any bar for what it means">
          ${bar('Power', st.power, '#ff6a4a', 'Heaviest single hit in the kit', 'power')}${bar('Strength', st.strength, '#e8a24a', 'Physical muscle — melee damage up, knockback given & resisted, faster ice break-outs', 'strength')}${bar('Range', st.range, 'var(--gold)', 'How far the kit reaches', 'range')}${bar('Mobility', st.mobility, 'var(--info)', 'Run speed + dashes + teleports', 'mobility')}
          ${bar('Defense', st.defense, 'var(--good)', 'How hard this hero is to put down — HP, phasing, thorns', 'defense')}${bar('Health', st.health, '#ff8a5a', 'Raw hit points', 'health')}${bar('Energy', st.energy, '#7fb0ff', 'Ki pool — every power spends it; run dry and you fizzle', 'energy')}
        </div>
        ${st.tags.length ? `<div class="pvtags">${st.tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        ${(() => {
          const at = deriveAttrs(c), tl = heroTalents(c);
          const rows = ATTR_DEFS.map(a => { const v = at[a.k], rc = rankColor(v); return `<div class="arow" title="${a.name} — ${a.does}. Rank ${v}/10 on the ladder (Civilian → Cosmic)."><span class="an2">${icon(ATTR_ICON[a.k], 11)} ${a.name}</span><span class="abar"><i style="width:${v * 10}%;background:${rc}"></i></span><span class="av">${v}</span><span class="arank" style="color:${rc};border-color:${rc}55;background:${rc}14">${rankName(v)}</span></div>`; }).join('');
          const ladder = `<div class="ladder" title="The rank ladder — every attribute sits on this one scale. Colors = rank tier.">${RANKS.slice(1).map((r, i) => `<i style="background:${r.c}" title="${i + 1} — ${r.n}"></i>`).join('')}<span>Civilian → Cosmic</span></div>`;
          const tals = tl.map(k => { const t = TALENTS[k]; return t ? `<span><b>${t.name}</b> — ${t.does}</span>` : ''; }).join('');
          const gear = (c.items || []).map(it => `<b>${it.name}</b>${it.charges ? ` ×${it.charges}` : ''}`).join(' · ');
          return `<div class="sheet"><div class="sh">§ Attribute Panel — Treaty Assessment</div>${ladder}${rows}</div>
            ${tals ? `<div class="sheet"><div class="sh">§ Documented Talents</div><div class="tals">${tals}</div></div>` : ''}
            ${gear ? `<div class="gear">⛭ Gear: ${gear} <span style="color:var(--text-5)">(X)</span></div>` : ''}`;
        })()}
        <div class="sheet" style="margin-top:12px;border-top:none;padding-top:0"><div class="sh">§ Known Armament / Observed Abilities</div></div>
        <div class="pvabil" style="margin-top:2px;border-top:none;padding-top:0">${SLOT_ORDER.filter(s => c.abilities[s.k]).map(s => { const a = c.abilities[s.k]; return `<div class="ab"><b style="color:${c.colors.accent}">${s.label}</b><span class="an">${a.name}</span><span class="ad">${describeAbility(a)}</span></div>`; }).join('')}
        ${c.evade ? `<div class="ab"><b style="color:${c.colors.accent}">2×TAP</b><span class="an">${c.evade.name || 'Evade'}</span><span class="ad">${describeEvade(c.evade)}</span></div>` : ''}
        ${(c.items || []).map(it => `<div class="ab"><b style="color:${c.colors.accent}">X</b><span class="an">${it.name}</span><span class="ad">carried gadget — no ki cost, cooldown only</span></div>`).join('')}</div>`;
      const pp = pv.querySelector('#pvPrev'), pn = pv.querySelector('#pvNext');
      if (pp) pp.onclick = () => flip(-1);
      if (pn) pn.onclick = () => flip(1);
      const cdx = pv.querySelector('#pvCodex');
      if (cdx) cdx.onclick = () => this.showCodex(c);
    };
    const renderTabs = () => {
      // TOURNAMENT: the tabs row becomes the FORMAT picker (the Invitational is a 1-pilot affair)
      if (selMode === 'tournament') {
        two = false;
        const tf = this._tFormat || (this._tFormat = '1v1');
        ptabs.innerHTML = [['1v1', '⚔ LONE WOLF 1v1'], ['2v2', '🤝 DUOS 2v2'], ['1v2', '🐺 UNDERDOG 1v2']]
          .map(([v, l]) => `<span class="pt${tf === v ? ' on' : ''}" data-tf="${v}">${l}</span>`).join('')
          + `<span style="font-size:var(--t-sm);color:var(--text-5)">8 seeds off the power board · team damage ON</span>`;
        ptabs.querySelectorAll('[data-tf]').forEach(el => el.onclick = () => { this._tFormat = el.dataset.tf; renderTabs(); });
        return;
      }
      const allow2 = selMode === 'duel' || selMode === 'rumble';
      if (!allow2) two = false;
      ptabs.innerHTML = `<span class="pt${!two ? ' on' : ''}" data-two="0">1 PLAYER</span>`
        + (allow2 ? `<span class="pt${two ? ' on' : ''}" data-two="1">2 PLAYERS</span>` : '')
        + (two ? `<span class="p2pick" id="p2pick">P2 ▸ <b style="color:${selP2.colors.accent}">${selP2.name}</b> ⟳</span><span style="font-size:var(--t-sm);color:var(--text-5)">P1 keyboard+mouse · P2 gamepad</span>` : '');
      ptabs.querySelectorAll('.pt').forEach(el => el.onclick = () => { two = el.dataset.two === '1'; renderTabs(); });
      const p2 = ptabs.querySelector('#p2pick'); if (p2) p2.onclick = () => { selP2 = ROSTER[(ROSTER.indexOf(selP2) + 1) % ROSTER.length]; renderTabs(); };
    };
    const renderModes = () => {
      modesEl.innerHTML = MODES.map(m => `<div class="modecard${m.id === selMode ? ' sel' : ''}" data-m="${m.id}" style="--mc:${m.accent}"><div class="mi">${m.icon}</div><div class="mn" style="color:${m.accent}">${m.name}</div><div class="mt">${m.tag}</div></div>`).join('');
      modesEl.querySelectorAll('.modecard').forEach(el => el.onclick = () => { selMode = el.dataset.m; renderModes(); hintEl.textContent = MODES.find(x => x.id === selMode).desc; renderTabs(); });
      hintEl.textContent = MODES.find(x => x.id === selMode).desc;
    };
    // ---- roster with filters / sort / search (52+ heroes need navigation) ----
    const filtersEl = this.title.querySelector('#filters');
    const fState = this._fState || (this._fState = { threat: 'ALL', flight: 'ANY', role: 'ALL', custom: false, q: '', sort: 'default' });
    const THREATS = ['ALL', 'Low', 'Moderate', 'High', 'Very High', 'Extreme'];
    // ⚠ ROLES ARE DERIVED FROM THE KIT, never a hand-written tag on each hero. Robert: "it's hard to
    // find the type of characters I want" — the only filters were THREAT TIERS, which answer "how
    // dangerous" and never "what do they DO". A new hero classifies itself the moment its abilities
    // exist, and a custom from ORIGIN lands in the right bucket with no extra authoring.
    const _abil = (c) => Object.values(c.abilities || {});
    const _hasT = (c, t) => _abil(c).some(a => a.type === t);
    const ROLES = {
      BRAWLER:   (c) => ['rusher', 'bruiser'].includes(c.ai && c.ai.style) || (c.strength || 5) >= 9,
      BLASTER:   (c) => ['beamer', 'artillery'].includes(c.ai && c.ai.style) || (_hasT(c, 'beam') && (c.beamMight || 1) >= 1.2),
      GUNNER:    (c) => _hasT(c, 'rifle') || _hasT(c, 'bow'),
      BLADE:     (c) => _abil(c).some(a => a.dmgClass === 'slash'),
      GRAPPLER:  (c) => (c.ai && c.ai.style) === 'grappler' || _hasT(c, 'tentacle'),
      COMMANDER: (c) => _hasT(c, 'summon') || _hasT(c, 'construct') || (c.ai && c.ai.style) === 'summoner',
      TRICKSTER: (c) => (c.ai && c.ai.style) === 'trickster' || _hasT(c, 'portal') || c.phase || c.teleEscape,
      // ⚠ A FILTER THAT MATCHES 39 OF 52 IS NOT A FILTER. The first ZONER predicate included any
      // hero with a cone, which is most of the roster. Area-denial is a DOCTRINE, so it reads the
      // doctrine — plus mines, which are the one ability that is purely about owning ground.
      ZONER:     (c) => (c.ai && c.ai.style) === 'zoner' || _hasT(c, 'mine'),
    };
    const ROLE_IDS = ['ALL', ...Object.keys(ROLES)];

    const stCache = new Map(); const stOf = (c) => { if (!stCache.has(c.id)) stCache.set(c.id, heroStats(c)); return stCache.get(c.id); };
    const listNow = () => {
      let L = ROSTER.slice();
      if (fState.threat !== 'ALL') L = L.filter(c => c.threat === fState.threat);
      if (fState.role !== 'ALL' && ROLES[fState.role]) L = L.filter(ROLES[fState.role]);
      if (fState.flight === 'FLIERS') L = L.filter(c => (c.flightTier ?? 3) > 0);
      if (fState.flight === 'GROUNDED') L = L.filter(c => (c.flightTier ?? 3) === 0);
      if (fState.custom) L = L.filter(c => c.isCustom);
      if (fState.q) { const q = fState.q.toLowerCase(); L = L.filter(c => (c.name + ' ' + (c.title || '') + ' ' + (c.role || '')).toLowerCase().includes(q)); }
      const T = { Low: 0, Moderate: 1, High: 2, 'Very High': 3, Extreme: 4 };
      if (fState.sort === 'name') L.sort((a, b) => a.name.localeCompare(b.name));
      else if (fState.sort === 'threat') L.sort((a, b) => (T[b.threat] ?? -1) - (T[a.threat] ?? -1));
      else if (fState.sort === 'power') L.sort((a, b) => stOf(b).power - stOf(a).power);
      else if (fState.sort === 'hp') L.sort((a, b) => b.hp - a.hp);
      else if (fState.sort === 'spd') L.sort((a, b) => b.speed - a.speed);
      return L;
    };
    let cards = [], list = [];
    const select = (c, cardEl) => {
      selP1 = c; this.selectedHero = c.id;
      roster.querySelectorAll('.rcard').forEach(e => e.classList.remove('sel'));
      if (cardEl) cardEl.classList.add('sel');
      renderPv(c);
    };
    this.selectedHero = selP1.id;
    const flip = (d) => {
      if (!list.length) return;
      const i = Math.max(0, list.indexOf(selP1)), n = (i + d + list.length) % list.length;
      select(list[n], cards[n]);
      if (cards[n]) cards[n].scrollIntoView({ block: 'nearest' });
    };
    const mkCard = (c) => {
      const card = document.createElement('div');
      card.className = 'rcard';
      card.style.setProperty('--pc', c.colors.accent);
      const cs = stOf(c), tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      card.style.setProperty('--tc', tc);
      const synth = isSynthDef(c);
      card.innerHTML = `<div class="fhead"><span class="fno">${fileNoOf(c, ROSTER)}</span><span class="fst${synth ? ' op' : ''}">● ${synth ? 'OPERATIONAL' : 'ACTIVE'}</span></div>`
        + `<span class="dot"></span><div class="nm">${c.name} <span class="cflag">${identityOf(c).f || ''}</span></div><div class="rl">${c.role}</div><div class="cstat">HP <b>${c.hp}</b> · PWR <b>${cs.power}</b> · <span style="color:${tc}">${c.threat || '—'}</span></div>`
        + `<div class="frow"><span class="felo">PWR-IDX <b>${recOf(c.id, c).elo}</b></span><span class="fbar"></span></div>`
        + (c.isCustom ? `<span class="cchip">CUSTOM</span><span class="cedit" title="Edit in ORIGIN">✎</span>` : '');
      card.onmouseenter = () => renderPv(c);
      card.onclick = () => select(c, card);
      card.ondblclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' });
      const ed = card.querySelector('.cedit');
      if (ed) ed.onclick = (ev) => { ev.stopPropagation(); this.onEditCustom && this.onEditCustom(c); };
      return card;
    };
    const renderFilters = () => {
      filtersEl.innerHTML = `<div class="frow1"><span class="flab">ROLE //</span>`
        + ROLE_IDS.map(r => `<span class="fc rc${fState.role === r ? ' on' : ''}" data-ro="${r}">${r}${r === 'ALL' ? '' : ` <i>${ROSTER.filter(ROLES[r]).length}</i>`}</span>`).join('')
        + `</div><div class="frow2"><span class="flab">TIER //</span>` + THREATS.map(t => `<span class="fc${fState.threat === t ? ' on' : ''}" data-th="${t}">${t}</span>`).join('')
        + ['ANY', 'FLIERS', 'GROUNDED'].map(fl => `<span class="fc${fState.flight === fl ? ' on' : ''}" data-fl="${fl}">${fl === 'ANY' ? '✈ ANY' : fl}</span>`).join('')
        + `<span class="fc${fState.custom ? ' on' : ''}" data-cu="1">CUSTOM</span>`
        + `<select id="fSort"><option value="default">SORT: ROSTER</option><option value="name">NAME</option><option value="threat">THREAT</option><option value="power">POWER</option><option value="hp">HP</option><option value="spd">SPEED</option></select>`
        + `<input id="fQ" placeholder="SEARCH…" value="${fState.q}"><span class="cnt" id="fCnt"></span></div>`;
      filtersEl.querySelectorAll('[data-ro]').forEach(c => c.onclick = () => { fState.role = c.dataset.ro; renderFilters(); renderRoster(); });
      filtersEl.querySelector('#fSort').value = fState.sort;
      filtersEl.querySelectorAll('[data-th]').forEach(c => c.onclick = () => { fState.threat = c.dataset.th; renderFilters(); renderRoster(); });
      filtersEl.querySelectorAll('[data-fl]').forEach(c => c.onclick = () => { fState.flight = c.dataset.fl; renderFilters(); renderRoster(); });
      filtersEl.querySelector('[data-cu]').onclick = () => { fState.custom = !fState.custom; renderFilters(); renderRoster(); };
      filtersEl.querySelector('#fSort').onchange = (e) => { fState.sort = e.target.value; renderRoster(); };
      const q = filtersEl.querySelector('#fQ'); q.oninput = () => { fState.q = q.value; renderRoster(); };
    };
    const renderRoster = () => {
      list = listNow();
      roster.innerHTML = '';
      cards = list.map(c => { const el = mkCard(c); roster.appendChild(el); return el; });
      // the forge card — ORIGIN entry point
      const forge = document.createElement('div');
      forge.className = 'rcard forge';
      forge.innerHTML = `<div class="fplus">＋</div><div class="nm">FORGE NEW</div><div class="rl">ORIGIN</div><div class="cstat">Point-buy your own superweapon</div>`;
      forge.onclick = () => this.onForge && this.onForge();
      roster.appendChild(forge);
      const cnt = filtersEl.querySelector('#fCnt'); if (cnt) cnt.textContent = list.length + ' / ' + ROSTER.length + ' FILES';
      const tc2 = this.title.querySelector('#termCount'); if (tc2) tc2.textContent = `${list.length} ACTIVE FILE${list.length === 1 ? '' : 'S'}`;
      if (!list.includes(selP1)) selP1 = list[0] || ROSTER[0];
      const idx = list.indexOf(selP1);
      if (idx >= 0) cards[idx].classList.add('sel');
      renderPv(selP1);
    };
    // keyboard: arrows move the highlight, Enter enters the arena
    if (this._titleNavBound) removeEventListener('keydown', this._titleNavBound);
    this._titleNavBound = (e) => {
      if (!this.titleOpen || this.overlayOpen() || this._selOpen) return;   // the character-select owns the keyboard while it's up
      const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
      const idx = Math.max(0, list.indexOf(selP1));
      let n = null;
      if (e.code === 'ArrowRight') n = idx + 1; else if (e.code === 'ArrowLeft') n = idx - 1;
      else if (e.code === 'ArrowDown') n = idx + 5; else if (e.code === 'ArrowUp') n = idx - 5;
      else if (e.code === 'Enter') { onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' }); return; }
      else return;
      e.preventDefault();
      if (list.length) { n = Math.max(0, Math.min(list.length - 1, n)); select(list[n], cards[n]); cards[n].scrollIntoView({ block: 'nearest' }); }
    };
    addEventListener('keydown', this._titleNavBound);
    // top bar
    // THE ARENA-FIGHTER CHARACTER SELECT (DBZ filmstrip) — the same `onStart` the roster uses, so
    // A/Enter drops straight into a match with the mode currently selected on the cards.
    this.title.querySelector('#tSelect').onclick = () => { this.showSelect(onStart, { mode: selMode, modeName: (MODES.find(m => m.id === selMode) || {}).name || selMode }); };
    this.title.querySelector('#tArm').onclick = () => { if (this.onArmory) this.onArmory(); };
    this.title.querySelector('#tOpt').onclick = () => this.showOptions();
    this.title.querySelector('#tHow').onclick = () => this.showHowto();
    this.title.querySelector('#tTut').onclick = () => this.onTutorial && this.onTutorial();
    this.title.querySelector('#tNet').onclick = () => this.showOnline();
    this.title.querySelector('#tRank').onclick = () => this.showRankings();
    this.title.querySelector('#tAtlas').onclick = () => this.showAtlas();
    const thc = this.title.querySelector('#termTheater'); if (thc) thc.onclick = () => this.showAtlas();
    renderFilters(); renderRoster(); renderModes(); renderTabs();
    this.title.querySelector('#startBtn').onclick = () => onStart({ mode: selMode, p1: selP1.id, p2: selP2.id, twoPlayer: two, format: this._tFormat || '1v1' });
  },

  showTitle() { this.titleOpen = true; this._startColdOpen(); this.title.style.display = 'flex'; this.title.style.visibility = 'visible'; this.title.style.opacity = '1'; },

  hideTitle() { clearInterval(this._cdT); this._cdT = null; this.titleOpen = false; this.title.style.opacity = '0'; setTimeout(() => { this.title.style.display = 'none'; }, 250); this.title.style.transition = 'opacity .25s'; },

  _startColdOpen() {
    const cv = this.title.querySelector('#cdCv'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const g = this.game;
    clearInterval(this._cdT);

    const clips = (g && g.news && g.news.clips) ? g.news.clips.filter(c => c && c.frames && c.frames.length) : [];
    const headlines = this._coldHeadlines();
    let hi = 0, ci = 0, fi = 0, tick = 0, staticFor = 0;
    const img = new Image();
    let imgReady = false;
    const loadFrame = () => {
      const live = clips.filter(c => !c._dead);
      const clip = live[ci % live.length]; if (!clip) return;
      imgReady = false;
      img.onload = () => { imgReady = true; };
      img.onerror = () => { clip._dead = true; imgReady = false; };   // a revoked blob kills the CLIP, not the console
      const _fu = clip.frames[fi % clip.frames.length];
      if (_fu && _fu[0] !== '#') img.src = _fu;
    };
    if (clips.length) loadFrame();

    // the test card, for when there is no footage
    const testCard = () => {
      const w = cv.width, h = cv.height;
      const bars = ['#5a5a5a', '#a8a020', '#20a0a8', '#20a020', '#a020a0', '#a02020', '#2020a0'];
      // ⚠ no purple on OUR surfaces — broadcast TEST BARS are the one place the full SMPTE
      // set appears, and even here we swap the violet bar for slate. Same hue (210°) as the
      // cold open's slate in opening.js, one step darker because these bars peak at 0xa0
      // where that set peaks at 0xc8 — it must sit under the green and over the red.
      bars[4] = '#4a5a6a';
      bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w / bars.length, 0, w / bars.length + 1, h * 0.72); });
      ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = '#8b8577'; ctx.font = '600 11px Cascadia Code, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KMK 9 — NO FOOTAGE ON FILE', w / 2, h * 0.86);
      ctx.font = '9px Cascadia Code, Consolas, monospace';
      ctx.fillText('FIGHT SOMETHING', w / 2, h * 0.93);
      ctx.textAlign = 'left';
    };

    const noise = (amount) => {
      // analogue snow, drawn sparsely so it costs nothing on a menu
      ctx.globalAlpha = amount;
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
        ctx.fillRect((Math.random() * cv.width) | 0, (Math.random() * cv.height) | 0, 2, 2);
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      tick++;
      ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (staticFor > 0) { staticFor--; noise(0.5); }
      else if (clips.length && imgReady) {
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        noise(0.05);                                  // a permanent light grain — it is a broadcast
      } else if (clips.length) { noise(0.4); }
      else { testCard(); noise(0.06); }

      // advance the footage at broadcast-ish speed
      if (clips.length && tick % 5 === 0) {
        fi++;
        const clip = clips[ci % clips.length];
        if (fi >= clip.frames.length) { fi = 0; ci++; staticFor = 6; }
        loadFrame();
      }
      // the in-world clock, if a world exists
      const cl = this.title.querySelector('#cdClock');
      if (cl && g && g.world && g.world.dayT != null) {
        const mins = Math.floor(g.world.dayT * 1440);
        cl.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
      }
      // rotate the headline
      if (tick % 110 === 0 && headlines.length) {
        hi = (hi + 1) % headlines.length;
        const H = headlines[hi];
        const hEl = this.title.querySelector('#cdHead'), sEl = this.title.querySelector('#cdSub'), lEl = this.title.querySelector('#cdLower');
        if (hEl) { hEl.textContent = H.head; hEl.style.animation = 'none'; void hEl.offsetWidth; hEl.style.animation = ''; }
        if (sEl) sEl.textContent = H.sub;
        if (lEl) lEl.textContent = H.lower;
      }
    };
    this._cdT = setInterval(draw, 66);                // ~15fps; it is a menu, not a game
    if (headlines.length) {
      const H = headlines[0];
      const hEl = this.title.querySelector('#cdHead'), sEl = this.title.querySelector('#cdSub'), lEl = this.title.querySelector('#cdLower');
      if (hEl) hEl.textContent = H.head;
      if (sEl) sEl.textContent = H.sub;
      if (lEl) lEl.textContent = H.lower;
    }
    // the stat strip — real numbers off the book
    const st = this.title.querySelector('#cdStats');
    if (st) {
      try {
        const table = snapshotTable(ROSTER);
        const champ = championId();
        const top = table[0];
        const rows = [
          ['REGISTERED', String(ROSTER.length)],
          ['THEATERS', '1,050'],
          ['NATIONS', '168'],
          champ ? ['CHAMPION', (ROSTER.find(r => r.id === champ) || {}).name || '—'] : ['TOP RATED', top ? top.def.name : '—'],
        ];
        st.innerHTML = rows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
      } catch (e) { st.innerHTML = ''; }
    }
  },
};




