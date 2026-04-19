# ADR-0010: Fountain screenplay format as hypertext markup

## Status

Accepted

## Context

The garden site needs a markup format that carries prose (labels, descriptions, display order, prices) while keeping CSVS limited to structural data (slugs, URLs, categories, dates, names, copyrights). Fountain screenplay format, originally designed for screenwriters, provides a token vocabulary that maps naturally to hypertext concepts.

We also need a convention for resolving prose files from slugs, so that filenames never need to be stored in CSVS.

## Decision

### 1. Slug-addressed prose

All prose files are resolved from the entity slug:

```
{slug}.{lang}.fountain    (preferred)
{slug}.{lang}.md          (fallback)
{slug}.{lang}.html        (fallback)
```

Place images follow the same convention: `{slug}.jpg`.

The CSVS fields `script_en`, `script_ru`, `label_en`, `label_ru`, and `image` are removed from the schema. Build-time code derives filenames from slugs.

### 2. Fountain token mapping

Fountain tokens map to hypertext elements as follows:

| Fountain token               | Role                                                                                                           | HTML                                                                 |
|------------------------------|----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| **section** (`# slug`)       | Slug marker — matches a CSVS item or offer. Produces no HTML itself.                                           | (structural, not rendered)                                           |
| **action** (1st in context)  | Display label                                                                                                  | `<h1>` for places, `<h2>` for landmarks                              |
| **action** (2nd+ in context) | Description text                                                                                               | `<p>`                                                                |
| **character**                | Start of a dialogue block — the character name itself is a group label (e.g., a feed slug repeated per entry). | (structural, not rendered)                                           |
| **parenthetical**            | Structured reference inside a dialogue block                                                                   | For items: slug (used for URL lookup). For offers: CTA button label. |
| **dialogue**                 | Display text inside a dialogue block                                                                           | For items: entry label. For offers: price.                           |

This special mapping only applies to places. In the items, fountain is rendered as proper html screenplay.

### 3. Place fountain convention

A place fountain file (`{slug}.{lang}.fountain`) has this structure:

```
The Parlor                    ← first action = place label (h1)

A warm room with deep chairs. ← subsequent actions = description (p)

# parlor-readings             ← section = landmark slug

Readings                      ← first action = landmark label (h2)

Daily audio readings.         ← subsequent action = description (p)

PARLOR-READINGS               ← character = entry group
(uuid-or-slug)                ← parenthetical = entry slug
2026-02-20 - reading title    ← dialogue = entry display text
```

Everything before the first section is the place's own metadata.
Everything after a section marker belongs to that landmark.

### 4. Feed representation

A feed is an item with `category` + `in_place` (see `g:feed` in graph/index.ttl). In fountain, a feed section may include hand-picked example entries as dialogue blocks. The full feed page is generated from all CSVS items sharing the same category, sorted by date descending.

### 5. Offer CTA pattern

An offer section uses the dialogue block differently: the first parenthetical is the CTA button label, the first dialogue line is the price.

```
# patron

Early Access                  ← action = label

A weathered notebook...       ← action = description

PATRON                        ← character
(Become a patron)             ← parenthetical = CTA label
from $5/month                 ← dialogue = price
```

## Consequences

- CSVS stores only structural data. All human-facing text lives in fountain.
- Display order is fountain order, not a CSVS field.
- Adding a new item to a place means adding a section to the place's fountain file and a row to CSVS.
- Bilingual content requires two fountain files per entity — one per language — sharing the same section slugs.
- Fountain files must follow the `{slug}.{lang}.{ext}` naming convention.
- Existing prose files with non-standard names need renaming.
- The act/say property split (actdate vs saydate, actname vs sayname, actcopyright vs saycopyright) remains in CSVS — these are structural metadata, not prose.
