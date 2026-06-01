/* chatbot.js — streams answers from /api/chat (real AI via Vercel AI Gateway).
   Degrades gracefully to an in-character "signal lost" message when offline. */
(function () {
  const log = document.getElementById('chatLog');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const suggest = document.getElementById('chatSuggest');
  const messages = [];

  const SUGG = [
    'What is a black box?',
    'Why openness over automation?',
    'What does it mean to rationalize data?',
    'Is my phone a black box?'
  ];

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'you' ? 'msg-you' : 'msg-bot');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function buildSuggest() {
    if (!suggest) return;
    SUGG.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sugg';
      b.textContent = q;
      b.addEventListener('click', () => { input.value = q; form.requestSubmit(); });
      suggest.appendChild(b);
    });
  }

  async function send(text) {
    addMsg('you', text);
    messages.push({ role: 'user', content: text });

    const botEl = addMsg('bot', '');
    botEl.innerHTML = '<span class="caret">&#9611;</span>';
    let acc = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!res.ok || !res.body) {
        acc = (await res.text().catch(() => '')) ||
          '// SIGNAL LOST // the box is unreachable. Deploy on Vercel with AI_GATEWAY_API_KEY for live answers.';
        botEl.textContent = acc;
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        botEl.textContent = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          botEl.textContent = acc;
          log.scrollTop = log.scrollHeight;
        }
      }
    } catch (e) {
      acc = '// SIGNAL LOST // ' + ((e && e.message) || 'network error') +
        '\n(Deploy on Vercel with AI_GATEWAY_API_KEY to wake the Black Box.)';
      botEl.textContent = acc;
    }

    messages.push({ role: 'assistant', content: acc });
    if (window.Glitch && Glitch.burst) Glitch.burst();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      input.value = '';
      send(t);
    });
  }

  window.Chat = {
    init() {
      if (!log.dataset.init) { buildSuggest(); log.dataset.init = '1'; }
    },
    focusInput() { setTimeout(() => input && input.focus(), 320); }
  };
})();
