import { getCatalog } from "../passes/00-catalog.js";

export default async function () {
  const catalog = await getCatalog();

  // find which slugs are interior children
  const childSlugs = new Set();
  for (const place of catalog.places) {
    for (const child of place.interior) {
      childSlugs.add(child.slug);
    }
  }

  // resolve warning labels per lang
  function resolveWarnings(place) {
    return place.warnings.map((w) => {
      const labels = {};
      for (const lang of place.langs) {
        labels[lang] = catalog.warningLabel(w, lang);
      }
      return { slug: w, labels };
    });
  }

  // flatten tree depth-first with indent level
  function flatten(place, depth) {
    const result = [{
      slug: place.slug,
      langs: place.langs,
      prose: place.prose,
      depth,
      warnings: resolveWarnings(place),
    }];
    for (const child of place.interior) {
      if (child.access === "private") continue;
      result.push(...flatten(child, depth + 1));
    }
    return result;
  }

  // top-level: places not interior to anything
  const roots = catalog.places
    .filter((p) => !childSlugs.has(p.slug) && p.access !== "private");

  const items = [];
  for (const root of roots) {
    items.push(...flatten(root, 0));
  }

  return items;
}
