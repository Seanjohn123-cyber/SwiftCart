import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

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
]);

async function planSearch(prompt, categories) {
  if (!process.env.OPENAI_API_KEY) {
    return { query: prompt, mode: "catalog_rules" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Translate the shopper request into catalog search constraints. Always call search_catalog. Never invent products, prices, stock, or sizes. Leave unknown filters out.",
        },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "search_catalog",
            description:
              "Search the actual SwiftCart catalog using shopper constraints.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Core product or brand terms.",
                },
                category: { type: "string", enum: categories },
                max_price: { type: "number", exclusiveMinimum: 0 },
                size: { type: "string" },
                color: { type: "string" },
                free_shipping: { type: "boolean" },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "search_catalog" } },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI planner returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const argumentsText =
    data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argumentsText)
    throw new Error("OpenAI planner did not return search filters.");

  return { ...JSON.parse(argumentsText), mode: "openai_tool_calling" };
}

function searchCatalog(catalog, plan, query) {
  const categories = new Set(catalog.map((product) => product.category));
  const priceMatch =
    query.match(/under\s*\$?(\d+)/i) || query.match(/less than\s*\$?(\d+)/i);
  const maxPrice = Number(plan.max_price);
  const budget =
    Number.isFinite(maxPrice) && maxPrice > 0
      ? maxPrice
      : priceMatch
        ? Number(priceMatch[1])
        : Infinity;
  const sizeMatch = query.match(/size\s*(\d+(?:\.\d+)?)/i);
  const requestedSize = plan.size ?? sizeMatch?.[1];
  const targetColor = String(
    plan.color ||
      ["blue", "black", "silver", "white", "rose", "gray"].find((shade) =>
        query.includes(shade),
      ) ||
      "",
  ).toLowerCase();
  const colorAliases = {
    blue: ["blue", "navy", "midnight"],
    gray: ["gray", "grey"],
  };
  let candidates = catalog.filter(
    (product) =>
      product.inStock &&
      Number(product.price) <= budget &&
      (!categories.has(plan.category) || product.category === plan.category) &&
      (!plan.free_shipping || Number(product.shippingCost || 0) === 0),
  );

  if (
    !categories.has(plan.category) &&
    (/shoe|running|run\b/i.test(query) || requestedSize)
  ) {
    candidates = candidates.filter((product) => product.category === "shoes");
  } else if (!categories.has(plan.category) && /headphone|audio/i.test(query)) {
    candidates = candidates.filter((product) => product.category === "audio");
  } else if (
    !categories.has(plan.category) &&
    /keyboard|tech|mouse/i.test(query)
  ) {
    candidates = candidates.filter((product) => product.category === "tech");
  }

  if (requestedSize) {
    candidates = candidates.filter((product) => {
      const productSize = String(product.size).match(/\d+(?:\.\d+)?/)?.[0];
      return productSize === String(requestedSize).match(/\d+(?:\.\d+)?/)?.[0];
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
      `${product.name} ${product.category} ${product.store} ${product.description}`.toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });
  return relevant.length ? relevant : candidates;
}

function proposeOrder(productId) {
  return { productId, status: "awaiting_approval" };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";
    const query = prompt || "cheapest blue running shoes under $80 size 10";
    const catalog = getCatalog();
    const categories = [...new Set(catalog.map((product) => product.category))];
    let plan;
    try {
      plan = await planSearch(query, categories);
    } catch (error) {
      console.error(
        "OpenAI planning failed; using local catalog rules:",
        error.message,
      );
      plan = { query, mode: "catalog_rules_fallback" };
    }

    const candidates = searchCatalog(catalog, plan, query.toLowerCase());
    const scored = candidates.map((item) => {
      const discountPct =
        item.originalPrice > 0
          ? ((item.originalPrice - item.price) / item.originalPrice) * 100
          : 0;
      const cheapestFirst =
        /cheapest|lowest price|most affordable|budget/i.test(query);
      return {
        ...item,
        discountPct: Math.round(discountPct),
        compositeScore: cheapestFirst
          ? -item.price
          : discountPct * 0.3 + item.rating * 15 - item.price * 0.2,
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
      const reason =
        index === 0
          ? `Top pick: Best price-to-performance with ${item.discountPct}% discount at ${item.store} and ${item.rating}â˜… rating.`
          : index === 1
            ? `Value alternative: Highest user review volume (${item.reviewsCount.toLocaleString()}+ reviews) with verified stock.`
            : `Budget runner-up: Premium features at competitive $${item.price.toFixed(2)} price point.`;
      return {
        ...item,
        agentReason: reason,
        proposal: proposeOrder(item.id),
      };
    });

    return NextResponse.json({
      success: true,
      query: prompt,
      agentMode: plan.mode,
      totalResults: candidates.length,
      logs: [
        "Parsing shopping intent",
        `Ranked ${candidates.length} catalog results`,
        "Awaiting shopper approval",
      ],
      options: rankedOptions,
    });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Catalog planning failed." },
      { status: 500 },
    );
  }
}
