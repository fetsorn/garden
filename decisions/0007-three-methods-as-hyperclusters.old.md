---
status: proposed
date: 2026-04-08
---

# 0007 — Three Methods as Hyperclusters

## Context

ADR-0005 established places as viewpoints and clusters as groups of items visible from those viewpoints. The cluster table lists eight clusters with mood notes mostly blank. The clusters connect to each other ("barracks links to parlor") in ways that feel random because naming and mood are inadequate.

Meanwhile, the glassbead value proposition (crater ADR-0023) established "lived experience of X" as the common thread. But the garden currently gives the impression of separate businesses — "English tutor," "wargame lore," "translation service" — rather than one person studying and selling three methods across multiple domains.

The three methods are:

- **LX (lived experience)** — storytelling and roleplay to make a domain inhabited. The learner lives through the material. Community forms. Even a frozen tundra becomes warm when LX touches it.
- **NMNSS (anamnesis)** — a communication protocol with a witness who asks open questions. Translation sentence by sentence. Body-mind mapping. Estate inventory. The witness is a headlight — ahead of you, illuminating what's already there. A rubber duck or microphone is enough to stand for a witness.
- **QS (qualified self)** — turning the world as perceived into structured unicode relational database. Biblical-scale transcription into readable plain text that won't bitrot. A single life weighed in kilobytes. Opposite of quantified self: enhancing identity and quality, not quantity.

### Dependency chain

QS → NMNSS → LX. Each layer requires the ones below it.

- Any self-reporting is already QS, just unstructured. QS is the minimum act of making inner life legible.
- NMNSS needs QS (the witness produces records) but not LX. Translation is NMNSS without LX — just you, the witness, and the text.
- LX always contains the other two. You can't run a lived experience session without asking questions (NMNSS) and without the answers becoming material (QS). LX adds warmth and plurality on top.
- QS is possible without NMNSS, NMNSS is possible without LX. But: any kind of self-reporting is already QS, and LX without NMNSS is hard to imagine — lived experience without questions doesn't hold.

### Who is in the room

- **QS**: nobody. Just you and the device. On a quiet M1 airbook in asahi linux in emacs — on a toilet, in bed, at the standing desk. On a phone. In a notepad.
- **NMNSS**: one other presence, even if it's a rubber duck or a microphone. AI session. A chat in someone's kitchen. Sitting down. Can be walking with a microphone — the microphone is enough to stand for a witness. Lectures are dialogue between me and you-plural — still addressed, not broadcast.
- **LX**: a group, even if it's imaginary characters. Video calls. A table in a game club. A family house. Game chat. Always creates multiple characters even in a pair. Always an abstraction of a gathering, never a monologue, never a single dialogue.

### Adventure-game structure maps to methods

- **QS items are artifacts.** Plain text, schemas, tools. They sit there. Meaningful to the maker, opaque to others unless NMNSS or LX gives them context. In the game: objects you pick up and examine alone.
- **NMNSS items are conversations.** They address you. They ask open questions. They don't work as artifacts (too flat) and don't work in a crowd (too noisy). In the game: an NPC who speaks directly to you.
- **LX items are scenes.** A poem only has full value as part of a lived-in world where interpretation isn't controlled. Session recordings, community feeds, game legends — you walk into something already happening. In the game: a room with ambient life.

A poem can exist on all three levels but is most itself at LX. A translation article can exist as artifact but is most itself at NMNSS. A panrec schema can be shown to people but is most itself at QS.

### Sorting principle

The hypercluster a garden item belongs to is determined by asking: **at what level is this item most itself?**

- If it's most itself as something you examine alone → QS cluster
- If it's most itself as something that addresses you → NMNSS cluster
- If it's most itself as part of a populated world → LX cluster

### Mood non-negotiables

- **LX** is warming, socializing, with time passing — days, nights, years, centuries. Even a session about a frozen arctic brings warmth and life, building community and goals. When there is cold and loneliness, LX turns into NMNSS.
- **NMNSS** is sequential, confessional, cartographic. Excavation, self-interrogation, journalling, mapping, annotation, inventorying, archive work. The witness is ahead but questions are always open. Chats can go fast and sloppy if the witness reads well, but the format is necessarily sequential.
- **QS** is solitary transcription. Reporting about life inaccessible to computer, making it accessible while not losing it in bitrotting SQL. Plain text. Precise data schema, mapped to public W3C ontology. Accumulates over a life.

