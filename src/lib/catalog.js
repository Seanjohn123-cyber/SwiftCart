import fs from "node:fs";
import path from "node:path";

const CATALOG_PATH = path.join(process.cwd(), "src", "data", "catalog.json");

export function getCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}
