---
status: done
---

# 0007 — Move datum from CSVS to item fountain files

## Principle

The slug is the only shared key between three sovereign sources:

- **Place fountain** — how the item appears in context (label, description, order)
- **Item fountain** — what the item is (datum/title, prose body)
- **CSVS** — structural facts (dates, names, rights, files, links)

Currently datum lives in CSVS (`item-datum.csv`). It's display text stored as relational data. Moving it to fountain completes the separation: CSVS knows what exists and how it links; fountain knows what things are called and what they say.

## Changes

### 1. Create item fountain files for items that lack them

Every item with a datum gets a `{slug}.{lang}.fountain` in `prose/`. Minimal valid file is one line — the title. Items that already have prose files keep them; datum becomes the first line or title page element.

Convention for datum in item fountain: **first action token before any section**, same as place labels. Symmetry: place fountain's first action = place label; item fountain's first action = item datum.

If an item fountain feels empty (just a title, nothing else to say), that's a signal the item may not need its own page. But create them for now — let the emptiness speak.

### 2. Collapse `items.js` and `prose.js` into one data file

One pipeline, one output per slug. The merged file:

1. Reads `raw_items.json` (CSVS structural data via panrec)
2. For each item, looks for `{slug}.{lang}.fountain`
3. If found: parses datum from first action token, renders body to HTML
4. Merges CSVS metadata (actdate, sayname, actname, copyright, audio, url, category, status) with fountain prose
5. Emits one view model per item

The permalink collision (`items.njk` vs `prose.njk` both writing to `items/{slug}.html`) disappears because there's one pipeline.

### 3. Unify item templates

`pages/items.njk` and `pages/prose.njk` become one pagination page. `_includes/item.njk` and `_includes/prose.njk` merge into one layout. The layout handles both cases:

- Item has prose body → render it
- Item has no prose body → render metadata (audio player, datum, credits)
- Item has both → render both

Category-specific sub-templates (`items/legend.njk`, `items/poem-reading.njk`, `items/default.njk`) stay — they handle structural variation in metadata display, not the prose/no-prose split.

### 4. Remove `item-datum.csv` from CSVS

Once all datum values live in fountain files, drop the CSVS tablet. Update `_-_.csv` schema accordingly (remove `item,datum` line). The graph ontology (`g:datum`) stays — it documents the concept; its storage just moved.

### 5. Delete dead code

- `lib.js` — unused, superseded by `resolve.js`
- `_includes/partials/miller.njk` — orphaned from pre-star refactor
- `pages/prose.njk` — merged into `pages/items.njk`
- `_includes/prose.njk` — merged into `_includes/item.njk`

### 6. Fix adjacent issues from the review

- `deploy.sh`: `jq -r` instead of `jq` for unquoted version string
- `feedPages.js`: pipe through human-readable label instead of raw slug for `<h1>`
- `package.json`: trim transitive deps from direct dependencies (separate commit, low priority)

## Sequence

Steps 1-3 are one atomic change (fountain files + merged pipeline + merged template). Step 4 follows once confirmed working. Steps 5-6 are independent cleanup.

## Not in scope

- Moving actname/sayname/dates to fountain — these are structured metadata, queryable by panrec. They stay in CSVS.
- Changing place fountain conventions — place labels and landmark labels stay where they are.
- Changing the slug convention itself.
