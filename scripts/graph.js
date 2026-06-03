/* graph.js — ACT 2 "THE INDEX".
   A force-directed network of EVERY item in EVERY folder, on a clean white field.
   Every node wears the same "web window" chrome as the Act-3 canvas (title bar tinted by
   its group colour; text items render as the Act-3 notepad/terminal card). The groups are
   intentionally MIXED together into one chaotic blob — yet hovering any node still isolates
   only its group (the rest dims out). Clicking a node enters the presentation of that group
   (via Present.pickGroup). Reads its data live from Canvas.slides(). */
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const host = document.getElementById('act-index');
  if (!host) return;
  const svg = host.querySelector('#idxEdges');
  const layer = host.querySelector('#idxNodes');
  const legend = host.querySelector('#idxLegend');

  let nodes = [];     // { el, group, w, h, r, bx, by, fx, fy, ph, amp, sp }
  let edges = [];     // { line, a, b }
  let built = false, running = false, raf = 0, t0 = 0;
  let W = 0, H = 0;
  const view = { x: 0, y: 0, s: 1 };   // viewport pan (x,y) + zoom (s) — Rhino-style controls
  let controlsWired = false;

  function measure() { W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight; }
  function rootVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  // mega-group hue + subtle per-chapter shade (mirrors canvas.js / lib/scan.mjs).
  const HUE_FALLBACK = ['#0a30ff', '#ff1f8f', '#00a36c', '#7a3cff', '#e2641a', '#0a93b8', '#c01f5b', '#1f7a3c', '#b8860a', '#5b3cc0'];
  function baseHue(key) {
    const v = key ? rootVar('--grp-' + key) : '';
    return v || (key ? HUE_FALLBACK[(key - 1) % HUE_FALLBACK.length] : '#9aa3bd');
  }
  function shadeHex(hex, amt) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const mix = (v) => Math.round(v + (255 - v) * amt).toString(16).padStart(2, '0');
    return '#' + mix(r) + mix(g) + mix(b);
  }
  function slideColor(colorKey, shadeStep) {
    if (!colorKey) return '#9aa3bd';
    return shadeHex(baseHue(colorKey), Math.min(0.58, (shadeStep || 0) * 0.26));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const dist2 = (a, b) => { const dx = a.bx - b.bx, dy = a.by - b.by; return dx * dx + dy * dy; };
  const BAR = 19;   // .winbar height — the window chrome's title bar

  // Match an image/video window to its media's ORIGINAL orientation, snapping to one of three
  // predominant shapes: horizontal, vertical or square (body sized from the node's base unit
  // n.u; the title bar adds BAR on top). Runs once the media's real dimensions are known.
  function applyShape(n, natW, natH) {
    if (!n || !natW || !natH) return;
    const u = n.u, ratio = natW / natH;
    let bw, bh;
    if (ratio >= 1.18) { bw = u; bh = Math.round(u * 0.62); }          // horizontal
    else if (ratio <= 0.85) { bw = Math.round(u * 0.62); bh = u; }     // vertical
    else { bw = Math.round(u * 0.82); bh = Math.round(u * 0.82); }     // square
    n.w = bw; n.h = bh + BAR; n.r = Math.max(n.w, n.h) / 2;
    if (n.el) { n.el.style.width = n.w + 'px'; n.el.style.height = n.h + 'px'; }
  }

  /* ---------- build nodes from the live canvas data ---------- */
  function makeNode(it, g, s) {
    const isText = it.type === 'text';
    const u = 92 + ((Math.random() * 46) | 0);          // media "long side" base unit (variety)
    // placeholder size: text → roomy card; image/video → square until its real orientation loads
    const w = isText ? 124 + ((Math.random() * 48) | 0) : Math.round(u * 0.82);
    const h = isText ? 96 + ((Math.random() * 46) | 0) : Math.round(u * 0.82) + BAR;

    const color = slideColor(s && s.colorKey, s && s.shadeStep);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'idx-node';
    if (g) el.dataset.group = g;
    el.style.setProperty('--gc', color);
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    // same "web window" chrome as the Act-3 canvas: title bar + body
    const win = document.createElement('div');
    win.className = 'win';
    const title = (isText ? (s && s.name ? s.name : (it.name || 'README.TXT')) : (it.name || it.type)).toUpperCase();
    const bar = document.createElement('div');
    bar.className = 'winbar';
    const grpChip = (s && s.gnum) ? `<span class="wb-grp">G${s.gnum}</span>` : '';
    bar.innerHTML = `<span class="wb-dot"></span>${grpChip}<span class="wb-title">${esc(title)}</span><span class="wb-btns"><i>_</i><i>&#9633;</i><i class="wb-x">&#10005;</i></span>`;
    const body = document.createElement('div');
    body.className = 'winbody';

    let media = null;
    if (isText) {
      const tc = document.createElement('div');
      tc.className = 'textcard';
      const inner = document.createElement('div');
      inner.className = 'textscroll';
      inner.textContent = it.text || '';
      tc.appendChild(inner);
      body.appendChild(tc);
    } else if (it.type === 'video') {
      const v = document.createElement('video');
      v.src = it.src; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      body.appendChild(v);
      media = v;
    } else {
      // carousel → show its first frame (the index is just a map; navigation lives in Act 3)
      const src = it.type === 'carousel' ? (it.frames && it.frames[0] && it.frames[0].src) : it.src;
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => { el.classList.add('idx-broken'); });
      body.appendChild(img);
      media = img;
      if (it.type === 'carousel' && it.frames) {
        const t = document.createElement('span'); t.className = 'gif-tag'; t.textContent = '❏ ' + it.frames.length; body.appendChild(t);
      }
    }
    win.appendChild(bar); win.appendChild(body); el.appendChild(win);

    el.title = (s && s.name ? s.name : '') + (s && s.group ? '  ·  GROUP ' + s.group : '');
    el.addEventListener('pointerenter', () => highlight(g));
    el.addEventListener('pointerleave', () => highlight(null));
    el.addEventListener('focus', () => highlight(g));
    el.addEventListener('blur', () => highlight(null));
    el.addEventListener('click', () => pick(g));
    layer.appendChild(el);

    const n = { el, group: g, color, u, w, h, r: Math.max(w, h) / 2, bx: 0, by: 0, fx: 0, fy: 0, ph: Math.random() * Math.PI * 2, amp: 2 + Math.random() * 3, sp: 0.25 + Math.random() * 0.35 };

    // give each image/video window its media's ORIGINAL orientation once dimensions are known
    if (media && it.type === 'video') {
      media.addEventListener('loadedmetadata', () => applyShape(n, media.videoWidth, media.videoHeight));
    } else if (media) {
      media.addEventListener('load', () => applyShape(n, media.naturalWidth, media.naturalHeight));
      if (media.complete && media.naturalWidth) applyShape(n, media.naturalWidth, media.naturalHeight);
    }
    return n;
  }

  function build() {
    if (built) return;
    measure();
    const slides = (window.Canvas && Canvas.slides && Canvas.slides()) || [];
    const groups = new Map();         // g -> [node]
    slides.forEach((s) => {
      (s.items || []).forEach((it) => {
        const g = s.group || 0;
        const nd = makeNode(it, g, s);
        nodes.push(nd);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(nd);
      });
    });
    layout();
    wireEdges();
    buildLegend(groups, slides);
    built = true;
  }

  /* ---------- force-directed layout: ONE chaotic blob, groups intermixed ----------
     No per-group cohesion — every node simply repels its neighbours and is pulled to the
     centre, so the groups scramble together. (Group identity lives on the node, not on its
     position, so hover-isolation still works perfectly.) */
  function layout() {
    const cx = W / 2, cy = H / 2;
    const spread = Math.min(W, H) * 0.34;
    nodes.forEach((n) => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * spread;
      n.bx = cx + Math.cos(a) * rr;
      n.by = cy + Math.sin(a) * rr;
    });

    const area = Math.min(W, H);
    const K = area * 0.05;                          // ideal node spacing
    for (let iter = 0; iter < 360; iter++) {
      const cool = 1 - iter / 360;
      const cap = area * 0.03 * cool + 0.6;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        let fx = 0, fy = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j];
          let dx = a.bx - b.bx, dy = a.by - b.by;
          let d2 = dx * dx + dy * dy || 0.01;
          const d = Math.sqrt(d2);
          let f = (K * K) / d2;                     // repulsion
          const minD = a.r + b.r + 8;               // hard separation (windows mostly clear)
          if (d < minD) f += (minD - d) * 0.9;
          fx += (dx / d) * f; fy += (dy / d) * f;
        }
        fx += (cx - a.bx) * 0.013; fy += (cy - a.by) * 0.013;     // centring → one organism
        a._vx = fx; a._vy = fy;
      }
      nodes.forEach((n) => {
        const m = Math.hypot(n._vx, n._vy) || 1;
        const s = Math.min(1, cap / m);
        n.bx += n._vx * s; n.by += n._vy * s;
      });
    }
    // keep inside the field (leave room for HUD/nav)
    nodes.forEach((n) => {
      n.bx = Math.max(n.w / 2 + 12, Math.min(W - n.w / 2 - 12, n.bx));
      n.by = Math.max(n.h / 2 + 44, Math.min(H - n.h / 2 - 12, n.by));
      n.fx = n.bx; n.fy = n.by;
    });
  }

  /* ---------- edges: a chaotic web that ignores group boundaries ----------
     Each node links to its nearest neighbours regardless of group (so groups tangle
     together), plus a few random long links. On hover only the edges fully inside the
     hovered group stay lit (see highlight); every cross-group edge dims. */
  function wireEdges() {
    const seen = new Set();
    const key = (a, b) => { const ia = nodes.indexOf(a), ib = nodes.indexOf(b); return ia < ib ? ia + '-' + ib : ib + '-' + ia; };
    const add = (a, b) => {
      const k = key(a, b);
      if (seen.has(k) || a === b) return;
      seen.add(k);
      const line = document.createElementNS(SVGNS, 'line');
      const cross = a.group !== b.group;
      line.setAttribute('class', 'idx-edge' + (cross ? ' cross' : ''));
      // intra-group links take the group's colour; cross-group links stay neutral grey
      if (!cross) line.style.stroke = a.color;
      svg.appendChild(line);
      edges.push({ line, a, b });
    };
    // nearest neighbours, any group → tangled web
    nodes.forEach((a) => {
      nodes.filter((b) => b !== a).sort((p, q) => dist2(a, p) - dist2(a, q)).slice(0, 3)
        .forEach((b) => add(a, b));
    });
    // a few random long links for extra chaos
    const extra = Math.floor(nodes.length / 2);
    for (let k = 0; k < extra; k++) add(nodes[(Math.random() * nodes.length) | 0], nodes[(Math.random() * nodes.length) | 0]);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
  }

  /* ---------- legend (also hoverable / clickable) ---------- */
  function buildLegend(groups, slides) {
    if (!legend) return;
    legend.innerHTML = '';
    const nameOf = (g) => {
      const first = slides.find((s) => (s.group || 0) === g);
      if (!g) return 'UNGROUPED';
      return first && first.mega ? `M${first.mega} · CH ${first.chapter}` : 'GROUP ' + String(g).padStart(2, '0');
    };
    [...groups.keys()].forEach((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'idx-leg';
      if (g) b.dataset.group = g;
      b.style.setProperty('--gc', (groups.get(g)[0] && groups.get(g)[0].color) || '#9aa3bd');
      b.innerHTML = `<i></i><span>${nameOf(g)}</span><em>${groups.get(g).length}</em>`;
      b.addEventListener('pointerenter', () => highlight(g));
      b.addEventListener('pointerleave', () => highlight(null));
      b.addEventListener('click', () => pick(g));
      legend.appendChild(b);
    });
  }

  /* ---------- interaction ---------- */
  // Isolate a group: dim every other group's nodes + edges, lift the chosen group.
  // Toggling classes directly keeps this scalable to any number of groups (no CSS enum).
  function applyHighlight(g) {
    const on = g != null;
    host.classList.toggle('isolating', on);
    for (const n of nodes) {
      const match = on && n.group === g;
      n.el.classList.toggle('dim', on && !match);
      n.el.classList.toggle('lit', match);
    }
    for (const e of edges) {
      const keep = on && e.a.group === g && e.b.group === g;
      e.line.classList.toggle('dim', on && !keep);
    }
    if (legend) legend.querySelectorAll('.idx-leg').forEach((b) => {
      b.classList.toggle('active', on && Number(b.dataset.group || 0) === g);
    });
  }

  // Hover changes apply immediately; the smooth 3s fade (see .idx-node / .idx-edge transitions)
  // does all the easing — groups dim out and the hovered one lifts in softly, with no lock,
  // regardless of which one was on before.
  function highlight(g) { applyHighlight(g == null ? null : g); }
  function resetHighlight() { applyHighlight(null); }
  function pick(g) {
    resetHighlight();
    if (window.Present && Present.pickGroup) Present.pickGroup(g);
  }

  /* ---------- viewport: wheel-zoom + Rhino-style pan (right / middle drag) ---------- */
  function applyView() {
    const t = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    layer.style.transform = t;
    svg.style.transform = t;
  }
  function resetView() { view.x = 0; view.y = 0; view.s = 1; applyView(); }
  function setupControls() {
    if (controlsWired) return;
    controlsWired = true;

    // wheel → zoom toward the cursor
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const ns = Math.max(0.3, Math.min(4.5, view.s * factor));
      view.x = mx - ((mx - view.x) / view.s) * ns;
      view.y = my - ((my - view.y) / view.s) * ns;
      view.s = ns;
      applyView();
    }, { passive: false });

    // right OR middle button drag → pan (like Rhino's parallel-view pan)
    let panning = false, sx = 0, sy = 0, px = 0, py = 0;
    host.addEventListener('pointerdown', (e) => {
      if (e.button !== 2 && e.button !== 1) return;
      panning = true; sx = e.clientX; sy = e.clientY; px = view.x; py = view.y;
      host.classList.add('panning');
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    host.addEventListener('pointermove', (e) => {
      if (!panning) return;
      view.x = px + (e.clientX - sx); view.y = py + (e.clientY - sy);
      applyView();
    });
    const endPan = (e) => {
      if (!panning) return;
      panning = false; host.classList.remove('panning');
      try { host.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    host.addEventListener('pointerup', endPan);
    host.addEventListener('pointercancel', endPan);
    host.addEventListener('contextmenu', (e) => e.preventDefault());  // let right-drag pan freely
  }

  /* ---------- gentle float ---------- */
  function tick(ts) {
    if (!t0) t0 = ts;
    const t = (ts - t0) / 1000;
    for (const n of nodes) {
      n.fx = n.bx + Math.sin(t * n.sp + n.ph) * n.amp;
      n.fy = n.by + Math.cos(t * n.sp * 0.9 + n.ph * 1.3) * n.amp;
      n.el.style.transform = `translate(${n.fx}px, ${n.fy}px) translate(-50%, -50%)`;
    }
    for (const e of edges) {
      e.line.setAttribute('x1', e.a.fx); e.line.setAttribute('y1', e.a.fy);
      e.line.setAttribute('x2', e.b.fx); e.line.setAttribute('y2', e.b.fy);
    }
    if (running) raf = requestAnimationFrame(tick);
  }

  /* ---------- resize: rescale base positions into the new field ---------- */
  let rsz;
  window.addEventListener('resize', () => {
    if (!built || !running) return;
    clearTimeout(rsz);
    rsz = setTimeout(() => {
      const ow = W, oh = H; measure();
      const sx = W / (ow || W), sy = H / (oh || H);
      nodes.forEach((n) => { n.bx *= sx; n.by *= sy; });
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    }, 160);
  });

  /* ---------- public API (driven by state.js) ---------- */
  window.IndexGraph = {
    show() {
      build();
      setupControls();
      resetView();
      host.classList.add('show');
      host.setAttribute('aria-hidden', 'false');
      resetHighlight();
      if (!running) { running = true; t0 = 0; raf = requestAnimationFrame(tick); }
    },
    hide() {
      host.classList.remove('show');
      host.setAttribute('aria-hidden', 'true');
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };
})();
