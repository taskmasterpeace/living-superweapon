// THRESHOLD — the wire. Supabase-backed sessions: anonymous AUTH (graceful local-identity
// fallback when the backend has anon sign-ins disabled), 4-letter room codes, presence
// lobbies, and Realtime broadcast as the v1 transport (WebRTC upgrade path later).
// NOTE: currently pointed at a borrowed MKL Supabase project (channel-prefixed `thr-`,
// zero rows written) — swapping to a dedicated project is these two constants.
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://eolzktjhbrazaypfwhrr.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbHprdGpoYnJhemF5cGZ3aHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDcwMzcsImV4cCI6MjA5NjY4MzAzN30.QCmvE47BorsPDrhGF5GMnVt8wfb0V2scc7mYzcu5DjI';
const PREFIX = 'thr';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export class NetSession {
  constructor() {
    this.supa = createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: true, storageKey: 'threshold_auth' },
      realtime: { params: { eventsPerSecond: 40 } },
    });
    this.identity = this._loadIdentity();
    this.state = 'idle';            // idle | lobby | playing
    this.isHost = false; this.room = null; this.chan = null;
    this.peer = null;               // { id, name, heroId, host }
    this.onPeerJoin = null; this.onPeerLeave = null; this.onPeerUpdate = null;
    this.onStart = null; this.onState = null; this.onEvent = null;
  }

  // Real authentication when the backend allows it; a persistent local identity otherwise.
  // Either way the player has a stable uid + callsign across sessions.
  async auth() {
    if (this.identity.authed && this.identity.uid && !this.identity.uid.startsWith('loc_')) return 'anonymous';
    try {
      const { data, error } = await this.supa.auth.signInAnonymously();
      if (!error && data && data.user) {
        this.identity.uid = data.user.id; this.identity.authed = true; this._saveIdentity();
        return 'anonymous';
      }
    } catch { /* backend said no — local identity below */ }
    this.identity.authed = false; this._saveIdentity();
    return 'local';
  }
  _loadIdentity() {
    try { const j = JSON.parse(localStorage.getItem('threshold_identity') || 'null'); if (j && j.uid) return j; } catch { /* fresh */ }
    return { uid: 'loc_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), name: '', authed: false };
  }
  _saveIdentity() { try { localStorage.setItem('threshold_identity', JSON.stringify(this.identity)); } catch { /* fine */ } }
  setName(n) { this.identity.name = String(n || '').trim().slice(0, 14); this._saveIdentity(); }

  makeCode() { let s = ''; for (let i = 0; i < 4; i++) s += CODE_ALPHABET[(Math.random() * CODE_ALPHABET.length) | 0]; return s; }

  async host(heroId) { const code = this.makeCode(); await this._join(code, heroId, true); return code; }
  async join(code, heroId) { await this._join(String(code).toUpperCase().trim(), heroId, false); return this.room; }

  async _join(code, heroId, asHost) {
    await this.leave();
    this.room = code; this.isHost = asHost; this.heroId = heroId;
    const chan = this.supa.channel(`${PREFIX}-room-${code}`, {
      config: { broadcast: { self: false }, presence: { key: this.identity.uid } },
    });
    this.chan = chan;
    chan.on('presence', { event: 'sync' }, () => this._syncPresence());
    chan.on('broadcast', { event: 'st' }, ({ payload }) => this.onState && this.onState(payload));
    chan.on('broadcast', { event: 'ev' }, ({ payload }) => this.onEvent && this.onEvent(payload));
    chan.on('broadcast', { event: 'start' }, ({ payload }) => { this.state = 'playing'; this.onStart && this.onStart(payload); });
    const status = await new Promise((res) => { chan.subscribe((s) => { if (s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') res(s); }); });
    if (status !== 'SUBSCRIBED') { await this.leave(); throw new Error('room connect failed: ' + status); }
    await chan.track({ name: this.identity.name || 'PILOT', heroId, host: asHost });
    this.state = 'lobby';
  }

  _syncPresence() {
    if (!this.chan) return;
    const st = this.chan.presenceState();
    const others = [];
    for (const key of Object.keys(st)) {
      if (key === this.identity.uid) continue;
      const m = st[key][0]; if (m) others.push({ id: key, name: m.name, heroId: m.heroId, host: m.host });
    }
    const was = this.peer;
    this.peer = others[0] || null;
    if (this.peer && (!was || was.id !== this.peer.id)) { if (this.onPeerJoin) this.onPeerJoin(this.peer); }
    else if (!this.peer && was) { if (this.onPeerLeave) this.onPeerLeave(was); }
    else if (this.peer && this.onPeerUpdate) this.onPeerUpdate(this.peer);
  }

  updateHero(heroId) { this.heroId = heroId; if (this.chan) this.chan.track({ name: this.identity.name || 'PILOT', heroId, host: this.isHost }); }
  startMatch(cfg) { this.state = 'playing'; if (this.chan) this.chan.send({ type: 'broadcast', event: 'start', payload: cfg }); }
  sendState(s) { if (this.chan) this.chan.send({ type: 'broadcast', event: 'st', payload: s }); }
  sendEvent(e) { if (this.chan) this.chan.send({ type: 'broadcast', event: 'ev', payload: e }); }

  async leave() {
    if (this.chan) {
      const c = this.chan; this.chan = null;
      try { await c.unsubscribe(); } catch { /* already gone */ }
      try { this.supa.removeChannel(c); } catch { /* fine */ }
    }
    this.room = null; this.peer = null; this.state = 'idle'; this.isHost = false;
  }
}
