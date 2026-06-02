import fs from "node:fs";
import path from "node:path";
import { transliterate } from "transliteration";

const SHA_FILE = path.resolve(
  import.meta.dirname,
  "../../../../staging/2026/20260518-asahi-sha256sum",
);
const TRANSCRIPT_DIR = path.resolve(
  import.meta.dirname,
  "../../../minds/estate/prose/20260518-asahi/mm/lodes/downloads/Telegram Desktop/ChatExport_2026-05-18/voice_messages",
);
const PROSE_DIR = path.resolve(import.meta.dirname, "../csvs/@");
const STAGE_FOUNTAIN = path.resolve(PROSE_DIR, "stage.en");
const REMOTE_BASE = "http://fetsorn.storage.yandexcloud.net/sha256";

// skip wanwei (audio 8) — already exists
const SKIP_HASH =
  "171736ae26f42ec48f32c13f7e1b838b362b25b8750a1f7dbd8550f34bc74960";

// detect language from transcript content
function detectLang(text) {
  if (/[\u0530-\u058F]/.test(text)) return "hy";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const cyrillicChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
  if (latinChars > cyrillicChars && latinChars > 10) return "en";
  return "ru";
}

// extract all content lines from transcript (skip timestamps and speaker labels)
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

// make a latin slug from first ~3 words of content
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

// extract date from filename like audio_100@29-09-2025_22-41-15.ogg
function extractDate(filename) {
  const match = filename.match(/@(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  return `${dd}/${mm}/${yyyy}`;
}

// read sha256sum file, filter to voice_messages
const shaLines = fs
  .readFileSync(SHA_FILE, "utf-8")
  .trim()
  .split("\n")
  .filter((l) => l.includes("voice_messages/"));

const items = [];
const usedSlugs = new Set();

for (const line of shaLines) {
  const [hash, ...pathParts] = line.split(/\s+/);
  const filePath = pathParts.join(" ");
  const filename = path.basename(filePath);

  if (hash === SKIP_HASH) continue;

  // read transcript
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
  let slug = makeSlug(contentLines[0]);
  if (!slug) {
    console.error(`SKIP no slug: ${filename}`);
    continue;
  }

  // deduplicate slugs
  const baseSlug = slug;
  let n = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n++;
  }
  usedSlugs.add(slug);

  const date = extractDate(filename);
  const remoteUrl = `${REMOTE_BASE}/${hash}.ogg`;

  items.push({
    slug,
    hash,
    lang,
    date,
    contentLines,
    filename,
    remoteUrl,
  });
}

console.log(`${items.length} items to import`);

// 1. Write fountain prose files
for (const item of items) {
  const title = transliterate(item.contentLines[0]).slice(0, 60);
  const draftDate = item.date || "";

  // first line is dialogue, rest are lyrics (~ prefix)
  const [firstLine, ...restLines] = item.contentLines;
  const lyricsBlock = restLines.map((l) => `~${l}`).join("\n");
  const dialogueBlock = lyricsBlock
    ? `${firstLine}\n${lyricsBlock}`
    : firstLine;

  const fountain = `Title:
    ${title}
Credit: Read by
Author: unknown
Narrator: norcivilian
Source: Garden
Audio: ${item.remoteUrl}${draftDate ? `\nDraft date: ${draftDate}` : ""}
Contact:
    fetsorn@gmail.com

# calm

EXT. STAGE - DAY [[STAGE]]

NORCIVILIAN
(${item.slug})
${dialogueBlock}
`;

  fs.writeFileSync(path.join(PROSE_DIR, `${item.slug}.${item.lang}`), fountain);
}
console.log(`wrote ${items.length} fountain files`);

// 2. Append entries to stage.en fountain
const stageEntries = items
  .map(
    (i) => `
NORCIVILIAN
(${i.slug})
${i.contentLines[0].slice(0, 80)}`,
  )
  .join("\n");
const stageContent = fs.readFileSync(STAGE_FOUNTAIN, "utf-8").trimEnd();
fs.writeFileSync(STAGE_FOUNTAIN, stageContent + "\n" + stageEntries + "\n");
console.log(`appended ${items.length} entries to stage.en`);
