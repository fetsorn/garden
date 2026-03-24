---
title: garden — hand-crafted static site
status: done
created: 2026-03-09
supersedes: 0002-garden, 0003-garden-implementation
---

# Garden — hand-crafted static site

A static site presenting public projects as areas in a digital
garden. Served at fetsorn.codeberg.page.

## Concept

A digital garden in the tradition of public knowledge bases. Areas
grow, open, rest, and connect over time. Each area is a room with
landmarks you can see and interact with.

Atmosphere: The Longest Journey. Structure-as-navigation: 100
Rabbits. Spatial intent: website-is-a-room.

index.html redirects to the default room (study.html).

## Architecture

Two repos:

- **garden** (public, codeberg.org/fetsorn/garden) — static HTML,
  CSS, media. Source and output are the same repo.
- **quarry** (public, git.nexusnest.link/fetsorn/quarry) — csvs
  dataset: CSVs, markdowns, media via LFS. Self-hosted on
  nexusnest for CORS support. Claude reads from it on request
  when generating HTML. The garden's quarry landmark lets
  visitors browse the dataset through evenor.

Media hosting: LFS inside quarry (ADR-0006). Binary files
tracked via .gitattributes, served at
media.githubusercontent.com/media/fetsorn/quarry/refs/heads/main/lfs/{hash}.{ext}

## Design principles

1. **Spatial continuity** — item pages carry the room's visual
   identity (header, nav, color). You are zooming in, not leaving.
2. **Room as space, landmark as object** — a room page presents
   landmarks you can see. Each has spatial prose and content.
3. **Item-first authoring** — items exist as standalone artifacts
   in quarry. TTL decides where they appear. Moving an item between
   landmarks does not change its URL.
4. **Fast by default** — room pages are lightweight. Heavy assets
   (mp3, full text) live on item pages.
5. **One room per item** — an item can appear in multiple feeds
   within one room, but not across rooms.
6. **No pagination** — if a feed grows, split into another
   landmark. If landmarks grow, split into another room.

## Ontology

Defined in graph/garden.ttl, vocabulary in graph/vocabulary.md.

### Rooms