### Revision: methods are layers, not territories

Further discussion revealed that sorting spaces into method-based hyperclusters asks the visitor to step up to the designer's level. The visitor should never see "QS" or "NMNSS" or "LX." They should just notice that some spaces feel like browsing a shelf, some feel like someone's talking to them, and some feel like walking into something already happening.

**Items are always QS.** An item is an artifact — a document, a deck, a recording, a schema. It sits there. You examine it alone. Every space has items. In HTML: links, maybe with a short label.

**Spatial prose is always NMNSS.** The space itself is the witness voice. It addresses the visitor, asks questions, guides attention — but has no name. "Have you tried to remember?" could be the room talking. Each space sounds different because each domain's narrator is different. No new markup needed beyond the spatial description that already exists in concept (ADR-0005). The NMNSS layer is not a separate element — it *is* the prose that ties items together. When you read spatial prose, you imagine an interlocutor. The space is that interlocutor.

**Named characters are always LX.** The moment a name appears — `MARA: I have tried to remember so many times...` — there are at least two presences, and the visitor is witnessing a scene. Scenes are staged from real session transcripts, never invented (fiction exists only inside the LX session itself; what gets published is an annotated rendering of what actually happened). The Luanti books-into-theatre treatment is the template: landscape, then dialogue, then new landscape — fountain-like screenwriting. Characters are stable across the whole garden, not per-domain (like Xe Iaso's roster). There will be many of them eventually.

**The difference between NMNSS and LX in the garden is: does the prose have a name attached?** Unnamed voice addressing you = NMNSS. The room speaks. Named character speaking = LX. Someone is here.

**A space has layers:**

- **Items** (always present) — artifacts you examine alone
- **Spatial prose** (always present) — the unnamed narrator voice of the space, addressing the visitor (NMNSS layer)
- **Named characters** (optional) — dialogue with attribution, staged from real sessions (LX layer)

**Domains are clusters.** English, translation, tools, city history — each is a cluster of spaces. The density of layers varies naturally:

- Translation: items + spatial prose. No named characters (yet — or maybe never, that's fine).
- Panrec: items + spatial prose. The prose might sound technical and quiet — the space of a workbench.
- English: items + spatial prose + named characters. The fullest expression — the folded classroom has items (anki, schedule), a narrator voice, and staged session scenes.
- Aipassana: items + spatial prose. Named characters possible if body-mind sessions are staged.

The absence of a layer is not a gap to fill. It's the natural shape of a domain. QS-level items never turn up in LX context where they would feel abandoned. Not everything is forced to LX.

### What this does NOT decide

- Specific cluster names, spatial prose, or character roster.
- Whether current clusters from ADR-0005 split, merge, or rename.
- The spatial metaphor for mood (day-cycle, elemental, color, species — all considered, none chosen).
- How dialogue characters are visually presented.
- How scenes are technically rendered from session transcripts.

These are deferred to subsequent decisions.

## Decision

~~The eight clusters from ADR-0005 are grouped into three hyperclusters corresponding to the three methods.~~

Revised: domains are clusters. Each space within a domain has items (QS layer). Some spaces also have dialogue characters (NMNSS layer). Some also have staged scenes (LX layer). The three methods are not territories that own spaces but layers that a space may or may not have.

The sorting principle "at what level is this item most itself" still holds for individual items, but spaces are no longer sorted into method-based hyperclusters. Instead, the methods become legible through the *type of content* present: artifacts you browse alone, characters who address you, scenes you walk into.

Visitors enter through domain-specific offer items. The landscape makes methods felt without naming them.

## Consequences

- The hypercluster concept (method = territory) is superseded by the layer concept (method = content type within any space).
- Each cluster from ADR-0005 will be assessed for which layers it currently has and which it could gain.
- Spatial prose is not glue between layers — it *is* the NMNSS layer. Every space has a narrator voice. Mood comes from the domain, not from the method.
- Characters are a garden-wide abstraction, stable across domains (like Xe Iaso's roster). A character design decision is needed.
- Scenes are staged from real transcripts using fountain-like screenwriting (landscape → dialogue → landscape). A pipeline for turning session logs into garden theatre is needed.
- The dependency chain (QS → NMNSS → LX) is still valid but manifests as layer presence: every space has items, some add dialogue, fewer add scenes. The chain is felt, not labeled.
- Offer landing pages hint at the larger structure through wording ("lived experience of N") without requiring visitors to understand the theory.
