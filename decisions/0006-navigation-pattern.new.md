---
status: proposed
date: 2026-04-05
---

# 0006 — Navigation Pattern: Star View on a Typed Graph

## Context

ADR-0005 proposed replacing rooms with places (viewpoints) connected by adjacency. This raises the question: how does a visitor navigate between places and discover items within them?

The garden's underlying data is a graph with two edge types:
- **place → place** (adjacency: "you can go there from here")
- **place → item** (membership: "this is here")

At any position in the graph, the visitor needs to see both: where they can go, and what's at the current position. The UI must project both edge types simultaneously and update when the visitor moves.

## Options Considered

### Miller columns (classic)

Miller columns work on trees: each column is a fixed level in a hierarchy (e.g. folder → subfolder → file). Clicking an item in column N populates column N+1. The columns are stable because tree levels don't change.

**Rejected because:** the garden is a graph, not a tree. There is no fixed hierarchy. When you move to a different place, the set of adjacent places changes — the first column would rearrange on every click. As the human noted: "if we were to put multiple 'adjacent to here' items and scroll them, the first column would change every time. maybe what we have is no longer a miller column, but some sort of other ui."

### Miller columns with computed crossroads

An intermediate idea: declare crossroads as hub nodes containing multiple places. The miller hierarchy would be crossroads → place → items.

**Rejected because:** "if places are connected to each other, they themselves are crossroads." A place with many adjacencies IS a crossroads. Declaring separate crossroads nodes duplicates what the adjacency graph already expresses. "Maybe both first and second column lists the places, but it's places of different level of adjacency."

### Two-panel browser (sidebar + content)

Standard UI pattern: static navigation sidebar on the left, content on the right. File managers, email clients, wikis.

**Rejected because:** "browser and sidebar assume static ontology. we are more of a graph with multiple dimensions or typed edges." The sidebar in a file manager doesn't change when you select a file. In the garden, the navigation neighborhood shifts with every move.

### Roguelike / fog-of-war adjacency

Show the current place and its items. Adjacent places appear as exits (links at edges of content). Clicking an exit replaces the entire view.

**Considered but insufficient:** this works for the walking experience but provides no structured overview. It's just links in context. The human wanted something more structured than "just links at the bottom."

### Faceted search

Faceted search UIs let users filter by multiple dimensions using checkboxes, sliders, etc.

**Rejected because:** faceted search implies filtering a large set by constraints. The garden navigation is traversal, not filtering. "Faceted search ui usually is different, with checkboxes."

### Node-link browser (Wikipedia model)

Each page shows content with inline links to other pages. Clicking a link replaces the whole page.

**Considered but insufficient:** doesn't separate the two edge types (adjacency and membership). In Wikipedia, navigation links and content are mixed in one stream. The garden needs them visually separated.

## Decision

### Three-column star view on a typed graph

The navigation UI has three columns:

| Column 1: Adjacent places | Column 2: Current place | Column 3: Items here |
|---------------------------|------------------------|---------------------|
| City Limits               | ● Language teaching    | English lessons     |
| Self-practice             |                        | Anki deck           |
|                           |                        | Lesson recordings   |

- **Column 1** shows places reachable from the current position (adjacency edges). This is the fog-of-war: only neighbors are visible, not the whole graph.
- **Column 2** shows the current place. Always exactly one item in this column. This is where you are.
- **Column 3** shows items at the current place (membership edges). This is what's here.

Clicking a place in column 1 moves you there: column 2 updates to the clicked place, column 3 shows its items, and column 1 repopulates with the NEW place's neighbors.

### Why the single-item middle column exists

The middle column always contains exactly one item — the current place. This seems redundant: why not just have column 1 (places) and column 2 (items), with "selected" highlighted in column 1?

Because selecting a place in column 1 would change what else appears in column 1 (the adjacent places). "What is selected would change what is adjacent and create a sense of disorientation in the first column." The fixed middle column provides an anchor: column 1 can fully repopulate without the visitor losing track of where they are. The current place is always visible, stable, in the center.

### Terminology

The pattern is a **typed star view**: at each node, the graph star (all edges from that node) is projected into panels grouped by edge type. The star moves with the visitor.

Existing UI/visualization terms considered:
- **Fisheye view** (HCI) — focus node detailed, neighbors visible, rest hidden. Close but usually refers to continuous distortion, not discrete panels.
- **Ego graph / ego network** (graph theory) — subgraph centered on one node showing direct connections. Correct for the data structure but not a UI pattern name.
- **Fog-of-war adjacency** (game design) — see what's adjacent, nothing else. Correct for the behavior but doesn't capture the typed-edge structure.
- **Local graph navigation** — accurate but generic.
- **Faceted star browser** (knowledge graph visualization) — at a node, edges faceted by type. "Faceted" is overloaded and implies filtering.

The most precise description: **a three-column star view on a typed graph, where column 1 projects adjacency edges, column 2 anchors the current node, and column 3 projects membership edges.**

### The map is separate

The star view is the walking navigation — local, fog-of-war, no overview. The map (index.html) is a separate concern: a god-view showing all places and connections. The map allows jumping to any place directly. The star view allows traversal through the graph.

Both exist simultaneously. The map is always accessible (like an inventory item in a point-and-click game). The star view is the primary navigation within the garden.

## Consequences

- The current miller column implementation is replaced with a three-column star view.
- The TTL needs `g:adjacent` triples between places.
- The nav data layer computes the local star (neighbors + items) per place instead of a global tree.
- Column 1 content is dynamic — it changes when you move. Column 2 is always one item. Column 3 is the item list for the current place.
- Places with many adjacencies naturally feel like hubs. Places with few adjacencies feel like dead ends. The topology creates the navigation experience without explicit crossroads declarations.
- The map (index.html) is designed separately and may use a different visualization approach.

# review
i love that the navigation now feels like a game. it is a bit frustrating to orient but that forces me as a designer to improve the adjacency graph, and them as a visitor to build a mental map. later also we can have a map, but right now it is not time because the graph will keep changing so much. and even after we build a map it will likely be generated from the graph with each place having a square image.
i like that the navigation really creates a sense of movement, of wandering, not just getting lost, but roving.
