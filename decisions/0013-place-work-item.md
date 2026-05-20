---
status: accepted
date: 2026-05-20
---
# Two entities: place and item

## Context and Problem Statement

ADR-0012 unified everything into "place." In practice, fountain transcripts (recordings) and plain-prose pages behave so differently that the code constantly checks type to decide rendering path. Fountain leaves have speakers in prose, never use author metadata, and don't need their own page. Places have author, plain prose, and render as utterances. These are fundamentally different entities.

An attempt at three entities (place, work, item) created overlap — some slugs needed to be both a place and a work.

## Decision Drivers

* Fountain transcripts and plain-prose places are mutually exclusive in metadata and rendering
* Items (recordings) don't need pages — they're consumed by their parent place
* Portraits derive from author name by convention (`{author}.svg`), no separate tablet needed
* No slug should belong to multiple entity types

## Decision Outcome

Two entities: **place** and **item**.

### Place

- Has plain prose per lang (short description)
- Optional author (for portrait on parent page)
- Links to child places via `place-interior` (feeds → works, crossroads → feeds)
- Links to items via `place-item` (works → recordings)
- Has a generated page
- Optional `place-passthrough` — link target for this place is a static HTML URL instead of generated page
- `place-adjacent` for navbar, `place-theme` for CSS, `place-ambient` for background audio

**Page rendering:**
- If place has items → parse items' fountain, render as utterances with dialogue/lyrics structure
- If place has interior → render child places' prose as utterances with author portraits
- If place has passthrough → links from parent pages go to passthrough URL

### Item

- Has fountain prose per lang (transcript with speakers, dialogue, lyrics)
- Has `item-remote` (audio/media URL)
- No page generated
- No author — speaker comes from fountain character line
- Identity is content hash (sha256)

### Tablets

```
_-_.csv:
item,remote
place,adjacent
place,ambient
place,author
place,interior
place,item
place,passthrough
place,theme
```

### Prose

```
prose/slug.lang — per-language prose file
```

- **Place prose**: plain text. Short description rendered as utterance on parent page.
- **Item prose**: fountain format. Dialogue with speakers, lyrics. Parsed and rendered on parent place's page.

Existence = lang availability. If `slug.en` exists, the entity has English content.

### Portraits

Derived from `place-author` value: `portraits/{author}.svg`. No tablet needed.

### Peek

Walk `place-item` and `place-interior` recursively to find items with `item-remote` in current lang. Bubble up as audio player on the utterance.

### Example

```
place: crossroads
  prose: "you stand at a crossroads"
  place-adjacent → stage, theatre, concert
  place-interior → english-lessons, legal

place: stage
  prose: "norcivilian reads" (en/ru/hy/zh)
  place-adjacent → crossroads
  place-interior → because-i-do, wanwei, ...

place: because-i-do
  prose: "because I do not hope to turn again"
  place-author: norcivilian
  place-item → 9ecfb2c1b0ac...

item: 9ecfb2c1b0ac...
  prose: (fountain transcript)
  item-remote: http://...9ecfb2c1b0ac....ogg

place: english-lessons
  prose: "Lived experience of English"
  place-passthrough: ./english-lessons-page.html
```

## Links

- Supersedes ADR-0012 (place as only entity)
- Extends ADR-0007 (identity and location)
