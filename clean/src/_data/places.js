import { getCatalog } from "../passes/00-catalog.js";

export default async function () {
  const catalog = await getCatalog();
  return catalog.places;
}
