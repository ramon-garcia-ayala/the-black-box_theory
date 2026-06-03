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

## The concept (5 acts)

| Act | Screen | Idea |
|----|--------|------|
| **1 — The Box** | A **full-screen electric-blue splash** (the title page). Dim monospace margin notes `{1}`–`{8}` in the four corners carry the Act-1 ideas (incl. the Barthes line *"first a gothic cathedral, then a kitchen"*); the **hero is the large centred title + subtitle** and the **team credits** (Rania Chihaoui · Andrea Cutroni · Eduardo Martinez · Ramon Garcia). A **second Act-1 stop, THE TEAM** (`#teamWin`), shows the four members' photos in a row — square, blue-filtered (`mix-blend-mode: luminosity`) — each inside the Act-3 window chrome with the full name in the header. No "open" button — advance with **NEXT** / keyboard. The canvas/decor stay **off** during Act 1. | We admire the surface; we never open it. |
| **2 — The Index** | A **force-directed graph on a clean white field** of **every** item in every folder (`scripts/graph.js`), each wearing the Act-3 "web window" chrome (title bar in its group's colour + a `G{n}` chip; text items use the Act-3 card). No title/subtitle — just the network and the legend. Groups are **mixed into one chaotic blob** yet **hovering** any node *isolates its whole group* (the rest dims). **Wheel-zoom + right/middle-drag pan** (Rhino-style). Pressing **NEXT** (`ENTER ▸`) walks the mega-groups **in order**; **clicking** a node (or legend) jumps straight to that item's mega-group (`Present.pickGroup` → its section). | A map of the inside before we open it — pick a thread to pull. |
| **3 — The Messy Canvas (per MEGA-GROUP)** | The run plays **one mega-group (section) at a time**. Entering one, **only that mega-group's assets** appear with a **zoom-in entrance** (`scatterZoomView`); its items link as a graph — thin **edges tinted per chapter** (faint, `.world-edge` opacity ~.22). Each **NEXT** brings the next slide up as a **centered, zoomed "hero"** (walking its chapters in order: g01 slides, then g02 …); earlier slides settle into the mega-group's ordered grid (white-veiled). A slide folder holding **only a single text file** opens instead as an **exclusive Act-4-style panel** (`#bigText`) — a key statement, or (if it contains a `?`) a **question for the audience**. When a mega-group ends, the next one zooms in. | The raw inside of the box, opened super-chapter by super-chapter. |
| **4 — Rationalization (all assembled)** | **Two stops.** First NEXT (`RATIONALIZE ▸`): **ALL items assemble into one ordered grid** — by **mega → group → slide**, headers **coloured per mega-group**, **no connecting edges** — the clean grid alone. Second NEXT (`REVEAL ▸`): the punch line **emerges** over that same grid in a window (`RATIONALIZED.LOG`). | "Order where there was chaos." Everything finally in its place, then named. |
| **5 — The Rationalizer** | A chatbot popup whose backdrop **settles into the Act-1 blue** (the `#scrim` eases to `--blue`) — everything behind is gone. Soft, floating animations: *"…now it is the AI's turn to answer — and your turn to think."* | Real AI answers, grounded in the live canvas + the source papers. Full circle to the blue. |

> **Step model** (`state.js`): a built **sequence** of stops —
> `intro · team · index · [per MEGA-GROUP: messy, focus×K] · grid · gridlog · chat`. Act 3 is scoped
> by **section** (= mega-group): one messy canvas per mega-group, then a `focus` per slide walking
> its chapters in order. The two Act-4 stops (`grid`, `gridlog`) drop the scope so **every** item
> appears, ordered by mega → group → slide; `grid` is the clean assembled grid, `gridlog` adds the
> emerging punch line. `Present.pickGroup(g)` jumps to that item's mega-group messy stop; advancing
> past the last mega-group reaches the assembled grid, then the line.
>
> **Progress bar** (`buildProgress`/`paintProgress`): a compact, self-rebuilding **map** of the run —
> one clickable dot per stop, coloured/shaped by what it is (mega-hue + chapter-shade for content,
> a taller tick at each mega-group entry, a gap between mega-groups). It is a single row that
> auto-scrolls the active dot to centre, so it stays compact however much content is added; click any
> dot to jump there. The three window buttons (`_ ☐ ✕`) are **decorative** (`.wb-btns` has
> `pointer-events: none`).

A dial called **`--clean`** (0 → 1) rises a notch on every advance; anything multiplied by
**`--chaos` (`= 1 − var(--clean)`)** — the repetitive background decor, smear washes, grain —
fades as you go. The heavy **glitch FX have been removed** in favour of a clean, calm look:
the cursor is a single blue crosshair, text is plain, windows are crisp, and there are no
transition bursts. The index (Act 2), the rationalized screen (Act 4) and the chat (Act 5)
are decor-free white/blue calm screens.

The three **dialog popups** (Act 1 intro, Act 4 `RATIONALIZED.LOG`, Act 5 chat) share a
**"web window" chrome** — a nod to old Windows (Win98 navy→blue gradient title bar, beveled
title buttons, red close-button hover) with the page's modern, light, crisp finish and a soft
float shadow (no blue offset shadow). Scoped to those three so the Act-3 canvas item windows
stay flat and sharp. See `.win-dialog, .chat-win, .rat-win` in `main.css`.

**Element windows are uniform across all acts.** Every item window (Act 2 index, Act 3 canvas,
Act 4 grid) wears the **same single thin black frame** — `border: 1px solid #000` on `.win`,
`box-shadow: none`. No grey hairline, no drop shadow, and no per-state change: hover, `fresh`
(the zoomed hero) and `dragging` all keep the identical black outline. (Only the three popup
dialogs above keep a float shadow, by design.)

### Layering & arrangement (the two mechanics worth knowing)

- **Backdrop (`#scrim`).** A blurred veil lives **inside `#stage` at `z-index: 250`** — fairly
  **opaque white** (`rgba(255,255,255,.82)`) so the zoomed Act-3 hero pops on a near-clean field.
  It sits *behind* the hero of the moment — the zoomed Act-3 cluster (z 520) and the **chat**
  (z 600) — but *over* the messy / receding canvas (low z), which it softly veils. `#world` uses
  `z-index: auto` (not a stacking context) so items can rise above or sit below the scrim.
  `state.js` toggles it on for the Act-3 focus steps and the chat. **At Act 5 the scrim eases to
  the Act-1 blue** (`body[data-act="5"] #scrim { background: var(--blue) }`, with a
  `background-color` transition), so the chat sits on a calm blue screen — full circle.
- **Centered zoom + progressive grid (Act 3).** `canvas.js` computes every item's **final grid slot
  once** (`gridSlots()`), shared by `focus()` and `grid()`. On each NEXT the **current** folder is a
  **centered, zoomed hero** (`zoomCluster()` picks the column count that maximises the zoom, up to
  ~1.85×); **earlier** folders sit in their grid slot with a `past` class; **not-yet-reached** folders
  wait scattered in the back (below the scrim, veiled — never vanishing). `past` paints a **solid
  white overlay over the whole window** (`.item.past .win::after`, opacity ~.62) — the window stays
  100% opaque (no transparency, nothing behind shows). The **zoomed hero** (the `fresh` window)
  **auto-scrolls**: `img/video` pan via `object-position` (`winpan`); text via JS `scrollTop`. The
  **text scroll always (re)starts from the top** each time a window becomes the hero (own per-card
  clock, keyed off the `fresh` class), and the **descent is slow, the return up is fast** (cycle
  fractions in `setupTextAutoScroll`); it stops the instant the reader touches that window. By the
  last folder everything is placed; **Act 4** keeps each item exactly where it is (no re-settle) and
  adds a continuous gentle **float** (`gridfloat`, per-item random phase `--fp`), while the decor
  fades out and `RATIONALIZED.LOG` emerges with a zoom pop (`ratpop`) on the second Act-4 stop.

---

## ⭐ How to add / change content (no rebuild needed)

The canvas is **content-driven and dynamic**. The page reads `Slides_Datasets/` live
on every request via `/api/slides`.

1. Create a folder. **Three accepted naming shapes** (a folder = one **slide**):
   - **Mega-grouped (recommended):** `MgNN_gNN_MM_Title` — **mega-group `NN`** (a *super-chapter*),
     **group `NN`** within it (a *chapter* of that super-chapter), **slide `MM`** within that
     group, then the name. e.g. `Mg01_g01_01_fotos` = mega 1, group 1, slide 1, "fotos".
     Ordering is **mega → group → slide**, and groups are walked **sequentially** (group 1,
     then group 2, …). Group numbers may **restart inside each mega-group** (`Mg02_g01_…` is a
     different group from `Mg01_g01_…`) — the scanner assigns each a unique global ordinal.
     **Colour = hierarchy:** each **mega-group owns one hue** (`--grp-{mega}`); each **group /
     chapter inside it is a SUBTLE lighter shade** of that hue, so chapters read as a family.
     In Act 3 a thin **top band** in the mega-group's base hue (`--mega-col`) marks the current
     super-chapter, and the HUD chip shows `M{mega}·C{chapter}`.
   - **Grouped (legacy):** `gNN_MM_Title` — **group `NN`**, **slide `MM`**, no mega-group. e.g.
     `g01_03_Open_Machine`. Each group keeps its own distinct `--grp-N` colour (no shading) and
     sorts **after** all mega-grouped folders — so you can migrate to mega-groups gradually.
   - **Ungrouped (legacy):** `NN_Title` — a numeric prefix sets the order, e.g. `06_Concretization`.
     Default blue header; sorts **last**.

   > Groups 1–6 have predefined hues in `main.css` (`--grp-1 … --grp-6`); beyond that, both the
   > scanner colours and `canvas.js`/`graph.js` fall back to a built-in palette (`HUE_FALLBACK`).
   > The scanner (`lib/scan.mjs`) emits per-slide `mega`, `chapter`, `colorKey`, `shadeStep` and a
   > unique global `group` ordinal; the clients derive the final colour via `slideColor()`.
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

### Source papers (`assets/PDF/`) — the chatbot's second knowledge source

The chatbot grounds its answers in **two** live sources: the canvas (`Slides_Datasets/`)
**and** the source papers in **`assets/PDF/`**. `lib/pdfs.mjs` scans `assets/PDF/` on each
chat request, extracts each PDF's text (via `unpdf`) and feeds it into the system prompt
alongside the canvas brief — so the AI always "knows" both the slides and the papers.

This is **fully scalable**: drop any new `.pdf` into `assets/PDF/` and **commit + push** — it
is picked up automatically, no rebuild and no code change. Extraction is memoised per
file (name + mtime + size), so a PDF is parsed once per warm function instance; replacing
a PDF re-extracts it on the next request. To keep the prompt bounded, each paper contributes
a capped excerpt (`perPdf`) within an overall cap (`maxChars`) — tune these in
`summarizePdfs()` if you add many papers. (`vercel.json` bundles `assets/PDF/**` into the
functions via `includeFiles`, so the scan works in production too — remember to commit the PDFs.)

---

## Architecture

Static, hand-built front-end (no framework, for full control of the canvas + z-index/scrim
layering) **+ two Vercel serverless functions**. Deployed from GitHub via Vercel.

```
index.html              The single page (4 acts + HUD + nav + cursor + #scrim + decor overlays)
styles/main.css         Light editorial / Y2K-chrome design system + the --clean dial
scripts/
  glitch.js             Clean crosshair cursor (burst()/scramble() kept as no-ops)
  canvas.js             Fetch /api/slides → scatter / zoom-in entrance → centered-zoom focus (per-group grid) → final grid + drag + auto-scroll + group scope
  graph.js              Act 2 "THE INDEX" — force-directed graph of all items, grouped by colour; hover isolates a group, click scopes the run
  chatbot.js            Streaming chat UI → /api/chat
  state.js              Narrative state machine; drives --clean, the #scrim and the acts
  flood.js              Boot "window flood" — runs only as the box opens (Act 3, step 2), never before
api/
  slides.mjs            GET — live manifest of Slides_Datasets (scanned per request)
  chat.mjs              POST — AI answer (AI SDK + Vercel AI Gateway); context = canvas scan + PDF papers
lib/scan.mjs            Shared directory scanner for Slides_Datasets (single source of truth)
lib/pdfs.mjs            Shared PDF scanner for assets/PDF/ — extracts text (unpdf), grounds the chatbot
tools/build-slides.mjs  OPTIONAL: writes slides-data.js snapshot for file:// fallback
Slides_Datasets/NN_*/   YOUR CONTENT
assets/PDF/             Source papers (Schmidgen / Simondon …)
assets/                 UI reference images + team art (not served; staging/reference)
slides-data.js          OPTIONAL offline snapshot (generated)
vercel.json             Functions config (includeFiles: Slides_Datasets/** + assets/PDF/**)
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
3. Add an environment variable for the chatbot — **either** works (`api/chat.mjs` picks
   whichever is present):
   - **`ANTHROPIC_API_KEY`** — a normal Anthropic key (`sk-ant-…`); talks to Anthropic
     **directly** via `@ai-sdk/anthropic`. Simplest if you already have an Anthropic key.
   - **`AI_GATEWAY_API_KEY`** — a **Vercel AI Gateway** key (not an Anthropic key); routes the
     `provider/model` string through the Gateway. (On Vercel, OIDC may auth automatically.)
   - Optional: **`CHAT_MODEL`** — defaults to `anthropic/claude-haiku-4-5` (the `anthropic/`
     prefix is stripped automatically for the direct path). e.g. `anthropic/claude-opus-4-8`.
   - ⚠️ **Env-var changes only take effect after a redeploy** (Vercel → Deployments → Redeploy,
     or push a new commit). Setting the key without redeploying is the usual "key doesn't work."
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
  user advances; the rationalized-act light theme, the gentle item **float** (`gridfloat`) and the
  decor fade live under `body[data-act="4"]` (decor is also off at the index, `body[data-act="2"]`).
- **Backdrop / layering:** `#scrim` (inside `#stage`, `z-index: 250`) is the blurred veil behind the
  zoomed images / chat — tune its whiteness via `rgba(255,255,255,.82)`. Toggled per step in
  `state.js`, and eased to **`var(--blue)` at Act 5** so the chat lands on the Act-1 blue.
- **Popup "web window" chrome:** `.win-dialog, .chat-win, .rat-win` in `main.css` — Win98 gradient
  title bar, beveled buttons, red close-hover, soft float shadow. The chat frame is completed by a
  `.chat-win::after` hairline overlay.
- **Element window frame (all acts):** `.win` carries a single `border: 1px solid #000` and
  `box-shadow: none`; hover / `fresh` / `dragging` / `.idx-node` states all keep that same outline
  (no shadows, no blue rings). Change the one `.win` border to restyle every item window at once.
- **Window buttons are decorative:** the `_ ☐ ✕` in every window's title bar have
  `pointer-events: none` (`.wb-btns` in `main.css`) — none of them do anything.
- **Mega-group / chapter colour:** a window's header hue is computed in JS (`slideColor()` in both
  `canvas.js` and `graph.js`) from the scanner's `colorKey` (the mega-group → base `--grp-N` hue)
  and `shadeStep` (the chapter → subtle lightening, `*0.16`, capped). Tune the per-chapter step or
  the `HUE_FALLBACK` palette there. The Act-3 **mega band** (`.stage::before`, `--mega-col` set in
  `state.js`) is the super-chapter cue — tune its `opacity: .6` / `height: 3px`.
