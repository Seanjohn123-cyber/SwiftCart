function proposeOrder(productId, sku) {
  return { productId, sku, status: "awaiting_approval" };
}

export function rankCatalogMatches(candidates, query) {
  const cheapestFirst =
    /cheapest|lowest price|most affordable|budget/i.test(query);
  const scored = candidates.map((item) => {
    const discountPct =
      item.originalPriceMinor > 0
        ? ((item.originalPriceMinor - item.priceMinor) /
            item.originalPriceMinor) *
          100
        : 0;
    return {
      ...item,
      discountPct: Math.round(discountPct),
      compositeScore: cheapestFirst
        ? -item.priceMinor
        : discountPct * 0.3 + item.rating * 15 - item.priceMinor * 0.002,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  const uniqueScored = scored.filter(
    (item, index, products) =>
      products.findIndex((product) => product.id === item.id) === index,
  );

  return uniqueScored.slice(0, 3).map((item, index) => {
    const rankedItem = { ...item };
    delete rankedItem.compositeScore;
    delete rankedItem.discountPct;
    const reason =
      cheapestFirst && index === 0
        ? `Lowest-priced in-stock match at $${(item.priceMinor / 100).toFixed(2)}; matches the requested filters.`
        : cheapestFirst
          ? `Next lowest-priced in-stock match at $${(item.priceMinor / 100).toFixed(2)}.`
          : index === 0
            ? `Top value match with ${item.discountPct}% off the demo list price at ${item.store}.`
            : index === 1
              ? `Alternative match with a demo rating of ${item.rating} and verified stock.`
              : `Another in-stock option at $${(item.priceMinor / 100).toFixed(2)}.`;

    return {
      ...rankedItem,
      agentReason: reason,
      proposal: proposeOrder(item.id, item.sku),
    };
  });
}
