# INSIDE THE BLACK BOX

A one-page, dynamic glitch presentation for a theory class on **Gilbert Simondon's
politics of technology**, after Henning Schmidgen's essay *"Inside the Black Box."*
It moves an audience from **chaos → order**, and ends by handing the act of
*rationalization* over to the human + an AI.

> The black box already scrambles the data. What matters is how **we** rationalize it.

---

## The concept (4 acts)

| Act | Screen | Idea |
|----|--------|------|
| **1 — The Box** | A sealed, glitching black box + the Barthes line *"first a gothic cathedral, then a kitchen."* | We admire the surface; we never open it. |
| **2 — The Messy Canvas** | Every file from `Slides_Datasets/` scattered as draggable Y2K windows. Each **NEXT** pulls one folder (01, 02, …) to the front and arranges it. | The raw, unrationalized inside of the box. |
| **3 — Rationalization** | All items snap into a clean, ordered grid + the punch line. | "Order where there was chaos." The human as Simondon's *permanent organizer*. |
| **4 — The Rationalizer** | A chatbot popup: *"…now it is the AI's turn to answer — and your turn to think."* | Real AI answers, grounded in the live canvas content. |

A subtle dial called **`--clean`** (0 → 1) rises a notch on every advance, quietly
reducing glitch, grain, chromatic aberration, jitter and cursor chaos. By Act 4 the
UI is calm — *almost imperceptibly*, the tool itself "rationalizes" as you go.

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

> Prioritise **images over long text** — the design is built for a visual collage.

---

## Architecture

Static, hand-built front-end (no framework, for full control of the canvas/glitch)
**+ two Vercel serverless functions**. Deployed from GitHub via Vercel.

```
index.html              The single page (4 acts + HUD + nav + cursor + FX overlays)
styles/main.css         Glitch / Y2K design system + the --clean dial
scripts/
  glitch.js             Custom RGB-split cursor, transition bursts, text-scramble
  canvas.js             Fetch /api/slides → scatter → focus(folder) → grid(snap) + drag
  chatbot.js            Streaming chat UI → /api/chat
  state.js              Narrative state machine; drives --clean and the acts
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
npm run dev          # vercel dev — serves the page + /api functions
```

Open offline without a server (double-click `index.html`)? Generate the snapshot first
so the canvas has data and image paths resolve via a server:

```bash
npm run snapshot     # writes slides-data.js (window.SLIDES) as a fallback
```

> Note: opening via `file://` will show **broken image tiles** because asset paths are
> root-absolute (`/Slides_Datasets/...`). Use `vercel dev` or any static server for a
> faithful preview. Text cards, layout, glitch and cursor all work regardless.

---

## Deploy (GitHub → Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel (Framework preset: **Other** — zero config; `vercel.json` does the rest).
3. Add an environment variable for the chatbot:
   - **`AI_GATEWAY_API_KEY`** — from the Vercel AI Gateway. (On Vercel, OIDC may auth
     automatically, but setting the key is the reliable path.)
   - Optional: **`CHAT_MODEL`** — defaults to `anthropic/claude-sonnet-4-6`. Any model
     string the AI Gateway supports works (e.g. `anthropic/claude-opus-4-8`).
4. Deploy. Future content changes = `git push`.

If no key is set, the page works fully and the chatbot returns a graceful in-character
"signal lost" message instead of crashing.

---

## Customisation

- **Palette / type:** CSS variables at the top of `styles/main.css` (`--blue`, `--magenta`,
  `--yellow`, `--cyan`, `--red`; fonts `Bricolage Grotesque`, `Space Mono`, `VT323`).
- **Glitch intensity vs. cleanliness:** anything multiplied by `var(--chaos)`
  (`= 1 - var(--clean)`) calms automatically as the user advances.
- **Chatbot persona / knowledge:** `buildSystem()` in `api/chat.mjs`.
- **Intro copy & the punch line:** in `index.html` (`#act-intro`, `#rationalize`).

---

## Source

Henning Schmidgen, *"Inside the Black Box: Simondon's Politics of Technology,"*
SubStance 41/3 (2012). Built for IAAC. All on-screen copy is in English.
