import path from "node:path";
import { load } from "cheerio";

export function portraitsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;

  const $ = load(content);
  const { portraitMap } = catalog;

  $("figure[data-character]").each(function () {
    const character = $(this).attr("data-character");
    const portrait = portraitMap.get(character);
    if (portrait) {
      $(this).prepend(`<img src="./portraits/${portrait}.svg" alt="${character}">`);
    }
  });

  return $.html();
}
