/* canvas.js — builds the messy canvas from the LIVE /api/slides manifest,
   then drives three layouts: scatter (chaos) -> focus (per folder) -> grid (order).
   Items are always upright (no rotation); the FRAME ORIENTATION follows the media it holds
   (a wide image gets a landscape frame, a tall one a portrait frame) — width stays uniform,
   the height is derived from each image/video's real aspect ratio once it loads.
   Falls back to window.SLIDES (offline snapshot) or an inline demo. */
(function () {
  const world = document.getElementById('world');
  const loadState = document.getElementById('loadState');
  const folderTitle = document.getElementById('folderTitle');
  const ftGrp = folderTitle && folderTitle.querySelector('.ft-grp');
  const ftIdx = folderTitle && folderTitle.querySelector('.ft-idx');
  const ftName = folderTitle && folderTitle.querySelector('.ft-name');

  let slides = [];
  let nodes = [];
  let W = 0;
  let H = 0;
  let scopeGroup = null;          // null = all groups (full run); else present only this group

  // group-coloured connection graph (mirrors the Act-2 index; edges follow the windows)
  const SVGNS = 'http://www.w3.org/2000/svg';
  let edgesSvg = null, edgePairs = [], edgesOn = false, edgeRAF = 0;
  function groupColor(g) {
    const v = g ? getComputedStyle(document.documentElement).getPropertyValue('--grp-' + g).trim() : '';
    return v || '#9aa3bd';
  }

  /* ---------- helpers ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function measure() { W = world.clientWidth || innerWidth; H = world.clientHeight || innerHeight; }

  // Uniform width. The height is a PLACEHOLDER until the media loads; for images/videos it
  // is then replaced by an aspect-derived height (see applyOrientation) so the frame takes
  // the media's orientation. Text cards keep this varied height (no natural orientation).
  function sizeFor(type, gi) {
    const unit = W < 760 ? 0.6 : (W < 1100 ? 0.82 : 1);
    const w = Math.round(236 * unit);
    const heightsImg = [156, 198, 250, 312, 386];
    // text cards are kept compact so the copy overflows and auto-scrolls (ping-pong pan)
    const heightsTxt = [128, 152, 180];
    const arr = type === 'text' ? heightsTxt : heightsImg;
    const h = Math.round(arr[(gi * 7 + (type === 'text' ? 2 : 0)) % arr.length] * unit);
    return { w, h };
  }

  // Frame orientation = media orientation. Keep the uniform width and set the height from the
  // real aspect ratio: wide media -> short (landscape frame), tall media -> high (portrait
  // frame). Clamped so extreme panoramas/strips stay readable. We only mirror the ORIENTATION,
  // not the exact pixel size. Layouts (gridSlots/zoomCluster/focus/grid) read node.h live, so
  // updating it here is picked up the next time a view is applied; we also resize in place now.
  function applyOrientation(node, natW, natH) {
    if (!natW || !natH) return;
    const h = Math.round(Math.max(node.w * 0.5, Math.min(node.w * 1.7, node.w * (natH / natW))));
    if (h === node.h) return;
    node.h = h;
    if (node.el) {
      node.el.style.height = h + 'px';
      node.el.style.transform = `translate(${node.x}px, ${node.y}px) translate(-50%, -50%) scale(${node.scale})`;
    }
  }

  function DEMO() {
    return [
      { index: 1, name: 'Intro', folder: '01_Intro', items: [
        { type: 'text', name: 'intro.txt', text: 'INSIDE THE BLACK BOX\n\nThe machine arrives sealed, smooth, mute.\nWe admire the surface. We never open it.\n\nThis canvas is the inside of the box.' } ] },
      { index: 2, name: 'Open Machine', folder: '02_Open', items: [
        { type: 'text', name: 'open.txt', text: 'OPENNESS, NOT AUTOMATION\n\nThe good machine keeps a margin of\nindetermination — a gap where a human\ncan still tune and interpret.' } ] },
      { index: 3, name: 'Rationalize', folder: '03_Rationalize', items: [
        { type: 'text', name: 'note.txt', text: 'ORDER FROM CHAOS\n\nThe black box already scrambles the data.\nWhat matters is how WE rationalize it.\n\n(add files to Slides_Datasets to fill me)' } ] }
    ];
  }

  /* ---------- build DOM ---------- */
  function makeItem(node, item) {
    const fig = document.createElement('figure');
    fig.className = `item type-${item.type} glitchy`;
    if (node.group) fig.dataset.group = node.group;   // group → header colour (see main.css)
    fig.style.width = node.w + 'px';
    fig.style.height = node.h + 'px';
    fig.style.setProperty('--fp', Math.random().toFixed(3));   // random float phase (Act 3 drift)
    const title = (item.type === 'text' ? (item.name || 'README.TXT') : (item.name || item.type)).toUpperCase();

    const win = document.createElement('div');
    win.className = 'win';
    const bar = document.createElement('div');
    bar.className = 'winbar';
    bar.innerHTML = `<span class="wb-dot"></span><span class="wb-title">${esc(title)}</span><span class="wb-btns"><i>_</i><i>&#9633;</i><i class="wb-x">&#10005;</i></span>`;
    const body = document.createElement('div');
    body.className = 'winbody';

    if (item.type === 'text') {
      const tc = document.createElement('div');
      tc.className = 'textcard';
      const inner = document.createElement('div');
      inner.className = 'textscroll';
      inner.textContent = item.text || '';
      tc.appendChild(inner);
      body.appendChild(tc);
    } else if (item.type === 'video') {
      const v = document.createElement('video');
      v.src = item.src; v.muted = true; v.loop = true; v.autoplay = true;
      v.playsInline = true; v.setAttribute('playsinline', '');
      v.addEventListener('loadedmetadata', () => applyOrientation(node, v.videoWidth, v.videoHeight));
      body.appendChild(v);
      const t = document.createElement('span'); t.className = 'vid-tag'; t.textContent = 'VIDEO'; body.appendChild(t);
    } else {
      const img = document.createElement('img');
      img.src = item.src; img.alt = title; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => { img.replaceWith(brokenTile(title)); });
      img.addEventListener('load', () => applyOrientation(node, img.naturalWidth, img.naturalHeight));
      if (img.complete && img.naturalWidth) applyOrientation(node, img.naturalWidth, img.naturalHeight);
      body.appendChild(img);
      if (item.type === 'gif') { const t = document.createElement('span'); t.className = 'gif-tag'; t.textContent = 'GIF'; body.appendChild(t); }
    }
    win.appendChild(bar); win.appendChild(body); fig.appendChild(win);
    world.appendChild(fig);
    node.el = fig;
    enableDrag(node);
  }
  function brokenTile(title) {
    const d = document.createElement('div');
    d.className = 'textcard';
    d.style.color = '#ff00b8';
    d.textContent = 'IMAGE NOT FOUND\n' + title;
    return d;
  }

  function build() {
    world.innerHTML = '';
    nodes = [];
    edgePairs = [];
    measure();
    // edge layer sits behind the windows (z 0); lines drawn in updateEdges()
    edgesSvg = document.createElementNS(SVGNS, 'svg');
    edgesSvg.setAttribute('class', 'world-edges');
    edgesSvg.style.display = 'none';
    world.appendChild(edgesSvg);
    let gi = 0;
    slides.forEach((s, fi) => {
      (s.items || []).forEach((item, ii) => {
        const sz = sizeFor(item.type, gi);
        const node = { type: item.type, group: s.group || 0, folder: fi, ii, gi: gi++, w: sz.w, h: sz.h, x: 0, y: 0, sx: 0, sy: 0, rot: 0, scale: 1, z: 1, op: 1, blur: 0, glitchy: true, delay: 0 };
        makeItem(node, item);
        nodes.push(node);
      });
    });
    buildEdges();
    if (loadState) loadState.style.display = 'none';
    scatter();
    render();
    setupTextAutoScroll();
  }

  /* ---------- group-coloured connection graph (Act 3 / 4) ----------
     Each group's windows are linked (chain + skip-one) by a line in the group's colour.
     The lines live in an SVG behind the windows and follow their live screen positions
     every frame while shown, so the canvas reads as a graph just like the Act-2 index. */
  function buildEdges() {
    const byGroup = new Map();
    nodes.forEach((n) => { const g = n.group || 0; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(n); });
    for (const [g, arr] of byGroup) {
      const col = groupColor(g);
      for (let i = 0; i < arr.length; i++) {
        if (i + 1 < arr.length) addEdge(arr[i], arr[i + 1], col);
        if (i + 2 < arr.length) addEdge(arr[i], arr[i + 2], col);
      }
    }
  }
  function addEdge(a, b, col) {
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('class', 'world-edge');
    line.style.stroke = col;
    edgesSvg.appendChild(line);
    edgePairs.push({ a, b, line });
  }
  function updateEdges() {
    if (!edgesSvg) return;
    const wr = edgesSvg.getBoundingClientRect();
    for (const e of edgePairs) {
      if (e.a.hidden || e.b.hidden || !e.a.el || !e.b.el) { e.line.style.opacity = '0'; continue; }
      const ra = e.a.el.getBoundingClientRect(), rb = e.b.el.getBoundingClientRect();
      e.line.setAttribute('x1', (ra.left + ra.width / 2 - wr.left).toFixed(1));
      e.line.setAttribute('y1', (ra.top + ra.height / 2 - wr.top).toFixed(1));
      e.line.setAttribute('x2', (rb.left + rb.width / 2 - wr.left).toFixed(1));
      e.line.setAttribute('y2', (rb.top + rb.height / 2 - wr.top).toFixed(1));
      e.line.style.opacity = '';
    }
  }
  function edgeLoop() {
    if (!edgesOn) { edgeRAF = 0; return; }
    updateEdges();
    edgeRAF = requestAnimationFrame(edgeLoop);
  }
  function setEdges(on) {
    edgesOn = !!on;
    if (edgesSvg) edgesSvg.style.display = on ? '' : 'none';
    if (on && !edgeRAF) edgeRAF = requestAnimationFrame(edgeLoop);
  }

  // Each active (non-dimmed) text window auto-scrolls its copy down, pauses, then back up
  // (ping-pong), driven via scrollTop so the native scrollbar tracks along. The instant the
  // reader touches THAT window's scrollbar / wheel / keys, its auto-scroll stops — only it.
  function setupTextAutoScroll() {
    const cards = [];
    nodes.forEach((n) => {
      if (n.type !== 'text' || !n.el) return;
      const tc = n.el.querySelector('.textcard');
      if (!tc) return;
      const c = { tc, item: n.el, manual: false, prog: false };
      const stop = () => { c.manual = true; };
      tc.addEventListener('wheel', stop, { passive: true });
      tc.addEventListener('touchstart', stop, { passive: true });
      tc.addEventListener('keydown', stop);
      // a scroll we did NOT cause (scrollbar drag / click) means the reader took over
      tc.addEventListener('scroll', () => { if (c.prog) { c.prog = false; return; } c.manual = true; });
      cards.push(c);
    });
    if (!cards.length) return;

    const period = 16000;                 // full down+up cycle (ms)
    const dHold = 0.08, dEnd = 0.46, uHold = 0.54;   // pauses at top/bottom
    function frame(t) {
      for (const c of cards) {
        if (c.manual || c.item.classList.contains('past')) continue;   // dimmed/taken-over hold still
        const max = c.tc.scrollHeight - c.tc.clientHeight;
        if (max <= 1) continue;
        const ph = (t % period) / period;
        let p;
        if (ph < dHold) p = 0;
        else if (ph < dEnd) p = (ph - dHold) / (dEnd - dHold);
        else if (ph < uHold) p = 1;
        else p = 1 - (ph - uHold) / (1 - uHold);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // ease in-out
        const target = Math.round(e * max);
        if (target !== Math.round(c.tc.scrollTop)) { c.prog = true; c.tc.scrollTop = target; }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- group scope (the INDEX act presents one chosen group) ---------- */
  function inScope(n) { return scopeGroup == null || (n.group || 0) === scopeGroup; }
  // folder indices that belong to the current scope, in narrative order
  function scopedFolderList() {
    const seen = new Set(); const out = [];
    nodes.forEach((n) => { if (inScope(n) && !seen.has(n.folder)) { seen.add(n.folder); out.push(n.folder); } });
    return out;
  }

  /* ---------- layouts (all upright: rot = 0) ---------- */
  function scatter() {
    const r = rng(20240131);
    nodes.forEach((n) => {
      if (!inScope(n)) { n.hidden = true; n.op = 0; n.glitchy = false; return; }
      n.hidden = false;
      const padX = n.w * 0.5 + 8;
      const padY = n.h * 0.5 + 8;
      n.x = n.sx = padX + r() * Math.max(1, W - padX * 2);
      n.y = n.sy = padY + r() * Math.max(1, H - padY * 2);
      n.rot = 0;
      n.scale = 1;
      n.z = 1 + ((r() * 30) | 0);
      n.op = 1; n.blur = 0; n.glitchy = true; n.delay = r() * 0.22;
    });
  }

  // Compute each node's FINAL grid slot (gx, gy, gs). Used by both the progressive
  // focus() and the final grid() so items never jump — once placed they keep the slot.
  function gridSlots() {
    const pool = nodes.filter(inScope);
    const ordered = pool.slice().sort((a, b) => a.folder - b.folder || a.ii - b.ii);
    const m = ordered.length || 1;
    const baseW = (pool[0] && pool[0].w) || 236;
    const gapX = 16;
    const gapY = 16;
    const cols = Math.max(1, Math.min(m, Math.round(Math.sqrt(m * (W / Math.max(1, H)) * 1.15))));

    const colH = new Array(cols).fill(0);
    const pos = [];
    ordered.forEach((n) => {
      let ci = 0;
      for (let i = 1; i < cols; i++) if (colH[i] < colH[ci]) ci = i;
      pos.push({ n, cx: ci * (baseW + gapX) + baseW / 2, top: colH[ci] });
      colH[ci] += n.h + gapY;
    });
    const totalW = cols * baseW + (cols - 1) * gapX;
    const totalH = Math.max.apply(null, colH) - gapY;
    const s = Math.min(1, (W * 0.94) / totalW, (H * 0.82) / totalH);
    const offX = (W - totalW * s) / 2;
    const offY = (H - totalH * s) / 2 + 4;

    pos.forEach(({ n, cx, top }) => {
      n.gx = offX + cx * s;
      n.gy = offY + (top + n.h / 2) * s;
      n.gs = s;
      n.gdelay = (cx / (totalW || 1)) * 0.25;
    });
  }

  // Current folder shown as a centered, ZOOMED "hero" cluster (above the scrim). Sets
  // position/scale only; flags are set by focus(). Rows are individually centred so a
  // short final row stays balanced under the ones above it.
  function zoomCluster(list) {
    const m = list.length;
    if (!m) return;
    const cellW = Math.max.apply(null, list.map((n) => n.w));
    const cellH = Math.max.apply(null, list.map((n) => n.h));
    const gap = 24;
    // pick the column count that lets the cluster ZOOM the most while still fitting,
    // so the current folder reads as an enlarged, centered hero (not a shrunk grid)
    let cols = 1, s = 0;
    for (let c = 1; c <= m; c++) {
      const r = Math.ceil(m / c);
      const gw = c * cellW + (c - 1) * gap;
      const gh = r * cellH + (r - 1) * gap;
      const fit = Math.min(1.85, (W * 0.8) / gw, (H * 0.8) / gh);
      if (fit > s) { s = fit; cols = c; }
    }
    const rows = Math.ceil(m / cols);
    const gridH = rows * cellH + (rows - 1) * gap;
    const offY = (H - gridH * s) / 2;
    list.forEach((n, i) => {
      const c = i % cols;
      const r = (i / cols) | 0;
      const inRow = Math.min(cols, m - r * cols);
      const rowW = inRow * cellW + (inRow - 1) * gap;
      const rowOffX = (W - rowW * s) / 2;
      n.x = rowOffX + (c * (cellW + gap) + cellW / 2) * s;
      n.y = offY + (r * (cellH + gap) + cellH / 2) * s;
      n.scale = s;
    });
  }

  // Progressive arrangement: the CURRENT folder is a centered zoom (hero); folders already
  // passed settle into their final ordered-grid slot and STAY there; folders not yet
  // reached wait scattered in the back canvas (below the white scrim — softly veiled).
  // localIdx indexes into the in-scope folder list (so a group runs 0..M-1 on its own).
  function focus(localIdx) {
    gridSlots();
    const folders = scopedFolderList();
    const fo = folders[localIdx];
    const posOf = new Map(folders.map((f, i) => [f, i]));
    zoomCluster(nodes.filter((n) => inScope(n) && n.folder === fo));
    nodes.forEach((n) => {
      if (!inScope(n)) { n.hidden = true; n.op = 0; n.glitchy = false; n.fresh = false; n.past = false; return; }
      n.hidden = false;
      const pos = posOf.get(n.folder);
      if (n.folder === fo) {
        // current: centered zoom (position/scale set above) — only flags here
        n.rot = 0; n.blur = 0; n.op = 1;
        n.past = false; n.fresh = true;       // sharp, highlighted hero
        n.z = 520; n.glitchy = false; n.delay = 0.05;
      } else if (pos < localIdx) {
        n.x = n.gx; n.y = n.gy; n.scale = n.gs;   // earlier folders settle into the ordered grid
        n.rot = 0; n.blur = 0; n.op = 1;
        n.past = true; n.fresh = false;       // white-veiled "previous slide" (still opaque)
        n.z = 500; n.glitchy = false; n.delay = 0;
      } else {
        n.x = n.sx; n.y = n.sy; n.scale = 1;
        n.rot = 0; n.op = 1; n.blur = 0;
        n.z = 1;                              // below the scrim: still present, just veiled
        n.glitchy = false; n.fresh = false; n.past = false; n.delay = 0;
      }
    });
    showFolderTitle(fo);
  }

  function grid() {
    gridSlots();
    nodes.forEach((n) => {
      if (!inScope(n)) { n.hidden = true; n.op = 0; n.glitchy = false; n.fresh = false; n.past = false; return; }
      n.hidden = false;
      n.x = n.gx; n.y = n.gy; n.scale = n.gs;
      n.rot = 0; n.op = 1; n.blur = 0; n.z = 10; n.glitchy = false; n.fresh = false; n.past = false;
      n.delay = n.gdelay;
    });
    hideFolderTitle();
  }

  /* ---------- render ---------- */
  function render() {
    nodes.forEach((n) => {
      const el = n.el;
      if (!el) return;
      el.style.setProperty('--d', (n.delay || 0) + 's');
      el.style.zIndex = n.z;
      el.style.opacity = n.op;
      el.style.filter = n.blur ? `blur(${n.blur}px)` : 'none';
      el.classList.toggle('glitchy', !!n.glitchy);
      el.classList.toggle('fresh', !!n.fresh);
      el.classList.toggle('past', !!n.past);
      el.classList.toggle('scoped-out', !!n.hidden);
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${n.scale})`;
      n.delay = 0;
    });
  }

  // Zoom-in entrance for a group's messy canvas: each in-scope item starts tiny + transparent
  // exactly where it will land, then zooms up to full size (staggered) — the group "places
  // itself on the screen". Out-of-scope items fade away. Used entering Act 3 / each group.
  function scatterZoom() {
    measure();
    scatter();          // compute scattered targets for in-scope; hide the rest
    render();           // commit z-index / classes / out-of-scope fade-out
    nodes.forEach((n) => {
      const el = n.el;
      if (!el || n.hidden) return;
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(0.12)`;
    });
    void world.offsetWidth;   // commit the tiny start state before animating
    nodes.forEach((n) => {
      const el = n.el;
      if (!el || n.hidden) return;
      el.style.transition = '';
      el.style.setProperty('--d', (Math.random() * 0.28).toFixed(2) + 's');   // gentle stagger
      el.style.opacity = n.op;
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${n.scale})`;
    });
  }

  /* ---------- folder title ---------- */
  function showFolderTitle(fo) {
    const s = slides[fo];
    if (!folderTitle || !s) return;
    if (ftGrp) {
      if (s.group) { ftGrp.textContent = 'G' + s.group; folderTitle.dataset.group = s.group; }
      else { ftGrp.textContent = ''; folderTitle.removeAttribute('data-group'); }
    }
    ftIdx.textContent = String(s.index).padStart(2, '0');
    ftName.textContent = (s.name || s.folder || '').toUpperCase();
    folderTitle.classList.add('show');
  }
  function hideFolderTitle() { if (folderTitle) folderTitle.classList.remove('show'); }

  /* ---------- drag ---------- */
  function enableDrag(n) {
    const el = n.el;
    let sx, sy, ox, oy, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wb-x')) { el.style.display = 'none'; e.stopPropagation(); return; }
      dragging = true;
      el.classList.add('dragging');
      sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      n.x = ox + (e.clientX - sx);
      n.y = oy + (e.clientY - sy);
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${n.scale})`;
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------- load ---------- */
  async function load() {
    let data = null;
    try {
      const res = await fetch('/api/slides', { cache: 'no-store' });
      if (res.ok) data = await res.json();
    } catch (_) { /* file:// or offline */ }

    if (data && Array.isArray(data.slides) && data.slides.length) slides = data.slides;
    else if (Array.isArray(window.SLIDES) && window.SLIDES.length) slides = window.SLIDES;
    else slides = DEMO();

    build();
  }

  window.Canvas = {
    load,
    count: () => slides.length,
    slides: () => slides,
    // group scoping (driven by the INDEX act)
    setScope(g) { scopeGroup = (g == null ? null : Number(g)); },
    scope: () => scopeGroup,
    scopeFolderCount() { return scopedFolderList().length; },
    scopeSlides() { return scopedFolderList().map((fi) => slides[fi]).filter(Boolean); },
    groupsPresent() {
      const seen = new Set(); const out = [];
      slides.forEach((s) => { const g = s.group || 0; if (!seen.has(g)) { seen.add(g); out.push(g); } });
      return out;
    },
    edges(on) { setEdges(on); },
    scatterView() { measure(); scatter(); render(); hideFolderTitle(); },
    scatterZoomView() { scatterZoom(); hideFolderTitle(); },
    focusView(localIdx) { measure(); focus(localIdx); render(); },
    gridView() { measure(); grid(); render(); }
  };
})();
