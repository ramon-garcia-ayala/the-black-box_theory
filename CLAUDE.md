# INSIDE THE BLACK BOX

A one-page, dynamic presentation for a theory class on **Gilbert Simondon's
politics of technology**, after Henning Schmidgen's essay *"Inside the Black Box."*
It moves an audience from **chaos → order → calm**, and ends by handing the act of
*rationalization* over to the human + an AI.

> The black box already scrambles the data. What matters is how **we** rationalize it.

The interface begins as a dense, repetitive collage and **progressively calms down**:
as you advance, content organises itself, the noisy decor switches off, and by the
rationalization screen the page is a clean, light, quiet space.

---

## The concept (4 acts)

| Act | Screen | Idea |
|----|--------|------|
| **1 — The Box** | An intro window sitting **on** the canvas (part of the collage, not a separate slide) + the Barthes line *"first a gothic cathedral, then a kitchen."* | We admire the surface; we never open it. |
| **2 — The Messy Canvas** | Every file from `Slides_Datasets/` scattered as draggable Y2K windows. Each **NEXT** pulls the next folder (01, 02, …) into its **final place — and it stays there**. The folder that just arrived stays sharp; earlier folders **dim back** (their picture fades toward the white window, but the window stays opaque so the busy background never bleeds through). Order accumulates folder by folder; nothing already placed disappears. | The raw inside of the box, rationalized step by step. |
| **3 — Rationalization** | A **light / white "calm" screen**: items settle softly into the ordered grid (all back to full strength), the repetitive background decor switches off, and the punch line appears in a **window** (`RATIONALIZED.LOG`). | "Order where there was chaos." The transition into calm; the human as Simondon's *permanent organizer*. |
| **4 — The Rationalizer** | A chatbot popup on a **fully white screen** — everything behind disappears (the `#scrim` goes solid white): *"…now it is the AI's turn to answer — and your turn to think."* | Real AI answers, grounded in the live canvas content. The arrival of calm. |

A dial called **`--clean`** (0 → 1) rises a notch on every advance; anything multiplied by
**`--chaos` (`= 1 − var(--clean)`)** — the repetitive background decor, smear washes, grain —
fades as you go, vanishing entirely at Act 3. The heavy **glitch FX have been removed** in
favour of a clean, calm look: the cursor is a single blue crosshair (no RGB-split / jitter),
text is plain (no scramble or echo), windows are crisp (no ghost/blur duplicates), and there
are no transition bursts. The page reads calm throughout and fully settles by Act 3.

The three **dialog popups** (Act 1 intro, Act 3 `RATIONALIZED.LOG`, Act 4 chat) share a
**"web window" chrome** — a nod to old Windows (Win98 navy→blue gradient title bar, beveled
title buttons, red close-button hover) with the page's modern, light, crisp finish and a soft
float shadow (no blue offset shadow). Scoped to those three so the Act-2 canvas item windows
stay flat and sharp. See `.win-dialog, .chat-win, .rat-win` in `main.css`.

### Layering & arrangement (the two mechanics worth knowing)

- **White backdrop (`#scrim`).** A white blurred veil lives **inside `#stage` at `z-index: 250`**.
  It sits *behind* the hero of the moment — the intro window (z 400), the **zoomed Act-2 images**
  (z 500) and the **chat** (z 600) — but *over* the messy / receding canvas (low z), which it
  softly veils. `#world` uses `z-index: auto` (not a stacking context) so individual items can
  rise above or sit below the scrim. `state.js` toggles it on for the intro, the Act-2 focus
  steps and the chat. **At Act 4 the scrim turns solid white** (`body[data-act="4"] #scrim`),
  so the chat sits on a completely clean white screen — everything behind is gone.
- **Progressive accumulation (Act 2).** `canvas.js` computes every item's **final grid slot once**
  (`gridSlots()`), shared by `focus()` and `grid()`. On each NEXT, folders already reached snap to
  their final slot and stay (above the scrim); folders not yet reached wait scattered in the back
  (below the scrim, veiled — never vanishing). The current folder is full strength + a `fresh`
  marker; earlier folders get a `past` class that **dims only the picture** (`.item.past .winbody
  img`) while the window stays **fully opaque** (`n.op = 1`) — so a placed image never goes
  see-through and the repeating background can't bleed through it. By the last folder everything is
  in place; Act 3 is the same grid (all back to full) with a gentle floaty settle and the decor faded out.

---

## ⭐ How to add / change content (no rebuild needed)

The canvas is **content-driven and dynamic**. The page reads `Slides_Datasets/` live
on every request via `/api/slides`.

1. Create a folder named `NN_Title` (a **two-digit numeric prefix sets the order**),
   e.g. `06_Concretization`.
2. Drop files inside. Supported types:
   - **Images:** `.png .jpg .jpeg .webp .svg .avif .bmp`
   - **GIFs:** `.gif`
   - **Videos:** `.mp4 .webm .mov .m4v .ogv`
   - **Text:** `.txt .md` → rendered as a terminal/notepad card (its text is read inline).
3. That's it.
   - **Local (`vercel dev`):** reload the page — it appears instantly.
   - **Production:** `git push` → Vercel redeploys and re-scans automatically.

Re-indexing folders (e.g. renaming `04_` → `02_`) reorders the slides. Adding a folder
adds a step. The chatbot also re-reads this content, so the AI "knows" every new idea.

