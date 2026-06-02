// Shared runtime PDF scanner. Companion to lib/scan.mjs (which handles the canvas).
// Reads every *.pdf in assets/PDF/ on demand and extracts its text so the chatbot can
// ground answers in the source papers — not only the slides. Fully dynamic & scalable:
// drop a new PDF in assets/PDF/ and it is picked up automatically, no rebuild, no code change.
//
// Extraction is the expensive bit, so each PDF's text is memoised in module scope keyed
// by name+mtime+size. On Vercel Fluid Compute the function instance is reused across
// requests, so a given PDF is parsed once per warm instance; editing/replacing a PDF
// (new mtime/size) busts its cache entry on the next request.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PDF_DIR = path.join('assets', 'PDF');

function candidateBases() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [process.cwd(), path.join(here, '..'), path.join(here, '..', '..'), here];
}

async function findPdfDir() {
  for (const base of candidateBases()) {
    const p = path.join(base, PDF_DIR);
    try {
      const s = await fs.stat(p);
      if (s.isDirectory()) return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function prettyName(name) {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || name;
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

// name+mtime+size -> extracted text (survives across requests on a warm instance)
const textCache = new Map();

async function extractPdfText(filePath) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const buf = await fs.readFile(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function scanPdfs() {
  const dir = await findPdfDir();
  if (!dir) return { pdfs: [], pdfDir: null };

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name.toLowerCase().endsWith('.pdf'))
    .sort(byName);

  const pdfs = [];
  for (const f of files) {
    const full = path.join(dir, f.name);
    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    const key = `${f.name}:${stat.mtimeMs}:${stat.size}`;
    let text = textCache.get(key);
    if (text === undefined) {
      try {
        text = await extractPdfText(full);
      } catch (e) {
        console.error(`[pdfs] failed to read ${f.name}:`, (e && e.message) || e);
        text = '';
      }
      textCache.set(key, text);
    }
    pdfs.push({ name: f.name, title: prettyName(f.name), chars: text.length, text });
  }
  return { pdfs, pdfDir: dir };
}

// Flatten the source papers into a compact brief for the chatbot's system prompt.
// perPdf caps how much of each paper is included so one long PDF can't crowd out the
// others; maxChars caps the whole block.
export function summarizePdfs(pdfs, { perPdf = 1800, maxChars = 16000 } = {}) {
  const lines = [];
  for (const p of pdfs) {
    lines.push(`\n## PAPER — ${p.title}`);
    const body = (p.text || '').trim();
    lines.push(body ? body.slice(0, perPdf) : '(text could not be extracted from this PDF)');
  }
  return lines.join('\n').slice(0, maxChars).trim();
}
