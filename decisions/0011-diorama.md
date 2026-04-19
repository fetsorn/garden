---
status: proposed
date: 2026-04-19
---

# 0011 — Diorama

## Context

ADR-0004 introduced several page types (items, offers, feeds, passthrough landing pages) and ADR-0005 recast rooms as places holding items. In practice this multiplied templates and forced every new artifact through a typing decision before any content could be written. Items themselves are thin — a label and a prose body — whereas actual artifacts (a poem, a session recording, a landing page, a video) carry speakers, moods, attachments, ambient sound, and optional bilingual text.

The underlying insight is that almost every publishable artifact is a sequence of utterances against a mood. Artifacts that are not — e.g. a PDF academic article — are better linked as binary references than forced onto a page.

We also want to replace the opaque build (fountain + csvs → html in one step) with named compilation passes so that a change in one layer (portraits, attachments, theme) can be made and debugged without reading or rewriting the whole pipeline.

## Decision

### One page type: the diorama

The garden publishes **dioramas**. In CSVS they are called **places**, preserving ADR-0005. Every non-passthrough page is a place. Passthrough pages are any place whose script file is `.html` — no type annotation is needed, the extension decides.

### Anatomy of a diorama page

```
<nav>   — three-column star view per ADR-0006 + language toggle
<article lang="en">   — one article per language
  <section class="mood location">
    <figure data-character="…"> … linked svg portrait … </figure>
    <blockquote data-uuid="…"> dialogue text </blockquote>
    <details> … attachments … </details>
  </section>
  …
</article>
<article lang="ru"> … </article>
<footer>   — link to home, link to index
```

- **Utterance is primary.** There is no panel or scene abstraction in the DOM. One `<section>` = one utterance.
- **One utterance = one figure + one blockquote + optional details.** No inline exposition inside a section; per-utterance metadata lives in CSVS keyed by uuid.
- **The "space" speaks as a character.** Narrator voice is an utterance by a character named e.g. `CASTLE` or `SKY`, with its own portrait entry in CSVS.
- **Scenes are emergent.** A reader perceives a scene when consecutive sections share location and mood classes. Nothing in the DOM marks a scene boundary.

### Multilingual rendering

Each language is a separate `<article>` in the same HTML page, one article per parallel fountain file. A JS toggle sets all articles but the selected one to `display: none`. (This supersedes the CSS `:target` mechanism described in ADR-0002, which is now deprecated.) The selected language persists across navigation via URL fragment or localStorage — affordance decided at implementation.

### Mood and location classes

- Mood classes are composite semantic adjectives (`sombre`, `upbeat`, etc.). A four-axis theoretical model (energy / valence / tension / intimacy) is acknowledged but not committed to yet; composites are authored directly.
- Location classes derive from fountain scene headings.
- Classes attach to `<section>`, with article-level defaults. Nothing forbids finer-grained classes elsewhere — the CSS theme decides granularity.

### Fountain as authoring DSL

Fountain is the source format for diorama bodies, per ADR-0008 and ADR-0010, with this refinement:

- **Character + parenthetical + dialogue** → one utterance. Character name keys the portrait. The parenthetical is a uuid that keys per-utterance CSVS metadata. Dialogue is the blockquote text.
- **Scene heading** → sets the current location class for all following utterances until the next scene heading.
- **Section (`#`-prefixed lines)** → mood directive. Mood persists on all following utterances until another section block changes it. Rationale: the `#` subset of fountain is the cleanest place to carry mood without inventing syntax.
- **Transitions** → reserved for star-nav column-3 anchors (open question, see below).

Parallel fountain files (`{slug}.en.fountain`, `{slug}.ru.fountain`, …) each become one `<article>` in the output HTML.

### Source locality

A place's script can live in-garden or be pointed at by CSVS (path to a fountain/csvs pair in another repo, e.g. estate). Binary attachments live either in `garden/lfs/` or at external URLs; CSVS records the reference.

### Compilation passes

The build is a sequence of named passes implemented as 11ty transform plugins in a single 11ty run. Every pass is in-memory by default; any pass can be disabled to inspect the HTML produced up to that point. Each pass is pure with respect to its inputs — portraits do not require attachments, attachments do not require theme, etc. — so a change in one layer is isolated.

Each pass leaves the HTML in a state that is already usable for debugging.

- **Pass 0 — Catalog.** 11ty uses `csvs-js` directly (panrec materialization into JSON retires). Queries produce: list of places, `place-adjacent` graph, place → language set, place → theme, place → title, place → ambient (if any). Script filenames are not stored — they are resolved by slug per ADR-0010 (`{slug}.{lang}.fountain` or `{slug}.html`). No HTML yet.

