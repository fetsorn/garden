---
status: proposed
date: 2026-04-05
---

# 0005 — Places, Not Rooms

## Context

ADR-0004 established item-first architecture: offers are standalone landing pages, rooms are secondary clusters. The site now has multiple external entrances (offer pages) and the garden is an exploration layer for the curious.

The current spatial metaphor — rooms in buildings in worlds — doesn't work:

- **Rooms are claustrophobic.** A classroom, a parlor, a workshop all feel like identical boxes with different wallpaper. No sense of geography, weather, scale.
- **Worlds (forest/mountain) are a false binary.** English lessons belong to neither art nor science. The two-world split doesn't match how the work actually connects.
- **Spatial prose is AI-generated and generic.** It reads like a game designer's template, not like a real place.
- **The building metaphor breaks with many entrances.** A house has one or two doors. This site has many external landing pages feeding into the garden. A landscape has as many entry points as it has locations.

The original inspiration was The Longest Journey's Arcadia and Stark, and point-and-click adventure games where you visit rich locations with items and NPCs — not corridors with doors.

Research into design documents for TLJ and LucasArts games shows that the designers did not fully understand how their medium produced the sense of place — the medium shaped their intention. The spatial feeling emerged from the composition of backgrounds, not from architectural planning.

## Decision

### A place is a viewpoint, not a thing

A point-and-click background is not a room. It's a camera angle — a position from which certain items are visible in a certain composition. The foreground, middle ground, and background create depth. The edges lead to other viewpoints.

**Items have identity. Places have perspective.**

A cluster is defined by which items are visible from it, and how they relate to each other spatially within that view. The "spatial prose" describes what you see from a particular standpoint: what's close, what's far, what's at the edge of vision leading somewhere else.

This means:
- Places may not need names. They are positions, not landmarks. A name, if it exists, is atmospheric — what you'd call a place you've visited — not categorical.
- The same item might be visible from multiple places (in the background of one, in the foreground of another). The City Limits table visible through a doorway from the language teaching place.
- Adjacency between places is expressed through what's visible at the edges, not through a navigation menu.

### No shared horizon

Like adventure game screens, places don't share a continuous landscape. Each is a disconnected viewport into the story space. They connect through paths and edges but don't need to make geographic sense relative to each other.

### No narrative direction

Unlike games, the site has no provenance — no start gate, no exit. Visitors arrive at any point and traverse in any order. This means either:
- One narrative read out of order (the spatial prose hints at a whole, each view is a fragment)
- Emergent narrative per visitor (the sequence of views they happen to take creates its own meaning)

Both may be true simultaneously.

### Clusters and their contents

| Cluster             | Contains                                                                  | Current room    | Mood notes                                                                                                                                                                             |
|---------------------|---------------------------------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Language teaching   | English lessons offer, Anki materials, lesson recordings                  | classroom       | noon-to-evening. folded space — two rooms collapsed (teacher/student both feel the other comes to them). civilized but a bit mad. quiet between visits, anki ticking. ~10 people/week. |
| City Limits game    | Story sessions offer, rules, quick start, session legends (feed)          | city-limits     | ?                                                                                                                                                                                      |
| Poetry & music      | Poem readings (feed), songs, concert offers                               | parlor          | ?                                                                                                                                                                                      |
| Tools & code        | Evenor, CSVS, panrec docs, dev blog (feed), garden introspection (quarry) | workshop        | ?                                                                                                                                                                                      |
| Total Battle        | News feed, campaign maps, clan stories                                    | barracks        | ?                                                                                                                                                                                      |
| Worlds & film       | Yourland luanti legends, Aetherion web series                             | floating-island | ?                                                                                                                                                                                      |
| Legal & translation | Translation offer, academic articles, Saleilles, orphan works             | legal-archive   | ?                                                                                                                                                                                      |
| Self-practice       | Anamnesis method, master classes, AI course (when ready)                  | anamnesis       | ?                                                                                                                                                                                      |

### Open questions per cluster

#### Language teaching
- The folded-space idea: two desks merged, jitsi screen glowing in the middle ground. Does the madness show in the composition — normal objects (schedule, cards) next to slightly wrong ones (two rooms overlapping)?
- City Limits table visible in the background — through a doorway? Through a window? At the edge of the view?
- What's the quality of silence between lessons? Empty classroom, or more like a waiting room where anki hums?

#### City Limits game
- The game is about real cities. Is the viewpoint FROM a city? A rooftop overlooking a grid of streets? A crossroads at night?
- Does it feel like night (sessions happen in the evening) or timeless?
- The legends feed — are they visible as objects in the scene (papers on walls, a book) or as part of the landscape (names carved into pavement)?

#### Poetry & music
- Where do you read poems? What do you see when you read aloud?
- Is this the most open/public-feeling viewpoint?
- Concerts — same viewpoint or a different one nearby, visible at the edge?

#### Tools & code
- The quarry (garden introspection) is already named as an item. Does the whole viewpoint take on quarry character — open-air, stone, exposed structure?
- Is the workbench in the scene, or does the viewpoint look outward from the workbench?
- Dev blog entries — are they visible objects or background texture?

#### Total Battle
- Is this viewpoint looking at a war table from above, or standing in a landscape of fortifications?
- Isolated from the rest of the map or connected?
- Tone: serious or playful?

#### Worlds & film
- Aetherion was a floating island. Does the viewpoint look UP at something floating, or look OUT from something elevated?
- Yourland legends — same viewpoint or different?
- Is this the most fantastical/unreachable-feeling position?

#### Legal & translation
- Archive was the current room. Is the viewpoint inside shelves looking out, or outside looking at a structure full of documents?
- Translation as a service — does the offer feel at home in this viewpoint?
- Dust, precision, or both?

#### Self-practice
- Anamnesis is a mirror practice. Does the viewpoint include reflective surfaces — water, glass, mirror?
- Is this the most private/inward-looking position?
- What's visible at the edges — does anything else connect from here?

### The map

The index.html becomes a map — a spatial-prose map or an illustrated one. It shows all positions and the paths between them. Unlike the places themselves (which are viewpoints), the map is a view from above — the one position from which everything is visible but nothing is close.

Clicking a place on the map enters that viewpoint.

### Spatial prose is author-written

All viewpoint descriptions will be written by the human. The AI proposes structure (which items are visible, foreground/background composition). The human writes what it feels like to stand there.

The ontology carries:
- Which items belong to which place (`g:in-place`)
- Adjacency hints: which places are visible from which (`g:adjacent` or `g:edge`)
- Composition hints: foreground/background ordering of items within a place

The prose carries:
- What it feels like to be there
- Time of day, weather, mood
- What you notice first, what you notice last

## Consequences

- `g:Room` is renamed to `g:Place`. Semantics change from container to viewpoint.
- `g:World` is removed. No hierarchy above places.
- Places may gain `g:adjacent` triples for edge-of-view connections.
- Items may gain composition metadata (foreground/background) within their place.
- The map (index.html) replaces the gate. It links to places, not offers.
- Offer landing pages remain outside the build. They link to their place (the viewpoint that includes their items).
- Current AI-generated spatial prose is removed. Replaced incrementally as the human writes each viewpoint.
- Miller columns become optional/secondary.
- Place names are optional and atmospheric, not categorical.
