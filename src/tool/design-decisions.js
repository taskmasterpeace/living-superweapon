import { CHAPTERS, QUESTIONS } from './design-questions.js';

export const STORAGE_KEY = 'powerworld.design-decisions.v1';
export const SCHEMA = 'powerworld.design-decisions';
export const VERSION = 1;
const STATUSES = new Set(['Draft', 'Decided', 'Discuss']);
const MAX_FIELD = 20000;
const MAX_FILE = 1500000;

const blankAnswer = () => ({ answer: '', notes: '', status: 'Draft', updatedAt: null });
export function createBlankDocument() {
  return { schema: SCHEMA, version: VERSION, exportedAt: null, answers: Object.fromEntries(QUESTIONS.map(q => [q.id, blankAnswer()])) };
}
export function answeredCount(doc) {
  return QUESTIONS.reduce((count, q) => count + (typeof doc?.answers?.[q.id]?.answer === 'string' && doc.answers[q.id].answer.trim() ? 1 : 0), 0);
}
function safeRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error(`${label} has an unsafe prototype.`);
}
export function validateImport(raw) {
  safeRecord(raw, 'Import');
  if (raw.schema !== SCHEMA) throw new Error('Unrecognized import schema.');
  if (raw.version !== VERSION) throw new Error('Unsupported import version.');
  safeRecord(raw.answers, 'Answers');
  const allowed = new Set(QUESTIONS.map(q => q.id));
  const answers = Object.create(null);
  for (const id of Object.keys(raw.answers)) {
    if (id === '__proto__' || id === 'prototype' || id === 'constructor') throw new Error(`Unsafe answer ID: ${id}.`);
    if (!allowed.has(id)) throw new Error(`Unknown answer ID: ${id}.`);
    const entry = raw.answers[id]; safeRecord(entry, `Answer ${id}`);
    const answer = entry.answer ?? '', notes = entry.notes ?? '', status = entry.status ?? 'Draft', updatedAt = entry.updatedAt ?? null;
    if (typeof answer !== 'string' || typeof notes !== 'string') throw new Error(`${id} answer and notes must be strings.`);
    if (answer.length > MAX_FIELD || notes.length > MAX_FIELD) throw new Error(`${id} content is too long.`);
    if (!STATUSES.has(status)) throw new Error(`${id} has an invalid status.`);
    if (updatedAt !== null && (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt)))) throw new Error(`${id} has an invalid timestamp.`);
    answers[id] = { answer, notes, status, updatedAt };
  }
  return { schema: SCHEMA, version: VERSION, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null, answers };
}
export function mergeDocuments(current, incoming, mode = 'merge') {
  if (!['merge', 'replace'].includes(mode)) throw new Error('Import mode must be merge or replace.');
  const next = mode === 'replace' ? createBlankDocument() : structuredClone(current);
  for (const [id, entry] of Object.entries(incoming.answers)) next.answers[id] = { ...entry };
  return next;
}
export function documentsConflict(current, incoming) {
  return Object.entries(incoming.answers).some(([id, entry]) => {
    const existing = current.answers[id];
    const hasExistingWork = existing && (existing.answer.trim() || existing.notes.trim() || existing.status !== 'Draft');
    return hasExistingWork && (existing.answer !== entry.answer || existing.notes !== entry.notes || existing.status !== entry.status);
  });
}
export function exportDocument(doc) {
  return {
    schema: SCHEMA, version: VERSION, exportedAt: new Date().toISOString(),
    questions: QUESTIONS.map(q => ({ id: q.id, number: q.number, prompt: q.prompt })),
    answers: structuredClone(doc.answers),
  };
}
export function exportMarkdown(doc) {
  const lines = ['# PowerWorld Design Decisions', '', `Exported: ${new Date().toISOString()}`, '', '> Drafting record only. Answers are not automatically approved or implemented.', ''];
  for (const q of QUESTIONS) {
    const a = doc.answers[q.id];
    lines.push(`## ${q.number}. ${q.prompt}`, '', `**Status:** ${a.status}`, '', a.answer.trim() || '_Unanswered_', '');
    if (a.notes.trim()) lines.push('**Notes**', '', a.notes.trim(), '');
  }
  return lines.join('\n');
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

if (typeof document !== 'undefined') {
  const $ = selector => document.querySelector(selector);
  const els = {};
  let doc = createBlankDocument(), current = null, showUnanswered = false, saveTimer, pendingImport = null;
  function setSave(message, kind = '') { els.save.textContent = message; els.save.dataset.kind = kind; }
  function persist() {
    clearTimeout(saveTimer);
    setSave('Unsaved changes', 'dirty');
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(doc)); setSave('Saved in this browser', 'saved'); }
      catch { setSave('Storage failed · session copy retained', 'error'); }
    }, 180);
  }
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) doc = mergeDocuments(doc, validateImport(JSON.parse(raw)), 'merge'); }
    catch { setSave('Saved data could not be read · blank session opened', 'error'); }
  }
  const qAt = number => QUESTIONS[number - 1];
  function commitEditor() {
    if (current === null) return;
    const q = qAt(current), item = doc.answers[q.id];
    const next = { answer: els.answer.value, notes: els.notes.value, status: els.status.value, updatedAt: new Date().toISOString() };
    if (item.answer === next.answer && item.notes === next.notes && item.status === next.status) return;
    doc.answers[q.id] = next; persist(); updateCounts(); renderNav();
  }
  function visibleQuestions() { return showUnanswered ? QUESTIONS.filter(q => !doc.answers[q.id].answer.trim()) : QUESTIONS; }
  function renderNav() {
    els.nav.innerHTML = '';
    for (const chapter of CHAPTERS) {
      const questions = visibleQuestions().filter(q => q.number >= chapter.from && q.number <= chapter.to);
      if (!questions.length) continue;
      const group = document.createElement('section');
      const heading = document.createElement('h2'); heading.textContent = chapter.title; group.append(heading);
      const list = document.createElement('div'); list.className = 'question-links';
      for (const q of questions) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.question = q.number;
        button.className = doc.answers[q.id].answer.trim() ? 'answered' : ''; button.setAttribute('aria-current', q.number === current ? 'true' : 'false');
        button.innerHTML = `<span>${q.number}</span><span>${q.prompt}</span>`; button.addEventListener('click', () => visit(q.number)); list.append(button);
      }
      group.append(list); els.nav.append(group);
    }
  }
  function updateCounts() { els.count.textContent = `${answeredCount(doc)} / 50 answered`; els.progress.style.setProperty('--progress', `${answeredCount(doc) * 2}%`); }
  function visit(number, focus = true) {
    commitEditor(); current = Math.max(1, Math.min(50, number));
    const q = qAt(current), a = doc.answers[q.id];
    els.number.textContent = `Question ${q.number} of 50`; els.chapter.textContent = q.chapter; els.prompt.textContent = q.prompt;
    els.answer.value = a.answer; els.notes.value = a.notes; els.status.value = a.status;
    els.prev.disabled = current === 1; els.next.disabled = current === 50; renderNav();
    const activeLink = document.querySelector(`[data-question="${current}"]`);
    if (activeLink) {
      if (matchMedia('(max-width: 760px)').matches) els.nav.scrollLeft = Math.max(0, activeLink.closest('section').offsetLeft - 16);
      else els.nav.scrollTop = Math.max(0, activeLink.offsetTop - els.nav.offsetTop - 24);
    }
    if (focus) els.answer.focus();
  }
  function handleInput() { commitEditor(); }
  function setup() {
    Object.assign(els, { nav: $('#question-nav'), count: $('#answered-count'), progress: $('#progress'), save: $('#save-status'), number: $('#question-number'), chapter: $('#chapter-name'), prompt: $('#question-prompt'), answer: $('#answer'), notes: $('#notes'), status: $('#decision-status'), prev: $('#previous'), next: $('#next'), file: $('#import-file'), dialog: $('#import-dialog'), conflictDialog: $('#conflict-dialog'), importError: $('#import-error') });
    load(); updateCounts(); renderNav(); visit(50, false);
    [els.answer, els.notes].forEach(el => el.addEventListener('input', handleInput)); els.status.addEventListener('change', handleInput);
    els.prev.addEventListener('click', () => visit(current - 1)); els.next.addEventListener('click', () => visit(current + 1));
    $('#jump-form').addEventListener('submit', e => { e.preventDefault(); visit(Number($('#jump').value)); });
    $('#unanswered-only').addEventListener('change', e => { showUnanswered = e.target.checked; renderNav(); });
    $('#export-json').addEventListener('click', () => download('powerworld-design-decisions.json', JSON.stringify(exportDocument(doc), null, 2), 'application/json'));
    $('#export-markdown').addEventListener('click', () => download('powerworld-design-decisions.md', exportMarkdown(doc), 'text/markdown'));
    $('#import-open').addEventListener('click', () => { els.file.value = ''; els.importError.textContent = ''; els.dialog.showModal(); });
    $('#import-cancel').addEventListener('click', () => els.dialog.close());
    $('#import-apply').addEventListener('click', async () => {
      try {
        const file = els.file.files[0]; if (!file) throw new Error('Choose a JSON file.'); if (file.size > MAX_FILE) throw new Error('Import file is too large.');
        const incoming = validateImport(JSON.parse(await file.text()));
        if (documentsConflict(doc, incoming)) { pendingImport = incoming; els.dialog.close(); els.conflictDialog.showModal(); return; }
        applyImport(incoming, 'merge'); els.dialog.close();
      } catch (error) { els.importError.textContent = `Import rejected: ${error.message}`; }
    });
    function applyImport(incoming, mode) {
      doc = mergeDocuments(doc, incoming, mode); persist(); updateCounts();
      const target = current; current = null; visit(target, false);
    }
    $('#conflict-cancel').addEventListener('click', () => { pendingImport = null; els.conflictDialog.close(); });
    $('#conflict-merge').addEventListener('click', () => { applyImport(pendingImport, 'merge'); pendingImport = null; els.conflictDialog.close(); });
    $('#conflict-replace').addEventListener('click', () => { applyImport(pendingImport, 'replace'); pendingImport = null; els.conflictDialog.close(); });
    $('#reset').addEventListener('click', () => { if (!confirm('Clear all 50 answers and notes? This cannot be undone unless you exported a copy.')) return; doc = createBlankDocument(); persist(); updateCounts(); current = null; visit(50, false); });
  }
  document.addEventListener('DOMContentLoaded', setup);
}
