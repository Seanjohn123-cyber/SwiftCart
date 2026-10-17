import assert from "node:assert/strict";
import test from "node:test";
import { getCatalog } from "../src/lib/catalog.js";
import { rankCatalogMatches } from "../src/lib/catalog-ranking.js";
import { flattenCatalog } from "../src/lib/catalog-shapes.js";
import { searchCatalog } from "../src/lib/catalog-search.js";

const catalog = getCatalog();
const variants = flattenCatalog(catalog);

test("catalog products own shared details and variants own sellable inventory", () => {
  assert.ok(catalog.length >= 24 && catalog.length <= 30);
  assert.equal(new Set(catalog.map((product) => product.id)).size, catalog.length);

  const skus = [];
  for (const product of catalog) {
    assert.match(product.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(product.sku, undefined);
    assert.equal(product.price, undefined);
    assert.equal(product.priceMinor, undefined);
    assert.equal(product.stock, undefined);
    assert.ok(typeof product.category === "string" && product.category);
    assert.ok(Array.isArray(product.tags));
    assert.ok(
      Array.isArray(product.images) &&
        product.images.length > 0 &&
        product.images.every(
          (image) => new URL(image).hostname === "images.unsplash.com",
        ),
    );
    assert.equal(product.currency, "USD");
    assert.ok(
      product.rating &&
        Number.isFinite(product.rating.average) &&
        Number.isInteger(product.rating.count),
    );
    assert.ok(Array.isArray(product.variants) && product.variants.length > 0);

    for (const variant of product.variants) {
      assert.ok(variant.sku);
      assert.ok(Number.isInteger(variant.priceMinor) && variant.priceMinor > 0);
      assert.ok(Number.isInteger(variant.stock) && variant.stock >= 0);
      assert.ok(variant.color);
      assert.notEqual(variant.size, undefined);
      skus.push(variant.sku);
    }
  }
  assert.equal(new Set(skus).size, skus.length);
});

test("catalog supports exact color, size, price, and available-stock queries", () => {
  const results = searchCatalog(
    variants,
    { query: "blue running shoes" },
    "Cheapest blue running shoes under $80, size 10",
  );

  assert.ok(results.length >= 3);
  const ranked = rankCatalogMatches(
    results,
    "Cheapest blue running shoes under $80, size 10",
  );
  assert.equal(ranked[0].sku, "DEMO-TIDAL-BLU-10");
  assert.equal(ranked[0].priceMinor, 5800);
  assert.equal(ranked[0].proposal.status, "awaiting_approval");
  assert.equal(new Set(ranked.map((item) => item.id)).size, ranked.length);
  assert.ok(
    results.every(
      (variant) =>
        variant.stock > 0 &&
        variant.priceMinor < 8000 &&
        Number(variant.size) === 10 &&
        /blue|navy|midnight blue/i.test(variant.color) &&
        ["running", "shoes"].includes(variant.category),
    ),
  );
});

test("Tidal Runner exposes separate color-size variants and unavailable stock", () => {
  const tidal = catalog.find((product) => product.id === "tidal-runner-2");
  assert.ok(tidal);
  assert.ok(
    tidal.variants.some(
      (variant) => variant.color === "blue" && variant.size === 10,
    ),
  );
  assert.ok(
    tidal.variants.some(
      (variant) => variant.color === "black" && variant.size === 10,
    ),
  );
  assert.ok(tidal.variants.some((variant) => variant.stock === 0));
});
