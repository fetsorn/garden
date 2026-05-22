import path from "node:path";
import { load } from "cheerio";
import { Fountain } from "fountain-js";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {}
    }
    return hljs.highlightAuto(str).value;
  },
});

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

// ── remote type detection ─────────────────────────────────────────

const AUDIO_EXT = /\.(ogg|mp3|m4a|flac|wav|aac|opus)$/i;
const VIDEO_EXT = /\.(mp4|mkv|webm|mov|avi)$/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;

function renderRemote(url) {
  if (!url) return "";
  if (AUDIO_EXT.test(url)) {
    return `\n      <audio class="item-audio" src="${url}"></audio>\n      <button class="item-play" onclick="toggleItemAudio(this)">&#9654;</button>`;
  }
  if (VIDEO_EXT.test(url)) {
    return `\n      <video class="item-video" src="${url}" controls preload="metadata"></video>`;
  }
  if (IMAGE_EXT.test(url)) {
    return `\n      <img class="item-image" src="${url}" loading="lazy">`;
  }
  // plain link
  return `\n      <a class="item-link" href="${url}" target="_blank" rel="noopener">&#128279;</a>`;
}

// ── place with items: render parsed fountain ──────────────────────

function renderItemUtterances(place, lang, catalog) {
  const sections = [];

  for (const item of place.items) {
    if (!item.prose[lang]) continue;

    const utterances = parseFountain(item.prose[lang]);
    for (const u of utterances) {
      const classes = [u.mood, u.location].filter(Boolean).join(" ");
      let extra = renderRemote(item.remote);

      let blockquoteContent = "";
      if (u.text) {
        blockquoteContent += `\n        ${md.render(u.text)}`;
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

function getLatestItemDate(place, catalog) {
  const items = catalog.placeBySlug.get(place.slug)?.itemSlugs || [];
  let latest = null;
  for (const itemSlug of items) {
    const item = catalog.itemBySlug.get(itemSlug);
    if (item?.date && (!latest || item.date > latest)) {
      latest = item.date;
    }
  }
  return latest;
}

function getSortDate(place, catalog) {
  return getLatestItemDate(place, catalog) || place.date || "";
}

function renderInteriorUtterances(place, lang, catalog) {
  // sort interior places by item date (falling back to place date), newest first
  // places with no date at all go to the bottom
  const sorted = [...place.interior].sort((a, b) => {
    const dateA = getSortDate(a, catalog);
    const dateB = getSortDate(b, catalog);
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    return 0;
  });

  const sections = [];

  for (const child of sorted) {
    if (!child.prose[lang]) continue;

    const character = child.author || child.slug;
    const text = child.prose[lang];

    // peek for audio
    const audioResults = catalog.peekAudio(child, lang);
    const audioUrl =
      audioResults.length > 0 ? audioResults[0].remote : null;

    let extra = renderRemote(audioUrl);

    // warnings
    let warningHtml = "";
    if (child.warnings.length > 0) {
      const tags = child.warnings
        .map((w) => `<span class="warning-tag" data-warning="${w}">${catalog.warningLabel(w, lang)}</span>`)
        .join(" ");
      warningHtml = `\n      <div class="warnings">${tags}</div>`;
    }

    // dates: item date (what was recorded) and place date (the poem/text)
    const itemDate = getLatestItemDate(child, catalog);
    const placeDate = child.date;
    let dateHtml = "";
    if (itemDate || placeDate) {
      const parts = [];
      if (itemDate) parts.push(`<time class="item-date">${itemDate}</time>`);
      if (placeDate) parts.push(`<time class="place-date">${placeDate}</time>`);
      dateHtml = `\n      <div class="dates">${parts.join(" ")}</div>`;
    }

    sections.push(`    <section>
      <figure data-character="${character}"><figcaption>${character}</figcaption></figure>
      <blockquote data-uuid="${child.slug}">
        ${md.render(text)}
      </blockquote>${extra}${warningHtml}${dateHtml}
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
