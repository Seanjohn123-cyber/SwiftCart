"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Code,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Radio,
  Clock,
  DollarSign,
  Server,
} from "lucide-react";
import PageShell from "@/components/PageShell";

export default function WebhooksPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [simulationType, setSimulationType] = useState(
    "PAYMENT.CAPTURE.COMPLETED",
  );
  const [copiedId, setCopiedId] = useState(null);
  const [triageByEvent, setTriageByEvent] = useState({});
  const [triagingId, setTriagingId] = useState(null);
  const [lastSimulatedPayload, setLastSimulatedPayload] = useState(null);
  const [simulationMessage, setSimulationMessage] = useState("");

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks/paypal");
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchWebhooks();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchWebhooks();
    }, 5000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimulationMessage("");
    try {
      const randomAmount = (Math.random() * 80 + 20).toFixed(2);
      const randomCaptureId =
        "CAP-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      let payload = {};
      if (simulationType === "PAYMENT.CAPTURE.COMPLETED") {
        payload = {
          id: `WH-EVT-${Date.now()}`,
          event_type: "PAYMENT.CAPTURE.COMPLETED",
          resource_type: "capture",
          summary: `Payment capture completed for $${randomAmount} USD via PayPal Checkout`,
          create_time: new Date().toISOString(),
          status: "SUCCESS",
          resource: {
            id: randomCaptureId,
            amount: { currency_code: "USD", value: randomAmount },
            payer: "sb-buyer@personal.example.com",
            merchant_id: "sb-merchant-apex@business.example.com",
          },
        };
      } else if (simulationType === "CHECKOUT.ORDER.APPROVED") {
        payload = {
          id: `WH-EVT-${Date.now()}`,
          event_type: "CHECKOUT.ORDER.APPROVED",
          resource_type: "checkout-order",
          summary: `Buyer approved order ${randomCaptureId} via PayPal popup`,
          create_time: new Date().toISOString(),
          status: "SUCCESS",
          resource: {
            id: randomCaptureId,
            intent: "CAPTURE",
            status: "APPROVED",
          },
        };
      } else {
        payload = {
          id: `WH-EVT-${Date.now()}`,
          event_type: "PAYMENT.SALE.COMPLETED",
          resource_type: "sale",
          summary: `Direct sale settlement verified for $${randomAmount} USD`,
          create_time: new Date().toISOString(),
          status: "SUCCESS",
          resource: {
            id: randomCaptureId,
            amount: { currency_code: "USD", value: randomAmount },
            state: "completed",
          },
        };
      }

      const response = await fetch("/api/webhooks/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-swiftcart-simulation": "true",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Webhook simulation failed.");
      }

      setLastSimulatedPayload(payload);
      setSimulationMessage("Test event dispatched and recorded.");
      await fetchWebhooks();
    } catch (err) {
      console.error("Simulation error:", err);
      setSimulationMessage(err.message || "Webhook simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleReplayLastEvent = async () => {
    if (!lastSimulatedPayload) return;

    setSimulating(true);
    setSimulationMessage("");
    try {
      const response = await fetch("/api/webhooks/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-swiftcart-simulation": "true",
        },
        body: JSON.stringify(lastSimulatedPayload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Webhook replay failed.");
      }
      setSimulationMessage(
        result.duplicate
          ? "Duplicate event correctly acknowledged; no second event was recorded."
          : "Event replayed, but the server did not identify it as a duplicate.",
      );
      await fetchWebhooks();
    } catch (err) {
      console.error("Webhook replay error:", err);
      setSimulationMessage(err.message || "Webhook replay failed.");
    } finally {
      setSimulating(false);
    }
  };

  const handleTriageEvent = async (eventId) => {
    setTriagingId(eventId);
    setTriageByEvent((current) => ({
      ...current,
      [eventId]: null,
    }));
    try {
      const response = await fetch("/api/webhooks/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "triage", eventId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI triage failed.");
      }
      setTriageByEvent((current) => ({ ...current, [eventId]: data }));
    } catch (error) {
      setTriageByEvent((current) => ({
        ...current,
        [eventId]: { error: error.message },
      }));
    } finally {
      setTriagingId(null);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PageShell>
      <div className="flex w-full flex-col gap-6 md:gap-8">
        {/* Navigation Bar */}
        <div className="flex flex-col gap-3 border-b border-[#d8e1e2] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#526064] hover:text-[#111416] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Shop</span>
          </Link>

          <button
            onClick={fetchWebhooks}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[#cbd6d8] bg-white hover:bg-[#e9f0f0] px-4 py-2 text-xs font-semibold text-[#273133] transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>{loading ? "Syncing…" : "Sync Events"}</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Webhooks
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase text-[#111416] tracking-tight">
              Every event, logged.
            </h1>
            <p className="text-xs sm:text-sm text-[#536064] mt-2 max-w-2xl leading-relaxed">
              PayPal sends approval and capture events here. Inspect the latest
              events or send a sandbox test event.
            </p>
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-3 bg-white border border-[#dce6e5] px-5 py-3 rounded-[18px] shadow-sm shrink-0">
            <Activity className="w-6 h-6 text-emerald-700" />
            <div>
              <div className="text-[10px] text-[#657276] uppercase tracking-wider font-semibold">
                Total Events Logged
              </div>
              <div className="text-xl font-extrabold text-[#111416] font-mono">
                {events.length}
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulation Controls Bar */}
        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-[20px] border border-[#b9ddca] bg-[#f5fbf7] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#e0f2e8] text-[#087650] flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#173f35]">
                  Simulate Sandbox Webhook Dispatch
                </h3>
                <p className="text-xs text-[#52645b]">
                  Trigger mock server-to-server webhook notifications to
                  demonstrate live ingestion latency.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <select
                value={simulationType}
                onChange={(e) => setSimulationType(e.target.value)}
                className="bg-white border border-[#cbd6d8] rounded-xl px-3 py-2 text-xs text-[#273133] outline-none focus:border-[#087650]"
              >
                <option value="PAYMENT.CAPTURE.COMPLETED">
                  PAYMENT.CAPTURE.COMPLETED
                </option>
                <option value="CHECKOUT.ORDER.APPROVED">
                  CHECKOUT.ORDER.APPROVED
                </option>
                <option value="PAYMENT.SALE.COMPLETED">
                  PAYMENT.SALE.COMPLETED
                </option>
              </select>

              <button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#073e32] hover:bg-[#0b5746] px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 shrink-0"
              >
                <Send
                  className={`w-3.5 h-3.5 ${simulating ? "animate-pulse" : ""}`}
                />
                <span>{simulating ? "Emitting..." : "Dispatch Event"}</span>
              </button>
              <button
                type="button"
                onClick={handleReplayLastEvent}
                disabled={simulating || !lastSimulatedPayload}
                className="rounded-full border border-[#cbd6d8] bg-white hover:bg-[#e9f0f0] px-4 py-2 text-xs font-bold text-[#273133] transition disabled:opacity-40"
              >
                Replay last event
              </button>
            </div>
            {simulationMessage && (
              <p
                className="w-full text-xs text-[#173f35] md:text-right"
                role="status"
              >
                {simulationMessage}
              </p>
            )}
          </div>
        )}

        {/* Webhooks Stream Feed */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#263133] flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-700" />
              <span>Recent events</span>
            </h2>
            <span className="text-xs text-[#657276] font-mono">
              Auto-refreshing every 5s
            </span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-[18px] border border-[#dce6e5] bg-white p-12 text-center text-[#657276] shadow-sm">
              <Activity className="w-8 h-8 mx-auto mb-3 text-[#94a4a7]" />
              <p className="text-sm font-semibold text-[#273133]">
                No webhook events in buffer yet.
              </p>
              <p className="text-xs text-[#657276] mt-1">
                Use the simulator above or complete a checkout to trigger
                events.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((evt) => {
                const isExpanded = selectedEventId === evt.id;
                return (
                  <div
                    key={evt.id}
                    className="rounded-[18px] border border-[#dce6e5] bg-white hover:border-[#6f9b8b] p-4 transition shadow-sm"
                  >
                    <div
                      onClick={() =>
                        setSelectedEventId(isExpanded ? null : evt.id)
                      }
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {evt.status === "REJECTED" ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#073e32]">
                              {evt.event_type}
                            </span>
                            <span className="bg-[#f0f4f4] text-[#4a5659] text-[10px] px-2 py-0.5 rounded font-mono font-medium">
                              {evt.id}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                evt.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-[#e1f2eb] text-[#087650] border border-[#b8dfce]"
                              }`}
                            >
                              {evt.status}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                evt.source === "PAYPAL_REJECTED"
                                  ? "bg-rose-50 text-rose-700"
                                  : evt.source === "PAYPAL_VERIFIED"
                                    ? "bg-emerald-50 text-emerald-800"
                                    : "bg-[#eef3f3] text-[#526064]"
                              }`}
                            >
                              {evt.source === "PAYPAL_VERIFIED"
                                ? "PayPal verified"
                                : evt.source === "PAYPAL_REJECTED"
                                  ? "PayPal rejected"
                                  : "Simulator"}
                            </span>
                          </div>
                          <p className="text-xs text-[#374447] mt-1 font-medium">
                            {evt.summary}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e8eeee]">
                        <div className="flex items-center gap-1.5 text-[#657276] text-xs font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(evt.create_time).toLocaleTimeString()}
                          </span>
                        </div>
                        <button className="text-[#657276] hover:text-[#111416] transition">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Payload */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#e8eeee] text-xs">
                        {evt.source === "PAYPAL_VERIFIED" && (
                          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <span className="font-semibold text-violet-900">
                                  AI event review
                                </span>
                                <p className="mt-1 text-[11px] text-violet-700">
                                  Advisory only. It cannot approve or change a
                                  payment.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTriageEvent(evt.id)}
                                disabled={triagingId === evt.id}
                                className="rounded-full border border-violet-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                              >
                                {triagingId === evt.id
                                  ? "Reviewing…"
                                  : "Review with AI"}
                              </button>
                            </div>
                            {triageByEvent[evt.id]?.advisory && (
                              <div className="mt-3 text-[11px] text-violet-900">
                                <span className="font-semibold">
                                  {triageByEvent[evt.id].advisory.attention.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                  :
                                </span>{" "}
                                {triageByEvent[evt.id].advisory.summary}
                                <span className="ml-2 text-violet-600">
                                  ({triageByEvent[evt.id].model})
                                </span>
                              </div>
                            )}
                            {triageByEvent[evt.id]?.error && (
                              <p className="mt-3 text-[11px] text-rose-700">
                                {triageByEvent[evt.id].error}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[#657276] font-mono text-[11px]">
                            Event Resource JSON
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                JSON.stringify(evt, null, 2),
                                evt.id,
                              )
                            }
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                          >
                            {copiedId === evt.id ? "Copied" : "Copy JSON"}
                          </button>
                        </div>
                        <pre className="max-w-full overflow-x-auto rounded-xl border border-[#e8eeee] bg-[#101315] p-4 font-mono text-[11px] text-[#e0e8e8]">
                          {JSON.stringify(evt, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Verification Footer Notes */}
        <div className="rounded-[20px] border border-[#dce6e5] bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#111416] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>PayPal Webhook Verification &amp; Security</span>
            </h4>
            <p className="text-xs text-[#59676a] mt-1 max-w-xl">
              PayPal events are recorded only after signature verification.
              Simulator events are marked separately and are disabled in
              production.
            </p>
          </div>
          <a
            href="https://developer.paypal.com/api/rest/webhooks/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-[#1f2729] bg-[#eef3f3] hover:bg-[#dfe8e8] px-4 py-2.5 rounded-full border border-[#cbd6d8] transition whitespace-nowrap"
          >
            <span>PayPal Webhook Docs</span>
          </a>
        </div>
      </div>
    </PageShell>
  );
}
