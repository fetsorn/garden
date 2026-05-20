/**
 * Migration script for ADR-0012: place-only entity model
 *
 * Converts from: fountain frontmatter + item/place split
 * Converts to:   CSVS tablets + plain/fountain prose without frontmatter
 *
 * Run: node migrate-0012.js
 * Then: human reviews and commits
 */
import fs from "node:fs";
import path from "node:path";
import { transliterate } from "transliteration";

const CSVS_DIR = path.resolve(import.meta.dirname, "../csvs");
const PROSE_DIR = path.resolve(CSVS_DIR, "prose");
const SHA_FILE = path.resolve(
  import.meta.dirname,
  "../../../../staging/2026/20260518-asahi-sha256sum",
);
const TRANSCRIPT_DIR = path.resolve(
  import.meta.dirname,
  "../../../minds/estate/prose/20260518-asahi/mm/lodes/downloads/Telegram Desktop/ChatExport_2026-05-18/voice_messages",
);
const REMOTE_BASE = "http://fetsorn.storage.yandexcloud.net/sha256";
const WANWEI_HASH =
  "171736ae26f42ec48f32c13f7e1b838b362b25b8750a1f7dbd8550f34bc74960";

// ── helpers ──────────────────────────────────────────────────────────

function detectLang(text) {
  if (/[\u0530-\u058F]/.test(text)) return "hy";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const cyrillicChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
  if (latinChars > cyrillicChars && latinChars > 10) return "en";
  return "ru";
}

function getContentLines(transcript) {
  const lines = transcript.split("\n");
  const content = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("[[")) continue;
    if (trimmed.startsWith("SPEAKER_")) continue;
    content.push(trimmed);
  }
  return content;
}

function makeSlug(text) {
  const latin = transliterate(text);
  const words = latin
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .filter(Boolean);
  if (!words.length) return null;
  return words.join("-");
}

