import fs from "node:fs";
import path from "node:path";
import { query, pairs } from "./00-csvs.js";

const PROSE_DIR = path.resolve(import.meta.dirname, "../../../csvs/prose");

let _catalog = null;

export async function getCatalog() {
  if (_catalog) return _catalog;
  _catalog = await buildCatalog();
  return _catalog;
}

async function buildCatalog() {
  // ── read all tablets ───────────────────────────────────────────────

  const adjPairs = await pairs("place", "adjacent");
  const interiorPairs = await pairs("place", "interior");
  const placeItemPairs = await pairs("place", "item");
  const authorPairs = await pairs("place", "author");
  const itemRemotePairs = await pairs("item", "remote");
  const itemDatePairs = await pairs("item", "date");
  const placeDatePairs = await pairs("place", "date");
  const themePairs = await pairs("place", "theme");
  const ambientPairs = await pairs("place", "ambient");
  const passthroughPairs = await pairs("place", "passthrough");
  const accessPairs = await pairs("place", "access");

  // ── build maps ─────────────────────────────────────────────────────

  const adjMap = new Map();
  for (const [from, to] of adjPairs) {
    if (!adjMap.has(from)) adjMap.set(from, []);
    adjMap.get(from).push(to);
  }

  const interiorMap = new Map();
  for (const [parent, child] of interiorPairs) {
    if (!interiorMap.has(parent)) interiorMap.set(parent, []);
    interiorMap.get(parent).push(child);
  }

  const placeItemMap = new Map();
  for (const [place, item] of placeItemPairs) {
    if (!placeItemMap.has(place)) placeItemMap.set(place, []);
    placeItemMap.get(place).push(item);
  }

  const authorMap = new Map(authorPairs);
  const itemRemoteMap = new Map(itemRemotePairs);

  // item-date: keep latest date per item (some items may have multiple)
  const itemDateMap = new Map();
  for (const [item, date] of itemDatePairs) {
    const prev = itemDateMap.get(item);
    if (!prev || date > prev) itemDateMap.set(item, date);
  }

  // place-date: keep latest date per place
  const placeDateMap = new Map();
  for (const [place, date] of placeDatePairs) {
    const prev = placeDateMap.get(place);
    if (!prev || date > prev) placeDateMap.set(place, date);
  }

  const themeMap = new Map(themePairs);
  const ambientMap = new Map(ambientPairs);
  const passthroughMap = new Map(passthroughPairs);
  const accessMap = new Map(accessPairs);

  // ── collect item slugs ────────────────────────────────────────────

  const itemSlugs = new Set();
  for (const [, item] of placeItemPairs) itemSlugs.add(item);

  // ── discover prose files ──────────────────────────────────────────

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

  // ── build items ───────────────────────────────────────────────────

  const itemBySlug = new Map();
  for (const slug of itemSlugs) {
    const langs = langsBySlug.get(slug) || [];
    const prose = {};
    for (const lang of langs) {
      prose[lang] = fs.readFileSync(
        path.join(PROSE_DIR, `${slug}.${lang}`),
        "utf-8",
      );
    }
    itemBySlug.set(slug, {
      slug,
      langs,
      prose,
      remote: itemRemoteMap.get(slug) || null,
      date: itemDateMap.get(slug) || null,
    });
  }

  // ── build places (everything that isn't an item) ──────────────────

  const places = [];
  const placeBySlug = new Map();

  for (const [slug, langs] of langsBySlug) {
    if (itemSlugs.has(slug)) continue;

    const prose = {};
    for (const lang of langs) {
      prose[lang] = fs.readFileSync(
        path.join(PROSE_DIR, `${slug}.${lang}`),
        "utf-8",
      );
    }

    const place = {
      slug,
      langs,
      prose,
      author: authorMap.get(slug) || null,
      adjacent: adjMap.get(slug) || [],
      interiorSlugs: interiorMap.get(slug) || [],
      itemSlugs: placeItemMap.get(slug) || [],
      interior: [],  // resolved later
      items: [],     // resolved later
      theme: themeMap.get(slug) || null,
      date: placeDateMap.get(slug) || null,
      ambient: ambientMap.get(slug) || null,
      passthrough: passthroughMap.get(slug) || null,
      access: accessMap.get(slug) || null,
    };

    places.push(place);
    placeBySlug.set(slug, place);
  }

  // ── build interior backlinks (child → parents) ──────────────────

  const parentMap = new Map();
  for (const [parent, child] of interiorPairs) {
    if (!parentMap.has(child)) parentMap.set(child, []);
    parentMap.get(child).push(parent);
  }

  // ── resolve references ────────────────────────────────────────────

  for (const place of places) {
    place.interior = place.interiorSlugs
      .map((s) => placeBySlug.get(s))
      .filter(Boolean);

    place.items = place.itemSlugs
      .map((s) => itemBySlug.get(s))
      .filter(Boolean);

    // adjacent + backlinks from parents that have this place as interior
    const adjSlugs = new Set(place.adjacent);
    const backlinks = (parentMap.get(place.slug) || [])
      .filter((s) => !adjSlugs.has(s));

    place.adjacentPlaces = [...place.adjacent, ...backlinks]
      .map((s) => placeBySlug.get(s))
      .filter(Boolean)
      .map((p) => ({ slug: p.slug, prose: p.prose, langs: p.langs }));
  }

  // ── peek: find playable items recursively ─────────────────────────

  function peekAudio(place, lang, visited = new Set()) {
    if (visited.has(place.slug)) return [];
    visited.add(place.slug);
    const results = [];

    // direct items
    for (const item of place.items) {
      if (item.remote && item.prose[lang]) {
        results.push({ slug: item.slug, remote: item.remote });
      }
    }

    // recurse into interior places
    for (const child of place.interior) {
      results.push(...peekAudio(child, lang, visited));
    }

    return results;
  }

  return {
    places,
    placeBySlug,
    itemBySlug,
    peekAudio,
  };
}
