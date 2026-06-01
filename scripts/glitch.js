/* glitch.js — custom glitched cursor, transition bursts, text-scramble.
   Effect intensity is driven by the body --clean dial (chaos = 1 - clean). */
(function () {
  const cursor = document.getElementById('cursor');
  const curs = cursor ? Array.from(cursor.querySelectorAll('.cur')) : [];
  const tag = document.getElementById('cursorTag');
  const burstEl = document.querySelector('.fx-glitchburst');

  let mx = innerWidth / 2;
  let my = innerHeight / 2;
  const lag = curs.map((_, i) => ({ x: mx, y: my, k: 0.55 - i * 0.12 }));

  function chaos() {
    const c = parseFloat(getComputedStyle(document.body).getPropertyValue('--clean')) || 0;
    return Math.max(0, Math.min(1, 1 - c));
  }

  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    if (!cursor) return;
    const item = e.target.closest('.item');
    const hot = e.target.closest('.btn, .item, .sugg, input, .wb-btns, .pdot');
    cursor.classList.toggle('hot', !!hot);
    if (tag) tag.textContent = item ? 'GRAB' : hot ? 'EXEC' : 'RATIONALIZE';
  });

  function frame() {
    const ch = chaos();
    if (cursor) cursor.style.transform = `translate(${mx}px, ${my}px)`;
    curs.forEach((el, i) => {
      const L = lag[i];
      L.x += (mx - L.x) * L.k;
      L.y += (my - L.y) * L.k;
      let dx = L.x - mx;
      let dy = L.y - my;
      if (Math.random() < 0.16 * ch) {
        dx += (Math.random() - 0.5) * 26 * ch;
        dy += (Math.random() - 0.5) * 26 * ch;
      }
      el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    requestAnimationFrame(frame);
  }
  if (cursor) requestAnimationFrame(frame);

  function burst() {
    if (!burstEl) return;
    burstEl.classList.remove('on');
    void burstEl.offsetWidth;
    burstEl.classList.add('on');
    setTimeout(() => burstEl.classList.remove('on'), 460);
  }

  const POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/<>*_';
  function scramble(el, dur = 700) {
    if (!el) return;
    const final = el.dataset.text || el.textContent;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const reveal = Math.floor(p * final.length);
      let s = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        s += (i < reveal || ch === ' ' || ch === ' ') ? ch : POOL[(Math.random() * POOL.length) | 0];
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    }
    requestAnimationFrame(step);
  }

  window.addEventListener('blur', () => { if (cursor) cursor.style.opacity = '0'; });
  window.addEventListener('focus', () => { if (cursor) cursor.style.opacity = '1'; });

  window.Glitch = { burst, scramble, chaos };
})();
