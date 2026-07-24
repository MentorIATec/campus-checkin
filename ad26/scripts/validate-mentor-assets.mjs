import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const expectedPath = path.resolve(scriptDir, '../mentor-assets.expected.txt');
const assetsDir = path.resolve(scriptDir, '../../public/mentores');

const expected = (await readFile(expectedPath, 'utf8'))
  .split(/\r?\n/)
  .map(value => value.trim())
  .filter(Boolean);
// macOS normalizes filenames to NFD, while Git/Vercel preserve the NFC spelling.
const available = new Set((await readdir(assetsDir)).map(filename => filename.normalize('NFC')));
const missing = expected.filter(filename => !available.has(filename.normalize('NFC')));

console.log(`Referencias AD26: ${expected.length}`);
console.log(`Coincidencias exactas: ${expected.length - missing.length}`);

if (missing.length) {
  console.error(`Faltan ${missing.length} archivos en public/mentores:`);
  missing.forEach(filename => console.error(`- ${filename}`));
  process.exitCode = 1;
} else {
  console.log('Todas las imagenes de mentor tienen coincidencia exacta.');
}