- **Pass 1 — Shells, nav, home, index.** For each place whose resolved script is `{slug}.html` → copy raw, done. For each script that is `{slug}.{lang}.md`, turn it into clean black-and-white readable HTML, with only a lang toggle, done. For each diorama place → emit a shell: `<nav>` populated from the adjacency graph, one empty `<article lang="…">` per language script present on disk, footer with home and index links. Also emit the home page (intro + "random scene" button over all places including passthrough) and the index page (full list). After this pass, navigation works and bodies are empty.

- **Pass 2 — Fountain skeleton.** For each diorama place, for each `{slug}.{lang}.fountain`, parse with `fountain-js` and populate the corresponding `<article lang="…">` with `<section><figure data-character><blockquote data-uuid>…</blockquote></section>` for each utterance. Attach mood and location classes according to the running state driven by scene headings and section headings. No portraits, no attachments, no theme. A section njk template is used here and reused by later passes.

- **Pass 3 — Portraits.** For each `<figure data-character>`, resolve against `character-portrait.csv` and link the svg (e.g. `<img src>` or `<object data>` or `<use href>` — picked at implementation). SVG files are kept as separate assets in the garden and copied into the build output, not inlined into HTML. Pass 2's output is already legible without this — figures show bare character names.

- **Pass 4 — Utterance metadata.** For each `<blockquote data-uuid>`, query CSVS for: external links (wrap or attach), attachments (populate the `<details>`), reply-tree edges (emit `data-reply-to` for CSS `anchor()`-based marginal lines).

- **Pass 5 — Theme.** Look up place → theme; emit `<link rel="stylesheet">` to the theme's CSS file and mark that file for inclusion in the build output (the bundler / 11ty copy step picks it up). The theme is what turns semantic mood/location classes into visual choices. Themes are a fixed palette shipped with the garden.

- **Pass 6 — Ambient.** Inject the place-level ambient audio element (autoplay-on-gesture; decision on the gesture affordance deferred to implementation).

Sub-passes may be split out later (e.g. links / attachments / reply-tree out of pass 4) without changing the architecture.

### What survives from current `11ty/`

- The three-column star-nav renderer
- Index page generator
- Home page
- `build.sh` entry point
- The general pattern of CSVS querying (now via `csvs-js` directly instead of panrec materialization)

Everything else is written fresh in `~/mm/nodes/garden/clean/`. `11ty/` is not read for design — only as reference for the listed survivors.

### What this does not decide

- The four-axis formalization (energy / valence / tension / intimacy). Composite adjectives are the working source of truth.
- Autoplay UX for ambient sound.
- Fountain transitions as star-nav column-3 anchors (the reserved role) — exact syntax deferred.
- Exact CSVS tablet names and columns for: `place-adjacent`, `place-theme`, `place-ambient`, `character-portrait`, `item-file`, `item-link`, `item-reply`. The principle — one edge per tablet, structural data only, prose stays in fountain — is fixed.
- Language persistence affordance for the JS toggle (URL fragment vs localStorage vs both).
- Linked-svg technique in pass 3 (`<img>` vs `<object>` vs `<use href>`).
- Random-scene pool: confirmed to include passthrough places.
- Migration plan for existing items / feeds / offers / prose. Each artifact is re-expressed as a place or retired. Order and sequencing deferred.

## Consequences

### Supersedes, in part

- **ADR-0002 (unified multilingual pages).** Already deprecated. The JS-hide-all-but-one mechanism in this ADR replaces the CSS `:target` toggle.
- **ADR-0004 (item-first architecture).** Items, offers, feeds are no longer distinct page types. Their content becomes utterances. Standalone landing pages survive as passthrough places.
- **ADR-0005 (places, not rooms).** Places remain viewpoints. The viewpoint body is now a sequence of utterances with mood/location classes rather than scene-cards of items.

### Preserves and extends

- **ADR-0006 (star view on a typed graph).** Unchanged as a contract. Column 3 anchors reserved to fountain transitions (open).
- **ADR-0008 (fountain scenes).** Extended: fountain is the only prose format. `fountain-js` remains the parser.
- **ADR-0010 (fountain-as-hypertext + slug-addressed prose).** Extended: parenthetical-as-uuid for utterance keys; `{slug}.{lang}.fountain` convention preserved; script filenames are not stored in CSVS, they are resolved by slug.

### Work

- A fresh build pipeline is written in `~/mm/nodes/garden/clean/`, hosted by 11ty, organized as the compilation passes above. Each pass is an 11ty transform plugin; a section njk template is used from pass 2 onward.
- `csvs-js` replaces panrec materialization inside 11ty.
- A fixed CSS theme palette and a fixed SVG portrait roster ship with the garden; SVGs are shipped as separate asset files.
- New CSVS tablets are added per the list in "What this does not decide."
- First three places in the new pipeline: (1) legal-services passthrough, (2) lx landing passthrough, (3) a poem place with fountain lyrics + audio narration attachment. A youtube-video place follows.
- Once those render, `11ty/` is retired and `clean/` is promoted.
