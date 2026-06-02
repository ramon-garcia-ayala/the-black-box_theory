/* glitch.js — custom cursor + (now-disabled) transition/scramble hooks.
   Cursor tracks the pointer cleanly. The old glitch effects (RGB-split jitter on the
   cursor, blue-bar transition burst, and text-scramble reveal) have been removed; the
   burst()/scramble() exports stay as no-ops so callers (state.js) keep working. */
(function () {
  const cursor = document.getElementById('cursor');
  const tag = document.getElementById('cursorTag');

  let mx = innerWidth / 2;
  let my = innerHeight / 2;

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

  // clean crosshair: just track the pointer, no RGB lag / jitter / teleport
  function frame() {
    if (cursor) cursor.style.transform = `translate(${mx}px, ${my}px)`;
    requestAnimationFrame(frame);
  }
  if (cursor) requestAnimationFrame(frame);

  // glitch transition flash removed — no blue-bar burst on advance
  function burst() {}

  // text-scramble reveal removed — titles render plainly, no random letters
  function scramble() {}

  window.addEventListener('blur', () => { if (cursor) cursor.style.opacity = '0'; });
  window.addEventListener('focus', () => { if (cursor) cursor.style.opacity = '1'; });

  window.Glitch = { burst, scramble, chaos };
})();
