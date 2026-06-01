/* canvas.js — builds the messy canvas from the LIVE /api/slides manifest,
   then drives three layouts: scatter (chaos) -> focus (per folder) -> grid (order).
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
    d.style.color = '#ff2b2b';
    d.textContent = 'IMAGE NOT FOUND\n' + title;
    return d;
  }

  function build() {
    world.innerHTML = '';
    nodes = [];
    let gi = 0;
    slides.forEach((s, fi) => {
      (s.items || []).forEach((item, ii) => {
        const node = { type: item.type, folder: fi, ii, gi: gi++, x: 0, y: 0, sx: 0, sy: 0, rot: 0, srot: 0, scale: 1, z: 1, op: 1, blur: 0, glitchy: true, delay: 0 };
        makeItem(node, item);
        nodes.push(node);
      });
    });
    if (loadState) loadState.style.display = 'none';
    measure();
    scatter();
    render();
  }

  /* ---------- layouts ---------- */
  function scatter() {
    const r = rng(20240131);
    nodes.forEach((n) => {
      const pad = 80;
      n.x = n.sx = pad + r() * Math.max(1, W - pad * 2);
      n.y = n.sy = pad + r() * Math.max(1, H - pad * 2);
      n.rot = n.srot = (r() - 0.5) * 32;
      n.scale = 0.8 + r() * 0.38;
      n.z = 1 + ((r() * 30) | 0);
      n.op = 1; n.blur = 0; n.glitchy = true; n.delay = r() * 0.25;
    });
  }

  function focus(fo) {
    const fnodes = nodes.filter((n) => n.folder === fo);
    const m = fnodes.length || 1;
    const cols = m <= 3 ? m : Math.ceil(Math.sqrt(m * 1.4));
    const rows = Math.ceil(m / cols);
    const targetScale = Math.max(0.6, Math.min(1.55, (W * 0.84 / cols) / 260, (H * 0.6 / rows) / 188));
    const stepX = 260 * targetScale * 1.12;
    const stepY = 188 * targetScale * 1.28;
    const startX = W / 2 - ((cols - 1) * stepX) / 2;
    const startY = H / 2 - ((rows - 1) * stepY) / 2 + 24;

    fnodes.forEach((n, k) => {
      const c = k % cols;
      const rw = Math.floor(k / cols);
      n.x = startX + c * stepX;
      n.y = startY + rw * stepY;
      n.rot = 0; n.scale = targetScale; n.z = 500 + k; n.op = 1; n.blur = 0; n.glitchy = false; n.delay = k * 0.05;
    });
    nodes.forEach((n) => {
      if (n.folder === fo) return;
      n.x = n.sx; n.y = n.sy; n.rot = n.srot * 0.5;
      n.scale = 0.55; n.op = 0.14; n.blur = 3; n.z = 1; n.glitchy = false; n.delay = 0;
    });
    showFolderTitle(fo);
  }

  function grid() {
    const m = nodes.length || 1;
    const cols = Math.max(1, Math.round(Math.sqrt(m * (W / Math.max(1, H)))));
    const rows = Math.ceil(m / cols);
    const cellW = (W * 0.92) / cols;
    const cellH = (H * 0.8) / rows;
    const s = Math.max(0.3, Math.min(cellW / 260, cellH / 188) * 0.92);
    const gx = (W - cols * cellW) / 2 + cellW / 2;
    const gy = (H - rows * cellH) / 2 + cellH / 2 + 6;
    const ordered = nodes.slice().sort((a, b) => a.folder - b.folder || a.ii - b.ii);
    ordered.forEach((n, k) => {
      const c = k % cols;
      const rw = Math.floor(k / cols);
      n.x = gx + c * cellW;
      n.y = gy + rw * cellH;
      n.rot = 0; n.scale = s; n.z = 10; n.op = 1; n.blur = 0; n.glitchy = false;
      n.delay = (c + rw) * 0.045;
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
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) rotate(${n.rot}deg) scale(${n.scale})`;
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
      el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) rotate(${n.rot}deg) scale(${n.scale})`;
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
