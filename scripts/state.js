/* state.js — the narrative state machine.
   step model:  0 intro | 1 messy | 2..N+1 focus folder | N+2 rationalized | N+3 chat
   It also turns the --clean dial up a notch on every advance, so the whole UI
   quietly de-glitches from chaos (act 1) to order (act 4). */
(function () {
  const body = document.body;
  const openBtn = document.getElementById('openBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const actLabel = document.getElementById('actLabel');
  const folderLabel = document.getElementById('folderLabel');
  const progress = document.getElementById('progress');
  const introWin = document.getElementById('introWin');
  const scrim = document.getElementById('scrim');
  const actCanvas = document.getElementById('act-canvas');
  const chatModal = document.getElementById('chatModal');
  const chatClose = document.getElementById('chatClose');
  const rationalize = document.getElementById('rationalize');

  let N = 0;
  let step = 0;
  let total = 0;

  function recompute() { N = Canvas.count(); total = N + 3; }

  function phase(s) {
    if (s === 0) return { act: 1, name: 'THE BOX' };
    if (s === 1) return { act: 2, name: 'THE MESSY CANVAS' };
    if (s >= 2 && s <= N + 1) return { act: 2, name: 'RATIONALIZING' };
    if (s === N + 2) return { act: 3, name: 'RATIONALIZED' };
    return { act: 4, name: 'THE RATIONALIZER' };
  }

  function setClean() {
    const c = total > 0 ? step / total : 0;
    body.style.setProperty('--clean', c.toFixed(3));
  }

  function buildProgress() {
    progress.innerHTML = '';
    for (let i = 0; i <= total; i++) {
      const d = document.createElement('span');
      d.className = 'pdot';
      progress.appendChild(d);
    }
  }
  function paintProgress() {
    Array.from(progress.children).forEach((d, i) => {
      d.classList.toggle('done', i < step);
      d.classList.toggle('active', i === step);
    });
  }

  function apply() {
    const p = phase(step);
    body.dataset.step = String(step);
    body.dataset.act = String(p.act);
    actLabel.textContent = `ACT ${p.act} / 4 · ${p.name}`;
    setClean();

    introWin.classList.toggle('hidden', step !== 0);

    // white blurred backdrop behind the intro popup and the focus/zoom (white acts only;
    // never on the black rationalization/chat acts)
    if (scrim) scrim.classList.toggle('show', step === 0 || (step >= 2 && step <= N + 1) || step === N + 3);

    if (step <= 1) {
      Canvas.scatterView();
      folderLabel.textContent = step === 0 ? 'SYS://READY' : `RAW // ${N} FOLDER${N === 1 ? '' : 'S'}`;
    } else if (step >= 2 && step <= N + 1) {
      const fo = step - 2;
      Canvas.focusView(fo);
      const s = Canvas.slides()[fo];
      const idx = s ? String(s.index).padStart(2, '0') : '--';
      folderLabel.textContent = `FOLDER ${idx} / ${N}`;
    } else if (step === N + 2) {
      Canvas.gridView();
      folderLabel.textContent = 'ORDER // COMPLETE';
    } else {
      Canvas.gridView();
      folderLabel.textContent = 'AWAITING_INPUT';
    }

    rationalize.classList.toggle('show', step === N + 2);
    rationalize.setAttribute('aria-hidden', step === N + 2 ? 'false' : 'true');

    const chatOpen = step === N + 3;
    if (chatModal) {
      chatModal.classList.toggle('show', chatOpen);
      chatModal.setAttribute('aria-hidden', chatOpen ? 'false' : 'true');
    }
    if (chatOpen && window.Chat) { Chat.init(); Chat.focusInput(); }

    prevBtn.disabled = step === 0;
    nextBtn.disabled = step >= total;
    nextBtn.textContent =
      step >= total ? 'END'
        : step === N + 1 ? 'RATIONALIZE ▸'
          : step === N + 2 ? 'ASK ▸'
            : 'NEXT ▸';

    paintProgress();
    if (window.Glitch && Glitch.burst) Glitch.burst();
  }

  function go(s) { step = Math.max(0, Math.min(total, s)); apply(); }
  function next() { if (step < total) go(step + 1); }
  function prev() { if (step > 0) go(step - 1); }

  if (openBtn) openBtn.addEventListener('click', next);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  if (chatClose) chatClose.addEventListener('click', prev);

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  });

  let rsz;
  window.addEventListener('resize', () => {
    clearTimeout(rsz);
    rsz = setTimeout(() => { if (step >= 1) apply(); }, 180);
  });

  function boot() {
    Canvas.load().then(() => {
      recompute();
      buildProgress();
      document.querySelectorAll('.display').forEach((el) => {
        if (window.Glitch && Glitch.scramble) Glitch.scramble(el, 850);
      });
      apply();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
