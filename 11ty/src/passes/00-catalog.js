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

async function buildCatalog() {
  // all place records (union across all place-* tablets)
  const placeRecords = await query("place");

  // place-type for type lookup
  const typePairs = await pairs("place", "type");
  const typeMap = new Map(typePairs);

  // resolve data hash → remote url
  async function resolveDataUrl(hash) {
    const dataRecs = await query("data", { data: hash });
    if (!dataRecs.length) return null;
    const remote = dataRecs[0].remote;
    return typeof remote === "object" ? remote.remote : remote || null;
  }

  // character portraits
  const portraitPairs = await pairs("character", "portrait");
  const portraitMap = new Map(portraitPairs);

  // item-place
  const itemPlacePairs = await pairs("item", "place");
  const itemPlaceMap = new Map(itemPlacePairs);

  // item-data
  const itemDataPairs = await pairs("item", "data");
  const itemDataMap = new Map(itemDataPairs);

  // discover langs from prose directory: slug.lang files
  const proseFiles = fs.readdirSync(PROSE_DIR);
  const langsBySlug = new Map();
  for (const file of proseFiles) {
    const dotIdx = file.indexOf(".");
    if (dotIdx === -1) continue; // no lang tag, skip
    const slug = file.slice(0, dotIdx);
    const lang = file.slice(dotIdx + 1);
    if (!langsBySlug.has(slug)) langsBySlug.set(slug, []);
    langsBySlug.get(slug).push(lang);
  }

  // map csvs type → internal type
  const typeMapping = {
    fountain: "diorama",
    markdown: "markdown",
    hypertext: "passthrough",
  };

  // build each place
  const places = [];
  for (const rec of placeRecords) {
    const slug = rec.place;
    const csvsType = typeMap.get(slug);
    if (!csvsType) continue; // skip places without a type (stale refs)
    const type = typeMapping[csvsType] || csvsType;

    // adjacent (may be string or array)
    const adjacent = Array.isArray(rec.adjacent)
      ? rec.adjacent
      : rec.adjacent
        ? [rec.adjacent]
        : [];

    // theme
    const theme = rec.theme || null;

    // langs from prose dir
    const langs = langsBySlug.get(slug) || null;

    // titles from fountain/md metadata
    const title = {};
    if (type === "diorama" && langs) {
      for (const lang of langs) {
        const content = fs.readFileSync(
          path.join(PROSE_DIR, `${slug}.${lang}`),
          "utf-8",
        );
        const fountain = new Fountain();
        const parsed = fountain.parse(content);
        title[lang] = parsed.title || slug;
      }
    } else if (type === "markdown" && langs) {
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
    if (type === "passthrough" && langs && langs.length) {
      rawContent = fs.readFileSync(
        path.join(PROSE_DIR, `${slug}.${langs[0]}`),
        "utf-8",
      );
    }

    // rendered markdown
    let renderedContent = null;
    if (type === "markdown" && langs) {
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

    // ambient url (now stored directly as a remote URL)
    let ambient = null;
    if (rec.ambient) {
      ambient = { src: rec.ambient };
    }

    places.push({
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

  // resolve adjacent places for nav rendering
  const placeBySlug = new Map(places.map((p) => [p.slug, p]));
  for (const place of places) {
    place.adjacentPlaces = place.adjacent
      .map((slug) => placeBySlug.get(slug))
      .filter(Boolean)
      .map((p) => ({ slug: p.slug, title: p.title, langs: p.langs }));
  }

  return {
    places,
    placeBySlug,
    portraitMap,
    itemPlaceMap,
    itemDataMap,
    resolveDataUrl,
  };
}
