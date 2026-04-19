---
title: orrery — garden build tool
status: cancelled
created: 2026-03-09
---

# Orrery — garden build tool

Generates garden HTML from TTL + JSON. 

## Architecture

TTL (garden.ttl) ──┐
                    ├──→ orrery ──→ HTML (pages branch in garden repo)
JSON (SON format) ──┘

Orrery takes two inputs:
- **TTL**: rooms, landmarks, descriptions, status, ordering
- **JSON**: quarry data in Store Object Notation (SON) format
  per nlkb/src/csvs/specs/store_object_notation.md

Orrery does NOT know about:
- CSVS (csvs-cli or panrec produce the JSON)
- LFS or git (URLs are already in the JSON data)
- How data got into the quarry

## Data flow

1. Human updates quarry (csvs) and/or garden.ttl
2. csvs-cli queries quarry, outputs SON JSON per feed category
3. orrery reads TTL + JSON, outputs HTML
4. Human diffs against existing HTML, commits

## Inputs

### TTL → room and landmark structure

Orrery parses garden.ttl for:
- Rooms: labels, descriptions (en/ru), default flag
- Landmarks: type (Feed/Item/Door), room, status, labels,
  descriptions, category, order-by, order-direction
- Entries: TTL-native links (rdfs:label + g:url)
- Doors: target room

### JSON → quarry data per category

For each Feed landmark with g:category, orrery expects a SON
query result. Example for category "poem-reading":

```json
{ "_": "event", "event": "96a6e0f6-...", "category": "poem-reading",
  "datum": "fetsorn's reading of wanwei",
  "lang": ["en", "ru"],
  "sayname": "fetsorn", "saydate": "2026-02-20",
  "saycopyright": "CC-BY-NC-SA",
  "actcopyright": "public domain",
  "file": { "_": "file", "file": "c0a9b3df-...",
    "description": "wanwei", "date": "2026-02-20",
    "reference": { "_": "reference", "reference": "0451aee0-...",
      "hash": "171736ae...960", "extension": "ogg",
      "name": "voice_20-02-2026_23-38-11.ogg" } } }

## Outputs

### Room pages (study.html, stage.html, etc.)

- Bilingual, CSS :target toggle
- Landmarks in TTL source order
- Feed items filtered by event-lang, sorted by g:order-by
- Draft/pending landmarks dimmed with "(coming soon)"
- Doors in navbar

### Item pages (en/slug.html, ru/slug.html)

- One per lang value in event data
- Slug: readable-name + 8-char UUID prefix
- Category-specific body template

### index.html

Meta redirect to default room.

## Category templates

Each category maps to an item page template:

legend: title = "{date} — {city}", meta = actnames,
body = datum text

poem-reading: title = datum or file description,
meta = "Read by {sayname} · {saydate}" + origin/copyright,
body = <audio> element, src from reference hash+ext

article, song, poem, blog: TBD as items are
added. Each hand-crafted item page defines the template.

## Validation (orrery validate)

Run before build. Checks:
- Every landmark has g:in-room pointing to a valid room
- Every Feed has g:category or g:entry (or both)
- Every g:status is a known value
- Every g:target on a Door points to a valid room
- No duplicate landmark IDs
- Descriptions exist for all non-Door landmarks
- Bilingual: every g:description has both @en and @ru

## Diff mode (orrery diff)

Compare generated HTML against existing garden HTML. Output
a summary of changes. Human reviews before committing. This
is the primary safeguard against drift.

## Test fixtures

Every hand-crafted HTML file in the garden repo is a test
fixture. Orrery's correctness is measured by producing output
identical to the hand-crafted originals. As new items are
added by hand, they automatically expand the test suite.

## Milestones

1. TTL parser + validator — read garden.ttl, run validation
checks, report errors. 
2. Room page generator — TTL + JSON → room HTML. Test against
study.html and stage.html.
3. Item page generator — category templates for legend and
poem-reading. Test against existing ru/ and en/ pages.
4. Diff mode — compare output against garden repo.
5. Full pipeline — csvs-cli query → orrery build → diff →
commit. AI no longer needed for HTML generation.

## Decisions
                  
  - Orrery alongside (~/mm/codes/garden).
  - TTL parsing uses existing Rust crates @frogcat/ttl2jsonld.
  - JSON input via stdin. 
    This allows jq filters between csvs-cli and orrery for
    transformations, field selection, or debugging.
