/* flood.js — boot animation. On first load, clones of the SAME canvas windows
   open in front as diagonal "snakes". As each one zooms open it DRAGS a real
   canvas window underneath it and hides it — a "worm of open windows" that
   swallows the canvas. Many open, then it stops. Cleared when the box opens. */
(function () {
  const host = document.getElementById('flood');
  const world = document.getElementById('world');
  if (!host || !world) return;

  let templates = [];
  let pool = [];           // real canvas .item elements still to be swallowed
  let z = 1;
  let made = 0;
  const MAX = 70;
  let stopped = false;

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function collect() {
    const items = [...world.querySelectorAll('.item')];
    templates = items.map((it) => {
      const win = it.querySelector('.win');
      if (!win) return null;
      return { html: win.outerHTML, w: parseInt(it.style.width) || 240, h: parseInt(it.style.height) || 180 };
    }).filter(Boolean);
    pool = shuffle(items.slice());
    return templates.length;
  }

  // drag a real canvas window to (x,y) and hide it behind the flood clone
  function swallow(x, y, w, h) {
    if (!pool.length) return;
    const it = pool.shift();
    it.style.transition = 'transform .8s var(--ease), opacity .8s var(--ease)';
    it.style.zIndex = '3';
    it.style.transform = `translate(${(x + w / 2) | 0}px, ${(y + h / 2) | 0}px) translate(-50%, -50%) scale(.82)`;
  }

  function spawnOne(tpl, x, y) {
    const w = document.createElement('div');
    w.className = 'floatwin';
    w.style.cssText = `left:${x | 0}px;top:${y | 0}px;width:${tpl.w}px;height:${tpl.h}px;z-index:${z++};`;
    w.innerHTML = tpl.html;
    host.appendChild(w);
    made++;
    swallow(x, y, tpl.w, tpl.h);   // pull a canvas window under this one
  }

  function snake() {
    if (stopped || made >= MAX) return;
    const tpl = templates[(Math.random() * templates.length) | 0];
    const len = 5 + (Math.random() * 9 | 0);
    const dx = (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 14);
    const dy = 14 + Math.random() * 16;
    const x0 = 20 + Math.random() * Math.max(1, innerWidth - tpl.w - 40);
    const y0 = 20 + Math.random() * Math.max(1, innerHeight * 0.42);
    let i = 0;
    (function step() {
      if (stopped || made >= MAX || i >= len) { setTimeout(snake, 110 + Math.random() * 200); return; }
      spawnOne(tpl, x0 + dx * i, y0 + dy * i);
      i++;
      setTimeout(step, 42 + Math.random() * 40);
    })();
  }

  // Pre-collect the window templates (cheap, no animation) but DO NOT start the
  // boot flood yet — it must stay silent during Act 1 (the calm intro splash).
  let tries = 0;
  (function waitForCanvas() {
    if (collect() > 0) return;
    if (tries++ < 80) setTimeout(waitForCanvas, 150);
  })();

  let started = false;
  function start() {
    if (started || stopped) return;
    started = true;
    if (!templates.length) collect();
    setTimeout(snake, 60);
  }
  function clear() { stopped = true; host.classList.add('gone'); }

  // The boot "window flood" is DISABLED: Act 3 now opens each group with a clean zoom-in
  // entrance (canvas.js scatterZoomView), so the field must stay completely white — no
  // flooding clones in the background. Kept here (start/clear above) only as dead code in
  // case we ever want the effect back; nothing triggers it now.
  void start; void clear;
})();
