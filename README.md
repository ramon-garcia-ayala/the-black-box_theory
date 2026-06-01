# INSIDE THE BLACK BOX

A dynamic, one-page **glitch / Y2K web-brutalism** presentation on Gilbert Simondon's
politics of technology (after Henning Schmidgen). It walks an audience from **chaos to
order** across four acts and ends with an AI chatbot — the *rationalizer*.

![acts: box → messy canvas → rationalized grid → chatbot](Slides_Datasets/01_Intro/01_the-black-box.svg)

## Quick start

```bash
npm install

# Option A — quick visual preview, no login (static; chatbot shows offline fallback)
npm run snapshot      # refresh slides-data.js from your folders
npm run preview       # http://localhost:5050

# Option B — full local with live /api + AI chat
npm i -g vercel       # if needed
vercel dev            # run vercel dev DIRECTLY (not via `npm run dev`)
```

> Run `vercel dev` directly — there is intentionally no `npm run dev` script, because
> Vercel resolves its dev command to `npm run dev` and that would recurse into itself.

## Add your own content (no rebuild)

Drop images / gifs / videos / `.txt` files into numbered folders inside
`Slides_Datasets/`. The two-digit prefix sets the slide order:

```
Slides_Datasets/
  01_Intro/            ← images, gifs, videos, .txt
  02_Cybernetics_1951/
  03_Open_Machine/
  ...
```

`vercel dev` → reload to see changes instantly. In production, `git push` redeploys
and re-scans automatically. The chatbot reads the same content, so it always knows
what is on the canvas.

## Deploy

1. Push to GitHub, import into **Vercel** (preset: *Other*).
2. Set env var **`AI_GATEWAY_API_KEY`** (Vercel AI Gateway) for the live chatbot.
   Optional **`CHAT_MODEL`** (default `anthropic/claude-sonnet-4-6`).
3. Deploy. Without a key, the page still works; the chatbot shows a graceful fallback.

## Controls

`NEXT / BACK`, the on-screen buttons, **→ / Space / ←**, and dragging the windows on the
messy canvas. Full notes in [`CLAUDE.md`](./CLAUDE.md).
