import path from "node:path";
import { load } from "cheerio";

export function ambientTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const slug = path.basename(outputPath, ".html");
  const place = catalog.places.find((p) => p.slug === slug);
  if (!place || place.type !== "diorama") return content;
  if (!place.ambient) return content;

  const $ = load(content);
  const footer = $("footer");
  if (footer.length) {
    footer.before(
      `<audio id="ambient" src="${place.ambient.src}" loop></audio>\n  <button id="ambient-play">enter</button>`
    );
  }

  return $.html();
}
