---
status: proposed
date: 2026-04-08
---

# 0008 — Fountain Scenes in the Garden

## Context

ADR-0007 established that garden spaces have three layers: items (QS), spatial prose (NMNSS), and named characters (LX). The LX layer is staged from real session transcripts using fountain-like screenwriting — landscape, then dialogue, then new landscape.

Currently ~60 LX sessions exist as audio recordings and ~10 as markdown transcripts (e.g. `citylimits/prose/20260119.md`). Transcription is blocked because there's no clear target format — we don't know what the output should look like in the garden.

The garden build pipeline (`prose.js`) already handles prose files referenced by `g:prose` in the graph. It renders markdown via `markdown-it` and passes through raw HTML. Adding a third format — fountain screenplay — would enable session transcripts to be authored as screenplays and rendered with semantic HTML that CSS can style.

Fountain is a plain-text screenplay format with a real spec (fountain.io). Parsers exist in JavaScript. The format naturally distinguishes:

- **Scene headings** (INT./EXT.) — map to spatial prose, the narrator voice of the space (NMNSS layer)
- **Action lines** — the unnamed narrator describing what happens (NMNSS layer)
- **Character names + dialogue** — named characters speaking (LX layer)
- **Parentheticals** — stage directions within dialogue

This maps directly to the ADR-0007 layer model: action is the space speaking, character dialogue is the scene.

### Why not eleventy-plugin-fountain

The plugin registers `.fountain` as an 11ty template language. But garden prose files aren't templates — they're data-driven pages built from the TTL graph via `prose.js`. The plugin would fight the existing architecture. Instead, `fountain-js` (the underlying parser, v1.2.4) can be called directly inside `prose.js`, same as `markdown-it` is used for markdown.

### What a transcript becomes

Raw transcript (current state — `citylimits/prose/20260119.md`):

```
"So, Maya, you come to Jack's—uh, whatever, where you leave
apartment—um, and you are looking for this cat."

"It is black with white... coins? No, let's say signs, stripes."
```

Authored fountain (target state):

```fountain
INT. MANHATTAN — STAIRS BEHIND JACK'S APARTMENT — NIGHT

You walk down the street in the snow. Something runs across the street — black, too fast to tell if it's a cat or a rat.

MAYA
I know that if a cat is afraid, you must just stand there and look at the cat for about 10 minutes.

JACK
I will go buy some sour cream.

INT. 7-ELEVEN — NIGHT

The fluorescent lights hum. A clerk behind the counter.

CLERK
Do you need a bag?

JACK
No. With card, please.
```

The authoring step is editorial: clean noise, attribute dialogue to characters, write scene headings as spatial prose. The teacher's voice (the world) becomes action lines and scene headings. Vocabulary corrections become items (footnotes or sidebar — deferred).

## Decision

### Fountain as a prose format

`prose.js` gains a third render path:

```js
if (prosePath.endsWith('.fountain')) return renderFountain(source);
if (prosePath.endsWith('.html')) return source;
return md.render(source);
```

`renderFountain` uses `fountain-js` to parse the source into tokens and wraps each in semantic HTML:

```html
<div class="scene-heading">INT. MANHATTAN — STAIRS — NIGHT</div>
<p class="action">You walk down the street in the snow.</p>
<p class="character">MAYA</p>
<p class="dialogue">I know that if a cat is afraid, you must just stand there.</p>
```

CSS styles each class to produce a shortened, readable rendering — not a screenplay page, but a scene in the garden.

### Pipeline for a new session scene

1. Author `prose/YYYYMMDD-city.fountain` from recording or raw transcript
2. In `graph/index.ttl`: add a node with `g:prose` pointing to the fountain file, `g:in-place` linking to a space, adjacency triples linking to next session / city / LX method page
3. `build.sh` runs → fountain parsed → HTML page generated with nav from graph

### What this does NOT decide

- Visual design / CSS for fountain elements. Deferred to implementation.
- How vocabulary items are extracted from sessions (footnotes, sidebar, separate items).
- Whether sessions get their own space or live as entries in a feed.
- Character roster design (ADR-0007 noted this as needed).
- How the shortened rendering works editorially — what gets cut from raw transcripts.

## Consequences

- `fountain-js` added as a dependency.
- `prose.js` extended with ~20 lines for fountain rendering.
- Transcription work now has a target format: fountain screenplay.
- The ~60 session recordings have a clear path: record → transcribe → author fountain → add to graph → build.
- Session scenes in the garden will have semantic HTML that distinguishes narrator voice (action/scene headings) from character dialogue — making the ADR-0007 layers visible through CSS without any labels.
