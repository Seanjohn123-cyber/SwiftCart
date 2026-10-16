"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Search,
  Truck,
  Receipt,
  Printer,
  X,
  Store,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Terminal,
  Star,
  Heart,
  Globe,
  Radio,
  Layers,
  ArrowRight,
  CreditCard,
  Zap,
  ShoppingBag,
} from "lucide-react";
import catalogData from "@/data/catalog.json";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { SUPPORTED_CURRENCIES, convertAmount, formatPrice } from "@/lib/fx";
import {
  dismissRegistrationNotice,
  getRegistrationNotice,
  subscribeRegistrationNotice,
} from "@/lib/registration-notice";

const DEFAULT_SEARCH_QUERY = "Blue running shoes under $80, size 10";

function HomeContent() {
  const [items, setItems] = useState(catalogData);
  const [activeItem, setActiveItem] = useState(
    catalogData.find((item) => item.id === "PROD-001") || catalogData[0],
  );
  const [agentOptions, setAgentOptions] = useState([]);
  const [agentSteps, setAgentSteps] = useState([
    { label: "Searching catalog", status: "active" },
  ]);
  const [activeTab, setActiveTab] = useState("picks");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showMobileCheckoutSheet, setShowMobileCheckoutSheet] = useState(false);
  const searchParams = useSearchParams();
  const incomingQuery = searchParams.get("q")?.trim() ?? "";
  const [searchQueryState, setSearchQueryState] = useState(() => ({
    sourceQuery: incomingQuery,
    value: incomingQuery || DEFAULT_SEARCH_QUERY,
  }));
  const searchQuery =
    searchQueryState.sourceQuery === incomingQuery
      ? searchQueryState.value
      : incomingQuery || DEFAULT_SEARCH_QUERY;
  const setSearchQuery = (value) =>
    setSearchQueryState({ sourceQuery: incomingQuery, value });
  const [isSearching, setIsSearching] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const registeredStoreName = useSyncExternalStore(
    subscribeRegistrationNotice,
    getRegistrationNotice,
    () => null,
  );

  useEffect(() => {
    if (!registeredStoreName) return undefined;
    const timeoutId = window.setTimeout(dismissRegistrationNotice, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [registeredStoreName]);

  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "agent",
      text: "SwiftCart Autonomous Agent ready. I arbitrate prices across connected merchants, convert settlement currencies, and execute PayPal Checkout. How can I assist you?",
      tool: 'agent.initialize({ engine: "Orders_v2" })',
      timestamp: "Just now",
    },
  ]);
  const chatBottomRef = useRef(null);

  const [logs, setLogs] = useState([
    "SwiftCart Autonomous Engine initialized.",
    "Scanned verified retail partners (Nike, Puma, Asics, Best Buy, Urban Athletics).",
    "Multi-Store Price Arbitration locked lowest quote on " +
      catalogData[0].name,
    "PayPal Sandbox Orders v2 SDK active and ready.",
  ]);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/merchant/import");
        const data = await res.json();
        if (data.catalog && data.catalog.length > 0) {
          setItems(data.catalog);
        }
      } catch (err) {
        // fallback to initial
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    if (incomingQuery) {
      const runParamSearch = async () => {
        setIsSearching(true);
        setAgentSteps([{ label: "Searching catalog", status: "active" }]);
        try {
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: incomingQuery }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Agent search failed");
          const options = data.options || [];
          setAgentOptions(options);
          if (options.length > 0) {
            setActiveItem(options[0]);
            setAgentSteps([
              { label: "Searched catalog", status: "complete" },
              {
                label: `Ranked ${data.totalResults ?? options.length} results`,
                status: "complete",
              },
              { label: "Awaiting your approval", status: "active" },
            ]);
          } else {
            setAgentSteps([
              { label: "Searched catalog", status: "complete" },
              { label: "No matching products", status: "active" },
            ]);
          }
        } catch (err) {
          addLog(`Query error: ${err.message}`);
          setAgentOptions([]);
          setAgentSteps([{ label: "Catalog search failed", status: "active" }]);
        } finally {
          setIsSearching(false);
        }
      };
      runParamSearch();
      return;
    }

    let isCurrent = true;
    const loadDemoResults = async () => {
      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: DEFAULT_SEARCH_QUERY,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Agent search failed");
        if (!isCurrent) return;
        setAgentOptions(data.options || []);
        if (data.options?.length) setActiveItem(data.options[0]);
        setAgentSteps([
          { label: "Searched catalog", status: "complete" },
          {
            label: `Ranked ${data.totalResults ?? data.options?.length ?? 0} results`,
            status: "complete",
          },
          { label: "Awaiting your approval", status: "active" },
        ]);
      } catch {
        if (isCurrent)
          setAgentSteps([{ label: "Catalog search failed", status: "active" }]);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    };
    loadDemoResults();
    return () => {
      isCurrent = false;
    };
  }, [incomingQuery]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const toggleVoiceRecognition = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert(
        "Speech recognition is not supported in this browser. Please type your message.",
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
        handleSendCopilotMessage(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleSendCopilotMessage = (customText) => {
    const text = customText || chatInput;
    if (!text.trim()) return;

    const userMsg = {
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    addLog(`User dialogue: "${text}"`);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let responseText = "";
      let toolInvoked = "";
      let targetProduct = activeItem;

      if (
        lower.includes("cheapest") ||
        lower.includes("budget") ||
        lower.includes("under 70")
      ) {
        targetProduct = items.find((i) => i.id === "PROD-002") || items[1];
        setActiveItem(targetProduct);
        toolInvoked = 'catalog.filter({ maxPrice: 70, sort: "price_asc" })';
        responseText = `Switched selection to ${targetProduct.name} at ${formatPrice(targetProduct.price, selectedCurrency)}. Lowest unit price across verified merchants with free shipping.`;
      } else if (
        lower.includes("stability") ||
        lower.includes("support") ||
        lower.includes("arch") ||
        lower.includes("asics")
      ) {
        targetProduct = items.find((i) => i.id === "PROD-003") || items[2];
        setActiveItem(targetProduct);
        toolInvoked = 'catalog.match({ tags: ["Adaptive Arch Support"] })';
        responseText = `Switched selection to ${targetProduct.name} at ${formatPrice(targetProduct.price, selectedCurrency)}. Top-rated for motion control and orthotic arch support.`;
      } else if (
        lower.includes("audio") ||
        lower.includes("headphone") ||
        lower.includes("sony") ||
        lower.includes("noise")
      ) {
        targetProduct = items.find((i) => i.id === "PROD-004") || items[3];
        setActiveItem(targetProduct);
        toolInvoked = 'catalog.filter({ category: "audio" })';
        responseText = `Switched category to ${targetProduct.name} at ${formatPrice(targetProduct.price, selectedCurrency)}. Features premium 30-hour ANC at Best Buy Direct.`;
      } else if (
        lower.includes("compare") ||
        lower.includes("quotes") ||
        lower.includes("matrix")
      ) {
        setShowComparisonMatrix(true);
        toolInvoked = 'merchants.arbitrate({ sku: "' + activeItem.sku + '" })';
        responseText = `Opening the Multi-Store Price Comparison Matrix for ${activeItem.name}. Nike Direct is currently the lowest verified quote.`;
      } else if (lower.includes("shipping") || lower.includes("delivery")) {
        setActiveTab("delivery");
        toolInvoked = 'shipping.estimate({ zip: "US_STANDARD" })';
        responseText = `Estimated delivery for ${activeItem.name} is ${activeItem.deliveryDays} with free shipping ($0.00) via ${activeItem.store}.`;
      } else if (lower.includes("euro") || lower.includes("eur")) {
        setSelectedCurrency("EUR");
        toolInvoked = 'fx.convert({ base: "USD", target: "EUR" })';
        responseText = `Switched shopping currency to EUR (€). Current item ${activeItem.name} converts to ${formatPrice(activeItem.price, "EUR")} EUR with instant PayPal settlement.`;
      } else if (lower.includes("pound") || lower.includes("gbp")) {
        setSelectedCurrency("GBP");
        toolInvoked = 'fx.convert({ base: "USD", target: "GBP" })';
        responseText = `Switched shopping currency to GBP (£). Current item ${activeItem.name} converts to ${formatPrice(activeItem.price, "GBP")} GBP with instant PayPal settlement.`;
      } else if (lower.includes("yen") || lower.includes("jpy")) {
        setSelectedCurrency("JPY");
        toolInvoked = 'fx.convert({ base: "USD", target: "JPY" })';
        responseText = `Switched shopping currency to JPY (¥). Current item ${activeItem.name} converts to ${formatPrice(activeItem.price, "JPY")} JPY with instant PayPal settlement.`;
      } else if (lower.includes("cad") || lower.includes("canadian")) {
        setSelectedCurrency("CAD");
        toolInvoked = 'fx.convert({ base: "USD", target: "CAD" })';
        responseText = `Switched shopping currency to CAD (C$). Current item ${activeItem.name} converts to ${formatPrice(activeItem.price, "CAD")} CAD with instant PayPal settlement.`;
      } else if (lower.includes("aud") || lower.includes("australian")) {
        setSelectedCurrency("AUD");
        toolInvoked = 'fx.convert({ base: "USD", target: "AUD" })';
        responseText = `Switched shopping currency to AUD (A$). Current item ${activeItem.name} converts to ${formatPrice(activeItem.price, "AUD")} AUD with instant PayPal settlement.`;
      } else if (lower.includes("usd") || lower.includes("dollar")) {
        setSelectedCurrency("USD");
        toolInvoked = 'fx.convert({ base: "USD", target: "USD" })';
        responseText = `Switched shopping currency to USD ($). Current item ${activeItem.name} is ${formatPrice(activeItem.price, "USD")} USD with instant PayPal settlement.`;
      } else {
        targetProduct = items[0];
        setActiveItem(targetProduct);
        toolInvoked = 'catalog.search({ query: "' + text + '" })';
        responseText = `Evaluated candidate items for your request. Locking recommended selection on ${targetProduct.name} (${formatPrice(targetProduct.price, selectedCurrency)}) based on price and customer rating score.`;
      }

      addLog(`Copilot: Executed tool ${toolInvoked}`);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: responseText,
          tool: toolInvoked,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }, 500);
  };

  const handleAgentSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setAgentSteps([{ label: "Searching catalog", status: "active" }]);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent search failed");
      const options = data.options || [];
      setAgentOptions(options);
      if (options.length > 0) {
        setActiveItem(options[0]);
        setAgentSteps([
          { label: "Searched catalog", status: "complete" },
          {
            label: `Ranked ${data.totalResults ?? options.length} results`,
            status: "complete",
          },
          { label: "Awaiting your approval", status: "active" },
        ]);
      } else {
        setAgentSteps([
          { label: "Searched catalog", status: "complete" },
          { label: "No matching products", status: "active" },
        ]);
      }
    } catch (err) {
      addLog(`Query error: ${err.message}`);
      setAgentOptions([]);
      setAgentSteps([{ label: "Catalog search failed", status: "active" }]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = (item) => {
    setActiveItem(item);
    setCheckoutError("");
    setShowMobileCheckoutSheet(true);
    addLog(
      `Added agent recommendation to the proposed cart: "${item.name}". Shopper approval is still required.`,
    );
  };

  const initialPayPalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
    currency: selectedCurrency,
    intent: "capture",
  };

  const paypalButtonsComponent = (
    <PayPalButtons
      key={selectedCurrency + "-" + activeItem.id}
      style={{
        layout: "vertical",
        color: "gold",
        shape: "pill",
        label: "paypal",
        height: 44,
      }}
      createOrder={async () => {
        setIsProcessing(true);
        setCheckoutError("");
        addLog(
          `Creating PayPal Order for "${activeItem.name}" (${formatPrice(activeItem.price, selectedCurrency)} ${selectedCurrency})`,
        );
        try {
          const res = await fetch("/api/orders/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              productId: activeItem.id,
              currency: selectedCurrency,
            }),
          });
          const data = await res.json();
          if (data.id) {
            addLog(`PayPal Order generated: ${data.id} (${selectedCurrency})`);
            return data.id;
          } else {
            throw new Error(data.error || "Failed to create order");
          }
        } catch (err) {
          addLog(`Error: ${err.message}`);
          setCheckoutError(err.message || "Could not create the PayPal order.");
          setIsProcessing(false);
          throw err;
        }
      }}
      onApprove={async (data) => {
        addLog(
          `Order approved by user: ${data.orderID}. Capturing payment in ${selectedCurrency}...`,
        );
        try {
          const res = await fetch("/api/orders/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const capture = await res.json();
          if (!res.ok)
            throw new Error(capture.error || "PayPal capture failed.");
          if (capture.status === "COMPLETED") {
            addLog(`Payment successfully captured. ID: ${capture.id}`);
            setAgentSteps((previous) => [
              ...previous.filter((step) => step.label !== "Order captured"),
              { label: "Order captured", status: "complete" },
            ]);
            setPaymentSuccess({
              ...capture,
              item: activeItem,
              paidPrice: formatPrice(activeItem.price, selectedCurrency),
              paidCurrency: selectedCurrency,
            });
            setShowMobileCheckoutSheet(false);
            setShowReceiptModal(true);
          } else {
            throw new Error("PayPal did not confirm the capture.");
          }
        } catch (err) {
          addLog(`Capture Error: ${err.message}`);
          setCheckoutError(err.message || "Payment could not be captured.");
        } finally {
          setIsProcessing(false);
        }
      }}
      onCancel={() => {
        addLog("PayPal checkout was cancelled before capture.");
        setCheckoutError("Checkout cancelled. Your payment was not captured.");
        setIsProcessing(false);
      }}
      onError={(err) => {
        addLog(`SDK Error: ${err.toString()}`);
        setCheckoutError(
          "PayPal could not complete checkout. No capture was confirmed.",
        );
        setIsProcessing(false);
      }}
    />
  );

  return (
    <PayPalScriptProvider key={selectedCurrency} options={initialPayPalOptions}>
      <div className="shop-page-shell flex min-h-screen flex-col bg-[#c3d0d1] px-2 py-2 text-[#111416] antialiased selection:bg-lime-300 selection:text-black sm:px-4 sm:py-4">
        {/* Ambient Warm Radial Backlight Glows */}
        <div className="hidden" />

        {/* Global Navigation Header */}
        <AppHeader
          extra={
            <div className="flex items-center gap-2">
              {/* FX Currency Selector Pill */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-stone-200 transition">
                <Globe className="h-3.5 w-3.5 text-amber-300" />
                <select
                  value={selectedCurrency}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedCurrency(next);
                    addLog(
                      `FX Engine: Currency switched to ${next} (${SUPPORTED_CURRENCIES[next].name})`,
                    );
                  }}
                  aria-label="Select currency"
                  className="cursor-pointer bg-transparent text-xs font-bold text-amber-200 outline-none"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option
                      key={c.code}
                      value={c.code}
                      className="bg-[#1c1815] text-stone-200"
                    >
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shopping Agent Drawer Toggle */}
              <button
                type="button"
                onClick={() => setShowCopilot(!showCopilot)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 px-3.5 text-[12px] font-bold text-amber-200 transition shadow-[0_0_15px_rgba(251,191,36,0.15)]"
              >
                <Bot className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden sm:inline">Agent Copilot</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </div>
          }
        />

        {/* Main Content Area */}
        <main className="relative z-10 mx-auto w-full max-w-[1320px] flex-1 rounded-b-[24px] bg-[#eef3f3] px-4 py-5 sm:px-7 sm:py-8 md:px-10">
          {registeredStoreName && (
            <div
              role="status"
              className="mx-auto mb-3 flex max-w-[1120px] items-center gap-3 rounded-[14px] border border-[#b9ddca] bg-[#f5fbf7] px-3.5 py-3 text-[#173f35] shadow-[0_4px_14px_rgba(28,75,55,0.06)] sm:px-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e0f2e8] text-[#087650]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-xs leading-snug">
                <strong className="block font-extrabold">
                  Shop registered
                </strong>
                <span className="break-words text-[#52645b]">
                  {registeredStoreName} is ready to connect.
                </span>
              </span>
              <button
                type="button"
                onClick={dismissRegistrationNotice}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#52645b] transition hover:bg-[#e5f2e9] hover:text-[#173f35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087650]"
                aria-label="Dismiss shop registration notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {/* Top Hero Section: Compact, Modern & High-Contrast */}
          <div className="hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                    Agentic Commerce · PayPal Checkout
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Autonomous Shopper with PayPal Protection.
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
                  Real-time cross-merchant price arbitration, foreign exchange
                  settlement, and 1-click PayPal Orders v2 execution.
                </p>
              </div>

              {/* Natural Language Prompt Search Bar */}
              <div className="w-full md:w-96">
                <form
                  onSubmit={handleAgentSearch}
                  className="flex items-center rounded-2xl border border-white/15 bg-black/40 p-1.5 backdrop-blur-md focus-within:border-amber-400/80 transition shadow-inner"
                >
                  <Search className="h-4 w-4 text-stone-400 ml-2.5 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="E.g. blue shoes under $70, size 10"
                    className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-stone-950 font-bold px-3.5 py-2 text-xs transition shadow-md disabled:opacity-50 shrink-0"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{isSearching ? "Finding…" : "Find"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Trust Badges Strip */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-stone-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>PayPal Buyer Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-300 shrink-0" />
                <span>Free Express Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Verified Multi-Merchant Feeds</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Live Arbitrage Engine</span>
              </div>
            </div>
          </div>

          <section
            id="shop"
            className="mx-auto max-w-[1120px] pb-10 pt-5 sm:pt-8"
          >
            <div className="mx-auto max-w-[700px] text-center">
              <h1 className="text-[38px] font-black leading-[0.94] text-[#101315] sm:text-6xl md:text-[66px]">
                SHOP BY
                <br />
                JUST ASKING.
              </h1>
              <p className="mx-auto mt-4 max-w-[390px] text-[13px] leading-[1.35] text-[#526064] sm:text-sm">
                Tell the agent what you want. It finds the best matches, and you
                approve before PayPal charges a cent.
              </p>
              <form
                onSubmit={handleAgentSearch}
                className="mx-auto mt-5 flex max-w-[580px] flex-col gap-2 rounded-[28px] bg-white p-2 shadow-[0_12px_32px_rgba(39,57,59,0.14)] sm:flex-row sm:items-center sm:rounded-full sm:pl-5"
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Describe what you want to shop for"
                    placeholder="Blue running shoes under $80, size 10"
                    className="min-w-0 flex-1 rounded-full bg-transparent px-3 py-3 text-left text-[13px] text-[#15191a] outline-none placeholder:text-[#687477] sm:px-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#657174] transition hover:bg-[#eef3f3] hover:text-[#14191a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087650] sm:mr-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#111416] px-6 text-[12px] font-extrabold uppercase text-white transition hover:bg-[#293033] disabled:cursor-wait disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {isSearching ? "Searching" : "Find with agent"}
                </button>
              </form>
              <div
                id="agent-activity"
                className="mt-3 flex flex-wrap items-center justify-center gap-2"
                aria-live="polite"
              >
                {agentSteps.map((step) => (
                  <span
                    key={step.label}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                      step.status === "active"
                        ? "bg-[#111416] text-white"
                        : "bg-white text-[#23292b]"
                    }`}
                  >
                    {step.status === "active" ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    )}
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            <div id="orders" className="mt-8 sm:mt-9">
              <div className="mb-2 flex items-end justify-between gap-4">
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#14191a]">
                  Top picks for you
                </h2>
                {agentOptions.length > 0 && (
                  <span className="text-[11px] text-[#657174]">
                    {agentOptions.length} ranked options
                  </span>
                )}
              </div>
              {agentOptions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {agentOptions.map((item, index) => (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-[17px] border bg-white p-2.5 transition-shadow ${
                        index === 0
                          ? "border-[#184c3e] ring-1 ring-[#184c3e]"
                          : "border-white"
                      }`}
                    >
                      <div className="relative aspect-[1.45/1] overflow-hidden rounded-[12px] bg-[#dbe7e8]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-lime-300 px-2.5 py-1 text-[9px] font-black uppercase text-[#14191a]">
                            Best match
                          </span>
                        )}
                        <span
                          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1c2425]"
                          aria-hidden="true"
                        >
                          <Heart className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="px-0.5 pb-0.5 pt-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 text-[13px] font-extrabold leading-tight text-[#171c1d]">
                            {item.name}
                          </h3>
                          <span className="shrink-0 text-[13px] font-extrabold text-[#171c1d]">
                            {formatPrice(item.price, selectedCurrency)}
                          </span>
                        </div>
                        <p className="mt-1 min-h-8 text-[10px] leading-snug text-[#617078]">
                          {item.agentReason}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#657174]">
                          <span className="font-bold tracking-[0.06em] text-emerald-700">
                            ★★★★★
                          </span>
                          <span>
                            {item.rating} (
                            {Number(item.reviewsCount).toLocaleString()})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          className={`mt-2 inline-flex min-h-9 items-center justify-center rounded-full border px-4 text-[11px] font-bold transition ${
                            index === 0
                              ? "border-[#073e32] bg-[#073e32] text-white hover:bg-[#0b5746]"
                              : "border-[#687477] bg-white text-[#202627] hover:bg-[#eef3f3]"
                          }`}
                        >
                          {index === 0 ? "Add top pick to cart" : "Add to cart"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] bg-white px-5 py-10 text-center text-sm text-[#657174]">
                  {isSearching
                    ? "Searching the catalog..."
                    : "No products matched. Try a broader search above."}
                </div>
              )}
            </div>
          </section>

          {/* Core Product Stage (Desktop + Mobile Cohesive Layout) */}
          <div className="hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Active Product Showcase (7 cols on Desktop) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="rounded-3xl border border-white/10 bg-[#1f1a16]/90 p-5 sm:p-7 backdrop-blur-xl shadow-xl flex flex-col gap-5">
                  {/* Active Photo Container */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40 border border-white/10 group">
                    <Image
                      src={activeItem.image}
                      alt={activeItem.name}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                    {/* Floating Top Badges */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        98% Match Score
                      </span>
                      <span className="rounded-full bg-black/60 text-stone-300 border border-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur-md">
                        {activeItem.store}
                      </span>
                    </div>

                    {/* Floating Price Pill */}
                    <div className="absolute bottom-3.5 right-3.5 bg-black/80 border border-amber-400/40 rounded-2xl px-4 py-2 backdrop-blur-md shadow-2xl flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-white">
                        {formatPrice(activeItem.price, selectedCurrency)}
                      </span>
                      <span className="text-xs text-stone-400 line-through">
                        {formatPrice(
                          activeItem.originalPrice,
                          selectedCurrency,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Product Meta & Details */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        {activeItem.category || "Athletic Gear"} · SKU{" "}
                        {activeItem.sku}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-stone-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-white">
                          {activeItem.rating || 4.8}
                        </span>
                        <span className="text-stone-400">
                          ({activeItem.reviewsCount || 240}+ reviews)
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {activeItem.name}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
                      {activeItem.description ||
                        "Engineered with responsive cushioning and reinforced structural arch stability for daily high-output training."}
                    </p>

                    {/* Delivery & Protection Quick Row */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-stone-300">
                        <Truck className="h-3.5 w-3.5 text-amber-300" />
                        <span>
                          {activeItem.deliveryDays || "2 business days"} · Free
                          Delivery
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-stone-300">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>PayPal Buyer Protection Active</span>
                      </div>
                    </div>

                    {/* Multi-Store Comparison Matrix CTA Button */}
                    <button
                      type="button"
                      onClick={() => setShowComparisonMatrix(true)}
                      className="mt-4 w-full flex items-center justify-between bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-200 px-4 py-3 rounded-2xl text-xs font-bold transition group"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-amber-300" />
                        <span>
                          Multi-Store Comparison: {activeItem.store} is lowest
                          price
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-amber-300 group-hover:translate-x-1 transition-transform">
                        View 4 Merchant Quotes{" "}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Horizontal Scrollable Thumbnails Strip for Quick Switching */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Available Catalog Picks ({items.length})
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Tap to inspect
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {items.map((item) => {
                      const isSelected = item.id === activeItem.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveItem(item);
                            addLog(
                              `Product inspected: "${item.name}" (${formatPrice(item.price, selectedCurrency)})`,
                            );
                          }}
                          className={`flex items-center gap-3 shrink-0 rounded-2xl border p-2.5 transition text-left ${
                            isSelected
                              ? "bg-amber-400/15 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/40"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/40">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="pr-2">
                            <p className="truncate text-xs font-bold text-white max-w-[140px]">
                              {item.name}
                            </p>
                            <p className="text-xs font-extrabold text-amber-300">
                              {formatPrice(item.price, selectedCurrency)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout Stage (5 cols on Desktop) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Payment Settlement Card */}
                <div className="rounded-3xl border border-white/10 bg-[#1f1a16]/90 p-6 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        Settlement Terminal
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Orders v2 API
                    </span>
                  </div>

                  {!paymentSuccess ? (
                    <div className="space-y-4">
                      {/* Order Breakdown Box */}
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs space-y-2.5">
                        <div className="flex justify-between text-stone-400">
                          <span>Product Subtotal</span>
                          <span className="font-semibold text-white">
                            {formatPrice(activeItem.price, selectedCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-400">
                          <span>Standard Shipping</span>
                          <span className="font-semibold text-emerald-400">
                            FREE ($0.00)
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-400">
                          <span>Settlement Currency</span>
                          <span className="font-mono font-bold text-amber-200">
                            {selectedCurrency}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/10 flex justify-between items-baseline text-sm font-bold">
                          <span className="text-white">Total Charge</span>
                          <span className="text-xl font-extrabold text-amber-300">
                            {formatPrice(activeItem.price, selectedCurrency)}{" "}
                            {selectedCurrency}
                          </span>
                        </div>
                      </div>

                      {/* PayPal Button Container */}
                      <div>
                        <p className="text-[11px] text-center text-stone-400 mb-2">
                          {isProcessing
                            ? "Communicating with PayPal Sandbox…"
                            : "One-Click Instant Checkout"}
                        </p>
                      </div>

                      <div className="text-center text-[10px] text-stone-400 flex items-center justify-center gap-1.5 pt-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>
                          Transactions protected by PayPal Buyer Protection ·
                          Sandbox Mode
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Success Capture State */
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Payment Authorized &amp; Settled
                        </h3>
                        <p className="text-xs text-emerald-300/80 mt-1">
                          Capture ID:{" "}
                          <span className="font-mono text-white font-bold">
                            {paymentSuccess.id}
                          </span>
                        </p>
                        <p className="text-xs text-stone-300 mt-0.5">
                          Amount:{" "}
                          <strong className="text-white">
                            {paymentSuccess.paidPrice ||
                              formatPrice(
                                activeItem.price,
                                selectedCurrency,
                              )}{" "}
                            {paymentSuccess.paidCurrency || selectedCurrency}
                          </strong>
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowReceiptModal(true)}
                          className="pp-btn-blue text-xs py-2 px-4"
                        >
                          <Receipt className="h-3.5 w-3.5" /> View Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentSuccess(null);
                            addLog("Session reset for next autonomous search.");
                          }}
                          className="rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-semibold text-white transition"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Buy Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-Time Agent Execution Logs Box */}
                <div className="rounded-3xl border border-white/10 bg-[#1a1613]/90 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-amber-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        Autonomous Audit Logs
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500">
                      Live
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px] text-stone-300 max-h-40 overflow-y-auto pr-1">
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className="border-l-2 border-amber-400/50 pl-2 py-0.5 leading-snug"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Sleek Floating Bottom Bar for Mobile Viewports (Fixes Mobile Screenshot 2) */}
        {!paymentSuccess && (
          <div className="hidden">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 safe-bottom">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/40 border border-white/10">
                  <Image
                    src={activeItem.image}
                    alt={activeItem.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">
                    {activeItem.name}
                  </p>
                  <p className="text-xs font-extrabold text-amber-300">
                    {formatPrice(activeItem.price, selectedCurrency)}{" "}
                    <span className="text-[10px] text-stone-400 font-normal">
                      {selectedCurrency}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowComparisonMatrix(true)}
                  className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-stone-300 transition"
                >
                  Compare
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileCheckoutSheet(true)}
                  className="pp-btn-gold text-xs px-4 py-2"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Pay Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Checkout Bottom Sheet Modal */}
        {showMobileCheckoutSheet && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <div
              id="orders-checkout"
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[20px] border border-white/15 bg-[#1c1815] p-5 shadow-2xl safe-bottom"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3
                    id="checkout-title"
                    className="text-base font-bold text-white"
                  >
                    Review proposed cart · 1 item
                  </h3>
                  <p className="text-xs text-stone-400">
                    {activeItem.name} · {activeItem.store}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileCheckoutSheet(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-stone-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-3 text-xs flex justify-between items-center">
                <span className="text-stone-300">Total Settlement:</span>
                <span className="text-base font-bold text-amber-300">
                  {formatPrice(activeItem.price, selectedCurrency)}{" "}
                  {selectedCurrency}
                </span>
              </div>

              {checkoutError && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-200"
                >
                  {checkoutError}
                </p>
              )}

              {paypalButtonsComponent}
            </div>
          </div>
        )}

        {/* Shopping Agent Copilot Drawer (Fixes Screenshot 1 - Clean, Dark, Ultra-Sharp) */}
        {showCopilot && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex h-full w-full max-w-md flex-col bg-[#1c1815] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
              {/* Copilot Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#2a241f] to-[#1f1a16] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>SwiftCart Agent Copilot</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      Autonomous Commerce &amp; PayPal Settlement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCopilot(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-stone-300 transition"
                  aria-label="Close copilot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Chat Conversation Stream */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-stone-500">
                      {msg.sender === "user" ? (
                        <>
                          <span>You</span>
                          <User className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 text-amber-400" />
                          <span>SwiftCart Agent</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
                        msg.sender === "user"
                          ? "rounded-tr-sm bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-semibold"
                          : "rounded-tl-sm bg-white/5 border border-white/10 text-stone-200"
                      }`}
                    >
                      {msg.text}
                      {msg.tool && (
                        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/10 pt-2 font-mono text-[10px] text-amber-300/90">
                          <Terminal className="h-3 w-3 shrink-0" />
                          <span className="break-all">{msg.tool}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Suggestion Chips (Smooth Scrollable Row) */}
              <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-2.5 scrollbar-none bg-black/20">
                {[
                  "Switch to EUR (€)",
                  "Switch to GBP (£)",
                  "Compare store quotes",
                  "Cheapest under 70",
                  "Show noise-canceling audio",
                  "Check delivery terms",
                ].map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendCopilotMessage(chip)}
                    className="shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-medium text-stone-300 hover:text-white transition whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Bottom Voice / Text Input Box */}
              <div className="border-t border-white/10 p-3 bg-[#191512] safe-bottom">
                <div className="flex items-center rounded-full border border-white/15 bg-black/40 p-1.5 focus-within:border-amber-400/60 transition">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSendCopilotMessage()
                    }
                    placeholder={
                      isListening
                        ? "Listening… speak now"
                        : "Ask shopping agent or switch currency…"
                    }
                    className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-stone-200 placeholder-stone-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceRecognition}
                    className={`mr-1 flex h-8 w-8 items-center justify-center rounded-full transition ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse"
                        : "text-stone-400 hover:text-white"
                    }`}
                    aria-label="Voice input"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendCopilotMessage()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold transition hover:brightness-105"
                    aria-label="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Store Comparison Matrix Modal */}
        {showComparisonMatrix && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
            <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#1c1815] p-6 shadow-2xl safe-bottom">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Cross-Merchant Arbitrage Matrix
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    Verified Store Quotes for {activeItem.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComparisonMatrix(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-stone-300 hover:text-white"
                  aria-label="Close comparison"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {activeItem.merchantOffers?.map((offer, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                      offer.isWinner
                        ? "border-amber-400/50 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                        <Store className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">
                            {offer.store}
                          </span>
                          {offer.isWinner && (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                              Best Price
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400">
                          {offer.shipping}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-base font-extrabold text-white">
                        {formatPrice(offer.price, selectedCurrency)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${offer.isWinner ? "text-emerald-400" : "text-stone-400"}`}
                      >
                        {offer.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-stone-300 leading-relaxed">
                The autonomous decision engine selected{" "}
                <strong className="text-white">{activeItem.store}</strong> at{" "}
                <strong className="text-amber-300">
                  {formatPrice(activeItem.price, selectedCurrency)}
                </strong>{" "}
                with free shipping as the highest-scoring verified quote.
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowComparisonMatrix(false);
                  setShowMobileCheckoutSheet(true);
                }}
                className="pp-btn-gold mt-4 w-full"
              >
                Proceed with Best Quote via PayPal
              </button>
            </div>
          </div>
        )}

        {/* Printable Settlement Receipt Modal */}
        {showReceiptModal && paymentSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
              id="receipts"
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#1c1815] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Settlement Receipt
                    </h2>
                    <p className="text-xs text-emerald-400">
                      PayPal Orders v2 · Captured
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-stone-300 hover:text-white"
                  aria-label="Close receipt"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-2.5 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-stone-400">Item</span>
                  <span className="font-bold text-white text-right">
                    {activeItem.name}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-stone-400">Capture ID</span>
                  <span className="font-mono text-emerald-300 break-all">
                    {paymentSuccess.id}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-stone-400">Settled Amount</span>
                  <span className="font-extrabold text-amber-300">
                    {paymentSuccess.paidPrice ||
                      formatPrice(activeItem.price, selectedCurrency)}{" "}
                    {paymentSuccess.paidCurrency || selectedCurrency}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-stone-400">Fulfillment Store</span>
                  <span className="font-semibold text-white">
                    {activeItem.store}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-stone-400">Timestamp</span>
                  <span className="text-stone-300">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-semibold text-white transition"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="pp-btn-gold flex-1 py-2.5 text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <AppFooter />
      </div>
    </PayPalScriptProvider>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef3f3] text-sm font-semibold text-[#1d2528]">
          Loading shopping results…
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
