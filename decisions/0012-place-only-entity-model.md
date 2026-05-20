---
status: proposed
date: 2026-05-20
---
# Place as the only entity

## Context and Problem Statement

Garden's data model has accumulated distinct entity types (place, item, character) with overlapping responsibilities. Items are leaf content that behave like places. Characters are metadata on utterances. Fountain files mix prose with metadata (Title, Author, Audio, Draft date). Querying across the dataset — "all pages where narrator is fetsorn", "recordings in a date range" — is impossible because metadata is trapped in fountain frontmatter.

We need a unified entity model where CSVS handles all metadata and fountain is purely a prose format.

## Decision Drivers

* Queryability: structured metadata in CSVS tablets, not embedded in prose files
* Composability: feeds, works, and recordings should compose via the same mechanism
* Lang routing: per-language content without duplicating the entity graph
* Identity: recordings are content-addressed by hash, works and feeds have human slugs

## Considered Options

1. Keep fountain as a data+prose format, extract metadata at build time
2. Decompose fountain into CSVS, keep fountain for leaf prose only
3. Abandon fountain entirely, store prose as plain text

## Decision Outcome

Chosen option: 2. Place is the only entity. CSVS holds all metadata. Fountain is used only for leaf prose (transcripts with dialogue structure). Non-leaf prose is plain text.

### Entity model

**Place** is the universal entity, identified by a slug. Everything is a place: feeds (stage, concert), works (wanwei), recordings (sha256 hashes), static pages (crossroads).

A recording's slug is its content hash. A work's slug is a human-readable name. A feed's slug is a human-readable name.

### Tablets

```
_-_.csv:
place,adjacent
place,interior
place,author
place,date
place,remote
place,theme
place,ambient
```

- **place-adjacent**: navbar siblings. Bidirectional navigation.
- **place-interior**: directed parent→child. Feed→works, work→recordings.
- **place-author**: the author/narrator of this place's content.
- **place-date**: when this content was created/recorded.
- **place-remote**: URL where the resource can be fetched (for recordings).
- **place-theme**: CSS theme for this place's page.
- **place-ambient**: background audio URL for this place's page.

### Prose

```
prose/slug.lang — per-language prose file
```

- **Leaf places** (recordings, transcripts): fountain format. Dialogue with speakers, parentheticals, lyrics. This is the actual content.
- **Non-leaf places** (works, feeds): plain text. A short description rendered as utterance text when a parent links here.
- **Existence = lang availability**: if `slug.en` exists, the place has English content. Lang routing filters by prose file existence.

### Rendering

When a place page is rendered:

1. Show the place's own prose in current lang as the page header/content.
2. For each interior place that has prose in current lang, render an utterance: the interior place's author (from place-author) + its prose + a link to its page.
3. **Peek**: walk the interior chain recursively to find playable resources (places with place-remote) in current lang. Bubble up as audio attachment on the utterance.
4. **Summary**: non-leaf interior places can show stats (recording count, languages available) derived from peeking.

A leaf page parses its fountain prose for dialogue formatting. A non-leaf page synthesizes fountain-like appearance from CSVS metadata (author name, slug as parenthetical, plain text prose as dialogue).

### Example: three-level hierarchy

```
place: stage                    (feed)
  prose/stage.en: "norcivilian reads"
  interior → wanwei

place: wanwei                   (work)
  prose/wanwei.en: "an old man tells a story"
  prose/wanwei.ru: "старик рассказывает историю"
  prose/wanwei.zh: "唱一首歌"
  author: wan wei
  interior → 171736ae26f4...
  interior → abc123def456...
  interior → 789ghi012jkl...

place: 171736ae26f4...          (recording)
  prose/171736ae26f4....en: (full fountain transcript)
  author: fetsorn
  date: 19/4/2026
  remote: http://fetsorn.storage.yandexcloud.net/sha256/171736ae26f4....ogg
```

Stage page (lang=en): shows "norcivilian reads", then utterance for wanwei — WAN WEI says "an old man tells a story" with play button peeked from the en recording.

Wanwei page (lang=en): shows "an old man tells a story", then utterance for the en recording — FETSORN with full fountain transcript and play button.

### Multiple recordings per lang

A work can have multiple recordings in the same language. All recordings with prose in current lang appear as utterances on the work page. On a parent feed page, the peek returns a set; rendering decides presentation (first recording's play button, playlist, count badge).

### Migration from current model

- `item` concept dissolved: items become places with interior links from their parent
- `item-remote` dissolved: recordings have `place-remote`
- Fountain frontmatter (Title, Author, Audio, Draft date, Narrator, Source, Credit, Contact) removed from prose files
- Title derived from beginning of prose content 
- `place-type` not needed: leaf vs non-leaf determined by presence/absence of interior links; passthrough HTML and markdown ported to HTML beforehand
- All prose files become either plain text (non-leaf) or pure fountain without frontmatter (leaf)

## Links

- Supersedes the implicit item/place split in garden's 11ty build
- Extends ADR-0007 (identity and location): hash as slug for recordings, place-remote as typed location
