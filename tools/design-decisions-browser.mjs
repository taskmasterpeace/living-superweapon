import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = 'http://127.0.0.1:5182/design-decisions.html';
const artifacts = path.resolve('artifacts/design-decisions');
await fs.mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function mainFlow() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#question-number').textContent(), 'Question 50 of 50');
  assert.equal(await page.locator('#answered-count').textContent(), '0 / 50 answered');
  await page.locator('#answer').fill('The rifleman can hold and search several human-scale objectives without broadcasting a strategic energy signature.');
  await page.locator('#decision-status').selectOption('Discuss');
  await page.locator('#notes').fill('Test with GODFALL objective density.');
  await page.waitForTimeout(250);
  assert.match(await page.locator('#save-status').textContent(), /Saved in this browser/);
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('#answer').inputValue(), /hold and search/);
  assert.equal(await page.locator('#answered-count').textContent(), '1 / 50 answered');
  await page.locator('#jump').fill('1'); await page.locator('#jump-form button').click();
  assert.equal(await page.locator('#question-number').textContent(), 'Question 1 of 50');
  assert.equal(await page.locator('#answer').inputValue(), '');
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement !== document.body));

  const jsonDownload = page.waitForEvent('download'); await page.locator('#export-json').click();
  const json = await jsonDownload; const jsonPath = path.join(artifacts, 'roundtrip.json'); await json.saveAs(jsonPath);
  const exported = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  assert.equal(exported.questions.length, 50); assert.equal(exported.answers.q50.status, 'Discuss');
  const mdDownload = page.waitForEvent('download'); await page.locator('#export-markdown').click();
  const md = await mdDownload; await md.saveAs(path.join(artifacts, 'powerworld-design-decisions.md'));

  await page.locator('#import-open').click();
  await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await page.locator('#import-apply').click(); await page.waitForFunction(() => /rejected/i.test(document.querySelector('#import-error')?.textContent || ''));
  assert.match(await page.locator('#import-error').textContent(), /rejected/i);
  assert.equal(await page.locator('#answered-count').textContent(), '1 / 50 answered');
  await page.locator('#import-cancel').click();

  await page.locator('#answer').fill('16'); await page.waitForTimeout(220);
  const conflict = structuredClone(exported); conflict.answers.q01.answer = '32';
  await page.locator('#import-open').click();
  await page.locator('#import-file').setInputFiles({ name: 'conflict.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(conflict)) });
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#import-apply').click();
  await page.waitForFunction(() => document.querySelector('#answer')?.value === '32');
  assert.equal(await page.locator('#answer').inputValue(), '32');
  assert.equal(await page.locator('label[for="answer"]').count(), 1);
  await page.screenshot({ path: path.join(artifacts, 'desktop.png'), fullPage: true });
  await context.close();
}

async function mobileFlow() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await page.goto(base, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `mobile horizontal overflow: ${overflow}px`);
  assert.ok(await page.locator('#answered-count').isVisible(), 'answered count must remain visible on first mobile view');
  await page.screenshot({ path: path.join(artifacts, 'mobile-390.png'), fullPage: true });
  await context.close();
}

async function storageFailureFlow() {
  const context = await browser.newContext();
  await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'QuotaExceededError'); }; });
  const page = await context.newPage(); await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#answer').fill('Session-only answer'); await page.waitForTimeout(250);
  assert.match(await page.locator('#save-status').textContent(), /Storage failed/);
  assert.equal(await page.locator('#answer').inputValue(), 'Session-only answer');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-json').click(); await downloadPromise;
  await context.close();
}

try { await mainFlow(); await mobileFlow(); await storageFailureFlow(); console.log(`Design Decisions browser QA passed. Artifacts: ${artifacts}`); }
finally { await browser.close(); }
