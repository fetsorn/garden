import fs from "node:fs";
import { getCatalog } from "./src/passes/00-catalog.js";
import { fountainTransform } from "./src/passes/02-fountain.js";
import { portraitsTransform } from "./src/passes/03-portraits.js";
import { itemsTransform } from "./src/passes/04-items.js";
import { themeTransform } from "./src/passes/05-theme.js";
import { ambientTransform } from "./src/passes/06-ambient.js";

const catalog = await getCatalog();

// ensure fixture directories exist
for (let i = 0; i <= 6; i++) {
  fs.mkdirSync(`fixtures/pass-${i}`, { recursive: true });
}

// pass-0: catalog snapshot
const out = {
  places: catalog.places.map((p) => {
    const o = { slug: p.slug, type: p.type };
    if (p.langs) o.langs = p.langs;
    if (Object.keys(p.title).length) o.title = p.title;
    o.adjacent = p.adjacent;
    o.theme = p.theme;
    o.ambient = p.ambient ? p.ambient.src : null;
    return o;
  }),
};
fs.writeFileSync("fixtures/pass-0.json", JSON.stringify(out, null, 2) + "\n");
console.log("pass-0: catalog");

// pass-1: build templates (no transforms) via eleventy
import { execSync } from "node:child_process";
const realConfig = fs.readFileSync("eleventy.config.js", "utf-8");
fs.writeFileSync(
  "eleventy.config.js",
  `import { getCatalog } from './src/passes/00-catalog.js';
export default async function (eleventyConfig) {
  await getCatalog();
  eleventyConfig.addPassthroughCopy({ 'src/portraits': '/portraits' });
  eleventyConfig.addPassthroughCopy({ 'src/themes': '/themes' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/index.css': '/index.css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/lang.js': '/lang.js' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/robots.txt': '/robots.txt' });
  eleventyConfig.setInputDirectory('src');
  eleventyConfig.setIncludesDirectory('_includes');
  eleventyConfig.setDataDirectory('_data');
  eleventyConfig.setOutputDirectory('_site');
}
`,
);
execSync("npx @11ty/eleventy", { stdio: "pipe" });
fs.writeFileSync("eleventy.config.js", realConfig);

const htmlFiles = fs
  .readdirSync("_site")
  .filter((f) => f.endsWith(".html"));
for (const f of htmlFiles) {
  fs.copyFileSync(`_site/${f}`, `fixtures/pass-1/${f}`);
}
fs.copyFileSync("src/assets/index.css", "fixtures/pass-1/index.css");
fs.copyFileSync("src/assets/lang.js", "fixtures/pass-1/lang.js");
console.log("pass-1: templates");

// passes 2-6: apply transforms in sequence
const transforms = [
  { name: "fountain", fn: (c, o) => fountainTransform(c, o, catalog) },
  { name: "portraits", fn: (c, o) => portraitsTransform(c, o, catalog) },
  { name: "items", fn: (c, o) => itemsTransform(c, o, catalog) },
  { name: "theme", fn: (c, o) => themeTransform(c, o, catalog) },
  { name: "ambient", fn: (c, o) => ambientTransform(c, o, catalog) },
];

let prev = 1;
for (const [i, t] of transforms.entries()) {
  const pass = i + 2;
  for (const f of htmlFiles) {
    const content = fs.readFileSync(`fixtures/pass-${prev}/${f}`, "utf-8");
    fs.writeFileSync(`fixtures/pass-${pass}/${f}`, t.fn(content, `/${f}`));
  }
  fs.copyFileSync("src/assets/index.css", `fixtures/pass-${pass}/index.css`);
  fs.copyFileSync("src/assets/lang.js", `fixtures/pass-${pass}/lang.js`);
  console.log(`pass-${pass}: ${t.name}`);
  prev = pass;
}
