---
status: accepted
date: 2026-03-31
---

# 0003 — Garden as Spatial Commerce

## Context

The garden (fetsorn.website) is a multilingual static site built with 11ty. It currently has three rooms (study, stage, map-room) with tab navigation and a "services" footer hack linking to a plain-text price list. Plan 0007 identified two flowers — city-limits (TTRPG, performance, world-building) and nmnss (AI literacy, anamnesis, structured memory) — as the garden's two product paths. The site needs a layout and navigation overhaul that makes the flowers visible, serves two different audiences, and integrates payment without breaking the spatial metaphor.

## Decision

### Two worlds, two flowers

The garden has two worlds. Each world is rooted in one flower — a product path that everything in that world serves.

- **Warm world** (mythic, forest-like) — the city-limits flower. Audience: TTRPG players, language learners, people drawn to performance and lore. Products: sessions, patron subscription, book/module.
- **Cold world** (precise, mountain-like) — the nmnss flower. Audience: people interested in AI literacy, self-witnessing, structured memory, yoga/therapy practitioners. Products: master classes, patron subscription, book/course.

Each world contains buildings, each building contains rooms. World → Building → Room is the ontological hierarchy. All levels carry spatial names (the stage, the study, the hearth, the workshop — not "blog" or "documentation").

### Miller column navigation

Navigation uses miller columns instead of tabs. Three columns show the hierarchy progressively: clicking a world reveals its buildings in the next column; clicking a building reveals its rooms in the third column. This makes the structure spatial — you are drilling into a place, not picking from a flat menu.

```
[World]           [Building]        [Room]
─────────         ──────────        ──────
● warm world        ● the stage       ● sessions
  cold world          the hearth        legends
                      the archive       ...
```

Small buildings show all their rooms inline on the building page. Large rooms break out to the third column level.

### Payment as in-scene interaction

In point-and-click games you don't go to a payment room. You interact with things where they are. The innkeeper offers you a room. The blacksmith offers you a sword. The exchange happens in the scene, not in a menu.

Payment is not a place — it is the primary interaction of each room. The spatial prose leads the visitor to the offer naturally:

> *The stage is set for tonight's session. Two chairs, a candle, a deck of cards. The next game is April 12th.*
>
> **[Take a seat — book a session]**
>
> *On the shelf: a bound manuscript, the first chapter dog-eared...*
>
> **[Pick up the book — preorder]**
>
> *Below the window, a guest ledger lies open.*
>
> **[Sign the ledger — become a patron]**

Each room has three layers in visual hierarchy:

1. **Scene** — spatial prose, atmosphere, what you see
2. **Primary object** — the thing you can buy/book, described as part of the scene
3. **Paths** — navigation to other rooms (secondary, below the offer)

Patron subscription appears in every room as a recurring object (guest ledger, membership card) skinned to match the local world aesthetic. The payment form is a shared overlay/modal triggered by the object interaction — the visitor stays in the room.

### Room-level styling

Each room has its own visual mood: background color, potentially background music, eventually character art. The warm world skews amber/green/theatrical. The cold world skews higher contrast, cooler tones, more whitespace. The gate (landing page) is neutral — dawn light, minimal, sorts the visitor toward one of the two worlds.

### Composting

Existing projects that haven't found their voice through a flower yet (saleilles, orphan-works, legal-entities, etc.) do not get placeholder pages. They are composted later through archive work. The structure simply leaves room for new rooms and feeds to appear inside each world's buildings as content is ready.

## Consequences

- The garden TTL ontology needs a world layer above buildings (currently rooms). Rooms become the third level.
- The navbar template is replaced by a miller column component.
- Room templates gain an offer section between scene prose and navigation paths.
- CSS shifts from one dark theme to per-room/per-world color schemes.
- The footer "services" hack is removed; payment lives inside rooms.
- Naming is kept simple and universal for multilingual support — spatial nouns (forest, mountain, stage, study), not English idioms.
