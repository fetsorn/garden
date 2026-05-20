import fs from "node:fs";
import path from "node:path";
import { selectRecord } from "@fetsorn/csvs-js";

const CSVS_DIR = path.resolve(import.meta.dirname, "../../../csvs");

// query csvs-js with bare mode (files live directly in the csvs dir)
export async function query(collection, constraints = {}) {
  return selectRecord({
    fs,
    dir: CSVS_DIR,
    query: { _: collection, ...constraints },
    bare: true,
  });
}

// read all pairs from a two-column tablet directly (fast path)
export async function pairs(trunk, leaf) {
  const filePath = path.join(CSVS_DIR, `${trunk}-${leaf}.csv`);
  const content = fs.readFileSync(filePath, "utf-8");
  const result = [];
  for (const line of content.split("\n")) {
    if (!line) continue;
    const commaIdx = line.indexOf(",");
    if (commaIdx === -1) continue;
    result.push([line.slice(0, commaIdx), line.slice(commaIdx + 1)]);
  }
  return result;
}
