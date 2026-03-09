---
title: garden — public digital garden
status: done
created: 2026-03-08
---
                
# garden

A static site presenting public projects as areas in a digital garden.
Served at fetsorn.codeberg.page.

## Architecture

Three repos:

- **crater** (private) — TTL ontology graph, plans, decisions, focus.
  Defines what areas exist, how they connect, what concepts they hold.
- **quarry** (public, codeberg.org/fetsorn/quarry) — CSVs, markdowns,
  media. Public dataset. Standalone — usable with evenor or any tool
  that reads the CSV tablet format.
- **garden** 
  - main branch (public, codeberg.org/fetsorn/garden main branch) — build tool.
    Reads a TTL ontology map + CSVS tablets → generates a static site.
  - pages branch (public, codeberg.org/fetsorn/garden pages branch) — generated output.
    Static HTML. Build artifact, not source. Served at fetsorn.codeberg.page.

## Data flow

crater (TTL)  +  quarry (CSVs/media)
         \          /
          orrery build
              |
       garden (static HTML)
              |
     fetsorn.codeberg.page

## Concept

Each area is defined in crater's TTL (structure, connections),
filled from quarry's CSVs (content), and rendered by orrery into
a page with an illustrated header image and text navigation.

A digital garden in the tradition of public knowledge bases that
blend web content. Areas grow, open, rest, and connect over time.

Reference: The Longest Journey for atmosphere. 100 Rabbits for
structure-as-navigation. Website-is-a-room for spatial intent.

## Areas

### Launch

- **The Stage** — poems, songs, stories, game rules, audio.
- **The Study** — methods, academic articles, evenor documentation.
- **The Map Room** — embedded umap. Migrate to leaflet from CSVs later.

### Later

- **The Archive** — evenor web UI over quarry dataset.
- **The Ancestral Shrine** — genealogy. CSVs → dot → SVG.
- More areas as projects need public visibility.

## Phased rendering

1. TTL defines area and connections
2. CSVs populate content
3. One illustration per area as header (art by author and sister)
4. Text links below image — works portrait and landscape
5. Later: hotspots on image for landscape, text fallback for portrait
6. Later: full point-and-click spatial interaction

Each phase is independently releasable.

## City Limits

Lives inside the garden. Its content populates the stage and map room.
Independently accessible via telegram and PDFs. The garden is the
funnel; City Limits is one of the things growing in it.

## Revenue

Patreon / Boosty. One funnel. Publications as products.

## Bilingual

RU/EN. Narratives and pins in both languages. Dev blog in mixed form.

## Out of scope

Evenor dev branch refactor, TotalBattle, Aetherion, Aipassana,
Ledger. These remain independent crater projects. The garden gives
them a potential future area if they need public visibility.
