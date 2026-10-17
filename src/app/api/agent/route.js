import { NextResponse } from "next/server";
import { getCatalogVariants } from "@/lib/catalog";
import { searchCatalog } from "@/lib/catalog-search";
import { rankCatalogMatches } from "@/lib/catalog-ranking";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";

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

export async function POST(req) {
  const rateLimit = checkRateLimit(
    `agent:${getRequestClientKey(req)}`,
    { limit: 20, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";
    const query = prompt || "cheapest blue running shoes under $80 size 10";
    const catalog = getCatalogVariants();
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
    const rankedOptions = rankCatalogMatches(candidates, query);

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
