import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, "fixtures");
const SITE = path.join(__dirname, "_site");

// compare _site/ against fixtures/pass-6/ (final output)
const FINAL = path.join(FIXTURES, "pass-6");

function normalize(html) {
  return html.replace(/\s+/g, " ").trim();
}

let pass = 0;
let fail = 0;

const files = fs.readdirSync(FINAL).filter((f) => f.endsWith(".html"));

for (const file of files) {
  const expected = fs.readFileSync(path.join(FINAL, file), "utf-8");
  const outputPath = path.join(SITE, file);

  if (!fs.existsSync(outputPath)) {
    console.log(`FAIL ${file}: not found in _site/`);
    fail++;
    continue;
  }

  const actual = fs.readFileSync(outputPath, "utf-8");

  if (normalize(actual) === normalize(expected)) {
    console.log(`PASS ${file}`);
    pass++;
  } else {
    console.log(`FAIL ${file}: output differs`);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
