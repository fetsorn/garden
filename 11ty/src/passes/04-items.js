import path from "node:path";
import { load } from "cheerio";

export function itemsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;

  const $ = load(content);
  const { placeBySlug, itemRemoteMap } = catalog;

  $("blockquote[data-uuid]").each(function () {
    const itemSlug = $(this).attr("data-uuid");
    const blockquote = $(this);
    const section = blockquote.closest("section");

    // item slug → place link (skip self-links on canonical page)
    if (itemSlug !== slug) {
      const targetPlace = placeBySlug.get(itemSlug);
      if (targetPlace) {
        const firstP = blockquote.find("p").first();
        if (firstP.length) {
          const text = firstP.html();
          firstP.html(`<a href="./${targetPlace.slug}.html">${text}</a>`);
        }
      }
    }

    // item slug → remote attachment
    const url = itemRemoteMap.get(itemSlug);
    if (url) {
      const fileName = path.basename(url);
      section.append(
        `  <details>\n        <summary>attachments</summary>\n        <a href="${url}">${fileName}</a>\n      </details>`
      );
    }
  });

  return $.html();
}
