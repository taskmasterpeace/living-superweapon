import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { QUESTIONS } from '../src/tool/design-questions.js';
import { QUESTION_OPTIONS } from '../src/tool/design-question-options.js';

test('every design question has three distinct options and a valid recommendation', () => {
  assert.deepEqual(Object.keys(QUESTION_OPTIONS), QUESTIONS.map(q => q.id));
  for (const question of QUESTIONS) {
    const entry = QUESTION_OPTIONS[question.id];
    assert.equal(typeof entry.context, 'string'); assert.ok(entry.context.length >= 35, question.id);
    assert.equal(typeof entry.rationale, 'string'); assert.ok(entry.rationale.length >= 25, question.id);
    assert.equal(entry.options.length, 3, question.id);
    assert.equal(new Set(entry.options.map(option => option.id)).size, 3, question.id);
    assert.equal(new Set(entry.options.map(option => option.value)).size, 3, question.id);
    assert.ok(entry.options.some(option => option.id === entry.recommendation), question.id);
    for (const option of entry.options) {
      assert.ok(option.label.length >= 3, question.id);
      assert.ok(option.description.length >= 20, question.id);
      assert.ok(option.value.length >= 20, question.id);
    }
  }
});

test('all cited repository source paths exist', async () => {
  for (const [id, entry] of Object.entries(QUESTION_OPTIONS)) {
    assert.ok(entry.sources.length > 0, id);
    for (const source of entry.sources) {
      assert.equal(typeof source.note, 'string'); assert.ok(source.note.length >= 8, `${id}:${source.path}`);
      await access(new URL(`../${source.path}`, import.meta.url));
    }
  }
});
