---
status: deprecated
date: 2026-03-25
---

# Unified multilingual pages

## Context and Problem Statement

The garden uses two different i18n strategies. Room pages embed all
translations in one HTML file, toggled with CSS `:target`
(`study.html#ru`). Item and prose pages create separate files per
language under `/en/` and `/ru/` subdirectories. This split doubles
the URL surface, complicates navigation (two code paths in the
navbar), and frames language as a property of the URL rather than
of the content.

The desired model: each artifact is a single resource that carries
whatever translations exist for it. Text earns its worth — the
translations provide a one-stop authoritative rendering for each
artifact. Language is a property of the text, not of the address.

## Decision Drivers

- One canonical URL per artifact — no drift between language versions
- Consistent navigation model — no branching between hash and page modes
- Graceful partial translation — an artifact with only English simply
  has no language toggle, rather than a missing `/ru/` 404
- Standards-correct accessibility — element-level `lang` attributes
  satisfy WCAG 3.1.2 (Level AA) and enable screen reader voice switching
- Extensibility to 3+ languages (zh is supported from the start as a
  design-flaw case study for both architecture and style)
- Rooms should be identified by human-readable slug + UUID (phase 2),
  not by bare slugs that risk namespace collisions with items
- Minimal runtime JavaScript — language toggle is pure CSS

## Considered Options

1. **Keep the split** — `/en/slug.html` and `/ru/slug.html` for
   items and prose, hash toggle for rooms only

2. **Unify all pages** — single HTML per artifact at a flat URL,
   all translations inline, CSS + minimal JS toggle

3. **Fully split into /en/ and /ru/** — separate sub-sites per
   language. Anchors remain available for in-page navigation. Each
   sub-site is internally consistent. SEO works naturally with
   `hreflang` between separate URLs. Disadvantage: content drift
   between language sites over time; cognitive overhead of managing
   pages rather than abstract artifacts.

4. **Server-side content negotiation** — `Accept-Language` header
   routing (requires a server, incompatible with static hosting)

## Decision Outcome

Option 2 — Unify all pages.

Every artifact (room, item, prose) gets a single HTML file at a flat
URL. The file contains `<div class="lang-XX" lang="XX">` blocks for
each available translation, toggled by CSS `:target` with a URL
fragment (`#ru`, `#zh`). The default state shows the artifact's
main language.

### Main language

Each artifact has a main language — its original language of creation.
A Russian poem translated to English is still indexed in Russian;
an English song is indexed in English even with Chinese dubs. The
main language determines:

- `<html lang>` (the value search engines and screen readers see)
- Default display when no fragment is in the URL
- CSS default visibility via `body.main-XX` classes

The first language in the artifact's `langs` array is the main
language. For quarry events this follows the data order; for prose
it follows the language-tag order in TTL.

### CSS-only language toggle

The `:target` pseudo-class drives visibility. Default rules hide
non-main languages. Fragment overrides use ID selectors (specificity
`1,2,0`) which beat the `body.main-XX` class selectors (`0,2,1`)
without needing `!important`. Minimal JS (8 lines) updates only
`document.documentElement.lang` for accessibility and `document.title`
for UX on hashchange. No runtime translation or dropdown JS.

### W3C and SEO considerations

- **Element-level `lang` attributes** (HTML Living Standard) mark
  each translation block. Screen readers switch pronunciation at
  boundaries per WCAG 3.1.2.
- **`Content-Language` meta** (RFC 7231 §3.1.3.2) declares all
  intended audience languages.
- **JSON-LD structured data** using `schema:inLanguage` describes
  the multilingual structure to crawlers.

The honest gap: Google's `hreflang` requires separate URLs. There is
no standard mechanism to make a single URL appear in search results
for multiple languages independently. For a personal garden this is
an acceptable tradeoff — the main language is the indexing language.

### Tradeoffs accepted

- URL fragment anchors are consumed by the language toggle. In-page
  section anchoring via fragments is no longer available. This was
  the main advantage of option 3 (fully split).
- All translations are shipped to every visitor. For the current
  content size this is negligible.

## Consequences

- Items and prose lose their `/en/` and `/ru/` subdirectories
- All internal links drop language prefixes, use `#lang` fragments
- The navbar simplifies to a single mode (hash-based)
- Category templates receive `lang` from the enclosing for-loop
- Footer support link uses hash-based navigation
- JSON-LD and `Content-Language` meta added to `<head>`
- Chinese (zh) supported structurally from the start
- Phase 2: rooms get `g:uuid` for slug-UUID permalinks and `g:image`
  for decoupled image paths
