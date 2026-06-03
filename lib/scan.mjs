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

// Folder naming — three accepted shapes (newest first):
//   MEGA     →  MgNN_gNN_MM_Name  mega-group NN, group NN within it, slide MM, then label.
//                                 e.g. "Mg01_g01_01_fotos" = mega 1, group 1, slide 1, "fotos".
//               A mega-group is a "super-chapter"; each group inside is a chapter of it.
//   GROUPED  →  gNN_MM_Name       group NN (no mega), slide MM within that group, then label.
//                                 e.g. "g01_01_Intro" = group 1, slide 1, "Intro".
//   LEGACY   →  NN_Name           no group/mega (kept working for backward compatibility).
// mega/group drive the per-mega hue + subtle per-chapter shade of each window (see canvas.js).
function parseFolder(name) {
  let m = name.match(/^Mg(\d+)[_\-]+g(\d+)[_\-]+(\d+)[_\-]*(.*)$/i);  // MgNN_gNN_MM_Name
  if (m) return { mega: parseInt(m[1], 10), group: parseInt(m[2], 10), slide: parseInt(m[3], 10), label: m[4] };
  m = name.match(/^g(\d+)[_\-]+(\d+)[_\-]*(.*)$/i);                    // gNN_MM_Name (no mega)
  if (m) return { mega: 0, group: parseInt(m[1], 10), slide: parseInt(m[2], 10), label: m[3] };
  m = name.match(/^(\d+)[_\-]*(.*)$/);                                 // legacy NN_Name
  if (m) return { mega: 0, group: 0, slide: parseInt(m[1], 10), label: m[2] };
  return { mega: 0, group: 0, slide: Number.MAX_SAFE_INTEGER, label: name };
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

// An image whose filename (minus extension) is purely a number — e.g. "01.png", "5.jpg".
const baseNoExt = (name) => String(name).replace(/\.[^.]+$/, '').trim();
const isNumberedImage = (it) => (it.type === 'image' || it.type === 'gif') && /^\d+$/.test(baseNoExt(it.name));

// When a slide folder holds ≥2 numbered images (a numeric sequence like 01..06), collapse them
// into ONE `carousel` item carrying the ordered frames — the canvas renders it as a single
// window with prev/next buttons. Any other files (text, non-numbered images) are kept as-is.
function collapseCarousel(items) {
  const numbered = items.filter(isNumberedImage);
  if (numbered.length < 2) return items;
  numbered.sort((a, b) => parseInt(baseNoExt(a.name), 10) - parseInt(baseNoExt(b.name), 10));
  const nums = numbered.map((it) => baseNoExt(it.name));
  const carousel = {
    type: 'carousel',
    name: `${nums[0]}–${nums[nums.length - 1]}`,        // e.g. "01–06"
    frames: numbered.map((it) => ({ src: it.src, name: it.name })),
  };
  const others = items.filter((it) => !isNumberedImage(it));
  return [carousel, ...others];
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

// Build a URL path segment that survives every static host: encodeURIComponent leaves
// parentheses (and a few others) raw, which some CDNs mishandle — encode those too.
const enc = (s) => encodeURIComponent(s).replace(/[()'!*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const encPath = (rel) => rel.split('/').map(enc).join('/');   // encode each segment of a nested path

// Recursively gather SLIDE directories. A folder that DIRECTLY contains media/text files is a
// slide; a folder that only holds sub-folders is a container (e.g. a per-mega-group folder like
// "Mg04/") and is descended into. So both the flat layout and a tidy "one folder per mega-group"
// layout work the same — the scan just looks for the leaf folders that hold files.
// Returns [{ name: basename, rel: path relative to DATASET_DIR, files: Dirent[] }].
async function collectSlideDirs(absDir, relDir) {
  let entries;
  try { entries = await fs.readdir(absDir, { withFileTypes: true }); } catch { return []; }
  const files = entries.filter((e) => e.isFile() && !e.name.startsWith('.'));
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
  if (files.some((f) => classify(path.extname(f.name)))) {
    return [{ name: path.basename(absDir), rel: relDir, files: files.sort(byName) }];   // a leaf slide
  }
  let out = [];
  for (const d of dirs.sort(byName)) {
    out = out.concat(await collectSlideDirs(path.join(absDir, d.name), relDir ? relDir + '/' + d.name : d.name));
  }
  return out;
}

export async function scanSlides() {
  const dir = await findDatasetDir();
  if (!dir) return { slides: [], datasetDir: null };

  // Gather every slide folder (flat OR nested inside a per-mega-group container), then order by
  // mega-group, group-within-mega, slide, name. Parsing uses each folder's own basename, so the
  // grouping is identical whether or not the folders live inside "MgNN/" parents.
  const key = (g) => (g ? g : Number.MAX_SAFE_INTEGER);
  const collected = await collectSlideDirs(dir, '');
  const folders = collected
    .map((c) => ({ name: c.name, rel: c.rel, files: c.files, meta: parseFolder(c.name) }))
    .sort((a, b) =>
      key(a.meta.mega) - key(b.meta.mega) ||
      key(a.meta.group) - key(b.meta.group) ||
      a.meta.slide - b.meta.slide ||
      a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Walk the sorted folders and assign each a GLOBAL sequential group ordinal (the engine's
  // walk-unit & scope key — unique even when two mega-groups both contain a "g01"), plus the
  // group's chapter index WITHIN its mega-group (1-based) for the subtle per-chapter shade.
  // colorKey picks the base hue (--grp-N): the mega for the new scheme, the group for legacy.
  // Also assign a SECTION ordinal — the Act-3 grouping unit. Act 3 groups by MEGA-GROUP (all
  // chapters of one super-chapter share a single messy canvas / scope), so section = the mega.
  // Legacy folders (no mega) keep grouping by their own group, so section = that group there.
  let groupOrd = 0, curMega = null, chapterInMega = 0, prevKey = null;
  let sectionOrd = 0, prevSec = null;
  for (const f of folders) {
    const meta = f.meta;
    if (!meta.group && !meta.mega) { f.ord = 0; f.section = 0; f.chapter = 0; f.colorKey = 0; f.shadeStep = 0; continue; }
    const k = meta.mega + ':' + meta.group;
    if (k !== prevKey) {
      groupOrd++;
      if (meta.mega !== curMega) { curMega = meta.mega; chapterInMega = 1; } else chapterInMega++;
      prevKey = k;
    }
    const secKey = meta.mega ? ('m' + meta.mega) : ('g' + meta.group);
    if (secKey !== prevSec) { sectionOrd++; prevSec = secKey; }
    f.ord = groupOrd;
    f.section = sectionOrd;
    f.chapter = meta.mega ? chapterInMega : 0;
    f.colorKey = meta.mega ? meta.mega : meta.group;
    f.shadeStep = meta.mega ? chapterInMega - 1 : 0;
  }

  const slides = [];
  for (const { name: folderName, rel, files, meta, ord, section, chapter, colorKey, shadeStep } of folders) {
    const fdir = path.join(dir, rel);                    // rel path handles the MgNN/ nesting
    const items = [];
    for (const f of files) {
      const ext = path.extname(f.name);
      const type = classify(ext);
      if (!type) continue;
      const src = `/${DATASET_DIR}/${encPath(rel)}/${enc(f.name)}`;
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
    const finalItems = collapseCarousel(items);
    slides.push({
      index: meta.slide,                                   // slide number (within its group)
      group: ord || 0,                                     // GLOBAL group ordinal (chapter identity), 0 = ungrouped
      section: section || 0,                               // Act-3 grouping unit = mega-group (or legacy group), 0 = ungrouped
      gnum: meta.group || 0,                               // RAW group number as typed (the "gNN"), for the G-chip
      mega: meta.mega || 0,                                // mega-group (super-chapter), 0 = none
      chapter: chapter || 0,                               // group's index within its mega (1-based), 0 = legacy/none
      colorKey: colorKey || 0,                             // base hue source (--grp-N): mega for new, group for legacy
      shadeStep: shadeStep || 0,                           // subtle per-chapter lightening step (0 = base hue)
      folder: folderName,
      name: prettyName(meta.label) || prettyName(folderName) || folderName,
      items: finalItems,
    });
  }

  // Safety net: loose files dropped directly in Slides_Datasets/ (not inside an NN_ folder)
  // still show up — as a trailing slide — so nothing you add is ever silently ignored.
  const looseItems = [];
  const topEntries = await fs.readdir(dir, { withFileTypes: true });
  for (const f of topEntries.filter((e) => e.isFile() && !e.name.startsWith('.')).sort(byName)) {
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
    slides.push({ index: lastIndex + 1, group: 0, section: 0, gnum: 0, mega: 0, chapter: 0, colorKey: 0, shadeStep: 0, folder: '_loose', name: 'More', items: looseItems });
  }

  return { slides, datasetDir: dir };
}

// Flatten the live canvas into a compact text brief for the chatbot's system prompt.
export function summarize(slides, maxChars = 9000) {
  const lines = [];
  for (const s of slides) {
    const mg = s.mega ? `MEGA-GROUP ${s.mega} · CHAPTER ${s.chapter} · ` : '';
    const g = s.group ? `${mg}GROUP ${s.group} · ` : '';
    lines.push(`\n## ${g}SLIDE ${String(s.index).padStart(2, '0')} — ${s.name}`);
    for (const it of s.items) {
      if (it.type === 'text') lines.push(it.text.trim());
      else if (it.type === 'carousel') lines.push(`  [carousel] ${it.name} (${(it.frames || []).length} images)`);
      else lines.push(`  [${it.type}] ${it.name}`);
    }
  }
  return lines.join('\n').slice(0, maxChars).trim();
}
