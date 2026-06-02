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
| **1 — The Box** | A **full-screen electric-blue splash** (the title page). Dim monospace margin notes `{1}`–`{8}` in the four corners carry the Act-1 ideas (incl. the Barthes line *"first a gothic cathedral, then a kitchen"*); the **hero is a yellow-highlighter manifesto** whose marker boxes stick together; a small/discreet title + attribution and the **team credits** (Rania Chihaoui · Andrea Cutroni · Eduardo Martinez · Ramon Garcia). No "open" button — advance with **NEXT** / keyboard. The canvas, decor and boot flood stay **off** during Act 1. | We admire the surface; we never open it. |
| **2 — The Messy Canvas** | Every file from `Slides_Datasets/` scattered as draggable Y2K windows. Each **NEXT** brings the next folder up as a **centered, zoomed "hero" cluster**; on the following NEXT that folder **settles into its slot in the ordered grid** and the **whole window** (blue title bar included) washes toward an opaque **white veil** (no transparency — nothing behind shows through). Active (non-veiled) windows gently **auto-scroll** their content: images pan, text cards scroll with a real scrollbar that **stops that window's auto-scroll the moment the reader uses it**. Order accumulates folder by folder; nothing already placed disappears. | The raw inside of the box, rationalized step by step. |
| **3 — Rationalization** | A **light / white "calm" screen**: the grid images **start exactly where Act 2 left them** (no re-settle) and then **drift gently** (each window floats with its own phase); the repetitive decor switches off, and the punch line **emerges with a zoom pop** in a window (`RATIONALIZED.LOG`). | "Order where there was chaos." The transition into calm; the human as Simondon's *permanent organizer*. |
| **4 — The Rationalizer** | A chatbot popup whose backdrop **settles into the Act-1 blue** (the `#scrim` eases to `--blue`) — everything behind is gone. The window is sized to its content (no empty band), framed by a **complete** thin hairline, and uses **soft, floating** animations: *"…now it is the AI's turn to answer — and your turn to think."* | Real AI answers, grounded in the live canvas content. The arrival of calm — full circle to the blue. |

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

- **Backdrop (`#scrim`).** A blurred veil lives **inside `#stage` at `z-index: 250`** — fairly
  **opaque white** (`rgba(255,255,255,.82)`) so the zoomed Act-2 hero pops on a near-clean field.
  It sits *behind* the hero of the moment — the zoomed Act-2 cluster (z 520) and the **chat**
  (z 600) — but *over* the messy / receding canvas (low z), which it softly veils. `#world` uses
  `z-index: auto` (not a stacking context) so items can rise above or sit below the scrim.
  `state.js` toggles it on for the Act-2 focus steps and the chat. **At Act 4 the scrim eases to
  the Act-1 blue** (`body[data-act="4"] #scrim { background: var(--blue) }`, with a
  `background-color` transition), so the chat sits on a calm blue screen — full circle.
- **Centered zoom + progressive grid (Act 2).** `canvas.js` computes every item's **final grid slot
  once** (`gridSlots()`), shared by `focus()` and `grid()`. On each NEXT the **current** folder is a
  **centered, zoomed hero** (`zoomCluster()` picks the column count that maximises the zoom, up to
  ~1.85×); **earlier** folders sit in their grid slot with a `past` class; **not-yet-reached** folders
  wait scattered in the back (below the scrim, veiled — never vanishing). `past` paints a **solid
  white overlay over the whole window** (`.item.past .win::after`, opacity ~.62) — the window stays
  100% opaque (no transparency, nothing behind shows). Active (`:not(.past)`) windows **auto-scroll**:
  `img/video` pan via `object-position` (`winpan`); text via JS `scrollTop` ping-pong that stops on
  reader input. By the last folder everything is placed; **Act 3** keeps each item exactly where it is
  (no re-settle) and adds a continuous gentle **float** (`gridfloat`, per-item random phase `--fp`),
  while the decor fades out and `RATIONALIZED.LOG` emerges with a zoom pop (`ratpop`).

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
   - ⚠️ **Use URL-safe filenames** — letters, numbers, `-` and `_` only. **Avoid spaces and
     parentheses** (`image (11).png`): some static hosts/CDNs fail to serve those paths and the
     tile shows *"IMAGE NOT FOUND."* `lib/scan.mjs` now percent-encodes them defensively, but
     plain names are the reliable choice. (Also remember to **commit the image files** — an
     uncommitted asset isn't deployed, so it 404s in production.)
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
  canvas.js             Fetch /api/slides → scatter → centered-zoom focus (accumulates grid) → grid + drag + auto-scroll
  chatbot.js            Streaming chat UI → /api/chat
  state.js              Narrative state machine; drives --clean, the #scrim and the acts
  flood.js              Boot "window flood" — runs only as the box opens (Act 2), never during Act 1
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
  user advances; the Act-3 light theme, the gentle item **float** (`gridfloat`) and the decor fade
  live under `body[data-act="3"]`.
- **Backdrop / layering:** `#scrim` (inside `#stage`, `z-index: 250`) is the blurred veil behind the
  zoomed images / chat — tune its whiteness via `rgba(255,255,255,.82)`. Toggled per step in
  `state.js`, and eased to **`var(--blue)` at Act 4** so the chat lands on the Act-1 blue.
- **Popup "web window" chrome:** `.win-dialog, .chat-win, .rat-win` in `main.css` — Win98 gradient
  title bar, beveled buttons, red close-hover, soft float shadow. Act-2 canvas item windows use the
  plain flat `.win` chrome instead. The chat frame is completed by a `.chat-win::after` hairline overlay.
- **Past-slide veil (Act 2):** `.item.past .win::after` is a **solid white overlay over the whole
  window** (bar + content) — tune its `opacity`. The `past`/`fresh` flags are set in `canvas.js`
  `focus()`; the current folder is the `zoomCluster()` hero. Act-3 float: `gridfloat` + per-item `--fp`.
- **Folder label:** `.folder-title` — a small, centred, discreet label near the top (not a giant
  hero title).
- **Chatbot persona / knowledge:** `buildSystem()` in `api/chat.mjs`.
- **Intro copy & the punch line:** in `index.html` (`#introWin`, `#rationalize`).

---

## Source

Henning Schmidgen, *"Inside the Black Box: Simondon's Politics of Technology,"*
SubStance 41/3 (2012). Built for IAAC. All on-screen copy is in English.
