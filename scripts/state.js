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
  const teamWin = document.getElementById('teamWin');
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
    seq.push({ act: 1, name: 'THE TEAM', kind: 'team' });
    seq.push({ act: 2, name: 'THE INDEX', kind: 'index' });
    Canvas.groupsPresent().forEach((g) => {
      const folders = foldersOfGroup(g);
      if (!folders.length) return;
      const s0 = Canvas.slides()[folders[0]] || {};
      const meta = { mega: s0.mega || 0, chapter: s0.chapter || 0, gnum: s0.gnum || 0, colorKey: s0.colorKey || 0, shadeStep: s0.shadeStep || 0 };
      seq.push({ act: 3, name: 'THE MESSY CANVAS', kind: 'messy', group: g, count: folders.length, ...meta });
      folders.forEach((fi, li) => {
        seq.push({ act: 3, name: 'RATIONALIZING', kind: 'focus', group: g, localIdx: li, folder: fi, count: folders.length, ...meta });
      });
    });
    // Act 4 is two stops: first ALL items assemble into the ordered grid (no phrase yet),
    // then a second NEXT lets the punch line emerge over that same grid.
    seq.push({ act: 4, name: 'RATIONALIZED', kind: 'grid' });
    seq.push({ act: 4, name: 'RATIONALIZED', kind: 'gridlog' });
    seq.push({ act: 5, name: 'THE RATIONALIZER', kind: 'chat' });
    total = seq.length - 1;
  }

  function setClean() {
    body.style.setProperty('--clean', (total > 0 ? step / total : 0).toFixed(3));
  }

  let pdots = [];

  // A readable tooltip for each stop — so the bar doubles as a clickable table of contents.
  function stopLabel(p) {
    const grp = p.gnum || p.group;
    switch (p.kind) {
      case 'intro': return 'Act 1 · The Box';
      case 'team': return 'Act 1 · The Team';
      case 'index': return 'Act 2 · The Index';
      case 'messy': return (p.mega ? `Mega ${p.mega} · ` : '') + `Group ${grp} — start`;
      case 'focus': {
        const s = Canvas.slides()[p.folder];
        const idx = s ? String(s.index).padStart(2, '0') : '';
        return (p.mega ? `M${p.mega}·` : '') + `G${grp} · slide ${idx}`;
      }
      case 'grid': return 'Act 4 · Rationalized grid';
      case 'gridlog': return 'Act 4 · The line';
      case 'chat': return 'Act 5 · The Rationalizer';
      default: return p.name || '';
    }
  }

  // Rebuild the bar from the live sequence: one clickable dot per stop, coloured/shaped by what
  // it is. Content dots (messy/focus) take their group's mega-hue + chapter-shade; a group entry
  // is a taller tick; a new mega-group is set apart by a gap. Grows/recolours automatically as
  // mega-groups, groups or slides are added.
  function buildProgress() {
    progress.innerHTML = '';
    const track = document.createElement('div');
    track.className = 'progress-track';
    pdots = [];
    let prevMega = null;
    seq.forEach((p, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'pdot k-' + p.kind;
      const isContent = p.kind === 'messy' || p.kind === 'focus';
      if (isContent && p.colorKey && Canvas.color) d.style.setProperty('--dc', Canvas.color(p.colorKey, p.shadeStep || 0));
      if (p.kind === 'messy') d.classList.add('group-start');
      const mega = p.mega || 0;
      if (isContent && mega && mega !== prevMega) d.classList.add('mega-start');   // super-chapter boundary
      prevMega = isContent ? mega : null;
      d.title = stopLabel(p);
      d.setAttribute('aria-label', d.title);
      d.addEventListener('click', () => go(i));
      track.appendChild(d);
      pdots.push(d);
    });
    progress.appendChild(track);
  }
  function paintProgress() {
    pdots.forEach((d, i) => {
      d.classList.toggle('done', i < step);
      d.classList.toggle('active', i === step);
    });
    // keep the active dot centred in the compact strip (scroll only the bar, not the page)
    const a = pdots[step];
    if (a) {
      const ar = a.getBoundingClientRect(), cr = progress.getBoundingClientRect();
      const delta = (ar.left + ar.width / 2) - (cr.left + cr.width / 2);
      if (Math.abs(delta) > 1) progress.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }

  function apply(forward) {
    const p = seq[step];
    body.dataset.step = String(step);
    body.dataset.act = String(p.act);
    actLabel.textContent = `ACT ${p.act} / 5 · ${p.name}`;
    setClean();

    // subtle super-chapter cue: a thin top band in the current MEGA-group's base hue, shown
    // only while walking that mega-group's chapters (Act 3 messy/focus). Constant across a
    // mega-group's chapters (uses shadeStep 0 = base hue) so it reads as one super-chapter.
    const onMega = (p.kind === 'messy' || p.kind === 'focus') && p.mega;
    body.dataset.mega = onMega ? String(p.mega) : '';
    if (onMega && Canvas.color) body.style.setProperty('--mega-col', Canvas.color(p.colorKey, 0));

    introWin.classList.toggle('hidden', p.kind !== 'intro');
    if (teamWin) {
      teamWin.classList.toggle('hidden', p.kind !== 'team');
      teamWin.setAttribute('aria-hidden', p.kind === 'team' ? 'false' : 'true');
    }
    if (window.IndexGraph) { if (p.kind === 'index') IndexGraph.show(); else IndexGraph.hide(); }
    // the group-coloured canvas graph shows only while a group is being opened (messy / focus);
    // the Act-4 ordered grid is clean — no connecting lines.
    if (Canvas.edges) Canvas.edges(p.kind === 'messy' || p.kind === 'focus');

    // the blurred backdrop only behind the intro splash, the zoomed focus hero, and the chat
    if (scrim) scrim.classList.toggle('show', p.kind === 'intro' || p.kind === 'focus' || p.kind === 'chat');

    if (p.kind === 'intro') {
      Canvas.setScope(null); Canvas.scatterView();
      folderLabel.textContent = 'SYS://READY';
    } else if (p.kind === 'team') {
      Canvas.setScope(null); Canvas.scatterView();
      folderLabel.textContent = 'TEAM // 04';
    } else if (p.kind === 'index') {
      Canvas.setScope(null);
      folderLabel.textContent = `INDEX // ${N} SLIDE${N === 1 ? '' : 'S'}`;
    } else if (p.kind === 'messy') {
      Canvas.setScope(p.group);
      if (forward) Canvas.scatterZoomView(); else Canvas.scatterView();   // zoom-in entrance going forward
      const g2 = String(p.gnum || p.group).padStart(2, '0');
      folderLabel.textContent = p.mega
        ? `MEGA ${String(p.mega).padStart(2, '0')} · GROUP ${g2} // ${p.count} SLIDE${p.count === 1 ? '' : 'S'}`
        : `GROUP ${g2} // ${p.count} SLIDE${p.count === 1 ? '' : 'S'}`;
    } else if (p.kind === 'focus') {
      Canvas.setScope(p.group);
      Canvas.focusView(p.localIdx);
      const s = Canvas.slides()[p.folder];
      const idx = s ? String(s.index).padStart(2, '0') : '--';
      folderLabel.textContent = p.mega ? `M${p.mega}·G${p.gnum}·${idx} / ${p.count}` : `G${p.gnum || p.group}·${idx} / ${p.count}`;
    } else if (p.kind === 'grid' || p.kind === 'gridlog') {
      Canvas.setScope(null); Canvas.gridView();      // ALL groups assemble, ordered + coloured
      folderLabel.textContent = p.kind === 'gridlog' ? 'RATIONALIZED' : 'ORDER // COMPLETE';
    } else {
      Canvas.setScope(null); Canvas.gridView();
      folderLabel.textContent = 'AWAITING_INPUT';
    }

    // the punch line emerges only on the second Act-4 stop (over the already-assembled grid)
    rationalize.classList.toggle('show', p.kind === 'gridlog');
    rationalize.setAttribute('aria-hidden', p.kind === 'gridlog' ? 'false' : 'true');

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
            : p.kind === 'grid' ? 'REVEAL ▸'
              : p.kind === 'gridlog' ? 'ASK ▸'
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
