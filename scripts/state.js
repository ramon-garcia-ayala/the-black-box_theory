/* state.js — the narrative state machine (5 acts).
   step model (M = folders in the current scope; M == N for the full run):
     0 intro | 1 INDEX | 2 messy | 3..2+M focus | 3+M rationalized | 4+M chat
   Act 2 is the INDEX graph: pressing NEXT there runs ALL groups; clicking a group node
   (Present.pickGroup) scopes the run to that one group, which shrinks M.
   It also turns the --clean dial up a notch on every advance, de-glitching toward calm. */
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
  const chatModal = document.getElementById('chatModal');
  const chatClose = document.getElementById('chatClose');
  const rationalize = document.getElementById('rationalize');

  let N = 0;          // total folders
  let M = 0;          // folders in current scope (group pick) — equals N for the full run
  let step = 0;
  let total = 0;
  let selectedGroup = null;

  function recompute() {
    N = Canvas.count();
    M = Canvas.scopeFolderCount();
    total = M + 4;
  }

  function phase(s) {
    if (s === 0) return { act: 1, name: 'THE BOX' };
    if (s === 1) return { act: 2, name: 'THE INDEX' };
    if (s === 2) return { act: 3, name: 'THE MESSY CANVAS' };
    if (s >= 3 && s <= M + 2) return { act: 3, name: 'RATIONALIZING' };
    if (s === M + 3) return { act: 4, name: 'RATIONALIZED' };
    return { act: 5, name: 'THE RATIONALIZER' };
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
    actLabel.textContent = `ACT ${p.act} / 5 · ${p.name}`;
    setClean();

    introWin.classList.toggle('hidden', step !== 0);

    // ACT 2 — the index graph (its own opaque white overlay)
    if (window.IndexGraph) { if (step === 1) IndexGraph.show(); else IndexGraph.hide(); }

    // white blurred backdrop behind the intro popup, the focus/zoom, and the chat
    // (never on the index — it has its own field — nor on the messy/rationalized acts)
    if (scrim) scrim.classList.toggle('show', step === 0 || (step >= 3 && step <= M + 2) || step === M + 4);

    if (step <= 2) {
      Canvas.scatterView();
      if (step === 0) folderLabel.textContent = 'SYS://READY';
      else if (step === 1) folderLabel.textContent = `INDEX // ${N} SLIDE${N === 1 ? '' : 'S'}`;
      else folderLabel.textContent = selectedGroup
        ? `GROUP ${String(selectedGroup).padStart(2, '0')} // ${M} SLIDE${M === 1 ? '' : 'S'}`
        : `RAW // ${N} FOLDER${N === 1 ? '' : 'S'}`;
    } else if (step >= 3 && step <= M + 2) {
      const localIdx = step - 3;
      Canvas.focusView(localIdx);
      const s = Canvas.scopeSlides()[localIdx];
      const idx = s ? String(s.index).padStart(2, '0') : '--';
      const tag = selectedGroup ? `G${selectedGroup}·${idx}` : idx;
      folderLabel.textContent = `FOLDER ${tag} / ${M}`;
    } else if (step === M + 3) {
      Canvas.gridView();
      folderLabel.textContent = 'ORDER // COMPLETE';
    } else {
      Canvas.gridView();
      folderLabel.textContent = 'AWAITING_INPUT';
    }

    rationalize.classList.toggle('show', step === M + 3);
    rationalize.setAttribute('aria-hidden', step === M + 3 ? 'false' : 'true');

    const chatOpen = step === M + 4;
    if (chatModal) {
      chatModal.classList.toggle('show', chatOpen);
      chatModal.setAttribute('aria-hidden', chatOpen ? 'false' : 'true');
    }
    if (chatOpen && window.Chat) { Chat.init(); Chat.focusInput(); }

    prevBtn.disabled = step === 0;
    nextBtn.disabled = step >= total;
    nextBtn.textContent =
      step >= total ? 'END'
        : step === 1 ? 'ALL GROUPS ▸'
          : step === M + 2 ? 'RATIONALIZE ▸'
            : step === M + 3 ? 'ASK ▸'
              : 'NEXT ▸';

    paintProgress();
    if (window.Glitch && Glitch.burst) Glitch.burst();
  }

  // Stepping back to the intro/index clears any group scope so the full set returns.
  function clearScopeIfBackToTop(s) {
    if (s <= 1 && selectedGroup != null) {
      selectedGroup = null;
      Canvas.setScope(null);
      recompute();
      buildProgress();
    }
  }

  function go(s) {
    s = Math.max(0, Math.min(total, s));
    clearScopeIfBackToTop(s);
    step = Math.max(0, Math.min(total, s));
    apply();
  }
  function next() { if (step < total) go(step + 1); }
  function prev() { if (step > 0) go(step - 1); }

  // Called from the index graph: scope the whole run to one group and dive straight in.
  function pickGroup(g) {
    selectedGroup = (g == null ? null : Number(g));
    Canvas.setScope(selectedGroup);
    recompute();
    buildProgress();
    step = 2;            // straight into that group's messy canvas
    apply();
  }
  window.Present = { pickGroup, next, prev };

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
    rsz = setTimeout(() => { if (step >= 2) apply(); }, 180);
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