function extractDate(filename) {
  const match = filename.match(/@(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  return `${dd}/${mm}/${yyyy}`;
}

function csvLine(a, b) {
  // quote if contains comma or quote
  const q = (s) =>
    s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  return `${q(a)},${q(b)}`;
}

// ── collect all data ─────────────────────────────────────────────────

// tablets to write
const interior = []; // [parent, child]
const adjacent = []; // [a, b]
const placeAuthor = []; // [slug, author]
const placeDate = []; // [slug, date]
const placeRemote = []; // [slug, url]
const placeTheme = []; // [slug, theme]
const placeAmbient = []; // [slug, url]
// prose files to write: { path: content }
const proseFiles = {};

// ── 1. existing adjacency (keep as-is) ──────────────────────────────

adjacent.push(
  ["crossroads", "stage"],
  ["crossroads", "theatre"],
  ["crossroads", "concert"],
  ["stage", "crossroads"],
  ["theatre", "crossroads"],
  ["concert", "crossroads"],
);

// ── 2. existing themes and ambients ──────────────────────────────────

placeTheme.push(["crossroads", "beige"], ["wanwei", "ancient"], ["cat", "modern"]);
// legal was "print" theme — legal is now a leaf, keep it
placeTheme.push(["legal", "print"]);

placeAmbient.push(
  ["crossroads", "https://example.com/street.ogg"],
  ["wanwei", "https://example.com/river.ogg"],
  ["cat", "https://example.com/street.ogg"],
);

// ── 3. feeds ─────────────────────────────────────────────────────────

// crossroads: feed, interior → english-lessons, legal
proseFiles["crossroads.en"] = "Market stall features a large white banner saying \"Lived experience of English\"";
proseFiles["crossroads.ru"] = "К лавке прибит большой белый лист, на нём написано - \"Живой опыт английского языка\".";
placeAuthor.push(["crossroads", "fetsorn"]);
placeDate.push(["crossroads", "19/4/2026"]);
interior.push(["crossroads", "english-lessons"], ["crossroads", "legal"]);

// stage: feed, interior → wanwei + all work slugs (added below)
proseFiles["stage.en"] = "norcivilian reads";
placeAuthor.push(["stage", "fetsorn"]);
placeDate.push(["stage", "19/5/2026"]);
interior.push(["stage", "wanwei"]);

// theatre: feed, interior → cat
proseFiles["theatre.en"] = "living experience";
placeAuthor.push(["theatre", "fetsorn"]);
placeDate.push(["theatre", "19/5/2026"]);
interior.push(["theatre", "cat"]);

// concert: feed, interior → 20260413
proseFiles["concert.en"] = "concert";
placeAuthor.push(["concert", "fetsorn"]);
placeDate.push(["concert", "19/5/2026"]);
interior.push(["concert", "20260413"]);

// ── 4. existing works/leaves ─────────────────────────────────────────

// english-lessons: passthrough HTML leaf
// read existing, strip nothing (it's already HTML)
const englishLessons = fs.readFileSync(
  path.join(PROSE_DIR, "english-lessons.en"),
  "utf-8",
);
proseFiles["english-lessons.en"] = englishLessons; // keep as-is (passthrough)
placeAuthor.push(["english-lessons", "fetsorn"]);

// legal: markdown leaf
const legalRu = fs.readFileSync(path.join(PROSE_DIR, "legal.ru"), "utf-8");
proseFiles["legal.ru"] = legalRu; // keep as-is (markdown, will be ported to HTML later)
placeAuthor.push(["legal", "fetsorn"]);

// plato: markdown leaf
const platoEn = fs.readFileSync(path.join(PROSE_DIR, "plato.en"), "utf-8");
proseFiles["plato.en"] = platoEn; // keep as-is
placeAuthor.push(["plato", "fetsorn"]);
// plato is not interior to any feed currently — it's adjacent or standalone
// leaving it unlinked for now; human can add adjacency

// cat: leaf (fountain transcript, multi-speaker)
// strip frontmatter, keep dialogue
const catEn = fs.readFileSync(path.join(PROSE_DIR, "cat.en"), "utf-8");
const catBody = catEn.replace(/^[\s\S]*?\n\n(?=#)/, ""); // strip everything before first # section
proseFiles["cat.en"] = catBody;
placeAuthor.push(["cat", "fetsorn"]);
placeDate.push(["cat", "1/19/2026"]);

// 20260413: leaf (fountain transcript, single speaker)
const poem20260413 = fs.readFileSync(
  path.join(PROSE_DIR, "20260413.ru"),
  "utf-8",
);
const poem20260413Body = poem20260413.replace(/^[\s\S]*?\n\n(?=#)/, "");
proseFiles["20260413.ru"] = poem20260413Body;
placeAuthor.push(["20260413", "fetsorn"]);
placeDate.push(["20260413", "2026-13-04"]);

// wanwei: work with 3 recordings (all same hash for now)
proseFiles["wanwei.en"] = "an old man tells a story";
proseFiles["wanwei.ru"] = "старик рассказывает историю";
proseFiles["wanwei.zh"] = "唱一首歌";
placeAuthor.push(["wanwei", "wan wei"]);
interior.push(["wanwei", WANWEI_HASH]);

// wanwei recording (the single hash, with 3 lang transcripts)
const wanweiEn = fs.readFileSync(path.join(PROSE_DIR, "wanwei.en"), "utf-8");
const wanweiRu = fs.readFileSync(path.join(PROSE_DIR, "wanwei.ru"), "utf-8");
const wanweiZh = fs.readFileSync(path.join(PROSE_DIR, "wanwei.zh"), "utf-8");
// strip frontmatter from each
const stripFrontmatter = (s) => s.replace(/^[\s\S]*?\n\n(?=#)/, "");
proseFiles[`${WANWEI_HASH}.en`] = stripFrontmatter(wanweiEn);
proseFiles[`${WANWEI_HASH}.ru`] = stripFrontmatter(wanweiRu);
proseFiles[`${WANWEI_HASH}.zh`] = stripFrontmatter(wanweiZh);
placeAuthor.push([WANWEI_HASH, "fetsorn"]);
placeDate.push([WANWEI_HASH, "19/4/2026"]);
placeRemote.push([
  WANWEI_HASH,
  `https://media.githubusercontent.com/media/fetsorn/garden/refs/heads/main/lfs/${WANWEI_HASH}.ogg`,
]);

// ── 5. voice message imports ─────────────────────────────────────────

const shaLines = fs
  .readFileSync(SHA_FILE, "utf-8")
  .trim()
  .split("\n")
  .filter((l) => l.includes("voice_messages/"));

const usedSlugs = new Set([
  "crossroads", "stage", "theatre", "concert",
  "wanwei", "cat", "english-lessons", "legal", "plato", "20260413",
]);

let importCount = 0;

for (const line of shaLines) {
  const [hash, ...pathParts] = line.split(/\s+/);
  const filePath = pathParts.join(" ");
  const filename = path.basename(filePath);

  if (hash === WANWEI_HASH) continue;

  const transcriptPath = path.join(TRANSCRIPT_DIR, filename + ".txt");
  if (!fs.existsSync(transcriptPath)) {
    console.error(`SKIP no transcript: ${filename}`);
    continue;
  }
  const transcript = fs.readFileSync(transcriptPath, "utf-8");
  const contentLines = getContentLines(transcript);
  if (!contentLines.length) {
    console.error(`SKIP empty transcript: ${filename}`);
    continue;
  }

  const lang = detectLang(transcript);
  let workSlug = makeSlug(contentLines[0]);
  if (!workSlug) {
    console.error(`SKIP no slug: ${filename}`);
    continue;
  }

  // deduplicate work slugs
  const baseSlug = workSlug;
  let n = 2;
  while (usedSlugs.has(workSlug)) {
    workSlug = `${baseSlug}-${n}`;
    n++;
  }
  usedSlugs.add(workSlug);

  const date = extractDate(filename);
  const remoteUrl = `${REMOTE_BASE}/${hash}.ogg`;

  // first line as short description for the work (in detected lang)
  const shortDesc = contentLines[0].slice(0, 80);

  // full transcript as fountain for the recording
  const [firstLine, ...restLines] = contentLines;
  const lyricsBlock = restLines.map((l) => `~${l}`).join("\n");
  const fountainBody = `# calm

EXT. STAGE - DAY [[STAGE]]

NORCIVILIAN
${lyricsBlock ? `${firstLine}\n${lyricsBlock}` : firstLine}
`;

  // work entity
  proseFiles[`${workSlug}.${lang}`] = shortDesc;
  placeAuthor.push([workSlug, "norcivilian"]);
  interior.push([workSlug, hash]);
  // stage → work
  interior.push(["stage", workSlug]);

  // recording entity
  proseFiles[`${hash}.${lang}`] = fountainBody;
  placeAuthor.push([hash, "norcivilian"]);
  if (date) placeDate.push([hash, date]);
  placeRemote.push([hash, remoteUrl]);

  importCount++;
}

console.log(`${importCount} voice messages processed`);

// ── 6. write everything ──────────────────────────────────────────────

// clear old prose
const oldFiles = fs.readdirSync(PROSE_DIR);
for (const f of oldFiles) {
  fs.unlinkSync(path.join(PROSE_DIR, f));
}
console.log(`deleted ${oldFiles.length} old prose files`);

// write new prose
for (const [filename, content] of Object.entries(proseFiles)) {
  fs.writeFileSync(path.join(PROSE_DIR, filename), content);
}
console.log(`wrote ${Object.keys(proseFiles).length} prose files`);

// write schema
fs.writeFileSync(
  path.join(CSVS_DIR, "_-_.csv"),
  [
    "character,portrait",
    "place,adjacent",
    "place,ambient",
    "place,author",
    "place,date",
    "place,interior",
    "place,remote",
    "place,theme",
  ].join("\n") + "\n",
);

// write tablets
const writeTablet = (name, rows) => {
  const content = rows.map(([a, b]) => csvLine(a, b)).join("\n") + "\n";
  fs.writeFileSync(path.join(CSVS_DIR, name), content);
};

writeTablet("place-adjacent.csv", adjacent);
writeTablet("place-interior.csv", interior);
writeTablet("place-author.csv", placeAuthor);
writeTablet("place-date.csv", placeDate);
writeTablet("place-remote.csv", placeRemote);
writeTablet("place-theme.csv", placeTheme);
writeTablet("place-ambient.csv", placeAmbient);

// character-portrait stays as-is
console.log("wrote CSVS tablets");
console.log("done — review and commit");
