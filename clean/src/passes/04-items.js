import path from "node:path";
import { load } from "cheerio";

export function itemsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;

  const $ = load(content);
  const { itemPlaceMap, itemFileMap, slugByUuid, resolveFileUrl } = catalog;

  const promises = [];

  $("blockquote[data-uuid]").each(function () {
    const uuid = $(this).attr("data-uuid");
    const blockquote = $(this);
    const section = blockquote.closest("section");

    // item → place link
    const targetPlaceUuid = itemPlaceMap.get(uuid);
    if (targetPlaceUuid) {
      const targetPlace = slugByUuid.get(targetPlaceUuid);
      if (targetPlace) {
        // wrap first <p> content in a link
        const firstP = blockquote.find("p").first();
        if (firstP.length) {
          const text = firstP.html();
          firstP.html(`<a href="./${targetPlace.slug}.html">${text}</a>`);
        }
      }
    }

    // item → file attachment
    const fileId = itemFileMap.get(uuid);
    if (fileId) {
      // resolve file url asynchronously — collect promises
      promises.push(
        (async () => {
          const url = await catalog.resolveFileUrl(fileId);
          if (url) {
            const fileName = path.basename(url);
            section.append(
              `  <details>\n        <summary>attachments</summary>\n        <a href="${url}">${fileName}</a>\n      </details>`
            );
          }
        })()
      );
    }
  });

  // if we have async work, we need to handle it
  // note: 11ty transforms can be async in v3
  if (promises.length) {
    return Promise.all(promises).then(() => $.html());
  }

  return $.html();
}
