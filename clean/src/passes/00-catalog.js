import fs from "node:fs";
import path from "node:path";
import { query, pairs } from "./00-csvs.js";
import { Fountain } from "fountain-js";
import site from "../_data/site.js";

const PROSE_DIR = path.resolve(import.meta.dirname, "../../../prose");

let _catalog = null;

export async function getCatalog() {
  if (_catalog) return _catalog;
  _catalog = await buildCatalog();
  return _catalog;
}

async function buildCatalog() {
  // place-script: place uuid → script filename
  const scriptPairs = await pairs("place", "script");

  // group scripts by place uuid
  const placeMap = new Map();
  for (const [uuid, script] of scriptPairs) {
    if (!placeMap.has(uuid)) placeMap.set(uuid, { uuid, scripts: [] });
    placeMap.get(uuid).scripts.push(script);
  }

  // adjacency
  const adjPairs = await pairs("place", "adjacent");
  const adjMap = new Map();
  for (const [from, to] of adjPairs) {
    if (!adjMap.has(from)) adjMap.set(from, []);
    adjMap.get(from).push(to);
  }

  // themes
  const themePairs = await pairs("place", "theme");
  const themeMap = new Map(themePairs);

  // ambient: place → file id
  const ambientPairs = await pairs("place", "ambient");
  const ambientMap = new Map(ambientPairs);

  // resolve ambient file → lfs url
  async function resolveFileUrl(fileId) {
    const fileRecs = await query("file", { file: fileId });
    if (!fileRecs.length) return null;
    const ref = fileRecs[0].reference;
    const refId = typeof ref === "object" ? ref.reference : ref;
    const refRecs = await query("reference", { reference: refId });
    if (!refRecs.length) return null;
    const rec = refRecs[0];
    const hash = typeof rec.hash === "object" ? rec.hash.hash : rec.hash;
    const ext = typeof rec.extension === "object" ? rec.extension.extension : rec.extension;
    return `${site.lfsBase}/${hash}.${ext}`;
  }

  // character portraits
  const portraitPairs = await pairs("character", "portrait");
  const portraitMap = new Map(portraitPairs);

  // item-place
  const itemPlacePairs = await pairs("item", "place");
  const itemPlaceMap = new Map(itemPlacePairs);

  // item-file
  const itemFilePairs = await pairs("item", "file");
  const itemFileMap = new Map(itemFilePairs);

  // build each place
  const places = [];
  for (const [uuid, place] of placeMap) {
    const scripts = place.scripts;
    const firstScript = scripts[0];
    const ext = path.extname(firstScript);

    // determine type
    let type;
    if (ext === ".html") type = "passthrough";
    else if (ext === ".md") type = "markdown";
    else type = "diorama";

    // derive slug: strip lang and extension
    let slug;
    if (type === "passthrough") {
      slug = path.basename(firstScript, ".html");
    } else if (type === "markdown") {
      // e.g. legal.ru.md → legal
      slug = firstScript.split(".")[0];
    } else {
      slug = firstScript.split(".")[0];
    }

    // langs (for markdown and diorama)
    let langs = null;
    if (type === "diorama") {
      langs = scripts.map((s) => s.split(".").slice(-2, -1)[0]);
    } else if (type === "markdown") {
      langs = scripts.map((s) => s.split(".").slice(-2, -1)[0]);
    }

    // titles from fountain/md metadata
    const title = {};
    if (type === "diorama") {
      for (const script of scripts) {
        const lang = script.split(".").slice(-2, -1)[0];
        const content = fs.readFileSync(path.join(PROSE_DIR, script), "utf-8");
        const fountain = new Fountain();
        const parsed = fountain.parse(content);
        title[lang] = parsed.title || slug;
      }
    } else if (type === "markdown") {
      for (const script of scripts) {
        const lang = script.split(".").slice(-2, -1)[0];
        const content = fs.readFileSync(path.join(PROSE_DIR, script), "utf-8");
        const firstHeading = content.match(/^#\s+(.+)$/m);
        title[lang] = firstHeading ? firstHeading[1] : slug;
      }
    }

    // raw content for passthrough
    let rawContent = null;
    if (type === "passthrough") {
      rawContent = fs.readFileSync(path.join(PROSE_DIR, firstScript), "utf-8");
    }

    // rendered markdown
    let renderedContent = null;
    if (type === "markdown") {
      const MarkdownIt = (await import("markdown-it")).default;
      const md = new MarkdownIt();
      renderedContent = {};
      for (const script of scripts) {
        const lang = script.split(".").slice(-2, -1)[0];
        const content = fs.readFileSync(path.join(PROSE_DIR, script), "utf-8");
        renderedContent[lang] = md.render(content);
      }
    }

    // ambient url
    let ambient = null;
    const ambientFileId = ambientMap.get(uuid);
    if (ambientFileId) {
      const url = await resolveFileUrl(ambientFileId);
      if (url) ambient = { src: url };
    }

    places.push({
      uuid,
      slug,
      type,
      scripts,
      langs,
      title,
      adjacent: (adjMap.get(uuid) || []),
      theme: themeMap.get(uuid) || null,
      ambient,
      rawContent,
      renderedContent,
    });
  }

  // resolve adjacent slugs for nav rendering
  const slugByUuid = new Map(places.map((p) => [p.uuid, p]));
  for (const place of places) {
    place.adjacentPlaces = place.adjacent
      .map((uuid) => slugByUuid.get(uuid))
      .filter(Boolean)
      .map((p) => ({ slug: p.slug, title: p.title, langs: p.langs }));
  }

  return {
    places,
    slugByUuid,
    portraitMap,
    itemPlaceMap,
    itemFileMap,
    resolveFileUrl,
  };
}
