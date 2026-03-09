# Garden

A bilingual static site built with [11ty](https://www.11ty.dev/) from two
data sources: a TTL graph (structure) and a CSVS dataset (content).

## How it works

```
garden.ttl ──ttl2jsonld──► _data/garden.json   (rooms, landmarks, doors)
quarry/    ──csvs-cli───► _data/quarry.json    (events: legends, readings, …)
                                │
                            11ty build
                                │
                            _site/ ──► pages branch ──► Codeberg Pages
```

**garden.json** defines the site structure: rooms (pages), landmarks
(sections within a room), doors (navigation links between rooms), and
feeds (lists of content from the quarry). It is converted from TTL
with ttl2jsonld.

**quarry.json** holds the actual content — events grouped by category
(legend, poem-reading, etc.). Each event carries multilingual text,
metadata (actors, dates, copyright), and optional file references
(audio, images) stored in Git LFS. It is assembled from a CSVS
dataset with csvs-cli.

11ty reads both JSON files through JavaScript data files in `_data/`,
reshapes them into template-friendly structures, and generates static
HTML.

## Repo layout

```
_data/
  garden.json         structure graph (from TTL)
  quarry.json         content events (from CSVS)
  rooms.js            reshapes garden.json → room objects for pagination
  items.js            reshapes quarry.json → item objects for pagination
  site.js             global config: default room, LFS base URL, etc.
_includes/
  room.njk            room page layout (bilingual, CSS :target toggle)
  item.njk            item page layout (single-language)
  partials/
    head.njk          shared <head>
    navbar.njk        door links + language toggle
    footer.njk        patronage links (Patreon / Boosty)
  items/
    legend.njk        item body: title "{date} — {city}", actors, text
    poem-reading.njk  item body: title, reader metadata, <audio>
    default.njk       fallback item body
pages/
  rooms.njk           pagination driver → one HTML per room
  items.njk           pagination driver → one HTML per lang × event
  index.njk           meta redirect to default room
index.css             stylesheet
build.sh              full pipeline: 11ty build → pages branch → push
eleventy.config.js    11ty config: ignores, passthrough copies
```

## Build

```sh
npm install
sh build.sh
```

`build.sh` does:

1. Cleans any previous `_site` worktree
2. Checks out the `pages` branch as a git worktree at `_site/`
3. Runs `npx @11ty/eleventy` (reads `_data/`, renders templates → `_site/`)
4. Commits the generated files in the `_site` worktree
5. Pushes the `pages` branch to origin
6. Prunes the worktree

The `pages` branch contains only the built HTML/CSS — no source files.
Codeberg Pages serves it directly.

## Data pipeline

### Structure: TTL → garden.json

The site structure is defined in TTL (Turtle RDF) and converted to
JSON-LD with [ttl2jsonld](https://github.com/niclas-2109/ttl2jsonld).
The JSON-LD lands in `_data/garden.json`.

Key types in the graph:

| Type     | Role                                       |
|----------|--------------------------------------------|
| g:Room   | A page (study, stage, map-room)            |
| g:Feed   | A content listing within a room            |
| g:Item   | A single linked artifact within a room     |
| g:Door   | A navigation link from one room to another |

`_data/rooms.js` walks the JSON-LD graph and emits one object per
room, each carrying its landmarks (feeds, items) and doors. 11ty
paginates over this array to produce room pages.

### Content: CSVS → quarry.json

Content lives in a [CSVS](https://norcivilianlabs.org/csvs/) dataset
(the "quarry") and is queried with
[csvs-cli](https://github.com/niclas-2109/csvs-cli). The result is
stored as `_data/quarry.json`, keyed by category:

```json
{
  "legend":       [ { "event": "...", "date": "...", "city": "...", ... } ],
  "poem-reading": [ { "event": "...", "datum": "...", "sayname": "...", ... } ]
}
```

`_data/items.js` flattens all events across categories into a single
array of item objects (one per language × event), resolves each item's
parent room and feed, and hands it to 11ty for pagination.

## Bilingual design

Room pages contain both languages in a single file. A pure-CSS
`:target` toggle switches between them:

- Default (no fragment or `#en`): English visible
- `#ru`: Russian visible
- Door links in Russian blocks carry `#ru` forward

Item pages are separate files per language (`en/slug.html`,
`ru/slug.html`). Items only appear for languages present in
their `lang` array — no fallback, no placeholder.

## Adapting this for your own site

1. **Define your structure in TTL.** Rooms, landmarks, doors. Convert
   to JSON-LD and drop it in `_data/garden.json`.
2. **Populate your content.** If you use CSVS, query with csvs-cli.
   Otherwise, produce a JSON file keyed by category with the same
   shape as `quarry.json`.
3. **Add templates per category.** Each content type gets a nunjucks
   partial in `_includes/items/`. The `item.njk` layout dispatches
   to the right partial based on `item.category`.
4. **Set `site.js` values.** LFS base URL, site title, author.
5. **Run `build.sh`.** Or just `npx @11ty/eleventy` for local preview.

## Dependencies

- [Node.js](https://nodejs.org/) (for 11ty)
- [11ty v3](https://www.11ty.dev/) (`npm install`)
- [ttl2jsonld](https://github.com/niclas-2109/ttl2jsonld) (TTL → JSON-LD, upstream of this repo)
- [csvs-cli](https://github.com/niclas-2109/csvs-cli) (CSVS → JSON, upstream of this repo)
- [jq](https://jqlang.github.io/jq/) (optional, for assembling quarry.json from multiple queries)
