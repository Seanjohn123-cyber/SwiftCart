"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { formatPrice } from "@/lib/fx";

const SUGGESTED_QUESTIONS = [
  "Find blue running shoes under $80, size 10",
  "What is the cheapest option with free shipping?",
  "Compare the top three matches",
];

export default function CopilotPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [agentMode, setAgentMode] = useState("catalog_rules");
  const [error, setError] = useState("");

  const askCopilot = async (value = question) => {
    const prompt = value.trim();
    if (!prompt || isSearching) return;

    setQuestion("");
    setError("");
    setIsSearching(true);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: prompt },
    ]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Catalog search failed");
      setAgentMode(data.agentMode || "catalog_rules");
      const options = data.options || [];
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-agent`,
          role: "agent",
          text: options.length
            ? `I found ${data.totalResults ?? options.length} matching products and ranked the top options.`
            : "I couldn't find a match. Try changing the product, budget, or size.",
          agentMode: data.agentMode || "catalog_rules",
          options,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError.message || "Catalog search failed. Please try again.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askCopilot();
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="mb-6">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Agent Copilot
          </span>
          <h1 className="text-4xl font-black uppercase leading-[0.98] text-[#111416] sm:text-[54px]">
            Ask. Then approve.
          </h1>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#536064] sm:text-sm">
            A place to ask shopping questions and review recommendations before
            checkout.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_0.8fr]">
          <section
            className="flex min-h-[440px] flex-col rounded-[18px] border border-[#e4ebeb] bg-white p-4 sm:p-6"
            aria-label="Copilot conversation"
          >
            <div className="flex items-center gap-3 border-b border-[#e8eeee] pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1f2eb] text-[#087650]">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-[#171d1e]">
                  SwiftCart Copilot
                </h2>
                <p className="mt-0.5 text-[11px] text-[#657276]">
                  {agentMode === "openai_tool_calling"
                    ? "OpenAI tool planner active · prices validated from catalog"
                    : agentMode === "catalog_rules_fallback"
                      ? "Local rules fallback · AI planner unavailable"
                      : "Local catalog planner · configure OPENAI_API_KEY for model tool calling"}
                </p>
              </div>
            </div>

            <div
              className="flex flex-1 flex-col gap-4 overflow-y-auto py-5"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="flex flex-1 flex-col justify-center py-4 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f5f5] text-[#52646a]">
                    <MessageCircleQuestion className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-[#171d1e]">
                    What are you shopping for?
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#657276]">
                    Ask a question to search and rank matching catalog products.
                    Conversational AI is not connected yet.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[94%] rounded-[16px] p-3.5 ${message.role === "user" ? "copilot-user-message ml-auto bg-[#101315] text-white" : "copilot-agent-message mr-auto bg-[#f1f6f5] text-[#273133]"}`}
                >
                  <p className="text-xs leading-relaxed">{message.text}</p>
                  {message.role === "agent" && message.options?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((product, index) => (
                        <Link
                          key={product.id}
                          href={`/?q=${encodeURIComponent(product.name)}`}
                          className="group block rounded-[12px] border border-[#dce6e5] bg-white p-3 transition hover:-translate-y-px hover:border-[#6f9b8b] hover:shadow-[0_8px_20px_rgba(23,63,53,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087650]"
                        >
                          <article className="text-left">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#087650]">
                                Match {index + 1}
                              </span>
                              {index === 0 && (
                                <span className="rounded-full bg-[#e6f4ed] px-2 py-0.5 text-[9px] font-bold text-[#075b3e]">
                                  Top pick
                                </span>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="min-w-0 text-[13px] font-extrabold leading-snug text-[#171d1e]">
                                {product.name}
                              </h4>
                              <span className="shrink-0 text-sm font-extrabold text-[#111719]">
                                {formatPrice(product.price, "USD")}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#58666a]">
                              {product.agentReason}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#526064]">
                              <CheckCircle2 className="h-3 w-3 text-[#087650]" />
                              <span>{product.rating} rating</span>
                              <span>{product.deliveryDays}</span>
                              {product.shippingCost === 0 ? (
                                <span>Free shipping</span>
                              ) : (
                                <span>${product.shippingCost} shipping</span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-[#edf1f0] pt-2.5 text-[10px] font-bold text-[#173f35]">
                              <span>View in Shop</span>
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSearching && (
                <p className="text-xs text-[#596669]">
                  Searching and ranking catalog matches…
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fdecec] px-3 py-2 text-xs text-[#a63232]"
                >
                  {error}
                </p>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    disabled={isSearching}
                    className="rounded-full bg-[#e4f4ed] px-3 py-2 text-[10px] font-semibold text-[#075b3e] transition hover:bg-[#d5ecdf]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 rounded-[24px] border border-[#dce5e5] bg-[#f6f9f9] p-2"
            >
              <label className="sr-only" htmlFor="copilot-question">
                Your shopping question
              </label>
              <textarea
                id="copilot-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askCopilot();
                  }
                }}
                rows={2}
                placeholder="Ask about products, price, or fit..."
                className="max-h-32 min-h-12 min-w-0 flex-1 resize-y bg-transparent px-3 py-2 text-xs text-[#172022] outline-none placeholder:text-[#768387]"
              />
              <button
                type="submit"
                disabled={!question.trim() || isSearching}
                title="Search product catalog"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#073e32] text-white transition hover:bg-[#0b5746] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Search product catalog"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>

          <aside className="space-y-4">
            <section className="copilot-status-panel rounded-[18px] bg-[#101315] p-5 text-white sm:p-6">
              <div className="flex items-center gap-2 text-lime-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                  Integration status
                </span>
              </div>
              <h2 className="mt-3 text-base font-extrabold text-white">
                {agentMode === "openai_tool_calling"
                  ? "OpenAI planner is active"
                  : "Catalog planner is active"}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#d4dddd]">
                The agent turns your request into catalog filters. The server
                verifies stock and price before PayPal creates an order.
              </p>
            </section>

            <section className="rounded-[18px] border border-[#e4ebeb] bg-white p-5 sm:p-6">
              <h2 className="text-sm font-extrabold text-[#171d1e]">
                Shopping flow
              </h2>
              <ol className="mt-4 space-y-3 text-xs text-[#4d5a5e]">
                <li className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-[#087650]" />
                  Search the catalog
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#087650]" />
                  Review ranked matches
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#087650]" />
                  Approve before PayPal checkout
                </li>
              </ol>
              <Link
                href="/"
                className="copilot-shop-link mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#073e32] px-4 text-xs font-bold text-white transition hover:bg-[#0b5746]"
              >
                Go to Shop <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
