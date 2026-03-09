## Orrery

A digital garden build tool.

### Token discipline
  - AI asks human to quote relevant lines instead of reading files
  - Human writes and commits all document changes
  - AI filesystem access is nice-to-have for full-quota periods, not default
  - No web searches without explicit approval
  - Subagents (haiku) for concrete tasks: grep, draft, lookup
  - Never re-read files for "consistency checks" — trust the human

### Conventions
- Human commits all git changes. Never commit on their behalf.
- Plans are in `plans/`, numbered for creation order, asynchronous. Status tracked in frontmatter (active/done).
- Decisions are in `decisions/`, MADR format, numbered.