```turtle
g:study
    a g:Room ;
    g:default true ;
    rdfs:label "The Study" ;
    g:description "..."@en ;
    g:description "..."@ru .

Every room has g:description per language for visitor-facing spatial
prose. rdfs:comment is developer-facing. One room carries
g:default true — index.html redirects there.

## Landmark types

┌────────┬───────────────────────────────┬────────────────────────────┐
│  Type  │       What it presents        │         Renders as         │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Feed │ multiple items via g:category │ description + item listing │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Feed │ TTL-native links via g:entry  │ description + link list    │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Item │ single item via g:presents    │ description + single link  │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Door │ one room via g:target         │ label in navbar            │
└────────┴───────────────────────────────┴────────────────────────────┘

A Feed can use g:category (queries quarry), g:entry (inline links),
or both. In practice most feeds are one or the other.

TTL-native entries (g:entry)

Feeds may carry g:entry blank nodes with rdfs:label (per
language) and g:url. These render as links on the room page with
no item page generated. Use for external links that don't need rich
content. If an entry later needs its own page, migrate to quarry.

g:study-docs
    a g:Feed ;
    g:entry [ rdfs:label "CSVS"@en ; g:url "https://..." ] ;
    g:entry [ rdfs:label "Evenor"@en ; g:url "https://..." ] .

## Migration status (g:status)

Every landmark and entry carries g:status for tracking migration.
grep g:status garden.ttl is the checklist.

┌───────────┬────────────────────────────────────────────┐
│  Status   │                  Meaning                   │
├───────────┼────────────────────────────────────────────┤
│ live      │ link works, content exists                 │
├───────────┼────────────────────────────────────────────┤
│ draft     │ landmark in HTML, link is placeholder      │
├───────────┼────────────────────────────────────────────┤
│ pending   │ needs quarry data or content migration     │
├───────────┼────────────────────────────────────────────┤
│ ttl-ready │ TTL entry done, link works, no quarry need │
└───────────┴────────────────────────────────────────────┘

Draft/pending items render dimmed with "(coming soon)" in HTML.

## Ordering

TTL source order determines rendering order on the page. No order
property needed for landmarks. Feeds with quarry items specify
g:order-by (CSV branch name) and g:order-direction ("ascending"
or "descending") for item sort order.

## Descriptions

Every non-Door landmark has g:description per language. Missing
g:description falls back to rdfs:label, not blank space.

## Bilingual strategy

### Room pages (single file, URL fragments)

Both languages in one HTML file. Toggled via CSS :target:

- <div id="ru"> sits before both language blocks
- Default (no fragment or #en) → English
- #ru → Russian
- CSS: .lang-ru { display: none; } /
#ru:target ~ .lang-en { display: none; }
#ru:target ~ .lang-ru { display: block; }
- Door links in Russian blocks carry #ru forward
- Pure CSS, no JS

### Item pages (separate files per language)

One file per language: en/slug.html, ru/slug.html.
Language toggle links to the other language file if it exists.

### Language in quarry (event-lang.csv)

Each quarry event carries one or more lang values in
event-lang.csv. Orrery generates item pages only for languages
present. Feed listings per language only show items with a
matching lang value.

Items with both `en` and `ru` get pages in both directories
and appear in both language blocks. Items with only `ru`
(e.g. city-limits legends) appear only in the Russian block.

### Translation model

Language versions are the same item with multiple lang values,
not separate items. Metadata (dates, names, copyright) is shared.
Localized content (datum text, descriptions) may differ per
language — handled by convention in quarry, not by schema.

### Footer

English: Patreon. Russian: Boosty. Clear language delineation.

## Page anatomy

### Room page (e.g. study.html)

- Header: room illustration (placeholder img for now)
- Navbar: doors to other rooms + language toggle
- Room description: g:description spatial prose
- Body: one section per landmark in TTL source order
  - Landmark description (spatial prose)
  - Feed (quarry): list of item titles + dates, linked to
/{lang}/item-slug.html, sorted by g:order-by
  - Feed (TTL-native): list of entry labels, linked to g:url
  - Item: single title linked to /{lang}/item-slug.html
  - Draft/pending landmarks: dimmed, "(coming soon)"
- Footer: patronage link
- Styling: <body class="room-study">, CSS inline for now

### Item page (e.g. en/my-song-a3f2b7e1.html)

- Header: room illustration (smaller/dimmed)
- Navbar: same doors + language toggle
- Context line: landmark label + room label
- Back link to room page (carries #ru from Russian items)
- Body: content varies by category (song: player + lyrics,
article: full text, poem-reading: audio player + metadata,
video: embedded player)
- Footer: same as room

### Item page metadata by category

**legend**: title = "date — city", meta = actor names, body = datum

**poem-reading**: title = poem name, meta = "Read by {sayname} ·
{saydate}" + "{origin} · {actcopyright}" + "Reading licensed
{saycopyright}", body = audio player from LFS URL

### index.html

Meta redirect to the g:default room (study.html).

## Slugs

Item page slugs: readable name + 8-char hash from event UUID.
Example: wanwei-96a6e0f6.html. Stable across renames.

Room slugs derived from TTL node names (study → study.html).

## Quarry schema conventions

csvs branch names use act_ prefix for original author/creator
and say_ prefix for the person presenting/narrating.

Core event branches: event-category, event-datum, event-lang,
event-actname, event-actdate, event-actcopyright,
event-sayname, event-saydate, event-saycopyright,
event-city, event-file.

File branches: file-description, file-date, file-reference.
Reference branches: reference-hash, reference-extension,
reference-name.

LFS URL pattern:
media.githubusercontent.com/media/fetsorn/quarry/refs/heads/main/lfs/{hash}.{ext}
hosted on github to not overload self-hosted LFS requests

## Rooms

### The Study (default)

Articles, dev blog, qualified self, aipassana, documentation
(TTL-native foyer to norcivilianlabs.org), quarry (evenor
introspection of the garden's own dataset), resume, calling
cards (profiles: LinkedIn, GitHub, etc.).

### The Stage

Songs (bandcamp-embeddable), poems, stories, audio, video,
Aetherion Horizon (TTL-native YouTube feed), City Limits,
Norcivilian Reads (poem-reading feed with LFS audio).

### The Map Room

Embedded map of places and events. Migrate to leaflet from
CSVs later.

## Phased rendering

1. Text links below header image (current phase)
2. One illustration per room as header
3. Later: hotspots on image for landscape, text fallback portrait
4. Later: full point-and-click spatial interaction

Each phase independently releasable.

## City Limits

Lives inside the garden on the Stage. Its content populates
stage feeds. Independently accessible via telegram and PDFs.
Rules document lives in quarry as a landmark item.

## Norcivilian Reads

Lives on the Stage. Poem readings with audio via LFS.
Source content is the telegram channel t.me/norcivilianreads.
Migration: export from telegram, extract metadata (narrator,
author, dates, copyright), write csvs entries to quarry, add
LFS audio files. Each reading is one quarry event with
category "poem-reading".

## Content pipelines

### Adding a quarry feed item to the garden

1. Ensure event exists in quarry csvs with all branches
   (category, datum, lang, names, dates, copyright, file if
   applicable)
2. If media: add LFS file to quarry, write pointer
3. Claude reads quarry csvs + garden.ttl
4. Claude outputs item page(s) for each lang in event-lang.csv
5. Claude updates room page feed listing(s)
6. If landmark was draft: update g:status to live in TTL,
   update HTML class from status-draft to status-live
7. Human reviews, commits garden + TTL changes

### Adding a new landmark

1. Draft TTL triple in garden.ttl (type, room, status, labels,
   descriptions)
2. Claude produces HTML sections for both language blocks
3. Human writes TTL and HTML
4. If content ready: follow feed item pipeline above

## Safeguards

- Missing data → visible "(coming soon)", never a broken page
- g:status tracks what's live vs placeholder
- Link integrity: manual check before push, automated later
- Graceful degradation: missing g:description → rdfs:label
- Spatial enforcement: one room per item

## Build workflow

1. Human updates TTL and/or quarry
2. Human asks Claude to regenerate a room's HTML
3. Claude reads TTL + quarry, outputs HTML
4. Human reviews, commits, pushes to garden repo
5. Codeberg Pages serves the result

No CI. No build tool. The build is a conversation.

## File tree

garden/
  index.html              → redirect to study.html
  study.html              → bilingual room page
  stage.html              → bilingual room page
  map-room.html           → bilingual room page
  en/
    item-slug.html        → item page, English
  ru/
    item-slug.html        → item page, Russian
  img/
    study.jpg             → room illustration
    stage.jpg
    map-room.jpg
  style.css               → shared (later; inline for now)

## Sequence

1. ✅ Hand-draft study.html with all landmarks
2. ✅ Add g:status to all landmarks in garden.ttl
3. ✅ Update study.html to render status visually
4. ✅ Draft stage.html with all landmarks
5. ✅ Add quarry landmark to study (evenor → quarry introspection)
6. ✅ Add Norcivilian Reads landmark to stage
7. ✅ First reads item (wanwei) — validates LFS + bilingual pipeline
8. Migrate content landmark by landmark:
  - Find in archive/quarry
  - Update quarry CSVs if needed
  - Add event-lang.csv entries
  - Update g:status in TTL
  - Regenerate HTML
9. Draft map-room.html
10. Room illustrations
11. index.html redirect
12. Push to codeberg, verify at fetsorn.codeberg.page
13. Deprecate old landing page

## Orrery future

When the garden has 5+ rooms and 50+ items, hand-crafting becomes
friction. At that point, build orrery from accumulated HTML as test
fixtures and the proven TTL schema as input spec. Orrery may be:

- A standalone CLI that Claude invokes as a build step
- A Rust crate that reads TTL + CSV → HTML
- Tested by diffing output against hand-crafted originals

Orrery must handle:
- event-lang.csv to decide which language directories get pages
- LFS URL construction from reference-hash + reference-extension
- Category-specific item page templates (legend, poem-reading, etc.)
- Feed ordering via g:order-by and g:order-direction

Until then, every hand-crafted file is an orrery test case.
