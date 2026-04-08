---
status: proposed
date: 2026-04-08
---

# 0009 — Separation of Concerns: TTL Schema, CSVS Data, Fountain Prose

## Context

The current garden build pipeline uses a single TTL file (`graph/index.ttl`) for everything: schema declarations, structured data (status, image, adjacency), and spatial prose (via `g:description` strings and `g:prose` file references). This conflation means:

- Adding a new place requires editing TTL triples for metadata, prose paths, adjacency, items, feeds, and offers — all in one file.
- Spatial prose is either a flat string in TTL (`g:description "A room with a blackboard..."`) or a separate file referenced by a TTL triple. Neither is natural for writing.
- Structured data like status, image paths, and adjacency lives in TTL where it can't be queried with panrec or managed with the same tools as other crater data.
- The TTL file grows with every piece of content. It currently handles schema, ~8 places, ~5 items, ~6 feeds, ~3 offers, and all their relationships.

ADR-0008 introduced fountain screenplay format for LX scenes. This raised the question: if spatial prose belongs in fountain, what does TTL hold? And if structured records belong in CSVS (as they do everywhere else in the crater), what remains in TTL?

The answer: TTL holds schema. CSVS holds data. Fountain holds prose.

### How spaces currently link to items

The current `place.njk` template renders items as a heading, then a link under the heading with the same content as the heading. This is structurally redundant and visually awkward. Items are listed because TTL says `g:in-place g:city-limits` — the link is a consequence of the data relationship, rendered by the template.

In the new model, links should emerge from matching fountain tokens against CSVS records, not from template iteration over graph triples.

## Decision

### Three concerns, three formats

**TTL** — schema only. Declares what classes exist and what properties they can have. Like crater's `graph/index.ttl` which annotates CSVS relations with RDF vocabulary. Does not hold instance data.

Example:
```turtle
g:Place a rdfs:Class ; rdfs:comment "a viewpoint in the garden" .
g:Item a rdfs:Class ; rdfs:comment "an artifact in a place" .
g:adjacent a owl:ObjectProperty ; rdfs:domain g:Place ; rdfs:range g:Place .
g:in-place a owl:ObjectProperty ; rdfs:domain g:Item ; rdfs:range g:Place .
g:script a owl:DatatypeProperty ; rdfs:domain g:Place ; rdfs:comment "path to fountain file" .
```

**CSVS** — structured data. All instance records: places, items, feeds, characters, adjacency, status, images. Queryable with panrec. Managed with the same tools as all other crater data.

Example records:
```
{"_":"place","place":"city-limits","status":"live","image":"stage.jpg","script":"city-limits.fountain"}
{"_":"place","place":"city-limits","adjacent":"classroom"}
{"_":"item","item":"rules","in-place":"city-limits","label":"Rules","label_ru":"Правила"}
{"_":"character","character":"maya","label":"Maya"}
```

**Fountain** — all prose. Spatial descriptions, narrator voice, character dialogue, scenes. One `.fountain` file per place. The file is the place's voice.

Example (`prose/city-limits.fountain`):
```fountain
INT. CITY LIMITS TABLE - EVENING

A table with maps of real cities spread across it. Figurines at intersections. A deck of cards face-down.

(rules)

A laminated card with the rules of the game. Simple enough to start in five minutes.

(legends)

Transcripts pinned to the wall - stories from past sessions.
```

### Token matching at build time

Fountain stays clean — no links, no markup beyond the screenplay format. At build time, the JS build step:

1. Parses fountain into tokens (scene headings, action, character, dialogue, parenthetical)
2. Queries CSVS for records related to the current place (items, adjacent places, characters)
3. Matches token content against CSVS values:
   - **Parentheticals** match item slugs or labels → become links to items
   - **Scene headings** match place names → become links to places
   - **Character names** match character records → become links to character pages (when they exist)
4. Enriches the HTML output with links where matches occur

Action lines and dialogue are never enriched — the narrator's voice and characters' words stay as prose. Only structural tokens (parentheticals, headings, character names) become interactive.

### Build pipeline

```
TTL (schema) ──→ informs what to query
                        ↓
CSVS (data) ───→ panrec query ──→ structured records
                                          ↓
Fountain (prose) ──→ fountain-js ──→ tokens ──→ match against records ──→ enriched HTML
                                                                              ↓
                                                                         11ty ──→ pages
```

`build.sh` becomes:
1. Query CSVS for all place, item, feed, character records
2. For each place, read its fountain file
3. Parse fountain, match tokens against related CSVS records
4. Render enriched HTML
5. 11ty builds pages from the enriched data

### What this does NOT decide

- Exact CSVS tablet schema (column names, base values). Needs design.
- How feeds and offers are represented in fountain or CSVS.
- Character page design.
- Visual design of enriched links (inline, sidebar, ring, underline).
- Migration path from current TTL data to CSVS.

## Consequences

- `graph/index.ttl` shrinks to ~20 lines of schema. All instance data migrates to CSVS.
- Every place gets a fountain file. Spatial prose is authored as screenplay, not as TTL strings.
- Links in the garden emerge from data relationships matched against prose tokens, not from template iteration.
- The garden becomes queryable with panrec — "which places are adjacent to city-limits" is a CSVS query, not a TTL parse.
- All current garden content except the English lessons landing offer is research and can be discarded. The new system starts clean.
- The redundant heading-then-link pattern in place templates is eliminated. Items appear as enriched tokens in the prose where the author placed them.
