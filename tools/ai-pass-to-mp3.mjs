// tools/ai-pass-to-mp3.mjs — convert every ai-pass .wav to a bank-ready 96k mono MP3 (same stem, same folder).
// The SampleBank fetches audio/<stem>.mp3, so the AI batch's WAVs must be MP3 to match the rest of the library.
//   node tools/ai-pass-to-mp3.mjs
import { readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'audio', 'ai-pass');

function walk(d) {
  const out = [];
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (extname(p).toLowerCase() === '.wav') out.push(p);
  }
  return out;
}

const wavs = walk(DIR);
let made = 0, skipped = 0;
for (const wav of wavs) {
  const mp3 = wav.slice(0, -4) + '.mp3';
  if (existsSync(mp3)) { skipped++; continue; }
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav,
    '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', mp3]);
  made++;
}
console.log(`ai-pass → mp3: ${made} converted, ${skipped} already present, ${wavs.length} wav total`);
