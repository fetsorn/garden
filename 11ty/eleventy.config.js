import { getCatalog } from "./src/passes/00-catalog.js";
import { fountainTransform } from "./src/passes/02-fountain.js";
import { portraitsTransform } from "./src/passes/03-portraits.js";
import { itemsTransform } from "./src/passes/04-items.js";
import { themeTransform } from "./src/passes/05-theme.js";
import { ambientTransform } from "./src/passes/06-ambient.js";

export default async function (eleventyConfig) {
  const catalog = await getCatalog();

  // pass 1 - templates

  // pass 2 — fountain skeleton
  eleventyConfig.addTransform("pass-2-fountain", (content, outputPath) => {
    return fountainTransform(content, outputPath, catalog);
  });

  // pass 3 — portraits
  eleventyConfig.addTransform("pass-3-portraits", (content, outputPath) => {
    return portraitsTransform(content, outputPath, catalog);
  });

  // pass 4 — item metadata
  eleventyConfig.addTransform("pass-4-items", (content, outputPath) => {
    return itemsTransform(content, outputPath, catalog);
  });

  // pass 5 — theme
  eleventyConfig.addTransform("pass-5-theme", (content, outputPath) => {
    return themeTransform(content, outputPath, catalog);
  });

  // pass 6 — ambient
  eleventyConfig.addTransform("pass-6-ambient", (content, outputPath) => {
    return ambientTransform(content, outputPath, catalog);
  });

  // static assets
  eleventyConfig.addPassthroughCopy({ "src/portraits": "/portraits" });
  eleventyConfig.addPassthroughCopy({ "src/themes": "/themes" });
  eleventyConfig.addPassthroughCopy({ "src/assets/index.css": "/index.css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/lang.js": "/lang.js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/robots.txt": "/robots.txt" });

  // config
  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setIncludesDirectory("_includes");
  eleventyConfig.setDataDirectory("_data");
  eleventyConfig.setOutputDirectory("_site");
}
