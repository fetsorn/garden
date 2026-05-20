# Transcript repair — continuation instructions

## What we're doing
Repairing ~308 item prose files in `~/mm/minds/garden/csvs/prose/`. Each file is a recording transcript in fountain format. The originals have garbled speech-to-text with `NORCIVILIAN` as the author. We replace them with correct poem text, proper author, and date.

## 217 files remaining (of ~308 total)
Files `0*`–`3*` are done. Remaining files start from `3f*` onward (hash-alphabetical).

## How to find unrepaired files
```
grep -rl NORCIVILIAN ~/mm/minds/garden/csvs/prose/*.ru
```
They have the old format starting with `# calm` / `EXT. STAGE` / `NORCIVILIAN`.

## Repair pattern for each file

1. **Read** the prose file and **grep** its hash in `csvs/` to find the work slug
2. **Show** human the garbled text — they provide: author, title (if any), correct text, date
3. **Write** the prose file in fountain format:
```
@АВТОР [[author-slug]]
Title (or - if no title)
~Line 1
~Line 2
```
   - `@` before Cyrillic names (required for fountain-js parsing)
   - `[[slug]]` is the author slug used in place-author.csv
   - `~` prefix on every lyrics line
   - `-` as title line means no title (prevents fountain-js crash)
4. **Update** `place-author.csv`: `sed -i 's/^work-slug,norcivilian$/work-slug,author-slug/'`
5. **Add date** if provided: `echo 'work-slug,YYYY' >> place-date.csv`

## Key conventions
- Author slug is lowercase transliterated: `tsvetaeva`, `brodskiy`, `mandelstam`
- Fountain author name is UPPERCASE Cyrillic: `@ЦВЕТАЕВА [[tsvetaeva]]`
- Don't add line numbers from source text
- Human provides all text — no web search (too expensive on tokens)
- After each file, immediately show the next one ("always do next after i answer")

## Files already repaired (46 files, `0*`–`3f*`)
Authors added: kruglov, pasternak, blok(x2), snegova, filatov, homer, sologub(x3), mayakovskiy, oleynikov, tinyakov, gumilev, vizbor, voloshin, poplavskiy, balmont(x2), morits, prigov, akhmadulina, fet(x2), bryusov, yasnov, li-bo, kruchenykh, satin, mikhalkov, derzhavin, teffi, tyutchev, satunovskiy, zabolotskiy, brodskiy, tsvetaeva(x3), lermontov, vasilev, barto, khlebnikov, mandelstam, pavlova, zakhoder, okudzhava, gamzatov, kozlovskiy, nekrasov, irtenev, smelyakov
