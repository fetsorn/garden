---
title: garden HTML implementation plan
status: cancelled
created: 2026-03-08
depends: 0002-garden
---

# HTML implementation plan

## Principles

1. **Spatial continuity** — item pages carry the room's visual identity
   (header, navbar, color). You are zooming in on something in the room,
   not leaving.
2. **Room as space, landmark as object** — a room page presents landmarks
   you can see and interact with. Each landmark has a spatial description
   and content underneath.
3. **Item-first authoring** — items exist as standalone artifacts in quarry.
   TTL decides where they appear. Moving an item between landmarks/rooms
   does not change its URL.
4. **Fast by default** — room pages are lightweight. Heavy assets (mp3,
   full text) live on item pages, loaded one at a time.
5. **One room per item** — an item can appear in multiple feeds within
   one room, but not across rooms. If two rooms claim the same item,
   orrery warns and skips it.
6. **No pagination** — if a feed grows too large, split into another
   landmark. If landmarks grow, split into another room. Pagination is
   a sign of UX failure.

## Ontology additions

Rooms and landmarks gain `g:description` with language tags for
visitor-facing spatial prose. `rdfs:comment` remains developer-facing.

```turtle
g:study
    a g:Room ;
    g:default true ;
    rdfs:label "The Study" ;
    g:description "Warm light falls across a desk covered in papers. Bookshelves line the walls."@en ;
    g:description "Тёплый свет падает на стол, заваленный бумагами. Вдоль стен — книжные полки."@ru .

g:study-docs
    a g:Feed ;
    g:in-room g:study ;
    rdfs:label "Documentation" ;
    g:description "An old tome lies open on the table, its pages dense with diagrams."@en ;
    g:description "На столе лежит старый фолиант, его страницы испещрены схемами."@ru ;
    g:category "documentation" ;
    g:order-by "date_published" ;
    g:order-direction "descending" ;
    g:presents p:evenor, p:csvs, p:panrec .

### TTL-native entries

Feeds may carry `g:entry` blank nodes with `rdfs:label` (per language)
and `g:url`. These render as links directly on the room page with no
item page generated. Use for external links that don't need rich content.
If an entry later needs its own page, migrate to a quarry item.

A Feed can mix `g:category` (quarry items) and `g:entry` (TTL-native
links), but in practice most feeds will be one or the other.

## Landmark types

┌────────┬───────────────────────────────┬────────────────────────────┐
│  Type  │       What it presents        │         Renders as         │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Feed │ multiple items via g:category │ description + item listing │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Item │ single item via g:presents    │ description + single link  │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Door │ one room via g:target         │ label in navbar            │
├────────┼───────────────────────────────┼────────────────────────────┤
│ g:Entry│ inline on Feed via g:entry    │ link on room page, no item page │
└────────┴───────────────────────────────┴────────────────────────────┘

g:presents links to project nodes in core.ttl.
Every non-Door landmark has g:description per language.
Feeds specify g:order-by (CSV branch name) and g:order-direction
("ascending" or "descending") for sort order.

For `g:Item` landmarks, the landmark node name is mapped to a quarry
event ID by the orrery, which uses it as a direct lookup key.
For `g:Feed` landmarks, `g:category` queries quarry for matching items.

## Landmark and room ordering

TTL source order determines rendering order on the page. Spatial
prose and later spatial composition both require authorial control
over how visitors encounter the room. No order property needed;
orrery reads landmarks top-to-bottom as written.

## File tree

garden/
  index.html                → redirect to study.html
  stage.html                → bilingual, URL fragment toggle
  study.html
  map-room.html
  en/
    my-song-a3f2b7e1.html   → item page, English
    some-article-c9d0e4f5.html
  ru/
    my-song-a3f2b7e1.html   → item page, Russian

## Slugs

Item page slugs: readable name + 8-character hash suffix derived
from item name + quarry item ID.
Example: my-song-a3f2b7e1.html. Stable across renames, unique,
human-readable. Convention documented, not changed after launch.

Room slugs are derived from TTL node names

## Bilingual strategy

Room pages (single file, URL fragments)

Both languages rendered into one HTML file. Language toggled via
URL fragment (study.html#ru). Mechanism:

- CSS :target selectors show/hide language blocks
- No fragment or #en → English (default)
- #ru → Russian
- Language toggle is <a href="#ru">RU</a> / <a href="#en">EN</a>
- Door links inside each language block carry the fragment forward:
English block links to study.html, Russian block links to
study.html#ru. Pure CSS, no JS.

## Item pages (separate files per language)

One file per language: en/slug.html, ru/slug.html.
Content-heavy pages stay lean with separate files.
Language toggle links to the other language's file if it exists.

## Translation model

Language versions of the same content are separate items, not
one item in two forms. A Russian song and its English translation
are two independent items in quarry that happen to be historically
related. Orrery does not pair them automatically. A feed listing
for a given language only shows items that exist in that language.
If a song has no Russian version, it does not appear in the
Russian feed listing — no fallback, no placeholder.

If two items are translations of each other, that relationship
can be expressed in quarry or TTL, but it is not required. When
present, item pages can link to the other language version.
When absent, the language toggle on an item page simply has no
link for the missing language.

## Page anatomy

Room page (study.html)

- Header: room illustration
- Navbar: doors to other rooms + language toggle
- Room description: spatial prose (g:description)
- Body: one section per landmark in TTL source order
  - Landmark description (spatial prose)
  - For Feed: list of item titles (+ date), each linking to
/{lang}/item-slug.html, ordered by g:order-by /
g:order-direction
  - For Item: single item title linking to /{lang}/item-slug.html
- Footer: patronage link
- Styling: <body class="room-study">, one shared CSS file with
room-specific sections

## Item page (en/my-song-a3f2b7e1.html)

- Header: room illustration (smaller/dimmed)
- Navbar: same doors + language toggle
- Context line: landmark label + room label ("Songs — The Stage")
- Back link: "step back to the Stage" → stage.html
(or stage.html#ru from a Russian item page)
- Body: content varies by category
  - song: title, date, mp3 player, lyrics
  - article: title, date, full text
  - poem: title, date, text
  - audio/video: title, date, embedded player
- Footer: same as room

## index.html

- Meta redirect to study.html

## Orrery responsibilities

1. Parse TTL — rooms, landmarks (feeds, items, doors), descriptions,
ordering directives
2. Map TTL to quarry — resolve g:category against quarry's CSV
schema. This mapping lives in orrery. TTL declares intent (what),
orrery resolves it (how). Quarry has its own schema definition;
orrery reads it.
3. Render room pages — one per g:Room, bilingual, URL-fragment
language toggle
4. Render item pages — one per item per language, with spatial
context from claiming landmark/room
5. Render index.html — redirect to g:default true room
6. Validate before render:
  - every g:Door target resolves to an existing g:Room
  - every g:Feed has a g:category (error if missing)
  - every g:Item landmark g:presents at least one project (warn)
  - every landmark has g:description per supported language (warn)
  - every room has g:description per supported language (warn)
  - no item claimed by more than one room (error, skip item)
7. Validate after render:
  - link checker: every <a href> resolves to an existing file
  - every g:Room produced an HTML file
  - no orphan item pages (warn)

## Template contract

Room template receives:
- room.label, room.description (per language)
- room.illustration (path to header image)
- room.landmarks[] in TTL source order — each with:
  - type (Feed | Item)
  - label, description (per language)
  - for Feed: items[] (title, date, slug), ordered per
g:order-by / g:order-direction
  - for Feed with g:entry: entries[] (label per language, url)
  - for Item: item (title, date, slug)
- room.doors[] — each with label, target_slug
- languages[]

Item template receives:
- item.title, item.date, item.content
- item.category
- room.label, room.illustration, room.slug
- room.doors[]
- feed.label
- item.lang
- item.translation (slug of other-language version, if known)

Item landmarks: orrery resolves landmark node name → quarry event ID.
Feed items: orrery resolves `g:category` → quarry query.

Quarry schema: to be defined after hand-drafting HTML. The schema
becomes part of this contract — orrery needs to know how to map
g:category and g:order-by to CSV structure.

## Media

Room illustrations and media assets committed to garden repo.
Later migrated to bucket storage. Quarry may provide URLs or raw
files; orrery resolves at build time.

## Safeguards

- No silent failures: missing data → loud error or explicit warning,
never a broken page
- Idempotent builds: same TTL + same quarry → identical output
- Link integrity: post-build crawl, CI-checkable
- Incremental testability: render a room with zero items and still
get a valid page (landmark descriptions, no item links)
- Graceful degradation: missing g:description for a language
falls back to rdfs:label, not blank space
- Spatial enforcement: multi-room item collision → error + skip

## Sequence

1. Hand-draft study.html and one item page as reference HTML
2. The HTML draft informs quarry's CSV schema; add schema to
template contract
3. Add g:description to garden.ttl for rooms and landmarks
4. Validate the drafts against this plan
5. Use the drafts as orrery's rendering spec
6. Build orrery templates from the spec
7. Wire up quarry data
8. Add post-build validation
