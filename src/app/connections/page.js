"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Key,
  ExternalLink,
  Radio,
  Server,
} from "lucide-react";
import PageShell from "@/components/PageShell";

export default function ConnectionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchHealth();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

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
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[#cbd6d8] bg-white hover:bg-[#e9f0f0] px-4 py-2 text-xs font-semibold text-[#273133] transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>{loading ? "Testing…" : "Refresh Diagnostics"}</span>
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Status
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase text-[#111416] tracking-tight">
            All systems.
          </h1>
          <p className="text-xs sm:text-sm text-[#536064] mt-2 max-w-2xl leading-relaxed">
            A quick check of the services behind catalog search and checkout.
          </p>
        </div>

        {/* Credentials & Environment Overview Card */}
        <div className="rounded-[20px] border border-[#dce6e5] bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-emerald-700" />
            <span>PayPal Developer Sandbox Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-[14px] border border-[#e2ecea] bg-[#f7faf9] p-4">
              <span className="text-[#657276] block mb-1 font-medium">
                Application Name:
              </span>
              <span className="font-bold text-[#111416] text-sm">
                SwiftCart-Agent
              </span>
            </div>
            <div className="rounded-[14px] border border-[#e2ecea] bg-[#f7faf9] p-4">
              <span className="text-[#657276] block mb-1 font-medium">Environment:</span>
              <span className="font-bold text-emerald-700 text-sm">
                SANDBOX (api-m.sandbox.paypal.com)
              </span>
            </div>
            <div className="rounded-[14px] border border-[#e2ecea] bg-[#f7faf9] p-4">
              <span className="text-[#657276] block mb-1 font-medium">API Protocol:</span>
              <span className="font-bold text-[#111416] text-sm">
                REST API v2 (OAuth 2.0)
              </span>
            </div>
          </div>
        </div>

        {/* Live Service Diagnostic Checks */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#263133] flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-700" />
              <span>Live Service Connectivity Grid</span>
            </h2>
            <span className="text-xs text-[#657276] font-mono">
              Last Check:{" "}
              {data ? new Date(data.timestamp).toLocaleTimeString() : "Pending"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data?.services?.map((svc) => {
              const isOk =
                svc.status === "operational" || svc.status === "configured";
              return (
                <div
                  key={svc.id}
                  className="rounded-[18px] border border-[#dce6e5] bg-white hover:border-[#6f9b8b] hover:shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      {isOk ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#111416] text-sm">
                          {svc.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isOk
                              ? "bg-[#e1f2eb] text-[#087650] border border-[#b8dfce]"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {svc.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#657276] mt-1 font-mono">
                        {svc.endpoint}
                      </p>
                      <p className="text-xs text-[#3d4b4e] mt-1.5">
                        {svc.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e8eeee]">
                    <span className="text-[10px] text-[#818f92] font-mono">
                      Latency
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {svc.latency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Webhooks Live Stream Quick Link */}
        <div className="rounded-[20px] border border-[#dce6e5] bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#111416] flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-700" />
              <span>PayPal Webhook Events Stream</span>
            </h4>
            <p className="text-xs text-[#59676a] mt-1">
              Inspect real-time server-to-server notifications
              (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`) and
              dispatch sandbox test events.
            </p>
          </div>
          <Link
            href="/webhooks"
            className="flex items-center gap-2 text-xs font-semibold text-white bg-[#073e32] hover:bg-[#0b5746] px-4 py-2.5 rounded-full transition whitespace-nowrap"
          >
            <span>Open Webhooks Hub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Postman Reference */}
        <div className="rounded-[20px] border border-[#dce6e5] bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#111416]">
              Postman Workspace &amp; API Definitions
            </h4>
            <p className="text-xs text-[#59676a] mt-1">
              Verify and debug PayPal Orders v2 endpoints directly using the
              collection specification.
            </p>
          </div>
          <a
            href="https://www.postman.com/paypal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-[#1f2729] bg-[#eef3f3] hover:bg-[#dfe8e8] px-4 py-2.5 rounded-full border border-[#cbd6d8] transition whitespace-nowrap"
          >
            <span>Open Postman Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </PageShell>
  );
}
