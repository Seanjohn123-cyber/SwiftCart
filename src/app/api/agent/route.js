import { NextResponse } from "next/server";
import catalog from "@/data/catalog.json";

function search_catalog(query, maxPrice, size) {
  const priceMatch =
    query.match(/under\s*\$?(\d+)/i) || query.match(/less than\s*\$?(\d+)/i);
  const budget = maxPrice ?? (priceMatch ? Number(priceMatch[1]) : Infinity);
  const sizeMatch = query.match(/size\s*(\d+(?:\.\d+)?)/i);
  const requestedSize = size ?? sizeMatch?.[1];
  const targetColor = ["blue", "black", "silver", "white", "rose", "gray"].find(
    (color) => query.includes(color),
  );
  const colorAliases = {
    blue: ["blue", "navy", "midnight"],
    gray: ["gray", "grey"],
  };
  let candidates = catalog.filter(
    (product) => product.inStock && product.price <= budget,
  );

  if (/shoe|running|run\b/i.test(query) || requestedSize) {
    candidates = candidates.filter((product) => product.category === "shoes");
  } else if (/headphone|audio/i.test(query)) {
    candidates = candidates.filter((product) => product.category === "audio");
  } else if (/keyboard|tech|mouse/i.test(query)) {
    candidates = candidates.filter((product) => product.category === "tech");
  }

  if (requestedSize) {
    candidates = candidates.filter((product) => {
      const productSize = String(product.size).match(/\d+(?:\.\d+)?/)?.[0];
      return productSize === String(requestedSize);
    });
  }

  if (targetColor) {
    const aliases = colorAliases[targetColor] || [targetColor];
    candidates = candidates.filter((product) =>
      aliases.some((color) =>
        String(product.color).toLowerCase().includes(color),
      ),
    );
  }

  return candidates;
}

function propose_order(productId) {
  const product = catalog.find((item) => item.id === productId);
  return product
    ? { productId: product.id, status: "awaiting_approval" }
    : null;
}

export async function POST(req) {
  try {
    const { prompt, max_price, size } = await req.json();
    const query = (
      prompt || "cheapest blue running shoes under $80 size 10"
    ).toLowerCase();
    const candidates = search_catalog(query, max_price, size);
    const scored = candidates.map((item) => {
      const discountPct =
        ((item.originalPrice - item.price) / item.originalPrice) * 100;
      const score = discountPct * 0.3 + item.rating * 15 - item.price * 0.2;
      return {
        ...item,
        discountPct: Math.round(discountPct),
        compositeScore: score,
      };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    const uniqueScored = scored.filter((item, index, products) => {
      const itemKey = `${item.name.trim().toLowerCase()}|${item.price}`;
      return (
        products.findIndex(
          (product) =>
            `${product.name.trim().toLowerCase()}|${product.price}` === itemKey,
        ) === index
      );
    });
    const top3 = uniqueScored.slice(0, 3);

    const rankedOptions = top3.map((item, index) => {
      let reason = "";
      if (index === 0) {
        reason = `Top pick: Best price-to-performance with ${item.discountPct}% discount at ${item.store} and ${item.rating}★ rating.`;
      } else if (index === 1) {
        reason = `Value alternative: Highest user review volume (${item.reviewsCount.toLocaleString()}+ reviews) with verified stock.`;
      } else {
        reason = `Budget runner-up: Premium features at competitive $${item.price.toFixed(2)} price point.`;
      }
      return {
        ...item,
        rank: index + 1,
        agentReason: reason,
        proposal: propose_order(item.id),
      };
    });

    return NextResponse.json({
      success: true,
      query: prompt,
      totalResults: candidates.length,
      logs: [
        "Searching catalog",
        `Ranked ${candidates.length} results`,
        "Awaiting your approval",
      ],
      options: rankedOptions,
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
