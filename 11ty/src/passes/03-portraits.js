import path from "node:path";
import fs from "node:fs";
import { load } from "cheerio";

const PORTRAITS_DIR = path.resolve(import.meta.dirname, "../../portraits");

export function portraitsTransform(content, outputPath, catalog) {
  if (!outputPath || !outputPath.endsWith(".html")) return content;

  const $ = load(content);

  $("figure[data-character]").each(function () {
    const character = $(this).attr("data-character");
    const svgPath = path.join(PORTRAITS_DIR, `${character}.svg`);
    if (fs.existsSync(svgPath)) {
      $(this).prepend(`<img src="./portraits/${character}.svg" alt="${character}">`);
    }
  });

  return $.html();
}
