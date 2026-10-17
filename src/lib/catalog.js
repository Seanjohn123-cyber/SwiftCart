import fs from "node:fs";
import path from "node:path";
import {
  flattenCatalog,
  flattenCatalogVariant,
} from "./catalog-shapes.js";

const CATALOG_PATH = path.join(process.cwd(), "src", "data", "catalog.json");

export function getCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

export function getCatalogVariants() {
  return flattenCatalog(getCatalog());
}

export function getCatalogVariantBySku(sku) {
  for (const product of getCatalog()) {
    const variant = product.variants?.find((item) => item.sku === sku);
    if (variant) return flattenCatalogVariant(product, variant);
  }
  return null;
}
