## Orrery

A digital garden build workflow.

### Focus section
right now _data/content.json is a mock, we need to generate it from quarry using csvs cli, and request missing features

### Session protocol
  1. AI reads latest front of mind
  2. Human arrives with what's on their mind
  3. AI asks clarifying questions
  4. Identify one block
  5. Name one action or insight
  6. Human updates focus section
  7. Target: ~10 exchanges. Scope can be high-level but must be precise.

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

