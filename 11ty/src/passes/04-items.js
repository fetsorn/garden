import path from "node:path";
import { load } from "cheerio";

export function itemsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;

  const $ = load(content);
  const { placeBySlug, audioMap } = catalog;

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

    // item slug → play button (from fountain Audio: metadata)
    const itemAudio = audioMap.get(itemSlug);
    if (itemAudio) {
      // find which lang this section is inside
      const article = section.closest("article[lang]");
      const lang = article.length ? article.attr("lang") : null;
      // pick matching lang, or first available
      const url = (lang && itemAudio[lang]) || Object.values(itemAudio)[0];
      if (url) {
        section.append(
          `  <audio class="item-audio" src="${url}"></audio>\n      <button class="item-play" onclick="toggleItemAudio(this)">&#9654;</button>`
        );
      }
    }
  });

  return $.html();
}
