import path from "node:path";
import { load } from "cheerio";

export function itemsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");

  const $ = load(content);

  $("blockquote[data-uuid]").each(function () {
    const targetSlug = $(this).attr("data-uuid");
    if (targetSlug === slug) return;

    const targetPlace = catalog.placeBySlug.get(targetSlug);
    if (!targetPlace) return;

    const blockquote = $(this);
    const firstP = blockquote.find("p").first();
    if (!firstP.length) return;

    const text = firstP.html();
    const href = targetPlace.passthrough || `./${targetPlace.slug}.html`;
    firstP.html(`<a href="${href}">${text}</a>`);
  });

  return $.html();
}
