// Shared runtime scanner. Single source of truth for the canvas content.
// Reads Slides_Datasets/NN_Name/* on EVERY request, so adding/reordering/editing
// folders is reflected with no manual build step.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_DIR = 'Slides_Datasets';

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif', '.bmp']);
const GIF = new Set(['.gif']);
const VIDEO = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
const TEXT = new Set(['.txt', '.md']);

function candidateBases() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [process.cwd(), path.join(here, '..'), path.join(here, '..', '..'), here];
}

async function findDatasetDir() {
  for (const base of candidateBases()) {
    const p = path.join(base, DATASET_DIR);
    try {
      const s = await fs.stat(p);
      if (s.isDirectory()) return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function folderIndex(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

function prettyName(name) {
  return name.replace(/^\d+[_\-\s]*/, '').replace(/[_\-]+/g, ' ').trim() || name;
}

function classify(ext) {
  ext = ext.toLowerCase();
  if (GIF.has(ext)) return 'gif';
  if (IMAGE.has(ext)) return 'image';
  if (VIDEO.has(ext)) return 'video';
  if (TEXT.has(ext)) return 'text';
  return null;
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

export async function scanSlides() {
  const dir = await findDatasetDir();
  if (!dir) return { slides: [], datasetDir: null };

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => folderIndex(a.name) - folderIndex(b.name) || byName(a, b));

  const slides = [];
  for (const folder of folders) {
    const fdir = path.join(dir, folder.name);
    let files;
    try {
      files = await fs.readdir(fdir, { withFileTypes: true });
    } catch {
      continue;
    }
    files = files.filter((f) => f.isFile() && !f.name.startsWith('.')).sort(byName);

    const items = [];
    for (const f of files) {
      const ext = path.extname(f.name);
      const type = classify(ext);
      if (!type) continue;
      const src = `/${DATASET_DIR}/${encodeURIComponent(folder.name)}/${encodeURIComponent(f.name)}`;
      const item = { type, name: f.name };
      if (type === 'text') {
        try {
          item.text = (await fs.readFile(path.join(fdir, f.name), 'utf8')).slice(0, 4000);
        } catch {
          item.text = '';
        }
      } else {
        item.src = src;
      }
      items.push(item);
    }
    if (items.length === 0) continue;
    slides.push({
      index: folderIndex(folder.name),
      folder: folder.name,
      name: prettyName(folder.name),
      items,
    });
  }
  return { slides, datasetDir: dir };
}

// Flatten the live canvas into a compact text brief for the chatbot's system prompt.
export function summarize(slides, maxChars = 9000) {
  const lines = [];
  for (const s of slides) {
    lines.push(`\n## FOLDER ${String(s.index).padStart(2, '0')} — ${s.name}`);
    for (const it of s.items) {
      if (it.type === 'text') lines.push(it.text.trim());
      else lines.push(`  [${it.type}] ${it.name}`);
    }
  }
  return lines.join('\n').slice(0, maxChars).trim();
}
