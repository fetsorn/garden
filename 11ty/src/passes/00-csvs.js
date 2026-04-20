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

// convenience: get all pairs from a two-column tablet
// TODO might be faster to read straight from tablet
export async function pairs(trunk, leaf) {
  const records = await query(trunk);
  const result = [];
  for (const rec of records) {
    const trunkVal = rec[trunk];
    const leafVals = Array.isArray(rec[leaf]) ? rec[leaf] : rec[leaf] ? [rec[leaf]] : [];
    for (const lv of leafVals) {
      result.push([trunkVal, typeof lv === "object" ? lv[leaf] : lv]);
    }
  }
  return result;
}
