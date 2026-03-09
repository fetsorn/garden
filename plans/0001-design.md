---
title: orrery — garden build orchestration
status: active
created: 2026-03-09
supersedes: previous 0007-orrery draft
---

# Orrery — garden build orchestration

A build repo that wires together existing tools to produce a static
HTML garden from a TTL structure graph and a CSVS content dataset.
Not a site generator — a set of scripts around 11ty.

## Problem

The garden (a bilingual static site at fetsorn.codeberg.page) is
currently hand-crafted HTML produced by AI conversation. This is
fragile, unreproducible, and blocks the human from working
independently. The garden needs a deterministic build.

## Principle

TTL is structure. CSVS is content. Any deviation from that split
is a design failure. Orrery orchestrates existing tools — it does
not parse TTL, query CSVS, or generate HTML itself.

## Tools (all external, all replaceable)

| Tool         | Role                          | Install              |
|--------------|-------------------------------|----------------------|
| ttl2jsonld   | TTL → JSON-LD conversion      | npm @frogcat/ttl2jsonld |
| csvs-cli     | CSVS dataset → JSON (SON)     | cargo install csvs-cli |
| jq           | JSON reshaping                | system package       |
| 11ty         | JSON + templates → HTML       | npm @11ty/eleventy   |

## Data flow

garden.ttl ──→ ttl2jsonld ──→ _data/garden.json (JSON-LD)
                                      │
quarry (csvs) ──→ csvs-cli ──→ jq ──→ _data/quarry.json (SON)
                                      │
                              11ty build
                                      │
                              _site/ (static HTML)
                                      │
                              deploy to garden repo

## Repo structure

orrery/
  package.json          # 11ty + ttl2jsonld as deps
  eleventy.config.js          # 11ty config: input/output dirs, filters
  build.sh              # orchestration script
  _data/
    garden.json         # generated: TTL structure as JSON-LD
    quarry.json        # generated: quarry data as SON JSON
  _includes/
    room.njk            # room page template (bilingual)
    item-legend.njk     # item page template: legend category
    item-poem-reading.njk  # item page template: poem-reading
    item-default.njk    # fallback item template
    partials/
      navbar.njk        # doors + language toggle
      footer.njk        # patronage links
      head.njk          # shared
  pages/                # 11ty page generators (one per room type)
    rooms.11tydata.js   # derives room pages from garden.json
    items.11tydata.js   # derives item pages from quarry.json
  style.css             # shared styles
  tests/
    fixtures/           # hand-crafted HTML from garden repo
    snapshot.test.js    # diff generated output against fixtures

## build.sh

grows with each milestone

```bash
#!/usr/bin/env bash
set -euo pipefail

QUARRY="${QUARRY:-$HOME/mm/lodes/quarry}"
TTL="${TTL:-garden.ttl}"  # path to garden.ttl 

# 1. TTL → JSON-LD
npx ttl2jsonld "$TTL" > _data/garden.json

# 2. CSVS → JSON per category
# csvs-cli queries return SON arrays; jq merges them
categories=$(jq -r '.. | objects | .["g:category"]? // empty' _data/garden.json | sort -u)

echo '{}' > _data/quarry.json
for cat in $categories; do
  csvs-cli query "$QUARRY" "{\"_\":\"event\",\"category\":\"$cat\"}" \
    | jq --arg cat "$cat" '{($cat): .}' \
    | jq -s '.[0] * .[1]' _data/quarry.json - > _data/content.tmp.json
  mv _data/content.tmp.json _data/quarry.json
done

# 3. 11ty build
npx @11ty/eleventy

echo "Build complete: _site/"
```

### notes:

jq -s '.[0] * .[1]' does shallow object merge — if two categories ever had the same key, one silently wins. Also, spawning jq N+1 times in a loop is slow. Consider a single jq invocation that merges all category JSON files at the end

g:category is a flat string key in the JSON-LD output.

## Input contract: garden.json (JSON-LD from TTL)

After ttl2jsonld, the JSON-LD preserves TTL semantics. 11ty
templates navigate it via JavaScript data files that reshape
JSON-LD into template-friendly structures. Key shapes:

- Room: type g:Room, has rdfs:label, g:description (en/ru),
optional g:default
- Feed: type g:Feed, g:in-room → room, g:category or g:entry,
g:status, g:order-by, g:order-direction
- Item: type g:Item, g:in-room → room, g:status,
g:description, g:presents
- Door: type g:Door, g:in-room → room, g:target → room

11ty data files (rooms.11tydata.js, items.11tydata.js) contain
the logic to walk JSON-LD and extract these. This is the only
place that knows JSON-LD structure.

