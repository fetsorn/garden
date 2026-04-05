---
status: proposed
date: 2026-04-04
---

# 0004 — Item-First Architecture

## Context

ADR-0003 established the spatial commerce model: World → Room → Item, with payment as in-scene interaction. The build pipeline generates room pages with offers embedded inside them. The gate (index.html) links to worlds.

In practice this means a visitor must navigate gate → world → room → offer before they understand what is being sold. The spatial metaphor serves returning visitors and curious explorers, but fails as a landing experience. A concrete case: an English student was shown the site and wanted to see a face on a white background saying "I teach English." Instead they got "A garden with two paths."

Meanwhile, the offer list has grown beyond what two worlds cleanly contain. English lessons are neither art (forest) nor science (mountain) — they are a practical service that shares a method with City Limits but serves a different audience. Translation (fatamorgana) will arrive soon. Concerts exist but have no node. Forcing these into the forest/mountain split produces awkward fits.

The current ontology already has `g:Offer` as a first-class type with `action-url`, `price`, `scene`, and `action-label`. Offers are the most pitch-ready nodes in the graph. But they render only as blocks inside room and world pages — they have no standalone URLs.

Additionally, there are two layers of offers — world-level (`g:in-world`) and room-level (`g:in-room`) — that sometimes describe the same service (e.g. `g:forest-session` and `g:city-limits-offer-session` both sell sessions at 1000₽ to the same payform). This duplication exists because world pages needed their own offers. With standalone offer pages, it becomes unnecessary.

## Decision

### Items first, rooms second

Flip the conceptual hierarchy. Items (offers, feeds, content) are the primary units. Rooms and worlds are clusters that organize items spatially, but items do not require a room to exist or to be reachable.

Every `g:Offer` gets its own page at a clean URL (e.g. `/english-lessons`, `/story-sessions`, `/translation`). The offer page is the first thing a visitor can land on. Its content is an opaque HTML file at `prose/<slug>.html` — the offer controls its own pitch, layout, and SEO copy without polluting the ontology. The TTL describes the offer's spatial identity (scene, label, price, action) for the room's benefit; the prose file is the offer's own face to the outside world.

Rooms appear as context on item pages ("This is part of City Limits"), not as containers the visitor must enter first. A visitor who lands on `/english-lessons` can follow that link into the room, or ignore it.

### Offers are opaque to rooms

The TTL carries what a room needs to present the offer in spatial context: `rdfs:label`, `g:scene`, `g:price`, `g:action-url`, `g:action-label`. These are the offer's "scene card" — how it looks from inside the room.

The offer's standalone page is rendered from its prose file (`g:prose`), not from TTL properties. This means:
- No `g:pitch` or SEO-specific properties in the ontology
- The prose file is a complete HTML fragment: headline, photo, copy, payform link, anki embeds, lesson recordings — whatever the offer needs
- The build pipeline wraps the prose in the offer page template (white, accessible, with room/navigation context added around it)
- The offer author (you) writes the pitch in HTML, not in turtle

### Remove world-level offers

World-level offers (`g:in-world g:Offer`) are removed. Each offer attaches to one room via `g:in-room`. The room page shows all its offers using their scene cards. No duplication.

### The gate links to offers

The gate (index.html) becomes:

> Anton Davydov
> I work with language.
>
> [English lessons] [Translation] [Story sessions] [Concerts] [AI & tools] [Early access]

Each link goes to a standalone offer page. Below or behind: "Explore the garden" links to the spatial navigation for those who want it.

### Worlds are provisional

The forest/mountain split (ADR-0003) was based on two revenue channels: city-limits and AI. That model no longer matches reality. Worlds may persist as a clustering layer, or may be removed. This decision does not depend on worlds — items and rooms work without them. World organization is deferred to a future iteration.

### New rooms and offer nodes

| Offer                    | Room                               | World    | Status                          |
|--------------------------|------------------------------------|----------|---------------------------------|
| English lessons          | The Classroom (new)                | forest   | new                             |
| Story sessions           | City Limits                        | forest   | exists, merge world+room offers |
| Concerts & performances  | The Parlor                         | forest   | new offer in existing room      |
| Translation              | (deferred — fatamorgana not ready) | —        | later                           |
| AI & tools / blog        | The Workshop                       | mountain | exists as feed, needs offer     |
| Early access / patronage | (cross-cutting)                    | both     | exists, deduplicate             |
| Master class             | Anamnesis                          | mountain | exists, merge world+room offers |
| Book preorder            | City Limits                        | forest   | exists, keep but no presale yet |
| Course preorder          | Anamnesis                          | mountain | exists, keep but no presale yet |

### Template structure

**Offer page** (standalone, landable):
1. Prose file content — the offer's own HTML (headline, photo, copy, payform, embedded materials)
2. Context bar — room link, adjacent offers in the same room
3. Wrapped in white, accessible base template

**Room page** (spatial, discoverable):
1. Room scene prose
2. Scene cards for each offer (`g:scene` + `g:action-label` + `g:price`)
3. Feeds and other items in the room

**Gate** (entry, direct):
1. Name + one-liner
2. Links to offer pages
3. "Explore the garden" link to spatial navigation

### Events as temporal offers

Concerts and other one-time events use `g:Offer` with a date. After the event passes, the offer can transition into a feed entry (recording, writeup). No separate `g:Event` type.

### All pages go white and accessible

All templates are redesigned: white backgrounds, readable fonts, simpler text. Spatial prose and color accents are retained but secondary to clarity.

## Consequences

- The TTL ontology gains `g:slug` on offers (for clean URLs) and uses `g:prose` to point to opaque HTML fragments.
- No new text-content properties are added to the ontology for SEO or pitch purposes.
- World-level `g:Offer` nodes are removed; their content merges into room-level offers.
- The 11ty build pipeline gains an offer page template that wraps prose HTML files in the base template.
- The gate template is rewritten from poetic to direct.
- A new room `g:classroom` is added to the forest for English lessons.
- All templates shift to a white, accessible base.
- Worlds become optional clustering, not structural requirement. Their future is deferred.
