import path from "node:path";
import { load } from "cheerio";
import { Fountain } from "fountain-js";

// ── fountain parsing (for items) ──────────────────────────────────

function extractBracketNote(text) {
  const match = text.match(/\[\[([^\]]+)\]\]/);
  return match ? match[1].toLowerCase() : null;
}

function extractCharacter(text) {
  const note = extractBracketNote(text);
  if (note) return note;
  const clean = text.replace(/^@/, "").trim();
  return clean.toLowerCase();
}

function parseFountain(content) {
  let parsed;
  try {
    const fountain = new Fountain();
    parsed = fountain.parse(content, true);
  } catch {
    return [];
  }
  const tokens = parsed.tokens || [];

  const utterances = [];
  let mood = "";
  let location = "";
  let currentCharacter = null;
  let currentUuid = null;

  for (const token of tokens) {
    if (!token || !token.type) continue;
    switch (token.type) {
      case "section":
        mood = (token.text || "").replace(/<[^>]+>/g, "").trim().toLowerCase();
        break;

      case "scene_heading": {
        const loc = extractBracketNote(token.text || "");
        if (loc) location = loc;
        break;
      }

      case "character":
        currentCharacter = extractCharacter(
          (token.text || "").replace(/<[^>]+>/g, ""),
        );
        currentUuid = null;
        break;

      case "parenthetical":
        currentUuid = (token.text || "")
          .replace(/<[^>]+>/g, "")
          .replace(/[()]/g, "")
          .trim();
        break;

      case "dialogue":
        if (currentCharacter) {
          utterances.push({
            character: currentCharacter,
            uuid: currentUuid,
            mood,
            location,
            text: (token.text || "").replace(/<[^>]+>/g, ""),
          });
        }
        break;

      case "lyrics":
        if (currentCharacter) {
          // attach to last utterance, or create one if lyrics come first
          let last = utterances[utterances.length - 1];
          if (
            !last ||
            last.character !== currentCharacter ||
            last.uuid !== currentUuid
          ) {
            utterances.push({
              character: currentCharacter,
              uuid: currentUuid,
              mood,
              location,
              text: "",
            });
            last = utterances[utterances.length - 1];
          }
          if (!last.lyricsLines) last.lyricsLines = [];
          const lines = (token.text || "")
            .replace(/<[^>]+>/g, "")
            .split("\n");
          last.lyricsLines.push(...lines);
        }
        break;
    }
  }

  return utterances;
}

// ── place with items: render parsed fountain ──────────────────────

function renderItemUtterances(place, lang, catalog) {
  const sections = [];

  for (const item of place.items) {
    if (!item.prose[lang]) continue;

    const utterances = parseFountain(item.prose[lang]);
    for (const u of utterances) {
      const classes = [u.mood, u.location].filter(Boolean).join(" ");
      let extra = "";
      if (item.remote) {
        extra = `\n      <audio class="item-audio" src="${item.remote}"></audio>\n      <button class="item-play" onclick="toggleItemAudio(this)">&#9654;</button>`;
      }

      let blockquoteContent = "";
      if (u.text) {
        blockquoteContent += `\n        <p>${u.text}</p>`;
      }
      if (u.lyricsLines && u.lyricsLines.length) {
        blockquoteContent += `\n        <p class="lyrics">${u.lyricsLines.join("<br>")}</p>`;
      }

      sections.push(`    <section class="${classes}">
      <figure data-character="${u.character}"><figcaption>${u.character}</figcaption></figure>
      <blockquote>${blockquoteContent}
      </blockquote>${extra}
    </section>`);
    }
  }

  return sections.join("\n");
}

// ── place with interior: render utterances from child places ──────

function renderInteriorUtterances(place, lang, catalog) {
  const sections = [];

  for (const child of place.interior) {
    if (!child.prose[lang]) continue;

    const character = child.author || child.slug;
    const text = child.prose[lang];

    // peek for audio
    const audioResults = catalog.peekAudio(child, lang);
    const audioUrl =
      audioResults.length > 0 ? audioResults[0].remote : null;

    let extra = "";
    if (audioUrl) {
      extra = `\n      <audio class="item-audio" src="${audioUrl}"></audio>\n      <button class="item-play" onclick="toggleItemAudio(this)">&#9654;</button>`;
    }

    sections.push(`    <section>
      <figure data-character="${character}"><figcaption>${character}</figcaption></figure>
      <blockquote data-uuid="${child.slug}">
        <p>${text}</p>
      </blockquote>${extra}
    </section>`);
  }

  return sections.join("\n");
}

// ── transform ────────────────────────────────────────────────────────

export function fountainTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.placeBySlug.get(slug);
  if (!place) return content;

  const $ = load(content);

  for (const lang of place.langs) {
    const article = $(`article[lang="${lang}"]`);
    if (!article.length) continue;

    let html;
    if (place.items.length > 0) {
      // place has items — render parsed fountain
      html = renderItemUtterances(place, lang, catalog);
    } else if (place.interior.length > 0) {
      // place has interior places — render as utterances
      html = renderInteriorUtterances(place, lang, catalog);
    } else {
      continue;
    }

    article.html("\n" + html + "\n  ");
  }

  return $.html();
}
