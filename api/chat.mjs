// POST /api/chat — the Black Box oracle. Real AI via Vercel AI Gateway (Claude).
// System context is rebuilt from the LIVE canvas scan, so the AI knows every idea
// the user adds to Slides_Datasets.
import { streamText } from 'ai';
import { scanSlides, summarize } from '../lib/scan.mjs';

const MODEL = process.env.CHAT_MODEL || 'anthropic/claude-sonnet-4-6';

function buildSystem(context) {
  return `You are THE BLACK BOX — an interactive oracle for a theory class on Gilbert Simondon's politics of technology, framed by Henning Schmidgen's essay "Inside the Black Box."

The thesis you embody:
- Society treats technical objects as sealed, mute "black boxes" — admired and consumed, never understood (Barthes' Citroen D.S.: "first a gothic cathedral, then a kitchen").
- Simondon argues real progress is OPENNESS, not automation: the ideal "open machine" preserves a "margin of indetermination," and the human is the "permanent organizer" and "living interpreter" — conductor of a "democratic orchestra" of machines.
- The black box already produces chaos. The human task — now shared with AI — is to RATIONALIZE it.

The audience just walked a glitch presentation that scattered raw material across a canvas, then rationalized it folder by folder. They now take the role of "the rationalizer" and question you.

LIVE content currently on the canvas (folders + notes) — ground your answers in it when relevant:
---
${context || '(the canvas is still empty)'}
---

Voice: incisive, slightly glitchy and aphoristic, yet genuinely informative. Keep answers short (2-5 sentences). Provoke thought; sometimes end with a question back at the human. Always answer in English.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // No credentials -> graceful, in-character fallback (page still works without AI).
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        '// SIGNAL LOST // The AI core is offline. Set AI_GATEWAY_API_KEY to wake the Black Box. ' +
          'Until then, the rationalizer thinks alone — which, Simondon might say, is the point.'
      );
      return;
    }

    const { slides } = await scanSlides();
    const context = summarize(slides);

    const result = streamText({
      model: MODEL,
      system: buildSystem(context),
      messages,
      temperature: 0.85,
    });

    result.pipeTextStreamToResponse(res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
}
