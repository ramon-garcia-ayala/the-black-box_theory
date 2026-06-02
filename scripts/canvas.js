/* canvas.js — builds the messy canvas from the LIVE /api/slides manifest,
   then drives three layouts: scatter (chaos) -> focus (per folder) -> grid (order).
   Items are always upright (no rotation) and have varied vertical dimensions.
   Falls back to window.SLIDES (offline snapshot) or an inline demo. */
(function () {
  const world = document.getElementById('world');
  const loadState = document.getElementById('loadState');
  const folderTitle = document.getElementById('folderTitle');
  const ftIdx = folderTitle && folderTitle.querySelector('.ft-idx');
  const ftName = folderTitle && folderTitle.querySelector('.ft-name');

  let slides = [];
  let nodes = [];
  let W = 0;
  let H = 0;

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

  // Uniform width, VARIED vertical dimensions (per item, deterministic).
  function sizeFor(type, gi) {
    const unit = W < 760 ? 0.6 : (W < 1100 ? 0.82 : 1);
    const w = Math.round(236 * unit);
    const heightsImg = [156, 198, 250, 312, 386];
    const heightsTxt = [206, 262, 330];
    const arr = type === 'text' ? heightsTxt : heightsImg;
    const h = Math.round(arr[(gi * 7 + (type === 'text' ? 2 : 0)) % arr.length] * unit);
    return { w, h };
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
    fig.style.width = node.w + 'px';
    fig.style.height = node.h + 'px';
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
      tc.textContent = item.text || '';
      body.appendChild(tc);
    } else if (item.type === 'video') {
      const v = document.createElement('video');
      v.src = item.src; v.muted = true; v.loop = true; v.autoplay = true;
      v.playsInline = true; v.setAttribute('playsinline', '');
      body.appendChild(v);
      const t = document.createElement('span'); t.className = 'vid-tag'; t.textContent = 'VIDEO'; body.appendChild(t);
    } else {
      const img = document.createElement('img');
      img.src = item.src; img.alt = title; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => { img.replaceWith(brokenTile(title)); });
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
    measure();
    let gi = 0;
    slides.forEach((s, fi) => {
      (s.items || []).forEach((item, ii) => {
        const sz = sizeFor(item.type, gi);
        const node = { type: item.type, folder: fi, ii, gi: gi++, w: sz.w, h: sz.h, x: 0, y: 0, sx: 0, sy: 0, rot: 0, scale: 1, z: 1, op: 1, blur: 0, glitchy: true, delay: 0 };
        makeItem(node, item);
        nodes.push(node);
      });
    });
    if (loadState) loadState.style.display = 'none';
    scatter();
    render();
  }

  /* ---------- layouts (all upright: rot = 0) ---------- */
  function scatter() {
    const r = rng(20240131);
    nodes.forEach((n) => {
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
    const ordered = nodes.slice().sort((a, b) => a.folder - b.folder || a.ii - b.ii);
    const m = ordered.length || 1;
    const baseW = (nodes[0] && nodes[0].w) || 236;
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

  // Progressive arrangement: folders already reached snap into their final grid slot
  // and STAY there; folders not yet reached wait in the scattered back canvas (kept
  // below the white scrim so they read as softly veiled — never vanishing).
  function focus(fo) {
    gridSlots();
    nodes.forEach((n) => {
      if (n.folder <= fo) {
        const current = n.folder === fo;
        n.x = n.gx; n.y = n.gy; n.scale = n.gs;
        n.rot = 0; n.blur = 0;
        n.op = 1;                             // window stays FULLY OPAQUE — never see-through,
                                              // so the repeating background can never bleed through it
        n.past = !current;                    // earlier slides read "dimmed" via content fade (CSS), not transparency
        n.z = current ? 520 : 500;            // above the scrim (z 250): sharp, placed
        n.glitchy = false;
        n.fresh = current;                    // highlight the folder that just arrived
        n.delay = current ? 0.05 : 0;
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
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${n.scale})`;
      n.delay = 0;
    });
  }

  /* ---------- folder title ---------- */
  function showFolderTitle(fo) {
    const s = slides[fo];
    if (!folderTitle || !s) return;
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
    scatterView() { measure(); scatter(); render(); hideFolderTitle(); },
    focusView(fo) { measure(); focus(fo); render(); },
    gridView() { measure(); grid(); render(); }
  };
})();
