const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "with",
  "under",
  "less",
  "than",
  "size",
  "find",
  "show",
  "want",
  "need",
  "please",
  "cheapest",
  "cheap",
  "lowest",
  "price",
  "budget",
  "running",
  "run",
  "shoe",
  "shoes",
  "free",
  "shipping",
  "delivery",
  "option",
  "options",
  "product",
  "products",
  "best",
  "value",
]);

const SHOE_CATEGORIES = new Set(["shoes", "running", "casual", "sandals"]);
const COLOR_ALIASES = {
  blue: ["blue", "navy", "midnight"],
  gray: ["gray", "grey"],
  grey: ["gray", "grey"],
};

function normalizedSize(value) {
  return String(value).match(/\d+(?:\.\d+)?/)?.[0];
}

function supportsSize(product, requestedSize) {
  const availableSizes = Array.isArray(product.sizes)
    ? product.sizes
    : [product.size];
  return availableSizes.some(
    (size) => normalizedSize(size) === normalizedSize(requestedSize),
  );
}

function getPriceMinor(product) {
  return Number.isInteger(product.priceMinor)
    ? product.priceMinor
    : Math.round(Number(product.price) * 100);
}

function matchesCategory(productCategory, requestedCategory, query) {
  const category = String(productCategory || "").toLowerCase();
  if (requestedCategory === "shoes") return SHOE_CATEGORIES.has(category);
  if (requestedCategory === "running") {
    return category === "running" || category === "shoes";
  }
  if (requestedCategory) return category === requestedCategory;

  if (/\bcasual\b/i.test(query)) {
    return category === "casual" || category === "sandals";
  }
  if (/\brunning\b|\brun\b/i.test(query)) {
    return category === "running" || category === "shoes";
  }
  if (/shoe|running|\brun\b|\bsandal\b/i.test(query)) {
    return SHOE_CATEGORIES.has(category);
  }
  if (/headphone|audio/i.test(query)) return category === "audio";
  if (/keyboard|tech|mouse/i.test(query)) return category === "tech";
  return true;
}

function requestedColor(plan, query) {
  if (plan.color) return String(plan.color).toLowerCase();
  return (
    ["blue", "navy", "black", "silver", "white", "rose", "gray", "grey", "red", "green", "tan"]
      .find((color) => new RegExp(`\\b${color}\\b`, "i").test(query)) || ""
  );
}

export function searchCatalog(catalog, plan, query) {
  const priceMatch =
    query.match(/under\s*\$?(\d+(?:\.\d+)?)/i) ||
    query.match(/less than\s*\$?(\d+(?:\.\d+)?)/i);
  const maxPrice = Number(plan.max_price);
  const budget =
    Number.isFinite(maxPrice) && maxPrice > 0
      ? maxPrice
      : priceMatch
        ? Number(priceMatch[1])
        : Infinity;
  const budgetMinor = Number.isFinite(budget)
    ? Math.round(budget * 100)
    : Infinity;
  const sizeMatch = query.match(/size\s*(\d+(?:\.\d+)?)/i);
  const requestedSize = plan.size ?? sizeMatch?.[1];
  const targetColor = requestedColor(plan, query);
  const colorAliases = COLOR_ALIASES[targetColor] || [targetColor];

  let candidates = catalog.filter(
    (product) =>
      (Number.isInteger(product.stock)
        ? product.stock > 0
        : product.inStock === true) &&
      getPriceMinor(product) <= budgetMinor &&
      matchesCategory(product.category, plan.category, query) &&
      (!plan.free_shipping || Number(product.shippingCost || 0) === 0) &&
      (!requestedSize || supportsSize(product, requestedSize)) &&
      (!targetColor ||
        colorAliases.some((color) =>
          String(product.color).toLowerCase().includes(color),
        )),
  );

  const terms =
    String(plan.query || query)
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(
        (term) =>
          term.length > 2 && !STOP_WORDS.has(term) && !/^\d+$/.test(term),
      ) || [];
  const relevant = candidates.filter((product) => {
    const searchable =
      `${product.name} ${product.category} ${product.store} ${product.description} ${product.color}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  return relevant.length ? relevant : candidates;
}