- **Connection graph edges:** Act 3 `.world-edge` (and Act 2 `.idx-edge`) are tinted by group colour;
  tune Act-3 faintness via `.world-edge { opacity: .22 }`. Edges show only on the `messy`/`focus`
  stops — `state.js` calls `Canvas.edges(...)`, off for the Act-4 grid.
- **Past-slide veil (Act 3):** `.item.past .win::after` is a **solid white overlay over the whole
  window** (bar + content) — tune its `opacity`. The `past`/`fresh` flags are set in `canvas.js`
  `focus()`; the current folder is the `zoomCluster()` hero. Act-4 float: `gridfloat` + per-item `--fp`.
- **Text auto-scroll (Act 3):** `setupTextAutoScroll()` in `canvas.js` — the `fresh` hero's text
  card always restarts from the top, descends slowly then returns up quickly. Tune the cadence via
  `period` and the `fTopHold / fDown / fBotHold / fUp` fractions (must sum to 1).
- **Folder label:** `.folder-title` — a small, centred, discreet label near the top (not a giant
  hero title).
- **Chatbot persona / knowledge:** `buildSystem()` in `api/chat.mjs`.
- **Intro copy & the punch line:** in `index.html` (`#introWin`, `#rationalize`).

---

## Source

Henning Schmidgen, *"Inside the Black Box: Simondon's Politics of Technology,"*
SubStance 41/3 (2012). Built for IAAC. All on-screen copy is in English.
