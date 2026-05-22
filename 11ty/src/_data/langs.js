import { getCatalog } from "../passes/00-catalog.js";

export default async function () {
  const catalog = await getCatalog();
  const all = new Set();
  for (const place of catalog.places) {
    for (const lang of place.langs) all.add(lang);
  }
  return [...all].sort();
}