> **Use a folder, not a loose file.** Only `NN_Name/` **directories** carry an order. As a
> safety net, files dropped **loose** in `Slides_Datasets/` (outside any folder) are still
> picked up — collected into a trailing "More" slide — so nothing you add is silently ignored;
> but for proper ordering put them in a numbered folder.

> Prioritise **images over long text** — the design is built for a visual collage.

---

## Architecture

Static, hand-built front-end (no framework, for full control of the canvas + z-index/scrim
layering) **+ two Vercel serverless functions**. Deployed from GitHub via Vercel.

```
index.html              The single page (4 acts + HUD + nav + cursor + #scrim + decor overlays)
styles/main.css         Light editorial / Y2K-chrome design system + the --clean dial
scripts/
  glitch.js             Clean crosshair cursor (burst()/scramble() kept as no-ops)
  canvas.js             Fetch /api/slides → scatter → progressive focus (accumulates) → grid + drag
  chatbot.js            Streaming chat UI → /api/chat
  state.js              Narrative state machine; drives --clean, the #scrim and the acts
api/
  slides.mjs            GET — live manifest of Slides_Datasets (scanned per request)
  chat.mjs              POST — AI answer (AI SDK + Vercel AI Gateway), context from scan
lib/scan.mjs            Shared directory scanner (single source of truth)
tools/build-slides.mjs  OPTIONAL: writes slides-data.js snapshot for file:// fallback
Slides_Datasets/NN_*/   YOUR CONTENT
PDF/                    Source papers (Schmidgen / Simondon)
slides-data.js          OPTIONAL offline snapshot (generated)
vercel.json             Functions config (includeFiles: Slides_Datasets/**)
```

**Why Vercel (not plain GitHub Pages):** a static host cannot list directory
contents, so it could never be "dynamic." `vercel.json` bundles `Slides_Datasets/**`
into the functions (`includeFiles`) so the live scan works in production.

---

## Run it locally

```bash
npm install
```

**Option A — quick visual preview (no Vercel login):**

```bash
npm run snapshot     # writes slides-data.js (window.SLIDES) — offline fallback only
npm run preview      # preview server at http://localhost:5050
```

`tools/serve.mjs` serves the page **and a live `/api/slides`** that re-scans
`Slides_Datasets/` on every request — so adding a folder and **reloading** updates the
canvas instantly, no re-snapshot needed. Only `/api/chat` is missing (no AI key here), so
the chatbot shows its offline fallback; use `vercel dev` for live AI. (`slides-data.js` is
just the `file://` fallback for when no server runs.)

**Option B — full local with live `/api` + AI chat:**

```bash
npm i -g vercel      # if needed
vercel dev           # run vercel dev DIRECTLY
```

> There is intentionally **no `npm run dev` script**. Vercel resolves its dev command to
> `npm run dev`; if that script ran `vercel dev` it would recurse ("must not recursively
> invoke itself"). So run `vercel dev` directly.
>
> Avoid opening `index.html` via `file://` — asset paths are root-absolute
> (`/Slides_Datasets/...`) and would 404. Always use a server (`npm run preview` or `vercel dev`).

---

## Deploy (GitHub → Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel (Framework preset: **Other** — zero config; `vercel.json` does the rest).
3. Add an environment variable for the chatbot:
   - **`AI_GATEWAY_API_KEY`** — from the Vercel AI Gateway. (On Vercel, OIDC may auth
     automatically, but setting the key is the reliable path.)
   - Optional: **`CHAT_MODEL`** — defaults to `anthropic/claude-haiku-4-5`. Any model
     string the AI Gateway supports works (e.g. `anthropic/claude-opus-4-8`).
4. Deploy. Future content changes = `git push`.

If no key is set, the page works fully and the chatbot returns a graceful in-character
"signal lost" message instead of crashing.

---

## Customisation

- **Palette / type:** CSS variables at the top of `styles/main.css` — `--ground`/`--paper`
  (white), `--ink` (near-black), `--blue #0a30ff`, plus `--magenta`/`--cyan` accents. Fonts:
  **Archivo Black** (display), **Anton** (status words), **Saira Condensed** (system text),
  **Courier New** (mono) — loaded via Google Fonts in `index.html`.
- **Density vs. calm:** anything multiplied by `var(--chaos)` (`= 1 - var(--clean)`) calms as the
  user advances; the Act-3 light theme, soft item "settle" and decor fade live under
  `body[data-act="3"]`.
- **White backdrop / layering:** `#scrim` (inside `#stage`, `z-index: 250`) is the blurred white
  veil behind the intro window / zoomed images / chat; toggled per step in `state.js`, and turned
  **solid white at Act 4** so the chat sits on a clean empty screen.
- **Popup "web window" chrome:** `.win-dialog, .chat-win, .rat-win` in `main.css` — Win98 gradient
  title bar, beveled buttons, red close-hover, soft float shadow. Act-2 canvas item windows use the
  plain flat `.win` chrome instead.
- **Past-slide dimming (Act 2):** `.item.past` fades the picture only (window stays opaque); tune
  the `opacity` there. The `past`/`fresh` flags are set in `canvas.js` `focus()`.
- **Folder label:** `.folder-title` — a small, centred, discreet label near the top (not a giant
  hero title).
- **Chatbot persona / knowledge:** `buildSystem()` in `api/chat.mjs`.
- **Intro copy & the punch line:** in `index.html` (`#introWin`, `#rationalize`).

---

## Source

Henning Schmidgen, *"Inside the Black Box: Simondon's Politics of Technology,"*
SubStance 41/3 (2012). Built for IAAC. All on-screen copy is in English.
