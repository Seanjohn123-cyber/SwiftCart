"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, LogOut, PackageCheck, ShieldCheck } from "lucide-react";
import PageShell from "@/components/PageShell";

function formatPurchaseAmount(purchase) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: purchase.currency,
    }).format(Number(purchase.amount));
  } catch {
    return `${purchase.amount} ${purchase.currency}`;
  }
}

export default function CustomerAccountPage() {
  const [customer, setCustomer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPurchases = async () => {
    const response = await fetch("/api/customer/purchases", {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load purchases.");
    setPurchases(data.purchases || []);
  };

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const response = await fetch("/api/customer/session", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Account service is unavailable.");
        if (!active) return;
        if (data.authenticated) {
          setCustomer(data.customer);
          const purchaseResponse = await fetch("/api/customer/purchases", {
            cache: "no-store",
          });
          const purchaseData = await purchaseResponse.json();
          if (!purchaseResponse.ok) {
            throw new Error(purchaseData.error || "Could not load purchases.");
          }
          if (active) setPurchases(purchaseData.purchases || []);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account request failed.");
      setCustomer(data.customer);
      setPassword("");
      await loadPurchases();
      setMessage(
        mode === "register"
          ? "Your account is ready. Purchases made while signed in will appear here."
          : "You are signed in. Purchases made while signed in appear here.",
      );
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setError("");
    try {
      const response = await fetch("/api/customer/session", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      setCustomer(null);
      setPurchases([]);
      setMessage("You have been signed out.");
    } catch (logoutError) {
      setError(logoutError.message);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-7">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            Customer account
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#111416] sm:text-4xl">
            Your purchases, in one place.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#526063]">
            Create an account or sign in before checkout to keep a history of
            completed purchases. Guest checkout is still available.
          </p>
        </div>

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#d9e2e3] bg-white p-6 text-sm text-[#596669]">
            Checking your account…
          </div>
        ) : customer ? (
          <section className="space-y-5 rounded-2xl border border-[#d9e2e3] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#677477]">
                  Signed in as
                </p>
                <p className="mt-1 break-all text-base font-bold text-[#111719]">
                  {customer.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#d4dfe0] px-4 py-2 text-xs font-bold text-[#273133] transition hover:bg-[#f2f6f6] sm:self-auto"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-[#e6ebec] pt-5">
              <PackageCheck className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-extrabold text-[#111719]">
                Purchase history
              </h2>
              <span className="ml-auto rounded-full bg-[#edf3f3] px-2.5 py-1 text-xs font-bold text-[#536164]">
                {purchases.length}
              </span>
            </div>

            {purchases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ced9da] bg-[#f7f9f9] px-5 py-8 text-center">
                <PackageCheck className="mx-auto h-8 w-8 text-[#7b898b]" />
                <p className="mt-3 text-sm font-bold text-[#263133]">
                  No saved purchases yet
                </p>
                <p className="mt-1 text-xs leading-5 text-[#667477]">
                  Stay signed in when you approve a PayPal checkout and completed
                  purchases will show up here.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#111416] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#273133]"
                >
                  Browse the shop <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#e7ecec]">
                {purchases.map((purchase) => (
                  <li
                    key={purchase.captureId}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#182022]">
                        {purchase.itemName}
                      </p>
                      <p className="mt-1 text-xs text-[#687679]">
                        {purchase.sku} · Capture {purchase.captureId}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#687679]">
                        <Clock3 className="h-3 w-3" />
                        {new Date(purchase.purchasedAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-[#075b47]">
                      {formatPurchaseAmount(purchase)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="grid gap-6 rounded-2xl border border-[#d9e2e3] bg-white p-5 shadow-sm sm:p-7 md:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-extrabold text-[#111719]">
                  Your account, your checkout
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#596669]">
                  SwiftCart stores completed PayPal capture details for
                  purchases created while you are signed in. Payment still
                  requires your approval on PayPal.
                </p>
              </div>
              <p className="text-xs leading-5 text-[#6a7779]">
                Use a unique password you can keep safe. Email verification and
                password recovery are not enabled in this demo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex rounded-full bg-[#edf2f2] p-1">
                {[
                  { value: "login", label: "Sign in" },
                  { value: "register", label: "Create account" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setMode(option.value);
                      setError("");
                    }}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                      mode === option.value
                        ? "bg-white text-[#111719] shadow-sm"
                        : "text-[#596669] hover:text-[#111719]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="block space-y-1.5 text-xs font-bold text-[#374447]">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#d3dede] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block space-y-1.5 text-xs font-bold text-[#374447]">
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "register" ? 12 : undefined}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#d3dede] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
                {mode === "register" && (
                  <span className="block font-normal text-[#697679]">
                    Use at least 12 characters.
                  </span>
                )}
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#075b47] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#064b3b] disabled:cursor-wait disabled:opacity-60"
              >
                {submitting
                  ? "Please wait…"
                  : mode === "register"
                    ? "Create customer account"
                    : "Sign in"}
              </button>
            </form>
          </section>
        )}
      </div>
    </PageShell>
  );
}
