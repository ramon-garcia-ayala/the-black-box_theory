import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
await fs.mkdir('_verify', { recursive: true });
let b; try { b = await chromium.launch({ channel: 'msedge' }); } catch { try { b = await chromium.launch({ channel: 'chrome' }); } catch { b = await chromium.launch(); } }
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5050/index.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.screenshot({ path: '_verify/act1-intro.png' });          // intro popup
await p.click('#openBtn'); await p.waitForTimeout(700);
for (let i = 0; i < 14; i++) { const l = await p.textContent('#actLabel'); if (l && l.includes('RATIONALIZED')) break; await p.click('#nextBtn'); await p.waitForTimeout(520); }
await p.waitForTimeout(800);
await p.screenshot({ path: '_verify/act3-rationalize.png' });    // rationalize window
await p.click('#nextBtn'); await p.waitForTimeout(1000);
await p.screenshot({ path: '_verify/act4-chat.png' });           // chat window on white
console.log('ERR=' + (errs.join('|') || 'none'));
await b.close();
