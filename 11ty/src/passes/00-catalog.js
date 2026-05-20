import fs from "node:fs";
import path from "node:path";
import { query, pairs } from "./00-csvs.js";
import { Fountain } from "fountain-js";

const PROSE_DIR = path.resolve(import.meta.dirname, "../../../csvs/prose");

let _catalog = null;

export async function getCatalog() {
  if (_catalog) return _catalog;
  _catalog = await buildCatalog();
  return _catalog;
}

// detect type from prose file content
function sniffType(content) {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) return "passthrough";
  if (trimmed.startsWith("#")) return "markdown";
  return "diorama";
}

async function buildCatalog() {
  // place records (pages with adjacency)
  const placeRecords = await query("place");
  const placeSet = new Set(placeRecords.map((r) => r.place));

  // adjacency map
  const adjPairs = await pairs("place", "adjacent");
  const adjMap = new Map();
  for (const [from, to] of adjPairs) {
    if (!adjMap.has(from)) adjMap.set(from, []);
    adjMap.get(from).push(to);
  }

  // themes
  const themePairs = await pairs("place", "theme");
  const themeMap = new Map(themePairs);

  // ambient
  const ambientPairs = await pairs("place", "ambient");
  const ambientMap = new Map(ambientPairs);

  // character portraits
  const portraitPairs = await pairs("character", "portrait");
  const portraitMap = new Map(portraitPairs);

  // item-remote: item slug → URL
  const itemRemotePairs = await pairs("item", "remote");
  const itemRemoteMap = new Map(itemRemotePairs);

  // discover all pages from prose directory: slug.lang files
  const proseFiles = fs.readdirSync(PROSE_DIR);
  const langsBySlug = new Map();
  for (const file of proseFiles) {
    const dotIdx = file.indexOf(".");
    if (dotIdx === -1) continue;
    const slug = file.slice(0, dotIdx);
    const lang = file.slice(dotIdx + 1);
    if (!langsBySlug.has(slug)) langsBySlug.set(slug, []);
    langsBySlug.get(slug).push(lang);
  }

  // build pages for all slugs that have prose
  const pages = [];
  for (const [slug, langs] of langsBySlug) {
    const firstLang = langs[0];
    const firstFile = path.join(PROSE_DIR, `${slug}.${firstLang}`);
    const firstContent = fs.readFileSync(firstFile, "utf-8");
    const type = sniffType(firstContent);

    // adjacency (only places have it)
    const adjacent = adjMap.get(slug) || [];

    // theme
    const theme = themeMap.get(slug) || null;

    // titles
    const title = {};
    if (type === "diorama") {
      for (const lang of langs) {
        const content = fs.readFileSync(
          path.join(PROSE_DIR, `${slug}.${lang}`),
          "utf-8",
        );
        const fountain = new Fountain();
        const parsed = fountain.parse(content);
        title[lang] = parsed.title || slug;
      }
    } else if (type === "markdown") {
      for (const lang of langs) {
        const content = fs.readFileSync(
          path.join(PROSE_DIR, `${slug}.${lang}`),
          "utf-8",
        );
        const firstHeading = content.match(/^#\s+(.+)$/m);
        title[lang] = firstHeading ? firstHeading[1] : slug;
      }
    }

    // raw content for passthrough
    let rawContent = null;
    if (type === "passthrough") {
      rawContent = firstContent;
    }

    // rendered markdown
    let renderedContent = null;
    if (type === "markdown") {
      const MarkdownIt = (await import("markdown-it")).default;
      const md = new MarkdownIt();
      renderedContent = {};
      for (const lang of langs) {
        const content = fs.readFileSync(
          path.join(PROSE_DIR, `${slug}.${lang}`),
          "utf-8",
        );
        renderedContent[lang] = md.render(content);
      }
    }

    // ambient url
    let ambient = null;
    const ambientUrl = ambientMap.get(slug);
    if (ambientUrl) {
      ambient = { src: ambientUrl };
    }

    pages.push({
      slug,
      type,
      langs,
      title,
      adjacent,
      theme,
      ambient,
      rawContent,
      renderedContent,
    });
  }

  // resolve adjacent pages for nav rendering
  const placeBySlug = new Map(pages.map((p) => [p.slug, p]));
  for (const page of pages) {
    page.adjacentPlaces = page.adjacent
      .map((slug) => placeBySlug.get(slug))
      .filter(Boolean)
      .map((p) => ({ slug: p.slug, title: p.title, langs: p.langs }));
  }

  return {
    places: pages,
    placeBySlug,
    portraitMap,
    itemRemoteMap,
  };
}
