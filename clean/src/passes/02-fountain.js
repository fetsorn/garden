import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { Fountain } from "fountain-js";

const PROSE_DIR = path.resolve(import.meta.dirname, "../../../prose");

// extract [[NOTE]] from scene headings or character names
function extractBracketNote(text) {
  const match = text.match(/\[\[([^\]]+)\]\]/);
  return match ? match[1].toLowerCase() : null;
}

// extract canonical character id: "ОБЪЯВЛЕНИЕ [[AD]]" → "ad", "JACK" → "jack"
function extractCharacter(text) {
  const note = extractBracketNote(text);
  if (note) return note;
  // strip fountain @ prefix for forced characters
  const clean = text.replace(/^@/, "").trim();
  return clean.toLowerCase();
}

// parse a fountain file into utterance objects
function parseFountain(content) {
  const fountain = new Fountain();
  const parsed = fountain.parse(content, true);
  const tokens = parsed.tokens || [];

  const utterances = [];
  let mood = "";
  let location = "";
  let currentCharacter = null;
  let currentUuid = null;

  for (const token of tokens) {
    switch (token.type) {
      case "section":
        // # mood directive
        mood = (token.text || "").replace(/<[^>]+>/g, "").trim().toLowerCase();
        break;

      case "scene_heading": {
        const loc = extractBracketNote(token.text || "");
        if (loc) location = loc;
        break;
      }

      case "character":
        currentCharacter = extractCharacter((token.text || "").replace(/<[^>]+>/g, ""));
        currentUuid = null;
        break;

      case "parenthetical":
        currentUuid = (token.text || "").replace(/<[^>]+>/g, "").replace(/[()]/g, "").trim();
        break;

      case "dialogue":
        if (currentCharacter) {
          utterances.push({
            character: currentCharacter,
            uuid: currentUuid,
            mood,
            location,
            text: (token.text || "").replace(/<[^>]+>/g, ""),
            isLyrics: false,
          });
        }
        break;

      case "lyrics":
        if (currentCharacter) {
          // append lyrics to last utterance if same character
          const last = utterances[utterances.length - 1];
          if (last && last.character === currentCharacter && last.uuid === currentUuid) {
            if (!last.lyricsLines) last.lyricsLines = [];
            // fountain-js returns all lyrics as one token, newline-separated
            const lines = (token.text || "").replace(/<[^>]+>/g, "").split("\n");
            last.lyricsLines.push(...lines);
          }
        }
        break;
    }
  }

  return utterances;
}

// render utterances to section HTML
function renderUtterances(utterances) {
  return utterances
    .map((u) => {
      const classes = [u.mood, u.location].filter(Boolean).join(" ");
      const uuidAttr = u.uuid ? ` data-uuid="${u.uuid}"` : "";

      let blockquoteContent = `\n        <p>${u.text}</p>`;
      if (u.lyricsLines && u.lyricsLines.length) {
        blockquoteContent += `\n        <p class="lyrics">${u.lyricsLines.join("<br>")}</p>`;
      }

      return `    <section class="${classes}">
      <figure data-character="${u.character}"><figcaption>${u.character}</figcaption></figure>
      <blockquote${uuidAttr}>${blockquoteContent}
      </blockquote>
    </section>`;
    })
    .join("\n");
}

export function fountainTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;

  const $ = load(content);

  for (const script of place.scripts) {
    const lang = script.split(".").slice(-2, -1)[0];
    const filePath = path.join(PROSE_DIR, script);
    const source = fs.readFileSync(filePath, "utf-8");
    const utterances = parseFountain(source);
    const sectionsHtml = renderUtterances(utterances);

    const article = $(`article[lang="${lang}"]`);
    if (article.length) {
      article.html("\n" + sectionsHtml + "\n  ");
    }
  }

  return $.html();
}
