/* serve.mjs — tiny static preview server (no login required).
   Run:  npm run preview   ->  http://localhost:5050
   This serves the page + assets only. /api/* is NOT available here, so the
   canvas uses the slides-data.js snapshot and the chatbot shows its offline
   fallback. For the full experience (live /api/slides + AI chat) use `vercel dev`. */
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 5050;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8'
};

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.statusCode = 403; return res.end('forbidden'); }
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('404 — not found');
  }
}).listen(PORT, () => {
  console.log(`\n  INSIDE THE BLACK BOX — static preview`);
  console.log(`  http://localhost:${PORT}\n  (static only — use \`vercel dev\` for live /api + AI chat)\n`);
});