## Input contract: quarry.json (SON from csvs-cli)

Keyed by category. Each category contains an array of events
in Store Object Notation. Key fields per event:

- event (UUID), category, datum, lang (array)
- actname, actdate, actcopyright (original author)
- sayname, saydate, saycopyright (presenter/narrator)
- city
- file → reference → hash, extension, name

LFS URL pattern:
media.githubusercontent.com/media/fetsorn/quarry/refs/heads/main/lfs/{hash}.{ext}
quarry is hosted on github for access to lfs. If this ever moves, templates break silently. Worth either making this a config variable in build.sh or noting the assumption.

## Output contract: HTML pages

### Room pages ({room-slug}.html)

- Bilingual in one file, CSS :target toggle (#ru)
- No fragment or #en → English. #ru → Russian.
- Navbar: doors to other rooms + language toggle
- Room description (g:description spatial prose)
- Landmarks in TTL source order (JSON-LD @list or array order)
- Feed with g:category: item titles + dates, linked to
/{lang}/item-slug.html, sorted by g:order-by
- Feed with g:entry: label + link list (no item pages)
- Item landmarks: single link
- Draft/pending landmarks: dimmed, "(coming soon)"
- Footer: EN → Patreon, RU → Boosty

### Item pages ({lang}/{slug}.html)

- Slug: readable-name + 8-char UUID prefix (e.g. wanwei-96a6e0f6)
- One file per language present in event-lang
- Category-specific body:
  - legend: title "{date} — {city}", meta = actor names,
body = datum text
  - poem-reading: title = datum, meta = narrator/dates/copyright,
body =  with LFS URL
  - article/song/poem/blog: TBD, add templates as content
appears
- Context line: landmark label + room label
- Back link to room page (carries #ru for Russian items)

### index.html

Meta redirect to g:default room.

## Language handling

- Room pages: both languages in one file, CSS :target toggle.
Door links in Russian blocks carry #ru forward. Pure CSS, no JS.
- Item pages: separate files per language (en/slug.html,
ru/slug.html). Language toggle links to other file if it exists.
- Items only appear in feed listings for languages they carry in
event-lang. No fallback, no placeholder for missing languages.

## Validation

Implement as a separate script (validate.sh or node script) that
runs before build:

### Structure validation (garden.json)

- Every landmark has g:in-room pointing to a valid room
- Every Feed has g:category or g:entry (or both)
- Every g:status is a known value (live/draft/pending/ttl-ready)
- Every Door g:target points to a valid room
- No duplicate landmark IDs
- Every non-Door landmark has g:description in both @en and @ru
- Every room has g:description in both @en and @ru

### Content validation (quarry.json)

- Every category referenced in garden.json exists in quarry.json
(warn if empty)
- Every event has a UUID
- Every event with file reference has hash and extension
- lang is present and is an array

## Post-build validation (_site/)

- Every  resolves to an existing file
- Every room produced an HTML file
- No orphan item pages (pages without a referring feed)

## Snapshot testing

Hand-crafted HTML files from the garden repo serve as test
fixtures. The test suite:

1. Copies fixture HTML to tests/fixtures/
2. Runs build with the same TTL + quarry data
3. Diffs generated output against fixtures
4. Reports structural differences (ignoring whitespace)

This is the primary safeguard. Every hand-crafted page is a
test case. When orrery output matches all fixtures, the build
is trustworthy.

As the garden grows, Rust tooling may replace parts of this
(validation, snapshot diffing, JSON schema enforcement) — but
only when JS/shell becomes the bottleneck, not before.

## Milestones

1. [X] Scaffold — repo, package.json, .eleventy.js, build.sh
that produces an empty site from a minimal TTL
2. Room pages — room template renders study.html and
stage.html from garden.json. Test against fixtures.
3. Feed listings — csvs-cli integration, item listings on
room pages sorted correctly
4. Item pages — legend and poem-reading templates. Test
against existing en/ and ru/ pages.
5. Validation — pre-build and post-build checks
6. Snapshot tests — automated diff against fixture HTML
7. Full pipeline — build.sh end-to-end, output matches
the current garden repo

## What orrery does NOT do

- Parse TTL (ttl2jsonld does that)
- Query CSVS (csvs-cli does that)
- Generate HTML from scratch (11ty does that)
- Manage media files or LFS (quarry does that)
- Deploy (human pushes to codeberg)

## Paths

- Orrery repo: ~/mm/codes/orrery
- Garden repo: ~/mm/codes/garden (output target)
- Quarry: ~/mm/lodes/quarry (CSVS dataset)
- garden.ttl: provided as input 
