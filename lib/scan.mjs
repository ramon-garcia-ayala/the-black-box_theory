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

// Folder naming — two accepted shapes:
//   GROUPED  →  gNN_MM_Name   group NN, slide MM within that group, then the label.
//                             e.g. "g01_01_Intro" = group 1, slide 1, "Intro".
//   LEGACY   →  NN_Name       no group (kept working for backward compatibility).
// The group lets the canvas tint each window's header per group (see canvas.js + main.css).
function parseFolder(name) {
  let m = name.match(/^g(\d+)[_\-]+(\d+)[_\-]*(.*)$/i);     // gNN_MM_Name
  if (m) return { group: parseInt(m[1], 10), slide: parseInt(m[2], 10), label: m[3] };
  m = name.match(/^(\d+)[_\-]*(.*)$/);                       // legacy NN_Name (no group)
  if (m) return { group: 0, slide: parseInt(m[1], 10), label: m[2] };
  return { group: 0, slide: Number.MAX_SAFE_INTEGER, label: name };
}

function prettyName(label) {
  return String(label).replace(/[_\-]+/g, ' ').trim();
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

// Build a URL path segment that survives every static host: encodeURIComponent leaves
// parentheses (and a few others) raw, which some CDNs mishandle — encode those too.
const enc = (s) => encodeURIComponent(s).replace(/[()'!*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export async function scanSlides() {
  const dir = await findDatasetDir();
  if (!dir) return { slides: [], datasetDir: null };

  const entries = await fs.readdir(dir, { withFileTypes: true });
  // Order by group first, then by slide-within-group, then by name as a tiebreaker.
  // Ungrouped (legacy, group 0) folders sort LAST, so a partial migration to gNN_MM_*
  // keeps the grouped slides up front and any not-yet-migrated folders trailing.
  const gkey = (g) => (g ? g : Number.MAX_SAFE_INTEGER);
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => ({ dirent: e, meta: parseFolder(e.name) }))
    .sort((a, b) => gkey(a.meta.group) - gkey(b.meta.group) || a.meta.slide - b.meta.slide || byName(a.dirent, b.dirent));

  const slides = [];
  for (const { dirent: folder, meta } of folders) {
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
      const src = `/${DATASET_DIR}/${enc(folder.name)}/${enc(f.name)}`;
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
      index: meta.slide,                                   // slide number (within its group)
      group: meta.group,                                   // 0 = ungrouped (legacy)
      folder: folder.name,
      name: prettyName(meta.label) || prettyName(folder.name) || folder.name,
      items,
    });
  }

  // Safety net: loose files dropped directly in Slides_Datasets/ (not inside an NN_ folder)
  // still show up — as a trailing slide — so nothing you add is ever silently ignored.
  const looseItems = [];
  for (const f of entries.filter((e) => e.isFile() && !e.name.startsWith('.')).sort(byName)) {
    const type = classify(path.extname(f.name));
    if (!type) continue;
    const item = { type, name: f.name };
    if (type === 'text') {
      try { item.text = (await fs.readFile(path.join(dir, f.name), 'utf8')).slice(0, 4000); } catch { item.text = ''; }
    } else {
      item.src = `/${DATASET_DIR}/${enc(f.name)}`;
    }
    looseItems.push(item);
  }
  if (looseItems.length) {
    const lastIndex = slides.reduce((mx, s) => Math.max(mx, s.index), 0);
    slides.push({ index: lastIndex + 1, group: 0, folder: '_loose', name: 'More', items: looseItems });
  }

  return { slides, datasetDir: dir };
}

// Flatten the live canvas into a compact text brief for the chatbot's system prompt.
export function summarize(slides, maxChars = 9000) {
  const lines = [];
  for (const s of slides) {
    const g = s.group ? `GROUP ${s.group} · ` : '';
    lines.push(`\n## ${g}SLIDE ${String(s.index).padStart(2, '0')} — ${s.name}`);
    for (const it of s.items) {
      if (it.type === 'text') lines.push(it.text.trim());
      else lines.push(`  [${it.type}] ${it.name}`);
    }
  }
  return lines.join('\n').slice(0, maxChars).trim();
}
