---
status: accepted
date: 2026-05-23
---
# Content warnings as place-level labels

## Context and Problem Statement

Places displayed as interior utterances on a parent page have no way to carry metadata that signals content advisories, copyright, or editorial highlights (e.g. favorites). We need a mechanism that:

- works for multiple use cases (content advisories, licensing, editorial picks)
- supports i18n labels
- renders as plain text now with a path to SVG icons later

## Decision Drivers

* Labels must be per-place, not per-item — the place is the unit of curation
* Multiple warnings per place are needed (e.g. both "language" and "CC-BY-4.0")
* Labels must render in the reader's language
* The system should reuse existing infrastructure (prose files, csvs tablets)
* Plain text first, icons later

## Considered Options

1. Freeform text field on each place (like a description)
2. Enum/fixed vocabulary with hardcoded labels
3. Warning slugs with prose files for i18n labels (reuse existing prose system)

## Decision Outcome

Option 3 — warning slugs with prose files.

### Data model

New tablet `place-warning.csv` with pairs:

```
some-place-slug,favorite
some-place-slug,language
other-place-slug,CC-BY-4.0
```

Each warning value (e.g. `favorite`, `language`, `CC-BY-4.0`) is a slug that can have prose files for localized labels:

```
csvs/prose/favorite.en  →  ★
csvs/prose/favorite.ru  →  ★
csvs/prose/language.en  →  language
csvs/prose/language.ru  →  мат
```

Falls back to the slug itself if no prose file exists.

### Rendering

- On interior utterance rows: warning tags appear as `<span class="warning-tag">` between blockquote and dates
- On the index page: warning tags appear inline after the place link
- Each tag carries `data-warning` attribute for future CSS-based SVG icon replacement
- `favorite` gets a distinct warm highlight; others get neutral gray

### Catalog integration

- `00-catalog.js` reads `place-warning.csv` into a multi-map (place → [warning slugs])
- `warningLabel(slug, lang)` resolves a warning slug to its localized prose, cached
- `pairs()` in `00-csvs.js` returns `[]` if the tablet file doesn't exist (graceful)

## Related decisions

Also implemented in this session but not requiring separate ADRs:

- **Markdown in dialogue**: item and interior utterance text is now rendered through markdown-it with highlight.js for fenced code blocks, replacing raw `<p>` wrapping
- **Remote type detection**: `item-remote` URLs are classified by extension — audio gets a player, video gets `<video>`, images get `<img>`, other URLs get a link icon
- **Interior backlinks**: places that are interior children now show their parent(s) in the navbar
- **Index restructured**: index page shows all places by default (unless `access=private`), grouped per language, structured by `place-interior` depth
