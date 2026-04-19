---
status: accepted
date: 2026-03-09
---

# Media hosting

## Context and Problem Statement

Public media files (audio, images) need a stable, publicly
accessible home. Multiple projects produce media: Norcivilian
Reads (poem audio), City Limits (legend audio), Aetherion
(video assets). Telegram CDN requires auth tokens — not public.
Git repos shouldn't carry binary in regular objects.

## Decision Drivers

- Must be publicly accessible without auth
- Must work for RU and EN audiences 
- Must not bloat csvs dataset clones
- Should support evenor-introspects-quarry story (LFS in browser)
- Should be manageable with current tooling (csvs, panrec, AI)

## Considered Options

1. LFS inside csvs quarry 
2. External file host (S3, Nextcloud)
3. Separate media git repo
4. IPFS

## Decision Outcome

Option 1 — LFS inside csvs quarry.

LFS stores pointers in git, binary on github's LFS backend.
Cloning quarry stays light. Evenor already handles LFS pulls
in-browser — this makes the quarry landmark a demo of that
capability. Media and metadata live in one logical dataset.

Past dread about LFS management came from doing it without
AI assistance and before csvs tooling matured. Revisit if
LFS backend maintenance becomes a burden.

## Consequences

- Quarry gains .gitattributes for LFS-tracked extensions
- panrec export pipeline includes media files
- Evenor LFS browser code gets exercised on real data at self-hosted mirror of github
- If github LFS quota fills up, need a migration plan
