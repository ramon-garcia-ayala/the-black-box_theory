/* build-slides.mjs — OPTIONAL.
   Generates slides-data.js (window.SLIDES) so the page also works when opened
   directly via file:// (no server / no /api). On Vercel this is NOT needed —
   /api/slides scans the folders live on every request.
   Run:  npm run snapshot   (or: node tools/build-slides.mjs) */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSlides } from '../lib/scan.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const { slides, datasetDir } = await scanSlides();
const banner = `// AUTO-GENERATED offline snapshot — do not edit by hand.\n// Source: ${datasetDir || 'Slides_Datasets'}\n// Regenerate with: npm run snapshot\n`;
const out = `${banner}window.SLIDES = ${JSON.stringify(slides, null, 0)};\n`;

await fs.writeFile(path.join(root, 'slides-data.js'), out, 'utf8');

const items = slides.reduce((n, s) => n + s.items.length, 0);
console.log(`snapshot ok -> slides-data.js  (${slides.length} folders, ${items} items)`);
