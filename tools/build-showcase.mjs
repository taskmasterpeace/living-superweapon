// Rebuild the showcase from existing native-input evidence captures.
// Requires ffmpeg on PATH and the local source artifacts (not distributed here).
import { readFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public/showcase');
const manifest = JSON.parse(readFileSync(join(dest, 'source-manifest.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'lsw-showcase-'));
mkdirSync(dest, { recursive: true });
const font = process.env.SHOWCASE_FONT || 'C:/Windows/Fonts/arialbd.ttf';
const escapedFont = font.replaceAll('\\', '/').replaceAll(':', '\\:');
const draw = (text, x, y, size, extra = '') =>
  `drawtext=fontfile='${escapedFont}':text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=0xffe3a3:shadowcolor=black@0.65:shadowx=1:shadowy=2${extra}`;
function run(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
}
const intermediate = [];
for (const [index, clip] of manifest.clips.entries()) {
  const output = join(scratch, `${index}.mp4`);
  const filters = [
    'scale=1280:720:force_original_aspect_ratio=decrease',
    'pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x171510',
    'setsar=1', 'fps=25', 'settb=1/25', 'setpts=PTS-STARTPTS',
    'drawbox=x=28:y=64:w=570:h=76:color=0x171510@0.78:t=fill',
    'drawbox=x=28:y=64:w=3:h=76:color=0xe7b75f:t=fill',
    draw(index === 0 ? 'LIVING SUPERWEAPON' : clip.label, 46, 78, 25),
    draw(index === 0 ? clip.label : 'NATIVE GAMEPLAY / PRACTICE CAPTURES', 46, 113, 12),
    draw('WORK IN PROGRESS / NATIVE PRACTICE / SILENT', 46, 153, 12, ':box=1:boxcolor=0x171510@0.6:boxborderw=7'),
    ...(index === 0 ? ['fade=t=in:st=0:d=0.35'] : []),
  ];
  run(['-ss', String(clip.in), '-i', clip.source, '-t', String(clip.out - clip.in), '-an', '-vf', filters.join(','),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', output]);
  intermediate.push(output);
}
const overlap = 0.3;
let length = manifest.clips[0].out - manifest.clips[0].in;
let prior = '[0:v]';
const transitions = [];
for (let index = 1; index < intermediate.length; index++) {
  const offset = length - overlap;
  const next = `[blend${index}]`;
  transitions.push(`${prior}[${index}:v]xfade=transition=fade:duration=${overlap}:offset=${offset.toFixed(2)}${next}`);
  prior = next;
  length += manifest.clips[index].out - manifest.clips[index].in - overlap;
}
transitions.push(`${prior}fade=t=out:st=${(length - 0.6).toFixed(2)}:d=0.6[out]`);
const final = join(dest, manifest.output);
run([...intermediate.flatMap(path => ['-i', path]), '-filter_complex', transitions.join(';'), '-map', '[out]', '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final]);
run(['-ss', '4.2', '-i', final, '-frames:v', '1', '-q:v', '2', join(dest, manifest.poster)]);
console.log(JSON.stringify({ output: final, expectedDuration: length, scratch }, null, 2));
