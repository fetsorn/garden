---
status: active
---

# 0008 — Diorama pipeline

Implementation of ADR-0011. A fresh 11ty build under `clean/`, organized as six named compilation passes, each landing usable HTML before the next is written.

## Principle

Every pass is an 11ty transform plugin in a single run. Disabling pass N reveals what the build looks like after pass N-1. Passes are pure w.r.t. their inputs — portraits don't need attachments, attachments don't need theme. Each pass is small enough to be edited without reading the rest.

## Step 0 — Scaffolding

Under `~/mm/nodes/garden/clean/`:

- `package.json` — dependencies: `@11ty/eleventy`, `csvs-js`, `fountain-js`, `nunjucks` (transitive).
- `.eleventy.js` — wires the pass plugins in order. Each pass is `eleventyConfig.addTransform("pass-N-name", …)` or an equivalent hook.
- `build.sh` — entry. Copied from `11ty/build.sh` and adapted.
- `src/` — njk templates, pass implementations, theme CSS, svg assets.
- `src/_data/csvs.js` — wraps `csvs-js` queries used across passes (single source of CSVS access).

Port from current `11ty/` without rewriting:

- Star-nav renderer (the three-column star view implementation).
- Index page generator.
- Home page template.
- CSVS query layer, but swap `panrec` materialization for `csvs-js` direct queries.

Nothing is read from the old `11ty/` beyond these four. Deprecated templates (items, offers, feeds, prose) are not ported.

## Pass 0 — Catalog

No HTML output. Build an in-memory place catalog via `csvs-js`:

- `place-adjacent.csv` → adjacency graph.
- Place titles, theme assignment, ambient track (if any).
- `place-script.csv`. `{slug}.html` exists → passthrough. `{slug}.{lang}.fountain` exists → diorama. Language sets derived by globbing `{slug}.*.fountain`

Deliverable: `src/_data/places.js` returning the catalog used by every later pass.

**Debug artifact:** dump the catalog to `build/pass-0-catalog.json` for inspection when pass 1+ is disabled.

## Pass 1 — Shells, nav, home, index

Templates: `src/_includes/shell.njk`, `src/pages/home.njk`, `src/pages/index.njk`.

For each place:

- Passthrough → copy `{slug}.html` raw to output. Exits the pipeline.
- Diorama → emit `shell.njk`: `<nav>` from star-nav renderer fed by adjacency, one empty `<article lang="…">` per language script present, `<footer>` with home and index links.

Home page: intro text + "random scene" button over the full catalog including passthrough.
Index page: flat list of all places with hyperlinks.

**Acceptance:** all pages navigable. Passthrough pages fully done. Diorama pages empty inside `<article>`.

## Pass 2 — Fountain skeleton

New code: `src/passes/fountain.js`. Template: `src/_includes/item.njk` (reused by later passes).

For each diorama place, for each `{slug}.{lang}.fountain`:

- Parse with `fountain-js`.
- Walk tokens maintaining running state: current location class (from scene heading), current mood class set (from `#` section headings).
- Emit one `<section class="{mood} {location}">` per dialogue block with `<figure data-character="{NAME}"></figure>` and `<blockquote data-uuid="{parenthetical}">{dialogue}</blockquote>`.
- Append sections to the matching `<article lang>`.

**Acceptance:** diorama pages read as screenplay — character names visible as plain text in figures, dialogue in blockquotes, class attributes correct. No portraits, no attachments, no theme CSS.

## Pass 3 — Portraits

New code: `src/passes/portraits.js`. Asset directory: `src/assets/portraits/*.svg`.

For each `<figure data-character>`:

- Query `character-portrait.csv` for `character → svg filename`.
- Replace figure content with a linked svg reference. Pick one technique: `<img src>`, `<object data>`, or `<svg><use href>`. Start with `<img>` for simplicity; revisit if styling needs arise.
- Ensure 11ty copies `src/assets/portraits/` to the build output.

Portraits are not inlined. The SVG file set ships with the garden.

**Acceptance:** avatars appear next to blockquotes. Missing portraits fall back to the character name in `<figcaption>`.

## Pass 4 — item metadata

New code: `src/passes/items.js`.

For each `<blockquote data-uuid>`, query CSVS:

- `item-place.csv` whether this utterance is connected to a place
- `item-link.csv` (or equivalent) → external URL. Wrap the blockquote or attach.
- `item-file.csv` → attachment list. Emit `<details>` sibling after the blockquote, one `<summary>` plus one entry per attachment (lfs path or external URL).
- `item-reply.csv` → reply-tree edges. Emit `data-reply-to="{uuid}"` on the section for CSS `anchor()`-based marginal lines.

Tablet names above are working names; finalize in implementation.

**Acceptance:** attachments expandable under dialogue, links traversable, reply-tree markup emitted. Visual polish of reply lines deferred to theme work.

## Pass 5 — Theme

New code: `src/passes/theme.js`. Asset directory: `src/themes/{name}/theme.css`.

For each diorama page and each markdown page:

- Query `place-theme.csv` → theme name.
- Emit `<link rel="stylesheet" href="/themes/{name}/theme.css">` in `<head>`.
- Mark the theme file for inclusion in the build output so 11ty's passthrough copy grabs it.

The set of themes is fixed and shipped with the garden. Authoring new themes is editing CSS, not declaring in CSVS.

**Acceptance:** mood and location classes render as intended visual variation. Reply-line rendering via CSS `anchor()` lives in the theme layer.

## Pass 6 — Ambient

New code: `src/passes/ambient.js`.

For each diorama page with `place-ambient` set:

- Emit an `<audio>` element with the track URL, plus a gesture affordance (a visible "enter" button or similar — picked at implementation; browsers block unattended autoplay).
- Ambient asset resolved from `garden/lfs/` or external URL, same rules as attachments.

**Acceptance:** on user gesture, ambient track plays and persists across star-nav traversal within the page. Cross-page persistence is out of scope for this plan.

## First three places

Land these in `clean/` in order to exercise the passes end-to-end:

1. **Lx landing passthrough** — `english-lessons.html` raw. Exercises pass 1 and home/index linking.
2. **Legal services passthrough** — `legal.ru.md` raw. Exercises pass 1.
3. **A crossroads place** - `crossroads.ru.fountain` both landing and legal here are characters that speak and invite to visit them, link to their pages.
4. **A poem place** — `wanwei.{lang}.fountain` poem lyrics in three languages, audio narration as an item attachment, theme assigned. Exercises passes 2–5. Verify attachment playback.
5. **A story place** - `cat.en.fountain` full screenplay of a game session.

A youtube-video place follows, exercising external-URL attachments and a different theme.

## Retire `11ty/`

Once the three reference places render correctly under `clean/` and the home/index/random-scene work:

- Update `build.sh` (top-level) to point at `clean/`.
- Move `11ty/` to a git-tracked archive path or delete.
- `clean/` is renamed to `11ty/` or kept as `clean/` — pick at the time.

## Not in scope

- Migration of existing items, offers, feeds, prose into places. Each artifact is re-expressed or retired in follow-up plans.
- Markdown script support. Existing markdown is converted to fountain or served as passthrough HTML.
- Four-axis mood formalization (energy / valence / tension / intimacy) — composite adjectives stay as authored.
- Column-3 star-nav anchors via fountain transitions — reserved, syntax deferred.
- Cross-page ambient persistence.
- Language persistence affordance for the JS toggle (URL fragment / localStorage) — pick during pass 1.
- Any ontology work in `graph/index.ttl` beyond what `csvs-js` queries require.
