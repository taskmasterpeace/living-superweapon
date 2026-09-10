import test from 'node:test';
import assert from 'node:assert/strict';
import { NewsFrameEncoder, newsFrameBytes, revokeFrames } from '../src/engine/news-capture.js';

const source = { width: 640, height: 360 };
const context = { drawImage(image, x, y) { assert.equal(image, source); assert.equal(x, 0); assert.equal(y, 0); } };
function setGlobal(t, key, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
}

test('default encoding uses a supported OffscreenCanvas without waiting for HTML canvas callbacks', async t => {
  let finish, encodedOptions, htmlCreated = 0;
  class Offscreen {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext(kind) { assert.equal(kind, '2d'); return context; }
    convertToBlob(options) {
      encodedOptions = options;
      assert.equal(this.width, 640); assert.equal(this.height, 360);
      return new Promise(resolve => { finish = resolve; });
    }
  }
  setGlobal(t, 'OffscreenCanvas', Offscreen);
  setGlobal(t, 'document', { createElement() { htmlCreated++; return { getContext: () => context, toBlob() {} }; } });
  const encoder = new NewsFrameEncoder(), frames = [];
  assert.equal(encoder.capture(source, frames), true);
  assert.equal(htmlCreated, 0);
  assert.deepEqual(encodedOptions, { type: 'image/webp', quality: 0.78 });
  assert.equal(typeof finish, 'function');
  finish(new Blob(['webp'], { type: 'image/webp' })); await encoder.flush();
  assert.ok(frames[0].startsWith('blob:'));
  assert.equal(newsFrameBytes(frames), 4);
  revokeFrames(frames);
  assert.equal(newsFrameBytes(frames), 0);
});

for (const support of ['absent', 'no-convert']) test(`default encoder falls back to HTML canvas when OffscreenCanvas is ${support}`, async t => {
  setGlobal(t, 'OffscreenCanvas', support === 'absent' ? undefined : class {});
  let finish, encodedOptions;
  setGlobal(t, 'document', { createElement(tag) {
    assert.equal(tag, 'canvas');
    return { getContext: () => context, toBlob(cb, type, quality) {
      encodedOptions = { type, quality }; finish = cb;
    } };
  } });
  const encoder = new NewsFrameEncoder(), frames = [];
  encoder.capture(source, frames);
  assert.deepEqual(encodedOptions, { type: 'image/webp', quality: 0.78 });
  assert.equal(encoder.pending.size, 1);
  finish(new Blob(['fallback'])); await encoder.flush();
  assert.ok(frames[0].startsWith('blob:')); revokeFrames(frames);
});

test('convertToBlob is preferred and keeps bounded copies, transferred tokens and pooled canvases', async () => {
  const jobs = [], canvases = [], encodedOptions = [];
  let ready = 0;
  const encoder = new NewsFrameEncoder({ maxPending: 2, onReady: () => ready++, makeCanvas: () => {
    const canvas = { getContext: () => context,
      convertToBlob(options) {
        encodedOptions.push(options);
        return new Promise(resolve => jobs.push(resolve));
      }, toBlob() { throw Error('HTML idle encoder must not be selected'); },
    };
    canvases.push(canvas); return canvas;
  } });
  const frames = ['old'];
  assert.equal(encoder.capture(source, frames), true);
  assert.equal(encoder.capture(source, frames), true);
  assert.deepEqual(encodedOptions, [{ type: 'image/webp', quality: 0.78 }, { type: 'image/webp', quality: 0.78 }]);
  assert.equal(jobs.length, 2);
  assert.equal(encoder.capture(source, frames), false);
  assert.equal(canvases.length, 2);
  frames.shift(); // Pre-roll ownership can move while both encodes are pending.
  let flushed = false;
  const flushing = encoder.flush().then(() => { flushed = true; });
  jobs[1](new Blob(['second'])); await Promise.resolve();
  assert.equal(flushed, false);
  assert.ok(frames[1].startsWith('blob:'));
  assert.equal(frames[0], '#enc1');
  jobs[0](new Blob(['first'])); await flushing;
  assert.equal(newsFrameBytes(frames), 11);
  assert.equal(ready, 2); assert.equal(encoder.pending.size, 0);
  assert.equal(encoder.pool.length, 2);
  encoder.capture(source, frames);
  assert.equal(canvases.length, 2, 'completed canvases are reused');
  revokeFrames(frames); // A late encode must not resurrect disposed frame slots.
  jobs[2](new Blob(['late'])); await encoder.flush();
  assert.deepEqual(frames, [null, null, null]);
  assert.equal(newsFrameBytes(frames), 0);
  assert.equal(ready, 3); assert.equal(encoder.pool.length, 2);
});

for (const failure of ['reject', 'throw']) test(`convertToBlob ${failure} releases its pending slot and pooled canvas exactly once`, async () => {
  let calls = 0, ready = 0;
  const encoder = new NewsFrameEncoder({ maxPending: 1, onReady: () => ready++, makeCanvas: () => ({
    getContext: () => context,
    convertToBlob() {
      calls++;
      if (failure === 'throw') throw Error('encode failed');
      return Promise.reject(Error('encode failed'));
    },
  }) });
  const frames = [];
  assert.equal(encoder.capture(source, frames), true);
  assert.equal(calls, 1);
  await encoder.flush();
  assert.deepEqual(frames, [null]);
  assert.equal(encoder.pending.size, 0); assert.equal(encoder.available, true);
  assert.equal(encoder.pool.length, 1); assert.equal(ready, 1);
  encoder.capture(source, frames); await encoder.flush();
  assert.deepEqual(frames, [null, null]);
  assert.equal(encoder.pool.length, 1); assert.equal(ready, 2);
});

test('legacy HTML toBlob failure still retires its token and pending slot', async () => {
  let ready = 0;
  const encoder = new NewsFrameEncoder({ onReady: () => ready++, makeCanvas: () => ({
    getContext: () => context, toBlob() { throw Error('legacy encode failed'); },
  }) });
  const frames = [];
  encoder.capture(source, frames); await encoder.flush();
  assert.deepEqual(frames, [null]);
  assert.equal(encoder.pending.size, 0); assert.equal(ready, 1);
});
