// THE DESK — the career hub screen. Treaty-office furniture: mono labels, hairlines,
// one gold accent. EVERY line derives from live data (the Elo book, the medical ledger,
// the city sheet, the career save) so the desk can never tell a story the game didn't.
import { snapshotTable, injuryOf, championId } from '../data/rankings.js';
import { genSlate, fmtMoney, CLINIC_FEE, TITLE_RENOWN, heatMult } from '../data/career.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class CareerUI {
  constructor(roster) {
    this.roster = roster;
    this.el = null;
    this.handlers = {};
  }
  _build() {
    if (this.el) return;
    const d = document.createElement('div');
    d.className = 'lswovl';
    d.id = 'hCircuit';
    d.style.cssText = 'position:fixed;inset:0;z-index:62;display:none;overflow-y:auto;background:rgba(10,9,7,0.96);font-family:var(--f-display,Rajdhani,sans-serif);color:var(--text,#e8e2d4)';
    document.body.appendChild(d);
    this.el = d;
  }
  show(career, handlers) {
    this._build();
    this.handlers = handlers || {};
    this.career = career;
    this.render(career);
    this.el.style.display = 'block';                      // .lswovl defaults display:none — the known law
    this._esc = (e) => { if (e.code === 'Escape') { e.stopPropagation(); this.handlers.onClose && this.handlers.onClose(); } };
    addEventListener('keydown', this._esc, true);
  }
  hide() {
    if (this.el) this.el.style.display = 'none';
    if (this._esc) { removeEventListener('keydown', this._esc, true); this._esc = null; }
  }
  render(career) {
    this.career = career;
    if (!career.slate) career.slate = genSlate(career, this.roster);
    const hero = this.roster.find(d => d.id === career.heroId);
    if (!hero) {                                          // a retired custom — the save outlived the weapon
      this.el.innerHTML = `<div style="max-width:560px;margin:12vh auto;padding:22px;border:1px solid var(--line,#2a2d33);background:var(--surface-solid,#12110e)">
        <div style="font-family:var(--f-mono,monospace);font-size:11px;color:var(--danger,#ff5a4a)">REGISTRY ERROR</div>
        <div style="font-size:18px;margin:8px 0">The registered weapon no longer exists.</div>
        <button id="ccRetire" style="margin-top:10px">CLOSE THE FILE</button></div>`;
      this.el.querySelector('#ccRetire').onclick = () => this.handlers.onRetire && this.handlers.onRetire();
      return;
    }
    const table = snapshotTable(this.roster);
    const me = table.find(r => r.id === career.heroId) || { rank: '—', elo: '—', w: 0, l: 0 };
    const inj = injuryOf(career.heroId);
    const champ = championId();
    const flag = (hero.person && hero.person.f) || '🌐';
    const rowOf = (id) => table.find(r => r.id === id);
    const mono = 'font-family:var(--f-mono,monospace)';
    const chip = (txt, col) => `<span style="${mono};font-size:9px;letter-spacing:0.08em;border:1px solid ${col};color:${col};padding:1px 6px;border-radius:3px">${txt}</span>`;
    const card = (o) => {
      const foe = o.foe ? this.roster.find(d => d.id === o.foe) : null;
      const fr = o.foe ? rowOf(o.foe) : null;
      const acc = o.kind === 'title' ? 'var(--gold,#ffd24a)' : o.kind === 'grudge' ? 'var(--danger,#ff5a4a)' : o.kind === 'defense' ? 'var(--police,#7fb0d0)' : o.kind === 'govt' ? (o.relColor || 'var(--police,#7fb0d0)') : 'var(--text-3,#c9c2b4)';
      const canStake = !o.locked && (o.kind === 'duel' || o.kind === 'grudge' || o.kind === 'title');
      const chips = [
        o.heat ? chip('HEAT ×' + o.heat, 'var(--gold,#ffd24a)') : '',
        o.underdog ? chip('UNDERDOG — purse rides the gap', 'var(--danger-2,#e0a43a)') : '',
        o.rivalry ? chip('🩸 RIVALRY — renown ×1.5', 'var(--danger,#ff5a4a)') : '',
        o.aiLevel && o.aiLevel >= 1.35 ? chip('THEY ARE SHARP — AI ' + o.aiLevel, 'var(--police,#7fb0d0)') : '',
        // THE STANDING. The whole point of the relationship matrix on one chip: what YOUR state
        // thinks of the one you are being sent to, in that rung's own colour.
        o.kind === 'govt' ? chip(esc(String(o.home || '').toUpperCase()) + ' → ' + esc(String(o.targetCountry || '').toUpperCase()) + ' · ' + o.relWord, o.relColor) : '',
        o.kind === 'govt' ? chip(o.postureLabel, o.relColor) : '',
        o.kind === 'govt' && o.sameBloc ? chip('SAME BLOC · ' + esc(String(o.bloc || '').toUpperCase()), '#5f8fb0') : '',
        o.kind === 'govt' && o.bloc && !o.sameBloc ? chip('ACROSS THE LINE · ' + esc(String(o.bloc || '').toUpperCase()), '#c9743a') : '',
        o.kind === 'govt' && o.flagged ? chip('NO COVER — the law starts looking for you', 'var(--danger,#ff5a4a)') : '',
        o.kind === 'govt' && o.support ? chip('LOCAL SUPPORT', 'var(--good,#8fe08a)') : '',
      ].filter(Boolean).join(' ');
      return `<div class="ccOffer" data-o="${esc(o.id)}" style="border:1px solid ${o.locked ? 'var(--line,#2a2d33)' : 'var(--line-2,#3a3d43)'};background:var(--surface-raised,#16150f);padding:12px 14px;display:flex;flex-direction:column;gap:7px;${o.locked ? 'opacity:0.55' : ''}">
        <div style="display:flex;align-items:baseline;gap:9px">
          <span style="font-size:15px">${o.icon}</span>
          <b style="letter-spacing:0.06em;color:${acc}">${esc(o.label)}</b>
          ${o.kind !== 'rest' ? `<span style="${mono};font-size:10px;color:var(--text-5,#8b8577);margin-left:auto">PURSE <b style="color:var(--gold,#ffd24a)">${fmtMoney(o.purse)}</b> · REN +${o.renown}</span>` : ''}
        </div>
        ${chips ? `<div style="display:flex;gap:5px;flex-wrap:wrap">${chips}</div>` : ''}
        ${foe ? `<div style="display:flex;gap:8px;align-items:center;font-size:13px">
          <i style="width:9px;height:9px;border-radius:50%;background:${foe.colors.accent};box-shadow:0 0 7px ${foe.colors.accent}"></i>
          <b style="color:${foe.colors.accent}">${esc(foe.name)}</b>
          <span style="${mono};font-size:10px;color:var(--text-5,#8b8577)">#${fr ? fr.rank : '—'} · ELO ${fr ? fr.elo : '—'} · ${fr ? fr.w + '–' + fr.l : ''} · ${esc(foe.threat || '')}${champ === foe.id ? ' · 🏆' : ''}</span>
        </div>` : ''}
        ${o.city ? `<div style="${mono};font-size:10px;color:var(--text-4,#a8a294)">📍 ${esc(o.city.name.toUpperCase())} · ${esc((o.city.country || '').toUpperCase())}${o.city.crime ? ' · CRIME ' + o.city.crime : ''}${o.waves ? ' · ' + o.waves + ' WAVES' : ''}</div>` : ''}
        ${(o.intel || []).map(l => `<div style="${mono};font-size:9.5px;color:var(--text-5,#8b8577)">▸ ${esc(l)}</div>`).join('')}
        ${o.why ? `<div style="${mono};font-size:9.5px;color:var(--text-5,#8b8577)">▸ ${esc(o.why)}</div>` : ''}
        <div style="font-size:12px;color:var(--text-3,#c9c2b4);line-height:1.45">${esc(o.blurb)}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:2px">
          <button class="ccGo" data-o="${esc(o.id)}" ${o.locked ? 'disabled' : ''} style="padding:6px 18px;${o.locked ? 'opacity:0.5;cursor:default' : ''}">${o.kind === 'rest' ? 'REST ▸' : o.locked ? 'LOCKED' : 'ACCEPT ▸'}</button>
          ${canStake ? `<label style="${mono};font-size:9.5px;color:${o.stake ? 'var(--gold,#ffd24a)' : 'var(--text-5,#8b8577)'};display:flex;gap:5px;align-items:center;cursor:pointer" title="Win: purse ×2. Lose: paid NOTHING and renown −4."><input type="checkbox" class="ccStake" data-o="${esc(o.id)}" ${o.stake ? 'checked' : ''} style="accent-color:var(--gold,#ffd24a)"> DOUBLE OR NOTHING</label>` : ''}
        </div>
      </div>`;
    };
    const hist = career.history.slice(0, 6).map(h =>
      `<div style="display:flex;gap:10px;${mono};font-size:10px;color:var(--text-4,#a8a294);padding:3px 0;border-bottom:1px dashed var(--line,#2a2d33)">
        <span style="width:44px">WK ${h.week}</span>
        <b style="width:16px;color:${h.result === 'W' ? 'var(--good,#8fe08a)' : h.result === 'L' ? 'var(--danger,#ff5a4a)' : 'var(--text-5,#8b8577)'}">${h.result}</b>
        <span style="flex:1">${h.result === 'REST' ? 'SAT THE WEEK OUT' : esc(String(h.kind).toUpperCase()) + ' · ' + esc(h.foe) + ' · ' + esc(h.city)}</span>
        <span>${h.paid ? '+' + fmtMoney(h.paid) : ''}</span>
      </div>`).join('') || `<div style="${mono};font-size:10px;color:var(--text-6,#6b665c)">No bouts on file. Week one — the office is watching.</div>`;
    this.el.innerHTML = `
      <div style="max-width:880px;margin:4vh auto 6vh;padding:0 16px">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--line-gold,#6b5824);padding-bottom:9px">
          <span style="${mono};font-size:10px;background:var(--stamp,#8a1d24);color:#fff;padding:2px 8px">THE CIRCUIT</span>
          <span style="${mono};font-size:10px;color:var(--text-5,#8b8577)">THRESHOLD TREATY OFFICE — SANCTIONED CAREER FILE</span>
          <span style="${mono};font-size:11px;margin-left:auto;color:var(--gold,#ffd24a)">WEEK ${career.week}</span>
        </div>
        <div style="display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line,#2a2d33)">
          <div style="font-size:26px">${flag}</div>
          <div>
            <div style="font-size:21px;font-weight:700;letter-spacing:0.04em;color:${hero.colors.accent}">${esc(hero.name)}${career.titles ? ' <span title="titles">🏆'.repeat(Math.min(3, career.titles)) + '</span>' : ''}</div>
            <div style="${mono};font-size:10px;color:var(--text-5,#8b8577)">#${me.rank} ON THE BOARD · ELO ${me.elo} · RECORD ${me.w}–${me.l}${champ === career.heroId ? ' · REIGNING CHAMPION' : ''}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:19px;color:var(--gold,#ffd24a)">${fmtMoney(career.bank)}</div>
            <div style="${mono};font-size:10px;color:var(--text-5,#8b8577)">RENOWN ${career.renown}${career.renown < TITLE_RENOWN ? ' / ' + TITLE_RENOWN + ' FOR A TITLE SHOT' : ' · TITLE ELIGIBLE'}</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line,#2a2d33);${mono};font-size:11px">
          <span style="color:var(--text-5,#8b8577)">§ MEDICAL</span>
          ${inj ? `<span style="color:var(--danger-2,#e0a43a)">⚕ ${esc(inj.name.toUpperCase())} — ${inj.bouts} bout${inj.bouts === 1 ? '' : 's'} to heal · −${Math.round(inj.debuff * 100)}%</span>
            <button id="ccClinic" ${career.bank < CLINIC_FEE ? 'disabled' : ''} style="margin-left:auto;padding:4px 12px;font-size:10px;${career.bank < CLINIC_FEE ? 'opacity:0.5' : ''}">PAY THE CLINIC — ${fmtMoney(CLINIC_FEE)}</button>`
          : '<span style="color:var(--good,#8fe08a)">FIT TO FIGHT</span>'}
        </div>
        ${career.lastReport ? (() => {
          const r = career.lastReport;
          if (r.rest) return `<div style="margin:12px 0 0;padding:10px 13px;border:1px solid var(--line,#2a2d33);background:var(--surface,#12110e)">
            <span style="${mono};font-size:9px;color:var(--text-5,#8b8577);letter-spacing:0.14em">WEEK ${r.week} REPORT</span>
            <div style="font-size:13px;margin-top:3px">Sat the week out.${r.healed ? ' <b style="color:var(--good,#8fe08a)">' + esc(r.healed) + (r.cleared ? ' healed.' : ' knitting.') + '</b>' : ''}${r.simLine ? ' <span style="color:var(--text-4,#a8a294)">Elsewhere: ' + esc(r.simLine) + '.</span>' : ''}</div>
          </div>`;
          const arrow = r.rankFrom && r.rankTo ? (r.rankTo < r.rankFrom ? `<b style="color:var(--good,#8fe08a)">#${r.rankFrom} ▲ #${r.rankTo}</b>` : r.rankTo > r.rankFrom ? `<b style="color:var(--danger,#ff5a4a)">#${r.rankFrom} ▼ #${r.rankTo}</b>` : `<b style="color:var(--text-4,#a8a294)">#${r.rankTo} —</b>`) : '';
          return `<div style="margin:12px 0 0;padding:10px 13px;border:1px solid ${r.result === 'W' ? 'var(--good,#8fe08a)' : 'var(--danger,#ff5a4a)'};background:var(--surface,#12110e)">
            <span style="${mono};font-size:9px;color:var(--text-5,#8b8577);letter-spacing:0.14em">WEEK ${r.week} REPORT${r.stake ? ' · DOUBLE OR NOTHING' : ''}</span>
            <div style="font-size:13px;margin-top:3px">
              <b style="color:${r.result === 'W' ? 'var(--good,#8fe08a)' : 'var(--danger,#ff5a4a)'}">${r.result === 'W' ? 'WIN' : 'LOSS'}</b> vs ${esc(r.label)} — paid <b style="color:var(--gold,#ffd24a)">${fmtMoney(r.paid)}</b> · renown ${r.ren >= 0 ? '+' + r.ren : r.ren} ${arrow}
              ${r.title ? ' · <b style="color:var(--gold,#ffd24a)">THE BELT IS YOURS</b>' : ''}
              ${r.streak >= 2 ? ` · <span style="color:var(--gold,#ffd24a)">W${r.streak} STREAK</span>` : ''}
              ${r.simLine ? `<span style="color:var(--text-4,#a8a294)"> · Elsewhere: ${esc(r.simLine)}.</span>` : ''}
            </div>
          </div>`;
        })() : ''}
        <div style="${mono};font-size:10px;color:var(--text-5,#8b8577);letter-spacing:0.14em;margin:14px 0 8px">— THE SLATE · WEEK ${career.week} OFFERS —${career.streak >= 2 ? ` <span style="color:var(--gold,#ffd24a)">W${career.streak} STREAK · PROMOTER HEAT ×${heatMult(career.streak).toFixed(2)}</span>` : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${career.slate.map(card).join('')}</div>
        <div style="${mono};font-size:10px;color:var(--text-5,#8b8577);letter-spacing:0.14em;margin:16px 0 6px">— THE LEDGER —</div>
        ${hist}
        <div style="display:flex;gap:10px;margin-top:16px">
          <button id="ccClose" class="ghost">◂ BACK TO THE REGISTRY</button>
          <button id="ccRetire" class="ghost" style="margin-left:auto;color:var(--danger,#ff5a4a)">${this._retireArm ? 'CONFIRM RETIREMENT — THE FILE CLOSES' : 'RETIRE'}</button>
        </div>
      </div>`;
    this.el.querySelectorAll('.ccStake').forEach(cb => cb.onchange = () => {
      const o = career.slate.find(x => x.id === cb.dataset.o);
      if (o) { o.stake = cb.checked; this.handlers.onStakeToggle && this.handlers.onStakeToggle(); this.render(career); }
    });
    this.el.querySelectorAll('.ccGo').forEach(b => b.onclick = () => {
      if (b.disabled) return;
      const o = career.slate.find(x => x.id === b.dataset.o);
      if (!o) return;
      if (o.kind === 'rest') this.handlers.onRest && this.handlers.onRest();
      else this.handlers.onAccept && this.handlers.onAccept(o);
    });
    const cl = this.el.querySelector('#ccClinic');
    if (cl) cl.onclick = () => this.handlers.onClinic && this.handlers.onClinic();
    this.el.querySelector('#ccClose').onclick = () => this.handlers.onClose && this.handlers.onClose();
    this.el.querySelector('#ccRetire').onclick = () => {
      if (this._retireArm) { this._retireArm = false; this.handlers.onRetire && this.handlers.onRetire(); }
      else { this._retireArm = true; this.render(career); }   // two-click confirm — no blocking dialogs
    };
  }
}
