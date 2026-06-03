/* state.js — the narrative state machine (5 acts), driven by an explicit SEQUENCE.
   After the index, the run walks the groups in order: each group enters its own messy
   canvas with a zoom-in (only that group's assets on screen), then steps through its
   folders; once every group has played, ALL items assemble into one ordered grid
   (by group + slide, coloured per group) where the final phrase appears; then the chat.

   Sequence of stops:  intro · index · [ per group: messy, focus×K ] · grid(all) · chat
   The --clean dial rises every advance, de-glitching toward calm. */
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

  let seq = [];        // ordered list of stops (see buildSequence)
  let step = 0;
  let total = 0;
  let N = 0;

  function foldersOfGroup(g) {
    const out = [];
    Canvas.slides().forEach((s, fi) => { if ((s.group || 0) === g) out.push(fi); });
    return out;          // global folder indices, in narrative order
  }

  // Build the full stop list once the canvas data is known.
  function buildSequence() {
    N = Canvas.count();
    seq = [];
    seq.push({ act: 1, name: 'THE BOX', kind: 'intro' });
    seq.push({ act: 2, name: 'THE INDEX', kind: 'index' });
    Canvas.groupsPresent().forEach((g) => {
      const folders = foldersOfGroup(g);
      if (!folders.length) return;
      seq.push({ act: 3, name: 'THE MESSY CANVAS', kind: 'messy', group: g, count: folders.length });
      folders.forEach((fi, li) => {
        seq.push({ act: 3, name: 'RATIONALIZING', kind: 'focus', group: g, localIdx: li, folder: fi, count: folders.length });
      });
    });
    seq.push({ act: 4, name: 'RATIONALIZED', kind: 'grid' });     // all groups, one ordered grid + the punch line
    seq.push({ act: 5, name: 'THE RATIONALIZER', kind: 'chat' });
    total = seq.length - 1;
  }

  function setClean() {
    body.style.setProperty('--clean', (total > 0 ? step / total : 0).toFixed(3));
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

  function apply(forward) {
    const p = seq[step];
    body.dataset.step = String(step);
    body.dataset.act = String(p.act);
    actLabel.textContent = `ACT ${p.act} / 5 · ${p.name}`;
    setClean();

    introWin.classList.toggle('hidden', p.kind !== 'intro');
    if (window.IndexGraph) { if (p.kind === 'index') IndexGraph.show(); else IndexGraph.hide(); }
    // the group-coloured canvas graph shows on the messy / focus / final-grid stops
    if (Canvas.edges) Canvas.edges(p.kind === 'messy' || p.kind === 'focus' || p.kind === 'grid');

    // the blurred backdrop only behind the intro splash, the zoomed focus hero, and the chat
    if (scrim) scrim.classList.toggle('show', p.kind === 'intro' || p.kind === 'focus' || p.kind === 'chat');

    if (p.kind === 'intro') {
      Canvas.setScope(null); Canvas.scatterView();
      folderLabel.textContent = 'SYS://READY';
    } else if (p.kind === 'index') {
      Canvas.setScope(null);
      folderLabel.textContent = `INDEX // ${N} SLIDE${N === 1 ? '' : 'S'}`;
    } else if (p.kind === 'messy') {
      Canvas.setScope(p.group);
      if (forward) Canvas.scatterZoomView(); else Canvas.scatterView();   // zoom-in entrance going forward
      folderLabel.textContent = `GROUP ${String(p.group).padStart(2, '0')} // ${p.count} SLIDE${p.count === 1 ? '' : 'S'}`;
    } else if (p.kind === 'focus') {
      Canvas.setScope(p.group);
      Canvas.focusView(p.localIdx);
      const s = Canvas.slides()[p.folder];
      const idx = s ? String(s.index).padStart(2, '0') : '--';
      folderLabel.textContent = `G${p.group}·${idx} / ${p.count}`;
    } else if (p.kind === 'grid') {
      Canvas.setScope(null); Canvas.gridView();      // ALL groups assemble, ordered + coloured
      folderLabel.textContent = 'ORDER // COMPLETE';
    } else {
      Canvas.setScope(null); Canvas.gridView();
      folderLabel.textContent = 'AWAITING_INPUT';
    }

    rationalize.classList.toggle('show', p.kind === 'grid');
    rationalize.setAttribute('aria-hidden', p.kind === 'grid' ? 'false' : 'true');

    const chatOpen = p.kind === 'chat';
    if (chatModal) {
      chatModal.classList.toggle('show', chatOpen);
      chatModal.setAttribute('aria-hidden', chatOpen ? 'false' : 'true');
    }
    if (chatOpen && window.Chat) { Chat.init(); Chat.focusInput(); }

    prevBtn.disabled = step === 0;
    nextBtn.disabled = step >= total;
    const nextStop = seq[step + 1];
    nextBtn.textContent =
      step >= total ? 'END'
        : p.kind === 'index' ? 'ENTER ▸'
          : (nextStop && nextStop.kind === 'grid') ? 'RATIONALIZE ▸'
            : p.kind === 'grid' ? 'ASK ▸'
              : 'NEXT ▸';

    paintProgress();
    if (window.Glitch && Glitch.burst) Glitch.burst();
  }

  function go(s) {
    s = Math.max(0, Math.min(total, s));
    const forward = s > step;
    step = s;
    apply(forward);
  }
  function next() { if (step < total) go(step + 1); }
  function prev() { if (step > 0) go(step - 1); }

  // From the index graph: jump straight to a chosen group's messy canvas (then its run).
  function pickGroup(g) {
    const idx = seq.findIndex((p) => p.kind === 'messy' && p.group === Number(g));
    if (idx >= 0) go(idx);
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
    rsz = setTimeout(() => { if (seq[step] && seq[step].kind !== 'intro' && seq[step].kind !== 'index') apply(false); }, 180);
  });

  function boot() {
    Canvas.load().then(() => {
      buildSequence();
      buildProgress();
      document.querySelectorAll('.display').forEach((el) => {
        if (window.Glitch && Glitch.scramble) Glitch.scramble(el, 850);
      });
      apply(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
