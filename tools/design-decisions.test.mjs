import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../src/tool/design-questions.js';
import {
  answeredCount,
  createBlankDocument,
  mergeDocuments,
  validateImport,
} from '../src/tool/design-decisions.js';

test('the source questionnaire exposes 50 unique, consecutively numbered prompts', () => {
  assert.equal(QUESTIONS.length, 50);
  assert.deepEqual(QUESTIONS.map(({ number }) => number), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.equal(new Set(QUESTIONS.map(({ id }) => id)).size, 50);
  assert.equal(QUESTIONS[49].prompt, 'Most important: what can an ordinary rifleman accomplish that your strongest superweapon cannot?');
});

test('answered count ignores whitespace-only answers', () => {
  const document = createBlankDocument();
  document.answers.q01.answer = '  ';
  document.answers.q02.answer = 'AI squad command gives infantry strategic reach.';
  assert.equal(answeredCount(document), 1);
});

test('a partial import preserves answers omitted by the imported document', () => {
  const current = createBlankDocument();
  current.answers.q01.answer = '16';
  current.answers.q02.answer = 'Both';
  const incoming = validateImport({
    schema: 'powerworld.design-decisions', version: 1,
    answers: { q01: { answer: '32', notes: '', status: 'Draft', updatedAt: '2026-09-10T18:00:00.000Z' } },
  });
  const merged = mergeDocuments(current, incoming, 'merge');
  assert.equal(merged.answers.q01.answer, '32');
  assert.equal(merged.answers.q02.answer, 'Both');
});

test('replace clears omitted answers but retains the complete questionnaire', () => {
  const current = createBlankDocument();
  current.answers.q02.answer = 'Both';
  const incoming = validateImport({
    schema: 'powerworld.design-decisions', version: 1,
    answers: { q01: { answer: '32', notes: '', status: 'Decided', updatedAt: null } },
  });
  const replaced = mergeDocuments(current, incoming, 'replace');
  assert.equal(replaced.answers.q01.answer, '32');
  assert.equal(replaced.answers.q02.answer, '');
  assert.equal(Object.keys(replaced.answers).length, 50);
});

test('invalid imports are rejected without mutating the current document', () => {
  const current = createBlankDocument();
  current.answers.q01.answer = '16';
  const before = JSON.stringify(current);
  assert.throws(() => validateImport({ schema: 'wrong', version: 1, answers: {} }), /schema/i);
  assert.throws(() => validateImport({ schema: 'powerworld.design-decisions', version: 1, answers: { nope: {} } }), /unknown/i);
  assert.throws(() => validateImport(JSON.parse('{"schema":"powerworld.design-decisions","version":1,"answers":{"__proto__":{"answer":"x"}}}')), /unsafe|unknown/i);
  assert.equal(JSON.stringify(current), before);
});

test('imports enforce field types, allowed statuses, and size bounds', () => {
  const base = { schema: 'powerworld.design-decisions', version: 1 };
  assert.throws(() => validateImport({ ...base, answers: { q01: { answer: 7 } } }), /string/i);
  assert.throws(() => validateImport({ ...base, answers: { q01: { answer: 'ok', status: 'Approved' } } }), /status/i);
  assert.throws(() => validateImport({ ...base, answers: { q01: { answer: 'x'.repeat(20001) } } }), /long/i);
});
