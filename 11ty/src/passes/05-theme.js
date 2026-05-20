import path from "node:path";
import { load } from "cheerio";

export function themeTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.placeBySlug.get(slug);
  if (!place) return content;
  if (!place.theme) return content;

  const $ = load(content);
  $("head").append(
    `  <link rel="stylesheet" href="./themes/${place.theme}.css">`,
  );

  return $.html();
}
