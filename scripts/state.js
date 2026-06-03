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
  const fsBtn = document.getElementById('fsBtn');
  const actLabel = document.getElementById('actLabel');
  const hudTitle = document.getElementById('hudTitle');
  const folderLabel = document.getElementById('folderLabel');
  const progress = document.getElementById('progress');
  const introWin = document.getElementById('introWin');
  const teamWin = document.getElementById('teamWin');
  const matiasWin = document.getElementById('matiasWin');
  const scrim = document.getElementById('scrim');
  const chatModal = document.getElementById('chatModal');
  const chatClose = document.getElementById('chatClose');
  const rationalize = document.getElementById('rationalize');
  const bigText = document.getElementById('bigText');
  const bigTextTitle = document.getElementById('bigTextTitle');
  const bigTextKicker = document.getElementById('bigTextKicker');
  const bigTextBody = document.getElementById('bigTextBody');
  const bigSeq = document.getElementById('bigSeq');
  const bigSeqTitle = document.getElementById('bigSeqTitle');
  const bigSeqImg = document.getElementById('bigSeqImg');
  const bigSeqCount = document.getElementById('bigSeqCount');
  const bigSeqText = document.getElementById('bigSeqText');
  const bigSeqPrev = document.getElementById('bigSeqPrev');
  const bigSeqNext = document.getElementById('bigSeqNext');

  // HUD title per mega-group (top-left). Unlisted megas fall back to "GROUP N".
  const MEGA_NAMES = { 1: 'INTRODUCTION', 4: 'THE CONDUCTOR' };

  let seq = [];        // ordered list of stops (see buildSequence)
  let step = 0;
  let total = 0;
  let N = 0;

  function foldersOfSection(sec) {
    const out = [];
    Canvas.slides().forEach((s, fi) => { if ((s.section || 0) === sec) out.push(fi); });
    return out;          // global folder indices (one per slide), in narrative order
  }

  // Build the full stop list once the canvas data is known.
  function buildSequence() {
    N = Canvas.count();
    seq = [];
    seq.push({ act: 1, name: 'THE BOX', kind: 'intro' });
    seq.push({ act: 1, name: 'THE TEAM', kind: 'team' });
    seq.push({ act: 1, name: 'SPAN · MATIAS DEL CAMPO', kind: 'matias' });
    seq.push({ act: 2, name: 'THE INDEX', kind: 'index' });
    // Act 3 walks one MEGA-GROUP (section) at a time, in sequence — its messy canvas holds ALL
    // its chapters' slides, then NEXT steps through each slide (group then slide order within
    // the mega). Each focus carries its own slide's group/colour so the chapter variation shows.
    Canvas.sectionsPresent().forEach((sec) => {
      const folders = foldersOfSection(sec);
      if (!folders.length) return;
      const s0 = Canvas.slides()[folders[0]] || {};
      seq.push({ act: 3, name: 'THE MESSY CANVAS', kind: 'messy', section: sec, count: folders.length, mega: s0.mega || 0, gnum: s0.gnum || 0, colorKey: s0.colorKey || 0, shadeStep: 0 });
      folders.forEach((fi, li) => {
        const s = Canvas.slides()[fi] || {};
        seq.push({ act: 3, name: 'RATIONALIZING', kind: 'focus', section: sec, localIdx: li, folder: fi, count: folders.length, mega: s.mega || 0, gnum: s.gnum || 0, chapter: s.chapter || 0, colorKey: s.colorKey || 0, shadeStep: s.shadeStep || 0 });
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

  // A "slide" folder holding ONLY a single text file becomes an exclusive Act-3 panel
  // (an important statement / a question to the audience), like the Act-4 panel.
  function isLoneText(s) { return !!(s && s.items && s.items.length === 1 && s.items[0].type === 'text'); }
  function showBigText(s) {
    if (!bigText) return;
    const txt = (s.items[0].text || '').trim();
    const question = /\?/.test(txt);
    bigText.classList.toggle('is-question', question);
    if (bigTextKicker) bigTextKicker.textContent = question ? 'A QUESTION FOR YOU' : 'KEY TEXT';
    if (bigTextTitle) bigTextTitle.textContent = ((s.name || 'KEY TEXT') + (question ? '.ASK' : '.TXT')).toUpperCase();
    if (bigTextBody) bigTextBody.textContent = txt;
    bigText.classList.add('show');
    bigText.setAttribute('aria-hidden', 'false');
  }
  function hideBigText() {
    if (!bigText) return;
    bigText.classList.remove('show');
    bigText.setAttribute('aria-hidden', 'true');
  }

  // A slide that contains a numbered image SEQUENCE (carousel) opens in a LARGE exclusive viewer:
  // a dominant image stage + bottom arrows, with the folder's text shown smaller underneath.
  function carouselOf(s) { return s && s.items ? s.items.find((it) => it.type === 'carousel') : null; }
  let seqFrames = [], seqCur = 0;
  function seqShow(i) {
    const n = seqFrames.length; if (!n) return;
    seqCur = ((i % n) + n) % n;
    if (bigSeqImg) bigSeqImg.src = seqFrames[seqCur].src;
    if (bigSeqCount) bigSeqCount.textContent = (seqCur + 1) + ' / ' + n;
  }
  if (bigSeqPrev) bigSeqPrev.addEventListener('click', () => seqShow(seqCur - 1));
  if (bigSeqNext) bigSeqNext.addEventListener('click', () => seqShow(seqCur + 1));
  function showBigSeq(s, car) {
    if (!bigSeq) return;
    seqFrames = car.frames || [];
    if (bigSeqTitle) bigSeqTitle.textContent = ((s.name || 'SEQUENCE') + ' · ' + car.name).toUpperCase();
    const txt = s.items.find((it) => it.type === 'text');
    if (bigSeqText) bigSeqText.textContent = txt ? (txt.text || '').trim() : '';
    seqShow(0);
    bigSeq.classList.add('show');
    bigSeq.setAttribute('aria-hidden', 'false');
    if (seqScroller) seqScroller.restart();   // text scroll (re)starts from the top
  }
  function hideBigSeq() {
    if (!bigSeq) return;
    bigSeq.classList.remove('show');
    bigSeq.setAttribute('aria-hidden', 'true');
  }

  // Same auto-scroll as the Act-3 text windows (canvas.js setupTextAutoScroll): while the panel
  // is shown the copy descends slowly from the top, holds, then returns up quickly — restarting
  // from the top each time the panel (re)opens, and stopping the instant the reader scrolls it.
  function makePanelAutoScroll(el, isActive) {
    if (!el) return { restart() {} };
    let manual = false, prog = false, active = false, t0 = 0;
    const stop = () => { manual = true; };
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('scroll', () => { if (prog) { prog = false; return; } manual = true; });
    const period = 20000, fTopHold = 0.06, fDown = 0.58, fBotHold = 0.06, fUp = 0.30;
    const dStart = fTopHold, dEnd = dStart + fDown, uStart = dEnd + fBotHold;
    function frame(t) {
      const on = isActive();
      if (on && !active) { active = true; manual = false; t0 = t; prog = true; el.scrollTop = 0; }
      else if (!on && active) { active = false; }
      if (on && !manual) {
        const max = el.scrollHeight - el.clientHeight;
        if (max > 1) {
          const ph = (((t - t0) % period) + period) % period / period;
          let p;
          if (ph < dStart) p = 0;
          else if (ph < dEnd) p = (ph - dStart) / fDown;
          else if (ph < uStart) p = 1;
          else p = 1 - (ph - uStart) / fUp;
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const target = Math.round(e * max);
          if (target !== Math.round(el.scrollTop)) { prog = true; el.scrollTop = target; }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { restart() { manual = false; active = false; } };
  }
  const seqScroller = makePanelAutoScroll(bigSeqText, () => !!(bigSeq && bigSeq.classList.contains('show')));

  // A readable tooltip for each stop — so the bar doubles as a clickable table of contents.
  function stopLabel(p) {
    const grp = p.gnum || p.group;
    switch (p.kind) {
      case 'intro': return 'Act 1 · The Box';
      case 'team': return 'Act 1 · The Team';
      case 'matias': return 'Act 1 · Matias del Campo (SPAN)';
      case 'index': return 'Act 2 · The Index';
      case 'messy': return p.mega ? `Mega-group ${p.mega} — start` : `Group ${grp} — start`;
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

    // HUD title reflects the mega-group you're inside: mega 1 = INTRODUCTION, others = GROUP N,
    // coloured in that mega's hue. The framing acts keep the default title.
    if (hudTitle) {
      if (onMega) {
        hudTitle.textContent = MEGA_NAMES[p.mega] || ('GROUP ' + p.mega);
        hudTitle.style.color = Canvas.color ? Canvas.color(p.colorKey || p.mega, 0) : '';
      } else {
        hudTitle.textContent = 'INSIDE_THE_BLACK_BOX';
        hudTitle.style.color = '';
      }
      hudTitle.setAttribute('data-text', hudTitle.textContent);
    }

    introWin.classList.toggle('hidden', p.kind !== 'intro');
    if (teamWin) {
      teamWin.classList.toggle('hidden', p.kind !== 'team');
      teamWin.setAttribute('aria-hidden', p.kind === 'team' ? 'false' : 'true');
    }
    if (matiasWin) {
      matiasWin.classList.toggle('hidden', p.kind !== 'matias');
      matiasWin.setAttribute('aria-hidden', p.kind === 'matias' ? 'false' : 'true');
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
    } else if (p.kind === 'matias') {
      Canvas.setScope(null); Canvas.scatterView();
      folderLabel.textContent = 'SPAN // MATIAS DEL CAMPO';
    } else if (p.kind === 'index') {
      Canvas.setScope(null);
      folderLabel.textContent = `INDEX // ${N} SLIDE${N === 1 ? '' : 'S'}`;
    } else if (p.kind === 'messy') {
      Canvas.setScope(p.section);
      if (forward) Canvas.scatterZoomView(); else Canvas.scatterView();   // zoom-in entrance going forward
      folderLabel.textContent = p.mega
        ? `MEGA-GROUP ${String(p.mega).padStart(2, '0')} // ${p.count} SLIDE${p.count === 1 ? '' : 'S'}`
        : `GROUP ${String(p.gnum || p.section).padStart(2, '0')} // ${p.count} SLIDE${p.count === 1 ? '' : 'S'}`;
    } else if (p.kind === 'focus') {
      Canvas.setScope(p.section);
      Canvas.focusView(p.localIdx);
      const s = Canvas.slides()[p.folder];
      const idx = s ? String(s.index).padStart(2, '0') : '--';
      folderLabel.textContent = p.mega ? `M${p.mega}·G${p.gnum}·${idx} / ${p.count}` : `G${p.gnum}·${idx} / ${p.count}`;
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

    // exclusive Act-3 panels: a numbered sequence opens the LARGE viewer; a lone text file opens
    // the statement/question panel; otherwise neither.
    const fs = p.kind === 'focus' ? Canvas.slides()[p.folder] : null;
    const car = fs ? carouselOf(fs) : null;
    if (car) { showBigSeq(fs, car); hideBigText(); }
    else if (fs && isLoneText(fs)) { showBigText(fs); hideBigSeq(); }
    else { hideBigText(); hideBigSeq(); }

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

  // From the index graph: jump to the chosen item's MEGA-GROUP (section) messy canvas, then run.
  function pickGroup(g) {
    const slide = Canvas.slides().find((s) => (s.group || 0) === Number(g));
    const sec = slide ? (slide.section || 0) : 0;
    const idx = seq.findIndex((p) => p.kind === 'messy' && p.section === sec);
    if (idx >= 0) go(idx);
  }
  window.Present = { pickGroup, next, prev };

  if (openBtn) openBtn.addEventListener('click', next);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  if (chatClose) chatClose.addEventListener('click', prev);

  // full-screen toggle (bottom-right, left of NEXT)
  if (fsBtn) {
    const fsEl = document.documentElement;
    const isFs = () => document.fullscreenElement || document.webkitFullscreenElement;
    const enter = () => (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen || (() => {})).call(fsEl);
    const exit = () => (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    const paintFs = () => {
      const on = !!isFs();
      fsBtn.title = on ? 'Exit full screen' : 'Full screen';   // glyph ⛶ stays; active state shows via class
      fsBtn.classList.toggle('is-fs', on);
    };
    fsBtn.addEventListener('click', () => { if (isFs()) exit(); else enter(); });
    document.addEventListener('fullscreenchange', paintFs);
    document.addEventListener('webkitfullscreenchange', paintFs);
    paintFs();
  }

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
